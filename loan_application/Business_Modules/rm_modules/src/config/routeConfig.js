/**
 * routeConfig.js
 * Centralized route paths for RM Module
 */
const BASE = '/rm';
const NEW_APPLICATION_BASE = `${BASE}/applications/new/:applicationId`;

export const ROUTES = {
  DASHBOARD:             `${BASE}/dashboard`,
  NEW_APPLICATIONS:      `${BASE}/applications/new`,
  PENDING_APPLICATIONS:  `${BASE}/applications/pending`,
  APPROVED_APPLICATIONS: `${BASE}/applications/approved`,
  RETURNED_APPLICATIONS: `${BASE}/applications/returned`,
  SUBMISSION_HISTORY:    `${BASE}/applications/submission-history`,
  FIELD_VERIFICATION:    `${BASE}/applications/field-verification`,
  FIELD_VERIFICATION_STEP2: `${BASE}/applications/field-verification/step-2`,
  APPLICATION_DETAILS:   `${NEW_APPLICATION_BASE}/application-details`,
  PERSONAL_INFORMATION:   `${NEW_APPLICATION_BASE}/personal`,
  ADDRESS_DETAILS:       `${NEW_APPLICATION_BASE}/address`,
  KYC_DOCUMENTS:         `${NEW_APPLICATION_BASE}/kyc-documents`,
  EMPLOYMENT_INCOME:     `${NEW_APPLICATION_BASE}/employment`,
  BANK_EXISTING_LOANS:   `${NEW_APPLICATION_BASE}/banking`,
  COLLATERAL:            `${NEW_APPLICATION_BASE}/collateral`,
  REFERENCES:            `${NEW_APPLICATION_BASE}/reference`,
  SOURCING:              `${NEW_APPLICATION_BASE}/sourcing`,
  SCHEDULE_CHARGES:      `${NEW_APPLICATION_BASE}/charges`,
  DOCUMENT_CHECKLIST:    `${NEW_APPLICATION_BASE}/checklist`,
  DECLARATION:           `${NEW_APPLICATION_BASE}/declaration`,
  CUSTOMER_VERIFICATION: `${NEW_APPLICATION_BASE}/personal`,
  AADHAAR_EKYC:          `${NEW_APPLICATION_BASE}/kyc-documents`,
  CUSTOMER_REGISTRATION: `${NEW_APPLICATION_BASE}/personal`,
  CREATE_LOGIN:          `${NEW_APPLICATION_BASE}/charges`,
  REVIEW_SUBMIT:         `${NEW_APPLICATION_BASE}/declaration`,
  APPLICATION_PDF_VIEW:  `${NEW_APPLICATION_BASE}/pdf-view`,
  AGENT_CREATION:        `${BASE}/agent-creation`,
  MY_AGENTS:             `${BASE}/agents`,
  PROFILE:               `${BASE}/profile`,
  LOGOUT:                `${BASE}/logout`,
};
