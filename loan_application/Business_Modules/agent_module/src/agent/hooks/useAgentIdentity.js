import { useState, useEffect } from 'react';
import { useAuth } from '../../../../../Core/src/context/AuthContext';
import axiosInstance from '../../../../../Core/src/api/axiosInstance';
import { isMobileMatch, extractRecordMobile } from '../../../../../Core/src/services/moduleDetectionService';

/**
 * Safely unwrap agent object from potential API response variations (array, wrapped value/data, or single object).
 */
function normalizeAgentRecord(response) {
  if (!response) return null;
  const raw = response.value ?? response.data ?? response;
  if (Array.isArray(raw)) {
    return raw.length > 0 ? (raw[0]?.value ?? raw[0]?.data ?? raw[0]) : null;
  }
  if (typeof raw === 'object') {
    if (Array.isArray(raw.value)) {
      return raw.value.length > 0 ? raw.value[0] : null;
    }
    if (Array.isArray(raw.data)) {
      return raw.data.length > 0 ? raw.data[0] : null;
    }
    return raw;
  }
  return null;
}

/**
 * Check if the authenticated user object represents a legitimate Agent session.
 * Rejects non-Agent roles (RM, BackOffice, CreditManager, Customer, etc.)
 */
function isAgentSession(user) {
  if (!user) return false;
  const roleStr = String(user.role || user.Role || '').trim().toLowerCase();
  if (roleStr === 'agent') return true;
  // If role is explicitly another module, reject immediately
  if (roleStr && roleStr !== 'agent') return false;
  // If role is omitted, check for agent-specific markers
  if (user.agentCode || user.AgentCode || user.agentId || user.AgentId) return true;
  return false;
}

/**
 * Extract direct agent ID from user object only if the user is an Agent.
 */
function getDirectAgentId(user) {
  if (!user || !isAgentSession(user)) return null;
  return user.agentId ?? user.AgentId ?? user.id ?? user.userId ?? null;
}

/**
 * Safely read cached Agent storage only when the active session is confirmed as an Agent.
 * Never bypass an active non-Agent session with stale storage.
 */
function getCachedAgentStorage(currentUser) {
  if (typeof window === 'undefined') return { cachedId: null, cachedData: null };
  if (!currentUser || !isAgentSession(currentUser)) {
    return { cachedId: null, cachedData: null };
  }

  try {
    const rawStoredId = localStorage.getItem('agentId');
    const rawStoredData = localStorage.getItem('agentData');
    const parsedData = rawStoredData ? JSON.parse(rawStoredData) : null;

    // Verify stored data does not belong to another role
    const storedRole = String(parsedData?.role || parsedData?.Role || '').trim().toLowerCase();
    if (storedRole && storedRole !== 'agent') {
      return { cachedId: null, cachedData: null };
    }

    const verifiedId = rawStoredId || parsedData?.agentId || parsedData?.AgentId || parsedData?.id || null;
    return {
      cachedId: verifiedId ? String(verifiedId) : null,
      cachedData: parsedData || null,
    };
  } catch {
    return { cachedId: null, cachedData: null };
  }
}

/**
 * Safely parse JSON from localStorage without throwing.
 */
function safeGetItem(key) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Extract numeric millisecond timestamp from an object.
 */
function getTimestampMs(obj) {
  if (!obj || typeof obj !== 'object') return 0;
  const ts = obj.loginTimestamp || obj.timestamp || obj.createdAt;
  if (!ts) return 0;
  const ms = new Date(ts).getTime();
  return isNaN(ms) ? 0 : ms;
}

/**
 * Determine the authoritative Agent session.
 * Compares login recency against other role sessions in localStorage.
 *
 * Rules:
 * 1. If currentUser is already a verified Agent session, return it as authoritative.
 * 2. If currentUser represents another role (e.g. BackOffice), check if an authentic Agent
 *    session was established MORE RECENTLY (by loginTimestamp).
 *    - If Agent login is newer, restore and synchronize the Agent session.
 *    - If non-Agent login is newer or equal, reject Agent access (isUnauthorized = true).
 * 3. If currentUser is null or unassigned on refresh, check if agentAuth exists and is
 *    newer or equal to any other module sessions.
 */
function resolveAuthoritativeAgentSession(currentUser) {
  if (typeof window === 'undefined') {
    return { session: null, isAgent: false, isUnauthorized: false, shouldSync: false };
  }

  // 1. If currentUser is actively and legitimately an Agent
  if (currentUser && isAgentSession(currentUser)) {
    return { session: currentUser, isAgent: true, isUnauthorized: false, shouldSync: false };
  }

  // 2. Read stored sessions
  const agentAuth = safeGetItem('agentAuth');
  const agentData = safeGetItem('agentData');
  const rawAgentId = localStorage.getItem('agentId');

  const boAuth = safeGetItem('backOfficeAuth');
  const boData = safeGetItem('backOfficeData');
  const rmAuth = safeGetItem('rmAuth') || safeGetItem('rmData');
  const cmAuth = safeGetItem('creditManagerAuth') || safeGetItem('creditManagerData');
  const chAuth = safeGetItem('creditHeadAuth') || safeGetItem('creditHeadData');
  const amsAuth = safeGetItem('amsAuth') || safeGetItem('amsData');

  const agentTs = Math.max(getTimestampMs(agentAuth), getTimestampMs(agentData));
  const boTs = Math.max(getTimestampMs(boAuth), getTimestampMs(boData));
  const rmTs = getTimestampMs(rmAuth);
  const cmTs = getTimestampMs(cmAuth);
  const chTs = getTimestampMs(chAuth);
  const amsTs = getTimestampMs(amsAuth);
  const currentTs = getTimestampMs(currentUser);

  const maxNonAgentTs = Math.max(boTs, rmTs, cmTs, chTs, amsTs, currentTs);

  const hasAgentRecord = Boolean(
    (agentAuth && agentAuth.isAuthenticated) ||
    agentData?.agentId || agentData?.AgentId || agentData?.agentCode ||
    rawAgentId
  );

  // If currentUser is an explicit non-Agent role (e.g. BackOffice)
  if (currentUser && !isAgentSession(currentUser)) {
    // If Agent session was created strictly MORE RECENTLY than the non-Agent session:
    if (hasAgentRecord && agentTs > 0 && agentTs > maxNonAgentTs) {
      const restored = {
        ...(agentData || {}),
        ...(agentAuth || {}),
        role: 'Agent',
        agentId: agentAuth?.agentId || agentData?.agentId || rawAgentId,
        agentCode: agentAuth?.agentCode || agentData?.agentCode || '',
        fullName: agentAuth?.fullName || agentAuth?.name || agentData?.fullName || agentData?.name || '',
      };
      return { session: restored, isAgent: true, isUnauthorized: false, shouldSync: true };
    }

    // Otherwise, the non-Agent session is authoritative: strictly disallow Agent access
    return { session: null, isAgent: false, isUnauthorized: true, shouldSync: false };
  }

  // If currentUser is null (e.g. initial refresh before state hydration or cleared currentUser)
  if (hasAgentRecord) {
    if (agentTs >= maxNonAgentTs) {
      const restored = {
        ...(agentData || {}),
        ...(agentAuth || {}),
        role: 'Agent',
        agentId: agentAuth?.agentId || agentData?.agentId || rawAgentId,
        agentCode: agentAuth?.agentCode || agentData?.agentCode || '',
        fullName: agentAuth?.fullName || agentAuth?.name || agentData?.fullName || agentData?.name || '',
      };
      return { session: restored, isAgent: true, isUnauthorized: false, shouldSync: true };
    } else {
      // Non-agent session was more recent
      return { session: null, isAgent: false, isUnauthorized: true, shouldSync: false };
    }
  }

  return { session: null, isAgent: false, isUnauthorized: false, shouldSync: false };
}

export function useAgentIdentity() {
  const { currentUser, setCurrentUser } = useAuth();
  
  const authResolution = resolveAuthoritativeAgentSession(currentUser);
  const activeAgentUser = authResolution.session;
  const isAgent = authResolution.isAgent;
  const isUnauthorized = authResolution.isUnauthorized;

  // Synchronously seed identity only if authoritative session is Agent
  const directId = getDirectAgentId(activeAgentUser);
  const { cachedId, cachedData } = isAgent ? getCachedAgentStorage(activeAgentUser) : { cachedId: null, cachedData: null };
  
  const initialAgentId = directId ? String(directId) : cachedId;
  const initialAgentData = isAgent ? (cachedData || (directId ? activeAgentUser : null)) : null;

  const [agentId, setAgentId] = useState(initialAgentId);
  const [agentData, setAgentData] = useState(initialAgentData);
  const [loading, setLoading] = useState(isAgent && !initialAgentId);

  // Synchronize AuthContext if authoritative session needed restoration
  useEffect(() => {
    if (authResolution.shouldSync && activeAgentUser && setCurrentUser) {
      setCurrentUser(activeAgentUser);
      try {
        localStorage.setItem('sivels_currentUser', JSON.stringify(activeAgentUser));
      } catch {}
    }
  }, [authResolution.shouldSync, activeAgentUser, setCurrentUser]);

  useEffect(() => {
    let isMounted = true;

    async function fetchIdentity() {
      // If not logged in, or logged in as a non-Agent (RM, BackOffice, etc.), do not resolve agent identity
      if (!isAgent || !activeAgentUser) {
        if (isMounted) {
          setAgentId(null);
          setAgentData(null);
          setLoading(false);
        }
        return;
      }

      const knownAgentId = activeAgentUser.agentId ?? activeAgentUser.AgentId ?? cachedId;

      // Case A: If agentId is already known from login / auth session / verified storage
      if (knownAgentId) {
        if (isMounted) {
          setAgentId(String(knownAgentId));
          setAgentData((prev) => prev || cachedData || activeAgentUser);
        }
        try {
          const detailsRes = await axiosInstance.get(`/AgentMaster/${knownAgentId}`);
          const details = normalizeAgentRecord(detailsRes.data);
          if (isMounted) {
            if (details && typeof details === 'object' && !Array.isArray(details)) {
              setAgentData(details);
            } else {
              setAgentData((prev) => prev || cachedData || activeAgentUser);
            }
          }
        } catch (detailErr) {
          console.error("Failed to fetch full Agent details by ID, falling back to /AgentMaster", detailErr);
          // Fallback to scanning /AgentMaster
          try {
            const listRes = await axiosInstance.get('/AgentMaster');
            const rawList = listRes.data?.value ?? listRes.data ?? [];
            const list = Array.isArray(rawList) ? rawList : (rawList?.data || []);
            const found = Array.isArray(list) ? list.find((a) => {
              const aid = a.agentId ?? a.AgentId ?? a.id ?? a.Id;
              if (aid && String(aid) === String(knownAgentId)) return true;
              if (activeAgentUser?.mobileNumber) {
                return isMobileMatch(extractRecordMobile(a), activeAgentUser.mobileNumber);
              }
              return false;
            }) : null;

            if (isMounted) {
              if (found) {
                setAgentData(found);
              } else {
                setAgentData((prev) => prev || cachedData || activeAgentUser);
              }
            }
          } catch (listErr) {
            console.error("Failed to fetch AgentMaster list fallback", listErr);
            if (isMounted) {
              setAgentData((prev) => prev || cachedData || activeAgentUser);
            }
          }
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
        return;
      }

      // Case B: Only if agentId is absent, fallback to scanning /AgentMaster with normalized mobile comparison
      if (!activeAgentUser.mobileNumber) {
        if (isMounted) {
          setAgentId(null);
          setAgentData(null);
          setLoading(false);
        }
        return;
      }

      try {
        const res = await axiosInstance.get('/AgentMaster');
        const agents = res.data?.value ?? res.data ?? [];
        const rawAgents = Array.isArray(agents) ? agents : (agents?.data || []);
        const match = Array.isArray(rawAgents) ? rawAgents.find((a) => {
          const recordMobile = extractRecordMobile(a);
          return isMobileMatch(recordMobile, activeAgentUser.mobileNumber);
        }) : null;

        if (isMounted) {
          if (match && (match.agentId || match.AgentId || match.id)) {
            const resolvedId = match.agentId ?? match.AgentId ?? match.id;
            setAgentId(String(resolvedId));
            setAgentData(match);

            // Fetch full details if needed
            try {
              const detailsRes = await axiosInstance.get(`/AgentMaster/${resolvedId}`);
              const details = normalizeAgentRecord(detailsRes.data);
              if (isMounted && details && typeof details === 'object' && !Array.isArray(details)) {
                setAgentData(details);
              }
            } catch (detailErr) {
              console.error("Failed to fetch full Agent details", detailErr);
              if (isMounted) setAgentData(match);
            }
          } else {
            // Not found in AgentMaster: Do NOT poison agentData with non-agent currentUser!
            setAgentId(null);
            setAgentData(null);
          }
        }
      } catch (err) {
        console.error("Failed to fetch Agent identity", err);
        if (isMounted) {
          setAgentId(null);
          setAgentData(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchIdentity();

    return () => {
      isMounted = false;
    };
  }, [currentUser, activeAgentUser, isAgent, cachedId]);

  return { agentId, agentData, loadingAgent: loading, isAgent, isUnauthorized };
}

