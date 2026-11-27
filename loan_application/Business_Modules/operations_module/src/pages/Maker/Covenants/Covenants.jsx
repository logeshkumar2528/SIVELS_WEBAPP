import {
  Check,
  ChevronRight,
  Download,
  PencilLine,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { downloadDocument } from '../../../../../../Core/src/utils/documentFileActions';
import { buildApplicationRoute, ROUTES } from '../../../config/routeConfig';
import { useOperationsApplication } from '../../../context/OperationsApplicationContext';
import OperationsLayout from '../../../layouts/OperationsLayout';
import { saveCovenantDocument } from '../../../services/covenantDocumentStore';
import {
  getApiErrorMessage,
  getApiErrorMessageAsync,
  getCreatedByUserId,
  operationsCovenantDetailsService,
} from '../../../services/operationsCovenantDetailsService';
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

const OPTION_TYPE = {
  ALLOW_WAIVER: 'AllowWaiver',
  PDD: 'PDD',
  OTC: 'OTC',
};

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
const MAX_FILE_BYTES = 10 * 1024 * 1024;

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
  waiverFileName: '',
  pddFileName: '',
  waiverFilePath: '',
  pddFilePath: '',
  pddExpectedDate: '',
};

function otcStatusLabel(status) {
  if (status === OTC_STATUS.HOLD) return 'Hold OTC';
  if (status === OTC_STATUS.RELEASE) return 'Release OTC';
  return '—';
}

function toDateInputValue(value) {
  if (!value) return '';
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return '';
  return [
    parsed.getFullYear(),
    String(parsed.getMonth() + 1).padStart(2, '0'),
    String(parsed.getDate()).padStart(2, '0'),
  ].join('-');
}

function resolveOptionType(form) {
  if (form.allowWaiver) return OPTION_TYPE.ALLOW_WAIVER;
  if (form.postDisbursementDocument) return OPTION_TYPE.PDD;
  if (form.otc) return OPTION_TYPE.OTC;
  return '';
}

function mapApiRecord(record) {
  if (!record || typeof record !== 'object') return null;
  const id = record.operationsCovenantDetailsId ?? record.OperationsCovenantDetailsId;
  const optionType = String(record.optionType || record.OptionType || '').trim();
  const allowWaiver = Boolean(record.allowWaiver ?? record.AllowWaiver) || optionType === OPTION_TYPE.ALLOW_WAIVER;
  const postDisbursementDocument = Boolean(record.postDisbursementDocument ?? record.PostDisbursementDocument)
    || optionType === OPTION_TYPE.PDD;
  const otc = Boolean(record.otc ?? record.Otc ?? record.OTC) || optionType === OPTION_TYPE.OTC;
  const rawOtcStatus = String(record.otcStatus ?? record.OtcStatus ?? '').toLowerCase();

  return {
    operationsCovenantDetailsId: id,
    agentCustomerId: record.agentCustomerId ?? record.AgentCustomerId,
    applicationProductDetailsId: record.applicationProductDetailsId ?? record.ApplicationProductDetailsId,
    covenant: String(record.covenant ?? record.Covenant ?? ''),
    covenantCondition: String(record.covenantCondition ?? record.CovenantCondition ?? ''),
    creationDate: toDateInputValue(record.creationDate ?? record.CreationDate),
    optionType: optionType || (allowWaiver ? OPTION_TYPE.ALLOW_WAIVER : postDisbursementDocument ? OPTION_TYPE.PDD : otc ? OPTION_TYPE.OTC : ''),
    allowWaiver,
    postDisbursementDocument,
    otc,
    otcStatus: otc
      ? (rawOtcStatus === OTC_STATUS.RELEASE ? OTC_STATUS.RELEASE : OTC_STATUS.HOLD)
      : '',
    waiverFileName: String(record.waiverFileName ?? record.WaiverFileName ?? ''),
    waiverFilePath: String(record.waiverFilePath ?? record.WaiverFilePath ?? ''),
    pddFileName: String(record.pddFileName ?? record.PddFileName ?? ''),
    pddFilePath: String(record.pddFilePath ?? record.PddFilePath ?? ''),
    pddExpectedDate: toDateInputValue(record.pddExpectedDate ?? record.PddExpectedDate),
    status: String(record.status ?? record.Status ?? ''),
    isActive: record.isActive ?? record.IsActive ?? true,
    disbursementBlocked: Boolean(record.disbursementBlocked ?? record.DisbursementBlocked),
  };
}

function validateFile(file, label) {
  if (!file) return `${label} is required.`;
  const name = String(file.name || '').toLowerCase();
  const extension = name.includes('.') ? `.${name.split('.').pop()}` : '';
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return `${label} must be PDF, JPG, PNG, DOC, or DOCX.`;
  }
  if (file.size > MAX_FILE_BYTES) {
    return `${label} must be 10 MB or less.`;
  }
  return '';
}

function validateForm(form, { isCreate }) {
  const nextErrors = {};

  if (!form.covenant.trim()) nextErrors.covenant = 'Covenant is required.';
  if (!form.covenantCondition.trim()) nextErrors.covenantCondition = 'Covenant Condition is required.';
  if (!form.creationDate) nextErrors.creationDate = 'Creation Date is required.';

  const optionType = resolveOptionType(form);
  if (!optionType) {
    nextErrors.optionType = 'Select Allow Waiver, PDD, or OTC.';
  }

  if (optionType === OPTION_TYPE.ALLOW_WAIVER) {
    if (isCreate || form.waiverFile) {
      const fileError = validateFile(form.waiverFile, 'Waiver document');
      if (fileError && isCreate) nextErrors.waiverFile = fileError;
      else if (form.waiverFile && fileError) nextErrors.waiverFile = fileError;
    } else if (!form.waiverFileName && !form.waiverFilePath) {
      nextErrors.waiverFile = 'Waiver document is required.';
    }
  }

  if (optionType === OPTION_TYPE.PDD) {
    if (!form.pddExpectedDate) nextErrors.pddExpectedDate = 'PDD expected date is required.';
    if (isCreate || form.pddFile) {
      const fileError = validateFile(form.pddFile, 'PDD document');
      if (fileError && isCreate) nextErrors.pddFile = fileError;
      else if (form.pddFile && fileError) nextErrors.pddFile = fileError;
    } else if (!form.pddFileName && !form.pddFilePath) {
      nextErrors.pddFile = 'PDD document is required.';
    }
  }

  return nextErrors;
}

function appendFormData(formData, key, value) {
  if (value === undefined || value === null) return;
  formData.append(key, String(value));
}

function buildMultipartPayload(form, {
  agentCustomerId,
  applicationProductDetailsId,
  userId,
  isUpdate,
}) {
  const formData = new FormData();
  appendFormData(formData, 'agentCustomerId', agentCustomerId);
  appendFormData(formData, 'applicationProductDetailsId', applicationProductDetailsId);
  appendFormData(formData, 'covenant', form.covenant.trim());
  appendFormData(formData, 'covenantCondition', form.covenantCondition.trim());
  appendFormData(formData, 'creationDate', form.creationDate);
  appendFormData(formData, 'optionType', resolveOptionType(form));
  appendFormData(formData, 'allowWaiver', form.allowWaiver);
  appendFormData(formData, 'postDisbursementDocument', form.postDisbursementDocument);
  appendFormData(formData, 'otc', false);

  if (form.allowWaiver && form.waiverFile instanceof File) {
    formData.append('waiverFile', form.waiverFile);
  }
  if (form.postDisbursementDocument) {
    appendFormData(formData, 'pddExpectedDate', form.pddExpectedDate);
    if (form.pddFile instanceof File) {
      formData.append('pddFile', form.pddFile);
    }
  }

  if (isUpdate) appendFormData(formData, 'modifiedBy', userId);
  else appendFormData(formData, 'createdBy', userId);

  return formData;
}

function buildOtcPayload(form, {
  agentCustomerId,
  applicationProductDetailsId,
  userId,
  isUpdate,
}) {
  const payload = {
    agentCustomerId: Number(agentCustomerId),
    applicationProductDetailsId: Number(applicationProductDetailsId),
    covenant: form.covenant.trim(),
    covenantCondition: form.covenantCondition.trim(),
    creationDate: `${form.creationDate}T00:00:00`,
    optionType: OPTION_TYPE.OTC,
    allowWaiver: false,
    postDisbursementDocument: false,
    otc: true,
    otcStatus: form.otcStatus === OTC_STATUS.RELEASE ? OTC_STATUS.RELEASE : OTC_STATUS.HOLD,
  };

  if (isUpdate) payload.modifiedBy = userId;
  else payload.createdBy = userId;

  return payload;
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

function FileLink({ name, path, onDownload }) {
  if (!name && !path) return null;
  if (path && onDownload) {
    return (
      <button
        type="button"
        className="operations-covenants-file-name operations-covenants-file-link"
        onClick={() => onDownload({ label: name || 'document.pdf', path })}
      >
        {name || 'Download file'}
      </button>
    );
  }
  return name ? <span className="operations-covenants-file-name">{name}</span> : null;
}

function getCovenantDocument(record) {
  if (!record) return null;
  const covenantId = record.operationsCovenantDetailsId ?? null;
  if (record.allowWaiver && (record.waiverFilePath || record.waiverFileName)) {
    return {
      covenantId,
      label: record.waiverFileName || 'Waiver document',
      path: record.waiverFilePath || '',
      kind: 'waiver',
    };
  }
  if (record.postDisbursementDocument && (record.pddFilePath || record.pddFileName)) {
    return {
      covenantId,
      label: record.pddFileName || 'PDD document',
      path: record.pddFilePath || '',
      kind: 'pdd',
    };
  }
  return null;
}

export default function Covenants() {
  const navigate = useNavigate();
  const { applicationId, application } = useOperationsApplication();
  const applicationProductDetailsId = application?.applicationProductDetailsId
    ?? application?.ApplicationProductDetailsId
    ?? null;

  const [form, setForm] = useState(INITIAL_FORM);
  const [covenantRecords, setCovenantRecords] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [deleteId, setDeleteId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);
  const [blockStatus, setBlockStatus] = useState({ isBlocked: false, reason: '', covenantId: null });
  const [downloadingId, setDownloadingId] = useState(null);

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleDownloadDocument = useCallback(async (document) => {
    if (!document?.path && document?.covenantId == null) {
      showToast('error', 'No uploaded document available for this covenant.');
      return;
    }

    const fileName = document.label || 'document.pdf';
    setDownloadingId(document.covenantId ?? document.path ?? 'file');
    try {
      await downloadDocument(
        () => operationsCovenantDetailsService.downloadFile({
          covenantId: document.covenantId,
          path: document.path,
          fileName,
        }),
        fileName
      );
      showToast('success', 'Document downloaded.');
    } catch (error) {
      showToast(
        'error',
        error?.message
          || await getApiErrorMessageAsync(error, 'Unable to download document.')
      );
    } finally {
      setDownloadingId(null);
    }
  }, [showToast]);

  const loadCovenants = useCallback(async () => {
    if (!applicationId) return;
    setLoading(true);
    try {
      const [list, block] = await Promise.all([
        operationsCovenantDetailsService.listByCustomer(applicationId, applicationProductDetailsId),
        operationsCovenantDetailsService.getDisbursementBlockStatus(applicationId, applicationProductDetailsId),
      ]);
      setCovenantRecords((Array.isArray(list) ? list : []).map(mapApiRecord).filter(Boolean));
      setBlockStatus({
        isBlocked: Boolean(block?.isBlocked ?? block?.IsBlocked),
        reason: String(block?.reason ?? block?.Reason ?? ''),
        covenantId: block?.covenantId ?? block?.CovenantId ?? null,
      });
    } catch (error) {
      showToast('error', getApiErrorMessage(error, 'Unable to load covenants.'));
      setCovenantRecords([]);
    } finally {
      setLoading(false);
    }
  }, [applicationId, applicationProductDetailsId, showToast]);

  useEffect(() => {
    loadCovenants();
  }, [loadCovenants]);

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setEditingId(null);
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
      otcStatus: option === 'otc' ? (current.otcStatus || OTC_STATUS.HOLD) : '',
      waiverFile: option === 'allowWaiver' ? current.waiverFile : null,
      pddFile: option === 'postDisbursementDocument' ? current.pddFile : null,
      pddExpectedDate: option === 'postDisbursementDocument' ? current.pddExpectedDate : '',
      waiverFileName: option === 'allowWaiver' ? current.waiverFileName : '',
      waiverFilePath: option === 'allowWaiver' ? current.waiverFilePath : '',
      pddFileName: option === 'postDisbursementDocument' ? current.pddFileName : '',
      pddFilePath: option === 'postDisbursementDocument' ? current.pddFilePath : '',
    }));
    setValidationErrors((current) => ({
      ...current,
      optionType: '',
      allowWaiver: '',
      postDisbursementDocument: '',
      otc: '',
      waiverFile: '',
      pddFile: '',
      pddExpectedDate: '',
    }));
  };

  const handleFileChange = (field, event) => {
    const file = event.target.files?.[0] || null;
    updateFormField(field, file);
  };

  const formIsDirty = Boolean(
    form.covenant.trim()
    || form.covenantCondition.trim()
    || form.creationDate
    || form.allowWaiver
    || form.postDisbursementDocument
    || form.otc
    || form.waiverFile
    || form.pddFile
  );

  const persistCurrentForm = async () => {
    const isUpdate = editingId != null;
    const nextErrors = validateForm(form, { isCreate: !isUpdate });
    setValidationErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return { ok: false, reason: 'validation' };
    }

    if (!applicationId || applicationProductDetailsId == null) {
      showToast('error', 'Application context is incomplete. Open covenants from an application.');
      return { ok: false, reason: 'context' };
    }

    const userId = getCreatedByUserId();
    if (!userId) {
      showToast('error', 'Unable to resolve logged-in staff id.');
      return { ok: false, reason: 'user' };
    }

    const optionType = resolveOptionType(form);
    let savedRecord = null;

    if (optionType === OPTION_TYPE.OTC) {
      const payload = buildOtcPayload(form, {
        agentCustomerId: applicationId,
        applicationProductDetailsId,
        userId,
        isUpdate,
      });
      savedRecord = isUpdate
        ? await operationsCovenantDetailsService.update(editingId, payload, false)
        : await operationsCovenantDetailsService.create(payload, false);
    } else {
      const payload = buildMultipartPayload(form, {
        agentCustomerId: applicationId,
        applicationProductDetailsId,
        userId,
        isUpdate,
      });
      savedRecord = isUpdate
        ? await operationsCovenantDetailsService.update(editingId, payload, true)
        : await operationsCovenantDetailsService.create(payload, true);
    }

    const savedId = savedRecord?.operationsCovenantDetailsId
      ?? savedRecord?.OperationsCovenantDetailsId
      ?? editingId
      ?? null;

    const uploadedFile = form.waiverFile || form.pddFile;
    if (uploadedFile && (savedId != null || form.waiverFilePath || form.pddFilePath)) {
      const savedPath = savedRecord?.waiverFilePath
        ?? savedRecord?.WaiverFilePath
        ?? savedRecord?.pddFilePath
        ?? savedRecord?.PddFilePath
        ?? (form.allowWaiver ? form.waiverFilePath : form.pddFilePath)
        ?? '';
      try {
        await saveCovenantDocument({
          covenantId: savedId,
          path: savedPath,
          fileName: uploadedFile.name,
          file: uploadedFile,
        });
      } catch {
        // Local cache is best-effort; API save already succeeded.
      }
    }

    return { ok: true, isUpdate, savedId };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await persistCurrentForm();
      if (!result.ok) return;
      showToast('success', result.isUpdate ? 'Covenant updated.' : 'Covenant added.');
      resetForm();
      await loadCovenants();
    } catch (error) {
      showToast('error', getApiErrorMessage(error, editingId != null ? 'Unable to update covenant.' : 'Unable to create covenant.'));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (record) => {
    setForm({
      covenant: record.covenant || '',
      covenantCondition: record.covenantCondition || '',
      creationDate: record.creationDate || '',
      allowWaiver: Boolean(record.allowWaiver),
      postDisbursementDocument: Boolean(record.postDisbursementDocument),
      otc: Boolean(record.otc),
      otcStatus: record.otc
        ? (record.otcStatus === OTC_STATUS.RELEASE ? OTC_STATUS.RELEASE : OTC_STATUS.HOLD)
        : '',
      waiverFile: null,
      pddFile: null,
      waiverFileName: record.waiverFileName || '',
      waiverFilePath: record.waiverFilePath || '',
      pddFileName: record.pddFileName || '',
      pddFilePath: record.pddFilePath || '',
      pddExpectedDate: record.pddExpectedDate || '',
    });
    setEditingId(record.operationsCovenantDetailsId);
    setValidationErrors({});
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await operationsCovenantDetailsService.remove(deleteId);
      showToast('success', 'Covenant deleted.');
      if (editingId === deleteId) resetForm();
      setDeleteId(null);
      await loadCovenants();
    } catch (error) {
      showToast('error', getApiErrorMessage(error, 'Unable to delete covenant.'));
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveCovenant = async () => {
    if (!applicationId || applicationProductDetailsId == null) {
      showToast('error', 'Application context is incomplete. Open covenants from an application.');
      return;
    }
    const userId = getCreatedByUserId();
    if (!userId) {
      showToast('error', 'Unable to resolve logged-in staff id.');
      return;
    }

    if (!formIsDirty && covenantRecords.length === 0) {
      showToast('error', 'Enter covenant details and choose an option before saving.');
      return;
    }

    setSavingAll(true);
    try {
      const covenantIds = covenantRecords
        .map((record) => record.operationsCovenantDetailsId)
        .filter((id) => id != null);

      if (formIsDirty) {
        const result = await persistCurrentForm();
        if (!result.ok) return;
        if (result.savedId != null && !covenantIds.includes(result.savedId)) {
          covenantIds.push(result.savedId);
        }
        resetForm();
      }

      await operationsCovenantDetailsService.save(applicationId, applicationProductDetailsId, {
        modifiedBy: userId,
        covenantIds,
      });
      showToast('success', 'Covenants saved.');
      await loadCovenants();
    } catch (error) {
      showToast('error', getApiErrorMessage(error, 'Unable to save covenants.'));
    } finally {
      setSavingAll(false);
    }
  };

  const selectedDeleteRecord = covenantRecords.find(
    (record) => record.operationsCovenantDetailsId === deleteId
  );

  return (
    <OperationsLayout title="Covenants" subtitle="Operations Maker workflow">
      <div className="operations-covenants-page">
        <nav className="operations-covenants-breadcrumb" aria-label="Breadcrumb">
          <button type="button" onClick={() => navigate(ROUTES.MAKER_DASHBOARD)}>Operations Maker</button>
          <ChevronRight size={15} aria-hidden="true" />
          <span>Covenants</span>
        </nav>

        <WorkflowSteps navigate={navigate} applicationId={applicationId} />

        {toast && (
          <div
            className={[
              'operations-covenants-toast',
              toast.type === 'error' ? 'is-error' : 'is-success',
            ].join(' ')}
            role="status"
          >
            {toast.message}
          </div>
        )}

        {blockStatus.isBlocked && (
          <div className="operations-covenants-block-banner" role="alert">
            Disbursement is blocked
            {blockStatus.reason ? `: ${blockStatus.reason}` : ' because OTC is on Hold'}.
            Release OTC before disbursement.
            {blockStatus.covenantId != null ? ` (Covenant #${blockStatus.covenantId})` : ''}
          </div>
        )}

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
                disabled={saving || loading}
              >
                <Plus size={15} aria-hidden="true" />
                {editingId != null ? (saving ? 'Updating…' : 'Update Covenant') : (saving ? 'Adding…' : 'Add Covenant')}
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
              <FieldError message={validationErrors.optionType} />

              {form.allowWaiver && (
                <div className="operations-covenants-conditional-fields">
                  <label className="operations-covenants-field">
                    <span className="operations-covenants-label">
                      Waiver Document {editingId == null ? <span className="operations-covenants-required">*</span> : null}
                    </span>
                    <input
                      className="operations-covenants-control"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={(event) => handleFileChange('waiverFile', event)}
                    />
                    {form.waiverFile?.name ? (
                      <span className="operations-covenants-file-name">Selected: {form.waiverFile.name}</span>
                    ) : (
                      <FileLink
                        name={form.waiverFileName}
                        path={form.waiverFilePath}
                        onDownload={(doc) => handleDownloadDocument({
                          ...doc,
                          covenantId: editingId,
                          kind: 'waiver',
                        })}
                      />
                    )}
                    <FieldError message={validationErrors.waiverFile} />
                  </label>
                </div>
              )}

              {form.postDisbursementDocument && (
                <div className="operations-covenants-conditional-fields">
                  <label className="operations-covenants-field">
                    <span className="operations-covenants-label">
                      PDD Document {editingId == null ? <span className="operations-covenants-required">*</span> : null}
                    </span>
                    <input
                      className="operations-covenants-control"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={(event) => handleFileChange('pddFile', event)}
                    />
                    {form.pddFile?.name ? (
                      <span className="operations-covenants-file-name">Selected: {form.pddFile.name}</span>
                    ) : (
                      <FileLink
                        name={form.pddFileName}
                        path={form.pddFilePath}
                        onDownload={(doc) => handleDownloadDocument({
                          ...doc,
                          covenantId: editingId,
                          kind: 'pdd',
                        })}
                      />
                    )}
                    <FieldError message={validationErrors.pddFile} />
                  </label>
                  <label className="operations-covenants-field">
                    <span className="operations-covenants-label">Expected Date <span className="operations-covenants-required">*</span></span>
                    <input
                      className="operations-covenants-control"
                      type="date"
                      value={form.pddExpectedDate}
                      onChange={(event) => updateFormField('pddExpectedDate', event.target.value)}
                    />
                    <FieldError message={validationErrors.pddExpectedDate} />
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
                {editingId != null && (
                  <button
                    type="button"
                    className="operations-covenants-button operations-covenants-button--secondary"
                    onClick={resetForm}
                    disabled={saving}
                  >
                    Cancel Edit
                  </button>
                )}
                <button
                  type="button"
                  className="operations-covenants-button operations-covenants-button--primary"
                  onClick={handleSaveCovenant}
                  disabled={savingAll || saving || loading || (!formIsDirty && covenantRecords.length === 0)}
                >
                  {savingAll ? 'Saving…' : 'Save Covenant'}
                </button>
              </div>
            </form>
          </section>

          <section className="operations-covenants-panel operations-covenants-list-panel" aria-labelledby="operations-covenants-list-title">
            <div className="operations-covenants-panel-heading">
              <div>
                <h2 id="operations-covenants-list-title">Covenant List</h2>
                <p>{loading ? 'Loading covenants…' : 'Active covenants for this application.'}</p>
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
                  {!loading && covenantRecords.length === 0 ? (
                    <tr>
                      <td className="operations-covenants-empty-state" colSpan={8}>
                        No covenant records available.
                      </td>
                    </tr>
                  ) : (
                    covenantRecords.map((record, index) => {
                      const document = getCovenantDocument(record);
                      return (
                        <tr key={record.operationsCovenantDetailsId ?? index}>
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
                            <span className="operations-covenants-status">{record.status || '—'}</span>
                          </td>
                          <td className="operations-covenants-cell operations-covenants-actions-cell">
                            <button
                              type="button"
                              className="operations-covenants-row-action"
                              onClick={() => handleDownloadDocument(document)}
                              aria-label={document ? `Download ${document.label}` : `No document for ${record.covenant}`}
                              title={document?.path ? `Download ${document.label}` : 'No uploaded document'}
                              disabled={
                                !document?.path
                                || saving
                                || deleting
                                || downloadingId === (document?.covenantId ?? document?.path)
                              }
                            >
                              <Download size={15} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className="operations-covenants-row-action"
                              onClick={() => handleEdit(record)}
                              aria-label={`Edit ${record.covenant}`}
                              title="Edit covenant"
                              disabled={saving || deleting}
                            >
                              <PencilLine size={15} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className="operations-covenants-row-action operations-covenants-row-action--danger"
                              onClick={() => setDeleteId(record.operationsCovenantDetailsId)}
                              aria-label={`Delete ${record.covenant}`}
                              title="Delete covenant"
                              disabled={saving || deleting}
                            >
                              <Trash2 size={15} aria-hidden="true" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
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
                <button
                  type="button"
                  className="operations-covenants-modal-close"
                  onClick={() => setDeleteId(null)}
                  aria-label="Close delete confirmation"
                  disabled={deleting}
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
              <p>Remove “{selectedDeleteRecord.covenant}” from the Covenant List?</p>
              <div className="operations-covenants-modal-footer">
                <button
                  type="button"
                  className="operations-covenants-button operations-covenants-button--secondary"
                  onClick={() => setDeleteId(null)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="operations-covenants-button operations-covenants-button--danger"
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </OperationsLayout>
  );
}
