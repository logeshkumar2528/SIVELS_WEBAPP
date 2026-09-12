/**
 * endpoints.js
 * --------------------
 * Purpose:
 *   Centralized backend API endpoint definitions for the Sivels Finance Back Office module.
 *
 * Rules:
 *   - Do NOT hardcode baseURL; axiosInstance handles baseURL and Bearer token injection.
 *   - Use parameterized endpoint builders for ID-based lookups.
 *   - Strict URI encoding on dynamic parameters to prevent injection.
 */

export const BACK_OFFICE_ENDPOINTS = {
  // Master Data
  DISTRICTS: '/District',
  DISTRICT_BY_ID: (id) => `/District/${encodeURIComponent(id)}`,

  RMS: '/RMMaster',
  RM_BY_ID: (id) => `/RMMaster/${encodeURIComponent(id)}`,

  AGENTS: '/AgentMaster',
  AGENT_BY_ID: (id) => `/AgentMaster/${encodeURIComponent(id)}`,

  // Customer / Lead Ingestion
  CUSTOMERS: '/AgentAddCustomer',
  CUSTOMER_BY_ID: (id) => `/AgentAddCustomer/${encodeURIComponent(id)}`,

  // Full RM 12-Step Underwriting Application
  APPLICATION_FULL_DETAILS: (agentCustomerId) =>
    `/ApplicationFullDetails/${encodeURIComponent(agentCustomerId)}`,

  // Customer Uploaded Documents
  CUSTOMER_DOCUMENTS: (agentCustomerId) =>
    `/AgentCustomerDocument/bycustomer/${encodeURIComponent(agentCustomerId)}`,

  DOCUMENT_DOWNLOAD: (documentId) =>
    `/AgentCustomerDocument/download/${encodeURIComponent(documentId)}`,

  // Back Office Operator Master & Profile
  BACK_OFFICE_MASTER: '/BackOfficeMaster',
  BACK_OFFICE_BY_ID: (id) =>
    `/BackOfficeMaster/${encodeURIComponent(id)}`,

  // FOIR Eligibility Calculation
  FOIR_CALCULATION: '/FOIREligibilityCalculation',
  FOIR_BY_CUSTOMER: (agentCustomerId) =>
    `/FOIREligibilityCalculation/by-customer/${encodeURIComponent(agentCustomerId)}`,
  FOIR_CALCULATE: '/FOIREligibilityCalculation/calculate',

  // Document Rejection & Returned Application Workflow
  DOCUMENT_REJECTIONS: '/BackOfficeDocumentRejection',
  DOCUMENT_REJECTION_BY_ID: (id) =>
    `/BackOfficeDocumentRejection/${encodeURIComponent(id)}`,
  DOCUMENT_REJECTIONS_BY_APPLICATION: (applicationProductDetailsId) =>
    `/BackOfficeDocumentRejection/application/${encodeURIComponent(applicationProductDetailsId)}`,
  DOCUMENT_REJECTIONS_BY_RM_RETURNED: (rmId) =>
    `/BackOfficeDocumentRejection/rm/${encodeURIComponent(rmId)}/returned`,
  DOCUMENT_REJECTION_RESUBMIT: (id) =>
    `/BackOfficeDocumentRejection/${encodeURIComponent(id)}/resubmit`,
  DOCUMENT_REJECTION_VERIFY: (id) =>
    `/BackOfficeDocumentRejection/${encodeURIComponent(id)}/verify`,
};
