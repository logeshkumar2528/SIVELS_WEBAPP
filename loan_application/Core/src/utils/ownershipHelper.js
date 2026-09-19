/**
 * ownershipHelper.js
 * -------------------
 * Resolves application ownership (Agent vs Direct RM) using multi-source metadata
 * across SIVELS Finance application records.
 *
 * Precedence Hierarchy:
 * 1. Case A: createdByRole.toLowerCase() === 'agent'
 *    -> Agent-sourced application.
 *    -> resolvedAgentId = agentId || createdByUserId || createdBy
 *    -> agentName = agentsById[resolvedAgentId].fullName || record.agentName || '—'
 *    -> resolvedRmId = rmId || agent.rmId || null
 *    -> rmName = rmsById[resolvedRmId].fullName || agent.rmName || record.rmName || '—'
 *
 * 2. Case B: createdByRole.toLowerCase() === 'rm'
 *    -> Direct RM application.
 *    -> agentName = 'Direct (RM)'
 *    -> resolvedRmId = rmId || createdByUserId || createdBy
 *    -> rmName = rmsById[resolvedRmId].fullName || record.rmName || '—'
 *
 * 3. Case C: Legacy fallback (when createdByRole is missing / null):
 *    -> If agentId > 0 -> Agent-sourced
 *    -> Else if createdBy in agentsById -> Agent-sourced
 *    -> Else if rmId > 0 or createdBy in rmsById -> Direct RM ('Direct (RM)')
 *    -> Else -> Unknown ('—')
 */

export function resolveApplicationOwnership(record = {}, agentsById = {}, rmsById = {}) {
  if (!record) {
    return {
      isAgentCreated: false,
      isDirectRm: false,
      agentId: null,
      agentName: '—',
      rmId: null,
      rmName: '—',
      sourceType: 'UNKNOWN',
    };
  }

  // Lookup helper for Map or Object
  const getFromMapOrObj = (source, key) => {
    if (!source || key === null || key === undefined || key === '') return null;
    const strKey = String(key);
    if (source instanceof Map) {
      return source.get(strKey) || null;
    }
    return source[strKey] || null;
  };

  const getNumericId = (val) => {
    if (val === null || val === undefined || val === '') return null;
    const n = Number(val);
    return !isNaN(n) && n > 0 ? n : null;
  };

  const getNameFromAgent = (agent) => {
    if (!agent) return '';
    return agent.fullName || agent.FullName || agent.agentName || agent.AgentName || agent.name || agent.Name || '';
  };

  const getNameFromRm = (rm) => {
    if (!rm) return '';
    return rm.fullName || rm.FullName || rm.rmName || rm.RmName || rm.RMName || rm.name || rm.Name || '';
  };

  // Extract raw fields safely
  const createdByRole = String(
    record.createdByRole ||
    record.CreatedByRole ||
    record.created_by_role ||
    record.raw?.createdByRole ||
    record.raw?.CreatedByRole ||
    record.customer?.createdByRole ||
    record.customer?.CreatedByRole ||
    ''
  ).trim().toLowerCase();

  const rawAgentId = getNumericId(
    record.agentId ??
    record.AgentId ??
    record.agent_id ??
    record.raw?.agentId ??
    record.raw?.AgentId ??
    record.customer?.agentId
  );

  const rawRmId = getNumericId(
    record.rmId ??
    record.RmId ??
    record.RMId ??
    record.rm_id ??
    record.raw?.rmId ??
    record.raw?.RMId ??
    record.customer?.rmId
  );

  const createdByUserId = getNumericId(
    record.createdByUserId ??
    record.CreatedByUserId ??
    record.created_by_user_id ??
    record.raw?.createdByUserId ??
    record.raw?.CreatedByUserId ??
    record.customer?.createdByUserId
  );

  const createdBy = getNumericId(
    record.createdBy ??
    record.CreatedBy ??
    record.created_by ??
    record.raw?.createdBy ??
    record.raw?.CreatedBy ??
    record.customer?.createdBy
  );

  const rawAgentName = (
    record.agentName ||
    record.AgentName ||
    record.agent_name ||
    record.raw?.agentName ||
    record.raw?.AgentName ||
    ''
  ).trim();

  const rawRmName = (
    record.rmName ||
    record.RmName ||
    record.RMName ||
    record.rm_name ||
    record.raw?.rmName ||
    record.raw?.RMName ||
    ''
  ).trim();

  // 1. Case A: createdByRole === 'agent'
  if (createdByRole === 'agent') {
    const resolvedAgentId = rawAgentId || createdByUserId || createdBy;
    const agentObj = getFromMapOrObj(agentsById, resolvedAgentId);
    const resolvedAgentName = rawAgentName || getNameFromAgent(agentObj) || (resolvedAgentId ? `Agent #${resolvedAgentId}` : '—');

    const resolvedRmId = rawRmId || getNumericId(agentObj?.rmId || agentObj?.RmId || agentObj?.RMId);
    const rmObj = getFromMapOrObj(rmsById, resolvedRmId);
    const resolvedRmName = rawRmName || getNameFromRm(rmObj) || (agentObj?.rmName || agentObj?.RmName || agentObj?.RMName) || (resolvedRmId ? `RM #${resolvedRmId}` : '—');

    return {
      isAgentCreated: true,
      isDirectRm: false,
      agentId: resolvedAgentId,
      agentName: resolvedAgentName,
      rmId: resolvedRmId,
      rmName: resolvedRmName,
      sourceType: 'AGENT',
    };
  }

  // 2. Case B: createdByRole === 'rm'
  if (createdByRole === 'rm') {
    const resolvedRmId = rawRmId || createdByUserId || createdBy;
    const rmObj = getFromMapOrObj(rmsById, resolvedRmId);
    const resolvedRmName = rawRmName || getNameFromRm(rmObj) || (resolvedRmId ? `RM #${resolvedRmId}` : '—');

    return {
      isAgentCreated: false,
      isDirectRm: true,
      agentId: null,
      agentName: 'Direct (RM)',
      rmId: resolvedRmId,
      rmName: resolvedRmName,
      sourceType: 'DIRECT_RM',
    };
  }

  // 3. Case C: Legacy fallback (no createdByRole or non-standard)
  // 3.1 Check if explicit agentId > 0
  if (rawAgentId) {
    const agentObj = getFromMapOrObj(agentsById, rawAgentId);
    const resolvedAgentName = rawAgentName || getNameFromAgent(agentObj) || `Agent #${rawAgentId}`;
    const resolvedRmId = rawRmId || getNumericId(agentObj?.rmId || agentObj?.RmId || agentObj?.RMId);
    const rmObj = getFromMapOrObj(rmsById, resolvedRmId);
    const resolvedRmName = rawRmName || getNameFromRm(rmObj) || (agentObj?.rmName || agentObj?.RmName || agentObj?.RMName) || (resolvedRmId ? `RM #${resolvedRmId}` : '—');

    return {
      isAgentCreated: true,
      isDirectRm: false,
      agentId: rawAgentId,
      agentName: resolvedAgentName,
      rmId: resolvedRmId,
      rmName: resolvedRmName,
      sourceType: 'AGENT',
    };
  }

  // 3.2 Check if createdBy is an agent ID in agentsById (and not an RM)
  const createdByAgent = getFromMapOrObj(agentsById, createdBy || createdByUserId);
  const createdByRm = getFromMapOrObj(rmsById, rawRmId || createdBy || createdByUserId);

  if (createdByAgent && !createdByRm) {
    const resolvedAgentId = createdBy || createdByUserId;
    const resolvedAgentName = rawAgentName || getNameFromAgent(createdByAgent) || `Agent #${resolvedAgentId}`;
    const resolvedRmId = rawRmId || getNumericId(createdByAgent.rmId || createdByAgent.RmId || createdByAgent.RMId);
    const rmObj = getFromMapOrObj(rmsById, resolvedRmId);
    const resolvedRmName = rawRmName || getNameFromRm(rmObj) || (createdByAgent.rmName || createdByAgent.RmName || createdByAgent.RMName) || (resolvedRmId ? `RM #${resolvedRmId}` : '—');

    return {
      isAgentCreated: true,
      isDirectRm: false,
      agentId: resolvedAgentId,
      agentName: resolvedAgentName,
      rmId: resolvedRmId,
      rmName: resolvedRmName,
      sourceType: 'AGENT',
    };
  }

  // 3.3 Check if rmId > 0 or createdBy is an RM ID in rmsById
  if (rawRmId || createdByRm) {
    const resolvedRmId = rawRmId || createdBy || createdByUserId;
    const resolvedRmName = rawRmName || getNameFromRm(createdByRm) || (resolvedRmId ? `RM #${resolvedRmId}` : '—');

    return {
      isAgentCreated: false,
      isDirectRm: true,
      agentId: null,
      agentName: 'Direct (RM)',
      rmId: resolvedRmId,
      rmName: resolvedRmName,
      sourceType: 'DIRECT_RM',
    };
  }

  // Default fallback if no resolution could be made
  return {
    isAgentCreated: false,
    isDirectRm: false,
    agentId: null,
    agentName: rawAgentName || '—',
    rmId: null,
    rmName: rawRmName || '—',
    sourceType: 'UNKNOWN',
  };
}

export default resolveApplicationOwnership;
