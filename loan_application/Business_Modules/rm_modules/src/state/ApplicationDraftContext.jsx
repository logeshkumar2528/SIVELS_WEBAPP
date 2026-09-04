import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { allNewApplications } from '../pages/NewApplications/newApplicationsData';
import {
  LOAN_PRODUCTS,
  LOAN_VARIATIONS,
} from '../config/onboardingFlow';
import {
  mergeSectionData,
  mergeEntityObject,
  mergeApplicantArrays,
  KNOWN_DB_ID_FIELDS,
  resolveApplicantName,
} from '../pages/applicationWizard/flowUtils';

const STORAGE_KEY = 'sivels-rm-onboarding-drafts-v9';

const APP_SEED_MAP = allNewApplications.reduce((acc, app) => {
  acc[app.id] = { ...buildBlankApplication(app.id), ...app };
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

function deepMergeApplicationData(target = {}, source = {}) {
  if (!target && !source) return {};
  if (!target) return { ...source };
  if (!source) return { ...target };

  const result = { ...target };

  for (const [key, value] of Object.entries(source)) {
    if (key === 'sections') {
      const targetSections = target.sections || {};
      const sourceSections = value || {};
      const mergedSections = { ...targetSections };

      for (const [sKey, sVal] of Object.entries(sourceSections)) {
        mergedSections[sKey] = mergeSectionData(targetSections[sKey], sVal);
      }
      result.sections = mergedSections;
    } else if (
      key === 'kycDocuments' ||
      key === 'addressDetails' ||
      key === 'employmentIncome' ||
      key === 'bankExistingLoans' ||
      key === 'collateral' ||
      key === 'collateralDetails' ||
      key === 'references' ||
      key === 'sourcing' ||
      key === 'scheduleCharges' ||
      key === 'scheduleOfCharges' ||
      key === 'documentChecklist' ||
      key === 'declaration'
    ) {
      result[key] = mergeSectionData(target[key], value);
    } else if (key === 'registration') {
      const targetReg = target.registration || {};
      const sourceReg = value || {};
      result.registration = {
        ...targetReg,
        ...sourceReg,
        personalInformation: mergeSectionData(
          targetReg.personalInformation || targetReg,
          sourceReg.personalInformation || sourceReg
        ),
        primaryApplicant: mergeEntityObject(
          targetReg.primaryApplicant || targetReg.personalInformation?.applicant,
          sourceReg.primaryApplicant || sourceReg.personalInformation?.applicant
        ),
        coApplicants: mergeApplicantArrays(
          targetReg.coApplicants || targetReg.personalInformation?.coApplicants,
          sourceReg.coApplicants || sourceReg.personalInformation?.coApplicants
        ),
      };
    } else {
      if (value !== undefined) {
        result[key] = value;
      }
    }
  }

  // Preserve known database IDs at top-level
  for (const idField of KNOWN_DB_ID_FIELDS) {
    if (
      target[idField] !== undefined &&
      target[idField] !== null &&
      target[idField] !== '' &&
      (source[idField] === undefined || source[idField] === null || source[idField] === '')
    ) {
      result[idField] = target[idField];
    }
  }

  return result;
}

function normalizeApplicationRecord(record = {}) {
  const loanProduct = record.loanProduct || inferLoanProductCode(record);
  const loanVariation = record.loanVariation !== undefined && record.loanVariation !== null ? record.loanVariation : '';
  const purposeOfLoan = record.purposeOfLoan || '';
  const loanAmount = record.loanAmount !== undefined ? extractDigits(record.loanAmount) : '';
  const loanTenureMonths = extractDigits(record.loanTenureMonths);
  const roi = record.roi === '' || record.roi === undefined || record.roi === null ? '' : Number(record.roi);

  // Compute coApplicantsCount accurately
  const countFromSections = Math.max(
    Number(record.sections?.personalInformation?.coApplicants?.length || 0),
    Number(record.registration?.personalInformation?.coApplicants?.length || 0),
    Number(record.registration?.coApplicants?.length || 0),
    Number(record.personalInformation?.coApplicants?.length || 0),
    Number(record.sections?.kycDocuments?.coApplicants?.length || 0),
    Number(record.kycDocuments?.coApplicants?.length || 0),
    Number(record.sections?.addressDetails?.coApplicants?.length || 0),
    Number(record.addressDetails?.coApplicants?.length || 0),
    Number(record.sections?.employmentIncome?.coApplicants?.length || 0),
    Number(record.employmentIncome?.coApplicants?.length || 0),
    Number(record.sections?.bankExistingLoans?.coApplicants?.length || 0),
    Number(record.bankExistingLoans?.coApplicants?.length || 0),
    Number(record.sections?.declaration?.coApplicants?.length || 0),
    Number(record.declaration?.coApplicants?.length || 0)
  );

  const rawCoAppCount =
    record.coApplicantsCount !== '' &&
    record.coApplicantsCount !== undefined &&
    record.coApplicantsCount !== null
      ? Number(record.coApplicantsCount)
      : null;

  const coApplicantsCount =
    rawCoAppCount !== null && Number.isFinite(rawCoAppCount)
      ? Math.max(rawCoAppCount, countFromSections)
      : countFromSections;

  const distanceFromBranchKm =
    record.distanceFromBranchKm === '' ||
    record.distanceFromBranchKm === undefined ||
    record.distanceFromBranchKm === null
      ? ''
      : Number(record.distanceFromBranchKm);

  const applicationNumber = record.applicationNumber || record.id || '';
  const loanProductDisplay = getLoanProductDisplay(loanProduct, loanVariation);

  // Synchronize section objects and root keys
  const sections = { ...(record.sections || {}) };

  const personalInfo = mergeSectionData(
    record.registration?.personalInformation || record.personalInformation || {},
    sections.personalInformation || {}
  );
  sections.personalInformation = personalInfo;

  const kycDocs = mergeSectionData(record.kycDocuments || {}, sections.kycDocuments || {});
  sections.kycDocuments = kycDocs;

  const address = mergeSectionData(record.addressDetails || {}, sections.addressDetails || {});
  sections.addressDetails = address;

  const employment = mergeSectionData(record.employmentIncome || {}, sections.employmentIncome || {});
  sections.employmentIncome = employment;

  const bankLoans = mergeSectionData(record.bankExistingLoans || {}, sections.bankExistingLoans || {});
  sections.bankExistingLoans = bankLoans;

  const collateral = mergeSectionData(
    record.collateralDetails || record.collateral || {},
    sections.collateralDetails || sections.collateral || {}
  );
  sections.collateral = collateral;

  const references = mergeSectionData(record.references || {}, sections.references || {});
  sections.references = references;

  const sourcing = mergeSectionData(record.sourcing || {}, sections.sourcing || {});
  sections.sourcing = sourcing;

  const scheduleCharges = mergeSectionData(
    record.scheduleCharges || record.scheduleOfCharges || {},
    sections.scheduleCharges || sections.scheduleOfCharges || {}
  );
  sections.scheduleCharges = scheduleCharges;

  const documentChecklist = mergeSectionData(record.documentChecklist || {}, sections.documentChecklist || {});
  sections.documentChecklist = documentChecklist;

  const declaration = mergeSectionData(record.declaration || {}, sections.declaration || {});
  sections.declaration = declaration;

  const resolvedApplicant = resolveApplicantName({
    ...record,
    sections,
    personalInformation: personalInfo,
    registration: {
      ...(record.registration || {}),
      personalInformation: personalInfo,
      primaryApplicant: personalInfo.applicant || personalInfo.primaryApplicant || {},
    },
  });

  const customerName = resolvedApplicant !== 'Applicant'
    ? resolvedApplicant
    : (record.customerName || record.fullName || record.applicantName || '');

  return {
    ...record,
    customerName,
    id: record.id || applicationNumber,
    applicationNumber,
    branch: record.branch || inferBranch(record.address),
    location: record.location || inferLocation(record.address),
    sourcingChannel: record.sourcingChannel || '',
    loanProduct,
    loanProductDisplay: loanProductDisplay || record.loanType || '',
    loanVariation,
    loanTransactionType: record.loanTransactionType || '',
    purposeOfLoan,
    loanPurpose: purposeOfLoan,
    loanAmount,
    loanAmountDisplay: loanAmount === '' ? record.amount || '' : formatRupees(loanAmount),
    loanTenureMonths,
    interestType: record.interestType || '',
    roi,
    coApplicantsCount,
    distanceFromBranchKm,
    loanType: record.loanType || loanProductDisplay || purposeOfLoan || '',
    amount: record.amount || (loanAmount === '' ? '' : formatRupees(loanAmount)),
    status: record.status || 'Draft',
    branchDisplay: record.branchDisplay || inferBranch(record.address),
    locationDisplay: record.locationDisplay || inferLocation(record.address),
    sourcingChannelDisplay: record.sourcingChannelDisplay || record.sourcingChannel || '',
    createdDate: record.createdDate || '',

    // Synchronized section structures
    sections,
    registration: {
      ...(record.registration || {}),
      personalInformation: personalInfo,
      primaryApplicant: personalInfo.applicant || personalInfo.primaryApplicant || {},
      coApplicants: personalInfo.coApplicants || [],
      coApplicantsCount: personalInfo.coApplicants?.length || coApplicantsCount || 0,
    },
    kycDocuments: kycDocs,
    addressDetails: address,
    employmentIncome: employment,
    bankExistingLoans: bankLoans,
    collateralDetails: collateral,
    collateral,
    references,
    sourcing,
    scheduleCharges,
    documentChecklist,
    declaration,
  };
}

function buildBlankApplication(applicationId) {
  return normalizeApplicationRecord({
    id: applicationId,
    applicationNumber: applicationId,
    status: 'Draft',
    sourcingChannel: '',
    loanProduct: '',
    loanTransactionType: '',
    purposeOfLoan: '',
    loanAmount: '',
    loanTenureMonths: '',
    interestType: '',
    roi: '',
    coApplicantsCount: '',
    distanceFromBranchKm: '',
    registration: {
      personalInformation: {
        applicant: {
          relationshipWithApplicant: '',
          title: '',
          firstName: '',
          middleName: '',
          lastName: '',
          fatherOrSpouseName: '',
          mothersMaidenName: '',
          dateOfBirth: '',
          religion: '',
          category: '',
          gender: '',
          maritalStatus: '',
          mobileNo: '',
          emailId: '',
          panCardNo: ''
        },
        coApplicants: []
      }
    },
    addressDetails: {
      applicant: {
        addressLine1: '',
        addressLine2: '',
        landmark: '',
        city: '',
        state: '',
        pincode: '',
        mailingSameAsCurrent: ''
      },
      coApplicants: []
    },
    kycDocuments: {
      applicant: {
        aadhaarLast4: '',
        panCardNo: '',
        identityDocumentType: '',
        identityDocumentNo: '',
        verificationStatus: ''
      },
      coApplicants: []
    },
    employmentIncome: {
      applicant: {
        employerBusinessName: '',
        designationNatureOfBusiness: '',
        employmentNature: '',
        qualification: '',
        industryType: '',
        totalExperienceYears: '',
        grossMonthlyIncome: '',
        otherIncomeMonthly: '',
        netMonthlyIncome: '',
        grossAnnualIncome: ''
      },
      coApplicants: []
    },
    bankExistingLoans: {
      primaryBank: {
        bankName: '',
        branch: '',
        accountType: '',
        accountNumber: '',
        ifscCode: '',
        accountHolderName: '',
        bankAddress: '',
        averageMonthlyBalance: '',
        latestBalance: ''
      },
      existingLoans: []
    },
    collateralDetails: {
      propertyType: '',
      propertyAddress: '',
      propertyValue: '',
      ownerName: ''
    },
    references: {
      reference1: { fullName: '', relationship: '', mobileNo: '', address: '' },
      reference2: { fullName: '', relationship: '', mobileNo: '', address: '' }
    },
    sourcing: {
      sourcedBy: '',
      employeeId: ''
    },
    scheduleCharges: {
      values: {}
    },
    documentChecklist: {
      items: [
        { status: true },
        { status: true },
        { status: true },
        { status: true },
        { status: true },
        { status: true }
      ]
    },
    declaration: {
      applicantSignature: '',
      applicantDate: '',
      coApplicantSignature: '',
      coApplicantDate: '',
      ackApplicantName: '',
      ackProduct: '',
      ackReceivedBy: '',
      ackDate: ''
    }
  });
}

function buildSeedApplications() {
  return allNewApplications.reduce((acc, app) => {
    acc[app.id] = normalizeApplicationRecord({ ...buildBlankApplication(app.id), ...app });
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
        const merged = deepMergeApplicationData(current[applicationId], overrides);
        const next = normalizeApplicationRecord({ ...merged, id: applicationId });
        if (JSON.stringify(next) === JSON.stringify(current[applicationId])) {
          return current;
        }
        return {
          ...current,
          [applicationId]: next,
        };
      }

      const blank = buildBlankApplication(applicationId);
      const merged = deepMergeApplicationData(blank, overrides);
      return {
        ...current,
        [applicationId]: normalizeApplicationRecord({
          ...merged,
          id: applicationId,
        }),
      };
    });
  }, []);

  const saveApplication = useCallback((applicationId, updates) => {
    setApplications((current) => {
      const currentRecord = current[applicationId] || APP_SEED_MAP[applicationId] || buildBlankApplication(applicationId);
      const merged = deepMergeApplicationData(currentRecord, updates);
      return {
        ...current,
        [applicationId]: normalizeApplicationRecord({
          ...merged,
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
