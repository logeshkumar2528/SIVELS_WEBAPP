import {
  Check,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildApplicationRoute, ROUTES } from '../../../config/routeConfig';
import { useOperationsApplication } from '../../../context/OperationsApplicationContext';
import OperationsLayout from '../../../layouts/OperationsLayout';
import './Covenants.css';

const WORKFLOW_STEPS = [
  { id: 'loan-basic-details', label: 'Loan Basic Details', route: ROUTES.MAKER_LOAN_BASIC_DETAILS },
  { id: 'fees', label: 'Fees', route: ROUTES.MAKER_FEES },
  { id: 'repayment-schedule', label: 'Repayment Schedule', route: ROUTES.MAKER_REPAYMENT_SCHEDULE },
  { id: 'covenants', label: 'Covenants', active: true, route: ROUTES.MAKER_COVENANTS },
  { id: 'mandate-details', label: 'Mandate Details', route: ROUTES.MAKER_MANDATE_DETAILS },
  { id: 'cheque-details', label: 'Cheque Details', route: ROUTES.MAKER_CHEQUE_DETAILS },
];

const INITIAL_FORM = {
  covenant: '',
  covenantCondition: '',
  creationDate: '',
  allowWaiver: false,
  postDisbursementDocument: false,
  otc: false,
  recordType: null,
  documentType: null,
};

// These normalized collections intentionally remain empty until backend contracts exist.
const RECORD_TYPE_OPTIONS = [];
const DOCUMENT_TYPE_MASTER_RECORDS = [];
const DOCUMENT_TYPE_PAGE_SIZE = 5;

function createFrontendId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `frontend-covenant-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function validateForm(form) {
  const nextErrors = {};

  if (!form.covenant.trim()) {
    nextErrors.covenant = 'Covenant is required.';
  }

  if (!form.covenantCondition.trim()) {
    nextErrors.covenantCondition = 'Covenant Condition is required.';
  }

  if (!form.creationDate) {
    nextErrors.creationDate = 'Creation Date is required.';
  }

  if (!form.recordType?.stableId) {
    nextErrors.recordType = 'Record Type is required. Options are not available yet.';
  }

  return nextErrors;
}

function WorkflowSteps({ navigate, applicationId }) {
  return (
    <nav className="operations-covenants-steps" aria-label="Application workflow steps">
      {WORKFLOW_STEPS.map((step, index) => (
        <button
          key={step.id}
          type="button"
          className={['operations-covenants-step', step.active ? 'is-active' : ''].join(' ').trim()}
          aria-current={step.active ? 'step' : undefined}
          disabled={!step.route}
          onClick={() => step.route && navigate(buildApplicationRoute(step.route, applicationId))}
        >
          <span className="operations-covenants-step-number">{index + 1}</span>
          <span>{step.label}</span>
        </button>
      ))}
    </nav>
  );
}

function BooleanIndicator({ value, label }) {
  return (
    <span
      className={['operations-covenants-boolean', value ? 'is-true' : 'is-false'].join(' ')}
      role="img"
      aria-label={`${label}: ${value ? 'Yes' : 'No'}`}
    >
      {value ? <Check size={13} aria-hidden="true" /> : '—'}
    </span>
  );
}

function FieldError({ message }) {
  return message ? <span className="operations-covenants-field-error">{message}</span> : null;
}

export default function Covenants() {
  const navigate = useNavigate();
  const { applicationId } = useOperationsApplication();
  const [form, setForm] = useState(INITIAL_FORM);
  const [covenantRecords, setCovenantRecords] = useState([]);
  const [editingFrontendId, setEditingFrontendId] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [isDocumentTypeModalOpen, setIsDocumentTypeModalOpen] = useState(false);
  const [documentTypeSearchTerm, setDocumentTypeSearchTerm] = useState('');
  const [documentTypeSelectedId, setDocumentTypeSelectedId] = useState(null);
  const [documentTypeCurrentPage, setDocumentTypeCurrentPage] = useState(1);
  const [documentTypePageSize, setDocumentTypePageSize] = useState(DOCUMENT_TYPE_PAGE_SIZE);
  const [deleteFrontendId, setDeleteFrontendId] = useState(null);

  const filteredDocumentTypes = useMemo(() => {
    const query = documentTypeSearchTerm.trim().toLowerCase();

    if (!query) return DOCUMENT_TYPE_MASTER_RECORDS;

    return DOCUMENT_TYPE_MASTER_RECORDS.filter((record) => (
      `${record.type || ''} ${record.description || ''}`.toLowerCase().includes(query)
    ));
  }, [documentTypeSearchTerm]);

  const documentTypeTotalPages = Math.max(
    1,
    Math.ceil(filteredDocumentTypes.length / documentTypePageSize),
  );
  const documentTypePageStart = (documentTypeCurrentPage - 1) * documentTypePageSize;
  const visibleDocumentTypes = filteredDocumentTypes.slice(
    documentTypePageStart,
    documentTypePageStart + documentTypePageSize,
  );

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setEditingFrontendId(null);
    setValidationErrors({});
  };

  const updateFormField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setValidationErrors((current) => ({ ...current, [field]: '' }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = validateForm(form);
    setValidationErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    if (editingFrontendId) {
      setCovenantRecords((current) => current.map((record) => (
        record.frontendId === editingFrontendId
          ? { ...record, ...form }
          : record
      )));
    } else {
      setCovenantRecords((current) => ([
        ...current,
        { frontendId: createFrontendId(), ...form },
      ]));
    }

    resetForm();
  };

  const handleEdit = (record) => {
    setForm({ ...record });
    setEditingFrontendId(record.frontendId);
    setValidationErrors({});
  };

  const handleConfirmDelete = () => {
    if (!deleteFrontendId) return;

    setCovenantRecords((current) => current.filter((record) => record.frontendId !== deleteFrontendId));

    if (editingFrontendId === deleteFrontendId) {
      resetForm();
    }

    setDeleteFrontendId(null);
  };

  const handleOpenDocumentTypeModal = () => {
    setDocumentTypeSelectedId(form.documentType?.stableId || null);
    setDocumentTypeSearchTerm('');
    setDocumentTypeCurrentPage(1);
    setIsDocumentTypeModalOpen(true);
  };

  const handleClearDocumentTypeModal = () => {
    setDocumentTypeSearchTerm('');
    setDocumentTypeSelectedId(null);
    setDocumentTypeCurrentPage(1);
  };

  const handleDocumentTypeSearch = (value) => {
    setDocumentTypeSearchTerm(value);
    setDocumentTypeCurrentPage(1);
  };

  const handleConfirmDocumentType = () => {
    const selectedRecord = DOCUMENT_TYPE_MASTER_RECORDS.find(
      (record) => record.stableId === documentTypeSelectedId,
    );

    if (!selectedRecord) return;

    updateFormField('documentType', selectedRecord);
    setIsDocumentTypeModalOpen(false);
  };

  const selectedDeleteRecord = covenantRecords.find((record) => record.frontendId === deleteFrontendId);

  return (
    <OperationsLayout title="Covenants" subtitle="Operations Maker workflow">
      <div className="operations-covenants-page">
        <nav className="operations-covenants-breadcrumb" aria-label="Breadcrumb">
          <button type="button" onClick={() => navigate(ROUTES.MAKER_DASHBOARD)}>Operations Maker</button>
          <ChevronRight size={15} aria-hidden="true" />
          <span>Covenants</span>
        </nav>

        <WorkflowSteps navigate={navigate} applicationId={applicationId} />

        <div className="operations-covenants-workspace">
          <section className="operations-covenants-panel" aria-labelledby="operations-covenants-details-title">
            <div className="operations-covenants-panel-heading">
              <div>
                <h2 id="operations-covenants-details-title">Covenant Details</h2>
                <p>Create and manage covenant details locally.</p>
              </div>
            </div>

            <form className="operations-covenants-form" onSubmit={handleSubmit} noValidate>
              <label className="operations-covenants-field">
                <span className="operations-covenants-label">Covenant <span className="operations-covenants-required">*</span></span>
                <input
                  className="operations-covenants-control"
                  type="text"
                  value={form.covenant}
                  onChange={(event) => updateFormField('covenant', event.target.value)}
                />
                <FieldError message={validationErrors.covenant} />
              </label>

              <label className="operations-covenants-field">
                <span className="operations-covenants-label">Covenant Condition <span className="operations-covenants-required">*</span></span>
                <textarea
                  className="operations-covenants-control operations-covenants-control--textarea"
                  value={form.covenantCondition}
                  onChange={(event) => updateFormField('covenantCondition', event.target.value)}
                  rows="4"
                />
                <FieldError message={validationErrors.covenantCondition} />
              </label>

              <label className="operations-covenants-field">
                <span className="operations-covenants-label">Creation Date <span className="operations-covenants-required">*</span></span>
                <input
                  className="operations-covenants-control"
                  type="date"
                  value={form.creationDate}
                  onChange={(event) => updateFormField('creationDate', event.target.value)}
                />
                <FieldError message={validationErrors.creationDate} />
              </label>

              <div className="operations-covenants-checkbox-group">
                <label className="operations-covenants-checkbox">
                  <input
                    type="checkbox"
                    checked={form.allowWaiver}
                    onChange={(event) => updateFormField('allowWaiver', event.target.checked)}
                  />
                  <span>Allow Waiver</span>
                </label>
                <label className="operations-covenants-checkbox">
                  <input
                    type="checkbox"
                    checked={form.postDisbursementDocument}
                    onChange={(event) => updateFormField('postDisbursementDocument', event.target.checked)}
                  />
                  <span>Post Disbursement Document (PDD)</span>
                </label>
                <label className="operations-covenants-checkbox">
                  <input
                    type="checkbox"
                    checked={form.otc}
                    onChange={(event) => updateFormField('otc', event.target.checked)}
                  />
                  <span>OTC</span>
                </label>
              </div>

              <label className="operations-covenants-field">
                <span className="operations-covenants-label">Record Type <span className="operations-covenants-required">*</span></span>
                <select
                  className="operations-covenants-control"
                  value={form.recordType?.stableId || ''}
                  onChange={(event) => {
                    const selectedOption = RECORD_TYPE_OPTIONS.find(
                      (option) => option.stableId === event.target.value,
                    ) || null;
                    updateFormField('recordType', selectedOption);
                  }}
                >
                  <option value="">Select</option>
                  {RECORD_TYPE_OPTIONS.map((option) => (
                    <option value={option.stableId} key={option.stableId}>{option.label}</option>
                  ))}
                </select>
                <FieldError message={validationErrors.recordType} />
              </label>

              <div className="operations-covenants-field">
                <span className="operations-covenants-label">Document Type</span>
                <div className="operations-covenants-selection-control">
                  <span className={form.documentType ? 'has-value' : ''}>
                    {form.documentType?.type || 'Select Document Type'}
                  </span>
                  <button
                    type="button"
                    className="operations-covenants-icon-button"
                    onClick={handleOpenDocumentTypeModal}
                    aria-label="Search document types"
                    title="Search document types"
                  >
                    <Search size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="operations-covenants-form-actions">
                <button type="button" className="operations-covenants-button operations-covenants-button--secondary" onClick={() => navigate(buildApplicationRoute(ROUTES.MAKER_REPAYMENT_SCHEDULE, applicationId))}>
                  <ChevronLeft size={15} aria-hidden="true" />
                  Back
                </button>
                <button type="button" className="operations-covenants-button operations-covenants-button--secondary" onClick={resetForm}>
                  Clear
                </button>
                <button type="submit" className="operations-covenants-button operations-covenants-button--primary">
                  <Plus size={15} aria-hidden="true" />
                  {editingFrontendId ? 'Update Covenant' : 'Add Covenant'}
                </button>
                <button type="button" className="operations-covenants-button operations-covenants-button--secondary" disabled title="Permanent save is not connected yet.">
                  Save as Draft
                </button>
                <button type="button" className="operations-covenants-button operations-covenants-button--primary" disabled title="Permanent save is not connected yet.">
                  Save Covenant
                </button>
              </div>
            </form>
          </section>

          <section className="operations-covenants-panel operations-covenants-list-panel" aria-labelledby="operations-covenants-list-title">
            <div className="operations-covenants-panel-heading">
              <div>
                <h2 id="operations-covenants-list-title">Covenant List</h2>
                <p>Locally managed covenant records for this UI-only phase.</p>
              </div>
            </div>

            <div className="operations-covenants-table-wrap">
              <table className="operations-covenants-table">
                <colgroup>
                  <col className="operations-covenants-col--serial" />
                  <col className="operations-covenants-col--covenant" />
                  <col className="operations-covenants-col--condition" />
                  <col className="operations-covenants-col--record-type" />
                  <col className="operations-covenants-col--boolean" />
                  <col className="operations-covenants-col--boolean" />
                  <col className="operations-covenants-col--boolean" />
                  <col className="operations-covenants-col--status" />
                  <col className="operations-covenants-col--action" />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Covenant</th>
                    <th scope="col">Covenant Condition</th>
                    <th scope="col">Record Type</th>
                    <th scope="col">Allow Waiver</th>
                    <th scope="col">PDD</th>
                    <th scope="col">OTC</th>
                    <th scope="col">Status</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {covenantRecords.length === 0 ? (
                    <tr>
                      <td className="operations-covenants-empty-state" colSpan={9}>
                        No covenant records available.
                      </td>
                    </tr>
                  ) : (
                    covenantRecords.map((record, index) => (
                      <tr key={record.frontendId}>
                        <td className="operations-covenants-cell operations-covenants-cell--serial">{index + 1}</td>
                        <td className="operations-covenants-cell operations-covenants-cell--text">{record.covenant}</td>
                        <td className="operations-covenants-cell operations-covenants-cell--text">{record.covenantCondition}</td>
                        <td className="operations-covenants-cell">{record.recordType?.label || '—'}</td>
                        <td className="operations-covenants-cell operations-covenants-cell--center">
                          <BooleanIndicator value={record.allowWaiver} label="Allow Waiver" />
                        </td>
                        <td className="operations-covenants-cell operations-covenants-cell--center">
                          <BooleanIndicator value={record.postDisbursementDocument} label="PDD" />
                        </td>
                        <td className="operations-covenants-cell operations-covenants-cell--center">
                          <BooleanIndicator value={record.otc} label="OTC" />
                        </td>
                        <td className="operations-covenants-cell">
                          <span className="operations-covenants-status">—</span>
                        </td>
                        <td className="operations-covenants-cell operations-covenants-actions-cell">
                          <button
                            type="button"
                            className="operations-covenants-row-action"
                            onClick={() => handleEdit(record)}
                            aria-label={`Edit ${record.covenant}`}
                            title="Edit covenant"
                          >
                            <Edit3 size={15} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="operations-covenants-row-action operations-covenants-row-action--danger"
                            onClick={() => setDeleteFrontendId(record.frontendId)}
                            aria-label={`Delete ${record.covenant}`}
                            title="Delete covenant"
                          >
                            <Trash2 size={15} aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {isDocumentTypeModalOpen && (
          <div className="operations-covenants-modal-overlay" role="presentation">
            <div
              className="operations-covenants-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="operations-covenants-document-modal-title"
            >
              <div className="operations-covenants-modal-header">
                <h2 id="operations-covenants-document-modal-title">Select Document Type</h2>
                <button
                  type="button"
                  className="operations-covenants-modal-close"
                  onClick={() => setIsDocumentTypeModalOpen(false)}
                  aria-label="Close document type selection"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>

              <div className="operations-covenants-modal-body">
                <div className="operations-covenants-modal-search-row">
                  <div className="operations-covenants-modal-search">
                    <Search size={16} aria-hidden="true" />
                    <input
                      type="search"
                      value={documentTypeSearchTerm}
                      onChange={(event) => handleDocumentTypeSearch(event.target.value)}
                      placeholder="Search by type or description"
                      aria-label="Search document types"
                    />
                    {documentTypeSearchTerm && (
                      <button type="button" onClick={() => handleDocumentTypeSearch('')} aria-label="Clear document type search">
                        <X size={15} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="operations-covenants-modal-table-wrap">
                  <table className="operations-covenants-modal-table">
                    <thead>
                      <tr>
                        <th scope="col">Select</th>
                        <th scope="col">#</th>
                        <th scope="col">Type</th>
                        <th scope="col">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleDocumentTypes.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="operations-covenants-modal-empty-state">
                            No document type records available.
                          </td>
                        </tr>
                      ) : (
                        visibleDocumentTypes.map((record, index) => (
                          <tr className={documentTypeSelectedId === record.stableId ? 'is-selected' : ''} key={record.stableId}>
                            <td>
                              <input
                                type="radio"
                                name="document-type-selection"
                                checked={documentTypeSelectedId === record.stableId}
                                onChange={() => setDocumentTypeSelectedId(record.stableId)}
                                aria-label={`Select ${record.type}`}
                              />
                            </td>
                            <td>{documentTypePageStart + index + 1}</td>
                            <td>{record.type}</td>
                            <td>{record.description}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="operations-covenants-modal-pagination">
                  <div className="operations-covenants-entry-count">
                    {filteredDocumentTypes.length === 0
                      ? 'Showing 0 entries.'
                      : `Showing ${documentTypePageStart + 1} to ${Math.min(documentTypePageStart + documentTypePageSize, filteredDocumentTypes.length)} of ${filteredDocumentTypes.length} entries.`}
                  </div>
                  <div className="operations-covenants-pagination-controls">
                    <label>
                      <span>Rows</span>
                      <select
                        value={documentTypePageSize}
                        onChange={(event) => {
                          setDocumentTypePageSize(Number(event.target.value));
                          setDocumentTypeCurrentPage(1);
                        }}
                        aria-label="Document type rows per page"
                      >
                        <option value="5">5</option>
                        <option value="10">10</option>
                        <option value="25">25</option>
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => setDocumentTypeCurrentPage((current) => Math.max(1, current - 1))}
                      disabled={documentTypeCurrentPage <= 1}
                      aria-label="Previous document type page"
                    >
                      <ChevronLeft size={15} aria-hidden="true" />
                    </button>
                    <span>Page {documentTypeCurrentPage} of {documentTypeTotalPages}</span>
                    <button
                      type="button"
                      onClick={() => setDocumentTypeCurrentPage((current) => Math.min(documentTypeTotalPages, current + 1))}
                      disabled={documentTypeCurrentPage >= documentTypeTotalPages}
                      aria-label="Next document type page"
                    >
                      <ChevronRight size={15} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="operations-covenants-modal-footer">
                <button type="button" className="operations-covenants-button operations-covenants-button--secondary" onClick={handleClearDocumentTypeModal}>
                  Clear
                </button>
                <div>
                  <button type="button" className="operations-covenants-button operations-covenants-button--secondary" onClick={() => setIsDocumentTypeModalOpen(false)}>
                    Close
                  </button>
                  <button
                    type="button"
                    className="operations-covenants-button operations-covenants-button--primary"
                    onClick={handleConfirmDocumentType}
                    disabled={!DOCUMENT_TYPE_MASTER_RECORDS.some((record) => record.stableId === documentTypeSelectedId)}
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedDeleteRecord && (
          <div className="operations-covenants-modal-overlay" role="presentation">
            <div
              className="operations-covenants-confirmation"
              role="dialog"
              aria-modal="true"
              aria-labelledby="operations-covenants-delete-title"
            >
              <div className="operations-covenants-confirmation-header">
                <h2 id="operations-covenants-delete-title">Delete Covenant</h2>
                <button type="button" className="operations-covenants-modal-close" onClick={() => setDeleteFrontendId(null)} aria-label="Close delete confirmation">
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
              <p>Remove “{selectedDeleteRecord.covenant}” from the local Covenant List?</p>
              <div className="operations-covenants-modal-footer">
                <button type="button" className="operations-covenants-button operations-covenants-button--secondary" onClick={() => setDeleteFrontendId(null)}>
                  Cancel
                </button>
                <button type="button" className="operations-covenants-button operations-covenants-button--danger" onClick={handleConfirmDelete}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </OperationsLayout>
  );
}
