import { AlertTriangle, ArrowLeft, ChevronRight, FileText, Save, Send, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import backOfficeService from '../../../../../back_office/src/back-office/api/backOfficeService';
import { mapApplicationFullDetails } from '../../../../../back_office/src/back-office/mappers/verificationMapper';
import approvalDocumentService from '../../../../../../Core/src/features/approval-documents/services/approvalDocumentService';
import { buildApplicationRoute, ROUTES } from '../../../config/routeConfig';
import { useOperationsApplication } from '../../../context/OperationsApplicationContext';
import OperationsLayout from '../../../layouts/OperationsLayout';
import { mastersLookupService } from '../../../services/mastersLookupService';
import './LoanBasicDetails.css';

const WORKFLOW_STEPS = [
  { id: 'loan-basic-details', label: 'Loan Basic Details', active: true, route: ROUTES.MAKER_LOAN_BASIC_DETAILS },
  { id: 'fees', label: 'Fees', route: ROUTES.MAKER_FEES },
  { id: 'covenants', label: 'Covenants', route: ROUTES.MAKER_COVENANTS },
  { id: 'mandate-details', label: 'Mandate Details', route: ROUTES.MAKER_MANDATE_DETAILS },
  { id: 'cheque-details', label: 'Cheque Details', route: ROUTES.MAKER_CHEQUE_DETAILS },
];

const INITIAL_FORM = {
  division: '',
  currency: '',
  applicationNumber: '',
  customerName: '',
  loanStartDate: '',
  loanReferenceNumber: '',
  interestCapsBasis: '',
  applicationRequestCode: '',
  branch: '',
  product: '',
  disbursementAmount: '',
  netLoanAmount: '',
  totalDisbursements: '',
  repaymentMode: '',
  salesExecutive: '',
  sourcingType: '',
  employeeName: '',
  loanPurpose: '',
  dsaDma: '',
  salesManager: '',
  salesDepartment: '',
  loanFlagId: '',
  loanAmount: '',
  installmentCount: '',
  interestRateType: '',
  allowBpi: false,
  baseRate: '',
  scheduleMethod: '',
  interestFrequency: '',
  interestReviewFrequency: '',
  capitalizationFrequency: '',
  repaymentFrequency: '',
  maturityDate: '',
  bpiTreatment: '',
  interestRate: '',
  margin: '',
  nextInterestFrequencyDate: '',
  nextInterestReviewFrequencyDate: '',
  nextCapitalizationFrequencyDate: '',
  nextPaymentFrequencyDate: '',
  penaltyApplicable: false,
  includeGraceDaysInPenaltyCalculation: false,
  penaltyType: '',
  chargeCalculatedOn: '',
  penaltyRate: '',
  gracePeriodDays: '',
  allowWaivers: false,
  maximumWaiverPercentage: '',
};

const EMPTY_OPTIONS = [];

const INITIAL_AUTO_FILL_IDS = {
  customerId: null,
  loanTypeId: null,
  loanProductId: null,
  branchId: null,
  loanPurposeId: null,
};

const AUTO_FILL_FIELDS = [
  'customerName',
  'product',
  'loanAmount',
  'loanReferenceNumber',
  'branch',
  'applicationRequestCode',
  'applicationNumber',
  'loanPurpose',
  'interestRate',
];

const PLACEHOLDER_VALUES = new Set(['', 'n/a', 'na', 'nil', 'not available', 'null', 'undefined', '—', '-']);
const CUSTOMER_IDENTITY_WARNING = 'Customer details mismatch detected. Please contact the administrator for verification.';

function readValue(record, ...keys) {
  if (!record || typeof record !== 'object') return null;
  for (const key of keys) {
    const value = record[key];
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && PLACEHOLDER_VALUES.has(value.trim().toLowerCase())) continue;
    if (String(value).trim() === '') continue;
    return value;
  }
  return null;
}

function firstRecord(value) {
  return Array.isArray(value) ? value[0] || null : value || null;
}

function productRecords(raw) {
  const wrapper = firstRecord(
    raw?.productDetails ||
      raw?.ProductDetails ||
      raw?.productDetailsList ||
      raw?.ProductDetailsList ||
      raw?.applicationProductDetails ||
      raw?.ApplicationProductDetails
  );
  return { wrapper, record: firstRecord(wrapper?.product || wrapper?.Product) || wrapper };
}

function recordsFor(raw, ...keys) {
  for (const key of keys) {
    const value = raw?.[key];
    if (value === undefined || value === null) continue;
    return Array.isArray(value) ? value : [value];
  }
  return [];
}

function sameIdentifier(left, right) {
  if (left === undefined || left === null || right === undefined || right === null) return false;
  return String(left).trim() === String(right).trim();
}

function comparableName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function getVerifiedPrimaryApplicant(raw, expectedApplicationProductDetailsId) {
  if (!expectedApplicationProductDetailsId) return null;

  const personalRecords = recordsFor(raw, 'personalInformation', 'PersonalInformation');
  const kycRecords = recordsFor(
    raw,
    'kycDocuments',
    'KycDocuments',
    'applicationKYCDocuments',
    'ApplicationKYCDocuments'
  );
  const primaryKyc = kycRecords.find((kyc) => (
    sameIdentifier(
      readValue(kyc, 'applicationProductDetailsId', 'ApplicationProductDetailsId'),
      expectedApplicationProductDetailsId
    )
    && String(readValue(kyc, 'applicantSequence', 'ApplicantSequence')) === '0'
  ));

  if (!primaryKyc) return null;

  const primaryKycDocumentId = readValue(primaryKyc, 'applicationKYCDocumentId', 'ApplicationKYCDocumentId');
  const primaryApplicant = personalRecords.find((personal) => {
    const personalKycDocumentId = readValue(personal, 'applicationKYCDocumentId', 'ApplicationKYCDocumentId');
    const personalApplicationProductDetailsId = readValue(
      personal,
      'applicationProductDetailsId',
      'ApplicationProductDetailsId'
    );
    const personalApplicantSequence = readValue(personal, 'applicantSequence', 'ApplicantSequence');

    return sameIdentifier(personalKycDocumentId, primaryKycDocumentId)
      && (personalApplicationProductDetailsId == null
        || sameIdentifier(personalApplicationProductDetailsId, expectedApplicationProductDetailsId))
      && (personalApplicantSequence == null || String(personalApplicantSequence) === '0');
  });

  if (!primaryApplicant) return null;

  const name = [
    readValue(primaryApplicant, 'firstName', 'FirstName'),
    readValue(primaryApplicant, 'middleName', 'MiddleName'),
    readValue(primaryApplicant, 'lastName', 'LastName'),
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return name ? { name, applicationKYCDocumentId: primaryKycDocumentId } : null;
}

function dateInputValue(value) {
  if (value === undefined || value === null || String(value).trim() === '') return '';
  const text = String(value).trim();
  const datePart = text.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (datePart) return `${datePart[1]}-${datePart[2]}-${datePart[3]}`;

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return '';
  return [parsed.getFullYear(), String(parsed.getMonth() + 1).padStart(2, '0'), String(parsed.getDate()).padStart(2, '0')].join('-');
}

function finiteNumber(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

const SECTIONS = [
  {
    id: 'key-details',
    title: 'Key Details',
    fields: [
      { name: 'division', label: 'Division', type: 'select', required: true, optionsKey: 'divisions' },
       { name: 'product', label: 'Loan Type', type: 'select', required: true, readOnly: true },
      { name: 'currency', label: 'Currency', type: 'select', required: true, optionsKey: 'currencies' },
       { name: 'customerName', label: 'Customer', type: 'select', required: true, readOnly: true },
      { name: 'loanStartDate', label: 'Loan Start Date', type: 'date', required: true },
      { name: 'disbursementAmount', label: 'First Disbursement Amount', type: 'number', required: true },
       { name: 'loanAmount', label: 'Loan Amount', type: 'number', required: true, readOnly: true },
       { name: 'loanReferenceNumber', label: 'Loan Reference No.', type: 'text', required: true, readOnly: true },
      { name: 'interestCapsBasis', label: 'Interest Days Basis', type: 'select', required: true, optionsKey: 'dayBases' },
       { name: 'branch', label: 'Loan Branch', type: 'select', required: true, readOnly: true },
       { name: 'applicationRequestCode', label: 'Application Request Date', type: 'date', readOnly: true },
      { name: 'netLoanAmount', label: 'Net Loan Amount', type: 'number', required: true },
      { name: 'totalDisbursements', label: 'Total Disbursements', type: 'number' },
    ],
  },
  {
    id: 'quick-disbursement',
    title: 'Quick Disbursement / Loan Information',
    fields: [
      { name: 'repaymentMode', label: 'Payment Method', type: 'select', required: true, optionsKey: 'paymentMethods' },
      { name: 'salesExecutive', label: 'Sales Executive', type: 'select' },
      { name: 'sourcingType', label: 'Sourcing Type', type: 'select', required: true },
      { name: 'employeeName', label: 'Employee Name', type: 'select' },
       { name: 'loanPurpose', label: 'Loan Purpose', type: 'select', required: true, readOnly: true },
      { name: 'dsaDma', label: 'DSA / DMA', type: 'select' },
      { name: 'salesManager', label: 'Sales Manager', type: 'select' },
      { name: 'salesDepartment', label: 'Sales Department', type: 'select' },
       { name: 'applicationNumber', label: 'Application Number', type: 'text', required: true, readOnly: true },
      {
        name: 'loanFlagId',
        label: 'Loan Flag',
        type: 'radio-group',
        optionsKey: 'loanFlags',
        fullWidth: true,
      },
    ],
  },
  {
    id: 'payment-details',
    title: 'Payment Details',
    fields: [
      { name: 'installmentCount', label: 'Number of Installments', type: 'number', required: true },
      { name: 'interestRateType', label: 'Interest Rate Type', type: 'select', required: true },
      { name: 'allowBpi', label: 'Allow BPI', type: 'checkbox' },
      { name: 'baseRate', label: 'Base Rate (%)', type: 'number' },
      { name: 'scheduleMethod', label: 'Schedule Method', type: 'select', required: true },
      { name: 'interestFrequency', label: 'Interest Frequency', type: 'select', required: true, optionsKey: 'frequencies' },
      {
        name: 'interestReviewFrequency',
        label: 'Interest Review Frequency',
        type: 'select',
        required: true,
        optionsKey: 'frequencies',
      },
      {
        name: 'capitalizationFrequency',
        label: 'Capitalization Frequency',
        type: 'select',
        required: true,
        optionsKey: 'frequencies',
      },
      {
        name: 'repaymentFrequency',
        label: 'Payment Frequency',
        type: 'select',
        required: true,
        optionsKey: 'frequencies',
      },
      { name: 'maturityDate', label: 'Maturity Date', type: 'date', required: true },
      { name: 'bpiTreatment', label: 'BPI Treatment', type: 'select', required: true },
       { name: 'interestRate', label: 'Actual Interest Rate (%)', type: 'number', required: true, readOnly: true },
      { name: 'margin', label: 'Margin (%)', type: 'number' },
      { name: 'nextInterestFrequencyDate', label: 'Next Interest Frequency Date', type: 'date' },
      { name: 'nextInterestReviewFrequencyDate', label: 'Next Interest Review Frequency Date', type: 'date' },
      { name: 'nextCapitalizationFrequencyDate', label: 'Next Capitalization Frequency Date', type: 'date' },
      { name: 'nextPaymentFrequencyDate', label: 'Next Payment Frequency Date', type: 'date' },
    ],
  },
  {
    id: 'overdue-penalty-details',
    title: 'Overdue Penalty Details',
    fields: [
      { name: 'penaltyApplicable', label: 'Apply Overdue Penalty', type: 'checkbox' },
      { name: 'includeGraceDaysInPenaltyCalculation', label: 'Include Grace Days in Penalty Calculation', type: 'checkbox' },
      { name: 'allowWaivers', label: 'Allow Waivers', type: 'checkbox' },
      { name: 'penaltyType', label: 'Charge Type', type: 'select', required: true },
      { name: 'gracePeriodDays', label: 'Grace Days', type: 'number', required: true },
      { name: 'chargeCalculatedOn', label: 'Charge Calculated On', type: 'select', required: true },
      { name: 'penaltyRate', label: 'Charge Amount / %', type: 'number', required: true },
      { name: 'maximumWaiverPercentage', label: 'Max Waiver %', type: 'number' },
    ],
  },
];

function Field({ field, value, onChange, options = EMPTY_OPTIONS }) {
  if (field.type === 'radio-group') {
    const selected = value == null ? '' : String(value);

    return (
      <fieldset
        className={[
          'operations-loan-checkbox-group',
          field.fullWidth ? 'operations-loan-field--full' : '',
        ]
          .join(' ')
          .trim()}
      >
        <legend className="operations-loan-field-label">
          {field.label}
          {field.required && <span className="operations-loan-required">*</span>}
        </legend>
        <div className="operations-loan-checkbox-group-options">
          {options.length ? (
            options.map((option) => (
              <label key={option.value} className="operations-loan-checkbox-field">
                <input
                  type="radio"
                  name={field.name}
                  value={option.value}
                  checked={selected === String(option.value)}
                  onChange={(event) => onChange(field.name, event.target.value)}
                />
                <span>{option.label}</span>
              </label>
            ))
          ) : (
            <span className="operations-loan-options-empty">No loan flags available</span>
          )}
        </div>
      </fieldset>
    );
  }

  if (field.type === 'checkbox') {
    return (
      <div className="operations-loan-field operations-loan-field--checkbox">
        <span className="operations-loan-field-label operations-loan-field-label--spacer" aria-hidden="true">
          &nbsp;
        </span>
        <label className="operations-loan-checkbox-control">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => onChange(field.name, event.target.checked)}
          />
          <span>{field.label}</span>
        </label>
      </div>
    );
  }

  if (field.type === 'radio') {
    return (
      <fieldset className="operations-loan-radio-field">
        <legend>{field.label}</legend>
        <label>
          <input
            type="radio"
            name={field.name}
            value="yes"
            checked={value === 'yes'}
            onChange={(event) => onChange(field.name, event.target.value)}
          />
          Yes
        </label>
        <label>
          <input
            type="radio"
            name={field.name}
            value="no"
            checked={value === 'no'}
            onChange={(event) => onChange(field.name, event.target.value)}
          />
          No
        </label>
      </fieldset>
    );
  }

  return (
    <label className="operations-loan-field">
      <span className="operations-loan-field-label">
        {field.label}
        {field.required && <span className="operations-loan-required">*</span>}
      </span>
      {field.readOnly ? (
        <input
          className="operations-loan-control"
          type={field.type === 'select' ? 'text' : field.type}
          value={value == null ? '' : value}
          readOnly
          aria-readonly="true"
        />
      ) : field.type === 'select' ? (
        <select
          className="operations-loan-control"
          value={value}
          onChange={(event) => onChange(field.name, event.target.value)}
        >
          <option value="">Select</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          className="operations-loan-control"
          type={field.type}
          value={value}
          onChange={(event) => onChange(field.name, event.target.value)}
        />
      )}
    </label>
  );
}

export default function LoanBasicDetails() {
  const navigate = useNavigate();
  const { applicationId, application } = useOperationsApplication();
  const [form, setForm] = useState(INITIAL_FORM);
  const autoFillIdsRef = useRef(INITIAL_AUTO_FILL_IDS);
  const [applicationDataState, setApplicationDataState] = useState({
    loading: false,
    error: '',
    unavailable: [],
    identityWarning: '',
  });
  const [autoFillRequest, setAutoFillRequest] = useState(0);
  const previousApplicationIdRef = useRef(null);
  const requestSequenceRef = useRef(0);
  const [masterOptions, setMasterOptions] = useState({
    divisions: [],
    paymentMethods: [],
    frequencies: [],
    loanFlags: [],
    currencies: [],
    dayBases: [],
  });

  useEffect(() => {
    let isMounted = true;

    const loadMasters = async () => {
      const [divisions, paymentMethods, frequencies, loanFlags, currencies, dayBases] = await Promise.all([
        mastersLookupService.getDivisions().catch((error) => {
          console.error('Failed to load divisions:', error);
          return [];
        }),
        mastersLookupService.getPaymentMethods().catch((error) => {
          console.error('Failed to load payment methods:', error);
          return [];
        }),
        mastersLookupService.getFrequencies().catch((error) => {
          console.error('Failed to load frequencies:', error);
          return [];
        }),
        mastersLookupService.getLoanFlags().catch((error) => {
          console.error('Failed to load loan flags:', error);
          return [];
        }),
        mastersLookupService.getCurrencies().catch((error) => {
          console.error('Failed to load currencies:', error);
          return [];
        }),
        mastersLookupService.getDayBases().catch((error) => {
          console.error('Failed to load day bases:', error);
          return [];
        }),
      ]);

      if (!isMounted) return;
      setMasterOptions({ divisions, paymentMethods, frequencies, loanFlags, currencies, dayBases });
    };

    loadMasters();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const requestId = ++requestSequenceRef.current;
    let isActive = true;
    const isNewApplication = previousApplicationIdRef.current !== applicationId;
    previousApplicationIdRef.current = applicationId;
    const agentCustomerId = application?.agentCustomerId || applicationId;

    if (isNewApplication) {
      setForm(INITIAL_FORM);
      autoFillIdsRef.current = INITIAL_AUTO_FILL_IDS;
    }

    const contextPatch = {};
    const contextAgentCustomerId = readValue(application, 'agentCustomerId', 'AgentCustomerId');
    const contextCustomerName = readValue(application, 'customerName', 'CustomerName', 'fullName', 'FullName');
    const contextApplicationNumber = readValue(application, 'appId', 'AppId');
    const hasVerifiedContextName = sameIdentifier(contextAgentCustomerId, agentCustomerId) && contextCustomerName != null;
    if (hasVerifiedContextName) contextPatch.customerName = String(contextCustomerName);
    if (contextApplicationNumber != null) contextPatch.applicationNumber = String(contextApplicationNumber);

    const emptyAutoFill = AUTO_FILL_FIELDS.reduce((values, field) => ({ ...values, [field]: '' }), {});
    autoFillIdsRef.current = { ...INITIAL_AUTO_FILL_IDS, customerId: agentCustomerId || null };
    setForm((current) => ({ ...current, ...emptyAutoFill, ...contextPatch }));

    if (!agentCustomerId) {
      setApplicationDataState({
        loading: false,
        error: 'The selected application is unavailable. No application data was populated.',
        unavailable: [],
        identityWarning: '',
      });
      return () => {
        isActive = false;
      };
    }

    setApplicationDataState({ loading: true, error: '', unavailable: [], identityWarning: '' });

    const loadApplicationData = async () => {
      const results = await Promise.allSettled([
        backOfficeService.getApplicationFullDetails(agentCustomerId),
        approvalDocumentService.getLatestCreditDecision(agentCustomerId),
        approvalDocumentService.getLoanIdentifierByCustomer(agentCustomerId),
      ]);

      if (!isActive || requestId !== requestSequenceRef.current) return;

      const [fullDetailsResult, creditDecisionResult, loanIdentifierResult] = results;
      const unavailable = [];
      let hasIdentityConflict = false;
      const nextForm = {};
      const nextIds = { ...INITIAL_AUTO_FILL_IDS };

      if (fullDetailsResult.status === 'fulfilled' && fullDetailsResult.value) {
        const fullDetails = fullDetailsResult.value;
        let mapped = null;
        try {
          mapped = mapApplicationFullDetails(fullDetails);
        } catch {
          unavailable.push('The verified application response could not be normalized; only independently available fields were retained.');
        }
        const raw = mapped?.raw || fullDetails;
        const rawCustomer = firstRecord(raw?.customer || raw?.Customer);
        const { wrapper: productWrapper, record: productRecord } = productRecords(raw);
        const responseApplicationProductDetailsId =
          readValue(productWrapper, 'applicationProductDetailsId', 'ApplicationProductDetailsId') ||
          readValue(productRecord, 'applicationProductDetailsId', 'ApplicationProductDetailsId') ||
          readValue(mapped, 'applicationProductDetailsId');
        const expectedApplicationProductDetailsId =
          readValue(application, 'applicationProductDetailsId', 'ApplicationProductDetailsId') ||
          responseApplicationProductDetailsId;
        const primaryApplicant = getVerifiedPrimaryApplicant(raw, expectedApplicationProductDetailsId);
        const fullDetailsCustomerName = readValue(rawCustomer, 'fullName', 'FullName', 'customerName', 'CustomerName');

        if (hasVerifiedContextName) {
          if (primaryApplicant?.name && comparableName(primaryApplicant.name) !== comparableName(contextCustomerName)) {
            hasIdentityConflict = true;
          }
          if (fullDetailsCustomerName && comparableName(fullDetailsCustomerName) !== comparableName(contextCustomerName)) {
            hasIdentityConflict = true;
          }
        } else if (primaryApplicant?.name) {
          nextForm.customerName = primaryApplicant.name;
        } else {
          unavailable.push('The verified primary applicant name is unavailable; Customer remains empty.');
        }
        const loanType =
          readValue(productWrapper, 'loanProductName', 'LoanProductName', 'loanProduct', 'LoanProduct') ||
          readValue(productRecord, 'loanProductName', 'LoanProductName', 'loanProduct', 'LoanProduct') ||
          readValue(rawCustomer, 'loanType', 'LoanType');
        const branch =
          readValue(rawCustomer, 'branch', 'Branch') ||
          readValue(productWrapper, 'sourcingBranch', 'SourcingBranch') ||
          readValue(productRecord, 'sourcingBranch', 'SourcingBranch') ||
          readValue(raw, 'sourcingBranch', 'SourcingBranch');
        const applicationNumber =
          readValue(rawCustomer, 'appId', 'AppId', 'App_Id') ||
          readValue(mapped, 'appId');
        const loanPurpose =
          readValue(productWrapper, 'loanPurposeName', 'LoanPurposeName', 'loanPurpose', 'LoanPurpose') ||
          readValue(productRecord, 'loanPurposeName', 'LoanPurposeName', 'loanPurpose', 'LoanPurpose') ||
          readValue(rawCustomer, 'loanPurposeName', 'LoanPurposeName', 'loanPurpose', 'LoanPurpose');
        const appliedDate = dateInputValue(mapped?.appliedDate || readValue(rawCustomer, 'createdAt', 'CreatedAt', 'createdDate', 'CreatedDate'));

        if (loanType != null && !/^\d+$/.test(String(loanType).trim())) nextForm.product = String(loanType);
        if (branch != null) nextForm.branch = String(branch);
        if (applicationNumber != null) nextForm.applicationNumber = String(applicationNumber);
        if (loanPurpose != null && !/^\d+$/.test(String(loanPurpose).trim())) nextForm.loanPurpose = String(loanPurpose);
        if (appliedDate) nextForm.applicationRequestCode = appliedDate;

        nextIds.customerId = readValue(rawCustomer, 'agentCustomerId', 'AgentCustomerId') || agentCustomerId;
        nextIds.loanTypeId = readValue(productWrapper, 'loanTypeId', 'LoanTypeId') || readValue(productRecord, 'loanTypeId', 'LoanTypeId');
        nextIds.loanProductId = readValue(productWrapper, 'loanProductId', 'LoanProductId') || readValue(productRecord, 'loanProductId', 'LoanProductId');
        nextIds.branchId = readValue(rawCustomer, 'branchId', 'BranchId');
        nextIds.loanPurposeId = readValue(productWrapper, 'loanPurposeId', 'LoanPurposeId') || readValue(productRecord, 'loanPurposeId', 'LoanPurposeId');
      } else {
        unavailable.push('Verified application details are unavailable; related fields remain empty.');
      }

      if (creditDecisionResult.status === 'fulfilled') {
        const decision = firstRecord(creditDecisionResult.value);
        const decisionName = readValue(decision, 'decision', 'Decision');
        const sanctionedAmount = readValue(decision, 'sanctionedLoanAmount', 'SanctionedLoanAmount');
        const sanctionedRoi = readValue(decision, 'sanctionedROI', 'SanctionedROI', 'sanctionedRoi');
        const sanctionedTenure = readValue(decision, 'sanctionedTenureMonths', 'SanctionedTenureMonths');
        const isApproved = String(decisionName || '').trim().toLowerCase() === 'approved';
        const hasCompleteApprovedTerms =
          isApproved &&
          finiteNumber(sanctionedAmount) !== null &&
          finiteNumber(sanctionedRoi) !== null &&
          finiteNumber(sanctionedTenure) !== null &&
          finiteNumber(sanctionedTenure) > 0;

        if (hasCompleteApprovedTerms) {
          nextForm.loanAmount = String(sanctionedAmount);
          nextForm.interestRate = String(sanctionedRoi);
        } else {
          unavailable.push('An approved Credit Decision with complete sanctioned terms is unavailable; sanctioned fields remain empty.');
        }
      } else {
        unavailable.push('The latest Credit Decision could not be loaded; sanctioned fields remain empty.');
      }

      if (loanIdentifierResult.status === 'fulfilled') {
        const loanIdentifier = firstRecord(loanIdentifierResult.value);
        const sanctionLetterId = readValue(loanIdentifier, 'sanctionLetterId', 'SanctionLetterId');
        if (sanctionLetterId != null) {
          nextForm.loanReferenceNumber = String(sanctionLetterId);
        } else {
          unavailable.push('The official sanction reference is unavailable; Loan Reference No. remains empty.');
        }
      } else {
        unavailable.push('The official loan identifier could not be loaded; Loan Reference No. remains empty.');
      }

      if (!isActive || requestId !== requestSequenceRef.current) return;
      setForm((current) => ({ ...current, ...nextForm }));
      autoFillIdsRef.current = nextIds;
      setApplicationDataState({
        loading: false,
        error: '',
        unavailable,
        identityWarning: hasIdentityConflict ? CUSTOMER_IDENTITY_WARNING : '',
      });
    };

    loadApplicationData().catch((error) => {
      if (!isActive || requestId !== requestSequenceRef.current) return;
      setApplicationDataState({
        loading: false,
        error: error?.response?.data?.message || error?.message || 'Unable to load application data.',
        unavailable: [],
        identityWarning: '',
      });
    });

    return () => {
      isActive = false;
    };
  }, [applicationId, autoFillRequest]);

  const optionsByKey = useMemo(
    () => ({
      divisions: masterOptions.divisions,
      paymentMethods: masterOptions.paymentMethods,
      frequencies: masterOptions.frequencies,
      loanFlags: masterOptions.loanFlags,
      currencies: masterOptions.currencies,
      dayBases: masterOptions.dayBases,
    }),
    [masterOptions]
  );

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  return (
    <OperationsLayout title="Loan Basic Details" subtitle="Operations Maker workflow">
      <div className="operations-loan-page">
        <nav className="operations-loan-breadcrumb" aria-label="Breadcrumb">
          <button type="button" onClick={() => navigate(ROUTES.MAKER_DASHBOARD)}>Operations Maker</button>
          <ChevronRight size={15} aria-hidden="true" />
          <span>Loan Basic Details</span>
        </nav>

        <nav className="operations-loan-steps" aria-label="Application workflow steps">
          {WORKFLOW_STEPS.map((step, index) => (
            <button
              key={step.id}
              type="button"
              className={['operations-loan-step', step.active ? 'is-active' : ''].join(' ').trim()}
              aria-current={step.active ? 'step' : undefined}
              disabled={!step.route}
              onClick={() => step.route && navigate(buildApplicationRoute(step.route, applicationId))}
            >
              <span className="operations-loan-step-number">{index + 1}</span>
              <span>{step.label}</span>
            </button>
          ))}
        </nav>

        {applicationDataState.loading && (
          <div className="operations-state-card" role="status">
            Loading application details…
          </div>
        )}
        {applicationDataState.error && (
          <div className="operations-state-card operations-state-card--error" role="alert">
            <p>{applicationDataState.error}</p>
            <button type="button" className="operations-secondary-button" onClick={() => setAutoFillRequest((current) => current + 1)}>
              Retry
            </button>
          </div>
        )}
        {!applicationDataState.loading && applicationDataState.identityWarning && (
          <div className="operations-loan-identity-warning" role="status" aria-live="polite">
            <AlertTriangle size={17} strokeWidth={2} aria-hidden="true" />
            <span>{applicationDataState.identityWarning}</span>
          </div>
        )}
        {!applicationDataState.loading && !applicationDataState.error && applicationDataState.unavailable.length > 0 && (
          <div className="operations-state-card operations-state-card--error" role="alert">
            <p>{applicationDataState.unavailable.join(' ')}</p>
            <button type="button" className="operations-secondary-button" onClick={() => setAutoFillRequest((current) => current + 1)}>
              Retry
            </button>
          </div>
        )}

        <form className="operations-loan-form" onSubmit={(event) => event.preventDefault()} noValidate>
          {SECTIONS.map((section) => (
            <section className="operations-loan-section" key={section.id}>
              <div className="operations-loan-section-heading">
                <div>
                  <h2>{section.title}</h2>
                </div>
              </div>
              <div className="operations-loan-fields">
                {section.fields.map((field) => (
                  <Field
                    key={field.name}
                    field={field}
                    value={form[field.name]}
                    onChange={updateField}
                    options={field.optionsKey ? optionsByKey[field.optionsKey] || EMPTY_OPTIONS : EMPTY_OPTIONS}
                  />
                ))}
              </div>
            </section>
          ))}

          <footer className="operations-loan-footer">
            <div className="operations-loan-footer-status">
              <span className="operations-loan-status-dot" />
              <span>UI-only draft</span>
            </div>
            <div className="operations-loan-actions">
              <button type="button" className="operations-loan-button operations-loan-button--secondary" onClick={() => navigate(ROUTES.MAKER_DASHBOARD)}>
                <ArrowLeft size={16} />
                Back
              </button>
              <button type="button" className="operations-loan-button operations-loan-button--secondary" disabled title="Backend workflow is not connected yet.">
                <Save size={16} />
                Save
              </button>
              <button type="button" className="operations-loan-button operations-loan-button--primary" disabled title="Backend workflow is not connected yet.">
                <Send size={16} />
                Submit
              </button>
              <button type="button" className="operations-loan-button operations-loan-button--secondary" disabled title="Backend workflow is not connected yet.">
                <Save size={16} />
                Resubmit
              </button>
              <button type="button" className="operations-loan-button operations-loan-button--danger" disabled title="Backend workflow is not connected yet.">
                <X size={16} />
                Reject
              </button>
            </div>
          </footer>
        </form>
      </div>
    </OperationsLayout>
  );
}
