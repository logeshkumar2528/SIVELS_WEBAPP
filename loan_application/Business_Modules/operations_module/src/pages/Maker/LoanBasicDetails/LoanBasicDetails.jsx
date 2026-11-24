import { ArrowLeft, ChevronRight, FileText, Save, Send, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../config/routeConfig';
import OperationsLayout from '../../../layouts/OperationsLayout';
import { mastersLookupService } from '../../../services/mastersLookupService';
import './LoanBasicDetails.css';

const WORKFLOW_STEPS = [
  { id: 'loan-basic-details', label: 'Loan Basic Details', active: true },
  { id: 'fees', label: 'Fees' },
  { id: 'covenants', label: 'Covenants' },
  { id: 'covenant-documents', label: 'Covenant Document Selection' },
  { id: 'mandate-details', label: 'Mandate Details' },
  { id: 'cheque-details', label: 'Cheque Details' },
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

const SECTIONS = [
  {
    id: 'key-details',
    title: 'Key Details',
    fields: [
      { name: 'division', label: 'Division', type: 'select', required: true, optionsKey: 'divisions' },
      { name: 'product', label: 'Loan Type', type: 'select', required: true },
      { name: 'currency', label: 'Currency', type: 'select', required: true, optionsKey: 'currencies' },
      { name: 'customerName', label: 'Customer', type: 'select', required: true },
      { name: 'loanStartDate', label: 'Loan Start Date', type: 'date', required: true },
      { name: 'disbursementAmount', label: 'First Disbursement Amount', type: 'number', required: true },
      { name: 'loanAmount', label: 'Loan Amount', type: 'number', required: true },
      { name: 'loanReferenceNumber', label: 'Loan Reference No.', type: 'text', required: true },
      { name: 'interestCapsBasis', label: 'Interest Days Basis', type: 'select', required: true, optionsKey: 'dayBases' },
      { name: 'branch', label: 'Loan Branch', type: 'select', required: true },
      { name: 'applicationRequestCode', label: 'Application Request Date', type: 'date' },
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
      { name: 'loanPurpose', label: 'Loan Purpose', type: 'select', required: true },
      { name: 'dsaDma', label: 'DSA / DMA', type: 'select' },
      { name: 'salesManager', label: 'Sales Manager', type: 'select' },
      { name: 'salesDepartment', label: 'Sales Department', type: 'select' },
      { name: 'applicationNumber', label: 'Application Number', type: 'text', required: true },
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
      { name: 'interestRate', label: 'Actual Interest Rate (%)', type: 'number', required: true },
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
      {field.type === 'select' ? (
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
  const [form, setForm] = useState(INITIAL_FORM);
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

        <header className="operations-loan-header">
          <div>
            <span className="operations-loan-eyebrow">APPLICATION WORKFLOW</span>
            <h1>Loan Basic Details</h1>
            <p>Enter and review the basic details for the selected loan application.</p>
          </div>
          <div className="operations-loan-application-badge">
            <FileText size={17} aria-hidden="true" />
            <span>Application details</span>
          </div>
        </header>

        <nav className="operations-loan-steps" aria-label="Application workflow steps">
          {WORKFLOW_STEPS.map((step, index) => (
            <button
              key={step.id}
              type="button"
              className={['operations-loan-step', step.active ? 'is-active' : ''].join(' ').trim()}
              aria-current={step.active ? 'step' : undefined}
              disabled={!step.active}
            >
              <span className="operations-loan-step-number">{index + 1}</span>
              <span>{step.label}</span>
            </button>
          ))}
        </nav>

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
