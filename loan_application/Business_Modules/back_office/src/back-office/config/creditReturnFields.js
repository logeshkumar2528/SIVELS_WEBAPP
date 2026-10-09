/**
 * creditReturnFields.js
 * --------------------
 * Catalog of application sections and fields the Credit Manager can flag when returning
 * an application to the Back Office. Shared by the Credit Manager and Back Office modules.
 *
 * Codes are persisted in ApplicationCreditReturnItem (SectionCode / FieldKey) together with
 * their labels, so renaming a label here never breaks existing records.
 */

export const OTHER_FIELD_KEY = 'OTHER';

/** Backend limit for ApplicationCreditReturnItem.Issue. */
export const RETURN_ISSUE_MAX = 1000;

export const CREDIT_RETURN_SECTIONS = [
  {
    code: 'APPLICATION_DETAILS',
    name: 'Application Details',
    fields: [
      { key: 'LOAN_PRODUCT', label: 'Loan Product' },
      { key: 'LOAN_AMOUNT', label: 'Requested Loan Amount' },
      { key: 'LOAN_TENURE', label: 'Loan Tenure' },
      { key: 'ROI', label: 'Rate of Interest' },
      { key: 'LOAN_PURPOSE', label: 'Purpose of Loan' },
      { key: 'TRANSACTION_TYPE', label: 'Transaction Type' },
      { key: 'CO_APPLICANT_COUNT', label: 'Number of Co-Applicants' },
    ],
  },
  {
    code: 'PERSONAL_INFORMATION',
    name: 'Personal Information',
    fields: [
      { key: 'FULL_NAME', label: 'Full Name' },
      { key: 'DATE_OF_BIRTH', label: 'Date of Birth' },
      { key: 'GENDER', label: 'Gender' },
      { key: 'FATHER_SPOUSE_NAME', label: 'Father / Spouse Name' },
      { key: 'MARITAL_STATUS', label: 'Marital Status' },
      { key: 'MOBILE_NUMBER', label: 'Mobile Number' },
      { key: 'EMAIL', label: 'Email Address' },
      { key: 'PAN_NUMBER', label: 'PAN Number' },
      { key: 'AADHAAR_NUMBER', label: 'Aadhaar Number' },
      { key: 'RELIGION_CASTE', label: 'Religion / Caste' },
      { key: 'EDUCATION', label: 'Education' },
    ],
  },
  {
    code: 'CO_APPLICANT',
    name: 'Co-Applicant Details',
    fields: [
      { key: 'CO_APPLICANT_NAME', label: 'Co-Applicant Name' },
      { key: 'CO_APPLICANT_RELATIONSHIP', label: 'Relationship with Applicant' },
      { key: 'CO_APPLICANT_PAN', label: 'Co-Applicant PAN' },
      { key: 'CO_APPLICANT_AADHAAR', label: 'Co-Applicant Aadhaar' },
      { key: 'CO_APPLICANT_KYC', label: 'Co-Applicant KYC Documents' },
      { key: 'CO_APPLICANT_INCOME', label: 'Co-Applicant Income' },
    ],
  },
  {
    code: 'ADDRESS_DETAILS',
    name: 'Address Details',
    fields: [
      { key: 'CURRENT_ADDRESS', label: 'Current Address' },
      { key: 'PERMANENT_ADDRESS', label: 'Permanent Address' },
      { key: 'PINCODE', label: 'Pincode' },
      { key: 'RESIDENCE_TYPE', label: 'Residence Type' },
      { key: 'YEARS_AT_RESIDENCE', label: 'Years at Residence' },
    ],
  },
  {
    code: 'KYC_DOCUMENTS',
    name: 'KYC Documents',
    fields: [
      { key: 'AADHAAR_FRONT', label: 'Aadhaar Front' },
      { key: 'AADHAAR_BACK', label: 'Aadhaar Back' },
      { key: 'PAN_CARD', label: 'PAN Card' },
      { key: 'PHOTO', label: 'Applicant Photo' },
      { key: 'SIGNATURE', label: 'Signature' },
      { key: 'ADDRESS_PROOF', label: 'Address Proof' },
    ],
  },
  {
    code: 'EMPLOYMENT_INCOME',
    name: 'Employment & Income Details',
    fields: [
      { key: 'OCCUPATION_TYPE', label: 'Occupation Type' },
      { key: 'EMPLOYER_BUSINESS_NAME', label: 'Employer / Business Name' },
      { key: 'MONTHLY_INCOME', label: 'Monthly Income' },
      { key: 'WORK_EXPERIENCE', label: 'Work Experience / Business Vintage' },
      { key: 'INCOME_PROOF', label: 'Income Proof Document' },
    ],
  },
  {
    code: 'BANK_EXISTING_LOANS',
    name: 'Bank / Existing Loan Details',
    fields: [
      { key: 'BANK_NAME', label: 'Bank Name' },
      { key: 'ACCOUNT_NUMBER', label: 'Account Number' },
      { key: 'IFSC', label: 'IFSC Code' },
      { key: 'BANK_STATEMENT', label: 'Bank Statement' },
      { key: 'EXISTING_LOANS', label: 'Existing Loans / EMI Obligations' },
    ],
  },
  {
    code: 'COLLATERAL',
    name: 'Collateral Details',
    fields: [
      { key: 'PROPERTY_TYPE', label: 'Property Type' },
      { key: 'PROPERTY_ADDRESS', label: 'Property Address' },
      { key: 'PROPERTY_OWNER', label: 'Property Owner' },
      { key: 'PROPERTY_DOCUMENTS', label: 'Property Documents' },
      { key: 'PROPERTY_VALUE', label: 'Property Market Value' },
    ],
  },
  {
    code: 'REFERENCES',
    name: 'Reference Details',
    fields: [
      { key: 'REFERENCE_1', label: 'Reference 1' },
      { key: 'REFERENCE_2', label: 'Reference 2' },
    ],
  },
  {
    code: 'SOURCING',
    name: 'Sourcing Details',
    fields: [
      { key: 'DISTRICT', label: 'District' },
      { key: 'RELATIONSHIP_MANAGER', label: 'Relationship Manager' },
      { key: 'FIELD_AGENT', label: 'Field Agent' },
    ],
  },
  {
    code: 'SCHEDULE_CHARGES',
    name: 'Schedule of Charges',
    fields: [
      { key: 'PROCESSING_FEE', label: 'Processing Fee' },
      { key: 'STAMP_DUTY', label: 'Stamp Duty' },
      { key: 'INSURANCE', label: 'Insurance' },
      { key: 'NET_DISBURSAL', label: 'Net Disbursal Amount' },
    ],
  },
  {
    code: 'DOCUMENT_CHECKLIST',
    name: 'Document Checklist',
    fields: [{ key: 'MANDATORY_DOCUMENTS', label: 'Mandatory Documents' }],
  },
  {
    code: 'DECLARATION',
    name: 'Declaration',
    fields: [
      { key: 'BORROWER_CONSENT', label: 'Borrower Consent' },
      { key: 'SIGNATURES', label: 'Signatures' },
    ],
  },
  {
    code: 'FIELD_INVESTIGATION',
    name: 'Field Investigation (Back Office)',
    fields: [
      { key: 'FI_REPORT', label: 'FI Report' },
      { key: 'FI_REMARKS', label: 'FI Remarks' },
    ],
  },
  {
    code: 'LEGAL_OPINION',
    name: 'Legal Report',
    fields: [
      { key: 'LEGAL_OPINION_DOCUMENT', label: 'Legal Opinion Document' },
      { key: 'ADVOCATE_REMARKS', label: 'Advocate Remarks' },
    ],
  },
  {
    code: 'TECHNICAL_VALUATION',
    name: 'Technical Valuation (Back Office)',
    fields: [
      { key: 'VALUATION_REPORT', label: 'Valuation Report' },
      { key: 'VALUATION_AMOUNT', label: 'Valuation Amount' },
    ],
  },
  {
    code: 'CIBIL',
    name: 'CIBIL / Credit Bureau (Back Office)',
    fields: [
      { key: 'CIBIL_REPORT', label: 'CIBIL Report' },
      { key: 'CIBIL_SCORE', label: 'CIBIL Score' },
    ],
  },
  {
    code: 'PD_ASSESSMENT',
    name: 'PD Assessment (Back Office)',
    fields: [
      { key: 'ASSESSMENT', label: 'Personal Discussion Assessment' },
      { key: 'ELIGIBILITY', label: 'Eligibility / FOIR Calculation' },
    ],
  },
  {
    code: 'HEALTH_CHECK',
    name: 'Health Check',
    fields: [{ key: 'HEALTH_CHECK_RESULT', label: 'Health Check Result' }],
  },
  {
    code: 'ASSET_BASE',
    name: 'Asset Base',
    fields: [
      { key: 'ASSET_RECORDS', label: 'Asset Records' },
      { key: 'ASSET_VALUE', label: 'Asset Value' },
      { key: 'ASSET_DOCUMENTS', label: 'Asset Documents' },
    ],
  },
  {
    code: 'RTR_COMMON_SHEET',
    name: 'RTR Common Sheet',
    fields: [{ key: 'OBLIGATIONS', label: 'Loan Obligations' }],
  },
  {
    code: 'ELIGIBILITY',
    name: 'Eligibility Assessment',
    fields: [{ key: 'ELIGIBILITY_RESULT', label: 'Eligibility Result' }],
  },
  {
    code: 'DEVIATIONS',
    name: 'Deviations',
    fields: [{ key: 'DEVIATION_DECISIONS', label: 'Deviation Decisions' }],
  },
  {
    code: 'RECOMMENDATION',
    name: 'Recommendation Sheet',
    fields: [{ key: 'RECOMMENDATION_NOTE', label: 'Recommendation' }],
  },
];

export function getCreditReturnSection(code) {
  return CREDIT_RETURN_SECTIONS.find((section) => section.code === code) || null;
}

/** Internal CustomerVerification step id -> section code. Steps 2-7 are the document sub-steps. */
const VERIFICATION_STEP_SECTION = {
  1: 'APPLICATION_DETAILS',
  2: 'KYC_DOCUMENTS',
  3: 'KYC_DOCUMENTS',
  4: 'KYC_DOCUMENTS',
  5: 'KYC_DOCUMENTS',
  6: 'KYC_DOCUMENTS',
  7: 'KYC_DOCUMENTS',
  8: 'FIELD_INVESTIGATION',
  9: 'FIELD_INVESTIGATION',
  10: 'FIELD_INVESTIGATION',
  11: 'LEGAL_OPINION',
  12: 'TECHNICAL_VALUATION',
  13: 'CIBIL',
  14: 'PD_ASSESSMENT',
  15: 'RTR_COMMON_SHEET',
  16: 'ELIGIBILITY',
  17: 'RECOMMENDATION',
  19: 'HEALTH_CHECK',
  20: 'ASSET_BASE',
  21: 'DEVIATIONS',
};

/**
 * Section code -> workspace step that shows it: internal step id (CustomerVerification) and the
 * visible number used in `?step=`. Form sections without their own step open "View Form".
 */
const SECTION_WORKSPACE_STEP = {
  APPLICATION_DETAILS: { stepId: 1, visibleNum: '01' },
  PERSONAL_INFORMATION: { stepId: 1, visibleNum: '01' },
  ADDRESS_DETAILS: { stepId: 1, visibleNum: '01' },
  EMPLOYMENT_INCOME: { stepId: 1, visibleNum: '01' },
  BANK_EXISTING_LOANS: { stepId: 1, visibleNum: '01' },
  COLLATERAL: { stepId: 1, visibleNum: '01' },
  REFERENCES: { stepId: 1, visibleNum: '01' },
  SOURCING: { stepId: 1, visibleNum: '01' },
  SCHEDULE_CHARGES: { stepId: 1, visibleNum: '01' },
  DOCUMENT_CHECKLIST: { stepId: 1, visibleNum: '01' },
  DECLARATION: { stepId: 1, visibleNum: '01' },
  KYC_DOCUMENTS: { stepId: 2, visibleNum: '02' },
  CO_APPLICANT: { stepId: 2, visibleNum: '02' },
  FIELD_INVESTIGATION: { stepId: 8, visibleNum: '03' },
  LEGAL_OPINION: { stepId: 11, visibleNum: '06' },
  TECHNICAL_VALUATION: { stepId: 12, visibleNum: '07' },
  CIBIL: { stepId: 13, visibleNum: '08' },
  HEALTH_CHECK: { stepId: 19, visibleNum: '09' },
  PD_ASSESSMENT: { stepId: 14, visibleNum: '10' },
  ASSET_BASE: { stepId: 20, visibleNum: '11' },
  RTR_COMMON_SHEET: { stepId: 15, visibleNum: '12' },
  ELIGIBILITY: { stepId: 16, visibleNum: '13' },
  DEVIATIONS: { stepId: 21, visibleNum: '14' },
  RECOMMENDATION: { stepId: 17, visibleNum: '15' },
};

/** The three FI steps share one section code; the flagged label tells them apart. */
const FIELD_INVESTIGATION_STEPS = {
  'property fi': { stepId: 8, visibleNum: '03' },
  'office fi': { stepId: 9, visibleNum: '04' },
  'residence fi': { stepId: 10, visibleNum: '05' },
};

/** Workspace step `{ stepId, visibleNum }` where a return item is shown and fixed. */
export function getReturnItemStep(item) {
  if (!item) return SECTION_WORKSPACE_STEP.APPLICATION_DETAILS;
  if (item.sectionCode === 'FIELD_INVESTIGATION') {
    const match = FIELD_INVESTIGATION_STEPS[String(item.fieldLabel || '').trim().toLowerCase()];
    if (match) return match;
  }
  return SECTION_WORKSPACE_STEP[item.sectionCode] || SECTION_WORKSPACE_STEP.APPLICATION_DETAILS;
}

/**
 * Builds a return item from a step-level reject raised by the Credit Manager inside
 * the verification workspace. Unknown labels fall back to the "Other" field key.
 */
export function buildCreditReturnItemFromStep({ stepNum, stepLabel, isCoApplicant, issue }) {
  const code = isCoApplicant ? 'CO_APPLICANT' : VERIFICATION_STEP_SECTION[stepNum] || 'PD_ASSESSMENT';
  const section = getCreditReturnSection(code);
  const label = String(stepLabel || '').trim() || section.name;
  const match = section.fields.find((f) => f.label.toLowerCase() === label.toLowerCase());
  return {
    sectionCode: section.code,
    sectionName: section.name,
    fieldKey: match ? match.key : OTHER_FIELD_KEY,
    fieldLabel: match ? match.label : label,
    issue: String(issue || '').trim().slice(0, RETURN_ISSUE_MAX),
  };
}
