import { ArrowLeft, ChevronRight, FileText, Save, Send, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import backOfficeService from '../../../../../back_office/src/back-office/api/backOfficeService';
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
  loanPurpose: '',
  dsaDma: '',
  salesManager: '',
  loanFlagId: '',
  loanAmount: '',
  installmentCount: '',
  interestRateType: '',
  allowBpi: false,
  baseRate: '',
  scheduleMethod: '',
  interestFrequency: '',
  capitalizationFrequency: '',
  repaymentFrequency: '',
  maturityDate: '',
  bpiTreatment: '',
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
      { name: 'branch', label: 'Loan Branch', type: 'select', required: true, readOnly: true },
      { name: 'customerName', label: 'Customer', type: 'select', required: true, readOnly: true },
      { name: 'applicationRequestCode', label: 'Application Request Date', type: 'date', readOnly: true },
      { name: 'loanStartDate', label: 'Loan Start Date', type: 'date', required: true },
      { name: 'netLoanAmount', label: 'Net Loan Amount', type: 'number', required: true },
      { name: 'disbursementAmount', label: 'First Disbursement Amount', type: 'number', required: true },
      { name: 'totalDisbursements', label: 'Total Disbursements', type: 'number' },
      { name: 'loanAmount', label: 'Loan Amount', type: 'number', required: true, readOnly: true },
    ],
  },
  {
    id: 'quick-disbursement',
    title: 'Quick Disbursement / Loan Information',
    fields: [
      { name: 'repaymentMode', label: 'Payment Method', type: 'select', required: true, optionsKey: 'paymentMethods' },
      { name: 'salesExecutive', label: 'Sales Executive', type: 'select' },
      { name: 'dsaDma', label: 'DSA / DMA', type: 'select' },
      { name: 'sourcingType', label: 'Sourcing Type', type: 'select', required: true },
      { name: 'salesManager', label: 'Sales Manager', type: 'select' },
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
      { name: 'installmentCount', label: 'Number of Installments', type: 'number', required: true },
      { name: 'interestRateType', label: 'Interest Rate Type', type: 'select', required: true },
      { name: 'bpiTreatment', label: 'BPI Treatment', type: 'select', required: true },
      { name: 'allowBpi', label: 'Allow BPI', type: 'checkbox' },
      { name: 'interestRate', label: 'Actual Interest Rate (%)', type: 'number', required: true, readOnly: true },
      { name: 'baseRate', label: 'Base Rate (%)', type: 'number' },
      { name: 'margin', label: 'Margin (%)', type: 'number' },
      { name: 'scheduleMethod', label: 'Schedule Method', type: 'select', required: true },
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
      { name: 'maturityDate', label: 'Maturity Date', type: 'date', required: true },
    ],
  },
  {
    id: 'overdue-penalty-details',
    title: 'Overdue Penalty Details',
    fields: [
      { name: 'penaltyApplicable', label: 'Apply Overdue Penalty', type: 'checkbox' },
      { name: 'includeGraceDaysInPenaltyCalculation', label: 'Include Grace Days in Penalty Calculation', type: 'checkbox' },
      { name: 'penaltyType', label: 'Charge Type', type: 'select', required: true },
      { name: 'gracePeriodDays', label: 'Grace Days', type: 'number', required: true },
      { name: 'chargeCalculatedOn', label: 'Charge Calculated On', type: 'select', required: true },
      { name: 'penaltyRate', label: 'Charge Amount / %', type: 'number', required: true },
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

    const contextCustomerName = readValue(application, 'fullName', 'FullName');
    const contextApplicationNumber = readValue(application, 'appId', 'AppId');
    const loanType = readValue(application, 'loanProductName', 'LoanProductName');
    const appliedDate = dateInputValue(readValue(application, 'createdAt', 'CreatedAt'));
    const applicationDetails = {
      applicationProductDetailsId: readValue(application, 'applicationProductDetailsId', 'ApplicationProductDetailsId'),
      loanAccountNumber: readValue(application, 'loanAccountNumber', 'LoanAccountNumber') || '',
      operationsStatus: readValue(application, 'operationsStatus', 'OperationsStatus') || '',
      assignedMakerStaffId: readValue(application, 'assignedMakerStaffId', 'AssignedMakerStaffId'),
      profileImagePath: readValue(application, 'profileImagePath', 'ProfileImagePath') || '',
    };
    const contextPatch = {};
    if (contextCustomerName != null) contextPatch.customerName = String(contextCustomerName);
    if (contextApplicationNumber != null) contextPatch.applicationNumber = String(contextApplicationNumber);
    if (loanType != null && !/^\d+$/.test(String(loanType).trim())) contextPatch.product = String(loanType);
    if (appliedDate) contextPatch.applicationRequestCode = appliedDate;

    const emptyAutoFill = AUTO_FILL_FIELDS.reduce((values, field) => ({ ...values, [field]: '' }), {});
    autoFillIdsRef.current = {
      ...INITIAL_AUTO_FILL_IDS,
      customerId: agentCustomerId || null,
      ...applicationDetails,
    };
    setForm((current) => ({ ...current, ...emptyAutoFill, ...contextPatch }));

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
      ]);

      if (!isActive || requestId !== requestSequenceRef.current) return;

      const [productDetailsResult, creditDecisionResult, loanIdentifierResult] = results;
      const unavailable = [];
      const nextForm = {};
      const nextIds = {
        ...INITIAL_AUTO_FILL_IDS,
        customerId: agentCustomerId || null,
        ...applicationDetails,
      };

      if (contextCustomerName == null) unavailable.push('Customer details are unavailable; Customer remains empty.');

      if (productDetailsResult.status === 'fulfilled') {
        const productDetails = firstRecord(productDetailsResult.value);
        const returnedAgentCustomerId = readValue(productDetails, 'agentCustomerId', 'AgentCustomerId');
        const returnedApplicationProductDetailsId = readValue(
          productDetails,
          'applicationProductDetailsId',
          'ApplicationProductDetailsId'
        );
        const contextAgentCustomerId = readValue(application, 'agentCustomerId', 'AgentCustomerId') || agentCustomerId;
        const contextApplicationProductDetailsId = applicationDetails.applicationProductDetailsId;
        const hasMatchingApplication =
          sameIdentifier(returnedAgentCustomerId, contextAgentCustomerId) &&
          sameIdentifier(returnedApplicationProductDetailsId, contextApplicationProductDetailsId);

        if (hasMatchingApplication) {
          const loanPurposeName = readValue(productDetails, 'loanPurposeName', 'LoanPurposeName');
          nextIds.applicationProductDetailsId = returnedApplicationProductDetailsId;
          nextIds.loanPurposeId = readValue(productDetails, 'loanPurposeId', 'LoanPurposeId');
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
