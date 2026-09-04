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
import { toIstDateInput } from '../utils/dateHelper';

const STORAGE_KEY = 'sivels-rm-onboarding-drafts-v9';

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
  const loanProduct = record.loanProduct !== undefined && record.loanProduct !== null && record.loanProduct !== ''
    ? record.loanProduct
    : (record.loanProductId ?? record.LoanProductId ?? inferLoanProductCode(record));
  const loanVariation = record.loanVariation !== undefined && record.loanVariation !== null
    ? record.loanVariation
    : (record.loanProductVariationId ?? record.LoanProductVariationId ?? '');
  const purposeOfLoan = record.purposeOfLoan !== undefined && record.purposeOfLoan !== null && record.purposeOfLoan !== ''
    ? record.purposeOfLoan
    : (record.loanPurposeId ?? record.LoanPurposeId ?? '');
  const loanAmount = record.loanAmount !== undefined && record.loanAmount !== null && record.loanAmount !== ''
    ? extractDigits(record.loanAmount)
    : (record.amount !== undefined && record.amount !== null && record.amount !== '' ? extractDigits(record.amount) : '');
  const loanTenureMonths = extractDigits(
    record.loanTenureMonths !== undefined && record.loanTenureMonths !== null && record.loanTenureMonths !== ''
      ? record.loanTenureMonths
      : (record.loanTenure ?? record.LoanTenure)
  );
  const roi = record.roi !== undefined && record.roi !== null && record.roi !== ''
    ? Number(record.roi)
    : (record.ROI !== undefined && record.ROI !== null && record.ROI !== '' ? Number(record.ROI) : (record.roi === '' ? '' : ''));
  const loanTransactionType = record.loanTransactionType !== undefined && record.loanTransactionType !== null && record.loanTransactionType !== ''
    ? record.loanTransactionType
    : (record.loanTransactionTypeId ?? record.LoanTransactionTypeId ?? '');
  const interestType = record.interestType !== undefined && record.interestType !== null && record.interestType !== ''
    ? record.interestType
    : (record.interestTypeId ?? record.InterestTypeId ?? '');
  const sourcingChannel = record.sourcingChannel !== undefined && record.sourcingChannel !== null && record.sourcingChannel !== ''
    ? record.sourcingChannel
    : (record.sourcingChannelId ?? record.SourcingChannelId ?? '');

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
      : (record.noOfCoApplicants !== undefined && record.noOfCoApplicants !== null ? Number(record.noOfCoApplicants) : null);

  const coApplicantsCount =
    rawCoAppCount !== null && Number.isFinite(rawCoAppCount)
      ? Math.max(rawCoAppCount, countFromSections)
      : countFromSections;

  const distanceFromBranchKm =
    record.distanceFromBranchKm !== '' && record.distanceFromBranchKm !== undefined && record.distanceFromBranchKm !== null
      ? Number(record.distanceFromBranchKm)
      : (record.distanceFromBranch !== '' && record.distanceFromBranch !== undefined && record.distanceFromBranch !== null ? Number(record.distanceFromBranch) : '');

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
    agentCustomerId: record.agentCustomerId || record.id || applicationNumber,
    agentId: record.agentId || 1,
    agentName: record.agentName || '',
    agentCode: record.agentCode || '',
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
    _isHydrated: record._isHydrated || false,

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

export function mapBackendToApplication(backendData = {}, existingDraft = {}) {
  if (!backendData) return existingDraft;

  const rawCustomer = backendData.customer || backendData.Customer || backendData;
  const customer = Array.isArray(rawCustomer) ? (rawCustomer[0] || {}) : (rawCustomer || {});
  const rawProduct = backendData.productDetails || backendData.ProductDetails;
  const productDetails = Array.isArray(rawProduct) ? (rawProduct[0] || {}) : (rawProduct || {});
  const kycList = Array.isArray(backendData.kycDocuments || backendData.KycDocuments) ? (backendData.kycDocuments || backendData.KycDocuments) : [];
  const personalList = Array.isArray(backendData.personalInformation || backendData.PersonalInformation) ? (backendData.personalInformation || backendData.PersonalInformation) : [];
  const addressList = Array.isArray(backendData.addressDetails || backendData.AddressDetails) ? (backendData.addressDetails || backendData.AddressDetails) : [];
  const empList = Array.isArray(backendData.employmentIncome || backendData.EmploymentIncome) ? (backendData.employmentIncome || backendData.EmploymentIncome) : [];
  const bankList = Array.isArray(backendData.bankExistingLoans || backendData.BankExistingLoans) ? (backendData.bankExistingLoans || backendData.BankExistingLoans) : [];
  const colList = Array.isArray(backendData.collateral || backendData.Collateral) ? (backendData.collateral || backendData.Collateral) : [];
  const refList = Array.isArray(backendData.references || backendData.References) ? (backendData.references || backendData.References) : [];

  const agentCustomerId = customer.agentCustomerId || customer.AgentCustomerId || productDetails.agentCustomerId || productDetails.AgentCustomerId || existingDraft.agentCustomerId || existingDraft.id;
  const appIdStr = String(agentCustomerId || existingDraft.id || '');

  // 1. Customer & Product Details
  const customerName = customer.fullName || customer.FullName || customer.customerName || customer.CustomerName || existingDraft.customerName || '';
  const mobile = customer.mobileNumber || customer.MobileNumber || customer.mobile || customer.Mobile || existingDraft.mobile || '';
  const email = customer.email || customer.Email || customer.emailAddress || customer.EmailAddress || existingDraft.email || '';
  const branch = customer.branch || customer.Branch || existingDraft.branch || '';
  const rawStatus = customer.status !== undefined ? customer.status : customer.Status;
  const status = rawStatus === 2 ? 'Approved' : (rawStatus === 1 ? 'Pending' : (existingDraft.status || 'Draft'));
  const createdDate = customer.createdAt || customer.CreatedAt || customer.createdDate || customer.CreatedDate || existingDraft.createdDate || '';
  const agentId = customer.agentId || customer.AgentId || productDetails.agentId || productDetails.AgentId || existingDraft.agentId || 1;
  const agentName = customer.agentName || customer.AgentName || existingDraft.agentName || '';

  const applicationProductDetailsId = productDetails.applicationProductDetailsId || productDetails.ApplicationProductDetailsId || existingDraft.applicationProductDetailsId || null;
  const sourcingChannel = productDetails.sourcingChannelId ?? productDetails.SourcingChannelId ?? existingDraft.sourcingChannel ?? '';
  const loanProduct = productDetails.loanProductId ?? productDetails.LoanProductId ?? existingDraft.loanProduct ?? '';
  const loanVariation = productDetails.loanProductVariationId ?? productDetails.LoanProductVariationId ?? existingDraft.loanVariation ?? '';
  const loanTransactionType = productDetails.loanTransactionTypeId ?? productDetails.LoanTransactionTypeId ?? existingDraft.loanTransactionType ?? '';
  const purposeOfLoan = productDetails.loanPurposeId ?? productDetails.LoanPurposeId ?? customer.loanPurposeId ?? customer.LoanPurposeId ?? existingDraft.purposeOfLoan ?? '';
  const loanAmount = productDetails.loanAmount !== undefined && productDetails.loanAmount !== null ? productDetails.loanAmount : (productDetails.LoanAmount !== undefined && productDetails.LoanAmount !== null ? productDetails.LoanAmount : (customer.expectedLoanAmount ?? customer.ExpectedLoanAmount ?? existingDraft.loanAmount ?? ''));
  const loanTenureMonths = productDetails.loanTenure !== undefined && productDetails.loanTenure !== null ? productDetails.loanTenure : (productDetails.LoanTenure !== undefined && productDetails.LoanTenure !== null ? productDetails.LoanTenure : (productDetails.loanTenureMonths ?? productDetails.LoanTenureMonths ?? existingDraft.loanTenureMonths ?? ''));
  const interestType = productDetails.interestTypeId ?? productDetails.InterestTypeId ?? existingDraft.interestType ?? '';
  const roi = productDetails.roi !== undefined && productDetails.roi !== null ? productDetails.roi : (productDetails.Roi !== undefined && productDetails.Roi !== null ? productDetails.Roi : (productDetails.ROI !== undefined && productDetails.ROI !== null ? productDetails.ROI : existingDraft.roi ?? ''));
  const distanceFromBranchKm = productDetails.distanceFromBranch !== undefined && productDetails.distanceFromBranch !== null ? productDetails.distanceFromBranch : (productDetails.DistanceFromBranch !== undefined && productDetails.DistanceFromBranch !== null ? productDetails.DistanceFromBranch : (productDetails.distanceFromBranchKm ?? productDetails.DistanceFromBranchKm ?? existingDraft.distanceFromBranchKm ?? ''));
  const coApplicantsCount = productDetails.noOfCoApplicants !== undefined && productDetails.noOfCoApplicants !== null ? productDetails.noOfCoApplicants : (productDetails.NoOfCoApplicants !== undefined && productDetails.NoOfCoApplicants !== null ? productDetails.NoOfCoApplicants : (productDetails.coApplicantsCount ?? productDetails.CoApplicantsCount ?? existingDraft.coApplicantsCount ?? 0));

  // 2. KYC Documents
  const applicantKyc = kycList[0] || {};
  const coApplicantKycs = kycList.slice(1);
  const kycDocuments = {
    applicant: {
      kycDocumentId: applicantKyc.applicationKYCDocumentId || existingDraft.kycDocuments?.applicant?.kycDocumentId || null,
      applicationKYCDocumentId: applicantKyc.applicationKYCDocumentId || existingDraft.kycDocuments?.applicant?.applicationKYCDocumentId || null,
      aadhaarLast4: applicantKyc.aadhaarLastFourDigits || existingDraft.kycDocuments?.applicant?.aadhaarLast4 || '',
      panCardNo: applicantKyc.panCardNo || existingDraft.kycDocuments?.applicant?.panCardNo || '',
      identityDocumentType: applicantKyc.documentTypeId || existingDraft.kycDocuments?.applicant?.identityDocumentType || '',
      identityDocumentNo: applicantKyc.documentNumber || existingDraft.kycDocuments?.applicant?.identityDocumentNo || '',
      verificationStatus: applicantKyc.verificationId ? (applicantKyc.verificationId === 1 ? 'Verified' : String(applicantKyc.verificationId)) : (existingDraft.kycDocuments?.applicant?.verificationStatus || 'Pending'),
      identityDocumentCount: applicantKyc.documentNumber ? '1' : (existingDraft.kycDocuments?.applicant?.identityDocumentCount || ''),
      identityDocumentFiles: existingDraft.kycDocuments?.applicant?.identityDocumentFiles || [],
    },
    coApplicants: coApplicantKycs.map((coKyc, idx) => {
      const draftCo = existingDraft.kycDocuments?.coApplicants?.[idx] || {};
      return {
        kycDocumentId: coKyc.applicationKYCDocumentId || draftCo.kycDocumentId || null,
        applicationKYCDocumentId: coKyc.applicationKYCDocumentId || draftCo.applicationKYCDocumentId || null,
        aadhaarLast4: coKyc.aadhaarLastFourDigits || draftCo.aadhaarLast4 || '',
        panCardNo: coKyc.panCardNo || draftCo.panCardNo || '',
        identityDocumentType: coKyc.documentTypeId || draftCo.identityDocumentType || '',
        identityDocumentNo: coKyc.documentNumber || draftCo.identityDocumentNo || '',
        verificationStatus: coKyc.verificationId ? (coKyc.verificationId === 1 ? 'Verified' : String(coKyc.verificationId)) : (draftCo.verificationStatus || 'Pending'),
        identityDocumentCount: coKyc.documentNumber ? '1' : (draftCo.identityDocumentCount || ''),
        identityDocumentFiles: draftCo.identityDocumentFiles || [],
      };
    }),
  };

  // 3. Personal Information / Customer Registration
  const applicantPers = personalList[0] || {};
  const coApplicantPers = personalList.slice(1);
  const personalInformation = {
    applicant: {
      personalInformationId: applicantPers.personalInformationId || existingDraft.registration?.personalInformation?.applicant?.personalInformationId || existingDraft.personalInformation?.applicant?.personalInformationId || null,
      relationshipWithApplicant: applicantPers.relationshipId || existingDraft.registration?.personalInformation?.applicant?.relationshipWithApplicant || 'SELF',
      title: applicantPers.titleId || existingDraft.registration?.personalInformation?.applicant?.title || '',
      firstName: applicantPers.firstName || customerName || existingDraft.registration?.personalInformation?.applicant?.firstName || '',
      middleName: applicantPers.middleName || existingDraft.registration?.personalInformation?.applicant?.middleName || '',
      lastName: applicantPers.lastName || existingDraft.registration?.personalInformation?.applicant?.lastName || '',
      fatherOrSpouseName: applicantPers.fatherSpouseName || existingDraft.registration?.personalInformation?.applicant?.fatherOrSpouseName || '',
      mothersMaidenName: applicantPers.mothersMaidenName || existingDraft.registration?.personalInformation?.applicant?.mothersMaidenName || '',
      dateOfBirth: applicantPers.dateOfBirth ? String(applicantPers.dateOfBirth).slice(0, 10) : (existingDraft.registration?.personalInformation?.applicant?.dateOfBirth || ''),
      religion: applicantPers.religionId || existingDraft.registration?.personalInformation?.applicant?.religion || '',
      category: applicantPers.casteId || existingDraft.registration?.personalInformation?.applicant?.category || '',
      gender: applicantPers.genderId || existingDraft.registration?.personalInformation?.applicant?.gender || '',
      maritalStatus: applicantPers.maritalStatusId || existingDraft.registration?.personalInformation?.applicant?.maritalStatus || '',
      mobileNo: applicantPers.mobileNumber || mobile || existingDraft.registration?.personalInformation?.applicant?.mobileNo || '',
      emailId: applicantPers.emailId || email || existingDraft.registration?.personalInformation?.applicant?.emailId || '',
      panCardNo: applicantKyc.panCardNo || existingDraft.registration?.personalInformation?.applicant?.panCardNo || '',
    },
    coApplicants: coApplicantPers.map((coPers, idx) => {
      const draftCo = existingDraft.registration?.personalInformation?.coApplicants?.[idx] || existingDraft.personalInformation?.coApplicants?.[idx] || {};
      return {
        personalInformationId: coPers.personalInformationId || draftCo.personalInformationId || null,
        relationshipWithApplicant: coPers.relationshipId || draftCo.relationshipWithApplicant || '',
        title: coPers.titleId || draftCo.title || '',
        firstName: coPers.firstName || draftCo.firstName || '',
        middleName: coPers.middleName || draftCo.middleName || '',
        lastName: coPers.lastName || draftCo.lastName || '',
        fatherOrSpouseName: coPers.fatherSpouseName || draftCo.fatherOrSpouseName || '',
        mothersMaidenName: coPers.mothersMaidenName || draftCo.mothersMaidenName || '',
        dateOfBirth: coPers.dateOfBirth ? String(coPers.dateOfBirth).slice(0, 10) : (draftCo.dateOfBirth || ''),
        religion: coPers.religionId || draftCo.religion || '',
        category: coPers.casteId || draftCo.category || '',
        gender: coPers.genderId || draftCo.gender || '',
        maritalStatus: coPers.maritalStatusId || draftCo.maritalStatus || '',
        mobileNo: coPers.mobileNumber || draftCo.mobileNo || '',
        emailId: coPers.emailId || draftCo.emailId || '',
        panCardNo: coApplicantKycs[idx]?.panCardNo || draftCo.panCardNo || '',
      };
    }),
  };

  // 4. Address Details
  const applicantAddr = addressList[0] || {};
  const coApplicantAddrs = addressList.slice(1);
  const addressDetails = {
    applicant: {
      addressDetailsId: applicantAddr.applicationAddressDetailsId || existingDraft.addressDetails?.applicant?.addressDetailsId || null,
      applicationAddressDetailsId: applicantAddr.applicationAddressDetailsId || existingDraft.addressDetails?.applicant?.applicationAddressDetailsId || null,
      addressLine1: applicantAddr.addressLine1 || existingDraft.addressDetails?.applicant?.addressLine1 || '',
      addressLine2: applicantAddr.addressLine2 || existingDraft.addressDetails?.applicant?.addressLine2 || '',
      landmark: applicantAddr.landmark || existingDraft.addressDetails?.applicant?.landmark || '',
      city: applicantAddr.cityId || existingDraft.addressDetails?.applicant?.city || '',
      state: applicantAddr.stateId || existingDraft.addressDetails?.applicant?.state || '',
      pincode: applicantAddr.pincode || applicantAddr.Pincode || applicantAddr.postalCode || applicantAddr.PostalCode || applicantAddr.pinCode || applicantAddr.PinCode || existingDraft.addressDetails?.applicant?.pincode || '',
      mailingSameAsCurrent: applicantAddr.mailingAsCurrent !== undefined ? (applicantAddr.mailingAsCurrent ? 'Yes' : 'No') : (existingDraft.addressDetails?.applicant?.mailingSameAsCurrent || 'No'),
      current: {
        addressLine1: applicantAddr.addressLine1 || existingDraft.addressDetails?.applicant?.current?.addressLine1 || '',
        addressLine2: applicantAddr.addressLine2 || existingDraft.addressDetails?.applicant?.current?.addressLine2 || '',
        landmark: applicantAddr.landmark || existingDraft.addressDetails?.applicant?.current?.landmark || '',
        city: applicantAddr.cityId || existingDraft.addressDetails?.applicant?.current?.city || '',
        state: applicantAddr.stateId || existingDraft.addressDetails?.applicant?.current?.state || '',
        pincode: applicantAddr.pincode || applicantAddr.Pincode || applicantAddr.postalCode || applicantAddr.PostalCode || applicantAddr.pinCode || applicantAddr.PinCode || existingDraft.addressDetails?.applicant?.current?.pincode || existingDraft.addressDetails?.applicant?.pincode || '',
      },
    },
    coApplicants: coApplicantAddrs.map((coAddr, idx) => {
      const draftCo = existingDraft.addressDetails?.coApplicants?.[idx] || {};
      return {
        addressDetailsId: coAddr.applicationAddressDetailsId || draftCo.addressDetailsId || null,
        applicationAddressDetailsId: coAddr.applicationAddressDetailsId || draftCo.applicationAddressDetailsId || null,
        addressLine1: coAddr.addressLine1 || draftCo.addressLine1 || '',
        addressLine2: coAddr.addressLine2 || draftCo.addressLine2 || '',
        landmark: coAddr.landmark || draftCo.landmark || '',
        city: coAddr.cityId || draftCo.city || '',
        state: coAddr.stateId || draftCo.state || '',
        pincode: coAddr.pincode || coAddr.Pincode || coAddr.postalCode || coAddr.PostalCode || coAddr.pinCode || coAddr.PinCode || draftCo.pincode || '',
        mailingSameAsCurrent: coAddr.mailingAsCurrent !== undefined ? (coAddr.mailingAsCurrent ? 'Yes' : 'No') : (draftCo.mailingSameAsCurrent || 'No'),
        current: {
          addressLine1: coAddr.addressLine1 || draftCo.current?.addressLine1 || '',
          addressLine2: coAddr.addressLine2 || draftCo.current?.addressLine2 || '',
          landmark: coAddr.landmark || draftCo.current?.landmark || '',
          city: coAddr.cityId || draftCo.current?.city || '',
          state: coAddr.stateId || draftCo.current?.state || '',
          pincode: coAddr.pincode || coAddr.Pincode || coAddr.postalCode || coAddr.PostalCode || coAddr.pinCode || coAddr.PinCode || draftCo.current?.pincode || draftCo.pincode || '',
        },
      };
    }),
  };

  // 5. Employment & Income Details
  const applicantEmp = empList[0] || {};
  const coApplicantEmps = empList.slice(1);
  const employmentIncome = {
    applicant: {
      employmentIncomeDetailsId: applicantEmp.applicationEmploymentIncomeDetailsId || existingDraft.employmentIncome?.applicant?.employmentIncomeDetailsId || null,
      applicationEmploymentIncomeDetailsId: applicantEmp.applicationEmploymentIncomeDetailsId || existingDraft.employmentIncome?.applicant?.applicationEmploymentIncomeDetailsId || null,
      employerBusinessName: applicantEmp.employerBusinessName || existingDraft.employmentIncome?.applicant?.employerBusinessName || '',
      employerName: applicantEmp.employerBusinessName || existingDraft.employmentIncome?.applicant?.employerName || '',
      designationNatureOfBusiness: applicantEmp.designationNatureOfBusiness || existingDraft.employmentIncome?.applicant?.designationNatureOfBusiness || '',
      designation: applicantEmp.designationNatureOfBusiness || existingDraft.employmentIncome?.applicant?.designation || '',
      employmentNature: applicantEmp.employmentTypeId || existingDraft.employmentIncome?.applicant?.employmentNature || '',
      employmentType: applicantEmp.employmentTypeId || existingDraft.employmentIncome?.applicant?.employmentType || '',
      qualification: applicantEmp.educationId || existingDraft.employmentIncome?.applicant?.qualification || '',
      educationId: applicantEmp.educationId || existingDraft.employmentIncome?.applicant?.educationId || '',
      industryType: applicantEmp.industryType || existingDraft.employmentIncome?.applicant?.industryType || '',
      totalExperienceYears: applicantEmp.totalExperience !== undefined && applicantEmp.totalExperience !== null ? applicantEmp.totalExperience : (existingDraft.employmentIncome?.applicant?.totalExperienceYears || ''),
      totalExperience: applicantEmp.totalExperience !== undefined && applicantEmp.totalExperience !== null ? applicantEmp.totalExperience : (existingDraft.employmentIncome?.applicant?.totalExperience || ''),
      grossMonthlyIncome: applicantEmp.grossMonthlyIncome !== undefined && applicantEmp.grossMonthlyIncome !== null ? applicantEmp.grossMonthlyIncome : (existingDraft.employmentIncome?.applicant?.grossMonthlyIncome || ''),
      otherIncomeMonthly: applicantEmp.otherMonthlyIncome !== undefined && applicantEmp.otherMonthlyIncome !== null ? applicantEmp.otherMonthlyIncome : (existingDraft.employmentIncome?.applicant?.otherIncomeMonthly || ''),
      otherMonthlyIncome: applicantEmp.otherMonthlyIncome !== undefined && applicantEmp.otherMonthlyIncome !== null ? applicantEmp.otherMonthlyIncome : (existingDraft.employmentIncome?.applicant?.otherMonthlyIncome || ''),
      netMonthlyIncome: applicantEmp.netMonthlyIncome !== undefined && applicantEmp.netMonthlyIncome !== null ? applicantEmp.netMonthlyIncome : (existingDraft.employmentIncome?.applicant?.netMonthlyIncome || ''),
      grossAnnualIncome: applicantEmp.grossAnnualIncome !== undefined && applicantEmp.grossAnnualIncome !== null ? applicantEmp.grossAnnualIncome : (existingDraft.employmentIncome?.applicant?.grossAnnualIncome || ''),
    },
    coApplicants: coApplicantEmps.map((coEmp, idx) => {
      const draftCo = existingDraft.employmentIncome?.coApplicants?.[idx] || {};
      return {
        employmentIncomeDetailsId: coEmp.applicationEmploymentIncomeDetailsId || draftCo.employmentIncomeDetailsId || null,
        applicationEmploymentIncomeDetailsId: coEmp.applicationEmploymentIncomeDetailsId || draftCo.applicationEmploymentIncomeDetailsId || null,
        employerBusinessName: coEmp.employerBusinessName || draftCo.employerBusinessName || '',
        employerName: coEmp.employerBusinessName || draftCo.employerName || '',
        designationNatureOfBusiness: coEmp.designationNatureOfBusiness || draftCo.designationNatureOfBusiness || '',
        designation: coEmp.designationNatureOfBusiness || draftCo.designation || '',
        employmentNature: coEmp.employmentTypeId || draftCo.employmentNature || '',
        employmentType: coEmp.employmentTypeId || draftCo.employmentType || '',
        qualification: coEmp.educationId || draftCo.qualification || '',
        educationId: coEmp.educationId || draftCo.educationId || '',
        industryType: coEmp.industryType || draftCo.industryType || '',
        totalExperienceYears: coEmp.totalExperience !== undefined && coEmp.totalExperience !== null ? coEmp.totalExperience : (draftCo.totalExperienceYears || ''),
        totalExperience: coEmp.totalExperience !== undefined && coEmp.totalExperience !== null ? coEmp.totalExperience : (draftCo.totalExperience || ''),
        grossMonthlyIncome: coEmp.grossMonthlyIncome !== undefined && coEmp.grossMonthlyIncome !== null ? coEmp.grossMonthlyIncome : (draftCo.grossMonthlyIncome || ''),
        otherIncomeMonthly: coEmp.otherMonthlyIncome !== undefined && coEmp.otherMonthlyIncome !== null ? coEmp.otherMonthlyIncome : (draftCo.otherIncomeMonthly || ''),
        otherMonthlyIncome: coEmp.otherMonthlyIncome !== undefined && coEmp.otherMonthlyIncome !== null ? coEmp.otherMonthlyIncome : (draftCo.otherMonthlyIncome || ''),
        netMonthlyIncome: coEmp.netMonthlyIncome !== undefined && coEmp.netMonthlyIncome !== null ? coEmp.netMonthlyIncome : (draftCo.netMonthlyIncome || ''),
        grossAnnualIncome: coEmp.grossAnnualIncome !== undefined && coEmp.grossAnnualIncome !== null ? coEmp.grossAnnualIncome : (draftCo.grossAnnualIncome || ''),
      };
    }),
  };

  // 6. Bank & Existing Loans Details
  const primaryBankRecord = bankList.find((b) => b.isPrimaryBank === true) || bankList[0] || {};
  const otherBankRecord = bankList.find((b) => b.isPrimaryBank === false && b !== primaryBankRecord) || bankList[1] || {};
  const bankExistingLoans = {
    applicant: {
      primaryBank: {
        applicationBankExistingLoanDetailsId: primaryBankRecord.applicationBankExistingLoanDetailsId || existingDraft.bankExistingLoans?.applicant?.primaryBank?.applicationBankExistingLoanDetailsId || null,
        bankName: primaryBankRecord.bankId || existingDraft.bankExistingLoans?.applicant?.primaryBank?.bankName || '',
        branch: primaryBankRecord.bankBranchId || existingDraft.bankExistingLoans?.applicant?.primaryBank?.branch || '',
        ifscCode: existingDraft.bankExistingLoans?.applicant?.primaryBank?.ifscCode || '',
        accountType: existingDraft.bankExistingLoans?.applicant?.primaryBank?.accountType || 'Savings',
        accountNumber: primaryBankRecord.accountNumber || existingDraft.bankExistingLoans?.applicant?.primaryBank?.accountNumber || '',
        accountHolderName: customerName || existingDraft.bankExistingLoans?.applicant?.primaryBank?.accountHolderName || '',
        noOfActiveLoans: primaryBankRecord.noOfActiveLoans !== undefined && primaryBankRecord.noOfActiveLoans !== null ? primaryBankRecord.noOfActiveLoans : (existingDraft.bankExistingLoans?.applicant?.primaryBank?.noOfActiveLoans ?? ''),
        noOfActiveCreditCards: primaryBankRecord.noOfActiveCreditCards !== undefined && primaryBankRecord.noOfActiveCreditCards !== null ? primaryBankRecord.noOfActiveCreditCards : (existingDraft.bankExistingLoans?.applicant?.primaryBank?.noOfActiveCreditCards ?? ''),
        activeLoansDetails: existingDraft.bankExistingLoans?.applicant?.primaryBank?.activeLoansDetails || [],
      },
      otherBank: {
        applicationBankExistingLoanDetailsId: otherBankRecord.applicationBankExistingLoanDetailsId || existingDraft.bankExistingLoans?.applicant?.otherBank?.applicationBankExistingLoanDetailsId || null,
        bankName: otherBankRecord.bankId || existingDraft.bankExistingLoans?.applicant?.otherBank?.bankName || '',
        branch: otherBankRecord.bankBranchId || existingDraft.bankExistingLoans?.applicant?.otherBank?.branch || '',
        ifscCode: existingDraft.bankExistingLoans?.applicant?.otherBank?.ifscCode || '',
        accountType: existingDraft.bankExistingLoans?.applicant?.otherBank?.accountType || 'Savings',
        accountNumber: otherBankRecord.accountNumber || existingDraft.bankExistingLoans?.applicant?.otherBank?.accountNumber || '',
        noOfActiveLoans: otherBankRecord.noOfActiveLoans !== undefined && otherBankRecord.noOfActiveLoans !== null ? otherBankRecord.noOfActiveLoans : (existingDraft.bankExistingLoans?.applicant?.otherBank?.noOfActiveLoans ?? ''),
        noOfActiveCreditCards: otherBankRecord.noOfActiveCreditCards !== undefined && otherBankRecord.noOfActiveCreditCards !== null ? otherBankRecord.noOfActiveCreditCards : (existingDraft.bankExistingLoans?.applicant?.otherBank?.noOfActiveCreditCards ?? ''),
        activeLoansDetails: existingDraft.bankExistingLoans?.applicant?.otherBank?.activeLoansDetails || [],
      },
    },
    primaryBank: {
      applicationBankExistingLoanDetailsId: primaryBankRecord.applicationBankExistingLoanDetailsId || existingDraft.bankExistingLoans?.primaryBank?.applicationBankExistingLoanDetailsId || null,
      bankName: primaryBankRecord.bankId || existingDraft.bankExistingLoans?.primaryBank?.bankName || '',
      branch: primaryBankRecord.bankBranchId || existingDraft.bankExistingLoans?.primaryBank?.branch || '',
      accountNumber: primaryBankRecord.accountNumber || existingDraft.bankExistingLoans?.primaryBank?.accountNumber || '',
      accountHolderName: customerName || existingDraft.bankExistingLoans?.primaryBank?.accountHolderName || '',
      noOfActiveLoans: primaryBankRecord.noOfActiveLoans !== undefined && primaryBankRecord.noOfActiveLoans !== null ? primaryBankRecord.noOfActiveLoans : (existingDraft.bankExistingLoans?.primaryBank?.noOfActiveLoans ?? ''),
      noOfActiveCreditCards: primaryBankRecord.noOfActiveCreditCards !== undefined && primaryBankRecord.noOfActiveCreditCards !== null ? primaryBankRecord.noOfActiveCreditCards : (existingDraft.bankExistingLoans?.primaryBank?.noOfActiveCreditCards ?? ''),
    },
    coApplicants: existingDraft.bankExistingLoans?.coApplicants || [],
  };

  // 7. Collateral Details
  const prop1 = colList[0] || {};
  const prop2 = colList[1] || {};
  const collateralDetails = {
    propertyOne: {
      applicationCollateralDetailsId: prop1.applicationCollateralDetailsId || existingDraft.collateralDetails?.propertyOne?.applicationCollateralDetailsId || null,
      typeOfProperty: prop1.propertyId || existingDraft.collateralDetails?.propertyOne?.typeOfProperty || '',
      usage: prop1.propertyUsageId || existingDraft.collateralDetails?.propertyOne?.usage || '',
      locationAddress: prop1.locationAddress || existingDraft.collateralDetails?.propertyOne?.locationAddress || '',
      estimatedValue: prop1.estimatedValue !== undefined && prop1.estimatedValue !== null ? prop1.estimatedValue : (existingDraft.collateralDetails?.propertyOne?.estimatedValue || ''),
    },
    propertyTwo: {
      applicationCollateralDetailsId: prop2.applicationCollateralDetailsId || existingDraft.collateralDetails?.propertyTwo?.applicationCollateralDetailsId || null,
      typeOfProperty: prop2.propertyId || existingDraft.collateralDetails?.propertyTwo?.typeOfProperty || '',
      usage: prop2.propertyUsageId || existingDraft.collateralDetails?.propertyTwo?.usage || '',
      locationAddress: prop2.locationAddress || existingDraft.collateralDetails?.propertyTwo?.locationAddress || '',
      estimatedValue: prop2.estimatedValue !== undefined && prop2.estimatedValue !== null ? prop2.estimatedValue : (existingDraft.collateralDetails?.propertyTwo?.estimatedValue || ''),
    },
  };

  // 8. Reference Details
  const ref1 = refList[0] || {};
  const ref2 = refList[1] || {};
  const references = {
    reference1: {
      applicationReferenceDetailsId: ref1.applicationReferenceDetailsId || existingDraft.references?.reference1?.applicationReferenceDetailsId || null,
      fullName: ref1.fullName || existingDraft.references?.reference1?.fullName || '',
      relationship: ref1.relationshipId || existingDraft.references?.reference1?.relationship || '',
      mobileNo: ref1.mobileNumber || existingDraft.references?.reference1?.mobileNo || '',
      address: ref1.address || existingDraft.references?.reference1?.address || '',
    },
    reference2: {
      applicationReferenceDetailsId: ref2.applicationReferenceDetailsId || existingDraft.references?.reference2?.applicationReferenceDetailsId || null,
      fullName: ref2.fullName || existingDraft.references?.reference2?.fullName || '',
      relationship: ref2.relationshipId || existingDraft.references?.reference2?.relationship || '',
      mobileNo: ref2.mobileNumber || existingDraft.references?.reference2?.mobileNo || '',
      address: ref2.address || existingDraft.references?.reference2?.address || '',
    },
  };

  // 9. Sourcing Details
  const sourcing = {
    sourcingChannel,
    sourcedBy: customer.agentName || existingDraft.sourcing?.sourcedBy || '',
    employeeId: customer.agentId ? String(customer.agentId) : (existingDraft.sourcing?.employeeId || ''),
  };

  // 10. Declaration & Other Sections
  const declaration = existingDraft.declaration || {
    applicantSignature: customerName,
    applicantDate: createdDate ? toIstDateInput(createdDate) : toIstDateInput(),
    coApplicantSignature: '',
    coApplicantDate: '',
    ackApplicantName: customerName,
    ackProduct: '',
    ackReceivedBy: customer.agentName || '',
    ackDate: createdDate ? toIstDateInput(createdDate) : toIstDateInput(),
  };

  const scheduleCharges = existingDraft.scheduleCharges || existingDraft.scheduleOfCharges || { values: {} };
  const documentChecklist = existingDraft.documentChecklist || {
    items: [
      { status: true },
      { status: true },
      { status: true },
      { status: true },
      { status: true },
      { status: true },
    ],
  };

  const combined = {
    ...existingDraft,
    id: appIdStr,
    applicationNumber: appIdStr,
    agentCustomerId,
    agentId,
    agentName,
    customerName,
    fullName: customerName,
    mobile,
    mobileNumber: mobile,
    email,
    branch,
    status,
    createdDate,
    applicationProductDetailsId,
    sourcingChannel,
    loanProduct,
    loanVariation,
    loanTransactionType,
    purposeOfLoan,
    loanAmount,
    loanTenureMonths,
    interestType,
    roi,
    distanceFromBranchKm,
    coApplicantsCount,
    _isHydrated: true,

    sections: {
      ...(existingDraft.sections || {}),
      personalInformation,
      kycDocuments,
      addressDetails,
      employmentIncome,
      bankExistingLoans,
      collateral: collateralDetails,
      collateralDetails,
      references,
      sourcing,
      declaration,
      scheduleCharges,
      documentChecklist,
    },
    registration: {
      personalInformation,
      primaryApplicant: personalInformation.applicant,
      coApplicants: personalInformation.coApplicants,
      coApplicantsCount: personalInformation.coApplicants.length,
    },
    kycDocuments,
    addressDetails,
    employmentIncome,
    bankExistingLoans,
    collateral: collateralDetails,
    collateralDetails,
    references,
    sourcing,
    declaration,
    scheduleCharges,
    documentChecklist,
  };

  return normalizeApplicationRecord(combined);
}

function buildSeedApplications() {
  return allNewApplications.reduce((acc, app) => {
    acc[app.id] = normalizeApplicationRecord({ ...buildBlankApplication(app.id), ...app });
    return acc;
  }, {});
}

const APP_SEED_MAP = buildSeedApplications();

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

const inFlightHydrations = new Map();

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

  const [hydratingMap, setHydratingMap] = useState({});

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

  const loadApplicationFromBackend = useCallback(async (applicationId, forceRefresh = false) => {
    if (!applicationId) return null;
    const appIdStr = String(applicationId);

    // If it's a seed or draft prefix without numeric backend ID, return local draft
    if (appIdStr.startsWith('APP-') && isNaN(Number(appIdStr.replace('APP-', '')))) {
      return getApplication(applicationId);
    }

    // If already hydrated and not forcing refresh, return immediately
    const existingApp = applications[applicationId];
    if (!forceRefresh && existingApp && existingApp._isHydrated) {
      return existingApp;
    }

    // De-duplicate concurrent calls for the same ID
    if (inFlightHydrations.has(appIdStr) && !forceRefresh) {
      return inFlightHydrations.get(appIdStr);
    }

    const hydrationPromise = (async () => {
      setHydratingMap((prev) => ({ ...prev, [appIdStr]: true }));
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';

      try {
        // 1. Try full details endpoint
        const fullRes = await fetch(`${baseUrl}/ApplicationFullDetails/${appIdStr}`);
        if (fullRes.ok) {
          const fullData = await fullRes.json();
          if (fullData) {
            const currentDraft = applications[appIdStr] || getApplication(appIdStr);
            const mapped = mapBackendToApplication(fullData, currentDraft);
            setApplications((prev) => ({
              ...prev,
              [appIdStr]: mapped,
            }));
            return mapped;
          }
        }

        // 2. Fallback to AgentAddCustomer endpoint if full details is 404 or empty
        const custRes = await fetch(`${baseUrl}/AgentAddCustomer/${appIdStr}`);
        if (custRes.ok) {
          const custData = await custRes.json();
          const custRecord = Array.isArray(custData) ? custData[0] : (custData?.value ? custData.value[0] : custData);
          if (custRecord) {
            const currentDraft = applications[appIdStr] || getApplication(appIdStr);
            const mapped = mapBackendToApplication({ customer: custRecord }, currentDraft);
            setApplications((prev) => ({
              ...prev,
              [appIdStr]: mapped,
            }));
            return mapped;
          }
        }
      } catch (err) {
        console.warn(`Failed to hydrate application ${appIdStr} from backend:`, err);
      } finally {
        inFlightHydrations.delete(appIdStr);
        setHydratingMap((prev) => {
          const next = { ...prev };
          delete next[appIdStr];
          return next;
        });
      }

      return getApplication(appIdStr);
    })();

    inFlightHydrations.set(appIdStr, hydrationPromise);
    return hydrationPromise;
  }, [applications, getApplication]);

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
    loadApplicationFromBackend,
    hydratingMap,
  }), [applications, getApplication, ensureApplication, saveApplication, createApplicationDraft, loadApplicationFromBackend, hydratingMap]);

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
