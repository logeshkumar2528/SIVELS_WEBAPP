/**
 * creditManagerService.js
 * --------------------
 * API service layer for the Credit Manager module.
 */

import axiosInstance from '../../../../Core/src/api/axiosInstance';
import { CREDIT_MANAGER_ENDPOINTS } from './endpoints';

export function unwrapResponse(res) {
  if (res == null) return null;
  const data = res?.data !== undefined ? res.data : res;
  if (data == null) return null;
  if (data.value !== undefined) return data.value;
  if (data.data !== undefined) return data.data;
  if (data.result !== undefined) return data.result;
  return data;
}

export function unwrapList(res) {
  const data = unwrapResponse(res);
  return Array.isArray(data) ? data : [];
}

const creditManagerService = {
  getCreditManagerProfile: async (id) => {
    const response = await axiosInstance.get(CREDIT_MANAGER_ENDPOINTS.CREDIT_MANAGER_BY_ID(id));
    return unwrapResponse(response);
  },

  getAllApplications: async () => {
    const response = await axiosInstance.get(CREDIT_MANAGER_ENDPOINTS.CUSTOMERS);
    return unwrapList(response);
  },

  /**
   * Status 3 -> 4. Payload: { performedByUserId, performedByRole, remarks,
   * sanctionedLoanAmount, sanctionedROI, sanctionedTenureMonths, conditions }
   */
  creditApprove: async (agentCustomerId, payload) => {
    const response = await axiosInstance.post(CREDIT_MANAGER_ENDPOINTS.CREDIT_APPROVE(agentCustomerId), payload);
    return unwrapResponse(response);
  },

  /** Status 3 -> 5. Payload: { performedByUserId, performedByRole, remarks } */
  creditReject: async (agentCustomerId, payload) => {
    const response = await axiosInstance.post(CREDIT_MANAGER_ENDPOINTS.CREDIT_REJECT(agentCustomerId), payload);
    return unwrapResponse(response);
  },

  /**
   * Status 3 -> 2. Payload: { performedByUserId, performedByRole, remarks,
   * returnItems: [{ sectionCode, sectionName, fieldKey, fieldLabel, issue }] }
   */
  returnToBackOffice: async (agentCustomerId, payload) => {
    const response = await axiosInstance.post(
      CREDIT_MANAGER_ENDPOINTS.RETURN_TO_BACK_OFFICE(agentCustomerId),
      payload
    );
    return unwrapResponse(response);
  },

  getWorkflowHistory: async (agentCustomerId) => {
    const response = await axiosInstance.get(CREDIT_MANAGER_ENDPOINTS.WORKFLOW_HISTORY(agentCustomerId));
    return unwrapList(response);
  },

  /** Newest first. */
  getCreditDecisions: async (agentCustomerId) => {
    const response = await axiosInstance.get(CREDIT_MANAGER_ENDPOINTS.CREDIT_DECISIONS_BY_CUSTOMER(agentCustomerId));
    return unwrapList(response);
  },

  /** Flagged fields from every return, newest first. [] when none exist (404). */
  getCreditReturnItems: async (agentCustomerId) => {
    try {
      const response = await axiosInstance.get(
        CREDIT_MANAGER_ENDPOINTS.CREDIT_RETURN_ITEMS_BY_CUSTOMER(agentCustomerId)
      );
      return unwrapList(response);
    } catch (err) {
      if (err?.response?.status === 404) return [];
      throw err;
    }
  },

  /**
   * Accept the Back Office fix for a resubmitted item (Resubmitted -> Accepted).
   * Payload: { reviewedByUserId, reviewedByRole: 'CreditManager', reviewRemarks }
   */
  acceptCreditReturnItem: async (itemId, payload) => {
    const response = await axiosInstance.put(CREDIT_MANAGER_ENDPOINTS.CREDIT_RETURN_ITEM_ACCEPT(itemId), payload);
    return unwrapResponse(response);
  },

  /** Resolves to null when no decision exists yet (backend returns 404). */
  getLatestCreditDecision: async (agentCustomerId) => {
    try {
      const response = await axiosInstance.get(CREDIT_MANAGER_ENDPOINTS.LATEST_CREDIT_DECISION(agentCustomerId));
      return unwrapResponse(response);
    } catch (err) {
      if (err?.response?.status === 404) return null;
      throw err;
    }
  },
};

export default creditManagerService;
