import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { allNewApplications } from '../pages/NewApplications/newApplicationsData';
import {
  LOAN_PRODUCTS,
  LOAN_VARIATIONS,
} from '../config/onboardingFlow';

const STORAGE_KEY = 'sivels-rm-onboarding-drafts-v1';

const APP_SEED_MAP = allNewApplications.reduce((acc, app) => {
  acc[app.id] = app;
  return acc;
}, {});

const ApplicationDraftContext = createContext(null);

function getStoredApplications() {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStoredApplications(applications) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
}

function extractDigits(value) {
  const digits = String(value ?? '').replace(/[^\d]/g, '');
  return digits ? Number(digits) : '';
}

function formatRupees(value) {
  if (value === '' || value === null || value === undefined) {
    return '';
  }

  const digits = String(value).replace(/[^\d]/g, '');
  if (!digits) {
    return String(value);
  }

  return `Rs. ${Number(digits).toLocaleString('en-IN')}`;
}

function inferBranch(address = '') {
  const [branch] = String(address).split(',');
  return branch ? branch.trim() : '';
}

function inferLocation(address = '') {
  const parts = String(address)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return parts[1];
  }

  return parts[0] || '';
}

function inferLoanProductCode(record) {
  const source = `${record.loanProduct || ''} ${record.loanType || ''} ${record.purposeOfLoan || ''}`.toLowerCase();

  if (source.includes('home') || source.includes('property') || source.includes('lap')) {
    return source.includes('lap') || source.includes('property') ? 'LAP' : 'HL';
  }

  if (source.includes('micro')) {
    return 'ML';
  }

  if (source.includes('personal')) {
    return 'PL';
  }

  if (source.includes('business')) {
    return 'BL';
  }

  return '';
}

function getLoanProductMeta(code) {
  return LOAN_PRODUCTS.find((item) => item.value === code) || null;
}

function getLoanProductDisplay(code, variation = '') {
  const meta = getLoanProductMeta(code);
  if (!meta) {
    return '';
  }

  const variationSuffix = variation ? ` - ${variation}` : '';
  return `${meta.label}${variationSuffix}`;
}

function normalizeApplicationRecord(record = {}) {
  const loanProduct = record.loanProduct || inferLoanProductCode(record);
  const variationOptions = LOAN_VARIATIONS[loanProduct] || [];
  const loanVariation = variationOptions.includes(record.loanVariation) ? record.loanVariation : '';
  const purposeOfLoan = record.purposeOfLoan || record.loanPurpose || record.loanType || '';
  const loanAmount = extractDigits(record.loanAmount || record.amount);
  const loanTenureMonths = extractDigits(record.loanTenureMonths);
  const roi = record.roi === '' || record.roi === undefined || record.roi === null ? '' : Number(record.roi);
  const coApplicantsCount = record.coApplicantsCount === '' || record.coApplicantsCount === undefined || record.coApplicantsCount === null
    ? 0
    : Number(record.coApplicantsCount);
  const distanceFromBranchKm = record.distanceFromBranchKm === '' || record.distanceFromBranchKm === undefined || record.distanceFromBranchKm === null
    ? ''
    : Number(record.distanceFromBranchKm);

  const applicationNumber = record.applicationNumber || record.id || '';
  const loanProductDisplay = getLoanProductDisplay(loanProduct, loanVariation);

  return {
    ...record,
    id: record.id || applicationNumber,
    applicationNumber,
    branch: record.branch || inferBranch(record.address),
    location: record.location || inferLocation(record.address),
    sourcingChannel: record.sourcingChannel || 'Field Agent',
    loanProduct,
    loanProductDisplay: loanProductDisplay || record.loanType || '',
    loanVariation,
    loanTransactionType: record.loanTransactionType || 'New Loan',
    purposeOfLoan,
    loanPurpose: purposeOfLoan,
    loanAmount,
    loanAmountDisplay: loanAmount === '' ? (record.amount || '') : formatRupees(loanAmount),
    loanTenureMonths,
    interestType: record.interestType || 'Fixed',
    roi,
    coApplicantsCount,
    distanceFromBranchKm,
    loanType: record.loanType || loanProductDisplay || purposeOfLoan || '',
    amount: record.amount || (loanAmount === '' ? '' : formatRupees(loanAmount)),
    status: record.status || 'Draft',
    branchDisplay: record.branchDisplay || inferBranch(record.address),
    locationDisplay: record.locationDisplay || inferLocation(record.address),
    sourcingChannelDisplay: record.sourcingChannelDisplay || record.sourcingChannel || 'Field Agent',
    createdDate: record.createdDate || '',
  };
}

function buildBlankApplication(applicationId) {
  return normalizeApplicationRecord({
    id: applicationId,
    applicationNumber: applicationId,
    status: 'Draft',
    sourcingChannel: 'Field Agent',
    loanTransactionType: 'New Loan',
    interestType: 'Fixed',
    coApplicantsCount: 0,
  });
}

function buildSeedApplications() {
  return allNewApplications.reduce((acc, app) => {
    acc[app.id] = normalizeApplicationRecord(app);
    return acc;
  }, {});
}

function generateApplicationNumber(applications) {
  const year = new Date().getFullYear();
  const prefix = `APP-${year}-`;
  const usedNumbers = Object.keys(applications)
    .filter((id) => id.startsWith(prefix))
    .map((id) => Number(id.slice(prefix.length)))
    .filter((num) => Number.isFinite(num));

  const nextSequence = usedNumbers.length ? Math.max(...usedNumbers) + 1 : 1;
  return `${prefix}${String(nextSequence).padStart(3, '0')}`;
}

export function ApplicationDraftProvider({ children }) {
  const [applications, setApplications] = useState(() => {
    const stored = getStoredApplications();
    return {
      ...buildSeedApplications(),
      ...Object.entries(stored).reduce((acc, [id, value]) => {
        acc[id] = normalizeApplicationRecord({ id, ...value });
        return acc;
      }, {}),
    };
  });

  useEffect(() => {
    saveStoredApplications(applications);
  }, [applications]);

  const getApplication = useCallback((applicationId) => {
    const source = applications[applicationId] || APP_SEED_MAP[applicationId] || buildBlankApplication(applicationId);
    return normalizeApplicationRecord(source);
  }, [applications]);

  const ensureApplication = useCallback((applicationId, overrides = {}) => {
    setApplications((current) => {
      if (current[applicationId]) {
        const next = normalizeApplicationRecord({ ...current[applicationId], ...overrides, id: applicationId });
        if (JSON.stringify(next) === JSON.stringify(current[applicationId])) {
          return current;
        }
        return {
          ...current,
          [applicationId]: next,
        };
      }

      return {
        ...current,
        [applicationId]: normalizeApplicationRecord({
          ...buildBlankApplication(applicationId),
          ...overrides,
          id: applicationId,
        }),
      };
    });
  }, []);

  const saveApplication = useCallback((applicationId, updates) => {
    setApplications((current) => {
      const currentRecord = current[applicationId] || APP_SEED_MAP[applicationId] || buildBlankApplication(applicationId);
      return {
        ...current,
        [applicationId]: normalizeApplicationRecord({
          ...currentRecord,
          ...updates,
          id: applicationId,
        }),
      };
    });
  }, []);

  const createApplicationDraft = useCallback(() => {
    const nextId = generateApplicationNumber(applications);

    setApplications((current) => ({
      ...current,
      [nextId]: normalizeApplicationRecord({
        ...buildBlankApplication(nextId),
        id: nextId,
        applicationNumber: nextId,
      }),
    }));

    return nextId;
  }, [applications]);

  const value = useMemo(() => ({
    applications,
    getApplication,
    ensureApplication,
    saveApplication,
    createApplicationDraft,
  }), [applications, getApplication, ensureApplication, saveApplication, createApplicationDraft]);

  return (
    <ApplicationDraftContext.Provider value={value}>
      {children}
    </ApplicationDraftContext.Provider>
  );
}

export function useApplicationDraftStore() {
  const context = useContext(ApplicationDraftContext);
  if (!context) {
    throw new Error('useApplicationDraftStore must be used within ApplicationDraftProvider');
  }

  return context;
}
