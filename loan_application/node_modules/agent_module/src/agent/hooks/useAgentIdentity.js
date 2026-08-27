import { useState, useEffect } from 'react';
import { useAuth } from '../../../../../Core/src/context/AuthContext';
import axiosInstance from '../../../../../Core/src/api/axiosInstance';

export function useAgentIdentity() {
  const { currentUser } = useAuth();
  const [agentId, setAgentId] = useState(null);
  const [agentData, setAgentData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchIdentity() {
      // Must have logged-in user to fetch agent identity
      if (!currentUser || !currentUser.mobileNumber) {
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
        const match = agents.find(
          (a) => String(a.mobileNumber).trim() === String(currentUser.mobileNumber).trim()
        );

        if (isMounted) {
          if (match && match.agentId) {
             setAgentId(match.agentId);
             
             // Fetch full agent profile details
             try {
               const detailsRes = await axiosInstance.get(`/AgentMaster/${match.agentId}`);
               const details = detailsRes.data?.value ?? detailsRes.data ?? match;
               if (isMounted) setAgentData(details);
             } catch (detailErr) {
               console.error("Failed to fetch full Agent details", detailErr);
               if (isMounted) setAgentData(match); // fallback to list data
             }
          } else {
             // Not found
             setAgentId(null);
             setAgentData(null);
          }
          if (isMounted) setLoading(false);
        }
      } catch (err) {
        console.error("Failed to fetch Agent identity", err);
        if (isMounted) {
          setAgentId(null);
          setAgentData(null);
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
