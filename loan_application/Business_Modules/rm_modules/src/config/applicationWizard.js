import { matchPath } from 'react-router-dom';
import { ROUTES } from './routeConfig';

export const APPLICATION_WIZARD_STEPS = [
  { id: 'application-details', label: 'Application', route: ROUTES.APPLICATION_DETAILS },
  { id: 'kyc-documents', label: 'KYC', route: ROUTES.KYC_DOCUMENTS },
  { id: 'personal-information', label: 'Personal', route: ROUTES.PERSONAL_INFORMATION },
  { id: 'address-details', label: 'Address', route: ROUTES.ADDRESS_DETAILS },
  { id: 'employment-income', label: 'Employment', route: ROUTES.EMPLOYMENT_INCOME },
  { id: 'bank-existing-loans', label: 'Banking', route: ROUTES.BANK_EXISTING_LOANS },
  { id: 'collateral', label: 'Collateral', route: ROUTES.COLLATERAL },
  { id: 'references', label: 'Reference', route: ROUTES.REFERENCES },
  { id: 'sourcing', label: 'Sourcing', route: ROUTES.SOURCING },
  { id: 'schedule-charges', label: 'Charges', route: ROUTES.SCHEDULE_CHARGES },
  { id: 'document-checklist', label: 'Checklist', route: ROUTES.DOCUMENT_CHECKLIST },
  { id: 'declaration', label: 'Declaration', route: ROUTES.DECLARATION },
];

export function getWizardStepIndex(stepId) {
  return APPLICATION_WIZARD_STEPS.findIndex((step) => step.id === stepId);
}

export function getWizardRoute(stepId) {
  return APPLICATION_WIZARD_STEPS.find((step) => step.id === stepId)?.route || ROUTES.APPLICATION_DETAILS;
}

export function getWizardStepIndexByPath(pathname, steps = APPLICATION_WIZARD_STEPS) {
  return steps.findIndex((step) => matchPath({ path: step.route, end: true }, pathname));
}

export function getWizardActiveStepByPath(pathname, steps = APPLICATION_WIZARD_STEPS) {
  const stepIndex = getWizardStepIndexByPath(pathname, steps);
  return stepIndex >= 0 ? stepIndex + 1 : 1;
}
