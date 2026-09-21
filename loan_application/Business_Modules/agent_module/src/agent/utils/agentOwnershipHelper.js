/**
 * agentOwnershipHelper.js
 * -----------------------
 * SIVELS Finance — Agent Sourcing Ownership Resolution Helper
 *
 * Resolves whether a customer application record belongs to a specific agent
 * based on multi-source metadata:
 *   1. CreatedByRole === 'Agent' -> matches CreatedByUserId / CreatedBy
 *   2. Direct AgentId on the record
 *   3. Legacy fallback (when CreatedByRole is absent)
 */

export function getOwnerAgentId(customer = {}) {
  if (!customer) return null;

  const directAgentId = Number(
    customer.agentId ??
    customer.AgentId ??
    customer.agent_id ??
    customer.raw?.agentId ??
    customer.raw?.AgentId
  );

  const createdByRole = String(
    customer.createdByRole ??
    customer.CreatedByRole ??
    customer.created_by_role ??
    customer.raw?.createdByRole ??
    customer.raw?.CreatedByRole ??
    ''
  ).trim().toLowerCase();

  const createdByUserId = Number(
    customer.createdByUserId ??
    customer.CreatedByUserId ??
    customer.created_by_user_id ??
    customer.createdBy ??
    customer.CreatedBy ??
    customer.created_by ??
    customer.raw?.createdByUserId ??
    customer.raw?.CreatedByUserId ??
    customer.raw?.createdBy ??
    customer.raw?.CreatedBy
  );

  if (createdByRole === 'agent') {
    if (!isNaN(directAgentId) && directAgentId > 0) return directAgentId;
    if (!isNaN(createdByUserId) && createdByUserId > 0) return createdByUserId;
    return null;
  }

  // Legacy fallback when createdByRole is not set
  if (!isNaN(directAgentId) && directAgentId > 0) return directAgentId;
  if (!isNaN(createdByUserId) && createdByUserId > 0) return createdByUserId;

  return null;
}

export function isCustomerOwnedByAgent(customer = {}, targetAgentId) {
  if (!customer || targetAgentId === null || targetAgentId === undefined || targetAgentId === '') return false;
  const targetId = Number(targetAgentId);
  if (isNaN(targetId) || targetId <= 0) return false;

  const ownerId = getOwnerAgentId(customer);
  return ownerId !== null && ownerId === targetId;
}

export default isCustomerOwnedByAgent;
