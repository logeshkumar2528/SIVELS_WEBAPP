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

export function useAgentIdentity() {
  const { currentUser } = useAuth();
  
  const isAgent = isAgentSession(currentUser);
  const isUnauthorized = Boolean(currentUser && !isAgent);

  // Synchronously seed identity only if current user is an Agent
  const directId = getDirectAgentId(currentUser);
  const { cachedId, cachedData } = isAgent ? getCachedAgentStorage(currentUser) : { cachedId: null, cachedData: null };
  
  const initialAgentId = directId ? String(directId) : cachedId;
  const initialAgentData = isAgent ? (cachedData || (directId ? currentUser : null)) : null;

  const [agentId, setAgentId] = useState(initialAgentId);
  const [agentData, setAgentData] = useState(initialAgentData);
  const [loading, setLoading] = useState(isAgent && !initialAgentId);

  useEffect(() => {
    let isMounted = true;

    async function fetchIdentity() {
      // If not logged in, or logged in as a non-Agent (RM, BackOffice, etc.), do not resolve agent identity
      if (!currentUser || !isAgentSession(currentUser)) {
        if (isMounted) {
          setAgentId(null);
          setAgentData(null);
          setLoading(false);
        }
        return;
      }

      const knownAgentId = currentUser.agentId ?? currentUser.AgentId ?? cachedId;

      // Case A: If agentId is already known from login / auth session / verified storage
      if (knownAgentId) {
        if (isMounted) {
          setAgentId(String(knownAgentId));
          setAgentData((prev) => prev || cachedData || currentUser);
        }
        try {
          const detailsRes = await axiosInstance.get(`/AgentMaster/${knownAgentId}`);
          const details = normalizeAgentRecord(detailsRes.data);
          if (isMounted) {
            if (details && typeof details === 'object' && !Array.isArray(details)) {
              setAgentData(details);
            } else {
              setAgentData((prev) => prev || cachedData || currentUser);
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
              if (currentUser?.mobileNumber) {
                return isMobileMatch(extractRecordMobile(a), currentUser.mobileNumber);
              }
              return false;
            }) : null;

            if (isMounted) {
              if (found) {
                setAgentData(found);
              } else {
                setAgentData((prev) => prev || cachedData || currentUser);
              }
            }
          } catch (listErr) {
            console.error("Failed to fetch AgentMaster list fallback", listErr);
            if (isMounted) {
              setAgentData((prev) => prev || cachedData || currentUser);
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
      if (!currentUser.mobileNumber) {
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
          return isMobileMatch(recordMobile, currentUser.mobileNumber);
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
  }, [currentUser]);

  return { agentId, agentData, loadingAgent: loading, isAgent, isUnauthorized };
}

