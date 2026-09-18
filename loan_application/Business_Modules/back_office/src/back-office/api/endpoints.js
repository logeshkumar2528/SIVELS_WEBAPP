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

  PD_VERIFICATION_TYPES: '/PDVerificationTypeMaster',

  BANKS_ACTIVE: '/masters/bank/active',
  BANK_BRANCHES: '/BankBranch',
  BANK_ACTIVE_LOANS: '/ApplicationBankActiveLoanDetails',
  BANK_ACTIVE_LOAN_BY_ID: (id) =>
    `/ApplicationBankActiveLoanDetails/${encodeURIComponent(id)}`,
  BANK_EXISTING_LOANS: '/ApplicationBankExistingLoanDetails',
  BANK_EXISTING_LOAN_BY_ID: (id) =>
    `/ApplicationBankExistingLoanDetails/${encodeURIComponent(id)}`,

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

  // FOIR Eligibility Calculation (Legacy)
  FOIR_CALCULATION: '/FOIREligibilityCalculation',
  FOIR_BY_CUSTOMER: (agentCustomerId) =>
    `/FOIREligibilityCalculation/by-customer/${encodeURIComponent(agentCustomerId)}`,
  FOIR_CALCULATE: '/FOIREligibilityCalculation/calculate',

  // Master Data - FOIR & Assessment
  FOIR_MASTER: '/FOIRMaster',
  EMPLOYMENT_TYPES: '/EmploymentType',

  // New Eligibility Calculation Engine APIs
  CALCULATION_METHODS: '/calculation/methods',
  CALCULATION_CALCULATE: '/calculation/calculate',
  CALCULATION_SALARY_INCOME: '/calculation/salary-income',
  CALCULATION_SALARY_INCOME_BY_ID: (salaryIncomeDetailsId) =>
    `/calculation/salary-income/${encodeURIComponent(salaryIncomeDetailsId)}`,
  CALCULATION_SALARY_INCOME_BY_SEQ: (applicationProductDetailsId, applicantSequence) =>
    `/calculation/salary-income/${encodeURIComponent(applicationProductDetailsId)}/${encodeURIComponent(applicantSequence)}`,
  CALCULATION_OTHER_INCOME: '/calculation/other-income',
  CALCULATION_OTHER_INCOME_BY_ID: (applicationOtherIncomeDetailsId) =>
    `/calculation/other-income/${encodeURIComponent(applicationOtherIncomeDetailsId)}`,
  CALCULATION_OTHER_INCOME_BY_SEQ: (applicationProductDetailsId, applicantSequence) =>
    `/calculation/other-income/${encodeURIComponent(applicationProductDetailsId)}/${encodeURIComponent(applicantSequence)}`,
  CALCULATION_ABB_ACCOUNTS: '/calculation/abb-accounts',
  CALCULATION_ABB_ACCOUNTS_BY_SEQ: (applicationProductDetailsId, applicantSequence) =>
    `/calculation/abb-accounts/${encodeURIComponent(applicationProductDetailsId)}/${encodeURIComponent(applicantSequence)}`,
  CALCULATION_ABB_BALANCES: '/calculation/abb-balances',
  CALCULATION_ABB_BALANCES_BY_ACCOUNT: (abbAccountDetailsId) =>
    `/calculation/abb-balances/${encodeURIComponent(abbAccountDetailsId)}`,
  CALCULATION_ASSESSMENTS_BY_APPLICATION: (applicationProductDetailsId) =>
    `/calculation/assessments/by-application/${encodeURIComponent(applicationProductDetailsId)}`,
  CALCULATION_ASSESSMENT_RECOMMENDATION: (loanEligibilityAssessmentId) =>
    `/calculation/assessments/${encodeURIComponent(loanEligibilityAssessmentId)}/recommendation`,

  // RTR (Repayment Track Record) Calculation APIs
  CALCULATION_RTR_LOANS: '/calculation/rtr/loans',
  CALCULATION_RTR_LOAN_BY_ID: (id) =>
    `/calculation/rtr/loans/${encodeURIComponent(id)}`,
  CALCULATION_RTR_LOANS_BY_SEQ: (applicationProductDetailsId, applicantSequence) =>
    `/calculation/rtr/loans/${encodeURIComponent(applicationProductDetailsId)}/${encodeURIComponent(applicantSequence)}`,
  CALCULATION_RTR_CALCULATE: '/calculation/rtr/calculate',
  CALCULATION_RTR_ASSESSMENTS_BY_SEQ: (applicationProductDetailsId, applicantSequence) =>
    `/calculation/rtr/assessments/${encodeURIComponent(applicationProductDetailsId)}/${encodeURIComponent(applicantSequence)}`,

  // Normal Income Calculation APIs
  CALCULATION_NORMAL_INCOME_BY_SEQ: (applicationProductDetailsId, applicantSequence) =>
    `/calculation/normal-income/${encodeURIComponent(applicationProductDetailsId)}/${encodeURIComponent(applicantSequence)}`,
  CALCULATION_NORMAL_INCOME_INCOME: '/calculation/normal-income/income',
  CALCULATION_NORMAL_INCOME_INCOME_BY_ID: (id) =>
    `/calculation/normal-income/income/${encodeURIComponent(id)}`,
  CALCULATION_NORMAL_INCOME_OTHER_INCOME: '/calculation/normal-income/other-income',
  CALCULATION_NORMAL_INCOME_OTHER_INCOME_BY_ID: (id) =>
    `/calculation/normal-income/other-income/${encodeURIComponent(id)}`,

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

  // Back Office Application Documents (Steps 09, 10, 11)
  APPLICATION_DOCUMENTS_BY_APPLICATION: (applicationProductDetailsId) =>
    `/BackOfficeApplicationDocuments/application/${encodeURIComponent(applicationProductDetailsId)}`,
  APPLICATION_DOCUMENT_UPLOAD: '/BackOfficeApplicationDocuments/upload',
  APPLICATION_DOCUMENT_DOWNLOAD: (documentId) =>
    `/BackOfficeApplicationDocuments/${encodeURIComponent(documentId)}/download`,
  APPLICATION_DOCUMENT_REPLACE: (documentId) =>
    `/BackOfficeApplicationDocuments/${encodeURIComponent(documentId)}/upload`,
  APPLICATION_DOCUMENT_METADATA: (documentId) =>
    `/BackOfficeApplicationDocuments/${encodeURIComponent(documentId)}`,
  APPLICATION_DOCUMENT_DELETE: (documentId) =>
    `/BackOfficeApplicationDocuments/${encodeURIComponent(documentId)}`,

  // Applicant-Level Documents (Salary Slip, Bank Statement)
  APPLICANT_DOCUMENT: (applicationProductDetailsId, applicantSequence, documentTypeId) =>
    `/ApplicationKYCDocuments/applicant-document?applicationProductDetailsId=${encodeURIComponent(applicationProductDetailsId)}&applicantSequence=${encodeURIComponent(applicantSequence)}&documentTypeId=${encodeURIComponent(documentTypeId)}`,
  APPLICANT_DOCUMENT_UPLOAD: '/ApplicationKYCDocuments/applicant-document/upload',
  KYC_DOCUMENT_DOWNLOAD: (path) =>
    `/ApplicationKYCDocuments/download?path=${encodeURIComponent(path)}`,

  // Step-Level Verification Persistence
  STEP_VERIFICATION: '/BackOfficeStepVerification',
  STEP_VERIFICATION_BY_APPLICATION: (appProdId) =>
    `/BackOfficeStepVerification/application/${encodeURIComponent(appProdId)}`,
};
