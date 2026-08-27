/**
 * routeConfig.js
 *
 * Centralised route path constants for the Back Office module.
 *
 * Rules:
 *  - Never hardcode path strings inside components or config files.
 *  - Always import from here: import { ROUTES } from '../config/routeConfig'
 *  - Changing a URL means editing only this file.
 *  - All routes are prefixed with /backoffice as the base path.
 */

const BASE = '/backoffice';

export const ROUTES = {
  /* ==========================================
     MAIN
  ========================================== */
  DASHBOARD:            `${BASE}/dashboard`,

  /* ==========================================
     APPLICATIONS
  ========================================== */
  NEW_APPLICATIONS:      `${BASE}/applications/new`,
  DOCUMENT_VERIFICATION: `${BASE}/applications/new/:id/document-verification`,
  IN_REVIEW:             `${BASE}/applications/in-review`,
  RETURNED:              `${BASE}/applications/returned`,
  PENDING_APPLICATIONS:  `${BASE}/applications/pending`,
  REJECTED_APPLICATIONS: `${BASE}/applications/rejected`,
  APPROVED:              `${BASE}/applications/approved`,
  DISBURSED:             `${BASE}/applications/disbursed`,
  REJECT_APPLICATION:    `${BASE}/applications/new/:id/reject`,

  /* ==========================================
     LOAN PROCESS
  ========================================== */
  PAN_VERIFICATION:     `${BASE}/applications/new/:id/pan-verification`,
  CIBIL_ELIGIBILITY:    `${BASE}/loan/cibil-eligibility`,
  BANK_VERIFICATION:    `${BASE}/applications/new/:id/bank-verification`,
  LOAN_DOCUMENTS:       `${BASE}/applications/new/:id/loan-documents`,
  FINAL_APPROVAL:       `${BASE}/applications/new/:id/final-approval`,
  DISBURSEMENT:         `${BASE}/applications/new/:id/disbursement`,
  DISBURSEMENT_HISTORY: `${BASE}/loan/disbursement-history`,

  /* ==========================================
     REPORTS
  ========================================== */
  REPORTS_ANALYTICS:    `${BASE}/reports/analytics`,
  AUDIT_TRAIL:          `${BASE}/reports/audit-trail`,

  /* ==========================================
     ACCOUNT
  ========================================== */
  PROFILE:              `${BASE}/profile`,
  LOGOUT:               `${BASE}/logout`,
};
