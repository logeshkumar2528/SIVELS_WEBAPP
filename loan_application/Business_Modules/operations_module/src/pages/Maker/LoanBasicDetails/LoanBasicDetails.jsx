import { ArrowLeft, ChevronRight, FileText, Save, Send, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../config/routeConfig';
import OperationsLayout from '../../../layouts/OperationsLayout';
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
  customerId: '',
  loanStartDate: '',
  loanReferenceNumber: '',
  interestCapsBasis: '',
  applicationRequestCode: '',
  applicationDate: '',
  sanctionDate: '',
  branch: '',
  product: '',
  disbursementAmount: '',
  netLoanAmount: '',
  totalDisbursements: '',
  quickDisbursement: '',
  repaymentMode: '',
  salesExecutive: '',
  sourcingType: '',
  employeeName: '',
  loanPurpose: '',
  loanUsage: '',
  disbursementDate: '',
  dsaDma: '',
  salesManager: '',
  salesDepartment: '',
  takeover: false,
  renewal: false,
  loanAmount: '',
  tenureMonths: '',
  firstDueDate: '',
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
  advanceType: '',
  advanceBasis: '',
  emiAmount: '',
  bpiTreatment: '',
  interestRate: '',
  margin: '',
  nextInterestFrequencyDate: '',
  nextInterestReviewFrequencyDate: '',
  nextCapitalizationFrequencyDate: '',
  nextPaymentFrequencyDate: '',
  prepaymentAllowed: false,
  amountTreatment: '',
  paymentStartDate: '',
  paymentReference: '',
  penaltyApplicable: false,
  includeGraceDaysInPenaltyCalculation: false,
  penaltyType: '',
  chargeCalculatedOn: '',
  penaltyRate: '',
  gracePeriodDays: '',
  allowWaivers: false,
  maximumWaiverPercentage: '',
  maximumPenaltyAmount: '',
};

const SECTIONS = [
  {
    id: 'key-details',
    title: 'Key Details',
    description: 'Core application and customer information.',
    fields: [
      { name: 'division', label: 'Division', type: 'select', required: true },
      { name: 'product', label: 'Loan Type', type: 'select', required: true },
      { name: 'currency', label: 'Currency', type: 'select', required: true },
      { name: 'customerName', label: 'Customer', type: 'select', required: true },
      { name: 'loanStartDate', label: 'Loan Start Date', type: 'date', required: true },
      { name: 'disbursementAmount', label: 'First Disbursement Amount', type: 'number', required: true },
      { name: 'loanAmount', label: 'Loan Amount', type: 'number', required: true },
      { name: 'loanReferenceNumber', label: 'Loan Reference No.', type: 'text', required: true },
      { name: 'interestCapsBasis', label: 'Interest Caps Basis', type: 'select', required: true },
      { name: 'branch', label: 'Loan Branch', type: 'select', required: true },
      { name: 'applicationRequestCode', label: 'Application Request Code', type: 'text' },
      { name: 'netLoanAmount', label: 'Net Loan Amount', type: 'number', required: true },
      { name: 'totalDisbursements', label: 'Total Disbursements', type: 'number' },
      { name: 'customerId', label: 'Customer ID', type: 'text' },
      { name: 'applicationDate', label: 'Application Date', type: 'date' },
      { name: 'sanctionDate', label: 'Sanction Date', type: 'date' },
    ],
  },
  {
    id: 'quick-disbursement',
    title: 'Quick Disbursement / Loan Information',
    description: 'Loan terms and disbursement settings.',
    fields: [
      { name: 'quickDisbursement', label: 'Quick Disbursement', type: 'radio' },
      { name: 'repaymentMode', label: 'Payment Method', type: 'select', required: true },
      { name: 'salesExecutive', label: 'Sales Executive', type: 'select' },
      { name: 'sourcingType', label: 'Sourcing Type', type: 'select', required: true },
      { name: 'employeeName', label: 'Employee Name', type: 'select' },
      { name: 'loanPurpose', label: 'Loan Purpose', type: 'select', required: true },
      { name: 'loanUsage', label: 'Loan Usage', type: 'select' },
      { name: 'disbursementDate', label: 'Disbursement Date', type: 'date', required: true },
      { name: 'dsaDma', label: 'DSA / DMA', type: 'select' },
      { name: 'salesManager', label: 'Sales Manager', type: 'select' },
      { name: 'salesDepartment', label: 'Sales Department', type: 'select' },
      { name: 'applicationNumber', label: 'Application Number', type: 'text', required: true },
      { name: 'takeover', label: 'Takeover', type: 'checkbox' },
      { name: 'renewal', label: 'Renewal', type: 'checkbox' },
      { name: 'tenureMonths', label: 'Tenure (Months)', type: 'number' },
      { name: 'firstDueDate', label: 'First Due Date', type: 'date' },
    ],
  },
  {
    id: 'payment-details',
    title: 'Payment Details',
    description: 'Repayment setup and payment reference information.',
    fields: [
      { name: 'installmentCount', label: 'Number of Installments', type: 'number', required: true },
      { name: 'interestRateType', label: 'Interest Rate Type', type: 'select', required: true },
      { name: 'allowBpi', label: 'Allow BPI', type: 'checkbox' },
      { name: 'baseRate', label: 'Base Rate (%)', type: 'number' },
      { name: 'scheduleMethod', label: 'Schedule Method', type: 'select', required: true },
      { name: 'interestFrequency', label: 'Interest Frequency', type: 'select', required: true },
      { name: 'interestReviewFrequency', label: 'Interest Review Frequency', type: 'select', required: true },
      { name: 'capitalizationFrequency', label: 'Capitalization Frequency', type: 'select', required: true },
      { name: 'repaymentFrequency', label: 'Payment Frequency', type: 'select', required: true },
      { name: 'maturityDate', label: 'Maturity Date', type: 'date', required: true },
      { name: 'advanceType', label: 'Advance Type', type: 'select' },
      { name: 'advanceBasis', label: 'Advance Basis', type: 'select' },
      { name: 'emiAmount', label: 'EMI Amount', type: 'number' },
      { name: 'bpiTreatment', label: 'BPI Treatment', type: 'select', required: true },
      { name: 'interestRate', label: 'Actual Interest Rate (%)', type: 'number', required: true },
      { name: 'margin', label: 'Margin (%)', type: 'number' },
      { name: 'nextInterestFrequencyDate', label: 'Next Interest Frequency Date', type: 'date' },
      { name: 'nextInterestReviewFrequencyDate', label: 'Next Interest Review Frequency Date', type: 'date' },
      { name: 'nextCapitalizationFrequencyDate', label: 'Next Capitalization Frequency Date', type: 'date' },
      { name: 'nextPaymentFrequencyDate', label: 'Next Payment Frequency Date', type: 'date' },
      { name: 'prepaymentAllowed', label: 'Prepayment Allowed', type: 'checkbox' },
      { name: 'amountTreatment', label: 'Amount Treatment', type: 'select' },
      { name: 'paymentStartDate', label: 'Payment Start Date', type: 'date' },
      { name: 'paymentReference', label: 'Payment Reference / Account', type: 'text' },
    ],
  },
  {
    id: 'overdue-penalty-details',
    title: 'Overdue Penalty Details',
    description: 'Penalty settings supplied for this application.',
    fields: [
      { name: 'penaltyApplicable', label: 'Apply Overdue Penalty', type: 'checkbox' },
      { name: 'includeGraceDaysInPenaltyCalculation', label: 'Include Grace Days in Penalty Calculation', type: 'checkbox' },
      { name: 'penaltyType', label: 'Charge Type', type: 'select', required: true },
      { name: 'gracePeriodDays', label: 'Grace Days', type: 'number', required: true },
      { name: 'chargeCalculatedOn', label: 'Charge Calculated On', type: 'select', required: true },
      { name: 'penaltyRate', label: 'Charge Amount / %', type: 'number', required: true },
      { name: 'allowWaivers', label: 'Allow Waivers', type: 'checkbox' },
      { name: 'maximumWaiverPercentage', label: 'Max Waiver %', type: 'number' },
      { name: 'maximumPenaltyAmount', label: 'Maximum Penalty Amount', type: 'number' },
    ],
  },
];

function Field({ field, value, onChange }) {
  if (field.type === 'checkbox') {
    return (
      <label className="operations-loan-checkbox-field">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(field.name, event.target.checked)}
        />
        <span>{field.label}</span>
      </label>
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
                  <p>{section.description}</p>
                </div>
              </div>
              <div className="operations-loan-fields">
                {section.fields.map((field) => (
                  <Field
                    key={field.name}
                    field={field}
                    value={form[field.name]}
                    onChange={updateField}
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
