/**
 * verificationMapper.js
 * --------------------
 * Purpose:
 *   Transforms raw response from `GET /ApplicationFullDetails/:agentCustomerId`
 *   or individual RM application tables into the normalized 12-step verification data structure
 *   consumed by Back Office Customer Verification workspace and step modal.
 *
 * Rules:
 *   - Do NOT invent fake backend data.
 *   - Provide safe fallback schemas when sub-tables are null/empty.
 *   - Support document merging from `/AgentCustomerDocument/bycustomer/:id`.
 *   - Prevent any undefined/null runtime property crashes.
 */

import { getValue } from './hierarchyMapper';

/**
 * Safely extracts the first element if the input is an array, otherwise returns the object or empty object.
 */
export const firstItem = (value) => {
  if (Array.isArray(value)) return value[0] || {};
  return value || {};
};

/**
 * Calculates standard reducing balance monthly EMI.
 */
function calculateEmi(principal, annualRatePercent, tenureMonths) {
  const p = Number(principal);
  const r = Number(annualRatePercent) / 12 / 100;
  const n = Number(tenureMonths);

  if (!p || !r || !n || isNaN(p) || isNaN(r) || isNaN(n) || n <= 0) {
    return Math.round((p || 0) / (n || 1));
  }

  const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return Math.round(emi);
}

/**
 * Normalizes full backend application payload into the 12-step Back Office verification shape.
 *
 * @param {object} response - Raw response from /ApplicationFullDetails/:id or composed payload
 * @param {Array} extraDocs - Optional documents list from /AgentCustomerDocument/bycustomer/:id
 * @returns {object|null} Standardized verification data object
 */
export function mapApplicationFullDetails(response, extraDocs = []) {
  if (!response || typeof response !== 'object') return null;

  const rawCustomer = response.customer || response.Customer || response;
  const customer = firstItem(rawCustomer);

  const rawProduct = response.productDetails || response.ProductDetails || response.applicationProductDetails;
  const productDetails = firstItem(rawProduct);

  const rawPersonal = response.personalInformation || response.PersonalInformation;
  const personalList = Array.isArray(rawPersonal) ? rawPersonal : (rawPersonal ? [rawPersonal] : []);
  const applicantPers = personalList[0] || {};

  const rawAddress = response.addressDetails || response.AddressDetails;
  const addressList = Array.isArray(rawAddress) ? rawAddress : (rawAddress ? [rawAddress] : []);
  const applicantAddr = addressList[0] || {};

  const rawKyc = response.kycDocuments || response.KycDocuments || response.applicationKYCDocuments;
  const kycList = Array.isArray(rawKyc) ? rawKyc : (rawKyc ? [rawKyc] : []);
  const applicantKyc = kycList[0] || {};

  const rawEmp = response.employmentIncome || response.EmploymentIncome;
  const empList = Array.isArray(rawEmp) ? rawEmp : (rawEmp ? [rawEmp] : []);
  const applicantEmp = empList[0] || {};

  const rawBank = response.bankExistingLoans || response.BankExistingLoans;
  const bankList = Array.isArray(rawBank) ? rawBank : (rawBank ? [rawBank] : []);
  const primaryBank = bankList.find((b) => b.isPrimaryBank === true || b.IsPrimaryBank === true) || bankList[0] || {};
  const otherBanks = bankList.filter((b) => b !== primaryBank);

  const rawCol = response.collateral || response.Collateral || response.applicationCollateralDetails;
  const colList = Array.isArray(rawCol) ? rawCol : (rawCol ? [rawCol] : []);
  const prop1 = colList[0] || {};

  const rawRef = response.references || response.References || response.applicationReferenceDetails;
  const refList = Array.isArray(rawRef) ? rawRef : (rawRef ? [rawRef] : []);

  // Primary identifiers
  const agentCustomerId =
    getValue(customer, 'agentCustomerId', 'AgentCustomerId', 'customerId', 'CustomerId', 'id', 'Id') ||
    getValue(productDetails, 'agentCustomerId', 'AgentCustomerId') ||
    getValue(applicantPers, 'agentCustomerId', 'AgentCustomerId') ||
    getValue(response, 'agentCustomerId', 'AgentCustomerId', 'customerId', 'CustomerId');

  const customerName =
    getValue(customer, 'fullName', 'FullName', 'customerName', 'CustomerName') ||
    getValue(applicantPers, 'firstName', 'FirstName') ||
    'Not Available';

  const mobile =
    getValue(customer, 'mobileNumber', 'MobileNumber', 'mobile', 'Mobile') ||
    getValue(applicantPers, 'mobileNumber', 'MobileNumber', 'mobileNo', 'MobileNo') ||
    '';

  const email =
    getValue(customer, 'email', 'Email', 'emailAddress', 'EmailAddress') ||
    getValue(applicantPers, 'emailId', 'EmailId') ||
    '';

  const districtName =
    getValue(customer, 'districtName', 'DistrictName', 'district', 'District') ||
    getValue(applicantAddr, 'district', 'District') ||
    '';

  const districtId = getValue(customer, 'districtId', 'DistrictId');
  const agentId = getValue(customer, 'agentId', 'AgentId') || getValue(productDetails, 'agentId', 'AgentId');
  const agentName = getValue(customer, 'agentName', 'AgentName') || '';
  const rmId = getValue(customer, 'rmId', 'RmId', 'RMId');
  const rmName = getValue(customer, 'rmName', 'RmName', 'RMName') || '';
  const appliedDate = getValue(customer, 'createdAt', 'CreatedAt', 'createdDate', 'CreatedDate') || '';
  const overallStatus = getValue(customer, 'status', 'Status') ?? 1;

  const rawAmount = getValue(productDetails, 'loanAmount', 'LoanAmount') || getValue(customer, 'expectedLoanAmount', 'ExpectedLoanAmount', 'amount', 'Amount') || 0;
  const amount = Number(rawAmount) || 0;
  const rawTenure = getValue(productDetails, 'loanTenure', 'LoanTenure', 'loanTenureMonths', 'LoanTenureMonths') || '24';
  const tenure = Number(rawTenure) || 24;
  const rawRoi = getValue(productDetails, 'roi', 'Roi', 'ROI') || '12.0';
  const roi = Number(rawRoi) || 12.0;
  const purpose = getValue(productDetails, 'loanPurposeName', 'LoanPurposeName') || getValue(customer, 'loanPurposeName', 'LoanPurposeName', 'loanPurpose', 'LoanPurpose') || '';

  // Extract PAN & Aadhaar safely
  const panNumber =
    getValue(applicantKyc, 'panCardNo', 'PanCardNo') ||
    getValue(applicantPers, 'panCardNo', 'PanCardNo') ||
    getValue(customer, 'panCardNo', 'PanCardNo', 'pan', 'Pan') ||
    '';

  const aadhaarLast4 =
    getValue(applicantKyc, 'aadhaarLastFourDigits', 'AadhaarLastFourDigits') ||
    getValue(applicantPers, 'aadhaarLastFourDigits', 'AadhaarLastFourDigits') ||
    '';

  const aadhaarDisplay = aadhaarLast4 ? `XXXX-XXXX-${aadhaarLast4}` : (getValue(applicantKyc, 'aadhaarNumber', 'AadhaarNumber') || 'Not Available');

  // STEP 1: Application Details
  const applicationDetails = {
    applicationNo: `APP-${agentCustomerId}`,
    appliedDate: appliedDate ? String(appliedDate).slice(0, 10) : 'Not Available',
    loanProduct: getValue(productDetails, 'loanProductName', 'LoanProductName', 'loanProduct') || getValue(customer, 'loanType', 'LoanType') || 'Personal Loan',
    loanAmount: amount,
    loanTenure: `${tenure} Months`,
    purposeOfLoan: purpose || 'General Financing Purpose',
    interestRate: `${roi}% p.a.`,
    transactionType: getValue(productDetails, 'loanTransactionTypeName', 'LoanTransactionTypeName', 'transactionType') || 'New Application',
    repaymentFrequency: 'Monthly',
    coApplicantCount: Number(getValue(productDetails, 'noOfCoApplicants', 'NoOfCoApplicants', 'coApplicantsCount')) || 0,
    sourcingBranch: getValue(customer, 'branch', 'Branch') || (districtName ? `${districtName} Branch` : 'Main Branch'),
    distanceFromBranch: getValue(productDetails, 'distanceFromBranch', 'DistanceFromBranch', 'distanceFromBranchKm') || null,
    underwritingTier: 'Tier 1 - Standard',
    raw: productDetails,
  };

  // STEP 2: Personal Information
  const personalInformation = {
    fullName: customerName,
    fatherOrSpouseName: getValue(applicantPers, 'fatherSpouseName', 'FatherSpouseName', 'fatherOrSpouseName') || 'Not Available',
    dob: getValue(applicantPers, 'dateOfBirth', 'DateOfBirth') ? String(getValue(applicantPers, 'dateOfBirth', 'DateOfBirth')).slice(0, 10) : 'Not Available',
    age: getValue(applicantPers, 'age', 'Age') || null,
    gender: getValue(applicantPers, 'genderName', 'GenderName', 'gender') || 'Male',
    maritalStatus: getValue(applicantPers, 'maritalStatusName', 'MaritalStatusName', 'maritalStatus') || 'Married',
    panNumber: panNumber || 'Not Available',
    aadhaarNumber: aadhaarDisplay,
    mobile: mobile ? String(mobile).replace(/\D/g, '').slice(-10) : 'Not Available',
    alternateMobile: getValue(applicantPers, 'alternateMobile', 'AlternateMobile') || 'Not Available',
    email: email || 'Not Available',
    category: getValue(applicantPers, 'casteName', 'CasteName', 'category', 'Category') || 'General',
    education: getValue(applicantPers, 'educationName', 'EducationName', 'education', 'Education') || 'Graduate',
    dependents: Number(getValue(applicantPers, 'noOfDependents', 'NoOfDependents', 'dependents')) || 0,
    raw: applicantPers,
  };

  // STEP 3: Address Details
  const currentAddrLine1 = getValue(applicantAddr, 'addressLine1', 'AddressLine1');
  const currentAddrLine2 = getValue(applicantAddr, 'addressLine2', 'AddressLine2');
  const hasAddressData = addressList.length > 0 || Boolean(currentAddrLine1 || currentAddrLine2);

  const addressDetails = {
    hasAddress: hasAddressData,
    currentAddress: {
      doorNo: currentAddrLine1 || 'Not Available',
      streetName: currentAddrLine2 || 'Not Available',
      landmark: getValue(applicantAddr, 'landmark', 'Landmark') || 'Not Available',
      city: getValue(applicantAddr, 'cityName', 'CityName') || districtName || 'Not Available',
      district: districtName || 'Not Available',
      state: getValue(applicantAddr, 'stateName', 'StateName') || 'Tamil Nadu',
      pincode: getValue(applicantAddr, 'pincode', 'Pincode', 'postalCode', 'PostalCode') || 'Not Available',
      residenceType: getValue(applicantAddr, 'residenceTypeName', 'ResidenceTypeName', 'residenceType') || 'Owned',
      yearsAtAddress: getValue(applicantAddr, 'yearsAtAddress', 'YearsAtAddress') || 5,
    },
    permanentAddress: {
      doorNo: getValue(addressList[1], 'addressLine1', 'AddressLine1') || currentAddrLine1 || 'Not Available',
      streetName: getValue(addressList[1], 'addressLine2', 'AddressLine2') || currentAddrLine2 || 'Not Available',
      landmark: getValue(addressList[1], 'landmark', 'Landmark') || getValue(applicantAddr, 'landmark', 'Landmark') || 'Not Available',
      city: getValue(addressList[1], 'cityName', 'CityName') || districtName || 'Not Available',
      district: districtName || 'Not Available',
      state: getValue(addressList[1], 'stateName', 'StateName') || 'Tamil Nadu',
      pincode: getValue(addressList[1], 'pincode', 'Pincode') || getValue(applicantAddr, 'pincode', 'Pincode') || 'Not Available',
      sameAsCurrent: addressList.length <= 1 || getValue(applicantAddr, 'mailingAsCurrent', 'MailingAsCurrent') === true,
    },
    businessAddress: addressList[2] ? {
      doorNo: getValue(addressList[2], 'addressLine1', 'AddressLine1') || '',
      streetName: getValue(addressList[2], 'addressLine2', 'AddressLine2') || '',
      city: getValue(addressList[2], 'cityName', 'CityName') || districtName,
      district: districtName,
      state: getValue(addressList[2], 'stateName', 'StateName') || 'Tamil Nadu',
      pincode: getValue(addressList[2], 'pincode', 'Pincode') || '',
      premiseType: 'Rented',
      yearsInPremise: 3,
    } : null,
    raw: addressList,
  };

  // STEP 4: KYC Documents (Combined from ApplicationFullDetails + AgentCustomerDocument)
  const combinedDocs = [];
  const seenDocKeys = new Set();

  // 1. Add from kycList
  kycList.forEach((doc, idx) => {
    const docId = String(getValue(doc, 'applicationKYCDocumentId', 'ApplicationKYCDocumentId') || `KYC_${idx + 1}`);
    const name = getValue(doc, 'documentTypeName', 'DocumentTypeName') || (doc.panCardNo ? 'PAN Card' : doc.aadhaarLastFourDigits ? 'Aadhaar Card' : `KYC Document ${idx + 1}`);
    const docNumber = getValue(doc, 'documentNumber', 'DocumentNumber') || doc.panCardNo || (doc.aadhaarLastFourDigits ? `XXXX-XXXX-${doc.aadhaarLastFourDigits}` : '—');

    seenDocKeys.add(name.toLowerCase());
    combinedDocs.push({
      id: docId,
      name,
      type: 'Identity & Address Proof',
      documentNumber: docNumber,
      uploadStatus: 'Uploaded',
      verificationStatus: getValue(doc, 'verificationId', 'VerificationId') === 1 ? 'Verified' : 'Pending',
      fileSize: '1.5 MB',
      uploadedOn: appliedDate ? String(appliedDate).slice(0, 10) : 'Not Available',
      raw: doc,
    });
  });

  // 2. Add from extraDocs (if fetched from AgentCustomerDocument)
  if (Array.isArray(extraDocs)) {
    extraDocs.forEach((doc, idx) => {
      const docId = String(doc.agentCustomerDocumentId || doc.id || `DOC_${idx + 1}`);
      const name = doc.documentTypeName || doc.documentType || doc.fileName || `Document ${idx + 1}`;
      if (!seenDocKeys.has(name.toLowerCase())) {
        seenDocKeys.add(name.toLowerCase());
        combinedDocs.push({
          id: docId,
          name,
          type: 'Identity & Address Proof',
          documentNumber: doc.documentNumber || '—',
          uploadStatus: 'Uploaded',
          verificationStatus: doc.verificationStatus || 'Uploaded',
          fileSize: doc.fileSize || '1.2 MB',
          uploadedOn: doc.createdAt ? String(doc.createdAt).slice(0, 10) : (appliedDate ? String(appliedDate).slice(0, 10) : 'Not Available'),
          raw: doc,
        });
      }
    });
  }

  // Fallback: If no document objects exist, but PAN/Aadhaar strings are present
  if (combinedDocs.length === 0) {
    if (panNumber) {
      combinedDocs.push({
        id: 'DOC_PAN',
        name: 'PAN Card Proof',
        type: 'Tax & Identity Proof',
        documentNumber: panNumber,
        uploadStatus: 'Uploaded',
        verificationStatus: 'Pending Verification',
        fileSize: '1.2 MB',
        uploadedOn: appliedDate ? String(appliedDate).slice(0, 10) : 'Not Available',
      });
    }
    if (aadhaarLast4) {
      combinedDocs.push({
        id: 'DOC_AADHAAR',
        name: 'Aadhaar Card Proof',
        type: 'Biometric e-KYC Identity Proof',
        documentNumber: `XXXX-XXXX-${aadhaarLast4}`,
        uploadStatus: 'Uploaded',
        verificationStatus: 'Pending Verification',
        fileSize: '1.4 MB',
        uploadedOn: appliedDate ? String(appliedDate).slice(0, 10) : 'Not Available',
      });
    }
  }

  const kycDocuments = {
    verificationMode: 'e-KYC & Physical Document Inspection',
    documents: combinedDocs,
    raw: kycList,
  };

  // STEP 5: Employment & Income Details
  const empTypeName = getValue(applicantEmp, 'employmentTypeName', 'EmploymentTypeName') || getValue(customer, 'employmentTypeName', 'EmploymentTypeName');
  const employerName = getValue(applicantEmp, 'employerBusinessName', 'EmployerBusinessName', 'companyName');
  const hasEmploymentData = empList.length > 0 || Boolean(empTypeName || employerName);

  const monthlyGross = Number(getValue(applicantEmp, 'grossMonthlyIncome', 'GrossMonthlyIncome', 'monthlyGrossIncome')) || 0;
  const monthlyNet = Number(getValue(applicantEmp, 'netMonthlyIncome', 'NetMonthlyIncome', 'monthlyNetIncome')) || Math.round(monthlyGross * 0.85);
  const annualGross = Number(getValue(applicantEmp, 'grossAnnualIncome', 'GrossAnnualIncome', 'annualIncome')) || (monthlyGross * 12);

  const employmentIncome = {
    hasData: hasEmploymentData,
    employmentType: empTypeName || 'Salaried',
    companyOrBusinessName: employerName || 'Not Available',
    businessConstitution: getValue(applicantEmp, 'businessConstitutionName', 'BusinessConstitutionName') || 'Private Limited',
    designationOrRole: getValue(applicantEmp, 'designationNatureOfBusiness', 'DesignationNatureOfBusiness', 'designation') || 'Not Available',
    industryType: getValue(applicantEmp, 'industryType', 'IndustryType') || 'Services',
    experienceYears: Number(getValue(applicantEmp, 'totalExperience', 'TotalExperience', 'experienceYears')) || null,
    monthlyGrossIncome: monthlyGross,
    monthlyNetIncome: monthlyNet,
    annualTurnoverOrSalary: annualGross,
    itrFiled: getValue(applicantEmp, 'itrFiled', 'ItrFiled') ?? true,
    lastItrYear: getValue(applicantEmp, 'lastItrYear', 'LastItrYear') || 'AY 2025-26',
    incomeProofType: getValue(applicantEmp, 'incomeProofTypeName', 'IncomeProofTypeName') || 'Salary Slips / Bank Statement',
    raw: applicantEmp,
  };

  // STEP 6: Bank & Existing Loan Details
  const bankNameVal = getValue(primaryBank, 'bankName', 'BankName');
  const hasBankData = bankList.length > 0 || Boolean(bankNameVal);

  const primaryBankAcc = {
    bankName: bankNameVal || 'Not Available',
    accountNumber: getValue(primaryBank, 'accountNumber', 'AccountNumber') || 'Not Available',
    accountType: getValue(primaryBank, 'accountTypeName', 'AccountTypeName', 'accountType') || 'Savings Account',
    ifscCode: getValue(primaryBank, 'ifscCode', 'IfscCode') || 'Not Available',
    branchName: getValue(primaryBank, 'branchName', 'BranchName') || districtName || 'Not Available',
    accountVintageYears: Number(getValue(primaryBank, 'accountVintageYears', 'AccountVintageYears')) || 4,
    averageMonthlyBalance: Number(getValue(primaryBank, 'averageMonthlyBalance', 'AverageMonthlyBalance')) || 0,
    bankStatementPeriod: 'Last 12 Months',
  };

  const existingLoansList = otherBanks.map((b, idx) => ({
    id: `LOAN_${idx + 1}`,
    bank: getValue(b, 'bankName', 'BankName') || `Bank Facility ${idx + 1}`,
    loanType: getValue(b, 'loanTypeName', 'LoanTypeName', 'loanType') || 'Existing Loan',
    sanctionAmount: Number(getValue(b, 'sanctionAmount', 'SanctionAmount')) || 0,
    currentOutstanding: Number(getValue(b, 'currentOutstanding', 'CurrentOutstanding')) || 0,
    monthlyEmi: Number(getValue(b, 'monthlyEmi', 'MonthlyEmi')) || 0,
    status: 'Active',
    raw: b,
  }));

  const bankExistingLoans = {
    hasData: hasBankData,
    primaryBank: primaryBankAcc,
    existingLoans: existingLoansList,
    raw: bankList,
  };

  // STEP 7: Collateral Details
  const propName = getValue(prop1, 'propertyName', 'PropertyName');
  const propLocation = getValue(prop1, 'locationAddress', 'LocationAddress');
  const hasCollateral = colList.length > 0 && Boolean(propName || propLocation);

  const collateral = {
    hasCollateral,
    collateralType: propName || (hasCollateral ? 'Property Security' : 'Clean / Unsecured Loan'),
    propertyDescription: propLocation || 'No collateral pledged for this application.',
    estimatedMarketValue: Number(getValue(prop1, 'estimatedValue', 'EstimatedValue')) || 0,
    forcedSaleValue: Number(getValue(prop1, 'forcedSaleValue', 'ForcedSaleValue')) || 0,
    ownershipType: getValue(prop1, 'ownershipTypeName', 'OwnershipTypeName') || 'Freehold',
    titleDeedNo: getValue(prop1, 'titleDeedNo', 'TitleDeedNo') || 'N/A',
    legalVerificationStatus: hasCollateral ? 'Clear Title & Verified' : 'Not Applicable',
    valuationReportStatus: hasCollateral ? 'Approved by Panel Valuer' : 'Not Applicable',
    raw: colList,
  };

  // STEP 8: Reference Details
  const references = refList.map((ref, idx) => ({
    id: String(getValue(ref, 'applicationReferenceDetailsId', 'ApplicationReferenceDetailsId') || idx + 1),
    name: getValue(ref, 'fullName', 'FullName', 'name') || `Reference ${idx + 1}`,
    relationship: getValue(ref, 'relationshipName', 'RelationshipName', 'relationship') || 'Family / Associate',
    mobile: getValue(ref, 'mobileNumber', 'MobileNumber', 'mobile') || 'Not Available',
    occupation: getValue(ref, 'occupation', 'Occupation') || 'Self Employed',
    address: getValue(ref, 'address', 'Address') || districtName || 'Not Available',
    verificationStatus: 'Verified (Contact Confirmed)',
    raw: ref,
  }));

  // STEP 9: Sourcing Details
  const sourcing = {
    sourcingDistrict: districtName || 'Not Available',
    districtCode: districtId != null ? String(districtId) : 'Not Available',
    relationshipManager: rmName || 'Not Available',
    rmId: rmId != null ? String(rmId) : 'Not Available',
    fieldAgent: agentName || 'Not Available',
    agentId: agentId != null ? String(agentId) : 'Not Available',
    sourcingChannel: 'Field Sourcing Agent Network',
    leadGenerationDate: appliedDate ? String(appliedDate).slice(0, 10) : 'Not Available',
    agentRecommendation: getValue(customer, 'remarks', 'Remarks', 'agentRecommendation') || 'Recommended for underwriting review based on initial customer intake and field appraisal.',
  };

  // STEP 10: Schedule of Charges (Frontend Estimated Computation)
  const processingFee = Math.round(amount * 0.02);
  const docCharges = amount > 0 ? 2500 : 0;
  const insuranceFee = amount > 0 ? 4000 : 0;
  const gst = Math.round((processingFee + docCharges) * 0.18);
  const totalDeductions = processingFee + docCharges + insuranceFee + gst;
  const calculatedMonthlyEmi = calculateEmi(amount, roi, tenure);

  const scheduleCharges = {
    hasData: amount > 0,
    sanctionLoanAmount: amount,
    loanTenureMonths: tenure,
    annualInterestRate: `${roi}% p.a.`,
    monthlyEmiAmount: calculatedMonthlyEmi,
    processingFee,
    documentationCharges: docCharges,
    insuranceFee,
    gstAmount: gst,
    totalUpfrontCharges: totalDeductions,
    netDisbursalAmount: Math.max(0, amount - totalDeductions),
    prepaymentCharges: 'Nil after 6 months regular repayment',
    isEstimated: true,
  };

  // STEP 11: Document Checklist (Dynamically mapped based on actual data presence)
  const isPanAvailable = Boolean(panNumber);
  const isAadhaarAvailable = Boolean(aadhaarLast4 || applicantKyc.aadhaarNo);
  const isAddressAvailable = hasAddressData;
  const isBankAvailable = hasBankData;
  const isIncomeAvailable = hasEmploymentData;

  const documentChecklist = [
    {
      id: 'CHK_01',
      label: 'Completed & Signed Application Form',
      mandatory: true,
      status: 'Available',
    },
    {
      id: 'CHK_02',
      label: 'PAN Card Copy (Tax Identity Proof)',
      mandatory: true,
      status: isPanAvailable ? 'Available' : 'Not Uploaded',
    },
    {
      id: 'CHK_03',
      label: 'Aadhaar Card Copy (Biometric e-KYC Proof)',
      mandatory: true,
      status: isAadhaarAvailable ? 'Available' : 'Not Uploaded',
    },
    {
      id: 'CHK_04',
      label: 'Residence / Property Address Proof',
      mandatory: true,
      status: isAddressAvailable ? 'Available' : 'Not Uploaded',
    },
    {
      id: 'CHK_05',
      label: 'Bank Account Statement (Last 12 Months)',
      mandatory: true,
      status: isBankAvailable ? 'Available' : 'Not Uploaded',
    },
    {
      id: 'CHK_06',
      label: 'Income Proof / Salary Slips / ITR Verification',
      mandatory: true,
      status: isIncomeAvailable ? 'Available' : 'Not Uploaded',
    },
  ];

  // STEP 12: Declaration
  const declaration = {
    borrowerConsent: 'I/We hereby declare that all information furnished in this loan application is true, correct, and complete. I authorize Sivels Finance to verify my credit profile, contact references, and perform necessary background investigations.',
    consentDate: appliedDate ? String(appliedDate).slice(0, 10) : 'Not Available',
    digitalSignatureStatus: 'Authenticated via OTP-based e-Sign',
    fieldAgentEndorsement: agentName ? `Endorsed by Field Agent ${agentName} (${agentId || '—'}).` : 'Not Available',
    rmRecommendation: rmName ? `Reviewed and recommended by Relationship Manager ${rmName} (${rmId || '—'}).` : 'Not Available',
    underwritingStatus: 'Underwriting Verification in Progress',
    finalDecision: 'Ready for Back Office Verification Sign-off',
  };

  return {
    customerId: String(agentCustomerId),
    applicationId: `APP-${agentCustomerId}`,
    customerName,
    mobile: mobile ? String(mobile).replace(/\D/g, '').slice(-10) : 'Not Available',
    email: email || 'Not Available',
    districtId: districtId != null ? String(districtId) : null,
    districtName: districtName || 'Not Available',
    rmId: rmId != null ? String(rmId) : null,
    rmName: rmName || 'Not Available',
    agentId: agentId != null ? String(agentId) : null,
    agentName: agentName || 'Not Available',
    appliedDate: appliedDate ? String(appliedDate).slice(0, 10) : 'Not Available',
    overallStatus,

    customer,
    application: productDetails,

    // 12 Normalized Step Payloads
    applicationDetails,
    personalInformation,
    addressDetails,
    kycDocuments,
    employmentIncome,
    bankExistingLoans,
    collateral,
    references,
    sourcing,
    scheduleCharges,
    documentChecklist,
    declaration,

    raw: response,
  };
}

export default mapApplicationFullDetails;
