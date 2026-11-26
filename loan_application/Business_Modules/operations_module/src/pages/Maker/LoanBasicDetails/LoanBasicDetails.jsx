import { ArrowLeft, ArrowRight, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import backOfficeService from '../../../../../back_office/src/back-office/api/backOfficeService';
import approvalDocumentService from '../../../../../../Core/src/features/approval-documents/services/approvalDocumentService';
import { LOGIN_PATH } from '../../../../../../Core/src/auth/authEvents';
import { buildApplicationRoute, ROUTES } from '../../../config/routeConfig';
import { useOperationsApplication } from '../../../context/OperationsApplicationContext';
import OperationsLayout from '../../../layouts/OperationsLayout';
import { mastersLookupService } from '../../../services/mastersLookupService';
import {
  getApiErrorMessage,
  operationsLoanBasicDetailsService,
} from '../../../services/operationsLoanBasicDetailsService';
import {
  buildDisbursementPayload,
  buildLoanBasicDetailsPayload,
  buildPenaltyPayload,
  getCreatedByUserId,
  getRecordId,
  mapLoanBasicDetailsToForm,
  mapPenaltyToForm,
  normalizeDisbursementRow,
  validateLoanBasicDetailsForm,
} from './loanBasicDetailsPayload';
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
  loanBranchId: '',
  product: '',
  disbursementAmount: '',
  netLoanAmount: '',
  totalDisbursements: '',
  repaymentMode: '',
  salesExecutive: '',
  sourcingType: '',
  loanPurpose: '',
  dsaDma: '',
  salesManager: '',
  loanFlagId: '',
  loanAmount: '',
  installmentCount: '',
  interestRateType: '',
  allowBpi: false,
  baseRate: '',
  scheduleMethodId: '',
  interestFrequency: '',
  capitalizationFrequency: '',
  repaymentFrequency: '',
  maturityDate: '',
  bpiTreatmentId: '',
  interestRate: '',
  margin: '',
  nextInterestFrequencyDate: '',
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
  applicationProductDetailsId: null,
  loanAccountNumber: '',
  operationsStatus: '',
  assignedMakerStaffId: null,
  profileImagePath: '',
  rmId: null,
  salesExecutiveRmId: null,
  salesManagerRmId: null,
  agentId: null,
  creatorRole: '',
  creatorId: null,
  sourceSourcingChannelId: null,
  sourceSourcingChannelName: '',
  resolvedSourcingChannelId: null,
};

const AUTO_FILL_FIELDS = [
  'customerName',
  'product',
  'loanAmount',
  'loanReferenceNumber',
  'applicationRequestCode',
  'applicationNumber',
  'loanPurpose',
  'interestRate',
  'salesExecutive',
  'salesManager',
  'dsaDma',
  'sourcingType',
];

const PLACEHOLDER_VALUES = new Set(['', 'n/a', 'na', 'nil', 'not available', 'null', 'undefined', '—', '-']);

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

function sameIdentifier(left, right) {
  if (left === undefined || left === null || right === undefined || right === null) return false;
  return String(left).trim() === String(right).trim();
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

function localDateInputValue() {
  const today = new Date();
  return [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
}

function normalizedRole(value) {
  return String(value ?? '').trim().toLowerCase();
}

function formatNameWithCode(name, code) {
  const cleanName = String(name ?? '').trim();
  const cleanCode = String(code ?? '').trim();
  if (!cleanName) return '';
  return cleanCode ? `${cleanName} (${cleanCode})` : cleanName;
}

function channelDescriptor(record) {
  return [
    readValue(record, 'sourcingChannelName', 'SourcingChannelName', 'sourcingChannel', 'SourcingChannel', 'channelName', 'ChannelName'),
    readValue(record, 'sourcingChannelCode', 'SourcingChannelCode', 'channelCode', 'ChannelCode'),
  ]
    .filter((value) => value != null)
    .join(' ')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, '');
}

function isAgentChannel(record) {
  const descriptor = channelDescriptor(record);
  return descriptor.includes('agent') || descriptor.includes('fieldagent');
}

function isRmChannel(record) {
  const descriptor = channelDescriptor(record);
  return !isAgentChannel(record) && (
    descriptor.includes('rm') ||
    descriptor.includes('relationshipmanager') ||
    descriptor.includes('direct')
  );
}

function isMonthlyFrequency(option) {
  const code = String(readValue(option, 'frequencyCode', 'FrequencyCode', 'code', 'Code') ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, '');
  const name = String(readValue(option, 'frequencyName', 'FrequencyName', 'label', 'name', 'Name') ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, '');

  return code === 'mnt' || name === 'monthly';
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
      { name: 'loanReferenceNumber', label: 'Loan Reference No.', type: 'text', required: true, readOnly: true },
      { name: 'product', label: 'Loan Type', type: 'select', required: true, readOnly: true },
      { name: 'interestCapsBasis', label: 'Interest Days Basis', type: 'select', required: true, optionsKey: 'dayBases' },
      { name: 'currency', label: 'Currency', type: 'select', required: true, optionsKey: 'currencies' },
      { name: 'loanBranchId', label: 'Loan Branch', type: 'select', required: true, optionsKey: 'loanBranches' },
      { name: 'customerName', label: 'Customer', type: 'select', required: true, readOnly: true },
      { name: 'applicationRequestCode', label: 'Application Request Date', type: 'date', readOnly: true },
      { name: 'loanStartDate', label: 'Loan Start Date', type: 'date', required: true },
      { name: 'netLoanAmount', label: 'Net Loan Amount', type: 'number', required: true },
      { name: 'disbursementAmount', label: 'First Disbursement Amount', type: 'number', required: true },
      { name: 'totalDisbursements', label: 'Total Disbursements', type: 'number', readOnly: true },
      { name: 'loanAmount', label: 'Loan Amount', type: 'number', required: true, readOnly: true },
    ],
  },
  {
    id: 'quick-disbursement',
    title: 'Quick Disbursement / Loan Information',
    fields: [
      { name: 'repaymentMode', label: 'Payment Method', type: 'select', required: true, optionsKey: 'paymentMethods' },
      { name: 'salesExecutive', label: 'Sales Executive', type: 'select', readOnly: true },
      { name: 'dsaDma', label: 'DSA / DMA', type: 'select', readOnly: true },
      { name: 'sourcingType', label: 'Sourcing Type', type: 'select', required: true, readOnly: true },
      { name: 'salesManager', label: 'Sales Manager', type: 'select', readOnly: true },
      { name: 'loanPurpose', label: 'Loan Purpose', type: 'select', required: true, readOnly: true },
      { name: 'applicationNumber', label: 'Application Number', type: 'text', required: true, readOnly: true },
      {
        name: 'loanFlagId',
        label: 'Loan Flag',
        type: 'radio-group',
        optionsKey: 'loanFlags',
      },
    ],
  },
  {
    id: 'payment-details',
    title: 'Payment Details',
    fields: [
      { name: 'installmentCount', label: 'Number of Installments', type: 'number', required: true, readOnly: true },
      { name: 'interestRateType', label: 'Interest Rate Type', type: 'select', required: true, optionsKey: 'interestTypes' },
      { name: 'bpiTreatmentId', label: 'BPI Treatment', type: 'select', required: true, optionsKey: 'bpiTreatments' },
      { name: 'allowBpi', label: 'Allow BPI', type: 'checkbox' },
      { name: 'interestRate', label: 'Actual Interest Rate (%)', type: 'number', required: true, readOnly: true },
      { name: 'baseRate', label: 'Base Rate (%)', type: 'number' },
      { name: 'margin', label: 'Margin (%)', type: 'number', readOnly: true },
      { name: 'scheduleMethodId', label: 'Schedule Method', type: 'select', required: true, optionsKey: 'scheduleMethods' },
      { name: 'interestFrequency', label: 'Interest Frequency', type: 'select', required: true, optionsKey: 'frequencies' },
      { name: 'nextInterestFrequencyDate', label: 'Next Interest Frequency Date', type: 'date' },
      {
        name: 'capitalizationFrequency',
        label: 'Capitalization Frequency',
        type: 'select',
        required: true,
        optionsKey: 'frequencies',
      },
      { name: 'nextCapitalizationFrequencyDate', label: 'Next Capitalization Frequency Date', type: 'date' },
      {
        name: 'repaymentFrequency',
        label: 'Payment Frequency',
        type: 'select',
        required: true,
        optionsKey: 'frequencies',
      },
      { name: 'nextPaymentFrequencyDate', label: 'Next Payment Frequency Date', type: 'date' },
      { name: 'maturityDate', label: 'Maturity Date', type: 'date', readOnly: true },
    ],
  },
  {
    id: 'overdue-penalty-details',
    title: 'Overdue Penalty Details',
    fields: [
      { name: 'penaltyApplicable', label: 'Apply Overdue Penalty', type: 'checkbox' },
      { name: 'includeGraceDaysInPenaltyCalculation', label: 'Include Grace Days in Penalty Calculation', type: 'checkbox' },
      { name: 'gracePeriodDays', label: 'Grace Days', type: 'number' },
      { name: 'chargeCalculatedOn', label: 'Charge Calculated On', type: 'text' },
      { name: 'penaltyRate', label: 'Charge Amount / %', type: 'number' },
      { name: 'allowWaivers', label: 'Allow Waivers', type: 'checkbox' },
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
  const [approvedTenureMonths, setApprovedTenureMonths] = useState(null);
  const [applicationDataState, setApplicationDataState] = useState({
    loading: false,
    error: '',
    unavailable: [],
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
    scheduleMethods: [],
    bpiTreatments: [],
    loanBranches: [],
    interestTypes: [],
  });
  const [savedBasicId, setSavedBasicId] = useState(null);
  const [savedPenaltyId, setSavedPenaltyId] = useState(null);
  const [disbursements, setDisbursements] = useState([]);
  const [saveState, setSaveState] = useState({ saving: false, error: '', success: '' });
  const [disbursementDraft, setDisbursementDraft] = useState({
    id: null,
    amount: '',
    date: '',
    remarks: '',
  });
  const [disbursementBusy, setDisbursementBusy] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadMasters = async () => {
      const [
        divisions,
        paymentMethods,
        frequencies,
        loanFlags,
        currencies,
        dayBases,
        scheduleMethods,
        bpiTreatments,
        loanBranches,
        interestTypes,
      ] = await Promise.all([
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
        mastersLookupService.getScheduleMethods().catch((error) => {
          console.error('Failed to load schedule methods:', error);
          return [];
        }),
        mastersLookupService.getBPITreatments().catch((error) => {
          console.error('Failed to load BPI treatments:', error);
          return [];
        }),
        mastersLookupService.getLoanBranches().catch((error) => {
          console.error('Failed to load loan branches:', error);
          return [];
        }),
        mastersLookupService.getInterestTypes().catch((error) => {
          console.error('Failed to load interest types:', error);
          return [];
        }),
      ]);

      if (!isMounted) return;
      setMasterOptions({
        divisions,
        paymentMethods,
        frequencies,
        loanFlags,
        currencies,
        dayBases,
        scheduleMethods,
        bpiTreatments,
        loanBranches,
        interestTypes,
      });
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

    setApprovedTenureMonths(null);

    if (isNewApplication) {
      setForm(INITIAL_FORM);
      autoFillIdsRef.current = INITIAL_AUTO_FILL_IDS;
      setSavedBasicId(null);
      setSavedPenaltyId(null);
      setDisbursements([]);
      setDisbursementDraft({ id: null, amount: '', date: '', remarks: '' });
      setSaveState({ saving: false, error: '', success: '' });
    }

    const contextCustomerName = readValue(application, 'fullName', 'FullName');
    const contextApplicationNumber = readValue(application, 'customerCode', 'CustomerCode');
    const loanType = readValue(application, 'loanProductName', 'LoanProductName');
    const persistedLoanStartDate = dateInputValue(readValue(application, 'loanStartDate', 'LoanStartDate'));
    const appliedDate = dateInputValue(readValue(application, 'createdAt', 'CreatedAt'));
    const rmId = readValue(application, 'rmId', 'RmId', 'RMId');
    const rmName = readValue(application, 'rmName', 'RmName', 'RMName');
    const rmCode = readValue(application, 'rmCode', 'RmCode', 'RMCode');
    const agentId = readValue(application, 'agentId', 'AgentId');
    const agentName = readValue(application, 'agentName', 'AgentName');
    const agentCode = readValue(application, 'agentCode', 'AgentCode');
    const creatorRole = normalizedRole(readValue(application, 'createdByRole', 'CreatedByRole'));
    const creatorId = readValue(application, 'createdByUserId', 'CreatedByUserId');
    const validAgentCreator = creatorRole === 'agent' && sameIdentifier(creatorId, agentId);
    const rmDisplay = formatNameWithCode(rmName, rmCode);
    const dsaDisplay = validAgentCreator
      ? formatNameWithCode(agentName, agentCode)
      : creatorRole === 'rm'
        ? 'Direct RM'
        : '';
    const sourcingTypeDisplay = creatorRole === 'agent'
      ? 'Agent'
      : creatorRole === 'rm'
        ? 'RM'
        : '';
    const applicationDetails = {
      applicationProductDetailsId: readValue(application, 'applicationProductDetailsId', 'ApplicationProductDetailsId'),
      loanAccountNumber: readValue(application, 'loanAccountNumber', 'LoanAccountNumber') || '',
      operationsStatus: readValue(application, 'operationsStatus', 'OperationsStatus') || '',
      assignedMakerStaffId: readValue(application, 'assignedMakerStaffId', 'AssignedMakerStaffId'),
      profileImagePath: readValue(application, 'profileImagePath', 'ProfileImagePath') || '',
      rmId,
      salesExecutiveRmId: rmId,
      salesManagerRmId: rmId,
      agentId,
      creatorRole,
      creatorId,
    };
    const contextPatch = {};
    if (contextCustomerName != null) contextPatch.customerName = String(contextCustomerName);
    if (contextApplicationNumber != null) contextPatch.applicationNumber = String(contextApplicationNumber);
    if (loanType != null && !/^\d+$/.test(String(loanType).trim())) contextPatch.product = String(loanType);
    if (appliedDate) contextPatch.applicationRequestCode = appliedDate;
    contextPatch.salesExecutive = rmDisplay;
    contextPatch.salesManager = rmDisplay;
    contextPatch.dsaDma = dsaDisplay;
    contextPatch.sourcingType = sourcingTypeDisplay;

    const emptyAutoFill = AUTO_FILL_FIELDS.reduce((values, field) => ({ ...values, [field]: '' }), {});
    autoFillIdsRef.current = {
      ...INITIAL_AUTO_FILL_IDS,
      customerId: agentCustomerId || null,
      ...applicationDetails,
    };
    setForm((current) => {
      const next = { ...current, ...emptyAutoFill, ...contextPatch };
      if (isNewApplication || !current.loanStartDate) {
        next.loanStartDate = persistedLoanStartDate || localDateInputValue();
      }
      return next;
    });

    if (!agentCustomerId) {
      setApplicationDataState({
        loading: false,
        error: 'The selected application is unavailable. No application data was populated.',
        unavailable: [],
      });
      return () => {
        isActive = false;
      };
    }

    setApplicationDataState({ loading: true, error: '', unavailable: [] });

    const loadApplicationData = async () => {
      const results = await Promise.allSettled([
        backOfficeService.getApplicationProductDetailsByCustomer(agentCustomerId),
        approvalDocumentService.getLatestCreditDecision(agentCustomerId),
        approvalDocumentService.getLoanIdentifierByCustomer(agentCustomerId),
        operationsLoanBasicDetailsService.getByCustomer(agentCustomerId),
        operationsLoanBasicDetailsService.getPenaltyByCustomer(agentCustomerId),
        operationsLoanBasicDetailsService.getDisbursementsByCustomer(agentCustomerId),
      ]);

      if (!isActive || requestId !== requestSequenceRef.current) return;

      const [
        productDetailsResult,
        creditDecisionResult,
        loanIdentifierResult,
        opsBasicResult,
        opsPenaltyResult,
        opsDisbursementsResult,
      ] = results;
      const unavailable = [];
      const nextForm = {};
      const nextIds = {
        ...INITIAL_AUTO_FILL_IDS,
        customerId: agentCustomerId || null,
        ...applicationDetails,
      };
      const contextAgentCustomerId = readValue(application, 'agentCustomerId', 'AgentCustomerId') || agentCustomerId;
      const contextApplicationProductDetailsId = applicationDetails.applicationProductDetailsId;

      if (contextCustomerName == null) unavailable.push('Customer details are unavailable; Customer remains empty.');

      if (productDetailsResult.status === 'fulfilled') {
        const productDetails = firstRecord(productDetailsResult.value);
        const returnedAgentCustomerId = readValue(productDetails, 'agentCustomerId', 'AgentCustomerId');
        const returnedApplicationProductDetailsId = readValue(
          productDetails,
          'applicationProductDetailsId',
          'ApplicationProductDetailsId'
        );
        const hasMatchingApplication =
          sameIdentifier(returnedAgentCustomerId, contextAgentCustomerId) &&
          sameIdentifier(returnedApplicationProductDetailsId, contextApplicationProductDetailsId);

        if (hasMatchingApplication) {
          const loanPurposeName = readValue(productDetails, 'loanPurposeName', 'LoanPurposeName');
          const sourceSourcingChannelId = readValue(
            productDetails,
            'sourcingChannelId',
            'SourcingChannelId'
          );
          const sourceSourcingChannelName = readValue(
            productDetails,
            'sourcingChannelName',
            'SourcingChannelName',
            'sourcingChannel',
            'SourcingChannel',
            'channelName',
            'ChannelName'
          );
          nextIds.applicationProductDetailsId = returnedApplicationProductDetailsId;
          nextIds.loanPurposeId = readValue(productDetails, 'loanPurposeId', 'LoanPurposeId');
          nextIds.sourceSourcingChannelId = sourceSourcingChannelId;
          nextIds.sourceSourcingChannelName = sourceSourcingChannelName || '';

          const channelMatchesCreator = creatorRole === 'agent'
            ? isAgentChannel(productDetails)
            : creatorRole === 'rm'
              ? isRmChannel(productDetails)
              : false;
          if (sourceSourcingChannelId != null && channelMatchesCreator) {
            nextIds.resolvedSourcingChannelId = sourceSourcingChannelId;
          }

          if (loanPurposeName != null) nextForm.loanPurpose = String(loanPurposeName);
        } else {
          unavailable.push('Application Product Details did not match the selected application.');
        }
      } else {
        unavailable.push('Unable to load Application Product Details.');
      }

      if (creditDecisionResult.status === 'fulfilled') {
        const decision = firstRecord(creditDecisionResult.value);
        const decisionName = readValue(decision, 'decision', 'Decision');
        const decisionAgentCustomerId = readValue(
          decision,
          'agentCustomerId',
          'AgentCustomerId',
          'customerId',
          'CustomerId'
        );
        const decisionApplicationProductDetailsId = readValue(
          decision,
          'applicationProductDetailsId',
          'ApplicationProductDetailsId'
        );
        const sanctionedAmount = readValue(decision, 'sanctionedLoanAmount', 'SanctionedLoanAmount');
        const sanctionedRoi = readValue(decision, 'sanctionedROI', 'SanctionedROI', 'sanctionedRoi');
        const sanctionedTenure = readValue(decision, 'sanctionedTenureMonths', 'SanctionedTenureMonths');
        const isApproved = String(decisionName || '').trim().toLowerCase() === 'approved';
        const parsedSanctionedTenure = finiteNumber(sanctionedTenure);
        const decisionMatchesApplication =
          sameIdentifier(decisionAgentCustomerId, contextAgentCustomerId) &&
          sameIdentifier(decisionApplicationProductDetailsId, contextApplicationProductDetailsId);
        const hasValidSanctionedTenure =
          parsedSanctionedTenure !== null &&
          Number.isInteger(parsedSanctionedTenure) &&
          parsedSanctionedTenure > 0;
        const hasCompleteApprovedTerms =
          isApproved &&
          decisionMatchesApplication &&
          finiteNumber(sanctionedAmount) !== null &&
          finiteNumber(sanctionedRoi) !== null &&
          hasValidSanctionedTenure;

        if (hasCompleteApprovedTerms) {
          nextForm.loanAmount = String(sanctionedAmount);
          nextForm.interestRate = String(sanctionedRoi);
          setApprovedTenureMonths(parsedSanctionedTenure);
        } else {
          unavailable.push('An approved Credit Decision with matching application identity and complete sanctioned terms is unavailable; sanctioned fields remain empty.');
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

      let nextSavedBasicId = null;
      let nextSavedPenaltyId = null;
      let nextDisbursements = [];

      if (opsBasicResult.status === 'fulfilled' && opsBasicResult.value) {
        const opsBasic = opsBasicResult.value;
        nextSavedBasicId = getRecordId(
          opsBasic,
          'operationsLoanBasicDetailsId',
          'OperationsLoanBasicDetailsId',
          'id'
        );
        Object.assign(nextForm, mapLoanBasicDetailsToForm(opsBasic));
      } else if (opsBasicResult.status === 'rejected' && opsBasicResult.reason?.response?.status !== 404) {
        unavailable.push('Unable to load saved Operations Loan Basic Details.');
      }

      if (opsPenaltyResult.status === 'fulfilled' && opsPenaltyResult.value) {
        const opsPenalty = opsPenaltyResult.value;
        nextSavedPenaltyId = getRecordId(
          opsPenalty,
          'operationsOverduePenaltyDetailsId',
          'OperationsOverduePenaltyDetailsId',
          'id'
        );
        Object.assign(nextForm, mapPenaltyToForm(opsPenalty));
      } else if (opsPenaltyResult.status === 'rejected' && opsPenaltyResult.reason?.response?.status !== 404) {
        unavailable.push('Unable to load saved Overdue Penalty Details.');
      }

      if (opsDisbursementsResult.status === 'fulfilled') {
        nextDisbursements = (opsDisbursementsResult.value || [])
          .map(normalizeDisbursementRow)
          .filter((row) => row?.id);
      } else if (
        opsDisbursementsResult.status === 'rejected' &&
        opsDisbursementsResult.reason?.response?.status !== 404
      ) {
        unavailable.push('Unable to load disbursement details.');
      }

      if (!isActive || requestId !== requestSequenceRef.current) return;
      setForm((current) => ({ ...current, ...nextForm }));
      autoFillIdsRef.current = nextIds;
      setSavedBasicId(nextSavedBasicId);
      setSavedPenaltyId(nextSavedPenaltyId);
      setDisbursements(nextDisbursements);
      setApplicationDataState({
        loading: false,
        error: '',
        unavailable,
      });
    };

    loadApplicationData().catch((error) => {
      if (!isActive || requestId !== requestSequenceRef.current) return;
      setApplicationDataState({
        loading: false,
        error: error?.response?.data?.message || error?.message || 'Unable to load application data.',
        unavailable: [],
      });
    });

    return () => {
      isActive = false;
    };
  }, [applicationId, application, autoFillRequest]);

  useEffect(() => {
    const frequencies = masterOptions.frequencies;
    if (frequencies.length !== 1) return;

    const onlyFrequency = frequencies[0];
    if (!isMonthlyFrequency(onlyFrequency)) return;

    const hasValidSelection = frequencies.some((option) =>
      sameIdentifier(option?.value, form.repaymentFrequency)
    );
    if (hasValidSelection) return;

    setForm((current) => {
      if (current.repaymentFrequency && current.repaymentFrequency !== form.repaymentFrequency) {
        return current;
      }
      if (current.repaymentFrequency === String(onlyFrequency.value)) return current;
      return { ...current, repaymentFrequency: String(onlyFrequency.value) };
    });
  }, [form.repaymentFrequency, masterOptions.frequencies]);

  useEffect(() => {
    const selectedFrequency = masterOptions.frequencies.find((option) =>
      sameIdentifier(option?.value, form.repaymentFrequency)
    );
    const nextInstallmentCount =
      approvedTenureMonths !== null &&
      selectedFrequency &&
      isMonthlyFrequency(selectedFrequency)
        ? String(approvedTenureMonths)
        : '';

    setForm((current) => (
      current.installmentCount === nextInstallmentCount
        ? current
        : { ...current, installmentCount: nextInstallmentCount }
    ));
  }, [approvedTenureMonths, form.repaymentFrequency, masterOptions.frequencies]);

  const optionsByKey = useMemo(
    () => ({
      divisions: masterOptions.divisions,
      paymentMethods: masterOptions.paymentMethods,
      frequencies: masterOptions.frequencies,
      loanFlags: masterOptions.loanFlags,
      currencies: masterOptions.currencies,
      dayBases: masterOptions.dayBases,
      scheduleMethods: masterOptions.scheduleMethods,
      bpiTreatments: masterOptions.bpiTreatments,
      loanBranches: masterOptions.loanBranches,
      interestTypes: masterOptions.interestTypes,
    }),
    [masterOptions]
  );

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setSaveState((current) => (current.error || current.success ? { ...current, error: '', success: '' } : current));
  };

  const agentCustomerId = application?.agentCustomerId || applicationId;
  const applicationProductDetailsId =
    autoFillIdsRef.current.applicationProductDetailsId ||
    readValue(application, 'applicationProductDetailsId', 'ApplicationProductDetailsId');

  const refreshDisbursementsAndTotal = async () => {
    if (!agentCustomerId) return;
    const [rows, basic] = await Promise.all([
      operationsLoanBasicDetailsService.getDisbursementsByCustomer(agentCustomerId),
      operationsLoanBasicDetailsService.getByCustomer(agentCustomerId),
    ]);
    setDisbursements((rows || []).map(normalizeDisbursementRow).filter((row) => row?.id));
    if (basic) {
      const mapped = mapLoanBasicDetailsToForm(basic);
      setSavedBasicId(
        getRecordId(basic, 'operationsLoanBasicDetailsId', 'OperationsLoanBasicDetailsId', 'id')
      );
      setForm((current) => ({
        ...current,
        totalDisbursements: mapped.totalDisbursements || current.totalDisbursements,
        margin: mapped.margin || current.margin,
        maturityDate: mapped.maturityDate || current.maturityDate,
      }));
    }
  };

  const handleSaveDisbursement = async () => {
    const createdBy = getCreatedByUserId();
    if (!agentCustomerId || !applicationProductDetailsId) {
      setSaveState({ saving: false, error: 'Application identifiers are missing for disbursement save.', success: '' });
      return;
    }
    if (!createdBy) {
      setSaveState({ saving: false, error: 'Unable to resolve the logged-in user for createdBy.', success: '' });
      return;
    }
    if (!disbursementDraft.amount || !disbursementDraft.date) {
      setSaveState({ saving: false, error: 'Disbursement amount and date are required.', success: '' });
      return;
    }

    setDisbursementBusy(true);
    setSaveState({ saving: false, error: '', success: '' });
    try {
      const payload = buildDisbursementPayload({
        agentCustomerId,
        applicationProductDetailsId,
        amount: disbursementDraft.amount,
        date: disbursementDraft.date,
        remarks: disbursementDraft.remarks,
        createdBy,
        existingId: disbursementDraft.id,
      });
      if (disbursementDraft.id) {
        await operationsLoanBasicDetailsService.updateDisbursement(disbursementDraft.id, payload);
      } else {
        await operationsLoanBasicDetailsService.createDisbursement(payload);
      }
      setDisbursementDraft({ id: null, amount: '', date: '', remarks: '' });
      await refreshDisbursementsAndTotal();
      setSaveState({ saving: false, error: '', success: 'Disbursement saved successfully.' });
    } catch (error) {
      if (error?.response?.status === 401) {
        window.location.assign(LOGIN_PATH);
        return;
      }
      setSaveState({
        saving: false,
        error: getApiErrorMessage(error, 'Unable to save disbursement.'),
        success: '',
      });
    } finally {
      setDisbursementBusy(false);
    }
  };

  const handleEditDisbursement = (row) => {
    setDisbursementDraft({
      id: row.id,
      amount: row.amount != null ? String(row.amount) : '',
      date: row.date || '',
      remarks: row.remarks || '',
    });
  };

  const handleDeleteDisbursement = async (row) => {
    if (!row?.id) return;
    setDisbursementBusy(true);
    setSaveState({ saving: false, error: '', success: '' });
    try {
      await operationsLoanBasicDetailsService.deleteDisbursement(row.id);
      if (disbursementDraft.id === row.id) {
        setDisbursementDraft({ id: null, amount: '', date: '', remarks: '' });
      }
      await refreshDisbursementsAndTotal();
      setSaveState({ saving: false, error: '', success: 'Disbursement removed successfully.' });
    } catch (error) {
      if (error?.response?.status === 401) {
        window.location.assign(LOGIN_PATH);
        return;
      }
      setSaveState({
        saving: false,
        error: getApiErrorMessage(error, 'Unable to delete disbursement.'),
        success: '',
      });
    } finally {
      setDisbursementBusy(false);
    }
  };

  const handleSaveAndContinue = async () => {
    const validationError = validateLoanBasicDetailsForm(form);
    if (validationError) {
      setSaveState({ saving: false, error: validationError, success: '' });
      return;
    }

    const createdBy = getCreatedByUserId();
    if (!agentCustomerId || !applicationProductDetailsId) {
      setSaveState({
        saving: false,
        error: 'Application identifiers are missing. Re-open the application from the Maker listing.',
        success: '',
      });
      return;
    }
    if (!createdBy) {
      setSaveState({ saving: false, error: 'Unable to resolve the logged-in user for createdBy.', success: '' });
      return;
    }

    setSaveState({ saving: true, error: '', success: '' });
    try {
      const basicPayload = buildLoanBasicDetailsPayload({
        form,
        agentCustomerId,
        applicationProductDetailsId,
        createdBy,
        existingId: savedBasicId,
      });
      const basicResult = savedBasicId
        ? await operationsLoanBasicDetailsService.update(savedBasicId, basicPayload)
        : await operationsLoanBasicDetailsService.create(basicPayload);

      const nextBasicId =
        getRecordId(basicResult, 'operationsLoanBasicDetailsId', 'OperationsLoanBasicDetailsId', 'id') ||
        savedBasicId;
      if (nextBasicId) setSavedBasicId(nextBasicId);

      if (basicResult && typeof basicResult === 'object') {
        const mappedBasic = mapLoanBasicDetailsToForm(basicResult);
        setForm((current) => ({
          ...current,
          margin: mappedBasic.margin || current.margin,
          maturityDate: mappedBasic.maturityDate || current.maturityDate,
          totalDisbursements: mappedBasic.totalDisbursements || current.totalDisbursements,
        }));
      }

      const penaltyPayload = buildPenaltyPayload({
        form,
        agentCustomerId,
        applicationProductDetailsId,
        createdBy,
        existingId: savedPenaltyId,
      });
      const penaltyResult = savedPenaltyId
        ? await operationsLoanBasicDetailsService.updatePenalty(savedPenaltyId, penaltyPayload)
        : await operationsLoanBasicDetailsService.createPenalty(penaltyPayload);

      const nextPenaltyId =
        getRecordId(
          penaltyResult,
          'operationsOverduePenaltyDetailsId',
          'OperationsOverduePenaltyDetailsId',
          'id'
        ) || savedPenaltyId;
      if (nextPenaltyId) setSavedPenaltyId(nextPenaltyId);

      setSaveState({ saving: false, error: '', success: 'Loan basic details saved successfully.' });
      navigate(buildApplicationRoute(ROUTES.MAKER_FEES, applicationId));
    } catch (error) {
      if (error?.response?.status === 401) {
        window.location.assign(LOGIN_PATH);
        return;
      }
      setSaveState({
        saving: false,
        error: getApiErrorMessage(error, 'Unable to save loan basic details.'),
        success: '',
      });
    }
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
        {!applicationDataState.loading && !applicationDataState.error && applicationDataState.unavailable.length > 0 && (
          <div className="operations-state-card operations-state-card--error" role="alert">
            <p>{applicationDataState.unavailable.join(' ')}</p>
            <button type="button" className="operations-secondary-button" onClick={() => setAutoFillRequest((current) => current + 1)}>
              Retry
            </button>
          </div>
        )}
        {saveState.error && (
          <div className="operations-state-card operations-state-card--error" role="alert">
            <p>{saveState.error}</p>
          </div>
        )}
        {saveState.success && (
          <div className="operations-state-card" role="status">
            <p>{saveState.success}</p>
          </div>
        )}

        <form className="operations-loan-form" onSubmit={(event) => event.preventDefault()} noValidate>
          {SECTIONS.map((section) => (
              <section
                className={[
                  'operations-loan-section',
                  section.id === 'payment-details' ? 'operations-loan-section--payment-details' : '',
                ]
                  .join(' ')
                  .trim()}
                key={section.id}
              >
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

              {section.id === 'key-details' && (
                <div className="operations-disbursement-panel">
                  <div className="operations-loan-section-heading">
                    <div>
                      <h3>Disbursements</h3>
                      <p className="operations-disbursement-help">
                        Each disbursement is saved as a separate record. Total Disbursements comes from the backend.
                      </p>
                    </div>
                  </div>

                  <div className="operations-disbursement-form">
                    <label className="operations-loan-field">
                      <span className="operations-loan-field-label">Amount</span>
                      <input
                        className="operations-loan-control"
                        type="number"
                        value={disbursementDraft.amount}
                        onChange={(event) =>
                          setDisbursementDraft((current) => ({ ...current, amount: event.target.value }))
                        }
                      />
                    </label>
                    <label className="operations-loan-field">
                      <span className="operations-loan-field-label">Date</span>
                      <input
                        className="operations-loan-control"
                        type="date"
                        value={disbursementDraft.date}
                        onChange={(event) =>
                          setDisbursementDraft((current) => ({ ...current, date: event.target.value }))
                        }
                      />
                    </label>
                    <label className="operations-loan-field">
                      <span className="operations-loan-field-label">Remarks</span>
                      <input
                        className="operations-loan-control"
                        type="text"
                        value={disbursementDraft.remarks}
                        onChange={(event) =>
                          setDisbursementDraft((current) => ({ ...current, remarks: event.target.value }))
                        }
                      />
                    </label>
                    <div className="operations-disbursement-actions">
                      <button
                        type="button"
                        className="operations-loan-button operations-loan-button--primary"
                        onClick={handleSaveDisbursement}
                        disabled={disbursementBusy || saveState.saving}
                      >
                        {disbursementDraft.id ? <Pencil size={14} /> : <Plus size={14} />}
                        {disbursementDraft.id ? 'Update Disbursement' : 'Add Disbursement'}
                      </button>
                      {disbursementDraft.id && (
                        <button
                          type="button"
                          className="operations-loan-button operations-loan-button--secondary"
                          onClick={() => setDisbursementDraft({ id: null, amount: '', date: '', remarks: '' })}
                          disabled={disbursementBusy}
                        >
                          Cancel Edit
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="operations-disbursement-table-wrap">
                    <table className="operations-disbursement-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Amount</th>
                          <th>Remarks</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {disbursements.length === 0 ? (
                          <tr>
                            <td colSpan={4}>No disbursements saved yet.</td>
                          </tr>
                        ) : (
                          disbursements.map((row) => (
                            <tr key={row.id}>
                              <td>{row.date || '—'}</td>
                              <td>{row.amount != null ? row.amount : '—'}</td>
                              <td>{row.remarks || '—'}</td>
                              <td>
                                <div className="operations-disbursement-row-actions">
                                  <button
                                    type="button"
                                    className="operations-icon-button"
                                    onClick={() => handleEditDisbursement(row)}
                                    disabled={disbursementBusy}
                                    aria-label="Edit disbursement"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    className="operations-icon-button"
                                    onClick={() => handleDeleteDisbursement(row)}
                                    disabled={disbursementBusy}
                                    aria-label="Delete disbursement"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          ))}

          <footer className="operations-loan-footer">
            <div className="operations-loan-actions">
              <button type="button" className="operations-loan-button operations-loan-button--secondary" onClick={() => navigate(ROUTES.MAKER_DASHBOARD)}>
                <ArrowLeft size={16} />
                Back
              </button>
              <button
                type="button"
                className="operations-loan-button operations-loan-button--primary"
                onClick={handleSaveAndContinue}
                disabled={saveState.saving || applicationDataState.loading || disbursementBusy}
              >
                {saveState.saving ? 'Saving…' : 'Save & Continue'}
                <ArrowRight size={16} />
              </button>
            </div>
          </footer>
        </form>
      </div>
    </OperationsLayout>
  );
}
