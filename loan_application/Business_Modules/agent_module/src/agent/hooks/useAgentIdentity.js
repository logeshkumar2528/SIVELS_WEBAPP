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

export function useAgentIdentity() {
  const { currentUser } = useAuth();
  
  // Seed initial identity synchronously from authenticated currentUser
  const initialAgentId = currentUser?.agentId ?? currentUser?.AgentId ?? currentUser?.id ?? null;
  const initialAgentData = initialAgentId ? currentUser : null;

  const [agentId, setAgentId] = useState(initialAgentId);
  const [agentData, setAgentData] = useState(initialAgentData);
  const [loading, setLoading] = useState(!initialAgentId);

  useEffect(() => {
    let isMounted = true;

    async function fetchIdentity() {
      // Must have logged-in user to fetch agent identity
      if (!currentUser || (!currentUser.mobileNumber && !currentUser.agentId && !currentUser.AgentId)) {
        if (isMounted) {
          setAgentId(null);
          setAgentData(null);
          setLoading(false);
        }
        return;
      }

      const knownAgentId = currentUser.agentId ?? currentUser.AgentId ?? currentUser.id;

      // Case A: If currentUser has agentId already known from login / auth session
      if (knownAgentId) {
        if (isMounted) {
          setAgentId(knownAgentId);
          setAgentData((prev) => prev || currentUser);
        }
        try {
          const detailsRes = await axiosInstance.get(`/AgentMaster/${knownAgentId}`);
          const details = normalizeAgentRecord(detailsRes.data);
          if (isMounted) {
            if (details && typeof details === 'object' && !Array.isArray(details)) {
              setAgentData(details);
            } else {
              setAgentData((prev) => prev || currentUser);
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
                setAgentData((prev) => prev || currentUser);
              }
            }
          } catch (listErr) {
            console.error("Failed to fetch AgentMaster list fallback", listErr);
            if (isMounted) {
              setAgentData((prev) => prev || currentUser);
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
            setAgentId(resolvedId);
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
            // Not found
            setAgentId(null);
            setAgentData(currentUser || null);
          }
        }
      } catch (err) {
        console.error("Failed to fetch Agent identity", err);
        if (isMounted) {
          setAgentId(null);
          setAgentData(currentUser || null);
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

  return { agentId, agentData, loadingAgent: loading };
}

