import { useState, useEffect } from 'react';
import { useAuth } from '../../../../../Core/src/context/AuthContext';
import axiosInstance from '../../../../../Core/src/api/axiosInstance';
import { isMobileMatch, extractRecordMobile } from '../../../../../Core/src/services/moduleDetectionService';

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
          const details = detailsRes.data?.value ?? detailsRes.data ?? null;
          if (isMounted) {
            if (details) {
              setAgentData(details);
            } else {
              setAgentData((prev) => prev || currentUser);
            }
          }
        } catch (detailErr) {
          console.error("Failed to fetch full Agent details by ID", detailErr);
          if (isMounted) {
            setAgentData((prev) => prev || currentUser);
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
        const rawAgents = Array.isArray(agents) ? agents : [];
        const match = rawAgents.find((a) => {
          const recordMobile = extractRecordMobile(a);
          return isMobileMatch(recordMobile, currentUser.mobileNumber);
        });

        if (isMounted) {
          if (match && (match.agentId || match.AgentId)) {
            const resolvedId = match.agentId ?? match.AgentId;
            setAgentId(resolvedId);
            setAgentData(match);

            // Fetch full details if needed
            try {
              const detailsRes = await axiosInstance.get(`/AgentMaster/${resolvedId}`);
              const details = detailsRes.data?.value ?? detailsRes.data ?? match;
              if (isMounted) setAgentData(details);
            } catch (detailErr) {
              console.error("Failed to fetch full Agent details", detailErr);
              if (isMounted) setAgentData(match);
            }
          } else {
            // Not found
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

  return { agentId, agentData, loadingAgent: loading };
}
