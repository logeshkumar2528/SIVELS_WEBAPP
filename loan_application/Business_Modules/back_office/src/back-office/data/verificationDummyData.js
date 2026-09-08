/**
 * verificationDummyData.js
 * --------------------
 * Single source of truth for Back Office customer application verification data.
 * Structured to represent the EXACT 12 steps from the RM New Application Wizard.
 *
 * Architecture:
 * - Centralized store ready for future API replacement (e.g. getVerificationData(customerId) -> API call)
 * - Contains rich underwriting details, PAN/Aadhaar status, CIBIL metrics, banking, collateral, sourcing, charges, checklist, and declaration.
 */

import { BACK_OFFICE_DATA } from './backOfficeDummyData';

/**
 * Exact 12 Application Steps from RM Application Wizard
 */
export const VERIFICATION_STEP_DEFINITIONS = [
  { id: 'application-details', number: 1, name: 'Application Details', shortName: 'Application', description: 'Loan product, requested amount, tenure, and purpose' },
  { id: 'personal-information', number: 2, name: 'Personal Information', shortName: 'Personal', description: 'Borrower demographics, contact, PAN and Aadhaar identity' },
  { id: 'address-details', number: 3, name: 'Address Details', shortName: 'Address', description: 'Current residence, permanent address, and residence vintage' },
  { id: 'kyc-documents', number: 4, name: 'KYC Documents', shortName: 'KYC', description: 'Aadhaar front/back, PAN card, photo, and signature proofs' },
  { id: 'employment-income', number: 5, name: 'Employment & Income Details', shortName: 'Employment', description: 'Occupation, business/employer profile, and income proofs' },
  { id: 'bank-existing-loans', number: 6, name: 'Bank / Existing Loan Details', shortName: 'Banking & CIBIL', description: 'Bank accounts, obligations, credit bureau and CIBIL rating' },
  { id: 'collateral', number: 7, name: 'Collateral Details', shortName: 'Collateral', description: 'Security assets, property documents, and valuation report' },
  { id: 'references', number: 8, name: 'Reference Details', shortName: 'References', description: 'Family and professional references verification' },
  { id: 'sourcing', number: 9, name: 'Sourcing Details', shortName: 'Sourcing', description: 'District, Relationship Manager, and Field Agent channel' },
  { id: 'schedule-charges', number: 10, name: 'Schedule of Charges', shortName: 'Charges', description: 'Processing fees, stamp duty, insurance, and net disbursal' },
  { id: 'document-checklist', number: 11, name: 'Document Checklist', shortName: 'Checklist', description: 'Mandatory document checklist verification' },
  { id: 'declaration', number: 12, name: 'Declaration', shortName: 'Declaration', description: 'Borrower consent, agent endorsement, and underwriter sign-off' },
];

/**
 * Detailed step data template generator based on customer record
 */
function createCustomerStepData(customer) {
  const isBusiness = (customer.loanType || '').toLowerCase().includes('business');
  const amount = customer.amount || 450000;
  const tenureMonths = isBusiness ? 36 : 24;
  const interestRate = isBusiness ? 14.5 : 12.0;
  const monthlyRate = interestRate / 12 / 100;
  const emi = Math.round((amount * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / (Math.pow(1 + monthlyRate, tenureMonths) - 1));
  const processingFee = Math.round(amount * 0.02);
  const docCharges = 2500;
  const insuranceFee = 4200;
  const gst = Math.round((processingFee + docCharges) * 0.18);
  const totalDeductions = processingFee + docCharges + insuranceFee + gst;
  const netDisbursal = amount - totalDeductions;

  return {
    customerId: customer.id,
    applicationId: customer.applicationNo || `SIV-2026-${customer.id.replace(/\D/g, '').padStart(4, '0')}`,
    customerName: customer.customerName,
    mobile: customer.mobile,
    email: customer.email,
    districtId: customer.districtId,
    districtName: customer.districtName,
    rmId: customer.rmId,
    rmName: customer.rmName,
    agentId: customer.agentId,
    agentName: customer.agentName,
    appliedDate: customer.appliedDate,
    overallStatus: customer.status,

    // Step 1: Application Details
    applicationDetails: {
      applicationNo: customer.applicationNo,
      appliedDate: customer.appliedDate,
      loanProduct: customer.loanType,
      loanAmount: amount,
      loanTenure: `${tenureMonths} Months`,
      purposeOfLoan: customer.purpose || (isBusiness ? 'Working Capital & Inventory Purchase' : 'Home Renovation & Family Expenses'),
      interestRate: `${interestRate}% p.a.`,
      transactionType: 'New Application',
      repaymentFrequency: 'Monthly',
      coApplicantCount: isBusiness ? 1 : 0,
      sourcingBranch: `${customer.districtName} Main Branch`,
      underwritingTier: 'Tier 1 - Standard',
    },

    // Step 2: Personal Information
    personalInformation: {
      fullName: customer.customerName,
      fatherOrSpouseName: isBusiness ? 'K. Swaminathan (Father)' : 'S. Narayanan (Father)',
      dob: isBusiness ? '1988-06-15' : '1992-09-22',
      age: isBusiness ? 37 : 33,
      gender: 'Male',
      maritalStatus: 'Married',
      panNumber: 'ABCDE1234F',
      aadhaarNumber: 'XXXX-XXXX-8921',
      mobile: customer.mobile,
      alternateMobile: '9443219876',
      email: customer.email,
      category: 'General',
      education: 'Graduate / B.Com',
      dependents: 3,
      panVerification: {
        panNumber: 'ABCDE1234F',
        holderName: customer.customerName,
        status: 'Active',
        nameMatch: true,
        category: 'Individual',
        verified: true,
        verificationDate: customer.appliedDate,
      },
    },

    // Step 3: Address Details
    addressDetails: {
      currentAddress: {
        doorNo: '14/B, Ground Floor',
        streetName: 'West Masi Street, Simmakkal',
        landmark: 'Near Meenakshi Temple North Gate',
        city: customer.districtName,
        district: customer.districtName,
        state: 'Tamil Nadu',
        pincode: '625001',
        residenceType: 'Owned (Self)',
        yearsAtAddress: 8,
      },
      permanentAddress: {
        doorNo: '14/B, Ground Floor',
        streetName: 'West Masi Street, Simmakkal',
        landmark: 'Near Meenakshi Temple North Gate',
        city: customer.districtName,
        district: customer.districtName,
        state: 'Tamil Nadu',
        pincode: '625001',
        sameAsCurrent: true,
      },
      businessAddress: isBusiness ? {
        doorNo: '204, Commercial Complex',
        streetName: 'Bypass Road, Ponmeni',
        city: customer.districtName,
        district: customer.districtName,
        state: 'Tamil Nadu',
        pincode: '625016',
        premiseType: 'Rented',
        yearsInPremise: 5,
      } : null,
    },

    // Step 4: KYC Documents
    kycDocuments: {
      verificationMode: 'e-KYC & Physical Document Inspection',
      documents: [
        {
          id: 'DOC_AADHAAR_FRONT',
          name: 'Aadhaar Card (Front)',
          type: 'Identity & Address Proof',
          documentNumber: 'XXXX-XXXX-8921',
          uploadStatus: 'Uploaded',
          verificationStatus: 'Verified',
          fileSize: '1.8 MB',
          uploadedOn: customer.appliedDate,
        },
        {
          id: 'DOC_AADHAAR_BACK',
          name: 'Aadhaar Card (Back)',
          type: 'Address Verification',
          documentNumber: 'XXXX-XXXX-8921',
          uploadStatus: 'Uploaded',
          verificationStatus: 'Verified',
          fileSize: '1.6 MB',
          uploadedOn: customer.appliedDate,
        },
        {
          id: 'DOC_PAN',
          name: 'PAN Card',
          type: 'Tax & Identity Proof',
          documentNumber: 'ABCDE1234F',
          uploadStatus: 'Uploaded',
          verificationStatus: 'Verified',
          fileSize: '1.2 MB',
          uploadedOn: customer.appliedDate,
        },
        {
          id: 'DOC_PHOTO',
          name: 'Applicant Passport Photo',
          type: 'Biometric & Photo ID',
          documentNumber: 'IMG-202603-0891',
          uploadStatus: 'Uploaded',
          verificationStatus: 'Verified',
          fileSize: '850 KB',
          uploadedOn: customer.appliedDate,
        },
      ],
    },

    // Step 5: Employment & Income Details
    employmentIncome: {
      employmentType: customer.employmentType || (isBusiness ? 'Self Employed' : 'Salaried'),
      companyOrBusinessName: isBusiness ? 'Swaminathan Enterprises & Traders' : 'TVS Mobility Logistics Ltd',
      businessConstitution: isBusiness ? 'Sole Proprietorship' : 'Private Limited Company',
      designationOrRole: isBusiness ? 'Managing Proprietor' : 'Senior Operations Lead',
      industryType: isBusiness ? 'Wholesale & Retail Trading' : 'Logistics & Supply Chain',
      experienceYears: 9,
      monthlyGrossIncome: isBusiness ? 85000 : 65000,
      monthlyNetIncome: isBusiness ? 72000 : 58000,
      annualTurnoverOrSalary: isBusiness ? 1850000 : 780000,
      itrFiled: true,
      lastItrYear: 'AY 2025-26',
      incomeProofType: isBusiness ? 'GST Returns & 1 Year Bank Statement' : '3 Months Salary Slips & Form 16',
    },

    // Step 6: Bank / Existing Loan Details & CIBIL Bureau
    bankExistingLoans: {
      primaryBank: {
        bankName: 'State Bank of India',
        accountNumber: '•••• •••• 4519',
        accountType: isBusiness ? 'Current Account' : 'Savings Account',
        ifscCode: 'SBIN0000872',
        branchName: `${customer.districtName} Main`,
        accountVintageYears: 6,
        averageMonthlyBalance: isBusiness ? 148500 : 42000,
        bankStatementPeriod: 'Last 12 Months',
      },
      cibilBureau: {
        score: customer.cibilScore || 742,
        rating: 'GOOD',
        scoreRange: '300 - 900',
        reportDate: customer.appliedDate,
        totalActiveLoans: 2,
        totalClosedLoans: 3,
        activeCreditCards: 1,
        totalOutstandingAmount: 345000,
        currentMonthlyEmiObligation: 14200,
        paymentHistoryPercentage: '100% On-Time',
        creditUtilizationRatio: '24%',
        noOfOverdueAccounts: 0,
        delinquencyLast30Days: 0,
        bureauInquiriesLast6Months: 1,
      },
      existingLoans: [
        {
          bank: 'HDFC Bank',
          loanType: 'Two Wheeler Loan',
          sanctionAmount: 95000,
          currentOutstanding: 28000,
          monthlyEmi: 3200,
          status: 'Active (Regular)',
        },
        {
          bank: 'Canara Bank',
          loanType: 'Business Credit Line',
          sanctionAmount: 300000,
          currentOutstanding: 145000,
          monthlyEmi: 11000,
          status: 'Active (Regular)',
        },
      ],
    },

    // Step 7: Collateral Details
    collateral: {
      collateralType: isBusiness ? 'Commercial / Residential Property Security' : 'Clean / Unsecured Loan Guarantee',
      hasCollateral: isBusiness,
      propertyDescription: isBusiness ? '2-Storey Commercial Plot & Building at Door No. 14, West Masi Street' : 'N/A (Personal Loan - Unsecured Sourcing)',
      estimatedMarketValue: isBusiness ? 2400000 : 0,
      forcedSaleValue: isBusiness ? 1900000 : 0,
      ownershipType: isBusiness ? 'Freehold Sole Ownership' : 'N/A',
      titleDeedNo: isBusiness ? 'DOC-TN-MDU-2018-09182' : 'N/A',
      legalVerificationStatus: isBusiness ? 'Clear Title & Non-Encumbered' : 'Not Required',
      valuationReportStatus: isBusiness ? 'Verified by Panel Valuer' : 'Not Required',
    },

    // Step 8: Reference Details
    references: [
      {
        id: 'REF_01',
        name: 'S. Shanmugam',
        relationship: 'Elder Brother / Co-family',
        mobile: '9841998811',
        occupation: 'Business Owner',
        address: `Door No. 18, North Veli Street, ${customer.districtName}`,
        verificationStatus: 'Verified (Contact Confirmed)',
      },
      {
        id: 'REF_02',
        name: 'R. Veeramani',
        relationship: 'Trade Partner / Supplier Reference',
        mobile: '9841887722',
        occupation: 'Proprietor, Sri Meenakshi Hardware',
        address: `Door No. 42, Goods Shed Street, ${customer.districtName}`,
        verificationStatus: 'Verified (Positive Feedback)',
      },
    ],

    // Step 9: Sourcing Details
    sourcing: {
      sourcingDistrict: customer.districtName,
      districtCode: customer.districtId,
      relationshipManager: customer.rmName,
      rmId: customer.rmId,
      fieldAgent: customer.agentName,
      agentId: customer.agentId,
      sourcingChannel: 'Field Sourcing Agent Network',
      leadGenerationDate: customer.appliedDate,
      agentRecommendation: 'Borrower has good local reputation, established business track record, and clean credit history. Highly recommended for loan sanction.',
    },

    // Step 10: Schedule of Charges
    scheduleCharges: {
      sanctionLoanAmount: amount,
      loanTenureMonths: tenureMonths,
      annualInterestRate: `${interestRate}% p.a.`,
      monthlyEmiAmount: emi,
      processingFee: processingFee,
      documentationCharges: docCharges,
      insuranceFee: insuranceFee,
      gstAmount: gst,
      totalUpfrontCharges: totalDeductions,
      netDisbursalAmount: netDisbursal,
      prepaymentCharges: 'Nil after 6 months regular repayment',
    },

    // Step 11: Document Checklist
    documentChecklist: [
      { id: 'CHK_01', label: 'Completed & Signed Application Form', mandatory: true, status: 'Verified' },
      { id: 'CHK_02', label: 'PAN Card Copy (Active & Name Matched)', mandatory: true, status: 'Verified' },
      { id: 'CHK_03', label: 'Aadhaar Card Copy (Front & Back e-KYC)', mandatory: true, status: 'Verified' },
      { id: 'CHK_04', label: 'Residence / Address Proof (EB Bill / Tax Receipt)', mandatory: true, status: 'Verified' },
      { id: 'CHK_05', label: 'Bank Account Statement (Last 12 Months)', mandatory: true, status: 'Verified' },
      { id: 'CHK_06', label: 'Income Proof (ITR V / 3 Months Salary Slips)', mandatory: true, status: 'Verified' },
      { id: 'CHK_07', label: 'Business Registration / Shop Act License', mandatory: isBusiness, status: isBusiness ? 'Verified' : 'N/A' },
      { id: 'CHK_08', label: 'Property / Collateral Ownership Title Deeds', mandatory: isBusiness, status: isBusiness ? 'Verified' : 'N/A' },
      { id: 'CHK_09', label: 'Applicant & Co-Applicant Passport Photos', mandatory: true, status: 'Verified' },
      { id: 'CHK_10', label: 'Field Verification & Contact Confirmation Report', mandatory: true, status: 'Verified' },
    ],

    // Step 12: Declaration
    declaration: {
      borrowerConsent: 'I/We hereby declare that all information furnished in this loan application is true, correct, and complete. I authorize Sivels Finance to verify my credit profile, contact references, and perform necessary background investigations.',
      consentDate: customer.appliedDate,
      digitalSignatureStatus: 'Authenticated via OTP-based e-Sign',
      fieldAgentEndorsement: `Endorsed by Field Agent ${customer.agentName} (${customer.agentId}) on ${customer.appliedDate}.`,
      rmRecommendation: `Reviewed and recommended by Relationship Manager ${customer.rmName} (${customer.rmId}).`,
      underwritingStatus: 'Underwriting Verification in Progress',
      finalDecision: 'Ready for Back Office Verification Sign-off',
    },
  };
}

/**
 * Generate rich Bureau & CIBIL Credit Report for a customer
 */
function createCreditBureauReport(customer) {
  const pan = 'ABCDE1234F';
  const score = customer.cibilScore || 742;
  const rating = score >= 750 ? 'EXCELLENT' : score >= 700 ? 'GOOD' : score >= 650 ? 'AVERAGE' : 'POOR';

  return {
    customerId: customer.id,
    customerName: customer.customerName,
    panNumber: pan,
    bureauName: 'TransUnion CIBIL & Experian Credit Information',
    reportId: `CIR-2026-${customer.id.replace(/\D/g, '').padStart(4, '0')}89`,
    reportDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    reportTimestamp: 'Just Now',
    creditScore: score,
    scoreRating: rating,
    scoreRange: '300 - 900',
    creditVintage: '8 Years Credit History',
    reportStatus: 'Successfully Retrieved & Verified',

    // Summary Metric KPIs
    summaryMetrics: {
      activeLoansCount: 2,
      closedLoansCount: 3,
      creditCardsCount: 2,
      totalCreditCardLimit: 350000,
      totalOutstandingAmount: 345000,
      monthlyEmiObligation: 32700,
      paymentHistoryPercentage: '98% On-Time',
      zeroDefaultsNote: '0 Major Defaults',
    },

    // Active Loan Accounts
    activeLoans: [
      {
        id: 'ACT_01',
        loanType: 'Personal Loan',
        lender: 'HDFC Bank',
        originalAmount: 500000,
        outstanding: 210000,
        emi: 12500,
        status: 'Active',
      },
      {
        id: 'ACT_02',
        loanType: 'Vehicle Loan',
        lender: 'ICICI Bank',
        originalAmount: 800000,
        outstanding: 135000,
        emi: 20200,
        status: 'Active',
      },
    ],

    // Closed Loan Accounts
    closedLoans: [
      {
        id: 'CLS_01',
        loanType: 'Home Improvement Loan',
        lender: 'Axis Bank',
        loanAmount: 300000,
        closedDate: '15 Mar 2024',
        paymentRecord: 'Closed Successfully',
      },
      {
        id: 'CLS_02',
        loanType: 'Consumer Durable Loan',
        lender: 'Bajaj Finance',
        loanAmount: 800000,
        loanAmountFormatted: '₹80,000',
        closedDate: '10 Jan 2023',
        paymentRecord: 'Closed Successfully',
      },
      {
        id: 'CLS_03',
        loanType: 'Education Loan',
        lender: 'SBI',
        loanAmount: 250000,
        closedDate: '20 Aug 2022',
        paymentRecord: 'Closed Successfully',
      },
    ],

    // Credit Card Facilities
    creditCards: [
      {
        id: 'CC_01',
        cardName: 'HDFC Credit Card',
        lender: 'HDFC Bank',
        creditLimit: 200000,
        currentOutstanding: 45000,
        utilizationPercent: 22,
        status: 'Active',
      },
      {
        id: 'CC_02',
        cardName: 'ICICI Credit Card',
        lender: 'ICICI Bank',
        creditLimit: 150000,
        currentOutstanding: 25000,
        utilizationPercent: 16,
        status: 'Active',
      },
    ],

    // Credit Utilization
    creditUtilization: {
      totalLimit: 350000,
      usedCredit: 70000,
      availableCredit: 280000,
      utilizationPercent: 20,
    },

    // Repayment Behaviour
    repaymentBehaviour: {
      onTimePayments: '98%',
      delayedPayments: '2%',
      currentDpd: '0 Days',
      maximumDpd: '15 Days',
      recentDefaults: 'None',
    },

    // Underwriting Risk Insight
    underwritingAssessment: {
      riskAssessment: 'LOW',
      recommendedDecision: 'Eligible for Further Underwriting Review',
      highlights: [
        { type: 'check', text: 'Strong repayment history' },
        { type: 'check', text: 'Healthy credit utilization' },
        { type: 'check', text: 'No major recent defaults' },
        { type: 'check', text: 'Stable active credit exposure' },
        { type: 'warning', text: 'Existing monthly EMI obligations should be considered' },
      ],
    },
  };
}

/**
 * Pre-populated cache of detailed verification data
 */
const VERIFICATION_DATA_CACHE = {};
const CREDIT_REPORT_CACHE = {};

/**
 * Initialize verification data for all known customers
 */
export function initializeVerificationData() {
  const customers = BACK_OFFICE_DATA.customers || [];
  customers.forEach((c) => {
    VERIFICATION_DATA_CACHE[c.id] = createCustomerStepData(c);
    CREDIT_REPORT_CACHE[c.id] = createCreditBureauReport(c);
  });
}

// Ensure cache is populated on module load
initializeVerificationData();

/**
 * Retrieve verification data for a specific customer.
 * Supports known customers or dynamically generates for any valid customer ID.
 *
 * @param {string} customerId
 * @returns {object|null}
 */
export function getVerificationData(customerId) {
  if (!customerId) return null;

  if (VERIFICATION_DATA_CACHE[customerId]) {
    return VERIFICATION_DATA_CACHE[customerId];
  }

  // Look up customer in base dummy data
  const baseCustomer = (BACK_OFFICE_DATA.customers || []).find((c) => c.id === customerId);
  if (baseCustomer) {
    const generated = createCustomerStepData(baseCustomer);
    VERIFICATION_DATA_CACHE[customerId] = generated;
    return generated;
  }

  return null;
}

/**
 * Retrieve comprehensive Credit Bureau & CIBIL Report for a customer.
 *
 * @param {string} customerId
 * @returns {object|null}
 */
export function getCreditReport(customerId) {
  if (!customerId) return null;

  if (CREDIT_REPORT_CACHE[customerId]) {
    return CREDIT_REPORT_CACHE[customerId];
  }

  const baseCustomer = (BACK_OFFICE_DATA.customers || []).find((c) => c.id === customerId);
  if (baseCustomer) {
    const report = createCreditBureauReport(baseCustomer);
    CREDIT_REPORT_CACHE[customerId] = report;
    return report;
  }

  // Default fallback report if customer is generated dynamically
  const fallback = {
    id: customerId,
    customerName: 'Customer',
    cibilScore: 742,
  };
  const generatedReport = createCreditBureauReport(fallback);
  CREDIT_REPORT_CACHE[customerId] = generatedReport;
  return generatedReport;
}
