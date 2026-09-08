/**
 * verificationSteps.js
 * --------------------
 * Purpose:
 *   Step definitions for the 12 RM Application Wizard steps in the Back Office
 *   Customer Verification workspace.
 *
 * Rules:
 *   - Centralized, zero dummy data dependencies.
 *   - Preserves step ordering (1-12) and identifiers.
 */

export const VERIFICATION_STEP_DEFINITIONS = [
  {
    id: 'application-details',
    number: 1,
    name: 'Application Details',
    shortName: 'Application',
    description: 'Loan product, requested amount, tenure, and purpose',
  },
  {
    id: 'personal-information',
    number: 2,
    name: 'Personal Information',
    shortName: 'Personal',
    description: 'Borrower demographics, contact, PAN and Aadhaar identity',
  },
  {
    id: 'address-details',
    number: 3,
    name: 'Address Details',
    shortName: 'Address',
    description: 'Current residence, permanent address, and residence vintage',
  },
  {
    id: 'kyc-documents',
    number: 4,
    name: 'KYC Documents',
    shortName: 'KYC',
    description: 'Aadhaar front/back, PAN card, photo, and signature proofs',
  },
  {
    id: 'employment-income',
    number: 5,
    name: 'Employment & Income Details',
    shortName: 'Employment',
    description: 'Occupation, business/employer profile, and income proofs',
  },
  {
    id: 'bank-existing-loans',
    number: 6,
    name: 'Bank / Existing Loan Details',
    shortName: 'Banking & CIBIL',
    description: 'Bank accounts, obligations, credit bureau and CIBIL rating',
  },
  {
    id: 'collateral',
    number: 7,
    name: 'Collateral Details',
    shortName: 'Collateral',
    description: 'Security assets, property documents, and valuation report',
  },
  {
    id: 'references',
    number: 8,
    name: 'Reference Details',
    shortName: 'References',
    description: 'Family and professional references verification',
  },
  {
    id: 'sourcing',
    number: 9,
    name: 'Sourcing Details',
    shortName: 'Sourcing',
    description: 'District, Relationship Manager, and Field Agent channel',
  },
  {
    id: 'schedule-charges',
    number: 10,
    name: 'Schedule of Charges',
    shortName: 'Charges',
    description: 'Processing fees, stamp duty, insurance, and net disbursal',
  },
  {
    id: 'document-checklist',
    number: 11,
    name: 'Document Checklist',
    shortName: 'Checklist',
    description: 'Mandatory document checklist verification',
  },
  {
    id: 'declaration',
    number: 12,
    name: 'Declaration',
    shortName: 'Declaration',
    description: 'Borrower consent, agent endorsement, and underwriter sign-off',
  },
];

export default VERIFICATION_STEP_DEFINITIONS;
