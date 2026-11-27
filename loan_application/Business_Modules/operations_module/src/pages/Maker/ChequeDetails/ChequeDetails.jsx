import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildApplicationRoute, ROUTES } from '../../../config/routeConfig';
import { useOperationsApplication } from '../../../context/OperationsApplicationContext';
import OperationsLayout from '../../../layouts/OperationsLayout';
import './ChequeDetails.css';

const WORKFLOW_STEPS = [
  { id: 'loan-basic-details', label: 'Loan Basic Details', route: ROUTES.MAKER_LOAN_BASIC_DETAILS },
  { id: 'fees', label: 'Fees', route: ROUTES.MAKER_FEES },
  { id: 'repayment-schedule', label: 'Repayment Schedule', route: ROUTES.MAKER_REPAYMENT_SCHEDULE },
  { id: 'covenants', label: 'Covenants', route: ROUTES.MAKER_COVENANTS },
  { id: 'mandate-details', label: 'Mandate Details', route: ROUTES.MAKER_MANDATE_DETAILS },
  { id: 'cheque-details', label: 'Cheque Details', active: true, route: ROUTES.MAKER_CHEQUE_DETAILS },
];

const INITIAL_FORM = {
  chequeType: '',
  micr: '',
  branch: null,
  city: '',
  accountType: '',
  ifsc: '',
  status: '',
  serialNumber: '',
  accountHolderName: '',
  accountNumber: '',
  chequeAmount: '',
  chequeCount: '',
};

const MASTER_COLLECTIONS = {
  chequeType: [],
  micr: [],
  branch: [],
  accountType: [],
  status: [],
};

const MAX_UI_BATCH_SIZE = 10000;

function createFrontendId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `frontend-cheque-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getMasterKey(record, index) {
  if (record && typeof record === 'object') return JSON.stringify(record);
  return String(record ?? index);
}

function getMasterLabel(record) {
  if (record == null || record === '') return '—';
  if (typeof record !== 'object') return String(record);
  return 'Master record';
}

function getMasterSearchText(record) {
  if (record == null) return '';
  if (typeof record !== 'object') return String(record).toLowerCase();
  return JSON.stringify(record).toLowerCase();
}

function normalizeSerial(serial) {
  return serial.replace(/^0+(?=\d)/, '');
}

function incrementDecimalString(serial) {
  const digits = serial.split('');
  let carry = 1;

  for (let index = digits.length - 1; index >= 0 && carry; index -= 1) {
    const nextDigit = Number(digits[index]) + carry;
    digits[index] = String(nextDigit % 10);
    carry = nextDigit > 9 ? 1 : 0;
  }

  return carry ? `1${digits.join('')}` : digits.join('');
}

function generateSerials(startSerial, count) {
  const serials = [];
  let current = startSerial;

  for (let index = 0; index < count; index += 1) {
    serials.push(current);
    current = incrementDecimalString(current);
  }

  return serials;
}

function amountToPaise(value) {
  if (!/^\d+(?:\.\d{1,2})?$/.test(String(value).trim())) return null;
  const [whole, fraction = ''] = String(value).trim().split('.');
  return (BigInt(whole) * 100n) + BigInt(fraction.padEnd(2, '0'));
}

function formatIndianInteger(value) {
  const digits = String(value);
  if (digits.length <= 3) return digits;
  const lastThree = digits.slice(-3);
  const leading = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${leading},${lastThree}`;
}

function formatIndianCurrency(paise) {
  const rupees = paise / 100n;
  const decimals = String(paise % 100n).padStart(2, '0');
  return `₹${formatIndianInteger(rupees)}.${decimals}`;
}

function validateGenerationForm(form, existingCheques) {
  const errors = {};
  const serial = form.serialNumber.trim();
  const accountNumber = form.accountNumber.trim();
  const amount = form.chequeAmount.trim();
  const countValue = form.chequeCount.trim();

  if (!serial) {
    errors.serialNumber = 'Cheque Serial No. is required.';
  } else if (!/^\d+$/.test(serial)) {
    errors.serialNumber = 'Cheque Serial No. must contain only numeric digits.';
  }

  if (!form.accountHolderName.trim()) {
    errors.accountHolderName = 'Account Holder Name is required.';
  }

  if (!accountNumber) {
    errors.accountNumber = 'Account Number is required.';
  }

  const paise = amountToPaise(amount);
  if (!amount) {
    errors.chequeAmount = 'Cheque Amount is required.';
  } else if (paise == null || paise <= 0n) {
    errors.chequeAmount = 'Cheque Amount must be a positive amount with up to two decimals.';
  }

  let count = 0;
  if (!countValue) {
    errors.chequeCount = 'No. of Cheques is required.';
  } else if (!/^\d+$/.test(countValue)) {
    errors.chequeCount = 'No. of Cheques must be a positive integer.';
  } else {
    count = Number(countValue);
    if (!Number.isSafeInteger(count) || count <= 0) {
      errors.chequeCount = 'No. of Cheques must be a safe positive integer.';
    } else if (count > MAX_UI_BATCH_SIZE) {
      errors.chequeCount = 'This generation request is too large for the browser UI.';
    }
  }

  if (Object.keys(errors).length > 0) return { errors, serials: [] };

  const serials = generateSerials(serial, count);
  const existingSerialsForAccount = new Set(
    existingCheques
      .filter((record) => record.accountNumber === accountNumber)
      .map((record) => normalizeSerial(record.serialNumber)),
  );
  const batchSerials = new Set();

  if (serials.some((candidate) => {
    const normalized = normalizeSerial(candidate);
    if (existingSerialsForAccount.has(normalized) || batchSerials.has(normalized)) return true;
    batchSerials.add(normalized);
    return false;
  })) {
    errors.serialNumber = 'One or more cheque serial numbers already exist for this account.';
  }

  return { errors, serials };
}

function FieldError({ message }) {
  return message ? <span className="operations-cheque-error">{message}</span> : null;
}

function WorkflowSteps({ navigate, applicationId }) {
  return (
    <nav className="operations-cheque-steps" aria-label="Application workflow steps">
      {WORKFLOW_STEPS.map((step, index) => (
        <button
          key={step.id}
          type="button"
          className={['operations-cheque-step', step.active ? 'is-active' : ''].join(' ').trim()}
          aria-current={step.active ? 'step' : undefined}
          disabled={!step.route}
          onClick={() => step.route && navigate(buildApplicationRoute(step.route, applicationId))}
        >
          <span className="operations-cheque-step-number">{index + 1}</span>
          <span>{step.label}</span>
        </button>
      ))}
    </nav>
  );
}

function SummaryField({ label, value = '—' }) {
  return (
    <div className="operations-cheque-summary-field">
      <span>{label}</span>
      <strong>{value || '—'}</strong>
    </div>
  );
}

function SectionHeading({ title, description, id }) {
  return (
    <div className="operations-cheque-section-heading">
      <div>
        <h2 id={id}>{title}</h2>
        {description && <p>{description}</p>}
      </div>
    </div>
  );
}

function DynamicSelect({ label, value, options, onChange, error, required = false, className = '' }) {
  return (
    <label className={['operations-cheque-field', className].join(' ').trim()}>
      <span className="operations-cheque-label">
        {label}{required && <span className="operations-cheque-required">*</span>}
      </span>
      <select
        className="operations-cheque-control"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
      >
        <option value="">Select</option>
        {options.map((option, index) => (
          <option key={getMasterKey(option, index)} value={getMasterKey(option, index)}>
            {getMasterLabel(option)}
          </option>
        ))}
      </select>
      <FieldError message={error} />
    </label>
  );
}

export default function ChequeDetails() {
  const navigate = useNavigate();
  const { applicationId, application } = useOperationsApplication();
  const fileInputRef = useRef(null);
  const fileTargetIdRef = useRef(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [cheques, setCheques] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [branchSearchTerm, setBranchSearchTerm] = useState('');
  const [temporaryBranch, setTemporaryBranch] = useState(null);
  const [branchCurrentPage, setBranchCurrentPage] = useState(1);
  const [branchPageSize, setBranchPageSize] = useState(5);
  const [fileTargetId, setFileTargetId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [deleteFrontendId, setDeleteFrontendId] = useState(null);

  const updateFormField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setValidationErrors((current) => (current[field] ? { ...current, [field]: '' } : current));
  };

  const branchRecords = MASTER_COLLECTIONS.branch;
  const filteredBranches = useMemo(() => {
    const query = branchSearchTerm.trim().toLowerCase();
    if (!query) return branchRecords;
    return branchRecords.filter((record) => getMasterSearchText(record).includes(query));
  }, [branchSearchTerm, branchRecords]);
  const branchTotalPages = Math.max(1, Math.ceil(filteredBranches.length / branchPageSize));
  const branchPageStart = (Math.min(branchCurrentPage, branchTotalPages) - 1) * branchPageSize;
  const visibleBranches = filteredBranches.slice(branchPageStart, branchPageStart + branchPageSize);

  const previewFile = preview?.file || null;
  useEffect(() => {
    if (!previewFile) {
      setPreviewUrl('');
      return undefined;
    }

    const nextUrl = URL.createObjectURL(previewFile);
    setPreviewUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [previewFile]);

  const totalCheques = cheques.length;
  const totalChequeAmountPaise = cheques.reduce(
    (total, record) => total + (amountToPaise(record.chequeAmount) || 0n),
    0n,
  );

  const clearForm = () => {
    setForm(INITIAL_FORM);
    setValidationErrors({});
  };

  const handleGenerate = (event) => {
    event.preventDefault();
    const result = validateGenerationForm(form, cheques);
    setValidationErrors(result.errors);
    if (Object.keys(result.errors).length > 0) return;

    const newRecords = result.serials.map((serialNumber) => ({
      frontendId: createFrontendId(),
      chequeType: form.chequeType || '',
      serialNumber,
      accountType: form.accountType || '',
      accountHolderName: form.accountHolderName,
      accountNumber: form.accountNumber,
      micr: form.micr || '',
      branch: form.branch,
      city: '',
      ifsc: form.ifsc,
      chequeAmount: form.chequeAmount,
      dueDate: '',
      status: form.status || '',
      document: null,
    }));

    setCheques((current) => [...current, ...newRecords]);
  };

  const updateChequeField = (frontendId, field, value) => {
    setCheques((current) => current.map((record) => (
      record.frontendId === frontendId ? { ...record, [field]: value } : record
    )));
  };

  const openBranchModal = () => {
    setTemporaryBranch(form.branch || null);
    setBranchSearchTerm('');
    setBranchCurrentPage(1);
    setIsBranchModalOpen(true);
  };

  const closeBranchModal = () => {
    setIsBranchModalOpen(false);
    setTemporaryBranch(null);
    setBranchSearchTerm('');
    setBranchCurrentPage(1);
  };

  const clearBranchModal = () => {
    setTemporaryBranch(null);
    setBranchSearchTerm('');
    setBranchCurrentPage(1);
  };

  const confirmBranchSelection = () => {
    if (temporaryBranch == null) return;
    updateFormField('branch', temporaryBranch);
    closeBranchModal();
  };

  const beginFileSelection = (frontendId) => {
    fileTargetIdRef.current = frontendId;
    setFileTargetId(frontendId);
    if (fileInputRef.current) fileInputRef.current.value = '';
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const frontendId = fileTargetIdRef.current || fileTargetId;
    const file = event.target.files?.[0] || null;
    if (!frontendId || !file) return;

    if (preview?.chequeId === frontendId) setPreview(null);
    setCheques((current) => current.map((record) => (
      record.frontendId === frontendId ? { ...record, document: file } : record
    )));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeDocument = (frontendId) => {
    if (preview?.chequeId === frontendId) setPreview(null);
    setCheques((current) => current.map((record) => (
      record.frontendId === frontendId ? { ...record, document: null } : record
    )));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openPreview = (record) => {
    if (!record.document) return;
    setPreview({ chequeId: record.frontendId, file: record.document });
  };

  const closePreview = () => setPreview(null);

  const confirmDelete = () => {
    if (!deleteFrontendId) return;
    if (preview?.chequeId === deleteFrontendId) setPreview(null);
    setCheques((current) => current.filter((record) => record.frontendId !== deleteFrontendId));
    setDeleteFrontendId(null);
  };

  const previewRecord = preview ? cheques.find((record) => record.frontendId === preview.chequeId) : null;
  const previewIsPdf = previewFile?.type === 'application/pdf' || previewFile?.name?.toLowerCase().endsWith('.pdf');
  const previewIsImage = previewFile?.type?.startsWith('image/');
  const deleteRecord = cheques.find((record) => record.frontendId === deleteFrontendId);

  return (
    <OperationsLayout title="Cheque Details" subtitle="Operations Maker workflow">
      <div className="operations-cheque-page">
        <nav className="operations-cheque-breadcrumb" aria-label="Breadcrumb">
          <button type="button" onClick={() => navigate(ROUTES.MAKER_DASHBOARD)}>Operations Maker</button>
          <span aria-hidden="true">/</span>
          <span>Cheque Details</span>
        </nav>

        <WorkflowSteps navigate={navigate} applicationId={applicationId} />

        <div className="operations-cheque-summary-grid">
          <section className="operations-cheque-panel" aria-labelledby="operations-cheque-loan-summary-title">
            <SectionHeading id="operations-cheque-loan-summary-title" title="Loan Information" />
            <div className="operations-cheque-summary-fields">
              <SummaryField label="Loan Type" />
              <SummaryField label="Schedule Method" />
              <SummaryField label="Loan Reference" />
              <SummaryField label="Grace Period End Date" />
            </div>
          </section>

          <section className="operations-cheque-panel" aria-labelledby="operations-cheque-details-summary-title">
            <SectionHeading id="operations-cheque-details-summary-title" title="Cheque Details" />
            <div className="operations-cheque-summary-fields">
              <SummaryField label="Currency" />
              <SummaryField label="Interest Days Basis" />
              <SummaryField label="Customer Name" value={application?.fullName || '—'} />
            </div>
            <div className="operations-cheque-log-actions">
              <button type="button" className="operations-cheque-button operations-cheque-button--secondary" disabled title="Activity Log is not connected yet.">Activity Log</button>
              <button type="button" className="operations-cheque-button operations-cheque-button--secondary" disabled title="Reason Details Log is not connected yet.">Reason Details Log</button>
            </div>
          </section>
        </div>

        <div className="operations-cheque-total-grid" aria-label="Cheque totals">
          <div className="operations-cheque-total-card">
            <span>Total No. of Cheques</span>
            <strong>{totalCheques}</strong>
          </div>
          <div className="operations-cheque-total-card">
            <span>Total Cheque Amount</span>
            <strong>{formatIndianCurrency(totalChequeAmountPaise)}</strong>
          </div>
        </div>

        <section className="operations-cheque-panel" aria-labelledby="operations-cheque-generation-title">
          <SectionHeading id="operations-cheque-generation-title" title="Cheque Generation" description="Create local frontend drafts. Master-backed fields may remain unresolved until integration." />
          <form className="operations-cheque-generation-form" onSubmit={handleGenerate} noValidate>
            <DynamicSelect label="Type of Cheque" value={form.chequeType} options={MASTER_COLLECTIONS.chequeType} onChange={(value) => updateFormField('chequeType', value)} />
            <DynamicSelect label="MICR" value={form.micr} options={MASTER_COLLECTIONS.micr} onChange={(value) => updateFormField('micr', value)} />
            <div className="operations-cheque-field">
              <span className="operations-cheque-label">Branch</span>
              <div className="operations-cheque-selection-control">
                <span className={form.branch ? 'has-value' : ''}>{form.branch ? getMasterLabel(form.branch) : 'Select Branch'}</span>
                <button type="button" className="operations-cheque-icon-button" onClick={openBranchModal} aria-label="Search Branch" title="Search Branch"><Search size={16} aria-hidden="true" /></button>
              </div>
            </div>
            <label className="operations-cheque-field">
              <span className="operations-cheque-label">City</span>
              <input className="operations-cheque-control" type="text" value={form.city} readOnly placeholder="—" />
            </label>
            <DynamicSelect label="Account Type" value={form.accountType} options={MASTER_COLLECTIONS.accountType} onChange={(value) => updateFormField('accountType', value)} />
            <label className="operations-cheque-field">
              <span className="operations-cheque-label">IFSC</span>
              <input className="operations-cheque-control" type="text" value={form.ifsc} onChange={(event) => updateFormField('ifsc', event.target.value)} />
            </label>
            <DynamicSelect label="Status" value={form.status} options={MASTER_COLLECTIONS.status} onChange={(value) => updateFormField('status', value)} />
            <label className="operations-cheque-field">
              <span className="operations-cheque-label">Cheque Serial No.<span className="operations-cheque-required">*</span></span>
              <input className="operations-cheque-control" type="text" value={form.serialNumber} onChange={(event) => updateFormField('serialNumber', event.target.value)} aria-invalid={Boolean(validationErrors.serialNumber)} />
              <FieldError message={validationErrors.serialNumber} />
            </label>
            <label className="operations-cheque-field">
              <span className="operations-cheque-label">Account Holder Name<span className="operations-cheque-required">*</span></span>
              <input className="operations-cheque-control" type="text" value={form.accountHolderName} onChange={(event) => updateFormField('accountHolderName', event.target.value)} aria-invalid={Boolean(validationErrors.accountHolderName)} />
              <FieldError message={validationErrors.accountHolderName} />
            </label>
            <label className="operations-cheque-field">
              <span className="operations-cheque-label">Account Number<span className="operations-cheque-required">*</span></span>
              <input className="operations-cheque-control" type="text" value={form.accountNumber} onChange={(event) => updateFormField('accountNumber', event.target.value)} aria-invalid={Boolean(validationErrors.accountNumber)} />
              <FieldError message={validationErrors.accountNumber} />
            </label>
            <label className="operations-cheque-field">
              <span className="operations-cheque-label">Cheque Amount (₹)<span className="operations-cheque-required">*</span></span>
              <input className="operations-cheque-control" type="text" inputMode="decimal" value={form.chequeAmount} onChange={(event) => updateFormField('chequeAmount', event.target.value)} aria-invalid={Boolean(validationErrors.chequeAmount)} />
              <FieldError message={validationErrors.chequeAmount} />
            </label>
            <label className="operations-cheque-field">
              <span className="operations-cheque-label">No. of Cheques<span className="operations-cheque-required">*</span></span>
              <input className="operations-cheque-control" type="text" inputMode="numeric" value={form.chequeCount} onChange={(event) => updateFormField('chequeCount', event.target.value)} aria-invalid={Boolean(validationErrors.chequeCount)} />
              <FieldError message={validationErrors.chequeCount} />
            </label>
            <div className="operations-cheque-generation-actions">
              <button type="button" className="operations-cheque-button operations-cheque-button--secondary" onClick={clearForm}>Clear</button>
              <button type="submit" className="operations-cheque-button operations-cheque-button--primary"><Plus size={15} aria-hidden="true" /> Generate</button>
            </div>
          </form>
        </section>

        <section className="operations-cheque-panel" aria-labelledby="operations-cheque-list-title">
          <SectionHeading id="operations-cheque-list-title" title="Cheque List" description="Local frontend drafts only. Permanent saving is not connected." />
          <input ref={fileInputRef} className="operations-cheque-hidden-file-input" type="file" onChange={handleFileChange} aria-label="Select cheque document" />
          <div className="operations-cheque-table-wrap">
            <table className="operations-cheque-table">
              <colgroup>
                <col className="operations-cheque-col--type" />
                <col className="operations-cheque-col--serial" />
                <col className="operations-cheque-col--account-type" />
                <col className="operations-cheque-col--holder" />
                <col className="operations-cheque-col--account-number" />
                <col className="operations-cheque-col--ifsc" />
                <col className="operations-cheque-col--due-date" />
                <col className="operations-cheque-col--due" />
                <col className="operations-cheque-col--amount" />
                <col className="operations-cheque-col--status" />
                <col className="operations-cheque-col--action" />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">Type</th>
                  <th scope="col">Serial No.</th>
                  <th scope="col">A/c Type</th>
                  <th scope="col">A/c Holder Name</th>
                  <th scope="col">A/c No.</th>
                  <th scope="col">IFSC Code</th>
                  <th scope="col">Due Date</th>
                  <th scope="col">Due</th>
                  <th scope="col">Cheque Amount</th>
                  <th scope="col">Status</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {cheques.length === 0 ? (
                  <tr><td colSpan={11} className="operations-cheque-empty-state">No cheque records available.</td></tr>
                ) : cheques.map((record) => (
                  <tr key={record.frontendId}>
                    <td>{getMasterLabel(record.chequeType)}</td>
                    <td className="operations-cheque-cell--serial">{record.serialNumber}</td>
                    <td>
                      <select className="operations-cheque-row-control" value={record.accountType} onChange={(event) => updateChequeField(record.frontendId, 'accountType', event.target.value)} aria-label={`Account type for cheque ${record.serialNumber}`}>
                        <option value="">—</option>
                        {MASTER_COLLECTIONS.accountType.map((option, index) => <option key={getMasterKey(option, index)} value={getMasterKey(option, index)}>{getMasterLabel(option)}</option>)}
                      </select>
                    </td>
                    <td className="operations-cheque-cell--wrap">{record.accountHolderName}</td>
                    <td className="operations-cheque-cell--string">{record.accountNumber}</td>
                    <td>{record.ifsc || '—'}</td>
                    <td><input className="operations-cheque-row-control" type="date" value={record.dueDate} onChange={(event) => updateChequeField(record.frontendId, 'dueDate', event.target.value)} aria-label={`Due date for cheque ${record.serialNumber}`} /></td>
                    <td>—</td>
                    <td className="operations-cheque-cell--amount">{formatIndianCurrency(amountToPaise(record.chequeAmount) || 0n)}</td>
                    <td>
                      <select className="operations-cheque-row-control" value={record.status} onChange={(event) => updateChequeField(record.frontendId, 'status', event.target.value)} aria-label={`Status for cheque ${record.serialNumber}`}>
                        <option value="">—</option>
                        {MASTER_COLLECTIONS.status.map((option, index) => <option key={getMasterKey(option, index)} value={getMasterKey(option, index)}>{getMasterLabel(option)}</option>)}
                      </select>
                    </td>
                    <td className="operations-cheque-actions-cell">
                      <span className="operations-cheque-document-name" title={record.document?.name || ''}>{record.document?.name || ''}</span>
                      <button type="button" className="operations-cheque-row-action" onClick={() => beginFileSelection(record.frontendId)} aria-label={`Upload or replace document for cheque ${record.serialNumber}`} title="Upload or replace document"><Upload size={15} aria-hidden="true" /></button>
                      <button type="button" className="operations-cheque-row-action" onClick={() => openPreview(record)} disabled={!record.document} aria-label={`View document for cheque ${record.serialNumber}`} title="View document"><Eye size={15} aria-hidden="true" /></button>
                      <button type="button" className="operations-cheque-row-action operations-cheque-row-action--danger" onClick={() => removeDocument(record.frontendId)} disabled={!record.document} aria-label={`Remove document for cheque ${record.serialNumber}`} title="Remove document"><X size={15} aria-hidden="true" /></button>
                      <button type="button" className="operations-cheque-row-action operations-cheque-row-action--danger" onClick={() => setDeleteFrontendId(record.frontendId)} aria-label={`Delete cheque ${record.serialNumber}`} title="Delete cheque"><Trash2 size={15} aria-hidden="true" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="operations-cheque-footer">
          <div className="operations-cheque-footer-status"><span>Overall Status</span><strong>—</strong></div>
          <div className="operations-cheque-footer-actions">
            <button type="button" className="operations-cheque-button operations-cheque-button--secondary" disabled title="Notes are not connected yet.">Notes</button>
            <button type="button" className="operations-cheque-button operations-cheque-button--secondary" disabled title="Activity Log is not connected yet.">Activity Log</button>
            <select className="operations-cheque-save-submit-select" disabled defaultValue="" aria-label="Save or submit action"><option value="">Save / Submit</option></select>
            <button type="button" className="operations-cheque-button operations-cheque-button--secondary" disabled title="Save is not connected yet.">Save</button>
            <button type="button" className="operations-cheque-button operations-cheque-button--primary" disabled title="Submit is not connected yet.">Submit</button>
            <button type="button" className="operations-cheque-button operations-cheque-button--secondary" disabled title="Page close destination is not confirmed.">Close</button>
          </div>
        </footer>

        {isBranchModalOpen && (
          <div className="operations-cheque-modal-overlay" role="presentation">
            <div className="operations-cheque-modal" role="dialog" aria-modal="true" aria-labelledby="operations-cheque-branch-modal-title">
              <div className="operations-cheque-modal-header">
                <h2 id="operations-cheque-branch-modal-title">Select Branch</h2>
                <button type="button" className="operations-cheque-modal-close" onClick={closeBranchModal} aria-label="Close branch selection"><X size={18} aria-hidden="true" /></button>
              </div>
              <div className="operations-cheque-modal-body">
                <div className="operations-cheque-modal-search">
                  <Search size={16} aria-hidden="true" />
                  <input type="search" value={branchSearchTerm} onChange={(event) => { setBranchSearchTerm(event.target.value); setBranchCurrentPage(1); }} placeholder="Search branch" aria-label="Search branch" />
                  {branchSearchTerm && <button type="button" onClick={() => { setBranchSearchTerm(''); setBranchCurrentPage(1); }} aria-label="Clear branch search"><X size={15} aria-hidden="true" /></button>}
                </div>
                <div className="operations-cheque-modal-table-wrap">
                  <table className="operations-cheque-modal-table">
                    <thead><tr><th scope="col">Select</th><th scope="col">#</th><th scope="col">Branch</th></tr></thead>
                    <tbody>
                      {visibleBranches.length === 0 ? (
                        <tr><td colSpan={3} className="operations-cheque-modal-empty-state">No branch records available.</td></tr>
                      ) : visibleBranches.map((record, index) => {
                        const recordKey = getMasterKey(record, branchPageStart + index);
                        const isSelected = temporaryBranch != null
                          && getMasterKey(temporaryBranch, branchPageStart + index) === recordKey;
                        return (
                          <tr className={isSelected ? 'is-selected' : ''} key={recordKey}>
                            <td><input type="radio" name="cheque-branch-selection" checked={isSelected} onChange={() => setTemporaryBranch(record)} aria-label={`Select ${getMasterLabel(record)}`} /></td>
                            <td>{branchPageStart + index + 1}</td>
                            <td>{getMasterLabel(record)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="operations-cheque-modal-pagination">
                  <span>{filteredBranches.length === 0 ? 'Showing 0 entries.' : `Showing ${branchPageStart + 1} to ${Math.min(branchPageStart + branchPageSize, filteredBranches.length)} of ${filteredBranches.length} entries.`}</span>
                  <div className="operations-cheque-pagination-controls">
                    <label><span>Rows</span><select value={branchPageSize} onChange={(event) => { setBranchPageSize(Number(event.target.value)); setBranchCurrentPage(1); }} aria-label="Branch rows per page"><option value="5">5</option><option value="10">10</option><option value="25">25</option></select></label>
                    <button type="button" onClick={() => setBranchCurrentPage((current) => Math.max(1, current - 1))} disabled={branchCurrentPage <= 1} aria-label="Previous branch page"><ChevronLeft size={15} aria-hidden="true" /></button>
                    <span>Page {Math.min(branchCurrentPage, branchTotalPages)} of {branchTotalPages}</span>
                    <button type="button" onClick={() => setBranchCurrentPage((current) => Math.min(branchTotalPages, current + 1))} disabled={branchCurrentPage >= branchTotalPages} aria-label="Next branch page"><ChevronRight size={15} aria-hidden="true" /></button>
                  </div>
                </div>
              </div>
              <div className="operations-cheque-modal-footer">
                <button type="button" className="operations-cheque-button operations-cheque-button--secondary" onClick={clearBranchModal}>Clear</button>
                <div>
                  <button type="button" className="operations-cheque-button operations-cheque-button--secondary" onClick={closeBranchModal}>Close</button>
                  <button type="button" className="operations-cheque-button operations-cheque-button--primary" onClick={confirmBranchSelection} disabled={temporaryBranch == null}>OK</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {preview && previewUrl && previewRecord && (
          <div className="operations-cheque-modal-overlay" role="presentation">
            <div className="operations-cheque-preview-modal" role="dialog" aria-modal="true" aria-labelledby="operations-cheque-preview-title">
              <div className="operations-cheque-modal-header">
                <div>
                  <h2 id="operations-cheque-preview-title">Cheque Document</h2>
                  <p>Cheque {previewRecord.serialNumber} · {previewFile.name}</p>
                </div>
                <button type="button" className="operations-cheque-modal-close" onClick={closePreview} aria-label="Close cheque document preview"><X size={18} aria-hidden="true" /></button>
              </div>
              <div className="operations-cheque-preview-area">
                {previewIsPdf && <iframe src={previewUrl} title="Cheque Document" />}
                {previewIsImage && <img src={previewUrl} alt={previewFile.name} />}
                {!previewIsPdf && !previewIsImage && <p>Preview is not available for this file type.</p>}
              </div>
              <div className="operations-cheque-modal-footer operations-cheque-preview-footer"><button type="button" className="operations-cheque-button operations-cheque-button--secondary" onClick={closePreview}>Close</button></div>
            </div>
          </div>
        )}

        {deleteRecord && (
          <div className="operations-cheque-modal-overlay" role="presentation">
            <div className="operations-cheque-confirmation" role="dialog" aria-modal="true" aria-labelledby="operations-cheque-delete-title">
              <div className="operations-cheque-modal-header">
                <h2 id="operations-cheque-delete-title">Delete Cheque</h2>
                <button type="button" className="operations-cheque-modal-close" onClick={() => setDeleteFrontendId(null)} aria-label="Close delete confirmation"><X size={18} aria-hidden="true" /></button>
              </div>
              <p>Remove cheque {deleteRecord.serialNumber} from the local Cheque List?</p>
              <div className="operations-cheque-modal-footer operations-cheque-confirmation-footer">
                <button type="button" className="operations-cheque-button operations-cheque-button--secondary" onClick={() => setDeleteFrontendId(null)}>Cancel</button>
                <button type="button" className="operations-cheque-button operations-cheque-button--danger" onClick={confirmDelete}>Delete Cheque</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </OperationsLayout>
  );
}
