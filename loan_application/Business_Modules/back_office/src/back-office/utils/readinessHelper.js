/**
 * readinessHelper.js
 * --------------------
 * Evaluates whether a Back Office loan application has completed the FULL required
 * Back Office underwriting and verification workflow before becoming eligible for
 * Submit to Credit Manager.
 *
 * Back Office Workflow Sections & Verification Rules:
 * 1. Head Office Gate: Must have reached Head Office (status >= 2).
 *    Status 0 (New/Draft) and Status 1 (Pending RM) are NEVER Credit Manager ready.
 *    NOTE: Status >= 3 (Under Review) is NOT an automatic shortcut; the full verification workflow is strictly evaluated.
 *
 * 2. Section 02 - Document Verification:
 *    - Persisted in /api/BackOfficeStepVerification.
 *    - All 6 core KYC document step codes (PROFILE_IMAGE, AADHAAR, PAN, SALARY_SLIP, BANK_STATEMENT, ZIP_ARCHIVE)
 *      must be verified (isVerified === true) for Primary Applicant (applicantSequence 0).
 *    - If Co-Applicant records exist, their required step codes must also be verified.
 *
 * 3. Section 06 - Legal Opinion:
 *    - Persisted in /api/BackOfficeApplicationDocuments.
 *    - Must have an active document with documentType === 'LEGAL_OPINION'.
 *
 * 4. Section 07 - Technical Value:
 *    - Persisted in /api/BackOfficeApplicationDocuments.
 *    - Must have an active document with documentType === 'TECHNICAL_VALUATION'.
 *
 * 5. Section 08 - CIBIL Check:
 *    - Persisted in /api/BackOfficeApplicationDocuments.
 *    - Must have an active document with documentType === 'CIBIL_REPORT' or 'MANUAL_CIBIL_PAN'.
 *
 * 6. Section 10 & 11 - Eligibility Assessment & Credit Recommendation:
 *    - Persisted in /api/calculation/assessments/by-application/:appProdId.
 *    - Must have a calculated assessment record with eligible/recommended sanction terms.
 *
 * 7. Unresolved Document Rejections:
 *    - Persisted in /api/BackOfficeDocumentRejection.
 *    - Must have NO active unresolved document rejections (status !== 'Verified' && status !== 'Resolved').
 */

export const REQUIRED_DOCUMENT_STEP_CODES = [
  'PROFILE_IMAGE',
  'AADHAAR',
  'PAN',
  'SALARY_SLIP',
  'BANK_STATEMENT',
  'ZIP_ARCHIVE',
];

export const REQUIRED_APPLICATION_DOC_TYPES = [
  'LEGAL_OPINION',
  'TECHNICAL_VALUATION',
  'CIBIL_REPORT',
];

/**
 * Checks if a loan application meets all FULL Back Office verification requirements.
 *
 * Supports both options object:
 *   isApplicationUnderwritingReady({ customer, stepVerifications, applicationDocuments, assessments, rejections })
 * and positional parameters:
 *   isApplicationUnderwritingReady(customer, stepVerifications, applicationDocuments, assessments, rejections)
 *
 * @returns {boolean}
 */
export function isApplicationUnderwritingReady(firstArg, ...rest) {
  let customer = null;
  let stepVerifications = [];
  let applicationDocuments = [];
  let assessments = [];
  let rejections = [];

  if (
    firstArg &&
    typeof firstArg === 'object' &&
    !('status' in firstArg) &&
    ('customer' in firstArg || 'stepVerifications' in firstArg)
  ) {
    customer = firstArg.customer;
    stepVerifications = firstArg.stepVerifications || [];
    applicationDocuments = firstArg.applicationDocuments || [];
    assessments = firstArg.assessments || [];
    rejections = firstArg.rejections || [];
  } else {
    customer = firstArg;
    stepVerifications = rest[0] || [];
    applicationDocuments = rest[1] || [];
    assessments = rest[2] || [];
    rejections = rest[3] || [];
  }

  return evaluateReadiness(
    customer,
    stepVerifications,
    applicationDocuments,
    assessments,
    rejections
  );
}

function evaluateReadiness(
  customer,
  stepVerifications = [],
  applicationDocuments = [],
  assessments = [],
  rejections = []
) {
  if (!customer) return false;

  // 1. Head Office Pre-Credit Stage Gate: Allow ONLY status === 2 (Logged to HO) or status === 3 (Under Review)
  // Status 0 (Draft), 1 (Pending RM), 4 (Approved), 5 (Rejected), 6 (Returned) are NEVER in the Submit to Credit queue.
  const statusNum = Number(customer.status);
  if (isNaN(statusNum) || (statusNum !== 2 && statusNum !== 3)) {
    return false;
  }

  // 2. Document Verification (6/6 KYC Steps in BackOfficeStepVerification)
  const verificationsList = Array.isArray(stepVerifications)
    ? stepVerifications
    : (stepVerifications?.value || stepVerifications?.data || []);

  if (!verificationsList || verificationsList.length === 0) {
    return false;
  }

  const activeVerifs = verificationsList.filter((v) => v && v.isActive !== false);
  if (activeVerifs.length === 0) {
    return false;
  }

  // Verify Primary Applicant (sequence 0) has all 6 required step codes verified
  const primarySteps = new Set(
    activeVerifs
      .filter((v) => Number(v.applicantSequence || 0) === 0 && Boolean(v.isVerified))
      .map((v) => String(v.stepCode || '').trim().toUpperCase())
  );

  const primaryDocComplete = REQUIRED_DOCUMENT_STEP_CODES.every((code) => primarySteps.has(code));
  if (!primaryDocComplete) {
    return false;
  }

  // Verify Co-Applicants if any are present in step verification records
  const coApplicantSeqs = [
    ...new Set(
      activeVerifs
        .map((v) => Number(v.applicantSequence || 0))
        .filter((seq) => seq > 0)
    ),
  ];

  for (const seq of coApplicantSeqs) {
    const coSteps = new Set(
      activeVerifs
        .filter((v) => Number(v.applicantSequence) === seq && Boolean(v.isVerified))
        .map((v) => String(v.stepCode || '').trim().toUpperCase())
    );
    const coComplete = REQUIRED_DOCUMENT_STEP_CODES.every((code) => coSteps.has(code));
    if (!coComplete) {
      return false;
    }
  }

  // 3. Back Office Application Documents (Legal Opinion, Technical Valuation, CIBIL Report)
  const appDocsList = Array.isArray(applicationDocuments)
    ? applicationDocuments
    : (applicationDocuments?.value || applicationDocuments?.data || []);

  const activeAppDocs = appDocsList.filter((d) => d && d.isActive !== false);

  const hasLegalOpinion = activeAppDocs.some(
    (d) => String(d.documentType || '').trim().toUpperCase() === 'LEGAL_OPINION'
  );
  if (!hasLegalOpinion) {
    return false;
  }

  const hasTechnicalValuation = activeAppDocs.some(
    (d) => String(d.documentType || '').trim().toUpperCase() === 'TECHNICAL_VALUATION'
  );
  if (!hasTechnicalValuation) {
    return false;
  }

  const hasCibilReport = activeAppDocs.some(
    (d) =>
      String(d.documentType || '').trim().toUpperCase() === 'CIBIL_REPORT' ||
      String(d.documentType || '').trim().toUpperCase() === 'MANUAL_CIBIL_PAN'
  );
  if (!hasCibilReport) {
    return false;
  }

  // 4. Eligibility Assessment (Step 10)
  const assessmentsList = Array.isArray(assessments)
    ? assessments
    : (assessments?.value || assessments?.data || []);

  const activeAssessments = assessmentsList.filter((a) => a && a.isActive !== false);
  if (activeAssessments.length === 0) {
    return false;
  }

  // 4a. Eligibility Complete: Calculation has been executed with concrete populated result fields
  const hasEligibilityComplete = activeAssessments.some((a) => {
    const maxAmount = Number(a.maximumEligibleLoanAmount || a.finalLoanEligibility || 0);
    const eligibleEmi = Number(a.eligibleEMI || a.maxEmi || 0);
    const hasCalculatedAt = Boolean(a.calculatedAt || a.calculatedDate);
    const statusText = String(a.status || '').trim().toLowerCase();
    const hasCalculatedStatus =
      statusText === 'eligible' ||
      statusText === 'calculated' ||
      statusText === 'ineligible' ||
      statusText === 'completed';

    // Must have a populated calculated monetary result (> 0) OR a valid calculation status with timestamp
    return maxAmount > 0 || eligibleEmi > 0 || (hasCalculatedStatus && hasCalculatedAt);
  });

  if (!hasEligibilityComplete) {
    return false;
  }

  // 4b. Recommendation Complete: Underwriter has saved Company Recommendation
  const hasRecommendationComplete = activeAssessments.some((a) => {
    const recAmount = Number(a.recommendedLoanAmount || 0);
    if (recAmount > 0) return true;
    if (a.assessmentData) {
      let data = a.assessmentData;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {}
      }
      const dataRec = Number(
        data?.recommendedLoanAmount ||
        data?.loanDetails?.recommendedLoanAmount ||
        data?.recommendation?.recommendedLoanAmount ||
        0
      );
      if (dataRec > 0) return true;
    }
    return false;
  });

  if (!hasRecommendationComplete) {
    return false;
  }

  // 5. Unresolved Document Rejections Check
  const rejectionsList = Array.isArray(rejections)
    ? rejections
    : (rejections?.value || rejections?.data || []);

  const activeUnresolvedRejections = rejectionsList.filter(
    (r) =>
      r &&
      r.isActive !== false &&
      r.status !== 'Verified' &&
      r.status !== 'Resolved'
  );

  if (activeUnresolvedRejections.length > 0) {
    return false;
  }

  return true;
}

export default isApplicationUnderwritingReady;
