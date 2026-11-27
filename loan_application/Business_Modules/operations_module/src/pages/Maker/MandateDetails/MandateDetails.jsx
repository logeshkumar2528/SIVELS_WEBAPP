import {
  ChevronLeft,
  ChevronRight,
  Eye,
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
import './MandateDetails.css';

const WORKFLOW_STEPS = [
  { id: 'loan-basic-details', label: 'Loan Basic Details', route: ROUTES.MAKER_LOAN_BASIC_DETAILS },
  { id: 'fees', label: 'Fees', route: ROUTES.MAKER_FEES },
  { id: 'repayment-schedule', label: 'Repayment Schedule', route: ROUTES.MAKER_REPAYMENT_SCHEDULE },
  { id: 'covenants', label: 'Covenants', route: ROUTES.MAKER_COVENANTS },
  { id: 'mandate-details', label: 'Mandate Details', active: true, route: ROUTES.MAKER_MANDATE_DETAILS },
  { id: 'cheque-details', label: 'Cheque Details', route: ROUTES.MAKER_CHEQUE_DETAILS },
];

const INITIAL_FORM = {
  mandateId: '',
  customer: null,
  entityCode: '',
  loanReference: '',
  mandateType: '',
  branch: null,
  bank: '',
  city: '',
  micr: '',
  ifsc: '',
  accountNumber: '',
  accountType: '',
  accountHolderName: '',
  jointAccountHolderName: '',
  maxLimit: '',
  amountInWords: '',
  openMandate: false,
  startDate: '',
  expiryDate: '',
  frequency: '',
  periodicity: '',
  day: '',
  contactNumber: '',
  inputDate: '',
  partnerBank: null,
  active: false,
  status: '',
  reason: '',
  umrnNumber: '',
  swap: false,
  registrationStatus: '',
};

const MASTER_COLLECTIONS = {
  customer: [],
  mandateType: [],
  branch: [],
  accountType: [],
  frequency: [],
  periodicity: [],
  day: [],
  partnerBank: [],
  status: [],
};

const MASTER_POPUPS = {
  customer: { title: 'Select Customer', field: 'customer', label: 'Customer' },
  branch: { title: 'Select Branch', field: 'branch', label: 'Branch' },
  partnerBank: { title: 'Select Partner Bank', field: 'partnerBank', label: 'Partner Bank' },
};

const REQUIRED_FIELDS = [
  ['mandateId', 'Mandate ID'],
  ['customer', 'Customer'],
  ['entityCode', 'Entity Code'],
  ['loanReference', 'Loan Reference'],
  ['mandateType', 'Mandate Type'],
  ['branch', 'Branch'],
  ['bank', 'Bank'],
  ['city', 'City'],
  ['micr', 'MICR'],
  ['ifsc', 'IFSC'],
  ['accountNumber', 'Account Number'],
  ['accountType', 'Account Type'],
  ['accountHolderName', 'Account Holder Name'],
  ['maxLimit', 'Max Limit'],
  ['startDate', 'Start Date'],
  ['inputDate', 'Input Date'],
  ['partnerBank', 'Partner Bank'],
  ['status', 'Status'],
];

function getRecordKey(record, index) {
  if (record && typeof record === 'object') return JSON.stringify(record);
  return String(record ?? index);
}

function getRecordLabel(record) {
  if (record == null) return '';
  if (typeof record !== 'object') return String(record);
  return 'Master record';
}

function getRecordSearchText(record) {
  if (record == null) return '';
  if (typeof record !== 'object') return String(record).toLowerCase();
  return JSON.stringify(record).toLowerCase();
}

function FieldError({ message }) {
  return message ? <span className="operations-mandate-error">{message}</span> : null;
}

function WorkflowSteps({ navigate, applicationId }) {
  return (
    <nav className="operations-mandate-steps" aria-label="Application workflow steps">
      {WORKFLOW_STEPS.map((step, index) => (
        <button
          key={step.id}
          type="button"
          className={['operations-mandate-step', step.active ? 'is-active' : ''].join(' ').trim()}
          disabled={!step.route}
          onClick={() => step.route && navigate(buildApplicationRoute(step.route, applicationId))}
        >
          <span className="operations-mandate-step-number">{index + 1}</span>
          <span>{step.label}</span>
        </button>
      ))}
    </nav>
  );
}

function SectionHeading({ number, title, id }) {
  return (
    <div className="operations-mandate-section-heading">
      <span className="operations-mandate-section-number">{number}</span>
      <h2 id={id}>{title}</h2>
    </div>
  );
}

function TextField({ label, name, value, onChange, error, type = 'text', readOnly = false, required = false, className = '' }) {
  return (
    <label className={['operations-mandate-field', className].join(' ').trim()}>
      <span className="operations-mandate-label">
        {label}{required && <span className="operations-mandate-required">*</span>}
      </span>
      <input
        className="operations-mandate-control"
        type={type}
        value={value}
        readOnly={readOnly}
        step={type === 'number' ? '0.01' : undefined}
        onChange={(event) => onChange(name, event.target.value)}
        aria-invalid={Boolean(error)}
      />
      <FieldError message={error} />
    </label>
  );
}

function DynamicSelect({ label, name, value, options, onChange, error, required = false, className = '' }) {
  return (
    <label className={['operations-mandate-field', className].join(' ').trim()}>
      <span className="operations-mandate-label">
        {label}{required && <span className="operations-mandate-required">*</span>}
      </span>
      <select
        className="operations-mandate-control"
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        aria-invalid={Boolean(error)}
      >
        <option value="">Select</option>
        {options.map((option, index) => (
          <option key={getRecordKey(option, index)} value={getRecordKey(option, index)}>
            {getRecordLabel(option)}
          </option>
        ))}
      </select>
      <FieldError message={error} />
    </label>
  );
}

function CheckboxField({ label, name, value, onChange, className = '' }) {
  return (
    <label className={['operations-mandate-checkbox-field', className].join(' ').trim()}>
      <input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(name, event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export default function MandateDetails() {
  const navigate = useNavigate();
  const { applicationId } = useOperationsApplication();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [validationErrors, setValidationErrors] = useState({});
  const [masterModalType, setMasterModalType] = useState(null);
  const [masterSearchTerm, setMasterSearchTerm] = useState('');
  const [masterTemporarySelection, setMasterTemporarySelection] = useState(null);
  const [masterCurrentPage, setMasterCurrentPage] = useState(1);
  const [masterPageSize, setMasterPageSize] = useState(5);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [documentPreviewUrl, setDocumentPreviewUrl] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setValidationErrors((current) => (current[field] ? { ...current, [field]: '' } : current));
  };

  const validateForm = () => {
    const errors = {};
    REQUIRED_FIELDS.forEach(([field, label]) => {
      const value = form[field];
      const isEmpty = value == null || (typeof value === 'string' && value.trim() === '');
      if (isEmpty) errors[field] = `${label} is required.`;
    });
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    validateForm();
  };

  const clearDocument = () => {
    setIsPreviewOpen(false);
    setSelectedDocument(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDocumentChange = (event) => {
    const nextFile = event.target.files?.[0] || null;
    if (!nextFile) return;
    setIsPreviewOpen(false);
    setSelectedDocument(nextFile);
  };

  useEffect(() => {
    if (!selectedDocument) {
      setDocumentPreviewUrl('');
      return undefined;
    }

    const nextUrl = URL.createObjectURL(selectedDocument);
    setDocumentPreviewUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [selectedDocument]);

  const openMasterModal = (type) => {
    setMasterModalType(type);
    setMasterSearchTerm('');
    setMasterCurrentPage(1);
    setMasterTemporarySelection(form[type] || null);
  };

  const closeMasterModal = () => {
    setMasterModalType(null);
    setMasterSearchTerm('');
    setMasterTemporarySelection(null);
    setMasterCurrentPage(1);
  };

  const clearMasterModal = () => {
    setMasterTemporarySelection(null);
    setMasterSearchTerm('');
    setMasterCurrentPage(1);
  };

  const confirmMasterSelection = () => {
    if (!masterModalType || masterTemporarySelection == null) return;
    updateField(masterModalType, masterTemporarySelection);
    closeMasterModal();
  };

  const activeMasterPopup = masterModalType ? MASTER_POPUPS[masterModalType] : null;
  const masterRecords = masterModalType ? MASTER_COLLECTIONS[masterModalType] : [];
  const filteredMasterRecords = useMemo(() => {
    const search = masterSearchTerm.trim().toLowerCase();
    if (!search) return masterRecords;
    return masterRecords.filter((record) => getRecordSearchText(record).includes(search));
  }, [masterModalType, masterRecords, masterSearchTerm]);
  const masterTotalPages = Math.max(1, Math.ceil(filteredMasterRecords.length / masterPageSize));
  const masterPageStart = (Math.min(masterCurrentPage, masterTotalPages) - 1) * masterPageSize;
  const visibleMasterRecords = filteredMasterRecords.slice(masterPageStart, masterPageStart + masterPageSize);

  const previewIsPdf = selectedDocument?.type === 'application/pdf' || selectedDocument?.name?.toLowerCase().endsWith('.pdf');
  const previewIsImage = selectedDocument?.type?.startsWith('image/');

  const handleClear = () => {
    setForm(INITIAL_FORM);
    setValidationErrors({});
    clearDocument();
  };

  const renderSelectionField = (label, field, error, required) => (
    <div className="operations-mandate-field">
      <span className="operations-mandate-label">
        {label}{required && <span className="operations-mandate-required">*</span>}
      </span>
      <div className={['operations-mandate-selection-control', error ? 'has-error' : ''].join(' ').trim()}>
        <span className={form[field] ? 'has-value' : ''}>
          {form[field] ? getRecordLabel(form[field]) : `Select ${label}`}
        </span>
        <button type="button" className="operations-mandate-icon-button" onClick={() => openMasterModal(field)} aria-label={`Search ${label}`} title={`Search ${label}`}>
          <Search size={16} aria-hidden="true" />
        </button>
      </div>
      <FieldError message={error} />
    </div>
  );

  return (
    <OperationsLayout title="Mandate Details" subtitle="Operations Maker workflow">
      <div className="operations-mandate-page">
        <nav className="operations-mandate-breadcrumb" aria-label="Breadcrumb">
          <button type="button" onClick={() => navigate(ROUTES.MAKER_DASHBOARD)}>Operations Maker</button>
          <span aria-hidden="true">/</span>
          <span>Mandate Details</span>
        </nav>

        <WorkflowSteps navigate={navigate} applicationId={applicationId} />

        <form className="operations-mandate-form" onSubmit={handleSubmit} noValidate>
          <section className="operations-mandate-section" aria-labelledby="operations-mandate-information-title">
            <SectionHeading number="01" title="Mandate Information" id="operations-mandate-information-title" />
            <div className="operations-mandate-grid">
              <TextField label="Mandate ID" name="mandateId" value={form.mandateId} onChange={updateField} error={validationErrors.mandateId} required readOnly />
              {renderSelectionField('Customer', 'customer', validationErrors.customer, true)}
              <TextField label="Entity Code" name="entityCode" value={form.entityCode} onChange={updateField} error={validationErrors.entityCode} required />
              <TextField label="Loan Reference" name="loanReference" value={form.loanReference} onChange={updateField} error={validationErrors.loanReference} required />
              <DynamicSelect label="Mandate Type" name="mandateType" value={form.mandateType} options={MASTER_COLLECTIONS.mandateType} onChange={updateField} error={validationErrors.mandateType} required />
            </div>
          </section>

          <section className="operations-mandate-section" aria-labelledby="operations-mandate-bank-title">
            <SectionHeading number="02" title="Bank Details" id="operations-mandate-bank-title" />
            <div className="operations-mandate-grid">
              {renderSelectionField('Branch', 'branch', validationErrors.branch, true)}
              <TextField label="Bank" name="bank" value={form.bank} onChange={updateField} error={validationErrors.bank} required />
              <TextField label="City" name="city" value={form.city} onChange={updateField} error={validationErrors.city} required />
              <TextField label="MICR" name="micr" value={form.micr} onChange={updateField} error={validationErrors.micr} required />
              <TextField label="IFSC" name="ifsc" value={form.ifsc} onChange={updateField} error={validationErrors.ifsc} required />
            </div>
          </section>

          <section className="operations-mandate-section" aria-labelledby="operations-mandate-account-title">
            <SectionHeading number="03" title="Account Details" id="operations-mandate-account-title" />
            <div className="operations-mandate-grid">
              <TextField label="Account Number" name="accountNumber" value={form.accountNumber} onChange={updateField} error={validationErrors.accountNumber} required />
              <DynamicSelect label="Account Type" name="accountType" value={form.accountType} options={MASTER_COLLECTIONS.accountType} onChange={updateField} error={validationErrors.accountType} required />
              <TextField label="Account Holder Name" name="accountHolderName" value={form.accountHolderName} onChange={updateField} error={validationErrors.accountHolderName} required />
              <TextField label="Joint Account Holder Name" name="jointAccountHolderName" value={form.jointAccountHolderName} onChange={updateField} className="operations-mandate-field--wide" />
            </div>
          </section>

          <section className="operations-mandate-section" aria-labelledby="operations-mandate-amount-title">
            <SectionHeading number="04" title="Mandate Amount" id="operations-mandate-amount-title" />
            <div className="operations-mandate-grid">
              <TextField label="Max Limit (₹)" name="maxLimit" value={form.maxLimit} onChange={updateField} error={validationErrors.maxLimit} type="number" required />
              <TextField label="Amount In Words" name="amountInWords" value={form.amountInWords} onChange={updateField} readOnly className="operations-mandate-field--wide" />
            </div>
          </section>

          <section className="operations-mandate-section" aria-labelledby="operations-mandate-schedule-title">
            <SectionHeading number="05" title="Mandate Schedule" id="operations-mandate-schedule-title" />
            <div className="operations-mandate-grid">
              <CheckboxField label="Open Mandate" name="openMandate" value={form.openMandate} onChange={updateField} />
              <TextField label="Start Date" name="startDate" value={form.startDate} onChange={updateField} error={validationErrors.startDate} type="date" required />
              <TextField label="Expiry Date" name="expiryDate" value={form.expiryDate} onChange={updateField} type="date" />
            </div>
          </section>

          <section className="operations-mandate-section" aria-labelledby="operations-mandate-periodicity-title">
            <SectionHeading number="06" title="Periodicity" id="operations-mandate-periodicity-title" />
            <div className="operations-mandate-grid">
              <DynamicSelect label="Frequency" name="frequency" value={form.frequency} options={MASTER_COLLECTIONS.frequency} onChange={updateField} />
              <DynamicSelect label="Periodicity" name="periodicity" value={form.periodicity} options={MASTER_COLLECTIONS.periodicity} onChange={updateField} />
              <DynamicSelect label="Day" name="day" value={form.day} options={MASTER_COLLECTIONS.day} onChange={updateField} />
            </div>
          </section>

          <section className="operations-mandate-section" aria-labelledby="operations-mandate-contact-title">
            <SectionHeading number="07" title="Contact & Input" id="operations-mandate-contact-title" />
            <div className="operations-mandate-grid">
              <TextField label="Contact Number" name="contactNumber" value={form.contactNumber} onChange={updateField} type="tel" />
              <TextField label="Input Date" name="inputDate" value={form.inputDate} onChange={updateField} error={validationErrors.inputDate} type="date" required />
            </div>
          </section>

          <section className="operations-mandate-section" aria-labelledby="operations-mandate-partner-title">
            <SectionHeading number="08" title="Partner Bank" id="operations-mandate-partner-title" />
            <div className="operations-mandate-grid">
              {renderSelectionField('Partner Bank', 'partnerBank', validationErrors.partnerBank, true)}
            </div>
          </section>

          <section className="operations-mandate-section" aria-labelledby="operations-mandate-status-title">
            <SectionHeading number="09" title="Status Information" id="operations-mandate-status-title" />
            <div className="operations-mandate-grid">
              <CheckboxField label="Active" name="active" value={form.active} onChange={updateField} />
              <div className="operations-mandate-field">
                <span className="operations-mandate-label">Status<span className="operations-mandate-required">*</span></span>
                <div className="operations-mandate-status-control">
                  <select className="operations-mandate-control" value={form.status} onChange={(event) => updateField('status', event.target.value)} aria-invalid={Boolean(validationErrors.status)}>
                    <option value="">Select</option>
                    {MASTER_COLLECTIONS.status.map((option, index) => <option key={getRecordKey(option, index)} value={getRecordKey(option, index)}>{getRecordLabel(option)}</option>)}
                  </select>
                  <button type="button" className="operations-mandate-button operations-mandate-button--small" disabled title="Status view is not connected yet.">View</button>
                </div>
                <FieldError message={validationErrors.status} />
              </div>
              <label className="operations-mandate-field operations-mandate-field--wide">
                <span className="operations-mandate-label">Reason</span>
                <textarea className="operations-mandate-control operations-mandate-control--textarea" value={form.reason} onChange={(event) => updateField('reason', event.target.value)} rows="2" />
              </label>
              <TextField label="UMRN Number" name="umrnNumber" value={form.umrnNumber} onChange={updateField} />
              <CheckboxField label="Swap" name="swap" value={form.swap} onChange={updateField} />
              <TextField label="Registration Status" name="registrationStatus" value={form.registrationStatus || '—'} onChange={updateField} readOnly />
            </div>
          </section>

          <section className="operations-mandate-section operations-mandate-document-section" aria-labelledby="operations-mandate-document-title">
            <SectionHeading number="DOC" title="Mandate Document" id="operations-mandate-document-title" />
            <div className="operations-mandate-document-row">
              <div className={['operations-mandate-file-name', selectedDocument ? 'has-file' : ''].join(' ').trim()} title={selectedDocument?.name || ''}>
                {selectedDocument?.name || 'No file selected'}
              </div>
              <input ref={fileInputRef} className="operations-mandate-hidden-file-input" type="file" onChange={handleDocumentChange} aria-label="Select mandate document" />
              <button type="button" className="operations-mandate-button operations-mandate-button--secondary" onClick={() => fileInputRef.current?.click()}>
                <Upload size={15} aria-hidden="true" /> Browse
              </button>
              <button type="button" className="operations-mandate-icon-button operations-mandate-document-action" onClick={() => setIsPreviewOpen(true)} disabled={!selectedDocument || !documentPreviewUrl} aria-label="View mandate document" title="View mandate document">
                <Eye size={17} aria-hidden="true" />
              </button>
              <button type="button" className="operations-mandate-icon-button operations-mandate-document-action operations-mandate-document-action--danger" onClick={clearDocument} disabled={!selectedDocument} aria-label="Remove mandate document" title="Remove mandate document">
                <Trash2 size={17} aria-hidden="true" />
              </button>
            </div>
          </section>

          <footer className="operations-mandate-footer">
            <div className="operations-mandate-footer-status">
              <span>Status</span>
              <strong>—</strong>
            </div>
            <div className="operations-mandate-footer-actions">
              <button type="button" className="operations-mandate-button operations-mandate-button--secondary" onClick={handleClear}>Clear</button>
              <button type="button" className="operations-mandate-button operations-mandate-button--secondary" disabled title="Notes are not connected yet.">Notes</button>
              <button type="button" className="operations-mandate-button operations-mandate-button--secondary" disabled title="Print is not connected yet.">Print</button>
              <select className="operations-mandate-save-submit-select" disabled defaultValue="" aria-label="Save or submit action">
                <option value="">Save / Submit</option>
              </select>
              <button type="button" className="operations-mandate-button operations-mandate-button--secondary" disabled title="Save is not connected yet.">Save</button>
              <button type="submit" className="operations-mandate-button operations-mandate-button--primary" disabled title="Submit is not connected yet.">Submit</button>
              <button type="button" className="operations-mandate-button operations-mandate-button--secondary" disabled title="Page close destination is not confirmed.">Close</button>
            </div>
          </footer>
        </form>

        {activeMasterPopup && (
          <div className="operations-mandate-modal-overlay" role="presentation">
            <div className="operations-mandate-modal" role="dialog" aria-modal="true" aria-labelledby="operations-mandate-master-modal-title">
              <div className="operations-mandate-modal-header">
                <h2 id="operations-mandate-master-modal-title">{activeMasterPopup.title}</h2>
                <button type="button" className="operations-mandate-modal-close" onClick={closeMasterModal} aria-label={`Close ${activeMasterPopup.label} selection`}>
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
              <div className="operations-mandate-modal-body">
                <div className="operations-mandate-modal-search">
                  <Search size={16} aria-hidden="true" />
                  <input type="search" value={masterSearchTerm} onChange={(event) => { setMasterSearchTerm(event.target.value); setMasterCurrentPage(1); }} placeholder={`Search ${activeMasterPopup.label.toLowerCase()}`} aria-label={`Search ${activeMasterPopup.label}`} />
                  {masterSearchTerm && <button type="button" onClick={() => { setMasterSearchTerm(''); setMasterCurrentPage(1); }} aria-label={`Clear ${activeMasterPopup.label} search`}><X size={15} aria-hidden="true" /></button>}
                </div>
                <div className="operations-mandate-modal-table-wrap">
                  <table className="operations-mandate-modal-table">
                    <thead><tr><th scope="col">Select</th><th scope="col">#</th><th scope="col">Value</th></tr></thead>
                    <tbody>
                      {visibleMasterRecords.length === 0 ? (
                        <tr><td colSpan={3} className="operations-mandate-modal-empty-state">No {activeMasterPopup.label.toLowerCase()} records available.</td></tr>
                      ) : visibleMasterRecords.map((record, index) => {
                        const recordKey = getRecordKey(record, masterPageStart + index);
                        return (
                          <tr className={masterTemporarySelection && getRecordKey(masterTemporarySelection, masterPageStart + index) === recordKey ? 'is-selected' : ''} key={recordKey}>
                            <td><input type="radio" name={`${masterModalType}-selection`} checked={masterTemporarySelection === record} onChange={() => setMasterTemporarySelection(record)} aria-label={`Select ${getRecordLabel(record)}`} /></td>
                            <td>{masterPageStart + index + 1}</td>
                            <td>{getRecordLabel(record)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="operations-mandate-modal-pagination">
                  <span>{filteredMasterRecords.length === 0 ? 'Showing 0 entries.' : `Showing ${masterPageStart + 1} to ${Math.min(masterPageStart + masterPageSize, filteredMasterRecords.length)} of ${filteredMasterRecords.length} entries.`}</span>
                  <div className="operations-mandate-pagination-controls">
                    <label><span>Rows</span><select value={masterPageSize} onChange={(event) => { setMasterPageSize(Number(event.target.value)); setMasterCurrentPage(1); }} aria-label="Master rows per page"><option value="5">5</option><option value="10">10</option><option value="25">25</option></select></label>
                    <button type="button" onClick={() => setMasterCurrentPage((current) => Math.max(1, current - 1))} disabled={masterCurrentPage <= 1} aria-label="Previous page"><ChevronLeft size={15} aria-hidden="true" /></button>
                    <span>Page {Math.min(masterCurrentPage, masterTotalPages)} of {masterTotalPages}</span>
                    <button type="button" onClick={() => setMasterCurrentPage((current) => Math.min(masterTotalPages, current + 1))} disabled={masterCurrentPage >= masterTotalPages} aria-label="Next page"><ChevronRight size={15} aria-hidden="true" /></button>
                  </div>
                </div>
              </div>
              <div className="operations-mandate-modal-footer">
                <button type="button" className="operations-mandate-button operations-mandate-button--secondary" onClick={clearMasterModal}>Clear</button>
                <div>
                  <button type="button" className="operations-mandate-button operations-mandate-button--secondary" onClick={closeMasterModal}>Close</button>
                  <button type="button" className="operations-mandate-button operations-mandate-button--primary" onClick={confirmMasterSelection} disabled={masterTemporarySelection == null}>OK</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isPreviewOpen && selectedDocument && documentPreviewUrl && (
          <div className="operations-mandate-modal-overlay" role="presentation">
            <div className="operations-mandate-preview-modal" role="dialog" aria-modal="true" aria-labelledby="operations-mandate-preview-title">
              <div className="operations-mandate-modal-header">
                <div>
                  <h2 id="operations-mandate-preview-title">Mandate Document</h2>
                  <p>{selectedDocument.name}</p>
                </div>
                <button type="button" className="operations-mandate-modal-close" onClick={() => setIsPreviewOpen(false)} aria-label="Close document preview"><X size={18} aria-hidden="true" /></button>
              </div>
              <div className="operations-mandate-preview-area">
                {previewIsPdf && <iframe src={documentPreviewUrl} title="Mandate Document" />}
                {previewIsImage && <img src={documentPreviewUrl} alt={selectedDocument.name} />}
                {!previewIsPdf && !previewIsImage && <p>Preview is not available for this file type.</p>}
              </div>
              <div className="operations-mandate-modal-footer operations-mandate-preview-footer">
                <button type="button" className="operations-mandate-button operations-mandate-button--secondary" onClick={() => setIsPreviewOpen(false)}>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </OperationsLayout>
  );
}
