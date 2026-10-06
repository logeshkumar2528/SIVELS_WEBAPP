import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  FolderOpen,
  Paperclip,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import Button from '../../components/Button/Button';
import Modal from '../../components/Modal/Modal';
import Select from '../../components/Select/Select';
import rmCustomerService from '../../services/rmCustomerService';
import { parseApiErrorBody } from '../../utils/formatUserFacingError';
import { validateApplicantDocumentFile } from '../../../../../Core/src/utils/documentTypeHelper';
import './CustomerProofModal.css';

const ACCEPTED_FILE_TYPES = '.pdf,.jpg,.jpeg,.png';
const PREVIEW_URL_TTL_MS = 60000;

function pick(row, ...keys) {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function isActiveRecord(row) {
  if (!row) return false;
  if (row.isActive === false || row.IsActive === false) return false;
  const status = String(row.status ?? row.Status ?? '').trim().toLowerCase();
  return status !== 'inactive' && status !== 'deleted';
}

function sameValue(a, b) {
  return a !== undefined && a !== null && b !== undefined && b !== null && String(a) === String(b);
}

function sameCode(a, b) {
  return Boolean(a) && Boolean(b) && String(a).trim().toUpperCase() === String(b).trim().toUpperCase();
}

function hasValue(value) {
  return value !== undefined && value !== null && value !== '';
}

function baseName(path) {
  return path ? String(path).replace(/\\/g, '/').split('/').pop() : '';
}

function formatFileSize(bytes) {
  const size = Number(bytes);
  if (!size || size <= 0) return '';
  if (size < 1024) return `${size} B`;
  const kb = size / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}

function mimeTypeFor(fileName, fallback) {
  if (/\.pdf$/i.test(fileName)) return 'application/pdf';
  if (/\.(jpg|jpeg)$/i.test(fileName)) return 'image/jpeg';
  if (/\.png$/i.test(fileName)) return 'image/png';
  return fallback || 'application/octet-stream';
}

function isPreviewable(type) {
  return type === 'application/pdf' || /^image\//.test(type);
}

async function errorMessage(err, fallback) {
  if (!err?.response) {
    return err?.message && !/network|timeout/i.test(err.message)
      ? err.message
      : `${fallback} Please check your connection and try again.`;
  }
  let data = err.response.data;
  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    try {
      const text = await data.text();
      try { data = JSON.parse(text); } catch { data = text; }
    } catch {
      data = null;
    }
  }
  if (data && typeof data === 'object') return parseApiErrorBody(data, fallback).message;
  if (typeof data === 'string' && data.trim() && !data.trim().startsWith('<')) return data.trim();
  return fallback;
}

function toCategoryOption(row) {
  return {
    value: pick(row, 'documentTypeId', 'DocumentTypeId'),
    label: pick(row, 'documentTypeName', 'DocumentTypeName', 'documentTypeCode', 'DocumentTypeCode') || '',
    isActive: isActiveRecord(row),
  };
}

function toProofOption(row) {
  return {
    value: pick(row, 'proofId', 'ProofId'),
    label: pick(row, 'proofName', 'ProofName', 'proofCode', 'ProofCode') || '',
    documentTypeId: pick(row, 'documentTypeId', 'DocumentTypeId'),
    isActive: isActiveRecord(row),
  };
}

function normalizeProofRecord(row) {
  const filePath = pick(row, 'filePath', 'FilePath');
  return {
    id: pick(row, 'id', 'Id', 'customerDocumentProofId', 'CustomerDocumentProofId'),
    agentCustomerId: pick(row, 'agentCustomerId', 'AgentCustomerId'),
    applicationProductDetailsId: pick(row, 'applicationProductDetailsId', 'ApplicationProductDetailsId'),
    applicantSequence: pick(row, 'applicantSequence', 'ApplicantSequence'),
    verificationTypeCode: pick(row, 'verificationTypeCode', 'VerificationTypeCode'),
    documentTypeId: pick(row, 'documentTypeId', 'DocumentTypeId'),
    proofId: pick(row, 'proofId', 'ProofId'),
    fileName: pick(row, 'originalFileName', 'OriginalFileName', 'fileName', 'FileName') || baseName(filePath),
    contentType: pick(row, 'contentType', 'ContentType'),
    fileSize: pick(row, 'fileSize', 'FileSize'),
    status: pick(row, 'uploadStatus', 'UploadStatus', 'status', 'Status') || (isActiveRecord(row) ? 'Active' : 'Inactive'),
    uploadedAt: pick(row, 'updatedAt', 'UpdatedAt', 'modifiedDate', 'ModifiedDate', 'createdAt', 'CreatedAt', 'createdDate', 'CreatedDate', 'uploadedAt', 'UploadedAt'),
    isActive: isActiveRecord(row),
  };
}

/**
 * Customer Proof upload/list modal for one applicant and one verification type
 * (e.g. Aadhaar or PAN). Holds its own state so the identity document flows on
 * the KYC page are never affected.
 *
 * context: {
 *   applicationId, applicationProductDetailsId, applicantSequence,
 *   verificationTypeCode, verificationTypeName, applicantName, applicantRole
 * }
 */
export default function CustomerProofModal({ onClose, context, resolveAgentCustomerId }) {
  const {
    applicationId,
    applicationProductDetailsId,
    applicantSequence,
    verificationTypeCode,
    verificationTypeName,
    applicantName,
    applicantRole,
  } = context;

  const [agentCustomerId, setAgentCustomerId] = useState(null);
  const [isResolvingCustomer, setIsResolvingCustomer] = useState(true);

  // All categories/proofs (including inactive) are kept for resolving names of
  // saved records; only active ones are offered for selection.
  const [categories, setCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [categoryError, setCategoryError] = useState('');

  const [proofsByCategory, setProofsByCategory] = useState({});
  const [isLoadingProofs, setIsLoadingProofs] = useState(false);
  const [proofError, setProofError] = useState('');

  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedProofId, setSelectedProofId] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [formError, setFormError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [savedProofs, setSavedProofs] = useState([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [savedError, setSavedError] = useState('');

  const [replaceTarget, setReplaceTarget] = useState(null);
  const [replaceFile, setReplaceFile] = useState(null);
  const [isReplacing, setIsReplacing] = useState(false);
  const [busyAction, setBusyAction] = useState(null); // { id, type: 'view' | 'download' | 'remove' }
  const [confirmRemoveId, setConfirmRemoveId] = useState(null);
  const [rowError, setRowError] = useState({ id: null, message: '' });
  const [successMessage, setSuccessMessage] = useState('');

  const fileInputRef = useRef(null);
  const replaceInputRef = useRef(null);
  const uploadingRef = useRef(false);
  const proofRequestRef = useRef(0);
  const savedRequestRef = useRef(0);
  const mountedRef = useRef(true);
  const proofsByCategoryRef = useRef({});
  const resolveAgentCustomerIdRef = useRef(resolveAgentCustomerId);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    proofsByCategoryRef.current = proofsByCategory;
  }, [proofsByCategory]);

  useEffect(() => {
    resolveAgentCustomerIdRef.current = resolveAgentCustomerId;
  }, [resolveAgentCustomerId]);

  const missingContext = useMemo(() => {
    const missing = [];
    if (!isResolvingCustomer && !hasValue(agentCustomerId)) missing.push('customer ID');
    if (!hasValue(applicationProductDetailsId)) missing.push('application product details ID');
    if (!hasValue(applicantSequence)) missing.push('applicant sequence');
    if (!hasValue(verificationTypeCode)) missing.push('verification type');
    return missing;
  }, [isResolvingCustomer, agentCustomerId, applicationProductDetailsId, applicantSequence, verificationTypeCode]);

  const categoryOptions = useMemo(
    () => categories.filter((c) => c.isActive).map(({ value, label }) => ({ value, label })),
    [categories]
  );
  const proofOptions = useMemo(
    () => (proofsByCategory[selectedCategoryId] || []).filter((p) => p.isActive).map(({ value, label }) => ({ value, label })),
    [proofsByCategory, selectedCategoryId]
  );

  const categoryName = useCallback(
    (id) => categories.find((c) => sameValue(c.value, id))?.label,
    [categories]
  );
  const proofName = useCallback(
    (categoryId, id) => (proofsByCategory[categoryId] || []).find((p) => sameValue(p.value, id))?.label,
    [proofsByCategory]
  );

  const fetchProofsForCategory = useCallback(async (documentTypeId) => {
    const rows = await rmCustomerService.getProofsByCategory(documentTypeId);
    const options = rows
      .map(toProofOption)
      .filter((p) => hasValue(p.value) && p.label)
      .filter((p) => !hasValue(p.documentTypeId) || sameValue(p.documentTypeId, documentTypeId));
    if (mountedRef.current) {
      setProofsByCategory((prev) => ({ ...prev, [documentTypeId]: options }));
    }
    return options;
  }, []);

  const loadCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    setCategoryError('');
    try {
      const rows = await rmCustomerService.getProofCategories();
      if (!mountedRef.current) return;
      setCategories(rows.map(toCategoryOption).filter((c) => hasValue(c.value) && c.label));
    } catch (err) {
      const message = await errorMessage(err, 'Unable to load proof categories.');
      if (mountedRef.current) setCategoryError(message);
    } finally {
      if (mountedRef.current) setIsLoadingCategories(false);
    }
  }, []);

  const loadSavedProofs = useCallback(async (customerId) => {
    const requestId = ++savedRequestRef.current;
    if (!hasValue(customerId) || !hasValue(applicationProductDetailsId) || !hasValue(applicantSequence) || !hasValue(verificationTypeCode)) {
      setSavedProofs([]);
      setIsLoadingSaved(false);
      return;
    }
    setIsLoadingSaved(true);
    setSavedError('');
    try {
      const rows = await rmCustomerService.getApplicationCustomerProofs({
        agentCustomerId: customerId,
        applicationProductDetailsId,
        applicantSequence,
        verificationTypeCode,
      });
      if (!mountedRef.current || requestId !== savedRequestRef.current) return;
      const matches = rows
        .filter(isActiveRecord)
        .map(normalizeProofRecord)
        .filter((r) => hasValue(r.id)
          && sameValue(r.agentCustomerId, customerId)
          && sameValue(r.applicationProductDetailsId, applicationProductDetailsId)
          && hasValue(r.applicantSequence) && Number(r.applicantSequence) === Number(applicantSequence)
          && sameCode(r.verificationTypeCode, verificationTypeCode))
        .sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0));
      setSavedProofs(matches);

      const missing = [...new Set(matches.map((r) => r.documentTypeId).filter(hasValue))]
        .filter((id) => !proofsByCategoryRef.current[id]);
      await Promise.allSettled(missing.map((id) => fetchProofsForCategory(id)));
    } catch (err) {
      const message = await errorMessage(err, 'Unable to load uploaded customer proofs.');
      if (mountedRef.current && requestId === savedRequestRef.current) setSavedError(message);
    } finally {
      if (mountedRef.current && requestId === savedRequestRef.current) setIsLoadingSaved(false);
    }
  }, [applicationProductDetailsId, applicantSequence, verificationTypeCode, fetchProofsForCategory]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsResolvingCustomer(true);
      let customerId = null;
      try {
        customerId = await resolveAgentCustomerIdRef.current();
      } catch {
        customerId = null;
      }
      if (cancelled || !mountedRef.current) return;
      setAgentCustomerId(customerId);
      setIsResolvingCustomer(false);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!isResolvingCustomer) loadSavedProofs(agentCustomerId);
  }, [isResolvingCustomer, agentCustomerId, loadSavedProofs]);

  const clearFileInput = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCategoryChange = async (value) => {
    setSelectedCategoryId(value);
    setSelectedProofId('');
    clearFileInput();
    setFormError('');
    setProofError('');
    setSuccessMessage('');
    const requestId = ++proofRequestRef.current;
    if (!value || proofsByCategoryRef.current[value]) {
      setIsLoadingProofs(false);
      return;
    }
    setIsLoadingProofs(true);
    try {
      await fetchProofsForCategory(value);
    } catch (err) {
      const message = await errorMessage(err, 'Unable to load proofs for this category.');
      if (mountedRef.current && requestId === proofRequestRef.current) setProofError(message);
    } finally {
      if (mountedRef.current && requestId === proofRequestRef.current) setIsLoadingProofs(false);
    }
  };

  const handleProofChange = (value) => {
    setSelectedProofId(value);
    clearFileInput();
    setFormError('');
    setSuccessMessage('');
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setSuccessMessage('');
    if (!file) return;
    const { valid, error } = validateApplicantDocumentFile(file);
    if (!valid) {
      setFormError(error);
      clearFileInput();
      return;
    }
    setFormError('');
    setSelectedFile(file);
  };

  const contextError = () => {
    if (isResolvingCustomer) return 'Customer details are still loading. Please try again in a moment.';
    if (!hasValue(agentCustomerId)) return 'Customer ID is not available for this application.';
    if (!hasValue(applicationProductDetailsId)) return 'Application product details are not available yet. Please try again in a moment.';
    if (!hasValue(applicantSequence)) return 'Applicant sequence is not available for this applicant.';
    if (!hasValue(verificationTypeCode)) return 'Verification type is not available. Open Customer Proof from the Aadhaar or PAN option.';
    return '';
  };

  const buildFormData = ({ documentTypeId, proofId, file }) => {
    const formData = new FormData();
    formData.append('AgentCustomerId', String(agentCustomerId));
    formData.append('ApplicationProductDetailsId', String(applicationProductDetailsId));
    formData.append('ApplicantSequence', String(applicantSequence));
    formData.append('VerificationTypeCode', verificationTypeCode);
    formData.append('DocumentTypeId', String(documentTypeId));
    formData.append('ProofId', String(proofId));
    formData.append('File', file);
    return formData;
  };

  const trackProgress = (event) => {
    if (event?.total) setUploadProgress(Math.round((event.loaded / event.total) * 100));
  };

  const handleUpload = async () => {
    if (uploadingRef.current) return;
    setSuccessMessage('');
    const missing = contextError();
    if (missing) return setFormError(missing);
    if (!selectedCategoryId) return setFormError('Please select a proof category.');
    if (!selectedProofId) return setFormError('Please select a proof.');
    if (!selectedFile) return setFormError('Please choose a file to upload.');

    uploadingRef.current = true;
    setFormError('');
    setIsUploading(true);
    setUploadProgress(0);
    const label = proofName(selectedCategoryId, selectedProofId) || 'Proof';
    try {
      const created = await rmCustomerService.uploadApplicationCustomerProof(
        buildFormData({ documentTypeId: selectedCategoryId, proofId: selectedProofId, file: selectedFile }),
        { onUploadProgress: trackProgress }
      );
      if (!mountedRef.current) return;
      const record = created && typeof created === 'object' ? normalizeProofRecord(created) : null;
      if (record && hasValue(record.id)) {
        setSavedProofs((prev) => [record, ...prev.filter((r) => !sameValue(r.id, record.id))]);
      }
      clearFileInput();
      setSuccessMessage(`${label} uploaded successfully.`);
      loadSavedProofs(agentCustomerId);
    } catch (err) {
      const message = await errorMessage(err, 'Upload failed.');
      if (mountedRef.current) setFormError(message);
    } finally {
      uploadingRef.current = false;
      if (mountedRef.current) setIsUploading(false);
    }
  };

  const startReplace = (record) => {
    setReplaceTarget(record);
    setReplaceFile(null);
    setConfirmRemoveId(null);
    setRowError({ id: null, message: '' });
    setSuccessMessage('');
  };

  const cancelReplace = () => {
    setReplaceTarget(null);
    setReplaceFile(null);
    if (replaceInputRef.current) replaceInputRef.current.value = '';
  };

  const handleReplaceFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;
    const { valid, error } = validateApplicantDocumentFile(file);
    if (!valid) {
      setRowError({ id: replaceTarget?.id, message: error });
      setReplaceFile(null);
      event.target.value = '';
      return;
    }
    setRowError({ id: null, message: '' });
    setReplaceFile(file);
  };

  const handleReplace = async () => {
    if (!replaceTarget || uploadingRef.current) return;
    const missing = contextError();
    if (missing) return setRowError({ id: replaceTarget.id, message: missing });
    if (!replaceFile) return setRowError({ id: replaceTarget.id, message: 'Please choose a replacement file.' });

    uploadingRef.current = true;
    setIsReplacing(true);
    setUploadProgress(0);
    setRowError({ id: null, message: '' });
    const label = proofName(replaceTarget.documentTypeId, replaceTarget.proofId) || 'Proof';
    try {
      await rmCustomerService.replaceApplicationCustomerProof(
        replaceTarget.id,
        buildFormData({ documentTypeId: replaceTarget.documentTypeId, proofId: replaceTarget.proofId, file: replaceFile }),
        { onUploadProgress: trackProgress }
      );
      if (!mountedRef.current) return;
      cancelReplace();
      setSuccessMessage(`${label} replaced successfully.`);
      loadSavedProofs(agentCustomerId);
    } catch (err) {
      const message = await errorMessage(err, 'Replace failed. The existing file has not been changed.');
      if (mountedRef.current) setRowError({ id: replaceTarget.id, message });
    } finally {
      uploadingRef.current = false;
      if (mountedRef.current) setIsReplacing(false);
    }
  };

  const fetchProofBlob = async (record) => {
    const { blob, contentType } = await rmCustomerService.downloadApplicationCustomerProof(record.id);
    if (!blob || blob.size === 0) throw new Error('The file is empty.');
    const fileName = record.fileName || `customer-proof-${record.id}`;
    const type = mimeTypeFor(fileName, record.contentType || blob.type || contentType);
    return { blob: new Blob([blob], { type }), fileName, type };
  };

  const saveBlob = (url, fileName) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleView = async (record) => {
    // Open the tab synchronously so the browser does not treat it as a popup.
    const previewWindow = window.open('', '_blank');
    setBusyAction({ id: record.id, type: 'view' });
    setRowError({ id: null, message: '' });
    try {
      const { blob, fileName, type } = await fetchProofBlob(record);
      const url = URL.createObjectURL(blob);
      if (previewWindow && isPreviewable(type)) {
        previewWindow.location.href = url;
      } else {
        previewWindow?.close();
        saveBlob(url, fileName);
      }
      setTimeout(() => URL.revokeObjectURL(url), PREVIEW_URL_TTL_MS);
    } catch (err) {
      previewWindow?.close();
      const message = await errorMessage(err, 'Unable to open this file.');
      if (mountedRef.current) setRowError({ id: record.id, message });
    } finally {
      if (mountedRef.current) setBusyAction(null);
    }
  };

  const handleDownload = async (record) => {
    setBusyAction({ id: record.id, type: 'download' });
    setRowError({ id: null, message: '' });
    try {
      const { blob, fileName } = await fetchProofBlob(record);
      const url = URL.createObjectURL(blob);
      saveBlob(url, fileName);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      const message = await errorMessage(err, 'Download failed.');
      if (mountedRef.current) setRowError({ id: record.id, message });
    } finally {
      if (mountedRef.current) setBusyAction(null);
    }
  };

  const handleRemove = async (record) => {
    setBusyAction({ id: record.id, type: 'remove' });
    setRowError({ id: null, message: '' });
    try {
      await rmCustomerService.deleteApplicationCustomerProof(record.id);
      if (!mountedRef.current) return;
      setConfirmRemoveId(null);
      setSuccessMessage(`${proofName(record.documentTypeId, record.proofId) || 'Proof'} removed.`);
      loadSavedProofs(agentCustomerId);
    } catch (err) {
      const status = err?.response?.status;
      const message = status === 404 || status === 405
        ? 'Removing customer proofs is not supported by the server.'
        : await errorMessage(err, 'Unable to remove this proof.');
      if (mountedRef.current) setRowError({ id: record.id, message });
    } finally {
      if (mountedRef.current) setBusyAction(null);
    }
  };

  const isBusy = isUploading || isReplacing || busyAction?.type === 'remove';
  const handleClose = () => {
    if (!isBusy) onClose();
  };

  const proofAlreadyUploaded = selectedProofId
    && savedProofs.some((r) => sameValue(r.proofId, selectedProofId) && sameValue(r.documentTypeId, selectedCategoryId));

  const displayName = applicantName && applicantName !== applicantRole
    ? `${applicantName} (${applicantRole})`
    : applicantRole;

  return (
    <Modal
      show
      onHide={handleClose}
      title={`Customer Proof - ${displayName}`}
      size="lg"
      className="cp-modal"
      footer={
        <Button variant="primary" onClick={handleClose} disabled={isBusy}>
          Done
        </Button>
      }
    >
      <dl className="cp-context">
        <div><dt>Application</dt><dd>#{applicationId}</dd></div>
        <div><dt>Product Details ID</dt><dd>{hasValue(applicationProductDetailsId) ? applicationProductDetailsId : '—'}</dd></div>
        <div><dt>Applicant</dt><dd>{applicantRole} · Seq {hasValue(applicantSequence) ? applicantSequence : '—'}</dd></div>
        <div><dt>Verification</dt><dd>{verificationTypeName || verificationTypeCode || '—'}</dd></div>
      </dl>

      {missingContext.length > 0 && (
        <div className="cp-alert cp-alert--warn" role="alert">
          <AlertCircle size={16} />
          <span>Missing {missingContext.join(', ')}. Uploads are disabled until the application details finish loading.</span>
        </div>
      )}

      {successMessage && (
        <div className="cp-alert cp-alert--success" role="status">
          <CheckCircle2 size={16} />
          <span>{successMessage}</span>
          <button type="button" className="cp-alert-close" onClick={() => setSuccessMessage('')} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}

      <section className="cp-section">
        <h4 className="cp-section-title">Upload Proof</h4>

        {categoryError ? (
          <div className="cp-alert cp-alert--error" role="alert">
            <AlertCircle size={16} />
            <span>{categoryError}</span>
            <Button variant="outline" size="sm" icon={<RefreshCw size={13} />} onClick={loadCategories}>
              Retry
            </Button>
          </div>
        ) : (
          <div className="cp-form-grid">
            <div className="aw-field">
              <label className="form-label">Proof Category</label>
              <div className="aw-input-wrapper">
                <Select
                  value={selectedCategoryId}
                  onChange={handleCategoryChange}
                  options={categoryOptions}
                  placeholder={isLoadingCategories ? 'Loading categories...' : 'Select category'}
                  disabled={isLoadingCategories || isUploading}
                />
              </div>
              {!isLoadingCategories && categoryOptions.length === 0 && (
                <span className="cp-hint">No active proof categories are configured.</span>
              )}
            </div>

            <div className="aw-field">
              <label className="form-label">Proof</label>
              <div className="aw-input-wrapper">
                <Select
                  value={selectedProofId}
                  onChange={handleProofChange}
                  options={proofOptions}
                  placeholder={
                    !selectedCategoryId ? 'Select a category first'
                      : isLoadingProofs ? 'Loading proofs...'
                        : proofOptions.length === 0 ? 'No proofs available'
                          : 'Select proof'
                  }
                  disabled={!selectedCategoryId || isLoadingProofs || isUploading || proofOptions.length === 0}
                />
              </div>
              {proofError && (
                <span className="aw-field-error">
                  {proofError}{' '}
                  <button type="button" className="cp-link-btn" onClick={() => handleCategoryChange(selectedCategoryId)}>
                    Retry
                  </button>
                </span>
              )}
              {selectedCategoryId && !isLoadingProofs && !proofError && proofOptions.length === 0 && (
                <span className="cp-hint">No active proofs are configured for this category.</span>
              )}
            </div>
          </div>
        )}

        {selectedProofId && (
          <div className="cp-upload-row">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              className="cp-file-input"
              id="cp-file-input"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <label htmlFor="cp-file-input" className={`cp-file-picker ${isUploading ? 'is-disabled' : ''}`}>
              <Paperclip size={14} />
              <span>{selectedFile ? 'Change file' : 'Choose file'}</span>
            </label>
            <div className="cp-file-name" title={selectedFile?.name}>
              {selectedFile ? (
                <>
                  <FileText size={14} />
                  <span className="cp-file-name-text">{selectedFile.name}</span>
                  <span className="cp-file-size">{formatFileSize(selectedFile.size)}</span>
                </>
              ) : (
                <span className="cp-hint">PDF, JPG, JPEG or PNG</span>
              )}
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={<Upload size={14} />}
              onClick={handleUpload}
              disabled={isUploading || !selectedFile || missingContext.length > 0 || isResolvingCustomer}
            >
              {isUploading ? `Uploading${uploadProgress ? ` ${uploadProgress}%` : '...'}` : 'Upload'}
            </Button>
          </div>
        )}

        {proofAlreadyUploaded && !isUploading && (
          <span className="cp-hint cp-hint--warn">
            This proof is already uploaded for {verificationTypeName || verificationTypeCode}. Use Replace below to update the existing file.
          </span>
        )}

        {formError && (
          <div className="cp-alert cp-alert--error" role="alert">
            <AlertCircle size={16} />
            <span>{formError}</span>
          </div>
        )}
      </section>

      <section className="cp-section">
        <div className="cp-section-header">
          <h4 className="cp-section-title">Uploaded Proofs</h4>
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw size={13} />}
            onClick={() => loadSavedProofs(agentCustomerId)}
            disabled={isLoadingSaved || isResolvingCustomer}
          >
            Refresh
          </Button>
        </div>

        {isLoadingSaved || isResolvingCustomer ? (
          <div className="kyc-docs-loading">
            <div className="kyc-docs-spinner" />
            <span className="kyc-docs-loading-text">Loading uploaded proofs...</span>
          </div>
        ) : savedError ? (
          <div className="cp-alert cp-alert--error" role="alert">
            <AlertCircle size={16} />
            <span>{savedError}</span>
            <Button variant="outline" size="sm" icon={<RefreshCw size={13} />} onClick={() => loadSavedProofs(agentCustomerId)}>
              Retry
            </Button>
          </div>
        ) : savedProofs.length === 0 ? (
          <div className="kyc-docs-empty cp-empty">
            <div className="kyc-docs-empty-icon">
              <FolderOpen size={22} />
            </div>
            <p className="kyc-docs-empty-title">No customer proofs uploaded</p>
            <p className="kyc-docs-empty-desc">
              {missingContext.length > 0
                ? 'Uploaded proofs will appear once the application details are available.'
                : `No ${verificationTypeName || verificationTypeCode} proofs have been uploaded for this applicant yet.`}
            </p>
          </div>
        ) : (
          <ul className="cp-list">
            {savedProofs.map((record) => {
              const isRowBusy = busyAction?.id === record.id;
              const isReplacingRow = replaceTarget?.id === record.id;
              const rowProofName = proofName(record.documentTypeId, record.proofId) || 'Proof name unavailable';
              const rowCategoryName = categoryName(record.documentTypeId) || 'Category unavailable';
              const meta = [record.verificationTypeCode, formatFileSize(record.fileSize), formatDate(record.uploadedAt)].filter(Boolean);
              return (
                <li key={record.id} className="cp-item">
                  <div className="cp-item-main">
                    <div className="cp-item-icon"><FileText size={18} /></div>
                    <div className="cp-item-info">
                      <div className="cp-item-title-row">
                        <span className="cp-item-title">{rowProofName}</span>
                        <span className="cp-item-category">{rowCategoryName}</span>
                        <span className={`kyc-doc-badge ${record.isActive ? 'kyc-doc-badge--verified' : 'kyc-doc-badge--previous'}`}>
                          {record.status}
                        </span>
                      </div>
                      <span className="cp-item-file" title={record.fileName}>{record.fileName || 'File'}</span>
                      {meta.length > 0 && <span className="cp-item-meta">{meta.join(' · ')}</span>}
                    </div>
                    <div className="cp-item-actions">
                      <button
                        type="button"
                        className="co-doc-btn co-doc-btn--view"
                        onClick={() => handleView(record)}
                        disabled={isRowBusy || isReplacing}
                      >
                        <Eye size={12} />
                        <span>{isRowBusy && busyAction.type === 'view' ? 'Opening...' : 'View'}</span>
                      </button>
                      <button
                        type="button"
                        className="co-doc-btn co-doc-btn--replace"
                        onClick={() => handleDownload(record)}
                        disabled={isRowBusy || isReplacing}
                      >
                        <Download size={12} />
                        <span>{isRowBusy && busyAction.type === 'download' ? 'Downloading...' : 'Download'}</span>
                      </button>
                      <button
                        type="button"
                        className="co-doc-btn co-doc-btn--replace"
                        onClick={() => startReplace(record)}
                        disabled={isRowBusy || isReplacing || isReplacingRow}
                      >
                        <RefreshCw size={12} />
                        <span>Replace</span>
                      </button>
                      <button
                        type="button"
                        className="co-doc-btn cp-btn-remove"
                        onClick={() => { setConfirmRemoveId(record.id); cancelReplace(); }}
                        disabled={isRowBusy || isReplacing}
                        aria-label="Remove proof"
                        title="Remove proof"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {isReplacingRow && (
                    <div className="cp-item-panel">
                      <input
                        ref={replaceInputRef}
                        type="file"
                        accept={ACCEPTED_FILE_TYPES}
                        className="cp-file-input"
                        id={`cp-replace-${record.id}`}
                        onChange={handleReplaceFileChange}
                        disabled={isReplacing}
                      />
                      <label htmlFor={`cp-replace-${record.id}`} className={`cp-file-picker ${isReplacing ? 'is-disabled' : ''}`}>
                        <Paperclip size={14} />
                        <span>{replaceFile ? 'Change file' : 'Choose new file'}</span>
                      </label>
                      <div className="cp-file-name" title={replaceFile?.name}>
                        {replaceFile ? (
                          <>
                            <span className="cp-file-name-text">{replaceFile.name}</span>
                            <span className="cp-file-size">{formatFileSize(replaceFile.size)}</span>
                          </>
                        ) : (
                          <span className="cp-hint">Replaces {rowProofName} · PDF, JPG, JPEG or PNG</span>
                        )}
                      </div>
                      <div className="cp-panel-actions">
                        <Button variant="secondary" size="sm" onClick={cancelReplace} disabled={isReplacing}>Cancel</Button>
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<Upload size={13} />}
                          onClick={handleReplace}
                          disabled={isReplacing || !replaceFile || missingContext.length > 0}
                        >
                          {isReplacing ? `Replacing${uploadProgress ? ` ${uploadProgress}%` : '...'}` : 'Replace'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {confirmRemoveId === record.id && (
                    <div className="cp-item-panel cp-item-panel--danger">
                      <span>Remove this proof from the application?</span>
                      <div className="cp-panel-actions">
                        <Button variant="secondary" size="sm" onClick={() => setConfirmRemoveId(null)} disabled={isRowBusy}>Cancel</Button>
                        <Button variant="danger" size="sm" icon={<Trash2 size={13} />} onClick={() => handleRemove(record)} disabled={isRowBusy}>
                          {isRowBusy && busyAction.type === 'remove' ? 'Removing...' : 'Remove'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {rowError.id === record.id && rowError.message && (
                    <div className="cp-alert cp-alert--error cp-alert--inline" role="alert">
                      <AlertCircle size={14} />
                      <span>{rowError.message}</span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </Modal>
  );
}
