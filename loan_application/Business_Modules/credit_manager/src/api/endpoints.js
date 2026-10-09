/**
 * endpoints.js
 * --------------------
 * Centralized backend API endpoint definitions for the Credit Manager module.
 * axiosInstance handles baseURL and Bearer token injection.
 */

export const CREDIT_MANAGER_ENDPOINTS = {
  CREDIT_MANAGER_MASTER: '/CreditManagerMaster',
  CREDIT_MANAGER_BY_ID: (id) => `/CreditManagerMaster/${encodeURIComponent(id)}`,

  CUSTOMERS: '/AgentAddCustomer',

  CREDIT_APPROVE: (agentCustomerId) =>
    `/ApplicationWorkflow/${encodeURIComponent(agentCustomerId)}/credit-approve`,
  CREDIT_REJECT: (agentCustomerId) =>
    `/ApplicationWorkflow/${encodeURIComponent(agentCustomerId)}/credit-reject`,
  RETURN_TO_BACK_OFFICE: (agentCustomerId) =>
    `/ApplicationWorkflow/${encodeURIComponent(agentCustomerId)}/return-to-backoffice`,
  WORKFLOW_HISTORY: (agentCustomerId) =>
    `/ApplicationWorkflow/${encodeURIComponent(agentCustomerId)}/history`,

  CREDIT_DECISIONS_BY_CUSTOMER: (agentCustomerId) =>
    `/ApplicationCreditDecision/by-customer/${encodeURIComponent(agentCustomerId)}`,
  LATEST_CREDIT_DECISION: (agentCustomerId) =>
    `/ApplicationCreditDecision/by-customer/${encodeURIComponent(agentCustomerId)}/latest`,

  CREDIT_RETURN_ITEMS_BY_CUSTOMER: (agentCustomerId) =>
    `/ApplicationCreditReturnItem/by-customer/${encodeURIComponent(agentCustomerId)}`,
  CREDIT_RETURN_ITEM_ACCEPT: (itemId) =>
    `/ApplicationCreditReturnItem/${encodeURIComponent(itemId)}/accept`,
};
