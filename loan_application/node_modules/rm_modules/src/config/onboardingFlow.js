export const ONBOARDING_STEPS = [
  { id: 'application-details', label: 'Application' },
  { id: 'personal-information', label: 'Personal' },
  { id: 'address-details', label: 'Address' },
  { id: 'kyc-documents', label: 'KYC' },
  { id: 'employment-income', label: 'Employment' },
  { id: 'bank-existing-loans', label: 'Banking' },
  { id: 'collateral', label: 'Collateral' },
  { id: 'references', label: 'Reference' },
  { id: 'sourcing', label: 'Sourcing' },
  { id: 'schedule-charges', label: 'Charges' },
  { id: 'document-checklist', label: 'Checklist' },
  { id: 'declaration', label: 'Declaration' },
];

export const LOAN_PRODUCTS = [
  { value: 'PL', label: 'Personal Loan (PL) - Unsecured', requiresVariation: false },
  { value: 'ML', label: 'Micro Loan (ML) - Unsecured', requiresVariation: false },
  { value: 'BL', label: 'Business Loan (BL) - Secured', requiresVariation: false },
  { value: 'HL', label: 'Home Loan (HL) - Secured', requiresVariation: true },
  { value: 'LAP', label: 'Loan Against Property (LAP) - Secured', requiresVariation: true },
];

export const LOAN_VARIATIONS = {
  HL: [
    'Home Purchase',
    'Home Purchase + Construction',
    'Extension Only',
    'Improvement Only',
    'Land Purchase',
    'Home Construction - BT & Topup',
  ],
  LAP: [
    'LAP - Land',
    'LAP - Building',
  ],
};

export const LOAN_TRANSACTION_TYPES = [
  'New Loan',
  'Top-Up',
  'Balance Transfer',
];

export const INTEREST_TYPES = [
  'Fixed',
  'Floating',
];

export const SOURCING_CHANNELS = [
  'Field Agent',
  'Branch Walk-In',
  'Referral',
  'Telecalling',
  'Digital Lead',
  'Corporate Tie-Up',
];
