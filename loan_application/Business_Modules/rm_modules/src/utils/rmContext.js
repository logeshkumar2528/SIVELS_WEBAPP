/**
 * Shared RM session + agent ownership helpers.
 * Keeps approved / submission-history / dashboard filtering consistent.
 */

export function resolveApiArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.value)) return data.value;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export function getCurrentRMContext() {
  try {
    const currentUser = JSON.parse(localStorage.getItem('sivels_currentUser') || 'null');
    const rmData = JSON.parse(localStorage.getItem('rmData') || 'null');
    return {
      rmId:
        currentUser?.rmId ||
        currentUser?.RMId ||
        currentUser?.rmid ||
        rmData?.rmId ||
        rmData?.RMId ||
        Number(localStorage.getItem('rmId')) ||
        null,
      branch:
        currentUser?.branch ||
        currentUser?.Branch ||
        rmData?.branch ||
        rmData?.Branch ||
        '',
      fullName:
        currentUser?.fullName ||
        currentUser?.FullName ||
        rmData?.fullName ||
        rmData?.FullName ||
        '',
    };
  } catch {
    return {
      rmId: Number(localStorage.getItem('rmId')) || null,
      branch: '',
      fullName: '',
    };
  }
}

export function getAgentRmId(agent = {}) {
  return Number(
    agent.rmId ||
    agent.RMId ||
    agent.relationshipManagerId ||
    agent.RelationshipManagerId ||
    agent.managerId ||
    agent.ManagerId ||
    agent.reportingManagerId ||
    agent.reportToRmId ||
    agent.reportManagerId ||
    agent.createdBy ||
    agent.CreatedBy ||
    0
  );
}

export function getAgentId(agent = {}) {
  return Number(agent.agentId || agent.AgentId || 0);
}

/** Agents that belong to the logged-in RM only. */
export function filterAgentsForRm(agents, rmId) {
  const targetRmId = Number(rmId || 0);
  if (!targetRmId) return [];

  return (agents || []).filter((agent) => getAgentRmId(agent) === targetRmId);
}

export function buildAllowedAgentIdSet(agents) {
  return new Set(
    (agents || [])
      .map((agent) => getAgentId(agent))
      .filter((id) => Number.isFinite(id) && id > 0)
  );
}

export function normalizeApplicationStatus(status, statusName = '') {
  const namedStatus = String(statusName || '').trim().toLowerCase();
  if (namedStatus.includes('approved') || namedStatus.includes('logged to ho')) return 'Logged to HO';
  if (namedStatus.includes('returned') || namedStatus.includes('reject')) return 'Returned';
  if (namedStatus.includes('review')) return 'Under Review';
  if (namedStatus.includes('pending') || namedStatus.includes('progress')) return 'Pending';
  if (namedStatus.includes('new') || namedStatus.includes('draft')) return 'New';

  const numericStatus = Number(status);
  if (numericStatus === 2) return 'Logged to HO';
  if (numericStatus === 1) return 'Pending';
  if (numericStatus === 0) return 'New';

  const raw = String(status || '').trim();
  if (!raw || raw.toLowerCase() === 'draft') return 'New';
  return raw.replace(/^./, (letter) => letter.toUpperCase());
}
