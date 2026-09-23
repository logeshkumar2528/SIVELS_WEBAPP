import { mapKycPerson, primaryKycForSequence } from '../pages/KycDocuments/kycDocumentState';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
import { resolveApplicationOwnership } from '../utils/ownershipHelper';

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
      : (record.noOfCoApplicants !== undefined && record.noOfCoApplicants !== null && record.noOfCoApplicants !== '' ? Number(record.noOfCoApplicants) : null);

  const coApplicantsCount =
    rawCoAppCount !== null && Number.isFinite(rawCoAppCount)
      ? Math.max(0, rawCoAppCount)
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

  const ownership = resolveApplicationOwnership(record);
  const isRmSourced = record.isRmSourced !== undefined
    ? Boolean(record.isRmSourced)
    : ownership.isDirectRm;
  const isAgentSourced = record.isAgentSourced !== undefined
    ? Boolean(record.isAgentSourced)
    : ownership.isAgentCreated;
  const resolvedAgentId = ownership.agentId ?? (isAgentSourced ? (record.agentId ?? record.AgentId ?? null) : null);
  const rmId = record.rmId ?? record.RMId ?? ownership.rmId ?? (isRmSourced ? (record.createdBy ?? record.CreatedBy ?? null) : null);
  const rmCustomerId = record.rmCustomerId ?? record.RmCustomerId ?? record.RMCustomerId ?? null;

  return {
    ...record,
    customerName,
    id: record.id || applicationNumber,
    applicationNumber,
    agentCustomerId: record.agentCustomerId || record.AgentCustomerId || record.id || applicationNumber,
    AgentCustomerId: record.AgentCustomerId || record.agentCustomerId || record.id || applicationNumber,
    agentId: resolvedAgentId,
    AgentId: resolvedAgentId,
    agentName: record.agentName || record.AgentName || ownership.agentName || '',
    agentCode: record.agentCode || record.AgentCode || '',
    rmId,
    RMId: rmId,
    rmCustomerId,
    RmCustomerId: rmCustomerId,
    RMCustomerId: rmCustomerId,
    createdByRole: record.createdByRole || record.CreatedByRole || '',
    CreatedByRole: record.CreatedByRole || record.createdByRole || '',
    createdByUserId: record.createdByUserId ?? record.CreatedByUserId ?? null,
    CreatedByUserId: record.CreatedByUserId ?? record.createdByUserId ?? null,
    createdBy: record.createdBy ?? record.CreatedBy ?? null,
    CreatedBy: record.CreatedBy ?? record.createdBy ?? null,
    isRmSourced,
    isAgentSourced,
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
      coApplicantsCount: coApplicantsCount !== undefined && coApplicantsCount !== null ? coApplicantsCount : (personalInfo.coApplicants?.length || 0),
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
      applicant: {
        primaryBank: {
          applicationBankExistingLoanDetailsId: null,
          bankName: '',
          branch: '',
          accountType: '',
          accountNumber: '',
          ifscCode: '',
          accountHolderName: '',
          bankAddress: '',
          noOfActiveLoans: '',
          noOfActiveCreditCards: '',
          isPrimaryBank: true,
          activeLoansDetails: [],
          activeCreditCardsDetails: [],
        },
        otherBank: {
          applicationBankExistingLoanDetailsId: null,
          bankName: '',
          branch: '',
          accountType: '',
          accountNumber: '',
          ifscCode: '',
          accountHolderName: '',
          bankAddress: '',
          noOfActiveLoans: '',
          noOfActiveCreditCards: '',
          isPrimaryBank: false,
          activeLoansDetails: [],
          activeCreditCardsDetails: [],
        },
      },
      primaryBank: {
        applicationBankExistingLoanDetailsId: null,
        bankName: '',
        branch: '',
        accountType: '',
        accountNumber: '',
        ifscCode: '',
        accountHolderName: '',
        bankAddress: '',
        noOfActiveLoans: '',
        noOfActiveCreditCards: '',
        isPrimaryBank: true,
        activeLoansDetails: [],
        activeCreditCardsDetails: [],
      },
      otherBank: {
        applicationBankExistingLoanDetailsId: null,
        bankName: '',
        branch: '',
        accountType: '',
        accountNumber: '',
        ifscCode: '',
        accountHolderName: '',
        bankAddress: '',
        noOfActiveLoans: '',
        noOfActiveCreditCards: '',
        isPrimaryBank: false,
        activeLoansDetails: [],
        activeCreditCardsDetails: [],
      },
      coApplicants: [],
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
  const productDetails = Array.isArray(rawProduct) ? (rawProduct[0] || null) : (rawProduct || null);
  const extractList = (raw) => {
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.value)) return raw.value;
    if (Array.isArray(raw?.data)) return raw.data;
    if (raw && typeof raw === 'object' && Object.keys(raw).length > 0) return [raw];
    return [];
  };

  const kycList = extractList(backendData.kycDocuments ?? backendData.KycDocuments ?? backendData.applicationKYCDocuments ?? backendData.ApplicationKYCDocuments);
  const personalList = extractList(backendData.personalInformation ?? backendData.PersonalInformation ?? backendData.applicationPersonalInformation ?? backendData.ApplicationPersonalInformation);
  const addressList = extractList(backendData.addressDetails ?? backendData.AddressDetails ?? backendData.applicationAddressDetails ?? backendData.ApplicationAddressDetails);
  const empList = extractList(backendData.employmentIncome ?? backendData.EmploymentIncome ?? backendData.applicationEmploymentIncomeDetails ?? backendData.ApplicationEmploymentIncomeDetails);
  const bankList = extractList(backendData.bankExistingLoans ?? backendData.BankExistingLoans ?? backendData.applicationBankExistingLoanDetails ?? backendData.ApplicationBankExistingLoanDetails);
  const colList = extractList(
    backendData.collateral ??
    backendData.Collateral ??
    backendData.collateralDetails ??
    backendData.CollateralDetails ??
    backendData.applicationCollateralDetails ??
    backendData.ApplicationCollateralDetails
  );
  const refList = extractList(backendData.references ?? backendData.References ?? backendData.applicationReferenceDetails ?? backendData.ApplicationReferenceDetails);

  const agentCustomerId = customer.agentCustomerId || customer.AgentCustomerId || productDetails?.agentCustomerId || productDetails?.AgentCustomerId || existingDraft.agentCustomerId || existingDraft.id;
  const appIdStr = String(agentCustomerId || existingDraft.id || '');
  const currentAppIdNum = Number(appIdStr);

  // Validate strict ownership of productDetails to current application only (supports both Agent and RM common-customer model)
  const currentAgentCustId = Number(customer.agentCustomerId || customer.AgentCustomerId || agentCustomerId || currentAppIdNum);
  const rawProductAgentCustId = productDetails?.agentCustomerId ?? productDetails?.AgentCustomerId;
  const rawProductRmCustId = productDetails?.rmCustomerId ?? productDetails?.RmCustomerId ?? productDetails?.RMCustomerId;
  const rawLegacyRmCustId = customer.rmCustomerId ?? customer.RmCustomerId ?? customer.RMCustomerId;

  const isProductOwnedByCurrentApp = Boolean(
    productDetails && (
      // Priority 1: Match by AgentCustomerId for both Agent and RM common customers
      (rawProductAgentCustId !== undefined && rawProductAgentCustId !== null && rawProductAgentCustId !== '' && Number(rawProductAgentCustId) === currentAgentCustId) ||
      // Priority 2: Legacy fallback when product.AgentCustomerId is null/absent and authoritative legacy RMCustomerId is present
      ((rawProductAgentCustId === undefined || rawProductAgentCustId === null || rawProductAgentCustId === '') &&
       rawProductRmCustId !== undefined && rawProductRmCustId !== null && rawProductRmCustId !== '' &&
       rawLegacyRmCustId !== undefined && rawLegacyRmCustId !== null && rawLegacyRmCustId !== '' &&
       Number(rawProductRmCustId) === Number(rawLegacyRmCustId))
    )
  );

  const effectiveProductDetails = isProductOwnedByCurrentApp ? productDetails : null;

  // 1. Customer & Product Details
  const customerName = customer.fullName || customer.FullName || customer.customerName || customer.CustomerName || existingDraft.customerName || '';
  const mobile = customer.mobileNumber || customer.MobileNumber || customer.mobile || customer.Mobile || existingDraft.mobile || '';
  const email = customer.email || customer.Email || customer.emailAddress || customer.EmailAddress || existingDraft.email || '';
  const branch = customer.branch || customer.Branch || existingDraft.branch || '';
  const rawStatus = customer.status !== undefined ? customer.status : customer.Status;
  const status = rawStatus === 2 ? 'Logged to HO' : (rawStatus === 1 ? 'Pending' : (rawStatus === 0 ? 'New' : (existingDraft.status || 'Draft')));
  const createdDate = customer.createdAt || customer.CreatedAt || customer.createdDate || customer.CreatedDate || existingDraft.createdDate || '';
  // Backend-resolved Ownership Fields (Single Source of Truth)
  const createdByRole =
    customer.createdByRole ??
    customer.CreatedByRole ??
    customer.created_by_role ??
    backendData.createdByRole ??
    backendData.CreatedByRole ??
    existingDraft.createdByRole ??
    existingDraft.CreatedByRole ??
    '';

  const createdByUserId =
    customer.createdByUserId ??
    customer.CreatedByUserId ??
    customer.created_by_user_id ??
    backendData.createdByUserId ??
    backendData.CreatedByUserId ??
    existingDraft.createdByUserId ??
    existingDraft.CreatedByUserId ??
    null;

  const createdBy =
    customer.createdBy ??
    customer.CreatedBy ??
    customer.created_by ??
    backendData.createdBy ??
    backendData.CreatedBy ??
    effectiveProductDetails?.createdBy ??
    effectiveProductDetails?.CreatedBy ??
    existingDraft.createdBy ??
    existingDraft.CreatedBy ??
    null;

  const customerSource =
    backendData.customerSource ??
    backendData.CustomerSource ??
    customer.customerSource ??
    customer.CustomerSource ??
    null;

  const rawRmId =
    backendData.rmId ??
    backendData.RmId ??
    backendData.RMId ??
    customer.rmId ??
    customer.RmId ??
    customer.RMId ??
    effectiveProductDetails?.rmId ??
    effectiveProductDetails?.RmId ??
    effectiveProductDetails?.RMId ??
    existingDraft.rmId ??
    existingDraft.RMId ??
    null;
  const rmId = (rawRmId !== null && rawRmId !== undefined && rawRmId !== '') ? Number(rawRmId) : null;

  const rmName =
    backendData.rmName ??
    backendData.RmName ??
    backendData.RMName ??
    customer.rmName ??
    customer.RmName ??
    customer.RMName ??
    existingDraft.rmName ??
    null;

  const rmCode =
    backendData.rmCode ??
    backendData.RmCode ??
    backendData.RMCode ??
    customer.rmCode ??
    customer.RmCode ??
    customer.RMCode ??
    existingDraft.rmCode ??
    null;

  const rawAgentId =
    backendData.agentId !== undefined ? backendData.agentId :
    (backendData.AgentId !== undefined ? backendData.AgentId :
    (customer.agentId !== undefined ? customer.agentId :
    (customer.AgentId !== undefined ? customer.AgentId :
    (effectiveProductDetails?.agentId !== undefined ? effectiveProductDetails.agentId :
    (effectiveProductDetails?.AgentId !== undefined ? effectiveProductDetails.AgentId :
    (existingDraft.agentId !== undefined ? existingDraft.agentId :
    (existingDraft.AgentId !== undefined ? existingDraft.AgentId : null)))))));
  const agentId = (rawAgentId !== null && rawAgentId !== undefined && rawAgentId !== '') ? Number(rawAgentId) : null;

  const rawAgentName =
    backendData.agentName ??
    backendData.AgentName ??
    customer.agentName ??
    customer.AgentName ??
    existingDraft.agentName ??
    null;

  const rawAgentCode =
    backendData.agentCode ??
    backendData.AgentCode ??
    customer.agentCode ??
    customer.AgentCode ??
    existingDraft.agentCode ??
    null;

  // Resolve ownership using the shared helper as the single source of truth
  const ownership = resolveApplicationOwnership({
    ...existingDraft,
    ...customer,
    ...backendData,
    createdByRole,
    CreatedByRole: createdByRole,
    createdByUserId,
    CreatedByUserId: createdByUserId,
    createdBy,
    CreatedBy: createdBy,
    agentId,
    AgentId: agentId,
    rmId,
    RMId: rmId,
  });

  const isAgentSourced = ownership.isAgentCreated;
  const isRmSourced = ownership.isDirectRm;
  const resolvedAgentId = ownership.agentId;
  const resolvedRmId = ownership.rmId ?? rmId;
  const agentName = isAgentSourced ? (rawAgentName || ownership.agentName || '') : '';
  const agentCode = isAgentSourced ? (rawAgentCode || '') : '';
  const resolvedCustomerSource = customerSource || (isAgentSourced ? 'Agent' : (isRmSourced ? 'RM' : ''));
  const rmCustomerId = effectiveProductDetails?.rmCustomerId ?? effectiveProductDetails?.RmCustomerId ?? customer.rmCustomerId ?? customer.RmCustomerId ?? customer.RMCustomerId ?? existingDraft.rmCustomerId ?? null;

  const applicationProductDetailsId = effectiveProductDetails?.applicationProductDetailsId || effectiveProductDetails?.ApplicationProductDetailsId || null;
  const sourcingChannel = effectiveProductDetails?.sourcingChannelId ?? effectiveProductDetails?.SourcingChannelId ?? (isRmSourced ? 1 : (existingDraft.sourcingChannel ?? ''));
  const loanProduct = effectiveProductDetails?.loanProductId ?? effectiveProductDetails?.LoanProductId ?? '';
  const loanVariation = effectiveProductDetails?.loanProductVariationId ?? effectiveProductDetails?.LoanProductVariationId ?? '';
  const loanTransactionType = effectiveProductDetails?.loanTransactionTypeId ?? effectiveProductDetails?.LoanTransactionTypeId ?? '';
  const purposeOfLoan = effectiveProductDetails?.loanPurposeId ?? effectiveProductDetails?.LoanPurposeId ?? customer.loanPurposeId ?? customer.LoanPurposeId ?? '';
  const loanAmount = (effectiveProductDetails?.loanAmount !== undefined && effectiveProductDetails?.loanAmount !== null && effectiveProductDetails?.loanAmount !== '')
    ? effectiveProductDetails.loanAmount
    : ((effectiveProductDetails?.LoanAmount !== undefined && effectiveProductDetails?.LoanAmount !== null && effectiveProductDetails?.LoanAmount !== '')
      ? effectiveProductDetails.LoanAmount
      : (customer.expectedLoanAmount ?? customer.ExpectedLoanAmount ?? ''));
  const loanTenureMonths = (effectiveProductDetails?.loanTenure !== undefined && effectiveProductDetails?.loanTenure !== null && effectiveProductDetails?.loanTenure !== '')
    ? effectiveProductDetails.loanTenure
    : ((effectiveProductDetails?.LoanTenure !== undefined && effectiveProductDetails?.LoanTenure !== null && effectiveProductDetails?.LoanTenure !== '')
      ? effectiveProductDetails.LoanTenure
      : (effectiveProductDetails?.loanTenureMonths ?? effectiveProductDetails?.LoanTenureMonths ?? ''));
  const interestType = effectiveProductDetails?.interestTypeId ?? effectiveProductDetails?.InterestTypeId ?? '';
  const roi = (effectiveProductDetails?.roi !== undefined && effectiveProductDetails?.roi !== null && effectiveProductDetails?.roi !== '')
    ? effectiveProductDetails.roi
    : ((effectiveProductDetails?.Roi !== undefined && effectiveProductDetails?.Roi !== null && effectiveProductDetails?.Roi !== '')
      ? effectiveProductDetails.Roi
      : ((effectiveProductDetails?.ROI !== undefined && effectiveProductDetails?.ROI !== null && effectiveProductDetails?.ROI !== '')
        ? effectiveProductDetails.ROI
        : ''));
  const distanceFromBranchKm = (effectiveProductDetails?.distanceFromBranch !== undefined && effectiveProductDetails?.distanceFromBranch !== null && effectiveProductDetails?.distanceFromBranch !== '')
    ? effectiveProductDetails.distanceFromBranch
    : ((effectiveProductDetails?.DistanceFromBranch !== undefined && effectiveProductDetails?.DistanceFromBranch !== null && effectiveProductDetails?.DistanceFromBranch !== '')
      ? effectiveProductDetails.DistanceFromBranch
      : (effectiveProductDetails?.distanceFromBranchKm ?? effectiveProductDetails?.DistanceFromBranchKm ?? ''));
  const coApplicantsCount = (effectiveProductDetails?.noOfCoApplicants !== undefined && effectiveProductDetails?.noOfCoApplicants !== null && effectiveProductDetails?.noOfCoApplicants !== '')
    ? Number(effectiveProductDetails.noOfCoApplicants)
    : ((effectiveProductDetails?.NoOfCoApplicants !== undefined && effectiveProductDetails?.NoOfCoApplicants !== null && effectiveProductDetails?.NoOfCoApplicants !== '')
      ? Number(effectiveProductDetails.NoOfCoApplicants)
      : (effectiveProductDetails?.coApplicantsCount !== undefined && effectiveProductDetails?.coApplicantsCount !== null && effectiveProductDetails?.coApplicantsCount !== ''
        ? Number(effectiveProductDetails.coApplicantsCount)
        : (effectiveProductDetails?.CoApplicantsCount !== undefined && effectiveProductDetails?.CoApplicantsCount !== null && effectiveProductDetails?.CoApplicantsCount !== ''
          ? Number(effectiveProductDetails.CoApplicantsCount)
          : 0)));

  // 2. KYC Documents
  const kycProductId = applicationProductDetailsId;
  const applicantKyc = primaryKycForSequence(kycList, 0, kycProductId);
  const coApplicantKycs = Array.from(
    { length: Number(coApplicantsCount) || 0 },
    (_, index) => primaryKycForSequence(kycList, index + 1, kycProductId)
  );
  const kycDocuments = {
    applicant: mapKycPerson(applicantKyc, existingDraft.kycDocuments?.applicant),
    coApplicants: coApplicantKycs.map((coKyc, index) =>
      mapKycPerson(coKyc, existingDraft.kycDocuments?.coApplicants?.[index])
    ),
  };

  // 3. Personal Information / Customer Registration (Sequence-Aware Relational Matching)
  const findPersonalRowForSequence = (targetSeq, targetKycRow) => {
    if (!Array.isArray(personalList) || personalList.length === 0) return null;
    const targetKycId = targetKycRow?.applicationKYCDocumentId ?? targetKycRow?.ApplicationKYCDocumentId ?? targetKycRow?.kycDocumentId;

    // 1. Primary: Strictly match by applicationKYCDocumentId
    if (targetKycId) {
      const matched = personalList.find((p) => {
        const pKycId = p.applicationKYCDocumentId ?? p.ApplicationKYCDocumentId ?? p.kycDocumentId;
        return pKycId !== undefined && pKycId !== null && pKycId !== '' && Number(pKycId) === Number(targetKycId);
      });
      if (matched) return matched;
    }

    // 2. Secondary: Match by applicantSequence if present on personal row
    const matchedBySeq = personalList.find((p) => {
      const rawSeq = p.applicantSequence ?? p.ApplicantSequence;
      return rawSeq !== undefined && rawSeq !== null && rawSeq !== '' && Number(rawSeq) === targetSeq;
    });
    if (matchedBySeq) return matchedBySeq;

    return null;
  };

  const mapPersonalPerson = (persRow = {}, draftPers = {}, kycRow = {}, defaultName = '', defaultMobile = '', defaultEmail = '', isPrimary = false) => {
    const rawPersId = persRow.personalInformationId ?? persRow.PersonalInformationId;
    const rawDraftPersId = draftPers.personalInformationId;
    const fallbackDraftPersId = isPrimary
      ? (
          existingDraft.registration?.personalInformation?.applicant?.personalInformationId ||
          existingDraft.sections?.personalInformation?.applicant?.personalInformationId ||
          existingDraft.personalInformation?.applicant?.personalInformationId ||
          null
        )
      : null;
    const personalInformationId = rawPersId ?? rawDraftPersId ?? fallbackDraftPersId ?? null;
    const relationshipWithApplicant = persRow.relationshipId ?? persRow.RelationshipId ?? persRow.relationshipWithApplicant ?? persRow.RelationshipWithApplicant ?? draftPers.relationshipWithApplicant ?? (isPrimary ? 'SELF' : '');
    const title = persRow.titleId ?? persRow.TitleId ?? persRow.title ?? persRow.Title ?? draftPers.title ?? '';
    const firstName = persRow.firstName ?? persRow.FirstName ?? (isPrimary ? (defaultName || draftPers.firstName || '') : (draftPers.firstName || ''));
    const middleName = persRow.middleName ?? persRow.MiddleName ?? draftPers.middleName ?? '';
    const lastName = persRow.lastName ?? persRow.LastName ?? draftPers.lastName ?? '';
    const fatherOrSpouseName = persRow.fatherSpouseName ?? persRow.FatherSpouseName ?? persRow.fatherOrSpouseName ?? persRow.FatherOrSpouseName ?? draftPers.fatherOrSpouseName ?? '';
    const mothersMaidenName = persRow.mothersMaidenName ?? persRow.MothersMaidenName ?? draftPers.mothersMaidenName ?? '';
    const rawDob = persRow.dateOfBirth ?? persRow.DateOfBirth ?? draftPers.dateOfBirth;
    const dateOfBirth = rawDob ? String(rawDob).slice(0, 10) : '';
    const religion = persRow.religionId ?? persRow.ReligionId ?? persRow.religion ?? persRow.Religion ?? draftPers.religion ?? '';
    const category = persRow.casteId ?? persRow.CasteId ?? persRow.category ?? persRow.Category ?? draftPers.category ?? '';
    const gender = persRow.genderId ?? persRow.GenderId ?? persRow.gender ?? persRow.Gender ?? draftPers.gender ?? '';
    const maritalStatus = persRow.maritalStatusId ?? persRow.MaritalStatusId ?? persRow.maritalStatus ?? persRow.MaritalStatus ?? draftPers.maritalStatus ?? '';
    const mobileNo = persRow.mobileNumber ?? persRow.MobileNumber ?? persRow.mobileNo ?? persRow.MobileNo ?? (isPrimary ? (defaultMobile || draftPers.mobileNo || '') : (draftPers.mobileNo || ''));
    const emailId = persRow.emailId ?? persRow.EmailId ?? persRow.email ?? persRow.Email ?? (isPrimary ? (defaultEmail || draftPers.emailId || '') : (draftPers.emailId || ''));
    const panCardNo = kycRow?.panCardNo ?? kycRow?.PanCardNo ?? persRow.panCardNo ?? persRow.PanCardNo ?? draftPers.panCardNo ?? '';

    return {
      personalInformationId,
      relationshipWithApplicant,
      title,
      firstName,
      middleName,
      lastName,
      fatherOrSpouseName,
      mothersMaidenName,
      dateOfBirth,
      religion,
      category,
      gender,
      maritalStatus,
      mobileNo,
      emailId,
      panCardNo,
    };
  };

  const applicantPers = findPersonalRowForSequence(0, applicantKyc);
  const coApplicantPersList = Array.from({ length: Number(coApplicantsCount) || 0 }, (_, idx) => {
    return findPersonalRowForSequence(idx + 1, coApplicantKycs[idx]);
  });

  const coApplicantPersonalIds = new Set(
    coApplicantPersList
      .map((p) => p?.personalInformationId ?? p?.PersonalInformationId)
      .filter((id) => id !== undefined && id !== null && id !== '')
      .map(Number)
  );

  const mappedCoApplicants = Array.from({ length: Number(coApplicantsCount) || 0 }, (_, idx) => {
    const coPers = coApplicantPersList[idx] || {};
    const draftCo = existingDraft.registration?.personalInformation?.coApplicants?.[idx] || existingDraft.personalInformation?.coApplicants?.[idx] || {};
    return mapPersonalPerson(coPers, draftCo, coApplicantKycs[idx], '', '', '', false);
  });

  const draftApplicant =
    existingDraft.registration?.personalInformation?.applicant ||
    existingDraft.sections?.personalInformation?.applicant ||
    existingDraft.personalInformation?.applicant ||
    {};
  const draftAppId =
    draftApplicant.personalInformationId ??
    existingDraft.registration?.personalInformation?.applicant?.personalInformationId ??
    existingDraft.sections?.personalInformation?.applicant?.personalInformationId ??
    existingDraft.personalInformation?.applicant?.personalInformationId ??
    null;
  const isDraftAppIdConflicting = draftAppId && coApplicantPersonalIds.has(Number(draftAppId));

  const cleanDraftApplicant = isDraftAppIdConflicting
    ? {
        ...draftApplicant,
        personalInformationId: null,
        fatherOrSpouseName: '',
        mothersMaidenName: '',
        dateOfBirth: '',
        religion: '',
        category: '',
        gender: '',
        maritalStatus: '',
      }
    : {
        ...draftApplicant,
        personalInformationId: draftAppId,
      };

  const mappedApplicant = mapPersonalPerson(
    applicantPers || {},
    cleanDraftApplicant,
    applicantKyc,
    customerName,
    mobile,
    email,
    true
  );

  // Guarantee applicant personalInformationId cannot collide with any co-applicant ID
  if (mappedApplicant.personalInformationId && coApplicantPersonalIds.has(Number(mappedApplicant.personalInformationId))) {
    mappedApplicant.personalInformationId = null;
  }

  const personalInformation = {
    applicant: mappedApplicant,
    coApplicants: mappedCoApplicants,
  };

  // 4. Address Details (Sequence-Aware Relational Matching with Claimed ID Protection)
  const rawAddressSource =
    backendData.addressDetails ??
    backendData.AddressDetails ??
    backendData.applicationAddressDetails ??
    backendData.ApplicationAddressDetails;
  const isBackendAddressExplicit = rawAddressSource !== undefined && rawAddressSource !== null;

  const claimedAddressIds = new Set();

  const getAddrId = (a) =>
    a?.applicationAddressDetailsId ??
    a?.ApplicationAddressDetailsId ??
    a?.addressDetailsId ??
    a?.AddressDetailsId ??
    a?.id ??
    a?.Id ??
    null;

  const findAddressRowForSequence = (targetSeq, resolvedPers, resolvedKyc) => {
    if (!Array.isArray(addressList) || addressList.length === 0) return null;
    const persId = resolvedPers?.personalInformationId ?? resolvedPers?.PersonalInformationId;
    const kycId = resolvedKyc?.applicationKYCDocumentId ?? resolvedKyc?.ApplicationKYCDocumentId ?? resolvedKyc?.kycDocumentId;

    const unclaimedList = addressList.filter((a) => {
      const id = getAddrId(a);
      return !id || !claimedAddressIds.has(Number(id));
    });

    if (unclaimedList.length === 0) return null;

    // 1. Primary: Match by exact relational ownership: address.personalInformationId === resolvedPerson.personalInformationId
    if (persId) {
      const matchedByPers = unclaimedList.filter((a) => {
        const aPersId = a.personalInformationId ?? a.PersonalInformationId;
        return aPersId !== undefined && aPersId !== null && aPersId !== '' && Number(aPersId) === Number(persId);
      });

      if (matchedByPers.length === 1) {
        const chosen = matchedByPers[0];
        const id = getAddrId(chosen);
        if (id) claimedAddressIds.add(Number(id));
        return chosen;
      }

      if (matchedByPers.length > 1) {
        // Multiple addresses under same personalInformationId (historical corrupted state)
        // Check explicit sequence if present
        const matchedBySeq = matchedByPers.find((a) => {
          const rawSeq = a.applicantSequence ?? a.ApplicantSequence;
          return rawSeq !== undefined && rawSeq !== null && rawSeq !== '' && Number(rawSeq) === targetSeq;
        });
        if (matchedBySeq) {
          const id = getAddrId(matchedBySeq);
          if (id) claimedAddressIds.add(Number(id));
          return matchedBySeq;
        }

        // Last-resort recovery for historical records: deterministic stable allocation among unclaimed rows
        const sorted = [...matchedByPers].sort((x, y) => (Number(getAddrId(x)) || 0) - (Number(getAddrId(y)) || 0));
        const chosen = sorted[0];
        if (chosen) {
          const id = getAddrId(chosen);
          if (id) claimedAddressIds.add(Number(id));
          return chosen;
        }
      }

      // Explicit personalInformationId exists but no matching address was found in backend.
      // Do NOT fall back to addresses belonging to another person.
      return null;
    }

    // 2. Secondary: Match by applicationKYCDocumentId if present
    if (kycId) {
      const matched = unclaimedList.find((a) => {
        const aKycId = a.applicationKYCDocumentId ?? a.ApplicationKYCDocumentId;
        return aKycId !== undefined && aKycId !== null && aKycId !== '' && Number(aKycId) === Number(kycId);
      });
      if (matched) {
        const id = getAddrId(matched);
        if (id) claimedAddressIds.add(Number(id));
        return matched;
      }
    }

    // 3. Match by applicantSequence if present
    const matchedBySeq = unclaimedList.find((a) => {
      const rawSeq = a.applicantSequence ?? a.ApplicantSequence;
      return rawSeq !== undefined && rawSeq !== null && rawSeq !== '' && Number(rawSeq) === targetSeq;
    });
    if (matchedBySeq) {
      const id = getAddrId(matchedBySeq);
      if (id) claimedAddressIds.add(Number(id));
      return matchedBySeq;
    }

    // 4. Main Applicant ONLY: fallback only if applicant has NO personalInformation row yet
    // and candidate belongs to current application and does not belong to a co-applicant
    if (targetSeq === 0 && !persId && unclaimedList.length > 0) {
      const candidate = unclaimedList.find((a) => {
        const aPersId = a.personalInformationId ?? a.PersonalInformationId;
        if (aPersId && coApplicantPersonalIds.has(Number(aPersId))) return false;
        const rawSeq = a.applicantSequence ?? a.ApplicantSequence;
        return rawSeq === undefined || rawSeq === null || Number(rawSeq) === 0;
      });
      if (candidate) {
        const id = getAddrId(candidate);
        if (id) claimedAddressIds.add(Number(id));
        return candidate;
      }
    }

    return null;
  };

  const mapAddressPerson = (addrRow = {}, draftAddr = {}, targetSeq = 0, resolvedPersId = null) => {
    // Foreign parent ID guard: reject if addrRow's personalInformationId conflicts with resolvedPersId
    const rowPersId = addrRow.personalInformationId ?? addrRow.PersonalInformationId;
    const isRowForeign = resolvedPersId && rowPersId && Number(rowPersId) !== Number(resolvedPersId);
    const effectiveAddrRow = isRowForeign ? {} : addrRow;

    const rawAddressId = getAddrId(effectiveAddrRow);
    const addressDetailsId =
      rawAddressId !== null && rawAddressId !== undefined && !isNaN(Number(rawAddressId)) && Number(rawAddressId) > 0
        ? Number(rawAddressId)
        : null;

    // Stale draft protection: Do not restore draft address if its ID was claimed by another person,
    // or if its personalInformationId belongs to a co-applicant while targetSeq is 0,
    // or if its personalInformationId conflicts with resolvedPersId,
    // or if backend returned an authoritative address array and this person has no address row in backend.
    const isDraftIdClaimed = draftAddr.addressDetailsId && claimedAddressIds.has(Number(draftAddr.addressDetailsId)) && (!addressDetailsId || Number(draftAddr.addressDetailsId) !== addressDetailsId);
    const isDraftPersConflicting =
      (targetSeq === 0 && draftAddr.personalInformationId && coApplicantPersonalIds.has(Number(draftAddr.personalInformationId))) ||
      (resolvedPersId && draftAddr.personalInformationId && Number(draftAddr.personalInformationId) !== Number(resolvedPersId));
    const isDraftSuppressedByExplicitBackend = isBackendAddressExplicit && !addressDetailsId;

    const safeDraftAddr = isDraftIdClaimed || isDraftPersConflicting || isDraftSuppressedByExplicitBackend ? {} : draftAddr;

    const personalInformationId =
      effectiveAddrRow.personalInformationId ??
      effectiveAddrRow.PersonalInformationId ??
      (targetSeq === 0 && safeDraftAddr.personalInformationId && coApplicantPersonalIds.has(Number(safeDraftAddr.personalInformationId)) ? null : safeDraftAddr.personalInformationId) ??
      resolvedPersId ??
      null;

    const addressLine1 = effectiveAddrRow.addressLine1 ?? effectiveAddrRow.AddressLine1 ?? safeDraftAddr.addressLine1 ?? safeDraftAddr.current?.addressLine1 ?? '';
    const addressLine2 = effectiveAddrRow.addressLine2 ?? effectiveAddrRow.AddressLine2 ?? safeDraftAddr.addressLine2 ?? safeDraftAddr.current?.addressLine2 ?? '';
    const landmark = effectiveAddrRow.landmark ?? effectiveAddrRow.Landmark ?? safeDraftAddr.landmark ?? safeDraftAddr.current?.landmark ?? '';
    const city = effectiveAddrRow.cityId ?? effectiveAddrRow.CityId ?? effectiveAddrRow.city ?? effectiveAddrRow.City ?? safeDraftAddr.city ?? safeDraftAddr.current?.city ?? '';
    const state = effectiveAddrRow.stateId ?? effectiveAddrRow.StateId ?? effectiveAddrRow.state ?? effectiveAddrRow.State ?? safeDraftAddr.state ?? safeDraftAddr.current?.state ?? '';
    const pincode = effectiveAddrRow.pincode ?? effectiveAddrRow.Pincode ?? effectiveAddrRow.postalCode ?? effectiveAddrRow.PostalCode ?? effectiveAddrRow.pinCode ?? effectiveAddrRow.PinCode ?? safeDraftAddr.pincode ?? safeDraftAddr.current?.pincode ?? '';
    const rawMailing = effectiveAddrRow.mailingAsCurrent ?? effectiveAddrRow.MailingAsCurrent ?? effectiveAddrRow.mailingSameAsCurrent ?? effectiveAddrRow.MailingSameAsCurrent ?? safeDraftAddr.mailingSameAsCurrent;
    const mailingSameAsCurrent = rawMailing !== undefined && rawMailing !== null && rawMailing !== ''
      ? (rawMailing === true || rawMailing === 1 || String(rawMailing).toLowerCase() === 'yes' ? 'Yes' : 'No')
      : (safeDraftAddr.mailingSameAsCurrent || 'No');

    return {
      addressDetailsId,
      applicationAddressDetailsId: addressDetailsId,
      personalInformationId,
      addressLine1,
      addressLine2,
      landmark,
      city,
      cityId: city,
      state,
      stateId: state,
      pincode,
      mailingSameAsCurrent,
      current: {
        addressLine1,
        addressLine2,
        landmark,
        city,
        cityId: city,
        state,
        stateId: state,
        pincode,
      },
    };
  };

  const applicantAddr = findAddressRowForSequence(0, applicantPers, applicantKyc) || {};
  const coApplicantAddrsList = Array.from({ length: Number(coApplicantsCount) || 0 }, (_, idx) => {
    return findAddressRowForSequence(idx + 1, coApplicantPersList[idx], coApplicantKycs[idx]) || {};
  });

  const addressDetails = {
    applicant: mapAddressPerson(
      applicantAddr,
      existingDraft.addressDetails?.applicant || existingDraft.sections?.addressDetails?.applicant,
      0,
      mappedApplicant?.personalInformationId || applicantPers?.personalInformationId
    ),
    coApplicants: Array.from({ length: Number(coApplicantsCount) || 0 }, (_, idx) => {
      const coAddr = coApplicantAddrsList[idx] || {};
      const draftCo = existingDraft.addressDetails?.coApplicants?.[idx] || existingDraft.sections?.addressDetails?.coApplicants?.[idx] || {};
      return mapAddressPerson(coAddr, draftCo, idx + 1, mappedCoApplicants[idx]?.personalInformationId || coApplicantPersList[idx]?.personalInformationId);
    }),
  };

  // 5. Employment & Income Details (Sequence-Aware Relational Matching with Claimed ID Protection)
  const rawEmpSource =
    backendData.employmentIncome ??
    backendData.EmploymentIncome ??
    backendData.applicationEmploymentIncomeDetails ??
    backendData.ApplicationEmploymentIncomeDetails;
  const isBackendEmpExplicit = rawEmpSource !== undefined && rawEmpSource !== null;

  const claimedEmploymentIds = new Set();

  const getEmpId = (e) =>
    e?.applicationEmploymentIncomeDetailsId ??
    e?.ApplicationEmploymentIncomeDetailsId ??
    e?.employmentIncomeDetailsId ??
    e?.EmploymentIncomeDetailsId ??
    e?.id ??
    e?.Id ??
    null;

  const findEmploymentRowForSequence = (targetSeq, resolvedAddr, resolvedPers, personName = '') => {
    if (!Array.isArray(empList) || empList.length === 0) return null;
    const addrId = resolvedAddr?.applicationAddressDetailsId ?? resolvedAddr?.ApplicationAddressDetailsId ?? resolvedAddr?.addressDetailsId;
    const persId = resolvedPers?.personalInformationId ?? resolvedPers?.PersonalInformationId;

    const unclaimedEmps = empList.filter((e) => {
      const id = getEmpId(e);
      return !id || !claimedEmploymentIds.has(Number(id));
    });

    if (unclaimedEmps.length === 0) return null;

    // 1. Exact matching address ID + unclaimed employment row
    if (addrId) {
      const matchedByAddr = unclaimedEmps.filter((e) => {
        const eAddrId = e.applicationAddressDetailsId ?? e.ApplicationAddressDetailsId ?? e.addressDetailsId ?? e.AddressDetailsId;
        return eAddrId !== undefined && eAddrId !== null && eAddrId !== '' && Number(eAddrId) === Number(addrId);
      });

      if (matchedByAddr.length === 1) {
        const chosen = matchedByAddr[0];
        const id = getEmpId(chosen);
        if (id) claimedEmploymentIds.add(Number(id));
        return chosen;
      }

      if (matchedByAddr.length > 1) {
        // Multiple employment records share the same addressId (historical corrupted state)
        // Check explicit sequence if present
        const matchedBySeq = matchedByAddr.find((e) => {
          const rawSeq = e.applicantSequence ?? e.ApplicantSequence;
          return rawSeq !== undefined && rawSeq !== null && rawSeq !== '' && Number(rawSeq) === targetSeq;
        });
        if (matchedBySeq) {
          const id = getEmpId(matchedBySeq);
          if (id) claimedEmploymentIds.add(Number(id));
          return matchedBySeq;
        }

        // Weak recovery signal: check if employerBusinessName contains or matches the person's name
        if (personName && String(personName).trim().length > 2) {
          const nameLower = String(personName).trim().toLowerCase();
          const nameParts = nameLower.split(/\s+/).filter((p) => p.length > 2);
          const matchedByName = matchedByAddr.find((e) => {
            const bizName = String(e.employerBusinessName || e.EmployerBusinessName || '').toLowerCase();
            return nameParts.some((part) => bizName.includes(part));
          });
          if (matchedByName) {
            const id = getEmpId(matchedByName);
            if (id) claimedEmploymentIds.add(Number(id));
            return matchedByName;
          }
        }

        // Stable unclaimed candidate allocation for historical corrupted data with same address ID
        const sorted = [...matchedByAddr].sort((x, y) => (Number(getEmpId(x)) || 0) - (Number(getEmpId(y)) || 0));
        const chosen = sorted[0];
        if (chosen) {
          const id = getEmpId(chosen);
          if (id) claimedEmploymentIds.add(Number(id));
          return chosen;
        }
      }

      // Explicit addressId provided but no matching employment record found.
      // Do NOT fall back to employments belonging to other addresses.
      return null;
    }

    // 2. Secondary: If addrId is missing, check explicit sequence ONLY among current application records
    const matchedBySeq = unclaimedEmps.find((e) => {
      const rawSeq = e.applicantSequence ?? e.ApplicantSequence;
      return rawSeq !== undefined && rawSeq !== null && rawSeq !== '' && Number(rawSeq) === targetSeq;
    });
    if (matchedBySeq) {
      const id = getEmpId(matchedBySeq);
      if (id) claimedEmploymentIds.add(Number(id));
      return matchedBySeq;
    }

    // 3. Match by personalInformationId if present on employment record
    if (persId) {
      const matched = unclaimedEmps.find((e) => {
        const ePersId = e.personalInformationId ?? e.PersonalInformationId;
        return ePersId !== undefined && ePersId !== null && ePersId !== '' && Number(ePersId) === Number(persId);
      });
      if (matched) {
        const id = getEmpId(matched);
        if (id) claimedEmploymentIds.add(Number(id));
        return matched;
      }
    }

    return null;
  };

  const mapEmploymentPerson = (empRow = {}, draftEmp = {}, resolvedAddrId = null) => {
    // Foreign parent ID guard: reject if empRow's applicationAddressDetailsId conflicts with resolvedAddrId
    const rowAddrId = empRow.applicationAddressDetailsId ?? empRow.ApplicationAddressDetailsId ?? empRow.addressDetailsId ?? empRow.AddressDetailsId;
    const isRowForeign = resolvedAddrId && rowAddrId && Number(rowAddrId) !== Number(resolvedAddrId);
    const effectiveEmpRow = isRowForeign ? {} : empRow;

    const rawEmpId = getEmpId(effectiveEmpRow);
    const isDraftIdClaimed = draftEmp.employmentIncomeDetailsId && claimedEmploymentIds.has(Number(draftEmp.employmentIncomeDetailsId)) && (!rawEmpId || Number(draftEmp.employmentIncomeDetailsId) !== Number(rawEmpId));
    const isDraftAddrConflicting = resolvedAddrId && draftEmp.applicationAddressDetailsId && Number(draftEmp.applicationAddressDetailsId) !== Number(resolvedAddrId);
    const isDraftSuppressedByExplicitBackend = isBackendEmpExplicit && !rawEmpId;

    const safeDraftEmp = isDraftIdClaimed || isDraftAddrConflicting || isDraftSuppressedByExplicitBackend ? {} : draftEmp;

    const employmentIncomeDetailsId =
      rawEmpId !== null && rawEmpId !== undefined && !isNaN(Number(rawEmpId)) && Number(rawEmpId) > 0
        ? Number(rawEmpId)
        : (safeDraftEmp.employmentIncomeDetailsId ?? safeDraftEmp.applicationEmploymentIncomeDetailsId ?? null);

    const applicationAddressDetailsId =
      effectiveEmpRow.applicationAddressDetailsId ??
      effectiveEmpRow.ApplicationAddressDetailsId ??
      effectiveEmpRow.addressDetailsId ??
      effectiveEmpRow.AddressDetailsId ??
      resolvedAddrId ??
      safeDraftEmp.applicationAddressDetailsId ??
      null;

    const employerBusinessName = effectiveEmpRow.employerBusinessName ?? effectiveEmpRow.EmployerBusinessName ?? effectiveEmpRow.employerName ?? effectiveEmpRow.EmployerName ?? safeDraftEmp.employerBusinessName ?? safeDraftEmp.employerName ?? '';
    const designationNatureOfBusiness = effectiveEmpRow.designationNatureOfBusiness ?? effectiveEmpRow.DesignationNatureOfBusiness ?? effectiveEmpRow.designation ?? effectiveEmpRow.Designation ?? safeDraftEmp.designationNatureOfBusiness ?? safeDraftEmp.designation ?? '';
    const employmentNature = effectiveEmpRow.employmentTypeId ?? effectiveEmpRow.EmploymentTypeId ?? effectiveEmpRow.employmentNature ?? effectiveEmpRow.EmploymentNature ?? effectiveEmpRow.employmentType ?? effectiveEmpRow.EmploymentType ?? safeDraftEmp.employmentNature ?? safeDraftEmp.employmentType ?? '';
    const qualification = effectiveEmpRow.educationId ?? effectiveEmpRow.EducationId ?? effectiveEmpRow.qualification ?? effectiveEmpRow.Qualification ?? safeDraftEmp.qualification ?? safeDraftEmp.educationId ?? '';
    const industryType = effectiveEmpRow.industryType ?? effectiveEmpRow.IndustryType ?? safeDraftEmp.industryType ?? '';
    const totalExperience = effectiveEmpRow.totalExperience ?? effectiveEmpRow.TotalExperience ?? effectiveEmpRow.totalExperienceYears ?? effectiveEmpRow.TotalExperienceYears ?? safeDraftEmp.totalExperience ?? safeDraftEmp.totalExperienceYears ?? '';
    const grossMonthlyIncome = effectiveEmpRow.grossMonthlyIncome ?? effectiveEmpRow.GrossMonthlyIncome ?? safeDraftEmp.grossMonthlyIncome ?? '';
    const otherMonthlyIncome = effectiveEmpRow.otherMonthlyIncome ?? effectiveEmpRow.OtherMonthlyIncome ?? effectiveEmpRow.otherIncomeMonthly ?? effectiveEmpRow.OtherIncomeMonthly ?? safeDraftEmp.otherMonthlyIncome ?? safeDraftEmp.otherIncomeMonthly ?? '';
    const netMonthlyIncome = effectiveEmpRow.netMonthlyIncome ?? effectiveEmpRow.NetMonthlyIncome ?? safeDraftEmp.netMonthlyIncome ?? '';
    const grossAnnualIncome = effectiveEmpRow.grossAnnualIncome ?? effectiveEmpRow.GrossAnnualIncome ?? safeDraftEmp.grossAnnualIncome ?? '';

    return {
      employmentIncomeDetailsId,
      applicationEmploymentIncomeDetailsId: employmentIncomeDetailsId,
      applicationAddressDetailsId,
      employerBusinessName,
      employerName: employerBusinessName,
      designationNatureOfBusiness,
      designation: designationNatureOfBusiness,
      employmentNature,
      employmentType: employmentNature,
      employmentTypeId: employmentNature,
      qualification,
      educationId: qualification,
      industryType,
      totalExperienceYears: totalExperience,
      totalExperience,
      grossMonthlyIncome,
      otherIncomeMonthly: otherMonthlyIncome,
      otherMonthlyIncome,
      netMonthlyIncome,
      grossAnnualIncome,
    };
  };

  const applicantAddrId = addressDetails.applicant?.applicationAddressDetailsId ?? addressDetails.applicant?.addressDetailsId;
  const applicantEmp = findEmploymentRowForSequence(0, addressDetails.applicant, applicantPers, customerName) || {};
  const coApplicantEmpsList = Array.from({ length: Number(coApplicantsCount) || 0 }, (_, idx) => {
    const coPers = coApplicantPersList[idx] || {};
    const coName = [
      coPers.firstName ?? coPers.FirstName,
      coPers.middleName ?? coPers.MiddleName,
      coPers.lastName ?? coPers.LastName
    ].filter(Boolean).join(' ') || coPers.fullName || coPers.FullName || '';
    return findEmploymentRowForSequence(idx + 1, addressDetails.coApplicants[idx], coPers, coName) || {};
  });

  const employmentIncome = {
    applicant: mapEmploymentPerson(applicantEmp, existingDraft.employmentIncome?.applicant, applicantAddrId),
    coApplicants: Array.from({ length: Number(coApplicantsCount) || 0 }, (_, idx) => {
      const coEmp = coApplicantEmpsList[idx] || {};
      const draftCo = existingDraft.employmentIncome?.coApplicants?.[idx] || {};
      const coAddrId = addressDetails.coApplicants[idx]?.applicationAddressDetailsId ?? addressDetails.coApplicants[idx]?.addressDetailsId;
      return mapEmploymentPerson(coEmp, draftCo, coAddrId);
    }),
  };

  // 6. Bank & Existing Loans Details (Sequence-Aware Relational Matching with Claimed ID Protection)
  const rawBankSource =
    backendData.bankExistingLoans ??
    backendData.BankExistingLoans ??
    backendData.applicationBankExistingLoanDetails ??
    backendData.ApplicationBankExistingLoanDetails;
  const isBackendBankExplicit = rawBankSource !== undefined && rawBankSource !== null;

  const claimedBankIds = new Set();

  const getBankId = (b) =>
    b?.applicationBankExistingLoanDetailsId ??
    b?.ApplicationBankExistingLoanDetailsId ??
    b?.bankExistingLoansId ??
    b?.id ??
    b?.Id ??
    null;

  const filterBankRowsForSequence = (targetSeq, resolvedEmp) => {
    if (!Array.isArray(bankList) || bankList.length === 0) return [];
    const empId = resolvedEmp?.applicationEmploymentIncomeDetailsId ?? resolvedEmp?.ApplicationEmploymentIncomeDetailsId ?? resolvedEmp?.employmentIncomeDetailsId;

    const unclaimedBanks = bankList.filter((b) => {
      const id = getBankId(b);
      return !id || !claimedBankIds.has(Number(id));
    });

    if (unclaimedBanks.length === 0) return [];

    // 1. Primary: Match by applicationEmploymentIncomeDetailsId
    if (empId) {
      const matched = unclaimedBanks.filter((b) => {
        const bEmpId = b.applicationEmploymentIncomeDetailsId ?? b.ApplicationEmploymentIncomeDetailsId ?? b.employmentIncomeDetailsId ?? b.EmploymentIncomeDetailsId;
        return bEmpId !== undefined && bEmpId !== null && bEmpId !== '' && Number(bEmpId) === Number(empId);
      });
      if (matched.length > 0) {
        matched.forEach((b) => {
          const id = getBankId(b);
          if (id) claimedBankIds.add(Number(id));
        });
        return matched;
      }

      // Explicit empId provided but no matching bank record found.
      // Do NOT fall back to bank rows belonging to other employments.
      return [];
    }

    // 2. Secondary: Match by applicantSequence if present
    const matchedBySeq = unclaimedBanks.filter((b) => {
      const rawSeq = b.applicantSequence ?? b.ApplicantSequence;
      return rawSeq !== undefined && rawSeq !== null && rawSeq !== '' && Number(rawSeq) === targetSeq;
    });
    if (matchedBySeq.length > 0) {
      matchedBySeq.forEach((b) => {
        const id = getBankId(b);
        if (id) claimedBankIds.add(Number(id));
      });
      return matchedBySeq;
    }

    return [];
  };

  const mapBankRecord = (b = {}, defaultHolderName = '', draftBank = {}, resolvedEmpId = null) => {
    // Foreign parent ID guard: reject if bank row's applicationEmploymentIncomeDetailsId conflicts with resolvedEmpId
    const rowEmpId = b.applicationEmploymentIncomeDetailsId ?? b.ApplicationEmploymentIncomeDetailsId ?? b.employmentIncomeDetailsId ?? b.EmploymentIncomeDetailsId;
    const isRowForeign = resolvedEmpId && rowEmpId && Number(rowEmpId) !== Number(resolvedEmpId);
    const effectiveBankRow = isRowForeign ? {} : b;

    const rawBankId = getBankId(effectiveBankRow);
    const isDraftIdClaimed = draftBank.applicationBankExistingLoanDetailsId && claimedBankIds.has(Number(draftBank.applicationBankExistingLoanDetailsId)) && (!rawBankId || Number(draftBank.applicationBankExistingLoanDetailsId) !== Number(rawBankId));
    const isDraftEmpConflicting = resolvedEmpId && draftBank.applicationEmploymentIncomeDetailsId && Number(draftBank.applicationEmploymentIncomeDetailsId) !== Number(resolvedEmpId);
    const isDraftSuppressedByExplicitBackend = isBackendBankExplicit && !rawBankId;

    const safeDraftBank = isDraftIdClaimed || isDraftEmpConflicting || isDraftSuppressedByExplicitBackend ? {} : draftBank;

    const applicationBankExistingLoanDetailsId =
      rawBankId !== null && rawBankId !== undefined && !isNaN(Number(rawBankId)) && Number(rawBankId) > 0
        ? Number(rawBankId)
        : (safeDraftBank.applicationBankExistingLoanDetailsId ?? null);

    const bankName = effectiveBankRow.bankId ?? effectiveBankRow.BankId ?? effectiveBankRow.bankName ?? effectiveBankRow.BankName ?? safeDraftBank.bankName ?? safeDraftBank.bankId ?? '';
    const bankBranch = effectiveBankRow.bankBranchId ?? effectiveBankRow.BankBranchId ?? effectiveBankRow.branch ?? effectiveBankRow.Branch ?? safeDraftBank.branch ?? safeDraftBank.bankBranchId ?? '';
    const accountNumber = effectiveBankRow.accountNumber || effectiveBankRow.AccountNumber || safeDraftBank.accountNumber || '';
    const accountHolderName = effectiveBankRow.accountHolderName || effectiveBankRow.AccountHolderName || safeDraftBank.accountHolderName || defaultHolderName || '';
    const rawLoans = effectiveBankRow.noOfActiveLoans ?? effectiveBankRow.NoOfActiveLoans ?? safeDraftBank.noOfActiveLoans;
    const noOfActiveLoans = rawLoans !== undefined && rawLoans !== null && rawLoans !== '' ? rawLoans : '';
    const rawCards = effectiveBankRow.noOfActiveCreditCards ?? effectiveBankRow.NoOfActiveCreditCards ?? safeDraftBank.noOfActiveCreditCards;
    const noOfActiveCreditCards = rawCards !== undefined && rawCards !== null && rawCards !== '' ? rawCards : '';
    const ifscCode = effectiveBankRow.ifscCode || effectiveBankRow.IfscCode || safeDraftBank.ifscCode || '';
    const accountType = effectiveBankRow.accountType || effectiveBankRow.AccountType || safeDraftBank.accountType || 'Savings';
    const isPrimaryBank = effectiveBankRow.isPrimaryBank ?? effectiveBankRow.IsPrimaryBank ?? safeDraftBank.isPrimaryBank ?? false;
    const activeLoansDetails = effectiveBankRow.activeLoansDetails || effectiveBankRow.ActiveLoansDetails || safeDraftBank.activeLoansDetails || [];

    return {
      applicationBankExistingLoanDetailsId,
      bankName,
      bankId: bankName,
      branch: bankBranch,
      bankBranchId: bankBranch,
      ifscCode,
      accountType,
      accountNumber,
      accountHolderName,
      noOfActiveLoans,
      noOfActiveCreditCards,
      isPrimaryBank,
      activeLoansDetails,
    };
  };

  const createEmptyBankRecord = (holderName = '', isPrimary = false) => ({
    applicationBankExistingLoanDetailsId: null,
    bankName: '',
    bankId: '',
    branch: '',
    bankBranchId: '',
    ifscCode: '',
    accountType: 'Savings',
    accountNumber: '',
    accountHolderName: holderName,
    noOfActiveLoans: '',
    noOfActiveCreditCards: '',
    isPrimaryBank: isPrimary,
    activeLoansDetails: [],
    activeCreditCardsDetails: [],
  });

  const applicantEmpId = employmentIncome.applicant?.applicationEmploymentIncomeDetailsId ?? employmentIncome.applicant?.employmentIncomeDetailsId;
  const applicantBankList = filterBankRowsForSequence(0, employmentIncome.applicant);
  const draftAppPrimary = existingDraft.bankExistingLoans?.applicant?.primaryBank || existingDraft.bankExistingLoans?.primaryBank || {};
  const draftAppOther = existingDraft.bankExistingLoans?.applicant?.otherBank || {};

  const primaryBankRecord =
    applicantBankList.find((b) => b.isPrimaryBank === true || b.IsPrimaryBank === true || b.isPrimary === true) ||
    (applicantBankList.length > 0 ? applicantBankList[0] : null);

  const otherBankRecord =
    applicantBankList.find(
      (b) => (b.isPrimaryBank === false || b.IsPrimaryBank === false || b.isPrimary === false) && b !== primaryBankRecord
    ) || null;

  const mappedPrimaryBank = primaryBankRecord
    ? mapBankRecord(primaryBankRecord, customerName, draftAppPrimary, applicantEmpId)
    : (!isBackendBankExplicit && draftAppPrimary.bankName ? mapBankRecord({}, customerName, draftAppPrimary, applicantEmpId) : createEmptyBankRecord(customerName, true));

  const mappedOtherBank = otherBankRecord
    ? mapBankRecord(otherBankRecord, customerName, draftAppOther, applicantEmpId)
    : (!isBackendBankExplicit && draftAppOther.bankName ? mapBankRecord({}, customerName, draftAppOther, applicantEmpId) : createEmptyBankRecord(customerName, false));

  const coApplicantBankList = Array.from({ length: Number(coApplicantsCount) || 0 }, (_, idx) => {
    const coEmp = employmentIncome.coApplicants[idx] || {};
    const coPers = coApplicantPersList[idx] || {};
    const effectiveBanks = filterBankRowsForSequence(idx + 1, coEmp);
    const coPrimary =
      effectiveBanks.find((b) => b.isPrimaryBank === true || b.IsPrimaryBank === true || b.isPrimary === true) ||
      (effectiveBanks.length > 0 ? effectiveBanks[0] : null);
    const coOther =
      effectiveBanks.find(
        (b) => (b.isPrimaryBank === false || b.IsPrimaryBank === false || b.isPrimary === false) && b !== coPrimary
      ) || null;
    const coName = [
      coPers.firstName ?? coPers.FirstName,
      coPers.middleName ?? coPers.MiddleName,
      coPers.lastName ?? coPers.LastName
    ].filter(Boolean).join(' ') || coPers.fullName || coPers.FullName || '';

    const draftCoBank = existingDraft.bankExistingLoans?.coApplicants?.[idx] || {};
    const draftCoPrimary = draftCoBank.primaryBank || {};
    const draftCoOther = draftCoBank.otherBank || {};
    const coEmpId = coEmp.applicationEmploymentIncomeDetailsId ?? coEmp.employmentIncomeDetailsId;

    return {
      primaryBank: coPrimary
        ? mapBankRecord(coPrimary, coName, draftCoPrimary, coEmpId)
        : (!isBackendBankExplicit && draftCoPrimary.bankName ? mapBankRecord({}, coName, draftCoPrimary, coEmpId) : createEmptyBankRecord(coName, true)),
      otherBank: coOther
        ? mapBankRecord(coOther, coName, draftCoOther, coEmpId)
        : (!isBackendBankExplicit && draftCoOther.bankName ? mapBankRecord({}, coName, draftCoOther, coEmpId) : createEmptyBankRecord(coName, false)),
    };
  });

  const bankExistingLoans = {
    applicant: {
      primaryBank: mappedPrimaryBank,
      otherBank: mappedOtherBank,
    },
    primaryBank: mappedPrimaryBank,
    otherBank: mappedOtherBank,
    coApplicants: coApplicantBankList,
  };

  // Final Shared-Record Collision Guard between Applicant and Co-Applicants
  const finalApplicantAddressId = addressDetails.applicant?.addressDetailsId;
  if (finalApplicantAddressId) {
    addressDetails.coApplicants.forEach((co) => {
      if (co.addressDetailsId === finalApplicantAddressId) {
        co.addressDetailsId = null;
        co.applicationAddressDetailsId = null;
      }
    });
  }

  const finalApplicantEmpId = employmentIncome.applicant?.employmentIncomeDetailsId;
  if (finalApplicantEmpId) {
    employmentIncome.coApplicants.forEach((co) => {
      if (co.employmentIncomeDetailsId === finalApplicantEmpId) {
        co.employmentIncomeDetailsId = null;
        co.applicationEmploymentIncomeDetailsId = null;
      }
    });
  }

  const finalApplicantBankIds = new Set([
    bankExistingLoans.applicant?.primaryBank?.applicationBankExistingLoanDetailsId,
    bankExistingLoans.applicant?.otherBank?.applicationBankExistingLoanDetailsId,
  ].filter(Boolean));

  if (finalApplicantBankIds.size > 0) {
    bankExistingLoans.coApplicants.forEach((co) => {
      if (co.primaryBank?.applicationBankExistingLoanDetailsId && finalApplicantBankIds.has(co.primaryBank.applicationBankExistingLoanDetailsId)) {
        co.primaryBank.applicationBankExistingLoanDetailsId = null;
      }
      if (co.otherBank?.applicationBankExistingLoanDetailsId && finalApplicantBankIds.has(co.otherBank.applicationBankExistingLoanDetailsId)) {
        co.otherBank.applicationBankExistingLoanDetailsId = null;
      }
    });
  }

  // 7. Collateral Details
  const rawColSource =
    backendData.collateral ??
    backendData.Collateral ??
    backendData.collateralDetails ??
    backendData.CollateralDetails ??
    backendData.applicationCollateralDetails ??
    backendData.ApplicationCollateralDetails;
  const isBackendCollateralExplicit = rawColSource !== undefined && rawColSource !== null;

  const prop1 = colList[0] || null;
  const prop2 = colList[1] || null;

  const createCleanProperty = () => ({
    applicationCollateralDetailsId: null,
    typeOfProperty: '',
    usage: '',
    locationAddress: '',
    estimatedValue: '',
  });

  const mapPropertyRecord = (p) => ({
    applicationCollateralDetailsId: p.applicationCollateralDetailsId || p.ApplicationCollateralDetailsId || null,
    typeOfProperty: p.typeOfProperty ?? p.propertyId ?? p.PropertyId ?? p.propertyType ?? p.PropertyType ?? '',
    usage: p.usage ?? p.propertyUsageId ?? p.PropertyUsageId ?? p.propertyUsage ?? p.PropertyUsage ?? '',
    locationAddress: p.locationAddress || p.LocationAddress || p.propertyAddress || p.PropertyAddress || '',
    estimatedValue: p.estimatedValue !== undefined && p.estimatedValue !== null
      ? p.estimatedValue
      : (p.EstimatedValue !== undefined && p.EstimatedValue !== null ? p.EstimatedValue : ''),
  });

  let collateralDetails;
  if (isBackendCollateralExplicit) {
    // Authoritative backend data: 0 rows = empty Property 1 & 2. Never resurrect existingDraft.
    collateralDetails = {
      propertyOne: prop1 ? mapPropertyRecord(prop1) : createCleanProperty(),
      propertyTwo: prop2 ? mapPropertyRecord(prop2) : createCleanProperty(),
    };
  } else {
    // Fallback only when backend explicitly omitted collateral data entirely
    const draftCol = existingDraft.collateralDetails || {};
    collateralDetails = {
      propertyOne: draftCol.propertyOne ? { ...createCleanProperty(), ...draftCol.propertyOne } : createCleanProperty(),
      propertyTwo: draftCol.propertyTwo ? { ...createCleanProperty(), ...draftCol.propertyTwo } : createCleanProperty(),
    };
  }

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

  // 9. Sourcing Details (Pure backend-derived ownership)
  const sourcing = {
    sourcingChannel,
    customerSource: resolvedCustomerSource,
    agentId: isAgentSourced ? resolvedAgentId : null,
    agentName: isAgentSourced ? agentName : '',
    agentCode: isAgentSourced ? agentCode : '',
    rmId: resolvedRmId,
    rmName: rmName || ownership.rmName || '',
    rmCode: rmCode || '',
    sourcedBy: isRmSourced ? (rmName || ownership.rmName || '') : (agentName || ownership.agentName || ''),
    employeeId: isRmSourced ? (rmCode || '') : (agentCode || ''),
    createdByRole,
    CreatedByRole: createdByRole,
    createdByUserId,
    CreatedByUserId: createdByUserId,
    createdBy,
    CreatedBy: createdBy,
  };

  // 10. Declaration & Other Sections
  const declaration = existingDraft.declaration || {
    applicantSignature: customerName,
    applicantDate: '',
    coApplicantSignature: '',
    coApplicantDate: '',
    ackApplicantName: customerName,
    ackProduct: '',
    ackReceivedBy: rmName || '',
    ackDate: '',
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
    AgentCustomerId: agentCustomerId,
    customerSource: resolvedCustomerSource,
    CustomerSource: resolvedCustomerSource,
    agentId: resolvedAgentId,
    AgentId: resolvedAgentId,
    agentName: isAgentSourced ? agentName : (ownership.agentName || ''),
    AgentName: isAgentSourced ? agentName : (ownership.agentName || ''),
    agentCode: isAgentSourced ? agentCode : '',
    AgentCode: isAgentSourced ? agentCode : '',
    rmId: resolvedRmId,
    RMId: resolvedRmId,
    rmName: rmName || ownership.rmName || '',
    RmName: rmName || ownership.rmName || '',
    RMName: rmName || ownership.rmName || '',
    rmCode: rmCode || '',
    RmCode: rmCode || '',
    RMCode: rmCode || '',
    rmCustomerId,
    RmCustomerId: rmCustomerId,
    RMCustomerId: rmCustomerId,
    createdByRole,
    CreatedByRole: createdByRole,
    createdByUserId,
    CreatedByUserId: createdByUserId,
    createdBy,
    CreatedBy: createdBy,
    customer,
    raw: {
      ...(existingDraft.raw || {}),
      customer,
      backendData,
      createdByRole,
      CreatedByRole: createdByRole,
      createdByUserId,
      CreatedByUserId: createdByUserId,
      createdBy,
      CreatedBy: createdBy,
      agentId: resolvedAgentId,
      AgentId: resolvedAgentId,
      rmId: resolvedRmId,
      RMId: resolvedRmId,
    },
    isRmSourced,
    isAgentSourced,
    customerName,
    fullName: customerName,
    mobile,
    mobileNumber: mobile,
    email,
    branch,
    status,
    rawStatus: rawStatus !== undefined ? rawStatus : (existingDraft.rawStatus ?? 0),
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
      coApplicantsCount: coApplicantsCount !== undefined && coApplicantsCount !== null ? coApplicantsCount : (personalInformation.coApplicants?.length || 0),
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

  const applicationsRef = useRef(applications);
  applicationsRef.current = applications;

  useEffect(() => {
    saveStoredApplications(applications);
  }, [applications]);

  const getApplication = useCallback((applicationId) => {
    const source = applicationsRef.current[applicationId] || APP_SEED_MAP[applicationId] || buildBlankApplication(applicationId);
    return normalizeApplicationRecord(source);
  }, []);

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
    const currentRecord = applicationsRef.current[applicationId] || APP_SEED_MAP[applicationId] || buildBlankApplication(applicationId);
    const merged = deepMergeApplicationData(currentRecord, updates);
    const normalized = normalizeApplicationRecord({
      ...merged,
      id: applicationId,
    });

    applicationsRef.current = {
      ...applicationsRef.current,
      [applicationId]: normalized,
    };

    setApplications((current) => ({
      ...current,
      [applicationId]: normalized,
    }));

    return normalized;
  }, []);

  const loadApplicationFromBackend = useCallback(async (applicationId, forceRefresh = false) => {
    if (!applicationId) return null;
    const appIdStr = String(applicationId);

    // If it's a seed or draft prefix without numeric backend ID, return local draft
    if (appIdStr.startsWith('APP-') && isNaN(Number(appIdStr.replace('APP-', '')))) {
      return getApplication(applicationId);
    }

    // De-duplicate concurrent calls for the same ID unless forcing refresh
    if (inFlightHydrations.has(appIdStr) && !forceRefresh) {
      return inFlightHydrations.get(appIdStr);
    }

    const hydrationPromise = (async () => {
      setHydratingMap((prev) => ({ ...prev, [appIdStr]: true }));
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';

      try {
        let backendResult = null;

        // 1. Try full details endpoint
        try {
          const fullRes = await fetch(`${baseUrl}/ApplicationFullDetails/${appIdStr}`);
          if (fullRes.ok) {
            const fullData = await fullRes.json();
            if (fullData) {
              backendResult = fullData;
            }
          }
        } catch (fullErr) {
          console.warn(`ApplicationFullDetails/${appIdStr} error:`, fullErr);
        }

        // 2. Fallback to AgentAddCustomer endpoint if full details is 404 or empty
        if (!backendResult) {
          const custRes = await fetch(`${baseUrl}/AgentAddCustomer/${appIdStr}`);
          if (custRes.ok) {
            const custData = await custRes.json();
            const custRecord = Array.isArray(custData) ? custData[0] : (custData?.value ? custData.value[0] : custData);
            if (custRecord) {
              backendResult = { customer: custRecord };
            }
          }
        }

        // 3. Supplement any missing section lists from individual endpoints
        if (backendResult) {
          const extractArr = (raw) => {
            if (Array.isArray(raw)) return raw;
            if (Array.isArray(raw?.value)) return raw.value;
            if (Array.isArray(raw?.data)) return raw.data;
            if (Array.isArray(raw?.items)) return raw.items;
            return [];
          };

          const hasKycs = extractArr(backendResult.kycDocuments ?? backendResult.KycDocuments ?? backendResult.applicationKYCDocuments ?? backendResult.ApplicationKYCDocuments).length > 0;
          const hasPersonal = extractArr(backendResult.personalInformation ?? backendResult.PersonalInformation ?? backendResult.applicationPersonalInformation ?? backendResult.ApplicationPersonalInformation).length > 0;
          const hasAddress = extractArr(backendResult.addressDetails ?? backendResult.AddressDetails ?? backendResult.applicationAddressDetails ?? backendResult.ApplicationAddressDetails).length > 0;
          const hasEmp = extractArr(backendResult.employmentIncome ?? backendResult.EmploymentIncome ?? backendResult.applicationEmploymentIncomeDetails ?? backendResult.ApplicationEmploymentIncomeDetails).length > 0;
          const hasBank = extractArr(backendResult.bankExistingLoans ?? backendResult.BankExistingLoans ?? backendResult.applicationBankExistingLoanDetails ?? backendResult.ApplicationBankExistingLoanDetails).length > 0;
          const hasProd = Boolean(backendResult.productDetails || backendResult.ProductDetails);
          const hasCol = extractArr(backendResult.collateral ?? backendResult.Collateral ?? backendResult.collateralDetails ?? backendResult.CollateralDetails ?? backendResult.applicationCollateralDetails ?? backendResult.ApplicationCollateralDetails).length > 0;

          if (!hasProd || !hasKycs || !hasPersonal || !hasAddress || !hasEmp || !hasBank || !hasCol) {
            const [
              prodRes,
              kycRes,
              persRes,
              addrRes,
              empRes,
              bankRes,
              colRes
            ] = await Promise.allSettled([
              !hasProd ? fetch(`${baseUrl}/ApplicationProductDetails`).then((r) => r.ok ? r.json() : null) : Promise.resolve(null),
              !hasKycs ? fetch(`${baseUrl}/ApplicationKYCDocuments`).then((r) => r.ok ? r.json() : null) : Promise.resolve(null),
              !hasPersonal ? fetch(`${baseUrl}/ApplicationPersonalInformation`).then((r) => r.ok ? r.json() : null) : Promise.resolve(null),
              !hasAddress ? fetch(`${baseUrl}/ApplicationAddressDetails`).then((r) => r.ok ? r.json() : null) : Promise.resolve(null),
              !hasEmp ? fetch(`${baseUrl}/ApplicationEmploymentIncomeDetails`).then((r) => r.ok ? r.json() : null) : Promise.resolve(null),
              !hasBank ? fetch(`${baseUrl}/ApplicationBankExistingLoanDetails`).then((r) => r.ok ? r.json() : null) : Promise.resolve(null),
              !hasCol ? fetch(`${baseUrl}/ApplicationCollateralDetails`).then((r) => r.ok ? r.json() : null) : Promise.resolve(null),
            ]);

            // Match Product if missing
            if (!hasProd && prodRes.status === 'fulfilled' && prodRes.value) {
              const allProds = extractArr(prodRes.value);
              const currentId = Number(appIdStr);
              const matched = allProds.find((p) => {
                const pAgentCustId = p.agentCustomerId ?? p.AgentCustomerId;
                if (pAgentCustId !== undefined && pAgentCustId !== null && pAgentCustId !== '') {
                  return Number(pAgentCustId) === currentId;
                }
                const pRmCustId = p.rmCustomerId ?? p.RMCustomerId ?? p.RmCustomerId;
                const custRec = backendResult.customer || {};
                const legacyCustId = custRec.rmCustomerId ?? custRec.RMCustomerId ?? custRec.RmCustomerId;
                if (pRmCustId !== undefined && pRmCustId !== null && pRmCustId !== '' &&
                    legacyCustId !== undefined && legacyCustId !== null && legacyCustId !== '') {
                  return Number(pRmCustId) === Number(legacyCustId);
                }
                return false;
              });
              if (matched) backendResult.productDetails = matched;
            }

            const effectiveProdId = backendResult.productDetails?.applicationProductDetailsId ?? backendResult.productDetails?.ApplicationProductDetailsId;

            // Match KYCs if missing
            if (!hasKycs && kycRes.status === 'fulfilled' && kycRes.value) {
              const rawKycs = extractArr(kycRes.value);
              const currentId = Number(appIdStr);
              const filteredKycs = rawKycs.filter((k) =>
                (effectiveProdId && Number(k.applicationProductDetailsId ?? k.ApplicationProductDetailsId) === Number(effectiveProdId)) ||
                (Number(k.agentCustomerId ?? k.AgentCustomerId) === currentId)
              );
              if (filteredKycs.length > 0) {
                backendResult.kycDocuments = filteredKycs;
              }
            }

            const currentKycs = extractArr(
              backendResult.kycDocuments ??
              backendResult.KycDocuments ??
              backendResult.applicationKYCDocuments ??
              backendResult.ApplicationKYCDocuments
            );
            const currentApplicationKycIds = new Set(
              currentKycs
                .map((k) => k.kycDocumentId ?? k.applicationKYCDocumentId ?? k.ApplicationKYCDocumentId)
                .filter((id) => id !== undefined && id !== null && id !== '')
                .map(Number)
            );

            if (!hasPersonal && persRes.status === 'fulfilled' && persRes.value) {
              const rawPers = extractArr(persRes.value);
              const matchedPers = currentApplicationKycIds.size > 0
                ? rawPers.filter((p) => {
                    const kycId = p.applicationKYCDocumentId ?? p.ApplicationKYCDocumentId ?? p.kycDocumentId;
                    return kycId !== undefined && kycId !== null && currentApplicationKycIds.has(Number(kycId));
                  })
                : [];
              backendResult.personalInformation = matchedPers;
            } else if (!hasPersonal) {
              backendResult.personalInformation = [];
            } else if (hasPersonal) {
              const existingPers = extractArr(
                backendResult.personalInformation ??
                backendResult.PersonalInformation ??
                backendResult.applicationPersonalInformation ??
                backendResult.ApplicationPersonalInformation
              );
              backendResult.personalInformation = currentApplicationKycIds.size > 0
                ? existingPers.filter((p) => {
                    const kycId = p.applicationKYCDocumentId ?? p.ApplicationKYCDocumentId ?? p.kycDocumentId;
                    return kycId !== undefined && kycId !== null && currentApplicationKycIds.has(Number(kycId));
                  })
                : [];
            }

            // Build current application personal information ID set
            const currentPersList = extractArr(
              backendResult.personalInformation ??
              backendResult.PersonalInformation ??
              backendResult.applicationPersonalInformation ??
              backendResult.ApplicationPersonalInformation
            );
            const currentApplicationPersonalIds = new Set(
              currentPersList
                .map((p) => p.personalInformationId ?? p.PersonalInformationId ?? p.id ?? p.Id)
                .filter((id) => id !== undefined && id !== null && id !== '')
                .map(Number)
            );

            // 1. Strict address pre-filtering by current application personalInformationIds
            let matchedAddresses = [];
            if (!hasAddress && addrRes.status === 'fulfilled' && addrRes.value) {
              const rawAddrs = extractArr(addrRes.value);
              matchedAddresses = currentApplicationPersonalIds.size > 0
                ? rawAddrs.filter((a) => {
                    const persId = a.personalInformationId ?? a.PersonalInformationId;
                    return persId !== undefined && persId !== null && currentApplicationPersonalIds.has(Number(persId));
                  })
                : [];
              backendResult.addressDetails = matchedAddresses;
            } else if (!hasAddress) {
              backendResult.addressDetails = [];
            } else if (hasAddress) {
              const existingAddrs = extractArr(
                backendResult.addressDetails ??
                backendResult.AddressDetails ??
                backendResult.applicationAddressDetails ??
                backendResult.ApplicationAddressDetails
              );
              matchedAddresses = currentApplicationPersonalIds.size > 0
                ? existingAddrs.filter((a) => {
                    const persId = a.personalInformationId ?? a.PersonalInformationId;
                    return persId !== undefined && persId !== null && currentApplicationPersonalIds.has(Number(persId));
                  })
                : [];
              backendResult.addressDetails = matchedAddresses;
            }

            // Build current application address ID set
            const currentApplicationAddressIds = new Set(
              matchedAddresses
                .map((a) => a.applicationAddressDetailsId ?? a.ApplicationAddressDetailsId ?? a.addressDetailsId ?? a.AddressDetailsId ?? a.id ?? a.Id)
                .filter((id) => id !== undefined && id !== null && id !== '')
                .map(Number)
            );

            // 2. Strict employment pre-filtering by current application address IDs
            let matchedEmployments = [];
            if (!hasEmp && empRes.status === 'fulfilled' && empRes.value) {
              const rawEmps = extractArr(empRes.value);
              matchedEmployments = currentApplicationAddressIds.size > 0
                ? rawEmps.filter((e) => {
                    const addrId = e.applicationAddressDetailsId ?? e.ApplicationAddressDetailsId ?? e.addressDetailsId ?? e.AddressDetailsId;
                    return addrId !== undefined && addrId !== null && currentApplicationAddressIds.has(Number(addrId));
                  })
                : [];
              backendResult.employmentIncome = matchedEmployments;
            } else if (!hasEmp) {
              backendResult.employmentIncome = [];
            } else if (hasEmp) {
              const existingEmps = extractArr(
                backendResult.employmentIncome ??
                backendResult.EmploymentIncome ??
                backendResult.applicationEmploymentIncomeDetails ??
                backendResult.ApplicationEmploymentIncomeDetails
              );
              matchedEmployments = currentApplicationAddressIds.size > 0
                ? existingEmps.filter((e) => {
                    const addrId = e.applicationAddressDetailsId ?? e.ApplicationAddressDetailsId ?? e.addressDetailsId ?? e.AddressDetailsId;
                    return addrId !== undefined && addrId !== null && currentApplicationAddressIds.has(Number(addrId));
                  })
                : [];
              backendResult.employmentIncome = matchedEmployments;
            }

            // Build current application employment ID set
            const currentApplicationEmploymentIds = new Set(
              matchedEmployments
                .map((e) => e.applicationEmploymentIncomeDetailsId ?? e.ApplicationEmploymentIncomeDetailsId ?? e.employmentIncomeDetailsId ?? e.EmploymentIncomeDetailsId ?? e.id ?? e.Id)
                .filter((id) => id !== undefined && id !== null && id !== '')
                .map(Number)
            );

            // 3. Strict bank pre-filtering by current application employment IDs
            if (!hasBank && bankRes.status === 'fulfilled' && bankRes.value) {
              const rawBanks = extractArr(bankRes.value);
              const matchedBanks = currentApplicationEmploymentIds.size > 0
                ? rawBanks.filter((b) => {
                    const empId = b.applicationEmploymentIncomeDetailsId ?? b.ApplicationEmploymentIncomeDetailsId ?? b.employmentIncomeDetailsId ?? b.EmploymentIncomeDetailsId;
                    return empId !== undefined && empId !== null && currentApplicationEmploymentIds.has(Number(empId));
                  })
                : [];
              backendResult.bankExistingLoans = matchedBanks;
            } else if (!hasBank) {
              backendResult.bankExistingLoans = [];
            } else if (hasBank) {
              const existingBanks = extractArr(
                backendResult.bankExistingLoans ??
                backendResult.BankExistingLoans ??
                backendResult.applicationBankExistingLoanDetails ??
                backendResult.ApplicationBankExistingLoanDetails
              );
              backendResult.bankExistingLoans = currentApplicationEmploymentIds.size > 0
                ? existingBanks.filter((b) => {
                    const empId = b.applicationEmploymentIncomeDetailsId ?? b.ApplicationEmploymentIncomeDetailsId ?? b.employmentIncomeDetailsId ?? b.EmploymentIncomeDetailsId;
                    return empId !== undefined && empId !== null && currentApplicationEmploymentIds.has(Number(empId));
                  })
                : [];
            }

            if (!hasCol && colRes.status === 'fulfilled' && colRes.value) {
              const rawCols = extractArr(colRes.value);
              const matchedCols = effectiveProdId
                ? rawCols.filter((c) => Number(c.applicationProductDetailsId ?? c.ApplicationProductDetailsId) === Number(effectiveProdId))
                : [];
              backendResult.collateralDetails = matchedCols;
            } else if (!hasCol) {
              backendResult.collateralDetails = [];
            } else if (hasCol) {
              const existingCols = extractArr(
                backendResult.collateral ??
                backendResult.Collateral ??
                backendResult.collateralDetails ??
                backendResult.CollateralDetails ??
                backendResult.applicationCollateralDetails ??
                backendResult.ApplicationCollateralDetails
              );
              backendResult.collateralDetails = effectiveProdId
                ? existingCols.filter((c) => Number(c.applicationProductDetailsId ?? c.ApplicationProductDetailsId) === Number(effectiveProdId))
                : [];
            }
          }
        }

        if (backendResult) {
          const currentDraft = applicationsRef.current[appIdStr] || getApplication(appIdStr);
          const mapped = mapBackendToApplication(backendResult, currentDraft);
          applicationsRef.current = {
            ...applicationsRef.current,
            [appIdStr]: mapped,
          };
          setApplications((prev) => ({
            ...prev,
            [appIdStr]: mapped,
          }));
          return mapped;
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
  }, [getApplication]);

  const createApplicationDraft = useCallback(() => {
    const nextId = generateApplicationNumber(applicationsRef.current);

    setApplications((current) => ({
      ...current,
      [nextId]: normalizeApplicationRecord({
        ...buildBlankApplication(nextId),
        id: nextId,
        applicationNumber: nextId,
      }),
    }));

    return nextId;
  }, []);

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
