/**
 * backOfficeService.js
 * --------------------
 * Purpose:
 *   Centralized service layer for Back Office API communications.
 *
 * Architecture:
 *   - Reuses the shared Core axiosInstance for baseURL, timeout, token injection, and error handling.
 *   - Provides typed, clean asynchronous service calls.
 *   - Safely unwraps backend response envelopes ([...], { data: [...] }, { value: [...] }, { result: [...] }).
 */

import axiosInstance from '../../../../../Core/src/api/axiosInstance';
import { BACK_OFFICE_ENDPOINTS } from './endpoints';

/**
 * Safely unwrap data from various backend response envelope structures.
 *
 * @param {any} res - Axios response or response.data
 * @returns {any} Unwrapped data
 */
export function unwrapResponse(res) {
  if (res == null) return null;
  const data = res?.data !== undefined ? res.data : res;
  if (data == null) return null;

  // Handle standard .NET / Spring / Node response wrappers
  if (data.value !== undefined) return data.value;
  if (data.data !== undefined) return data.data;
  if (data.result !== undefined) return data.result;

  return data;
}

export const backOfficeService = {
  /* ==========================================
     1. MASTER / DISTRICT APIs
  ========================================== */

  /**
   * Retrieve all districts across the state.
   */
  getDistricts: async () => {
    const response = await axiosInstance.get(BACK_OFFICE_ENDPOINTS.DISTRICTS);
    return unwrapResponse(response);
  },

  /**
   * Retrieve a single district by ID.
   * @param {string|number} id - District ID
   */
  getDistrictById: async (id) => {
    const response = await axiosInstance.get(BACK_OFFICE_ENDPOINTS.DISTRICT_BY_ID(id));
    return unwrapResponse(response);
  },

  /* ==========================================
     2. RELATIONSHIP MANAGER (RM) APIs
  ========================================== */

  /**
   * Retrieve all Relationship Managers globally (no user restriction).
   */
  getAllRMs: async () => {
    const response = await axiosInstance.get(BACK_OFFICE_ENDPOINTS.RMS);
    return unwrapResponse(response);
  },

  /**
   * Retrieve a single RM by ID.
   * @param {string|number} id - RM ID
   */
  getRMById: async (id) => {
    const response = await axiosInstance.get(BACK_OFFICE_ENDPOINTS.RM_BY_ID(id));
    return unwrapResponse(response);
  },

  /* ==========================================
     3. FIELD AGENT APIs
  ========================================== */

  /**
   * Retrieve all Field Agents globally.
   */
  getAllAgents: async () => {
    const response = await axiosInstance.get(BACK_OFFICE_ENDPOINTS.AGENTS);
    return unwrapResponse(response);
  },

  /**
   * Retrieve a single Field Agent by ID.
   * @param {string|number} id - Agent ID
   */
  getAgentById: async (id) => {
    const response = await axiosInstance.get(BACK_OFFICE_ENDPOINTS.AGENT_BY_ID(id));
    return unwrapResponse(response);
  },

  /**
   * Retrieve all PD Verification Types from master data.
   */
  getPDVerificationTypes: async () => {
    const response = await axiosInstance.get(BACK_OFFICE_ENDPOINTS.PD_VERIFICATION_TYPES);
    return unwrapResponse(response);
  },

  /* ==========================================
     4. CUSTOMER / APPLICATION QUEUE APIs
  ========================================== */

  /**
   * Retrieve all customer loan applications.
   */
  getAllCustomers: async () => {
    const response = await axiosInstance.get(BACK_OFFICE_ENDPOINTS.CUSTOMERS);
    return unwrapResponse(response);
  },

  /**
   * Retrieve a single customer application record by ID.
   * @param {string|number} id - agentCustomerId / Customer ID
   */
  getCustomerById: async (id) => {
    const response = await axiosInstance.get(BACK_OFFICE_ENDPOINTS.CUSTOMER_BY_ID(id));
    return unwrapResponse(response);
  },

  /* ==========================================
     5. FULL 12-STEP UNDERWRITING APPLICATION
  ========================================== */

  /**
   * Retrieve full aggregated 12-step RM application details.
   * @param {string|number} agentCustomerId - Root customer / application ID
   */
  getApplicationFullDetails: async (agentCustomerId) => {
    const response = await axiosInstance.get(
      BACK_OFFICE_ENDPOINTS.APPLICATION_FULL_DETAILS(agentCustomerId)
    );
    return unwrapResponse(response);
  },

  /* ==========================================
     6. CUSTOMER DOCUMENT APIs
  ========================================== */

  /**
   * Retrieve all uploaded documents metadata for a customer.
   * @param {string|number} agentCustomerId - Root customer ID
   */
  getCustomerDocuments: async (agentCustomerId) => {
    const response = await axiosInstance.get(
      BACK_OFFICE_ENDPOINTS.CUSTOMER_DOCUMENTS(agentCustomerId)
    );
    return unwrapResponse(response);
  },

  /**
   * Download a specific document file by document ID (Blob stream).
   * @param {string|number} documentId - Document ID
   */
  downloadCustomerDocument: async (documentId) => {
    const response = await axiosInstance.get(
      BACK_OFFICE_ENDPOINTS.DOCUMENT_DOWNLOAD(documentId),
      { responseType: 'blob' }
    );
    return response.data;
  },

  /* ==========================================
     7. BACK OFFICE OPERATOR PROFILE APIs
  ========================================== */

  /**
   * Retrieve Back Office operator profile by ID.
   * @param {string|number} id - Operator ID
   */
  getBackOfficeProfile: async (id) => {
    const response = await axiosInstance.get(BACK_OFFICE_ENDPOINTS.BACK_OFFICE_BY_ID(id));
    return unwrapResponse(response);
  },

  /* ==========================================
     8. FOIR ELIGIBILITY CALCULATION APIs
  ========================================== */

  /**
   * Retrieve all FOIR eligibility calculation records.
   */
  getFoirEligibilityCalculations: async () => {
    const response = await axiosInstance.get(BACK_OFFICE_ENDPOINTS.FOIR_CALCULATION);
    return unwrapResponse(response);
  },

  /**
   * Retrieve FOIR eligibility calculations for a specific customer.
   * Backend returns records sorted newest-first by CalculationId DESC.
   * @param {string|number} agentCustomerId - Customer ID
   */
  getFoirCalculationsByCustomer: async (agentCustomerId) => {
    const response = await axiosInstance.get(BACK_OFFICE_ENDPOINTS.FOIR_BY_CUSTOMER(agentCustomerId));
    return unwrapResponse(response);
  },

  /**
   * Calculate fresh FOIR eligibility snapshot (Legacy).
   * @param {object} payload - { agentCustomerId, applicationEmploymentIncomeDetailsId, applicationProductDetailsId, createdBy }
   */
  calculateFoir: async (payload) => {
    const response = await axiosInstance.post(BACK_OFFICE_ENDPOINTS.FOIR_CALCULATE, payload);
    return unwrapResponse(response);
  },

  /* ==========================================
     8b. NEW ELIGIBILITY CALCULATION ENGINE APIs
  ========================================== */

  /**
   * Retrieve all configured calculation methods (Income Method, ABB Method).
   */
  getCalculationMethods: async () => {
    const response = await axiosInstance.get(BACK_OFFICE_ENDPOINTS.CALCULATION_METHODS);
    return unwrapResponse(response);
  },

  /**
   * Retrieve FOIR Master policies for initial policy FOIR resolution.
   */
  getFoirMaster: async () => {
    const response = await axiosInstance.get(BACK_OFFICE_ENDPOINTS.FOIR_MASTER);
    return unwrapResponse(response);
  },

  /**
   * Retrieve all configured Employment Types from Master.
   */
  getEmploymentTypes: async () => {
    const response = await axiosInstance.get(BACK_OFFICE_ENDPOINTS.EMPLOYMENT_TYPES);
    return unwrapResponse(response);
  },

  /**
   * Retrieve existing salary income records for a specific application product and applicant sequence.
   * @param {string|number} applicationProductDetailsId
   * @param {string|number} applicantSequence
   */
  getSalaryIncomeBySeq: async (applicationProductDetailsId, applicantSequence) => {
    const response = await axiosInstance.get(
      BACK_OFFICE_ENDPOINTS.CALCULATION_SALARY_INCOME_BY_SEQ(applicationProductDetailsId, applicantSequence)
    );
    return unwrapResponse(response);
  },

  /**
   * Create a single monthly salary income record.
   * @param {object} payload - { applicationProductDetailsId, agentCustomerId, applicationEmploymentIncomeDetailsId, applicantSequence, salaryMonth, basicAmount, hraAmount, ccaAmount, taAmount, incentiveAmount, incentivePercentApplied, salarySlipPath, createdBy }
   */
  createSalaryIncome: async (payload) => {
    const response = await axiosInstance.post(
      BACK_OFFICE_ENDPOINTS.CALCULATION_SALARY_INCOME,
      payload
    );
    return unwrapResponse(response);
  },

  /**
   * Update an existing monthly salary income record.
   * @param {string|number} salaryIncomeDetailsId
   * @param {object} payload - { salaryIncomeDetailsId, applicationProductDetailsId, agentCustomerId, applicationEmploymentIncomeDetailsId, applicantSequence, salaryMonth, basicAmount, hraAmount, ccaAmount, taAmount, incentiveAmount, incentivePercentApplied, salarySlipPath, modifiedBy }
   */
  updateSalaryIncome: async (salaryIncomeDetailsId, payload) => {
    const response = await axiosInstance.put(
      BACK_OFFICE_ENDPOINTS.CALCULATION_SALARY_INCOME_BY_ID(salaryIncomeDetailsId),
      payload
    );
    return unwrapResponse(response);
  },

  /**
   * Update recommended loan amount on an eligibility assessment (Company Recommendation).
   * @param {string|number} loanEligibilityAssessmentId
   * @param {object} payload - { recommendedLoanAmount, modifiedBy }
   */
  updateAssessmentRecommendation: async (loanEligibilityAssessmentId, payload) => {
    const response = await axiosInstance.patch(
      BACK_OFFICE_ENDPOINTS.CALCULATION_ASSESSMENT_RECOMMENDATION(loanEligibilityAssessmentId),
      payload
    );
    return unwrapResponse(response);
  },

  /**
   * Retrieve active banks from Bank Master.
   */
  getActiveBanks: async () => {
    const response = await axiosInstance.get(BACK_OFFICE_ENDPOINTS.BANKS_ACTIVE);
    return unwrapResponse(response);
  },

  /**
   * Retrieve bank branches from Bank Branch Master.
   */
  getBankBranches: async () => {
    const response = await axiosInstance.get(BACK_OFFICE_ENDPOINTS.BANK_BRANCHES);
    return unwrapResponse(response);
  },

  /**
   * Retrieve all bank active loans.
   */
  getActiveLoans: async () => {
    const response = await axiosInstance.get(BACK_OFFICE_ENDPOINTS.BANK_ACTIVE_LOANS);
    return unwrapResponse(response);
  },

  /**
   * Create a new active loan facility under an existing bank details ID.
   * @param {object} payload - { applicationBankExistingLoanDetailsId, loanType, totalLoanAmount, totalOutstanding, emiAmount, status, createdBy }
   */
  createActiveLoan: async (payload) => {
    const response = await axiosInstance.post(BACK_OFFICE_ENDPOINTS.BANK_ACTIVE_LOANS, payload);
    return unwrapResponse(response);
  },

  /**
   * Update an existing active loan facility.
   * @param {string|number} id
   * @param {object} payload - { applicationBankActiveLoanDetailsId, applicationBankExistingLoanDetailsId, loanType, totalLoanAmount, totalOutstanding, emiAmount, status, modifiedBy }
   */
  updateActiveLoan: async (id, payload) => {
    const response = await axiosInstance.put(BACK_OFFICE_ENDPOINTS.BANK_ACTIVE_LOAN_BY_ID(id), payload);
    return unwrapResponse(response);
  },

  /**
   * Retrieve all bank existing loan records.
   */
  getBankExistingLoans: async () => {
    const response = await axiosInstance.get(BACK_OFFICE_ENDPOINTS.BANK_EXISTING_LOANS);
    return unwrapResponse(response);
  },

  /**
   * Create an application bank existing loan record.
   * @param {object} payload - { applicationEmploymentIncomeDetailsId, bankId, bankBranchId, accountNumber, noOfActiveLoans, noOfActiveCreditCards, isPrimaryBank, createdBy }
   */
  createBankExistingLoan: async (payload) => {
    const response = await axiosInstance.post(BACK_OFFICE_ENDPOINTS.BANK_EXISTING_LOANS, payload);
    return unwrapResponse(response);
  },

  /**
   * Retrieve ABB accounts for a specific application product and applicant sequence.
   * @param {string|number} applicationProductDetailsId
   * @param {string|number} applicantSequence
   */
  getAbbAccountsBySeq: async (applicationProductDetailsId, applicantSequence) => {
    const response = await axiosInstance.get(
      BACK_OFFICE_ENDPOINTS.CALCULATION_ABB_ACCOUNTS_BY_SEQ(applicationProductDetailsId, applicantSequence)
    );
    return unwrapResponse(response);
  },

  /**
   * Create a new ABB account registration record.
   * @param {object} payload - { applicationProductDetailsId, agentCustomerId, applicantSequence, bankId, bankBranchId, accountNumber, statementFromDate, statementToDate, statementDocumentPath, isIncluded, createdBy }
   */
  createAbbAccount: async (payload) => {
    const response = await axiosInstance.post(
      BACK_OFFICE_ENDPOINTS.CALCULATION_ABB_ACCOUNTS,
      payload
    );
    return unwrapResponse(response);
  },

  /**
   * Retrieve monthly ABB balances for a specific ABB account ID.
   * @param {string|number} abbAccountDetailsId
   */
  getAbbBalances: async (abbAccountDetailsId) => {
    const response = await axiosInstance.get(
      BACK_OFFICE_ENDPOINTS.CALCULATION_ABB_BALANCES_BY_ACCOUNT(abbAccountDetailsId)
    );
    return unwrapResponse(response);
  },

  /**
   * Create a single monthly balance record for an ABB account.
   * @param {object} payload - { abbAccountDetailsId, balanceMonth, balanceOn5th, balanceOn15th, balanceOn25th, createdBy }
   */
  createAbbBalance: async (payload) => {
    const response = await axiosInstance.post(
      BACK_OFFICE_ENDPOINTS.CALCULATION_ABB_BALANCES,
      payload
    );
    return unwrapResponse(response);
  },

  /**
   * Run authoritative Eligibility Calculation engine (Income or ABB method).
   * @param {object} payload - { applicationProductDetailsId, agentCustomerId, applicationEmploymentIncomeDetailsId, applicantSequence, assessmentMethodId, manualROI, manualTenureMonths, recommendedLoanAmount, pdDocumentPath, calculatedByUserId, calculatedByBackOfficeId, calculatedByRole }
   */
  calculateEligibility: async (payload) => {
    const response = await axiosInstance.post(
      BACK_OFFICE_ENDPOINTS.CALCULATION_CALCULATE,
      payload
    );
    return unwrapResponse(response);
  },

  /**
   * Retrieve all saved calculation assessment results for an application.
   * @param {string|number} applicationProductDetailsId
   */
  getAssessmentsByApplication: async (applicationProductDetailsId) => {
    const response = await axiosInstance.get(
      BACK_OFFICE_ENDPOINTS.CALCULATION_ASSESSMENTS_BY_APPLICATION(applicationProductDetailsId)
    );
    return unwrapResponse(response);
  },

  /* ==========================================
     9. DOCUMENT REJECTION & RETURNED WORKFLOW
  ========================================== */

  /**
   * Retrieve all rejection records.
   */
  getAllDocumentRejections: async () => {
    const response = await axiosInstance.get(BACK_OFFICE_ENDPOINTS.DOCUMENT_REJECTIONS);
    return unwrapResponse(response);
  },

  /**
   * Retrieve a specific rejection record by ID.
   * @param {string|number} id - Rejection ID
   */
  getDocumentRejectionById: async (id) => {
    const response = await axiosInstance.get(BACK_OFFICE_ENDPOINTS.DOCUMENT_REJECTION_BY_ID(id));
    return unwrapResponse(response);
  },

  /**
   * Retrieve all document rejections associated with an application.
   * @param {string|number} applicationProductDetailsId
   */
  getDocumentRejectionsByApplication: async (applicationProductDetailsId) => {
    const response = await axiosInstance.get(
      BACK_OFFICE_ENDPOINTS.DOCUMENT_REJECTIONS_BY_APPLICATION(applicationProductDetailsId)
    );
    return unwrapResponse(response);
  },

  /**
   * Retrieve all returned rejections assigned to a specific RM.
   * @param {string|number} rmId - RM ID
   */
  getReturnedRejectionsByRM: async (rmId) => {
    const response = await axiosInstance.get(
      BACK_OFFICE_ENDPOINTS.DOCUMENT_REJECTIONS_BY_RM_RETURNED(rmId)
    );
    return unwrapResponse(response);
  },

  /**
   * Create a new document rejection record (Back Office -> RM).
   * @param {object} payload - { backOfficeId, rmId, agentCustomerId, applicationProductDetailsId, kycDocumentId, fieldVerificationId, rejectedDocumentType, rejectionRemarks, createdBy }
   */
  createDocumentRejection: async (payload) => {
    const response = await axiosInstance.post(
      BACK_OFFICE_ENDPOINTS.DOCUMENT_REJECTIONS,
      payload
    );
    return unwrapResponse(response);
  },

  /**
   * RM resubmits a corrected document rejection back to Back Office.
   * @param {string|number} id - Rejection ID
   * @param {number} rmId - Logged-in RM ID
   */
  resubmitDocumentRejection: async (id, rmId) => {
    const response = await axiosInstance.put(
      BACK_OFFICE_ENDPOINTS.DOCUMENT_REJECTION_RESUBMIT(id),
      { rmId: Number(rmId) }
    );
    return unwrapResponse(response);
  },

  /**
   * Back Office verifies a resubmitted document rejection.
   * @param {string|number} id - Rejection ID
   * @param {number} backOfficeId - Logged-in Back Office Operator ID
   */
  verifyDocumentRejection: async (id, backOfficeId) => {
    const response = await axiosInstance.put(
      BACK_OFFICE_ENDPOINTS.DOCUMENT_REJECTION_VERIFY(id),
      { backOfficeId: Number(backOfficeId) }
    );
    return unwrapResponse(response);
  },

  /* ==========================================
     10. BACK OFFICE APPLICATION DOCUMENTS (STEPS 09, 10, 11)
  ========================================== */

  /**
   * Retrieve all uploaded Back Office documents for an application.
   * @param {string|number} applicationProductDetailsId
   */
  getApplicationDocuments: async (applicationProductDetailsId) => {
    const response = await axiosInstance.get(
      BACK_OFFICE_ENDPOINTS.APPLICATION_DOCUMENTS_BY_APPLICATION(applicationProductDetailsId)
    );
    return unwrapResponse(response);
  },

  /**
   * Upload a new Back Office application document (multipart/form-data).
   * @param {FormData} formData - { File, DocumentType, DocumentTitle, ApplicationProductDetailsId, BackOfficeId, RmId, Remarks, UploadedBy }
   */
  uploadApplicationDocument: async (formData) => {
    const response = await axiosInstance.post(
      BACK_OFFICE_ENDPOINTS.APPLICATION_DOCUMENT_UPLOAD,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return unwrapResponse(response);
  },

  /**
   * Download a Back Office application document as blob.
   * @param {string|number} documentId
   */
  downloadApplicationDocument: async (documentId) => {
    const response = await axiosInstance.get(
      BACK_OFFICE_ENDPOINTS.APPLICATION_DOCUMENT_DOWNLOAD(documentId),
      {
        responseType: 'blob',
      }
    );
    return response;
  },

  /**
   * Replace an existing Back Office application document (PUT multipart/form-data).
   * @param {string|number} documentId
   * @param {FormData} formData - { File, DocumentType, DocumentTitle, ModifiedBy, Remarks }
   */
  replaceApplicationDocument: async (documentId, formData) => {
    const response = await axiosInstance.put(
      BACK_OFFICE_ENDPOINTS.APPLICATION_DOCUMENT_REPLACE(documentId),
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return unwrapResponse(response);
  },

  /**
   * Update metadata (Remarks, DocumentStatus, ModifiedBy) of an application document.
   * @param {string|number} documentId
   * @param {object} payload - { remarks, documentStatus, modifiedBy }
   */
  updateApplicationDocumentMetadata: async (documentId, payload) => {
    const response = await axiosInstance.put(
      BACK_OFFICE_ENDPOINTS.APPLICATION_DOCUMENT_METADATA(documentId),
      payload
    );
    return unwrapResponse(response);
  },

  /**
   * Delete an existing Back Office application document by ID.
   * @param {string|number} documentId
   */
  deleteApplicationDocument: async (documentId) => {
    const response = await axiosInstance.delete(
      BACK_OFFICE_ENDPOINTS.APPLICATION_DOCUMENT_DELETE(documentId)
    );
    return unwrapResponse(response);
  },

  /* ==========================================
     11. APPLICANT-LEVEL DOCUMENTS (SALARY SLIP, BANK STATEMENT)
  ========================================== */

  /**
   * Fetch an applicant-level document record by composite key.
   * @param {string|number} applicationProductDetailsId
   * @param {number} applicantSequence
   * @param {number} documentTypeId
   */
  getApplicantDocument: async (applicationProductDetailsId, applicantSequence, documentTypeId) => {
    const response = await axiosInstance.get(
      BACK_OFFICE_ENDPOINTS.APPLICANT_DOCUMENT(applicationProductDetailsId, applicantSequence, documentTypeId)
    );
    return unwrapResponse(response);
  },

  /**
   * Upload a new applicant-level document (POST multipart/form-data).
   * @param {FormData} formData - { file, applicationProductDetailsId, applicantSequence, documentTypeId, uploadedBy }
   */
  uploadApplicantDocument: async (formData) => {
    const response = await axiosInstance.post(
      BACK_OFFICE_ENDPOINTS.APPLICANT_DOCUMENT_UPLOAD,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return unwrapResponse(response);
  },

  /**
   * Replace an existing applicant-level document (PUT multipart/form-data).
   * @param {FormData} formData - { file, applicationProductDetailsId, applicantSequence, documentTypeId, uploadedBy }
   */
  replaceApplicantDocument: async (formData) => {
    const response = await axiosInstance.put(
      BACK_OFFICE_ENDPOINTS.APPLICANT_DOCUMENT_UPLOAD,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return unwrapResponse(response);
  },

  /**
   * Download a KYC/applicant document as blob by relative server path.
   * @param {string} path - Server relative path
   */
  downloadKycDocumentByPath: async (path) => {
    const response = await axiosInstance.get(
      BACK_OFFICE_ENDPOINTS.KYC_DOCUMENT_DOWNLOAD(path),
      {
        responseType: 'blob',
      }
    );
    return response.data;
  },

  /* ==========================================
     12. STEP-LEVEL VERIFICATION (BACK OFFICE)
  ========================================== */

  /**
   * Retrieve all step verification records for an application.
   * @param {string|number} appProdId - Application Product Details ID
   */
  getStepVerificationsByApplication: async (appProdId) => {
    const response = await axiosInstance.get(
      BACK_OFFICE_ENDPOINTS.STEP_VERIFICATION_BY_APPLICATION(appProdId)
    );
    return unwrapResponse(response);
  },

  /**
   * Create or update a step verification record (PUT /api/BackOfficeStepVerification).
   * @param {object} payload - { applicationProductDetailsId, applicantSequence, stepCode, isVerified, remarks, verifiedByBackOfficeId }
   */
  saveStepVerification: async (payload) => {
    const response = await axiosInstance.put(
      BACK_OFFICE_ENDPOINTS.STEP_VERIFICATION,
      payload
    );
    return unwrapResponse(response);
  },
};

export default backOfficeService;
