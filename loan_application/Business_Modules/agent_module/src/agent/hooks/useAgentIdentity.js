import { useState, useEffect } from 'react';
import { useAuth } from '../../../../../Core/src/context/AuthContext';
import axiosInstance from '../../../../../Core/src/api/axiosInstance';

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

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** Agent id for this login, from GET /auth/me (the token's legacy id). */
async function fetchAgentIdFromToken() {
  try {
    const res = await axiosInstance.get('/auth/me');
    const me = res.data || {};
    const isAgent = String(me.legacyType || '').toLowerCase() === 'agent';
    return isAgent && me.legacyId ? me.legacyId : null;
  } catch (err) {
    console.warn('[useAgentIdentity] /auth/me lookup failed:', err?.message);
    return null;
  }
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
      if (!currentUser) {
        if (isMounted) {
          setAgentId(null);
          setAgentData(null);
          setLoading(false);
        }
        return;
      }

      try {
        const resolvedId = currentUser.agentId ?? currentUser.AgentId ?? currentUser.id ?? (await fetchAgentIdFromToken());

        let details = null;
        if (resolvedId) {
          if (isMounted) setAgentId(resolvedId);
          try {
            const detailsRes = await axiosInstance.get(`/AgentMaster/${resolvedId}`);
            details = normalizeAgentRecord(detailsRes.data);
          } catch (detailErr) {
            console.error('Failed to fetch Agent details by ID, falling back to /AgentMaster/my', detailErr);
          }
        }

        // /AgentMaster/my returns only the logged-in agent's own record.
        if (!isObject(details)) {
          try {
            const myRes = await axiosInstance.get('/AgentMaster/my');
            details = normalizeAgentRecord(myRes.data);
          } catch (myErr) {
            console.error('Failed to fetch /AgentMaster/my', myErr);
          }
        }

        if (!isMounted) return;
        if (isObject(details)) {
          setAgentId(details.agentId ?? details.AgentId ?? details.id ?? resolvedId ?? null);
          setAgentData(details);
        } else {
          setAgentId(resolvedId ?? null);
          setAgentData((prev) => prev || currentUser);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchIdentity();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  return { agentId, agentData, loadingAgent: loading };
}
