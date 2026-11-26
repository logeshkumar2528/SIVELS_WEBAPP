import {
  Check,
  ChevronRight,
  Edit3,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildApplicationRoute, ROUTES } from '../../../config/routeConfig';
import { useOperationsApplication } from '../../../context/OperationsApplicationContext';
import OperationsLayout from '../../../layouts/OperationsLayout';
import './Covenants.css';

const WORKFLOW_STEPS = [
  { id: 'loan-basic-details', label: 'Loan Basic Details', route: ROUTES.MAKER_LOAN_BASIC_DETAILS },
  { id: 'fees', label: 'Fees', route: ROUTES.MAKER_FEES },
  { id: 'covenants', label: 'Covenants', active: true, route: ROUTES.MAKER_COVENANTS },
  { id: 'mandate-details', label: 'Mandate Details', route: ROUTES.MAKER_MANDATE_DETAILS },
  { id: 'cheque-details', label: 'Cheque Details', route: ROUTES.MAKER_CHEQUE_DETAILS },
];

const OTC_STATUS = {
  HOLD: 'hold',
  RELEASE: 'release',
};

const INITIAL_FORM = {
  covenant: '',
  covenantCondition: '',
  creationDate: '',
  allowWaiver: false,
  postDisbursementDocument: false,
  otc: false,
  otcStatus: '',
  waiverFile: null,
  pddFile: null,
  pddExpectedDate: '',
};

function otcStatusLabel(status) {
  if (status === OTC_STATUS.HOLD) return 'Hold OTC';
  if (status === OTC_STATUS.RELEASE) return 'Release OTC';
  return '—';
}

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
  const [deleteFrontendId, setDeleteFrontendId] = useState(null);

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setEditingFrontendId(null);
    setValidationErrors({});
  };

  const updateFormField = (field, value) => {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === 'allowWaiver' && !value) {
        next.waiverFile = null;
      }
      if (field === 'postDisbursementDocument' && !value) {
        next.pddFile = null;
        next.pddExpectedDate = '';
      }
      if (field === 'otc') {
        next.otcStatus = value ? OTC_STATUS.HOLD : '';
      }
      return next;
    });
    setValidationErrors((current) => ({ ...current, [field]: '' }));
  };

  const selectExclusiveOption = (option) => {
    setForm((current) => ({
      ...current,
      allowWaiver: option === 'allowWaiver',
      postDisbursementDocument: option === 'postDisbursementDocument',
      otc: option === 'otc',
      otcStatus: option === 'otc' ? OTC_STATUS.HOLD : '',
      waiverFile: option === 'allowWaiver' ? current.waiverFile : null,
      pddFile: option === 'postDisbursementDocument' ? current.pddFile : null,
      pddExpectedDate: option === 'postDisbursementDocument' ? current.pddExpectedDate : '',
    }));
    setValidationErrors((current) => ({
      ...current,
      allowWaiver: '',
      postDisbursementDocument: '',
      otc: '',
    }));
  };

  const handleFileChange = (field, event) => {
    const file = event.target.files?.[0] || null;
    updateFormField(field, file);
    event.target.value = '';
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
    const otcEnabled = Boolean(record.otc);
    setForm({
      covenant: record.covenant || '',
      covenantCondition: record.covenantCondition || '',
      creationDate: record.creationDate || '',
      allowWaiver: Boolean(record.allowWaiver),
      postDisbursementDocument: Boolean(record.postDisbursementDocument),
      otc: otcEnabled,
      otcStatus: otcEnabled
        ? (record.otcStatus === OTC_STATUS.RELEASE ? OTC_STATUS.RELEASE : OTC_STATUS.HOLD)
        : '',
      waiverFile: record.waiverFile || null,
      pddFile: record.pddFile || null,
      pddExpectedDate: record.pddExpectedDate || '',
    });
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
              </div>
              <button
                type="submit"
                form="operations-covenants-form"
                className="operations-covenants-button operations-covenants-button--primary"
              >
                <Plus size={15} aria-hidden="true" />
                {editingFrontendId ? 'Update Covenant' : 'Add Covenant'}
              </button>
            </div>

            <form id="operations-covenants-form" className="operations-covenants-form" onSubmit={handleSubmit} noValidate>
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

              <div className="operations-covenants-checkbox-group" role="radiogroup" aria-label="Covenant option">
                <label className="operations-covenants-checkbox">
                  <input
                    type="radio"
                    name="covenant-exclusive-option"
                    checked={form.allowWaiver}
                    onChange={() => selectExclusiveOption('allowWaiver')}
                  />
                  <span>Allow Waiver</span>
                </label>
                <label className="operations-covenants-checkbox">
                  <input
                    type="radio"
                    name="covenant-exclusive-option"
                    checked={form.postDisbursementDocument}
                    onChange={() => selectExclusiveOption('postDisbursementDocument')}
                  />
                  <span>Post Disbursement Document (PDD)</span>
                </label>
                <label className="operations-covenants-checkbox">
                  <input
                    type="radio"
                    name="covenant-exclusive-option"
                    checked={form.otc}
                    onChange={() => selectExclusiveOption('otc')}
                  />
                  <span>OTC</span>
                </label>
              </div>

              {form.allowWaiver && (
                <div className="operations-covenants-conditional-fields">
                  <label className="operations-covenants-field">
                    <span className="operations-covenants-label">Waiver Document</span>
                    <input
                      className="operations-covenants-control"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={(event) => handleFileChange('waiverFile', event)}
                    />
                    {form.waiverFile?.name && (
                      <span className="operations-covenants-file-name">{form.waiverFile.name}</span>
                    )}
                  </label>
                </div>
              )}

              {form.postDisbursementDocument && (
                <div className="operations-covenants-conditional-fields">
                  <label className="operations-covenants-field">
                    <span className="operations-covenants-label">PDD Document</span>
                    <input
                      className="operations-covenants-control"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={(event) => handleFileChange('pddFile', event)}
                    />
                    {form.pddFile?.name && (
                      <span className="operations-covenants-file-name">{form.pddFile.name}</span>
                    )}
                  </label>
                  <label className="operations-covenants-field">
                    <span className="operations-covenants-label">Expected Date</span>
                    <input
                      className="operations-covenants-control"
                      type="date"
                      value={form.pddExpectedDate}
                      onChange={(event) => updateFormField('pddExpectedDate', event.target.value)}
                    />
                  </label>
                </div>
              )}

              {form.otc && (
                <div className="operations-covenants-conditional-fields operations-covenants-conditional-fields--otc">
                  <label className="operations-covenants-field">
                    <span className="operations-covenants-label">OTC Action</span>
                    <select
                      className="operations-covenants-control"
                      value={form.otcStatus || OTC_STATUS.HOLD}
                      onChange={(event) => updateFormField('otcStatus', event.target.value)}
                    >
                      <option value={OTC_STATUS.HOLD}>Hold OTC</option>
                      <option value={OTC_STATUS.RELEASE}>Release OTC</option>
                    </select>
                  </label>
                  <p className="operations-covenants-otc-note">
                    {form.otcStatus === OTC_STATUS.RELEASE
                      ? 'Release OTC: loan disbursement can proceed.'
                      : 'Hold OTC: loan disbursement is blocked until Release OTC is selected.'}
                  </p>
                </div>
              )}

              <div className="operations-covenants-form-actions">
                <button
                  type="button"
                  className="operations-covenants-button operations-covenants-button--primary"
                  disabled
                  title="Permanent save is not connected yet."
                >
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
                  <col className="operations-covenants-col--boolean" />
                  <col className="operations-covenants-col--boolean" />
                  <col className="operations-covenants-col--boolean" />
                  <col className="operations-covenants-col--status" />
                  <col className="operations-covenants-col--action" />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col">S.NO</th>
                    <th scope="col">Covenant</th>
                    <th scope="col">Covenant Condition</th>
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
                      <td className="operations-covenants-empty-state" colSpan={8}>
                        No covenant records available.
                      </td>
                    </tr>
                  ) : (
                    covenantRecords.map((record, index) => (
                      <tr key={record.frontendId}>
                        <td className="operations-covenants-cell operations-covenants-cell--serial">{index + 1}</td>
                        <td className="operations-covenants-cell operations-covenants-cell--text">{record.covenant}</td>
                        <td className="operations-covenants-cell operations-covenants-cell--text">{record.covenantCondition}</td>
                        <td className="operations-covenants-cell operations-covenants-cell--center">
                          <BooleanIndicator value={record.allowWaiver} label="Allow Waiver" />
                        </td>
                        <td className="operations-covenants-cell operations-covenants-cell--center">
                          <BooleanIndicator value={record.postDisbursementDocument} label="PDD" />
                        </td>
                        <td className="operations-covenants-cell operations-covenants-cell--center">
                          {record.otc ? otcStatusLabel(record.otcStatus) : '—'}
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
