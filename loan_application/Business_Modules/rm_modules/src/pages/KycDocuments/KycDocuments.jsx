import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FileText,
  UserCheck,
  Image as ImageIcon,
  X,
  Eye,
  ExternalLink,
  Download,
  AlertCircle,
  RefreshCw,
  FolderOpen,
  FolderArchive,
  Clock
} from 'lucide-react';
import iconMap from '../../config/iconMap';
import Button from '../../components/Button/Button';
import Modal from '../../components/Modal/Modal';
import Select from '../../components/Select/Select';
import { ROUTES } from '../../config/routeConfig';
import { APPLICATION_WIZARD_STEPS } from '../../config/applicationWizard';
import { useApplicationDraftStore } from '../../state/ApplicationDraftContext';
import WizardSectionLayout from '../../components/WizardSectionLayout/WizardSectionLayout';
import {
  buildSectionUpdate,
  createArray,
  getApplicantCount,
  getSectionState,
} from '../applicationWizard/flowUtils';
import ErrorPopup from '../../components/ErrorPopup/ErrorPopup';
import { parseApiErrorBody } from '../../utils/formatUserFacingError';
import { resolveDocumentTypeId, validateApplicantDocumentFile } from '../../../../../Core/src/utils/documentTypeHelper';
import { resolveVerificationIdByCodeOrName } from '../../../../../Core/src/utils/verificationHelper';
import { getCurrentRMContext } from '../../utils/rmContext';
import rmCustomerService from '../../services/rmCustomerService';
import { replaceManualDocument, manualDocumentPath, documentPaths, overlayPendingManualDocument, syncManualDocuments, isApplicantDocumentTuple, persistManualUploads, KYC_CATEGORIES, storedCategoryDocuments, updateApplicantSlot, clearUploadedSlot, slotReference, persistIdentitySlot, overlayPendingDocuments, documentHistoryKey } from './kycDocumentState';
import './KycDocuments.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';

export const CANONICAL_CATEGORY_META = {
  PROFILE: { order: 1, name: 'Profile Image', defaultExt: 'jpg', isPdf: false },
  AADHAAR: { order: 2, name: 'Aadhaar Document', defaultExt: 'pdf', isPdf: true },
  PAN: { order: 3, name: 'PAN Card', defaultExt: 'pdf', isPdf: true },
  SALARY_SLIP: { order: 4, name: 'Salary Slip / Income Sheet', defaultExt: 'pdf', isPdf: true },
  BANK_STATEMENT: { order: 5, name: 'Bank Statement', defaultExt: 'pdf', isPdf: true },
  MANUAL: { order: 6, name: 'Manual Document (ZIP/Images)', defaultExt: 'zip', isPdf: false },
};

export function normalizeToCanonicalCategory(typeStr) {
  if (!typeStr) return 'UNKNOWN';
  const s = String(typeStr).toUpperCase().trim();
  const clean = s
    .replace(/^CO_?APPLICANT(_\d+)?_/i, '')
    .replace(/^APPLICANT_/i, '')
    .replace(/_OLD$/i, '');
  if (clean.includes('PROFILE') || clean.includes('PHOTO') || clean === 'IMAGE') return 'PROFILE';
  if (clean.includes('AADHAAR') || clean.includes('AADHAR') || clean.includes('ADHAAR') || clean.includes('UID')) return 'AADHAAR';
  if (clean.includes('PAN')) return 'PAN';
  if (clean.includes('SALARY') || clean.includes('INCOME') || clean.includes('PAYSLIP')) return 'SALARY_SLIP';
  if (clean.includes('BANK') || clean.includes('STATEMENT') || clean.includes('PASSBOOK')) return 'BANK_STATEMENT';
  if (clean.includes('ZIP') || clean.includes('ARCHIVE') || clean.includes('MANUAL')) return 'MANUAL';
  return clean;
}

function last4FromValue(value = '') {
  const digits = String(value).replace(/[^\d]/g, '');
  return digits.slice(-4);
}

function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes) || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB`;
}

function getFileIcon(fileName = '') {
  const ext = String(fileName).split('.').pop()?.toLowerCase();
  if (ext === 'zip' || ext === 'rar' || ext === '7z' || ext === 'tar' || ext === 'gz') {
    return <FolderOpen size={16} color="#d97706" />;
  }
  if (ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'webp' || ext === 'gif') {
    return <ImageIcon size={16} color="#2563eb" />;
  }
  return <FileText size={16} color="#0F7A4C" />;
}

function formatUploadDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return String(dateStr);
  }
}

function buildKycState(appData) {
  const saved = getSectionState(appData, 'kycDocuments', {});
  const count = getApplicantCount(appData);
  const savedCoApplicants = Array.isArray(saved.coApplicants) ? saved.coApplicants : [];

  const parseNumDocs = (val, docPath, files) => {
    if (val !== undefined && val !== null && val !== '') {
      const n = Number(val);
      if (!isNaN(n) && n >= 0) return n;
    }
    const pathsCount = documentPaths(docPath).length;
    if (pathsCount > 0) return pathsCount;
    if (Array.isArray(files) && files.length > 0) return files.length;
    return 0;
  };

  const appDocPath = saved.applicant?.documentPath || null;
  const appNumDocs = parseNumDocs(
    saved.applicant?.numberOfDocuments ?? saved.applicant?.NumberOfDocuments,
    appDocPath,
    saved.applicant?.identityDocumentFiles
  );

  return {
    applicant: {
      // Main Applicant KYC id is deliberately NOT seeded from the saved draft.
      // It is resolved live from the backend by (applicationProductDetailsId,
      // applicantSequence = 0); a stale browser-held id must never target an upload.
      kycDocumentId: null,
      aadhaarLast4: saved.applicant?.aadhaarLast4 || last4FromValue(appData.aadhaarNo),
      panCardNo: saved.applicant?.panCardNo || appData.panCardNo || appData.panNumber || '',
      identityDocumentType: saved.applicant?.identityDocumentType || '',
      numberOfDocuments: appNumDocs,
      identityDocumentCount: String(appNumDocs),
      identityDocumentFiles: Array.isArray(saved.applicant?.identityDocumentFiles)
        ? saved.applicant.identityDocumentFiles
        : documentPaths(appDocPath).map((s) => s.replace(/\\/g, '/').split('/').pop()),
      identityDocumentRawFiles: [],
      identityDocumentNo: saved.applicant?.identityDocumentNo || '',
      verificationStatus: saved.applicant?.verificationStatus || 'Pending',
      documentPath: appDocPath,
      aadharDocumentPath: saved.applicant?.aadharDocumentPath || saved.applicant?.AadharDocumentPath || null,
      panCardPath: saved.applicant?.panCardPath || saved.applicant?.PanCardPath || null,
      profileImagePath: saved.applicant?.profileImagePath || saved.applicant?.ProfileImagePath || null,
      manualDocuments: saved.applicant?.manualDocuments || '',
      fileSize: saved.applicant?.fileSize || null,
    },
    coApplicants: createArray(count, (index) => {
      const coSaved = savedCoApplicants[index] || {};
      const coDocPath = coSaved.documentPath || null;
      const coNumDocs = parseNumDocs(
        coSaved.numberOfDocuments ?? coSaved.NumberOfDocuments,
        coDocPath,
        coSaved.identityDocumentFiles
      );
      return {
        kycDocumentId: coSaved.kycDocumentId || coSaved.applicationKYCDocumentId || null,
        aadhaarLast4: coSaved.aadhaarLast4 || '',
        panCardNo: coSaved.panCardNo || '',
        identityDocumentType: coSaved.identityDocumentType || '',
        numberOfDocuments: coNumDocs,
        identityDocumentCount: String(coNumDocs),
        identityDocumentFiles: Array.isArray(coSaved.identityDocumentFiles)
          ? coSaved.identityDocumentFiles
          : documentPaths(coDocPath).map((s) => s.replace(/\\/g, '/').split('/').pop()),
        identityDocumentRawFiles: [],
        identityDocumentNo: coSaved.identityDocumentNo || '',
        verificationStatus: coSaved.verificationStatus || 'Pending',
        documentPath: coDocPath,
        aadharDocumentPath: coSaved.aadharDocumentPath || coSaved.AadharDocumentPath || null,
        panCardPath: coSaved.panCardPath || coSaved.PanCardPath || null,
        profileImagePath: coSaved.profileImagePath || coSaved.ProfileImagePath || null,
        manualDocuments: coSaved.manualDocuments || '',
        fileSize: coSaved.fileSize || null,
      };
    }),
  };
}

// The five Main Applicant slots mapped from AgentCustomerDocument records.
// Used to compare successive loads by real backend document id.
const AGENT_SOURCE_SLOTS = ['profile', 'aadhaar', 'pan', 'salarySlip', 'bankStatement'];

// Canonical identity columns on an ApplicationKYCDocuments row, keyed by UI slot.
// PROFILE_IMAGE -> ProfileImagePath, AADHAAR -> AadharDocumentPath, PAN -> PanCardPath.
const IDENTITY_CANONICAL_FIELDS = {
  profile: ['profileImagePath', 'ProfileImagePath'],
  aadhaar: ['aadharDocumentPath', 'AadharDocumentPath'],
  pan: ['panCardPath', 'PanCardPath'],
};

/**
 * Reads the stored canonical path for one identity slot from a live KYC row.
 * Returns a trimmed non-empty string, or null when the backend has not persisted it.
 */
function readCanonicalIdentityPath(kycRow, key) {
  if (!kycRow) return null;
  const fields = IDENTITY_CANONICAL_FIELDS[key] || [];
  for (const field of fields) {
    const value = kycRow[field];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

/**
 * Detects whether an ApplicationKYCDocuments record is an applicant-level document tuple
 * (e.g., Salary Slip, Bank Statement) rather than a primary applicant KYC row.
 * Financial tuples carry explicit tuple-specific fields (documentStatus, originalFileName,
 * contentType, fileSize) created via /applicant-document/upload.
 */
/**
 * Authoritative Storage Role Classifier for KYC Documents:
 *
 * 1. Primary KYC Row (isApplicantDocumentTuple(row) === false):
 *    - ProfileImagePath   -> 'PROFILE'
 *    - AadharDocumentPath  -> 'AADHAAR'
 *    - PanCardPath         -> 'PAN'
 *    - DocumentPath        -> 'MANUAL' (ZIP / Images)
 *    * Note: DocumentTypeId on a primary row is strictly metadata for the verification
 *      dropdown and must NEVER be used to classify DocumentPath or documents.
 *
 * 2. Financial Tuple Row (isApplicantDocumentTuple(row) === true):
 *    - DocumentTypeId dynamically matched against Salary Slip   -> 'SALARY_SLIP'
 *    - DocumentTypeId dynamically matched against Bank Statement -> 'BANK_STATEMENT'
 *
 * 3. Agent Customer Document / Other:
 *    - DocumentTypeId resolved dynamically against DocumentTypeMaster.
 */
function classifyKycStoredDocument(row, fieldName = null, documentTypeOptions = []) {
  if (!row) return 'UNKNOWN';

  // 1. Financial Tuple Row (created via /applicant-document/upload)
  if (isApplicantDocumentTuple(row)) {
    const typeId = Number(row.documentTypeId ?? row.DocumentTypeId);
    if (documentTypeOptions && documentTypeOptions.length > 0) {
      const salarySlipId = resolveDocumentTypeId(documentTypeOptions, 'Salary Slip');
      const bankStatementId = resolveDocumentTypeId(documentTypeOptions, 'Bank Statement');
      if (salarySlipId && typeId === salarySlipId) return 'SALARY_SLIP';
      if (bankStatementId && typeId === bankStatementId) return 'BANK_STATEMENT';
    }
    return 'FINANCIAL_DOCUMENT';
  }

  // 2. Primary KYC Row - strictly classified by field/storage role
  if (fieldName) {
    const normField = String(fieldName).toLowerCase();
    if (normField.includes('profile')) return 'PROFILE';
    if (normField.includes('aadhar') || normField.includes('aadhaar')) return 'AADHAAR';
    if (normField.includes('pan')) return 'PAN';
    if (normField.includes('document') || normField.includes('path')) return 'MANUAL';
  }

  return 'MANUAL';
}

function validateKyc(person) {
  const errors = {};

  const aadhaarClean = String(person?.aadhaarLast4 || '').replace(/\D/g, '');
  if (!aadhaarClean) {
    errors.aadhaarLast4 = 'Aadhaar last 4 digits are required';
  } else if (aadhaarClean.length !== 4) {
    errors.aadhaarLast4 = 'Aadhaar must be exactly 4 digits';
  }

  const panClean = String(person?.panCardNo || '').trim();
  if (!panClean) {
    errors.panCardNo = 'PAN card number is required';
  } else if (!/^[A-Z0-9]{10}$/i.test(panClean)) {
    errors.panCardNo = 'PAN card number must be 10 characters';
  }

  if (!person?.identityDocumentType) {
    errors.identityDocumentType = 'Verification document type is required';
  }

  if (!String(person?.identityDocumentNo || '').trim()) {
    errors.identityDocumentNo = 'Document number is required';
  }

  if (!person?.verificationStatus) {
    errors.verificationStatus = 'Verification status is required';
  }

  const numDocs = person?.numberOfDocuments !== undefined && person?.numberOfDocuments !== null
    ? Math.max(0, parseInt(person.numberOfDocuments, 10) || 0)
    : 0;

  const persistedPaths = documentPaths(person?.documentPath);
  const rawFiles = Array.isArray(person?.identityDocumentRawFiles) ? person.identityDocumentRawFiles : [];

  if (numDocs < persistedPaths.length) {
    errors.numberOfDocuments = `Number of documents cannot be less than the ${persistedPaths.length} document${persistedPaths.length > 1 ? 's' : ''} already uploaded.`;
  }

  if (person?.identityDocumentType && numDocs > 0) {
    let occupiedCount = 0;
    for (let i = 0; i < numDocs; i++) {
      const hasStaged = rawFiles[i] && typeof File !== 'undefined' && rawFiles[i] instanceof File;
      const hasPersisted = Boolean(persistedPaths[i]);
      if (hasStaged || hasPersisted) {
        occupiedCount++;
      }
    }

    if (occupiedCount < numDocs) {
      errors.manualDocuments = `Please upload all ${numDocs} manual ${numDocs === 1 ? 'document' : 'documents'}.`;
      errors.identityDocumentFiles = errors.manualDocuments;
    }
  }

  return errors;
}

/**
 * Shared helper to normalize BackOfficeDocumentRejection records across
 * camelCase and PascalCase backend responses.
 */
function normalizeRejectionRecord(r) {
  if (!r) return null;
  const seq = Number(
    r.applicantSequence ??
    r.ApplicantSequence ??
    (String(r.rejectedDocumentType || r.RejectedDocumentType || '').match(/CO_?APPLICANT_?(\d+)/i)?.[1] || 0)
  );
  const kycId = Number(
    r.kycDocumentId ??
    r.KYCDocumentId ??
    r.applicationKYCDocumentId ??
    r.ApplicationKYCDocumentId ??
    0
  );
  const rejectedType = String(
    r.rejectedDocumentType ??
    r.RejectedDocumentType ??
    ''
  ).toUpperCase().trim();
  const originalPath =
    r.originalDocumentPath ??
    r.OriginalDocumentPath ??
    null;
  const currentPath =
    r.currentDocumentPath ??
    r.CurrentDocumentPath ??
    null;
  const rejectionId = Number(
    r.backOfficeDocumentRejectionId ??
    r.BackOfficeDocumentRejectionId ??
    r.id ??
    0
  );
  const status = String(r.status ?? r.Status ?? '').trim();
  const rejectionRemarks = r.rejectionRemarks ?? r.RejectionRemarks ?? '';
  const createdAt =
    r.resubmittedAt ??
    r.ResubmittedAt ??
    r.verifiedAt ??
    r.VerifiedAt ??
    r.rejectedAt ??
    r.RejectedAt ??
    r.createdAt ??
    r.CreatedAt ??
    null;

  return {
    ...r,
    applicantSequence: seq,
    kycDocumentId: kycId,
    rejectedDocumentType: rejectedType,
    originalDocumentPath: originalPath,
    currentDocumentPath: currentPath,
    backOfficeDocumentRejectionId: rejectionId,
    status,
    rejectionRemarks,
    createdAt,
  };
}

function KycCard({
  title,
  person,
  onChange,
  errors,
  onViewDocuments,
  isCoApplicant,
  documentTypeOptions = [],
  verificationOptions = [],
  isLoadingMasters = false,
  coApplicantDocs,
  coApplicantPersistedDocs,
  onCoApplicantDocChange,
  onCoApplicantDocRemove,
  applicantDocs,
  applicantPersistedDocs,
  agentSourceDocs,
  onApplicantDocChange,
  onApplicantDocRemove,
  onViewLocalFile,
  onViewPersistedDoc,
  onViewAgentDoc,
  onReplacePersistedSlot,
}) {
  const [otpStep, setOtpStep] = useState(person.verificationStatus === 'Verified' ? 'verified' : 'idle');
  const [otpValue, setOtpValue] = useState('');
  const [fileSizeError, setFileSizeError] = useState('');
  const [countError, setCountError] = useState('');
  const [replacingSlot, setReplacingSlot] = useState(null);
  const [slotError, setSlotError] = useState({});
  const fileInputRefs = useRef([]);
  const docInputRefs = useRef({ aadhaar: null, pan: null, profile: null, salarySlip: null, bankStatement: null });

  const handleDocChange = (docType, event) => {
    const file = event.target.files?.[0];
    if (file) {
      if (docType === 'salarySlip' || docType === 'bankStatement') {
        const valRes = validateApplicantDocumentFile(file);
        if (!valRes.valid) {
          setFileSizeError(valRes.error);
          event.target.value = '';
          return;
        }
      } else if (file.size > 150 * 1024 * 1024) {
        setFileSizeError('Each file must be 150 MB or smaller');
        event.target.value = '';
        return;
      }
      setFileSizeError('');
      if (isCoApplicant) {
        onCoApplicantDocChange?.(docType, file);
      } else {
        onApplicantDocChange?.(docType, file);
      }
    }
    event.target.value = '';
  };

  const handleDocRemove = (docType) => {
    if (docInputRefs.current[docType]) {
      docInputRefs.current[docType].value = '';
    }
    if (isCoApplicant) {
      onCoApplicantDocRemove?.(docType);
    } else {
      onApplicantDocRemove?.(docType);
    }
  };

  useEffect(() => {
    if (person.verificationStatus !== 'Verified' && otpStep === 'verified') {
      setOtpStep('idle');
    } else if (person.verificationStatus === 'Verified' && otpStep !== 'verified') {
      setOtpStep('verified');
    }
  }, [person.verificationStatus, otpStep]);

  const handleSendOtp = () => {
    setOtpStep('otp_sent');
    setOtpValue('');
  };

  const handleVerifyOtp = () => {
    setOtpStep('verified');
    onChange('verificationStatus', 'Verified');
  };

  const isAadhaarComplete = person.aadhaarLast4?.length === 4;

  const selectedDocumentRawFiles = Array.isArray(person.identityDocumentRawFiles) ? person.identityDocumentRawFiles : [];

  const persistedFiles = useMemo(() => {
    const list = [];

    if (person.documentPath) {
      const rawPaths = documentPaths(person.documentPath);
      rawPaths.forEach((path, i) => {
        const cleanName = path.split('/').pop() || path.split('\\').pop() || `Document ${i + 1}`;
        list.push({
          path,
          fileName: cleanName,
          size: person.fileSize || null,
          isPersisted: true,
        });
      });
    }

    return list;
  }, [person.documentPath, person.fileSize]);

  const numberOfDocs = person?.numberOfDocuments !== undefined && person?.numberOfDocuments !== null
    ? Math.max(0, parseInt(person.numberOfDocuments, 10) || 0)
    : 0;

  const handleNumberOfDocumentsChange = (newVal) => {
    const rawCount = newVal === '' ? 0 : parseInt(newVal, 10);
    if (isNaN(rawCount)) return;
    const count = Math.max(0, rawCount);
    const persistedCount = persistedFiles.length;
    if (count < persistedCount) {
      setCountError(`Number of documents cannot be less than the ${persistedCount} document${persistedCount > 1 ? 's' : ''} already uploaded.`);
      return;
    }
    setCountError('');
    onChange('numberOfDocuments', (current) => {
      const rawFiles = Array.isArray(current.identityDocumentRawFiles) ? [...current.identityDocumentRawFiles] : [];
      const resizedRaw = rawFiles.slice(0, count);
      return {
        ...current,
        numberOfDocuments: count,
        identityDocumentCount: String(count),
        identityDocumentRawFiles: resizedRaw,
      };
    });
  };

  const handleDownloadPersisted = async (fileObj) => {
    if (!fileObj || !fileObj.path) return;
    const path = fileObj.path;
    const fileName = fileObj.fileName || path.split('/').pop() || path.split('\\').pop() || 'document.zip';

    let downloadUrl = path;
    if (!downloadUrl.startsWith('http://') && !downloadUrl.startsWith('https://')) {
      const cleanPath = path.replace(/\\/g, '/').replace(/^\/+/, '');
      downloadUrl = `${API_BASE}/ApplicationKYCDocuments/download?path=${encodeURIComponent(cleanPath)}`;
    }

    try {
      const token = localStorage.getItem('authToken');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(downloadUrl, { headers });
      if (res.ok) {
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        return;
      }
    } catch (err) {
      console.warn('Direct fetch download failed, fallback to direct window open:', err);
    }

    window.open(downloadUrl, '_blank');
  };

  const handleDocumentTypeChange = (value) => {
    onChange('identityDocumentType', value);
  };

  const handleSlotFileChange = async (slotIdx, event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 150 * 1024 * 1024) {
      setFileSizeError(`File "${file.name}" exceeds the 150 MB limit`);
      event.target.value = '';
      return;
    }
    setFileSizeError('');
    setSlotError((prev) => ({ ...prev, [slotIdx]: null }));

    const isPersistedSlot = Boolean(persistedFiles[slotIdx]);
    if (isPersistedSlot && person?.kycDocumentId && onReplacePersistedSlot) {
      setReplacingSlot(slotIdx);
      try {
        await onReplacePersistedSlot(slotIdx, file);
      } catch (err) {
        setSlotError((prev) => ({ ...prev, [slotIdx]: err.message || 'Failed to replace file.' }));
      } finally {
        setReplacingSlot(null);
      }
    } else {
      onChange('identityDocumentRawFiles', (current) => {
        const rawFiles = Array.isArray(current.identityDocumentRawFiles) ? [...current.identityDocumentRawFiles] : [];
        rawFiles[slotIdx] = file;
        return {
          ...current,
          identityDocumentRawFiles: rawFiles,
        };
      });
    }

    event.target.value = '';
  };

  const handleRemoveStagedSlotFile = (slotIdx) => {
    onChange('identityDocumentRawFiles', (current) => {
      const rawFiles = Array.isArray(current.identityDocumentRawFiles) ? [...current.identityDocumentRawFiles] : [];
      rawFiles[slotIdx] = null;
      return {
        ...current,
        identityDocumentRawFiles: rawFiles,
      };
    });
  };

  return (
    <div className="aw-mini-card">
      <div className="aw-mini-card__header">
        <div>
          <div className="aw-mini-card__title">{title}</div>
          <div className="aw-mini-card__subtitle">Aadhaar, PAN and identity document details</div>
        </div>
        <span
          className={`aw-status-pill ${
            person.verificationStatus === 'Verified' ? 'aw-status-pill--verified' : 'aw-status-pill--muted'
          }`}
        >
          {person.verificationStatus}
        </span>
      </div>

      <div className="aw-mini-card__body">
        <div className="aw-grid">
          <div className="aw-field">
            <label className="form-label">Aadhaar Last 4 Digits</label>
            <div className="aw-input-wrapper">
              <FileText className="aw-input-icon" size={14} />
              <input
                className={`form-input aw-input aw-input--with-icon ${errors.aadhaarLast4 ? 'aw-input--invalid' : ''}`}
                value={otpStep === 'otp_sent' ? otpValue : person.aadhaarLast4}
                placeholder={otpStep === 'otp_sent' ? 'Enter OTP' : ''}
                inputMode="numeric"
                maxLength={otpStep === 'otp_sent' ? 6 : 4}
                disabled={otpStep === 'verified'}
                style={{
                  paddingRight:
                    otpStep !== 'verified' && (isAadhaarComplete || otpStep === 'otp_sent') ? '76px' : '12px',
                }}
                onChange={(e) => {
                  if (otpStep === 'otp_sent') {
                    setOtpValue(e.target.value.replace(/[^\d]/g, ''));
                  } else {
                    onChange('aadhaarLast4', e.target.value.replace(/[^\d]/g, ''));
                    if (otpStep === 'verified') {
                      setOtpStep('idle');
                      onChange('verificationStatus', 'Pending');
                    }
                  }
                }}
              />
              {otpStep === 'idle' && isAadhaarComplete && (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  style={{
                    position: 'absolute',
                    right: '4px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: '#0F7A4C',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    zIndex: 10,
                  }}
                >
                  Send OTP
                </button>
              )}
              {otpStep === 'otp_sent' && (
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={otpValue.length < 4}
                  style={{
                    position: 'absolute',
                    right: '4px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: '#0F7A4C',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    zIndex: 10,
                    opacity: otpValue.length < 4 ? 0.5 : 1,
                  }}
                >
                  Verify
                </button>
              )}
            </div>
            {errors.aadhaarLast4 && <span className="aw-field-error">{errors.aadhaarLast4}</span>}
          </div>

          <div className="aw-field">
            <label className="form-label">PAN Card No.</label>
            <div className="aw-input-wrapper">
              <FileText className="aw-input-icon" size={14} />
              <input
                className={`form-input aw-input aw-input--with-icon ${errors.panCardNo ? 'aw-input--invalid' : ''}`}
                value={person.panCardNo}
                maxLength={10}
                onChange={(e) => onChange('panCardNo', e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
              />
            </div>
            {errors.panCardNo && <span className="aw-field-error">{errors.panCardNo}</span>}
          </div>

          <div className="aw-field">
            <label className="form-label">Document Number</label>
            <div className="aw-input-wrapper">
              <input
                type="text"
                className={`form-input aw-input ${errors.identityDocumentNo ? 'aw-input--invalid' : ''}`}
                value={person.identityDocumentNo}
                onChange={(e) => onChange('identityDocumentNo', e.target.value)}
                placeholder="Enter Document Number"
              />
            </div>
            {errors.identityDocumentNo && <span className="aw-field-error">{errors.identityDocumentNo}</span>}
          </div>

          <div className="aw-field">
            <label className="form-label">Verification Status</label>
            <div className="aw-input-wrapper">
              <Select
                value={person.verificationStatus}
                onChange={(val) => onChange('verificationStatus', val)}
                placeholder={isLoadingMasters ? 'Loading...' : 'Select status'}
                options={verificationOptions}
                disabled={isLoadingMasters}
                icon={<UserCheck size={14} />}
              />
            </div>
          </div>

          <div className="aw-field">
            <label className="form-label">Attached Documents</label>
            <Button
              variant="secondary"
              size="sm"
              onClick={onViewDocuments}
              icon={<ImageIcon size={14} />}
              style={{
                width: '100%',
                height: '38px',
                justifyContent: 'center',
                background: '#f8fafc',
                border: '1px dashed #cbd5e1',
                color: '#0f172a',
              }}
            >
              View Documents
            </Button>
          </div>

          <div className="aw-field">
            <label className="form-label">Verification Documents</label>
            <div className="aw-input-wrapper">
              <Select
                value={person.identityDocumentType}
                onChange={handleDocumentTypeChange}
                options={documentTypeOptions}
                placeholder={isLoadingMasters ? 'Loading...' : 'Select document type'}
                disabled={isLoadingMasters}
                className={errors.identityDocumentType ? 'aw-input--invalid' : ''}
              />
            </div>
            {errors.identityDocumentType && <span className="aw-field-error">{errors.identityDocumentType}</span>}
          </div>

          {person.identityDocumentType && (
            <div className="aw-field">
              <label className="form-label">Number of Documents</label>
              <div className="aw-input-wrapper">
                <input
                  type="number"
                  min={persistedFiles.length || 0}
                  step="1"
                  className={`form-input aw-input ${countError || errors.numberOfDocuments ? 'aw-input--invalid' : ''}`}
                  aria-label="Number of documents"
                  value={person.numberOfDocuments !== undefined && person.numberOfDocuments !== null ? person.numberOfDocuments : 0}
                  onChange={(e) => handleNumberOfDocumentsChange(e.target.value)}
                />
              </div>
              {(countError || errors.numberOfDocuments) && (
                <span className="aw-field-error">{countError || errors.numberOfDocuments}</span>
              )}
            </div>
          )}

          {person.identityDocumentType && numberOfDocs > 0 && (
            <div className="aw-field aw-upload-field">
              <label className="form-label">Upload Manual Document (ZIP / Image / PDF)</label>
              <div className="kyc-upload-container">
                {Array.from({ length: numberOfDocs }).map((_, slotIdx) => {
                  const stagedFile = selectedDocumentRawFiles[slotIdx];
                  const persistedFile = persistedFiles[slotIdx];
                  const slotLabel = numberOfDocs > 1 ? `Manual Document ${slotIdx + 1}` : 'Manual Document 1';

                  return (
                    <div className="kyc-doc-slot" key={`manual-slot-${slotIdx}`}>
                      <div className="kyc-doc-slot-header">
                        <span className="kyc-doc-slot-title">{slotLabel}</span>
                      </div>

                      {stagedFile instanceof File ? (
                        <div className="kyc-selected-file-row">
                          <div className="kyc-selected-file-main">
                            <div className="kyc-existing-file-icon">
                              {getFileIcon(stagedFile.name)}
                            </div>
                            <span className="kyc-selected-label">New:</span>
                            <span className="kyc-selected-name" title={stagedFile.name}>
                              {stagedFile.name}
                            </span>
                            <span className="kyc-selected-size">
                              • {formatFileSize(stagedFile.size)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              className="co-doc-btn co-doc-btn--view"
                              onClick={() => onViewLocalFile?.(stagedFile, `${title} - ${slotLabel}`)}
                              title="View document"
                            >
                              <Eye size={12} />
                              <span>View</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveStagedSlotFile(slotIdx)}
                              className="kyc-clear-file-btn"
                              title="Remove selected file"
                              aria-label={`Remove ${stagedFile.name}`}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ) : persistedFile ? (
                        <div className="kyc-existing-file-row">
                          <div className="kyc-existing-file-main">
                            <div className="kyc-existing-file-icon">
                              {getFileIcon(persistedFile.fileName)}
                            </div>
                            <div className="kyc-existing-file-details">
                              <span className="kyc-existing-file-name" title={persistedFile.fileName}>
                                {persistedFile.fileName}
                              </span>
                              <span className="kyc-existing-file-status">
                                {persistedFile.size ? `${formatFileSize(persistedFile.size)} • ` : ''}Uploaded successfully
                              </span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              className="kyc-download-btn"
                              onClick={() => handleDownloadPersisted(persistedFile)}
                              title={`Download ${persistedFile.fileName}`}
                            >
                              <Download size={12} />
                              <span>Download</span>
                            </button>
                            <button
                              type="button"
                              className="co-doc-btn co-doc-btn--replace"
                              onClick={() => fileInputRefs.current[slotIdx]?.click()}
                              disabled={replacingSlot === slotIdx}
                              title="Replace document"
                            >
                              <RefreshCw size={12} className={replacingSlot === slotIdx ? 'aw-spin' : ''} />
                              <span>{replacingSlot === slotIdx ? 'Replacing...' : 'Replace'}</span>
                            </button>
                            <input
                              ref={(el) => {
                                fileInputRefs.current[slotIdx] = el;
                              }}
                              type="file"
                              style={{ display: 'none' }}
                              accept=".zip,.rar,.7z,image/*,application/pdf"
                              aria-label={`Replace ${slotLabel}`}
                              onChange={(e) => handleSlotFileChange(slotIdx, e)}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="kyc-file-input-wrapper">
                          <input
                            ref={(el) => {
                              fileInputRefs.current[slotIdx] = el;
                            }}
                            type="file"
                            className="form-input aw-input kyc-compact-file-input"
                            accept=".zip,.rar,.7z,image/*,application/pdf"
                            aria-label={`Upload ${slotLabel}`}
                            onChange={(e) => handleSlotFileChange(slotIdx, e)}
                          />
                        </div>
                      )}
                      {slotError[slotIdx] && (
                        <span className="aw-field-error" style={{ marginTop: '4px', display: 'block' }}>
                          {slotError[slotIdx]}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              {(fileSizeError || errors.manualDocuments || errors.identityDocumentFiles) && (
                <span className="aw-field-error">
                  {fileSizeError || errors.manualDocuments || errors.identityDocumentFiles}
                </span>
              )}
            </div>
          )}
        </div>

        {/*
          Main Applicant Profile / Aadhaar / PAN / Salary Slip / Bank Statement are
          Agent-uploaded customer documents. They are reviewed through
          "Attached Documents -> View Documents" above and are deliberately NOT
          duplicated as cards here.

          Agent source state (agentSourceDocs) and the Save & Continue
          Agent -> Application promotion remain fully active; only the duplicate
          presentation was removed.
        */}

        {isCoApplicant && (
          <div className="co-applicant-docs-section">
            <div className="co-applicant-docs-header">
              <span className="co-applicant-docs-title">CO-APPLICANT DOCUMENTS ({KYC_CATEGORIES.filter(({ key }) => coApplicantDocs?.[key] || coApplicantPersistedDocs?.[key]?.exists).length}/5)</span>
            </div>
            <div className="co-applicant-docs-grid">
              {/* 1. Aadhaar */}
              <div className="co-doc-col">
                <label className="form-label">Aadhaar</label>
                <input
                  ref={(el) => {
                    docInputRefs.current.aadhaar = el;
                  }}
                  type="file"
                  style={coApplicantDocs?.aadhaar || coApplicantPersistedDocs?.aadhaar?.exists ? { display: 'none' } : undefined}
                  className={!coApplicantDocs?.aadhaar && !coApplicantPersistedDocs?.aadhaar?.exists ? "form-input aw-input kyc-compact-file-input" : undefined}
                  accept=".pdf,.jpg,.jpeg,.png"
                  aria-label="Upload Co-Applicant Aadhaar"
                  onChange={(e) => handleDocChange('aadhaar', e)}
                />

                {/* Local fresh file selected */}
                {coApplicantDocs?.aadhaar && (
                  <div className="co-doc-selected-card">
                    <div className="co-doc-selected-info">
                      <div className="co-doc-selected-icon">
                        {getFileIcon(coApplicantDocs.aadhaar.name)}
                      </div>
                      <span className="co-doc-selected-name" title={coApplicantDocs.aadhaar.name}>
                        {coApplicantDocs.aadhaar.name}
                      </span>
                      {coApplicantDocs.aadhaar.size && (
                        <span className="co-doc-selected-size">
                          • {formatFileSize(coApplicantDocs.aadhaar.size)}
                        </span>
                      )}
                    </div>
                    <div className="co-doc-selected-actions">
                      <button
                        type="button"
                        className="co-doc-btn co-doc-btn--view"
                        onClick={() => onViewLocalFile?.(coApplicantDocs.aadhaar, `${title} - Aadhaar`)}
                        title="View Aadhaar document"
                      >
                        <Eye size={12} />
                        <span>View</span>
                      </button>
                      <button
                        type="button"
                        className="co-doc-btn co-doc-btn--replace"
                        onClick={() => docInputRefs.current.aadhaar?.click()}
                        title="Replace Aadhaar document"
                      >
                        <RefreshCw size={12} />
                        <span>Replace</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDocRemove('aadhaar')}
                        className="co-doc-btn co-doc-btn--remove"
                        title="Clear selection"
                        aria-label="Clear Aadhaar selection"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Persisted server file */}
                {!coApplicantDocs?.aadhaar && coApplicantPersistedDocs?.aadhaar?.exists && (
                  <div className="co-doc-selected-card">
                    <div className="co-doc-selected-info">
                      <div className="co-doc-selected-icon">
                        {getFileIcon(coApplicantPersistedDocs.aadhaar.fileName)}
                      </div>
                      <span className="co-doc-selected-name" title={coApplicantPersistedDocs.aadhaar.fileName}>
                        {coApplicantPersistedDocs.aadhaar.fileName}
                      </span>
                      {coApplicantPersistedDocs.aadhaar.size && (
                        <span className="co-doc-selected-size">
                          • {formatFileSize(coApplicantPersistedDocs.aadhaar.size)}
                        </span>
                      )}
                    </div>
                    <div className="co-doc-selected-actions">
                      <button
                        type="button"
                        className="co-doc-btn co-doc-btn--view"
                        onClick={() => onViewPersistedDoc?.(coApplicantPersistedDocs.aadhaar, `${title} - Aadhaar`)}
                        title="View Aadhaar document"
                      >
                        <Eye size={12} />
                        <span>View</span>
                      </button>
                      <button
                        type="button"
                        className="co-doc-btn co-doc-btn--replace"
                        onClick={() => docInputRefs.current.aadhaar?.click()}
                        title="Replace Aadhaar document"
                      >
                        <RefreshCw size={12} />
                        <span>Replace</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. PAN Card */}
              <div className="co-doc-col">
                <label className="form-label">PAN Card</label>
                <input
                  ref={(el) => {
                    docInputRefs.current.pan = el;
                  }}
                  type="file"
                  style={coApplicantDocs?.pan || coApplicantPersistedDocs?.pan?.exists ? { display: 'none' } : undefined}
                  className={!coApplicantDocs?.pan && !coApplicantPersistedDocs?.pan?.exists ? "form-input aw-input kyc-compact-file-input" : undefined}
                  accept=".pdf,.jpg,.jpeg,.png"
                  aria-label="Upload Co-Applicant PAN Card"
                  onChange={(e) => handleDocChange('pan', e)}
                />

                {/* Local fresh file selected */}
                {coApplicantDocs?.pan && (
                  <div className="co-doc-selected-card">
                    <div className="co-doc-selected-info">
                      <div className="co-doc-selected-icon">
                        {getFileIcon(coApplicantDocs.pan.name)}
                      </div>
                      <span className="co-doc-selected-name" title={coApplicantDocs.pan.name}>
                        {coApplicantDocs.pan.name}
                      </span>
                      {coApplicantDocs.pan.size && (
                        <span className="co-doc-selected-size">
                          • {formatFileSize(coApplicantDocs.pan.size)}
                        </span>
                      )}
                    </div>
                    <div className="co-doc-selected-actions">
                      <button
                        type="button"
                        className="co-doc-btn co-doc-btn--view"
                        onClick={() => onViewLocalFile?.(coApplicantDocs.pan, `${title} - PAN Card`)}
                        title="View PAN Card document"
                      >
                        <Eye size={12} />
                        <span>View</span>
                      </button>
                      <button
                        type="button"
                        className="co-doc-btn co-doc-btn--replace"
                        onClick={() => docInputRefs.current.pan?.click()}
                        title="Replace PAN Card document"
                      >
                        <RefreshCw size={12} />
                        <span>Replace</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDocRemove('pan')}
                        className="co-doc-btn co-doc-btn--remove"
                        title="Clear selection"
                        aria-label="Clear PAN Card selection"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Persisted server file */}
                {!coApplicantDocs?.pan && coApplicantPersistedDocs?.pan?.exists && (
                  <div className="co-doc-selected-card">
                    <div className="co-doc-selected-info">
                      <div className="co-doc-selected-icon">
                        {getFileIcon(coApplicantPersistedDocs.pan.fileName)}
                      </div>
                      <span className="co-doc-selected-name" title={coApplicantPersistedDocs.pan.fileName}>
                        {coApplicantPersistedDocs.pan.fileName}
                      </span>
                      {coApplicantPersistedDocs.pan.size && (
                        <span className="co-doc-selected-size">
                          • {formatFileSize(coApplicantPersistedDocs.pan.size)}
                        </span>
                      )}
                    </div>
                    <div className="co-doc-selected-actions">
                      <button
                        type="button"
                        className="co-doc-btn co-doc-btn--view"
                        onClick={() => onViewPersistedDoc?.(coApplicantPersistedDocs.pan, `${title} - PAN Card`)}
                        title="View PAN Card document"
                      >
                        <Eye size={12} />
                        <span>View</span>
                      </button>
                      <button
                        type="button"
                        className="co-doc-btn co-doc-btn--replace"
                        onClick={() => docInputRefs.current.pan?.click()}
                        title="Replace PAN Card document"
                      >
                        <RefreshCw size={12} />
                        <span>Replace</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Profile Image */}
              <div className="co-doc-col">
                <label className="form-label">Profile Image</label>
                <input
                  ref={(el) => {
                    docInputRefs.current.profile = el;
                  }}
                  type="file"
                  style={coApplicantDocs?.profile || coApplicantPersistedDocs?.profile?.exists ? { display: 'none' } : undefined}
                  className={!coApplicantDocs?.profile && !coApplicantPersistedDocs?.profile?.exists ? "form-input aw-input kyc-compact-file-input" : undefined}
                  accept=".jpg,.jpeg,.png"
                  aria-label="Upload Co-Applicant Profile Image"
                  onChange={(e) => handleDocChange('profile', e)}
                />

                {/* Local fresh file selected */}
                {coApplicantDocs?.profile && (
                  <div className="co-doc-selected-card">
                    <div className="co-doc-selected-info">
                      <div className="co-doc-selected-icon">
                        {getFileIcon(coApplicantDocs.profile.name)}
                      </div>
                      <span className="co-doc-selected-name" title={coApplicantDocs.profile.name}>
                        {coApplicantDocs.profile.name}
                      </span>
                      {coApplicantDocs.profile.size && (
                        <span className="co-doc-selected-size">
                          • {formatFileSize(coApplicantDocs.profile.size)}
                        </span>
                      )}
                    </div>
                    <div className="co-doc-selected-actions">
                      <button
                        type="button"
                        className="co-doc-btn co-doc-btn--view"
                        onClick={() => onViewLocalFile?.(coApplicantDocs.profile, `${title} - Profile Image`)}
                        title="View Profile Image"
                      >
                        <Eye size={12} />
                        <span>View</span>
                      </button>
                      <button
                        type="button"
                        className="co-doc-btn co-doc-btn--replace"
                        onClick={() => docInputRefs.current.profile?.click()}
                        title="Replace Profile Image"
                      >
                        <RefreshCw size={12} />
                        <span>Replace</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDocRemove('profile')}
                        className="co-doc-btn co-doc-btn--remove"
                        title="Clear selection"
                        aria-label="Clear Profile Image selection"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Persisted server file */}
                {!coApplicantDocs?.profile && coApplicantPersistedDocs?.profile?.exists && (
                  <div className="co-doc-selected-card">
                    <div className="co-doc-selected-info">
                      <div className="co-doc-selected-icon">
                        {getFileIcon(coApplicantPersistedDocs.profile.fileName)}
                      </div>
                      <span className="co-doc-selected-name" title={coApplicantPersistedDocs.profile.fileName}>
                        {coApplicantPersistedDocs.profile.fileName}
                      </span>
                      {coApplicantPersistedDocs.profile.size && (
                        <span className="co-doc-selected-size">
                          • {formatFileSize(coApplicantPersistedDocs.profile.size)}
                        </span>
                      )}
                    </div>
                    <div className="co-doc-selected-actions">
                      <button
                        type="button"
                        className="co-doc-btn co-doc-btn--view"
                        onClick={() => onViewPersistedDoc?.(coApplicantPersistedDocs.profile, `${title} - Profile Image`)}
                        title="View Profile Image"
                      >
                        <Eye size={12} />
                        <span>View</span>
                      </button>
                      <button
                        type="button"
                        className="co-doc-btn co-doc-btn--replace"
                        onClick={() => docInputRefs.current.profile?.click()}
                        title="Replace Profile Image"
                      >
                        <RefreshCw size={12} />
                        <span>Replace</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Salary Slip / Income Sheet */}
              <div className="co-doc-col">
                <label className="form-label">Salary Slip / Income Sheet</label>
                <input
                  ref={(el) => {
                    docInputRefs.current.salarySlip = el;
                  }}
                  type="file"
                  style={coApplicantDocs?.salarySlip || coApplicantPersistedDocs?.salarySlip?.exists ? { display: 'none' } : undefined}
                  className={!coApplicantDocs?.salarySlip && !coApplicantPersistedDocs?.salarySlip?.exists ? "form-input aw-input kyc-compact-file-input" : undefined}
                  accept=".pdf,.jpg,.jpeg,.png"
                  aria-label="Upload Co-Applicant Salary Slip"
                  onChange={(e) => handleDocChange('salarySlip', e)}
                />

                {/* Local fresh file selected */}
                {coApplicantDocs?.salarySlip && (
                  <div className="co-doc-selected-card">
                    <div className="co-doc-selected-info">
                      <div className="co-doc-selected-icon">
                        {getFileIcon(coApplicantDocs.salarySlip.name)}
                      </div>
                      <span className="co-doc-selected-name" title={coApplicantDocs.salarySlip.name}>
                        {coApplicantDocs.salarySlip.name}
                      </span>
                      {coApplicantDocs.salarySlip.size && (
                        <span className="co-doc-selected-size">
                          • {formatFileSize(coApplicantDocs.salarySlip.size)}
                        </span>
                      )}
                    </div>
                    <div className="co-doc-selected-actions">
                      <button
                        type="button"
                        className="co-doc-btn co-doc-btn--view"
                        onClick={() => onViewLocalFile?.(coApplicantDocs.salarySlip, `${title} - Salary Slip`)}
                        title="View Salary Slip"
                      >
                        <Eye size={12} />
                        <span>View</span>
                      </button>
                      <button
                        type="button"
                        className="co-doc-btn co-doc-btn--replace"
                        onClick={() => docInputRefs.current.salarySlip?.click()}
                        title="Replace Salary Slip"
                      >
                        <RefreshCw size={12} />
                        <span>Replace</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDocRemove('salarySlip')}
                        className="co-doc-btn co-doc-btn--remove"
                        title="Clear selection"
                        aria-label="Clear Salary Slip selection"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Persisted server file */}
                {!coApplicantDocs?.salarySlip && coApplicantPersistedDocs?.salarySlip?.exists && (
                  <div className="co-doc-selected-card">
                    <div className="co-doc-selected-info">
                      <div className="co-doc-selected-icon">
                        {getFileIcon(coApplicantPersistedDocs.salarySlip.fileName)}
                      </div>
                      <span className="co-doc-selected-name" title={coApplicantPersistedDocs.salarySlip.fileName}>
                        {coApplicantPersistedDocs.salarySlip.fileName}
                      </span>
                      {coApplicantPersistedDocs.salarySlip.size && (
                        <span className="co-doc-selected-size">
                          • {formatFileSize(coApplicantPersistedDocs.salarySlip.size)}
                        </span>
                      )}
                    </div>
                    <div className="co-doc-selected-actions">
                      <button
                        type="button"
                        className="co-doc-btn co-doc-btn--view"
                        onClick={() => onViewPersistedDoc?.(coApplicantPersistedDocs.salarySlip, `${title} - Salary Slip`)}
                        title="View Salary Slip"
                      >
                        <Eye size={12} />
                        <span>View</span>
                      </button>
                      <button
                        type="button"
                        className="co-doc-btn co-doc-btn--replace"
                        onClick={() => docInputRefs.current.salarySlip?.click()}
                        title="Replace Salary Slip"
                      >
                        <RefreshCw size={12} />
                        <span>Replace</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 5. Bank Statement */}
              <div className="co-doc-col">
                <label className="form-label">Bank Statement</label>
                <input
                  ref={(el) => {
                    docInputRefs.current.bankStatement = el;
                  }}
                  type="file"
                  style={coApplicantDocs?.bankStatement || coApplicantPersistedDocs?.bankStatement?.exists ? { display: 'none' } : undefined}
                  className={!coApplicantDocs?.bankStatement && !coApplicantPersistedDocs?.bankStatement?.exists ? "form-input aw-input kyc-compact-file-input" : undefined}
                  accept=".pdf,.jpg,.jpeg,.png"
                  aria-label="Upload Co-Applicant Bank Statement"
                  onChange={(e) => handleDocChange('bankStatement', e)}
                />

                {/* Local fresh file selected */}
                {coApplicantDocs?.bankStatement && (
                  <div className="co-doc-selected-card">
                    <div className="co-doc-selected-info">
                      <div className="co-doc-selected-icon">
                        {getFileIcon(coApplicantDocs.bankStatement.name)}
                      </div>
                      <span className="co-doc-selected-name" title={coApplicantDocs.bankStatement.name}>
                        {coApplicantDocs.bankStatement.name}
                      </span>
                      {coApplicantDocs.bankStatement.size && (
                        <span className="co-doc-selected-size">
                          • {formatFileSize(coApplicantDocs.bankStatement.size)}
                        </span>
                      )}
                    </div>
                    <div className="co-doc-selected-actions">
                      <button
                        type="button"
                        className="co-doc-btn co-doc-btn--view"
                        onClick={() => onViewLocalFile?.(coApplicantDocs.bankStatement, `${title} - Bank Statement`)}
                        title="View Bank Statement"
                      >
                        <Eye size={12} />
                        <span>View</span>
                      </button>
                      <button
                        type="button"
                        className="co-doc-btn co-doc-btn--replace"
                        onClick={() => docInputRefs.current.bankStatement?.click()}
                        title="Replace Bank Statement"
                      >
                        <RefreshCw size={12} />
                        <span>Replace</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDocRemove('bankStatement')}
                        className="co-doc-btn co-doc-btn--remove"
                        title="Clear selection"
                        aria-label="Clear Bank Statement selection"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Persisted server file */}
                {!coApplicantDocs?.bankStatement && coApplicantPersistedDocs?.bankStatement?.exists && (
                  <div className="co-doc-selected-card">
                    <div className="co-doc-selected-info">
                      <div className="co-doc-selected-icon">
                        {getFileIcon(coApplicantPersistedDocs.bankStatement.fileName)}
                      </div>
                      <span className="co-doc-selected-name" title={coApplicantPersistedDocs.bankStatement.fileName}>
                        {coApplicantPersistedDocs.bankStatement.fileName}
                      </span>
                      {coApplicantPersistedDocs.bankStatement.size && (
                        <span className="co-doc-selected-size">
                          • {formatFileSize(coApplicantPersistedDocs.bankStatement.size)}
                        </span>
                      )}
                    </div>
                    <div className="co-doc-selected-actions">
                      <button
                        type="button"
                        className="co-doc-btn co-doc-btn--view"
                        onClick={() => onViewPersistedDoc?.(coApplicantPersistedDocs.bankStatement, `${title} - Bank Statement`)}
                        title="View Bank Statement"
                      >
                        <Eye size={12} />
                        <span>View</span>
                      </button>
                      <button
                        type="button"
                        className="co-doc-btn co-doc-btn--replace"
                        onClick={() => docInputRefs.current.bankStatement?.click()}
                        title="Replace Bank Statement"
                      >
                        <RefreshCw size={12} />
                        <span>Replace</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function KycDocuments() {
  const navigate = useNavigate();
  const { applicationId } = useParams();
  const appId = applicationId;
  const { getApplication, ensureApplication, saveApplication, loadApplicationFromBackend } = useApplicationDraftStore();
  const [form, setForm] = useState(() => buildKycState(getApplication(appId)));
  const [errors, setErrors] = useState({});
  const [errorPopup, setErrorPopup] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);

  // Main Applicant identity upload state. These are selected browser File objects only;
  // persisted previews are kept separately and are never used as upload input.
  const [applicantDocs, setApplicantDocs] = useState({});
  const [applicantPersistedDocs, setApplicantPersistedDocs] = useState({});
  const [agentSourceDocs, setAgentSourceDocs] = useState({});

  const handleViewAgentDoc = async (agentDoc, docLabel) => {
    if (!agentDoc) return;
    const docId = agentDoc.agentCustomerDocumentId || agentDoc.id;
    try {
      const token = localStorage.getItem('authToken');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/AgentCustomerDocument/download/${docId}`, { headers });
      if (!res.ok) throw new Error(`Download failed with HTTP ${res.status}`);
      const blob = await res.blob();
      if (!blob || blob.size === 0) throw new Error('File is empty');
      const fileName = agentDoc.fileName || `${docLabel}.jpg`;
      const isPdf = blob.type === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
      let mimeType = blob.type || (isPdf ? 'application/pdf' : 'image/jpeg');
      if (/\.(jpg|jpeg)$/i.test(fileName)) mimeType = 'image/jpeg';
      else if (/\.png$/i.test(fileName)) mimeType = 'image/png';
      else if (/\.webp$/i.test(fileName)) mimeType = 'image/webp';
      const typedBlob = new Blob([blob], { type: mimeType });
      const blobUrl = URL.createObjectURL(typedBlob);
      activeBlobUrlsRef.current.push(blobUrl);
      setSelectedPreviewDoc({
        documentTypeName: docLabel,
        fileName,
        fileType: isPdf ? 'pdf' : 'image',
        previewUrl: blobUrl,
      });
    } catch (err) {
      console.error('Failed to view agent document:', err);
      setErrorPopup({
        title: 'Preview Error',
        message: err.message || 'Unable to download Agent document preview.',
        variant: 'error',
      });
    }
  };

  // Co-Applicant document local state (keyed by coApplicant index: { [index]: { aadhaar: File|null, pan: File|null, profile: File|null, salarySlip: File|null, bankStatement: File|null } })
  const [coApplicantDocs, setCoApplicantDocs] = useState({});
  const coDocumentRevisionRef = useRef({});

  // Co-Applicant persisted document state hydrated from GET APIs: { [index]: { aadhaar: { exists, fileName, blobUrl, mimeType, size }|null, salarySlip: ..., bankStatement: ... } }
  const [coApplicantPersistedDocs, setCoApplicantPersistedDocs] = useState({});

  // Supplementary KYC records discovered from server for dynamic resolution
  const [kycRecordsList, setKycRecordsList] = useState([]);
  const [kycRecordsLoaded, setKycRecordsLoaded] = useState(false);

  const handleApplicantDocChange = (docType, file) => {
    setApplicantDocs((prev) => ({
      ...prev,
      [docType]: file,
    }));
  };

  const handleApplicantDocRemove = (docType) => {
    setApplicantDocs((prev) => ({
      ...prev,
      [docType]: null,
    }));
  };

  const handleCoApplicantDocChange = (index, docType, file) => {
    setCoApplicantDocs((prev) => updateApplicantSlot(prev, index, docType, file));
  };

  const handleCoApplicantDocRemove = (index, docType) => {
    // Cancelling a pending replacement reveals the saved document in this slot.
    setCoApplicantDocs((prev) => updateApplicantSlot(prev, index, docType, null));
  };

  const handleViewLocalFile = (file, docLabel) => {
    if (!file) return;
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const url = URL.createObjectURL(file);
    activeBlobUrlsRef.current.push(url);
    setSelectedPreviewDoc({
      documentTypeName: docLabel,
      fileName: file.name,
      fileType: isPdf ? 'pdf' : 'image',
      previewUrl: url,
    });
  };

  const handleViewPersistedDoc = async (persistedDoc, docLabel) => {
    if (!persistedDoc) return;
    let previewUrl = persistedDoc.blobUrl;
    if (!previewUrl && persistedDoc.documentPath) {
      const preview = await fetchCoAppDocBlobByPath(persistedDoc.documentPath, persistedDoc.fileName);
      if (preview.error) {
        setErrorPopup({ title: 'Preview unavailable', message: preview.error, variant: 'error' });
        return;
      }
      previewUrl = preview.url;
    }
    if (!previewUrl) return;
    setSelectedPreviewDoc({ documentTypeName: docLabel, fileName: persistedDoc.fileName,
      fileType: persistedDoc.mimeType === 'application/pdf' || /\.pdf$/i.test(persistedDoc.fileName) ? 'pdf' : 'image',
      previewUrl });
  };

  // Document viewing state
  const [viewingDocsFor, setViewingDocsFor] = useState(null); // 'applicant' | number (coApplicant index)
  const [customerDocs, setCustomerDocs] = useState([]);
  const docsRequestRef = useRef(0);
  const [activeDocsTab, setActiveDocsTab] = useState('original'); // 'original' | 'updated'
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [docsLoadError, setDocsLoadError] = useState('');
  const [selectedPreviewDoc, setSelectedPreviewDoc] = useState(null);

  // Group and sort documents into Original and Updated (replacements)
  const { originalDocs, updatedDocs } = useMemo(() => {
    const active = customerDocs.filter((d) => d && d.isActive !== false);

    const original = active.filter((d) => d.isOriginal);
    const updated = active.filter((d) => !d.isOriginal);

    const getDocOrder = (doc) => {
      const cat = doc.canonicalCategory || normalizeToCanonicalCategory(doc.documentTypeCode || doc.documentTypeName);
      return CANONICAL_CATEGORY_META[cat]?.order || 99;
    };

    original.sort((a, b) => getDocOrder(a) - getDocOrder(b));

    updated.sort((a, b) => {
      const orderA = getDocOrder(a);
      const orderB = getDocOrder(b);
      if (orderA !== orderB) return orderA - orderB;
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA; // Descending: latest update first
    });

    return { originalDocs: original, updatedDocs: updated };
  }, [customerDocs]);

  const [isLoadingMasters, setIsLoadingMasters] = useState(false);
  const [documentTypeOptions, setDocumentTypeOptions] = useState([]);
  const [verificationOptions, setVerificationOptions] = useState([]);

  // Dynamic resolver for VerificationMaster ID.
  // Delegates name/code matching to the shared Core helper so that only active
  // master rows are considered. A numeric status (the backend stores VerificationId
  // on the KYC record) is accepted only when that exact id is present and active in
  // the loaded master - never as an unvalidated passthrough, and never with a
  // hardcoded fallback.
  const resolveVerificationId = useCallback(
    (status) => {
      if (status === null || status === undefined || status === '') {
        return null;
      }

      const numericValue = Number(status);
      if (Number.isFinite(numericValue) && numericValue > 0) {
        const confirmed = verificationOptions.find((option) => {
          if (!option) return false;
          if (option.isActive === false || option.raw?.isActive === false) return false;
          const optionId = Number(
            option.value ?? option.verificationId ?? option.raw?.verificationId
          );
          return Number.isFinite(optionId) && optionId === numericValue;
        });
        if (confirmed) {
          return numericValue;
        }
        // Not present in the active master - fall through to name/code resolution
        // rather than trusting an arbitrary number.
      }

      return resolveVerificationIdByCodeOrName(verificationOptions, String(status));
    },
    [verificationOptions]
  );

  // Keep ref of active preview URLs and fetched doc keys for cleanup & de-duplication
  const activeBlobUrlsRef = useRef([]);
  const modalBlobUrlsRef = useRef([]);
  const hydratedKycIdsRef = useRef(new Set());
  const hydratedApplicantDocKeysRef = useRef(new Set());
  const hydratedCoDocKeysRef = useRef(new Set());
  // One-time guard for saved Co-Applicant Salary/Bank tuple lookups, keyed by real
  // primitives: applicationProductDetailsId + applicantSequence + documentTypeId.
  const hydratedCoFinancialKeysRef = useRef(new Set());

  useEffect(() => {
    if (appId && loadApplicationFromBackend) {
      loadApplicationFromBackend(appId);
    }
  }, [appId, loadApplicationFromBackend]);

  // Master Data loading
  useEffect(() => {
    async function fetchMaster(endpoint, idField, nameField, setState) {
      try {
        const res = await fetch(`${API_BASE}/${endpoint}`);
        if (res.ok) {
          const data = await res.json();
          setState(data.map((item) => ({ value: item[idField], label: item[nameField], raw: item })));
        }
      } catch (e) {
        console.error(`Failed to fetch ${endpoint}:`, e);
      }
    }
    async function loadMasters() {
      setIsLoadingMasters(true);
      await Promise.allSettled([
        fetchMaster('DocumentTypeMaster', 'documentTypeId', 'documentTypeName', setDocumentTypeOptions),
        fetchMaster('VerificationMaster', 'verificationId', 'verificationName', setVerificationOptions),
      ]);
      setIsLoadingMasters(false);
    }
    loadMasters();
  }, []);

  const appData = getApplication(appId);
  const ArrowLeftIcon = iconMap['ArrowLeft'];
  const activeCount = useMemo(() => getApplicantCount(appData), [appData]);

  // Stable scalar id for callbacks that must always use the live application.
  // Depending on the whole `appData` object would re-create those callbacks on
  // every render; depending on this primitive keeps them stable while still
  // invalidating them the moment the real id changes.
  const resolvedProductDetailsId = useMemo(() => {
    const raw =
      appData?.applicationProductDetailsId ??
      appData?.ApplicationProductDetailsId ??
      null;
    const num = Number(raw);
    return Number.isFinite(num) && num > 0 ? num : null;
  }, [appData]);

  // ── Helper: Normalize server path ─────────────────────────────────────────
  const normalizeDocPath = useCallback((rawPath) => {
    if (!rawPath || typeof rawPath !== 'string' || !rawPath.trim()) return '';
    let clean = rawPath.trim().replace(/\\/g, '/').replace(/^\/+/, '');
    if (!clean.startsWith('UploadedFiles/') && clean.startsWith('KYCDocuments/')) {
      clean = `UploadedFiles/${clean}`;
    }
    return clean;
  }, []);

  const formApplicationIdRef = useRef(appId);
  useEffect(() => {
    const fresh = buildKycState(getApplication(appId));
    if (formApplicationIdRef.current !== appId) {
      formApplicationIdRef.current = appId;
      docsRequestRef.current += 1;
      setViewingDocsFor(null);
      setForm(fresh);
      setApplicantDocs({});
      setCoApplicantDocs({});
      setApplicantPersistedDocs({});
      setCoApplicantPersistedDocs({});
      setAgentSourceDocs({});
      setKycRecordsList([]);
      hydratedKycIdsRef.current.clear();
      hydratedApplicantDocKeysRef.current.clear();
      hydratedCoDocKeysRef.current.clear();
      hydratedCoFinancialKeysRef.current.clear();
    } else {
      // Late applicant-count hydration must preserve pending browser Files.
      setForm((prev) => ({ ...prev, coApplicants: fresh.coApplicants.map((co, index) => prev.coApplicants[index] || co) }));
    }
  }, [appId, activeCount, getApplication]);

  // Supplementary fetch for dynamic discovery of KYC records from server
  useEffect(() => {
    let isMounted = true;
    setKycRecordsLoaded(false);
    async function fetchSupplementaryKyc() {
      if (!appId) return;
      const token = localStorage.getItem('authToken');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let targetCustomerId =
        appData?.agentCustomerId ||
        appData?.AgentCustomerId ||
        appData?.customerId ||
        null;
      const productDetailsId =
        appData?.applicationProductDetailsId ||
        appData?.ApplicationProductDetailsId ||
        null;

      if (!targetCustomerId && appId) {
        try {
          const custRes = await fetch(`${API_BASE}/AgentAddCustomer/${appId}`, { headers });
          if (custRes.ok) {
            const custData = await custRes.json();
            const record = Array.isArray(custData) ? custData[0] : (custData?.value ? custData.value[0] : custData);
            if (record) {
              targetCustomerId = record.agentCustomerId || record.AgentCustomerId || record.customerId || null;
            }
          }
        } catch {
          // ignore
        }
      }

      try {
        const kycRes = await fetch(`${API_BASE}/ApplicationKYCDocuments`, { headers });
        if (kycRes.ok && isMounted) {
          const allKyc = await kycRes.json();
          if (!isMounted) return;
          const kycArr = Array.isArray(allKyc) ? allKyc : (allKyc?.value || allKyc?.data || []);
          const filteredKyc = kycArr
            .filter((k) => {
              const kCustId = String(k.agentCustomerId ?? k.AgentCustomerId ?? '');
              const kProdId = String(k.applicationProductDetailsId ?? k.ApplicationProductDetailsId ?? '');
              const matchCust = targetCustomerId && kCustId === String(targetCustomerId);
              const matchProd = productDetailsId && kProdId === String(productDetailsId);
              const matchApp = appId && kCustId === String(appId);
              return matchCust || matchProd || matchApp;
            })
            .sort((a, b) => (a.applicationKYCDocumentId || 0) - (b.applicationKYCDocumentId || 0));

          setKycRecordsList(filteredKyc);
          setKycRecordsLoaded(true);
          if (filteredKyc.length > 0) {

            // Main Applicant is seeded strictly from the live sequence-0 primary row of THIS
            // application, excluding applicant-document tuples (Salary Slip, Bank Statement).
            // If it is absent or ambiguous, the applicant fields stay unseeded rather
            // than adopting another applicant's identity paths.
            const seqZeroRows = filteredKyc.filter((k) => {
              if (!k || k.isActive === false || k.IsActive === false) return false;
              if (isApplicantDocumentTuple(k)) return false;
              const rowProdId = Number(k.applicationProductDetailsId ?? k.ApplicationProductDetailsId);
              if (!productDetailsId || !Number.isFinite(rowProdId) || rowProdId !== Number(productDetailsId)) return false;
              const rawSeq = k.applicantSequence ?? k.ApplicantSequence;
              if (rawSeq === undefined || rawSeq === null) return false;
              return Number(rawSeq) === 0;
            });
            const appKycRec = seqZeroRows.length === 1 ? seqZeroRows[0] : null;

            const appDocPath =
              appKycRec?.documentPath ||
              appKycRec?.DocumentPath ||
              prev.applicant.documentPath ||
              null;
            const rawAppNum = appKycRec?.numberOfDocuments ?? appKycRec?.NumberOfDocuments;
            const backendAppNum = rawAppNum !== undefined && rawAppNum !== null ? Number(rawAppNum) : null;
            const appNumDocs = backendAppNum !== null
              ? backendAppNum
              : (prev.applicant.numberOfDocuments !== undefined && prev.applicant.numberOfDocuments !== null
                  ? Number(prev.applicant.numberOfDocuments)
                  : documentPaths(appDocPath).length);

            setForm((prev) => {
              if (savingRef.current) return prev;
              const updatedApplicant = {
                ...prev.applicant,
                // Live value only - never retain a previously drafted id.
                kycDocumentId: appKycRec?.applicationKYCDocumentId ?? null,
                numberOfDocuments: appNumDocs,
                identityDocumentCount: String(appNumDocs),
                aadharDocumentPath:
                  appKycRec?.aadharDocumentPath ||
                  appKycRec?.AadharDocumentPath ||
                  prev.applicant.aadharDocumentPath ||
                  null,
                panCardPath:
                  appKycRec?.panCardPath ||
                  appKycRec?.PanCardPath ||
                  prev.applicant.panCardPath ||
                  null,
                profileImagePath:
                  appKycRec?.profileImagePath ||
                  appKycRec?.ProfileImagePath ||
                  prev.applicant.profileImagePath ||
                  null,
                documentPath: appDocPath,
              };

              // Co-Applicant seeding resolved strictly by applicantSequence (1..N), excluding document tuples.
              const updatedCo = prev.coApplicants.map((co, idx) => {
                const coSeq = idx + 1;
                const coSeqRows = filteredKyc.filter((k) => {
                  if (!k || k.isActive === false || k.IsActive === false) return false;
                  if (isApplicantDocumentTuple(k)) return false;
                  const rowProdId = Number(k.applicationProductDetailsId ?? k.ApplicationProductDetailsId);
                  if (!productDetailsId || !Number.isFinite(rowProdId) || rowProdId !== Number(productDetailsId)) return false;
                  const rawSeq = k.applicantSequence ?? k.ApplicantSequence;
                  if (rawSeq === undefined || rawSeq === null) return false;
                  return Number(rawSeq) === coSeq;
                });
                const rec = coSeqRows.length === 1 ? coSeqRows[0] : null;
                const coDocPath =
                  rec?.documentPath ||
                  rec?.DocumentPath ||
                  co.documentPath ||
                  null;
                const rawCoNum = rec?.numberOfDocuments ?? rec?.NumberOfDocuments;
                const backendCoNum = rawCoNum !== undefined && rawCoNum !== null ? Number(rawCoNum) : null;
                const coNumDocs = backendCoNum !== null
                  ? backendCoNum
                  : (co.numberOfDocuments !== undefined && co.numberOfDocuments !== null
                      ? Number(co.numberOfDocuments)
                      : documentPaths(coDocPath).length);

                return {
                  ...co,
                  kycDocumentId: co.kycDocumentId || rec?.applicationKYCDocumentId || null,
                  numberOfDocuments: coNumDocs,
                  identityDocumentCount: String(coNumDocs),
                  aadharDocumentPath:
                    rec?.aadharDocumentPath ||
                    rec?.AadharDocumentPath ||
                    co.aadharDocumentPath ||
                    null,
                  panCardPath:
                    rec?.panCardPath ||
                    rec?.PanCardPath ||
                    co.panCardPath ||
                    null,
                  profileImagePath:
                    rec?.profileImagePath ||
                    rec?.ProfileImagePath ||
                    co.profileImagePath ||
                    null,
                  documentPath: coDocPath,
                };
              });

              return {
                ...prev,
                applicant: updatedApplicant,
                coApplicants: updatedCo,
              };
            });
          }
        }
      } catch (err) {
        console.warn('Could not fetch supplementary KYC records list:', err);
      }
    }

    fetchSupplementaryKyc();
    return () => {
      isMounted = false;
    };
  }, [appId, appData?.agentCustomerId, appData?.applicationProductDetailsId]);

  // ── Authoritative Main Applicant KYC row resolution (live backend data only) ──
  // The Main Applicant row is identified by its real identity in the backend model:
  //   applicationProductDetailsId === current application  AND  applicantSequence === 0
  // Excludes document tuples (Salary Slip, Bank Statement) which share the table.
  // Positional guesses (kycRecordsList[0]) and browser-persisted draft ids are NOT used,
  // because neither is guaranteed to point at the sequence-0 row of THIS application.
  const mainApplicantKycResolution = useMemo(() => {
    if (!resolvedProductDetailsId) {
      return { rows: [], row: null, id: null, ambiguous: false, sequenceFieldMissing: false };
    }

    // Primary KYC rows belonging to this application, regardless of sequence.
    const appRows = (kycRecordsList || []).filter((k) => {
      if (!k) return false;
      if (k.isActive === false || k.IsActive === false) return false;
      if (isApplicantDocumentTuple(k)) return false;
      const rowProdId = Number(k.applicationProductDetailsId ?? k.ApplicationProductDetailsId);
      return Number.isFinite(rowProdId) && rowProdId === Number(resolvedProductDetailsId);
    });

    // If this application has KYC rows but none of them expose applicantSequence, the
    // list payload cannot be used to identify the Main Applicant. That is a data-shape
    // problem, not "no row yet" - treating it as the latter would POST a duplicate
    // sequence-0 row on every save.
    const sequenceFieldMissing =
      appRows.length > 0 &&
      appRows.every((k) => (k.applicantSequence ?? k.ApplicantSequence) === undefined ||
        (k.applicantSequence ?? k.ApplicantSequence) === null);

    const rows = (kycRecordsList || []).filter((k) => {
      if (!k) return false;
      if (k.isActive === false || k.IsActive === false) return false;
      if (isApplicantDocumentTuple(k)) return false;

      const rowProdId = Number(k.applicationProductDetailsId ?? k.ApplicationProductDetailsId);
      if (!Number.isFinite(rowProdId) || rowProdId !== Number(resolvedProductDetailsId)) return false;

      const rawSeq = k.applicantSequence ?? k.ApplicantSequence;
      if (rawSeq === undefined || rawSeq === null) return false;
      return Number(rawSeq) === 0;
    });

    const row = rows.length === 1 ? rows[0] : null;
    const id = row
      ? Number(row.applicationKYCDocumentId ?? row.ApplicationKYCDocumentId ?? row.kycDocumentId) || null
      : null;

    return { rows, row, id, ambiguous: rows.length > 1, sequenceFieldMissing };
  }, [kycRecordsList, resolvedProductDetailsId]);

  // Live sequence-0 KYC id. Null is a valid state (row not created yet) and simply
  // means the create flow will POST a new row.
  const applicantKycId = mainApplicantKycResolution.id;

  const coApplicantKycIds = useMemo(() => {
    return (form.coApplicants || []).map((co, i) => {
      const coSeq = i + 1;
      const coRow = (kycRecordsList || []).find((k) => {
        if (!k || k.isActive === false || k.IsActive === false) return false;
        if (isApplicantDocumentTuple(k)) return false;
        const rowProdId = Number(k.applicationProductDetailsId ?? k.ApplicationProductDetailsId);
        if (!Number.isFinite(rowProdId) || rowProdId !== Number(resolvedProductDetailsId)) return false;
        const rawSeq = k.applicantSequence ?? k.ApplicantSequence;
        if (rawSeq === undefined || rawSeq === null) return false;
        return Number(rawSeq) === coSeq;
      });

      return (
        (coRow ? Number(coRow.applicationKYCDocumentId ?? coRow.ApplicationKYCDocumentId) : null) ||
        co?.kycDocumentId ||
        co?.applicationKYCDocumentId ||
        appData?.kycDocuments?.coApplicants?.[i]?.kycDocumentId ||
        appData?.kycDocuments?.coApplicants?.[i]?.applicationKYCDocumentId ||
        null
      );
    });
  }, [form.coApplicants, appData?.kycDocuments?.coApplicants, kycRecordsList, resolvedProductDetailsId]);

  const coApplicantKycIdsKey = coApplicantKycIds.map((id) => id || '').join(',');

  // Hydrate KYC record metadata from API if kycDocumentId exists
  useEffect(() => {
    if (!applicantKycId && !coApplicantKycIds.some(Boolean)) return;

    let isMounted = true;
    async function hydrateAllKyc() {
      const token = localStorage.getItem('authToken');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // 1. Hydrate Applicant
      if (applicantKycId && !hydratedKycIdsRef.current.has(applicantKycId)) {
        try {
          const res = await fetch(`${API_BASE}/ApplicationKYCDocuments/${applicantKycId}`, { headers });
          if (res.ok && isMounted) {
            const data = await res.json();
            if (!isMounted) return;
            hydratedKycIdsRef.current.add(applicantKycId);
            if (data) {
              const isTuple = isApplicantDocumentTuple(data);
              const rawDocPath =
                data.documentPath ||
                data.DocumentPath ||
                data.filePath ||
                data.FilePath ||
                data.url ||
                data.Url ||
                null;
              const docPath = !isTuple ? rawDocPath : null;
              const rawNum = data.numberOfDocuments ?? data.NumberOfDocuments;
              const backendNum = rawNum !== undefined && rawNum !== null ? Number(rawNum) : null;

              setForm((prev) => {
                if (savingRef.current) return prev;
                const app = prev.applicant;
                const numDocs = backendNum !== null
                  ? backendNum
                  : (app.numberOfDocuments !== undefined && app.numberOfDocuments !== null
                      ? Number(app.numberOfDocuments)
                      : documentPaths(docPath).length);

                return {
                  ...prev,
                  applicant: {
                    ...app,
                    kycDocumentId: applicantKycId,
                    numberOfDocuments: numDocs,
                    identityDocumentCount: String(numDocs),
                    aadhaarLast4:
                      app.aadhaarLast4 ||
                      (data.aadhaarLastFourDigits ? String(data.aadhaarLastFourDigits) : ''),
                    panCardNo: app.panCardNo || data.panCardNo || data.PANCardNo || '',
                    identityDocumentNo:
                      app.identityDocumentNo || data.documentNumber || data.DocumentNumber || '',
                    identityDocumentType:
                      app.identityDocumentType || (data.documentTypeId ? String(data.documentTypeId) : ''),
                    verificationStatus:
                      app.verificationStatus && app.verificationStatus !== 'Pending'
                        ? app.verificationStatus
                        : data.verificationId
                        ? String(data.verificationId)
                        : 'Pending',
                    documentPath: docPath,
                    aadharDocumentPath:
                      data.aadharDocumentPath ||
                      data.AadharDocumentPath ||
                      app.aadharDocumentPath ||
                      null,
                    panCardPath:
                      data.panCardPath ||
                      data.PanCardPath ||
                      app.panCardPath ||
                      null,
                    profileImagePath:
                      data.profileImagePath ||
                      data.ProfileImagePath ||
                      app.profileImagePath ||
                      null,
                    identityDocumentFiles: syncManualDocuments({ ...app, numberOfDocuments: numDocs, documentPath: docPath }).identityDocumentFiles,
                    manualDocuments: syncManualDocuments({ ...app, numberOfDocuments: numDocs, documentPath: docPath }).manualDocuments,
                    fileSize: data.fileSize || data.FileSize || null,
                  },
                };
              });
            }
          }
        } catch (err) {
          console.warn('Could not hydrate Applicant KYC record from server:', err);
        }
      }

      // 2. Hydrate Co-Applicants
      for (let i = 0; i < coApplicantKycIds.length; i++) {
        const coKycId = coApplicantKycIds[i];
        if (coKycId && !hydratedKycIdsRef.current.has(coKycId)) {
          try {
            const res = await fetch(`${API_BASE}/ApplicationKYCDocuments/${coKycId}`, { headers });
            if (res.ok && isMounted) {
              const data = await res.json();
              if (!isMounted) return;
              hydratedKycIdsRef.current.add(coKycId);
              if (data) {
                const isTuple = isApplicantDocumentTuple(data);
                const rawDocPath =
                  data.documentPath ||
                  data.DocumentPath ||
                  data.filePath ||
                  data.FilePath ||
                  data.url ||
                  data.Url ||
                  null;
                const docPath = !isTuple ? rawDocPath : null;
                const rawNum = data.numberOfDocuments ?? data.NumberOfDocuments;
                const backendNum = rawNum !== undefined && rawNum !== null ? Number(rawNum) : null;

                setForm((prev) => {
                if (savingRef.current) return prev;
                  const newCo = [...prev.coApplicants];
                  if (newCo[i]) {
                    const co = newCo[i];
                    const numDocs = backendNum !== null
                      ? backendNum
                      : (co.numberOfDocuments !== undefined && co.numberOfDocuments !== null
                          ? Number(co.numberOfDocuments)
                          : documentPaths(docPath).length);

                    newCo[i] = {
                      ...co,
                      kycDocumentId: coKycId,
                      numberOfDocuments: numDocs,
                      identityDocumentCount: String(numDocs),
                      aadhaarLast4:
                        co.aadhaarLast4 ||
                        (data.aadhaarLastFourDigits ? String(data.aadhaarLastFourDigits) : ''),
                      panCardNo: co.panCardNo || data.panCardNo || data.PANCardNo || '',
                      identityDocumentNo:
                        co.identityDocumentNo || data.documentNumber || data.DocumentNumber || '',
                      identityDocumentType:
                        co.identityDocumentType || (data.documentTypeId ? String(data.documentTypeId) : ''),
                      verificationStatus:
                        co.verificationStatus && co.verificationStatus !== 'Pending'
                          ? co.verificationStatus
                          : data.verificationId
                          ? String(data.verificationId)
                          : 'Pending',
                      documentPath: docPath,
                      aadharDocumentPath:
                        data.aadharDocumentPath ||
                        data.AadharDocumentPath ||
                        co.aadharDocumentPath ||
                        null,
                      panCardPath:
                        data.panCardPath ||
                        data.PanCardPath ||
                        co.panCardPath ||
                        null,
                      profileImagePath:
                        data.profileImagePath ||
                        data.ProfileImagePath ||
                        co.profileImagePath ||
                        null,
                      identityDocumentFiles: syncManualDocuments({ ...co, numberOfDocuments: numDocs, documentPath: docPath }).identityDocumentFiles,
                      manualDocuments: syncManualDocuments({ ...co, numberOfDocuments: numDocs, documentPath: docPath }).manualDocuments,
                      fileSize: data.fileSize || data.FileSize || null,
                    };
                  }
                  return { ...prev, coApplicants: newCo };
                });
              }
            }
          } catch (err) {
            console.warn(`Could not hydrate Co-Applicant ${i + 1} KYC record from server:`, err);
          }
        }
      }
    }

    hydrateAllKyc();
    return () => {
      isMounted = false;
    };
  }, [applicantKycId, coApplicantKycIdsKey]);

  // Hydrate Main Applicant canonical identity files through their dedicated endpoints.
  // This deliberately relies only on ApplicationKYCDocuments paths; it never reads
  // AgentCustomerDocument records or turns a preview blob into an upload File.
  useEffect(() => {
    if (!applicantKycId) return;

    let isMounted = true;
    async function hydrateApplicantDocs() {
      const token = localStorage.getItem('authToken');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const docConfigs = [
        { key: 'profile', route: 'profile-image', path: form.applicant?.profileImagePath, defaultName: 'Applicant_Profile' },
        { key: 'aadhaar', route: 'aadhar', path: form.applicant?.aadharDocumentPath, defaultName: 'Applicant_Aadhaar' },
        { key: 'pan', route: 'pan', path: form.applicant?.panCardPath, defaultName: 'Applicant_PAN' },
      ];

      for (const { key, route, path, defaultName } of docConfigs) {
        if (!path) continue;
        const cleanPath = normalizeDocPath(path);
        const cacheKey = `${applicantKycId}_${route}_${cleanPath || ''}`;
        if (hydratedApplicantDocKeysRef.current.has(cacheKey)) continue;

        try {
          let blob = null;
          let resolvedFileName = '';

          // 1. Try dedicated sub-route
          try {
            const res = await fetch(`${API_BASE}/ApplicationKYCDocuments/${applicantKycId}/${route}`, { headers });
            if (res.ok && isMounted) {
              const b = await res.blob();
              if (b && b.size > 0) {
                blob = b;
                const disposition = res.headers.get('content-disposition');
                if (disposition) {
                  const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
                  if (match && match[1]) {
                    resolvedFileName = match[1].replace(/['"]/g, '').trim();
                  }
                }
              }
            }
          } catch {
            // fallback
          }

          // 2. Fallback to download by canonical path
          if (!blob && cleanPath) {
            try {
              const dlRes = await fetch(`${API_BASE}/ApplicationKYCDocuments/download?path=${encodeURIComponent(cleanPath)}`, { headers });
              if (dlRes.ok && isMounted) {
                const b = await dlRes.blob();
                if (b && b.size > 0) {
                  blob = b;
                  resolvedFileName = cleanPath.split('/').pop() || cleanPath.split('\\').pop() || '';
                }
              }
            } catch {
              // ignore
            }
          }

          if (!blob || !isMounted) continue;

          hydratedApplicantDocKeysRef.current.add(cacheKey);
          const isPdf = blob.type === 'application/pdf' || (resolvedFileName && resolvedFileName.toLowerCase().endsWith('.pdf'));
          if (!resolvedFileName) {
            const ext = isPdf ? 'pdf' : (blob.type === 'image/png' ? 'png' : 'jpg');
            resolvedFileName = `${defaultName}.${ext}`;
          }

          let mimeType = blob.type || (isPdf ? 'application/pdf' : 'image/jpeg');
          if (/\.(jpg|jpeg)$/i.test(resolvedFileName)) mimeType = 'image/jpeg';
          else if (/\.png$/i.test(resolvedFileName)) mimeType = 'image/png';
          else if (/\.webp$/i.test(resolvedFileName)) mimeType = 'image/webp';
          else if (isPdf) mimeType = 'application/pdf';

          const typedBlob = new Blob([blob], { type: mimeType });
          const blobUrl = URL.createObjectURL(typedBlob);
          activeBlobUrlsRef.current.push(blobUrl);

          setApplicantPersistedDocs((prev) => ({
            ...prev,
            [key]: {
              exists: true,
              fileName: resolvedFileName,
              blobUrl,
              mimeType: typedBlob.type,
              size: blob.size,
              documentPath: cleanPath || null,
            },
          }));
        } catch (err) {
          console.warn(`Could not hydrate Applicant ${key} document:`, err);
        }
      }
    }

    hydrateApplicantDocs();
    return () => {
      isMounted = false;
    };
  }, [
    applicantKycId,
    form.applicant?.profileImagePath,
    form.applicant?.aadharDocumentPath,
    form.applicant?.panCardPath,
  ]);

  // ── Resolve exact agentCustomerId ─────────────────────────────────────────
  // Primitive projections of the draft record.
  // `getApplication()` runs `normalizeApplicationRecord()`, which returns a NEW object
  // on every call, so `appData` has a fresh identity on every render. Depending on the
  // object itself would give the callback below a new identity each render and
  // re-trigger every effect that lists it, producing an endless fetch/render cycle.
  // These three primitives carry the only values the callback reads, using the exact
  // same `||` precedence as before so resolution behaviour is unchanged.
  const appAgentCustomerId =
    appData?.agentCustomerId ||
    appData?.AgentCustomerId ||
    appData?.customerId ||
    null;
  const appCustomerName = appData?.customerName || '';
  const appMobile = appData?.mobile || '';

  const resolveAgentCustomerId = useCallback(async () => {
    let resolvedId = appAgentCustomerId;

    if (!resolvedId && appId) {
      try {
        const res = await fetch(`${API_BASE}/AgentAddCustomer/${appId}`);
        if (res.ok) {
          const data = await res.json();
          const record = Array.isArray(data) ? data[0] : (data?.value ? data.value[0] : data);
          if (record) {
            resolvedId = record.agentCustomerId || record.AgentCustomerId || record.customerId || null;
            if (resolvedId) {
              saveApplication(appId, {
                agentCustomerId: resolvedId,
                customerName: record.fullName || record.customerName || appCustomerName || '',
                mobile: record.mobileNumber || record.mobile || appMobile || '',
              });
            }
          }
        } else {
          console.error('Failed to resolve customer record from AgentAddCustomer for appId:', appId, 'Status:', res.status);
        }
      } catch (err) {
        console.error('Failed to resolve customer record for agentCustomerId:', err);
      }
    }

    return resolvedId || null;
  }, [appId, saveApplication, appAgentCustomerId, appCustomerName, appMobile]);

  // Load real AgentCustomerDocuments for Main Applicant
  useEffect(() => {
    let isMounted = true;
    async function loadAgentSourceDocuments() {
      const agentCustId = await resolveAgentCustomerId();
      if (!agentCustId) return;

      try {
        const token = localStorage.getItem('authToken');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${API_BASE}/AgentCustomerDocument/bycustomer/${agentCustId}`, { headers });
        if (!res.ok || !isMounted) return;

        const data = await res.json();
        const docList = Array.isArray(data) ? data : (data?.data || data?.value || data?.items || []);
        const activeDocs = docList.filter((d) => d && d.isActive !== false);

        const mapped = {};
        activeDocs.forEach((doc) => {
          const rawSeq = doc.applicantSequence ?? doc.ApplicantSequence;
          let seq = 0;
          if (rawSeq !== undefined && rawSeq !== null && Number.isFinite(Number(rawSeq)) && Number(rawSeq) >= 0) {
            seq = Number(rawSeq);
          } else {
            const rawName = String(doc.documentTypeName || doc.documentType || doc.name || '').trim();
            const rawCode = String(doc.documentTypeCode || doc.code || '').trim().toUpperCase();
            const fileName = String(doc.fileName || '').trim();
            const text = `${rawCode} ${rawName} ${fileName}`.toUpperCase();
            const coMatch = text.match(/CO[-_ ]?APP(?:LICANT)?[-_ ]?([1-9]\d*)/i);
            if (coMatch && coMatch[1]) {
              seq = Number(coMatch[1]);
            } else if (/CO[-_ ]?APP(?:LICANT)?/i.test(text)) {
              seq = 1;
            }
          }

          if (!mapped[seq]) mapped[seq] = {};

          const rawName = String(doc.documentTypeName || doc.documentType || doc.name || '').trim();
          const rawCode = String(doc.documentTypeCode || doc.code || '').trim().toUpperCase();
          const fileName = String(doc.fileName || '').toLowerCase();
          const normCat = normalizeToCanonicalCategory(rawCode || rawName || fileName);

          // 1. Profile / Photo
          if (
            normCat === 'PROFILE' ||
            rawCode === 'PHOTO' ||
            rawCode === 'PROFILE' ||
            rawCode === 'PROFILE_IMAGE' ||
            /(profile|photo)/i.test(rawName) ||
            /(profile|photo)/i.test(fileName)
          ) {
            if (!mapped[seq].profile) mapped[seq].profile = doc;
            if (seq === 0 && !mapped.profile) mapped.profile = doc;
          }
          // 2. Aadhaar
          else if (
            normCat === 'AADHAAR' ||
            rawCode === 'AADHAAR' ||
            rawCode === 'AADHAR' ||
            /(aadhaar|aadhar)/i.test(rawName) ||
            /(aadhaar|aadhar)/i.test(fileName)
          ) {
            if (!mapped[seq].aadhaar) mapped[seq].aadhaar = doc;
            if (seq === 0 && !mapped.aadhaar) mapped.aadhaar = doc;
          }
          // 3. PAN
          else if (
            normCat === 'PAN' ||
            rawCode === 'PAN' ||
            rawCode === 'PANCARD' ||
            /\bpan\b/i.test(rawName) ||
            /\bpan\b/i.test(fileName)
          ) {
            if (!mapped[seq].pan) mapped[seq].pan = doc;
            if (seq === 0 && !mapped.pan) mapped.pan = doc;
          }
          // 4. Salary Slip
          else if (
            normCat === 'SALARY_SLIP' ||
            rawCode === 'SALARY_SLIP' ||
            rawCode === 'SALARY' ||
            /(salary|payslip|income)/i.test(rawName) ||
            /(salary|payslip)/i.test(fileName)
          ) {
            if (!mapped[seq].salarySlip) mapped[seq].salarySlip = doc;
            if (seq === 0 && !mapped.salarySlip) mapped.salarySlip = doc;
          }
          // 5. Bank Statement
          else if (
            normCat === 'BANK_STATEMENT' ||
            rawCode === 'BANK_STATEMENT' ||
            rawCode === 'BANK' ||
            /(bank|statement|passbook)/i.test(rawName) ||
            /(bank|statement|passbook)/i.test(fileName)
          ) {
            if (!mapped[seq].bankStatement) mapped[seq].bankStatement = doc;
            if (seq === 0 && !mapped.bankStatement) mapped.bankStatement = doc;
          }
        });

        if (isMounted) {
          // Second line of defence against a render/fetch cycle: `mapped` is a fresh
          // object every run, so setting it unconditionally always re-renders even when
          // the backend returned the same documents. Compare the real backend primary
          // keys of the slots and keep the previous state when nothing changed.
          setAgentSourceDocs((prev) => {
            const docKey = (doc) =>
              doc ? (doc.agentCustomerDocumentId ?? doc.AgentCustomerDocumentId ?? doc.id ?? null) : null;

            const allSeqKeys = Array.from(new Set([...Object.keys(prev || {}), ...Object.keys(mapped)]));
            const unchanged = AGENT_SOURCE_SLOTS.every(
              (slot) => docKey(prev?.[slot]) === docKey(mapped[slot])
            ) && allSeqKeys.every((seqKey) => {
              const prevSeq = prev?.[seqKey] || {};
              const nextSeq = mapped[seqKey] || {};
              return AGENT_SOURCE_SLOTS.every((slot) => docKey(prevSeq[slot]) === docKey(nextSeq[slot]));
            });

            return unchanged ? prev : mapped;
          });
        }
      } catch (err) {
        console.warn('Failed to load Agent customer documents for promotion:', err);
      }
    }

    loadAgentSourceDocuments();
    return () => {
      isMounted = false;
    };
  }, [resolveAgentCustomerId, documentTypeOptions]);

  // Display saved identity references immediately; previews are downloaded on demand.
  useEffect(() => {
    setCoApplicantPersistedDocs((prev) => {
      let next = prev;
      form.coApplicants.forEach((person, index) => {
        for (const category of KYC_CATEGORIES.filter((item) => item.fields)) {
          const path = person[category.fields[0]] ?? person[category.fields[1]];
          if (!path || next[index]?.[category.key]?.documentPath === path) continue;
          next = updateApplicantSlot(next, index, category.key, slotReference(path));
        }
      });
      return next;
    });
  }, [form.coApplicants]);

  // Financial references are fetched by application + sequence + document type.
  const savedCoApplicantSequences = useMemo(() => {
    if (!resolvedProductDetailsId) return [];

    const sequences = new Set();
    (kycRecordsList || []).forEach((k) => {
      if (!k) return;
      if (k.isActive === false || k.IsActive === false) return;
      if (isApplicantDocumentTuple(k)) return;

      const rowProdId = Number(k.applicationProductDetailsId ?? k.ApplicationProductDetailsId);
      if (!Number.isFinite(rowProdId) || rowProdId !== Number(resolvedProductDetailsId)) return;

      const rawSeq = k.applicantSequence ?? k.ApplicantSequence;
      if (rawSeq === undefined || rawSeq === null) return;

      const seq = Number(rawSeq);
      if (Number.isFinite(seq) && seq >= 1) sequences.add(seq);
    });

    return Array.from(sequences).sort((a, b) => a - b);
  }, [kycRecordsList, resolvedProductDetailsId]);

  // Primitive key so the effect below depends on a stable string, not an array identity.
  const savedCoApplicantSequencesKey = savedCoApplicantSequences.join(',');

  useEffect(() => {
    if (!resolvedProductDetailsId) return;
    if (!savedCoApplicantSequencesKey) return;
    if (documentTypeOptions.length === 0) return;
    if (isSaving) return;

    let isMounted = true;

    async function hydrateSavedCoApplicantFinancialDocs() {
      const salarySlipTypeId = resolveDocumentTypeId(documentTypeOptions, 'Salary Slip');
      const bankStatementTypeId = resolveDocumentTypeId(documentTypeOptions, 'Bank Statement');

      const docConfigs = [
        { key: 'salarySlip', typeId: salarySlipTypeId, defaultBase: 'SalarySlip' },
        { key: 'bankStatement', typeId: bankStatementTypeId, defaultBase: 'BankStatement' },
      ];

      const sequences = savedCoApplicantSequencesKey
        .split(',')
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value >= 1);

      for (const seq of sequences) {
        const i = seq - 1; // coApplicantPersistedDocs is keyed by co-applicant index
        for (const { key, typeId, defaultBase } of docConfigs) {
          if (!typeId) continue;
          const cacheKey = `coapp_doc_${resolvedProductDetailsId}_${seq}_${typeId}`;
          if (hydratedCoFinancialKeysRef.current.has(cacheKey)) continue;


          const revision = coDocumentRevisionRef.current[i] || 0;
          try {
            const docRes = await rmCustomerService.getApplicantDocument(resolvedProductDetailsId, seq, typeId);
            const docData = docRes?.data || docRes?.value || docRes;
            if (!docData) {
              continue;
            }
            const path = docData?.documentPath || docData?.DocumentPath || docData?.filePath || null;
            if (path && isMounted && !savingRef.current && revision === (coDocumentRevisionRef.current[i] || 0)) {
              hydratedCoFinancialKeysRef.current.add(cacheKey);
              const cleanPath = normalizeDocPath(path);
              const cleanName =
                docData.originalFileName ||
                docData.OriginalFileName ||
                cleanPath.split('/').pop() ||
                `CoApplicant_${seq}_${defaultBase}.pdf`;
              const isPdf = cleanName.toLowerCase().endsWith('.pdf') || docData.contentType === 'application/pdf';

              // Set preliminary persisted state immediately so UI slot is populated
              setCoApplicantPersistedDocs((prev) => ({
                ...prev,
                [i]: {
                  ...(prev[i] || {}),
                  [key]: {
                    exists: true,
                    fileName: cleanName,
                    blobUrl: null,
                    mimeType: isPdf ? 'application/pdf' : (docData.contentType || docData.ContentType || 'image/jpeg'),
                    size: Number(docData.fileSize || docData.FileSize) || null,
                    documentPath: cleanPath,
                    documentTypeId: typeId,
                    applicantDocumentId: docData?.applicationKYCDocumentId || docData?.id || null,
                    applicantSequence: seq,
                  },
                },
              }));


            }
          } catch (e) {
            // Document not found or not uploaded yet
          }
        }
      }
    }

    hydrateSavedCoApplicantFinancialDocs();

    return () => {
      isMounted = false;
    };
  }, [resolvedProductDetailsId, savedCoApplicantSequencesKey, documentTypeOptions, isSaving, normalizeDocPath]);


  // NOTE: Main Applicant (sequence 0) Salary Slip / Bank Statement are NOT probed on
  // page load - those cards were removed from this screen, so the lookup had no rendered
  // consumer. The sequence-0 tuple check still runs inside Save & Continue, where it
  // decides whether to skip or promote the Agent document.
  //
  // Co-Applicant Salary/Bank hydration is handled above, gated on a saved DB record.

  // ── Document Cleanup Helpers ─────────────────────────────────────────────
  const revokeAllBlobUrls = useCallback(() => {
    if (activeBlobUrlsRef.current.length > 0) {
      activeBlobUrlsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      });
      activeBlobUrlsRef.current = [];
    }
  }, []);

  const revokeModalBlobUrls = useCallback(() => {
    if (modalBlobUrlsRef.current.length > 0) {
      modalBlobUrlsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      });
      modalBlobUrlsRef.current = [];
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      docsRequestRef.current += 1;
      revokeAllBlobUrls();
      revokeModalBlobUrls();
    };
  }, [revokeAllBlobUrls, revokeModalBlobUrls]);

  // ── Helper: Fetch a single document blob by server path (Safe Provenance) ─
  const fetchCoAppDocBlobByPath = useCallback(async (rawPath, defaultName, optDocId = null) => {
    const cleanPath = normalizeDocPath(rawPath);
    if (!cleanPath) return { url: null, fileName: defaultName || '', error: 'No path provided' };

    const ext = cleanPath.split('.').pop()?.toLowerCase();
    const isZip = ext === 'zip' || ext === 'rar' || ext === '7z';
    if (isZip) {
      return {
        url: null,
        fileName: cleanPath.split('/').pop() || defaultName || 'archive.zip',
        fileType: 'zip',
        error: null,
      };
    }

    try {
      const token = localStorage.getItem('authToken');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // Prevent routing AgentCustomerDocument paths to ApplicationKYCDocuments (causes HTTP 400)
      if (cleanPath.startsWith('UploadedFiles/AgentCustomers/') || cleanPath.startsWith('AgentCustomers/')) {
        let resolvedDocId = optDocId;
        if (!resolvedDocId) {
          const matchCust = cleanPath.match(/AgentCustomers\/(\d+)\//i);
          if (matchCust && matchCust[1]) {
            try {
              const agentListRes = await fetch(`${API_BASE}/AgentCustomerDocument/bycustomer/${matchCust[1]}`, { headers });
              if (agentListRes.ok) {
                const listData = await agentListRes.json();
                const list = Array.isArray(listData) ? listData : (listData?.data || listData?.value || []);
                const cleanLower = cleanPath.toLowerCase();
                const matched = list.find((d) => normalizeDocPath(d.filePath || d.documentPath || d.path || '').toLowerCase() === cleanLower);
                if (matched?.agentCustomerDocumentId || matched?.id) {
                  resolvedDocId = Number(matched.agentCustomerDocumentId || matched.id);
                }
              }
            } catch {}
          }
        }

        if (resolvedDocId) {
          try {
            const agentRes = await fetch(`${API_BASE}/AgentCustomerDocument/download/${resolvedDocId}`, { headers });
            if (agentRes.ok) {
              const rawBlob = await agentRes.blob();
              let mimeType = 'image/jpeg';
              if (ext === 'pdf' || rawBlob.type === 'application/pdf') mimeType = 'application/pdf';
              else if (ext === 'png') mimeType = 'image/png';
              else if (ext === 'webp') mimeType = 'image/webp';
              const typedBlob = new Blob([rawBlob], { type: mimeType });
              const previewUrl = URL.createObjectURL(typedBlob);
              modalBlobUrlsRef.current.push(previewUrl);
              return {
                url: previewUrl,
                fileName: cleanPath.split('/').pop() || defaultName || 'document',
                fileType: mimeType === 'application/pdf' ? 'pdf' : 'image',
                size: rawBlob.size,
                error: null,
              };
            }
          } catch (agentErr) {
            console.warn(`[KycDocuments] Agent download failed for ID ${resolvedDocId}:`, agentErr);
          }
        }
        return {
          url: null,
          fileName: cleanPath.split('/').pop() || defaultName || 'document',
          isHistoricalUnavailable: true,
          error: 'Previous version file is no longer available on the server.',
        };
      }

      let serverPath = cleanPath;
      if (!serverPath.startsWith('UploadedFiles/') && (serverPath.startsWith('KYCDocuments/') || serverPath.startsWith('AgentCustomers/'))) {
        serverPath = `UploadedFiles/${serverPath}`;
      }

      const res = await fetch(`${API_BASE}/ApplicationKYCDocuments/download?path=${encodeURIComponent(serverPath)}`, { headers });
      if (res.status === 404) {
        return {
          url: null,
          fileName: cleanPath.split('/').pop() || defaultName || 'document',
          isHistoricalUnavailable: true,
          error: 'Previous version file is no longer available on the server.',
        };
      }
      if (!res.ok) {
        return {
          url: null,
          fileName: cleanPath.split('/').pop() || defaultName || 'document',
          error: 'Document could not be retrieved from server.',
        };
      }

      const blob = await res.blob();
      if (!blob || blob.size === 0) {
        return {
          url: null,
          fileName: cleanPath.split('/').pop() || defaultName || 'document',
          error: 'Document file is empty.',
        };
      }

      let fileName = '';
      const disposition = res.headers.get('content-disposition');
      if (disposition) {
        const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
        if (match && match[1]) {
          fileName = match[1].replace(/['"]/g, '').trim();
        }
      }
      if (!fileName) {
        fileName = cleanPath.split('/').pop() || defaultName || 'document';
      }

      const isPdf = blob.type === 'application/pdf' || /\.pdf$/i.test(fileName);
      let mimeType = blob.type || (isPdf ? 'application/pdf' : 'image/jpeg');
      if (/\.(jpg|jpeg)$/i.test(fileName)) mimeType = 'image/jpeg';
      else if (/\.png$/i.test(fileName)) mimeType = 'image/png';
      else if (/\.webp$/i.test(fileName)) mimeType = 'image/webp';
      else if (isPdf) mimeType = 'application/pdf';

      const typedBlob = new Blob([blob], { type: mimeType });
      const previewUrl = URL.createObjectURL(typedBlob);
      modalBlobUrlsRef.current.push(previewUrl);

      return {
        url: previewUrl,
        fileName,
        fileType: isPdf ? 'pdf' : 'image',
        size: blob.size,
        error: null,
      };
    } catch (err) {
      console.error(`Failed to download doc by path ${cleanPath}:`, err);
      return {
        url: null,
        fileName: cleanPath.split('/').pop() || defaultName || 'document',
        isHistoricalUnavailable: true,
        error: 'Previous version file is no longer available on the server.',
      };
    }
  }, [normalizeDocPath]);

  // Centralized archive / manual document download helper respecting storage provenance
  const handleDownloadArchiveDoc = useCallback(
    async (doc) => {
      if (!doc) return;
      const path = doc.filePath || doc.documentPath || doc.path || '';
      const cleanPath = normalizeDocPath(path);
      const fileName = doc.fileName || cleanPath.split('/').pop() || 'document.zip';

      try {
        let blob = null;
        const rawDocId = doc.agentCustomerDocumentId ?? doc.id;
        const isNumericDocId = rawDocId && Number.isInteger(Number(rawDocId)) && Number(rawDocId) > 0;
        const isAgentPath = cleanPath.startsWith('UploadedFiles/AgentCustomers/') || cleanPath.startsWith('AgentCustomers/');

        if (isAgentPath || (doc.storageSource === 'AGENT_CUSTOMER_DOCUMENT' && isNumericDocId)) {
          if (isNumericDocId) {
            blob = await rmCustomerService.downloadAgentCustomerDocument(Number(rawDocId));
          } else {
            console.warn('[KycDocuments] Agent archive document missing numeric ID for download:', doc);
          }
        } else {
          let serverPath = cleanPath;
          if (!serverPath.startsWith('UploadedFiles/') && serverPath.startsWith('KYCDocuments/')) {
            serverPath = `UploadedFiles/${serverPath}`;
          }
          blob = await rmCustomerService.downloadKycDocumentByPath(serverPath);
        }

        if (blob && blob.size > 0) {
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        }
      } catch (err) {
        console.warn('[KycDocuments] Archive download failed:', err);
      }
    },
    [normalizeDocPath]
  );

  // ── Resolve a BackOfficeDocumentRejection record to a numeric DocumentTypeId ──
  // BackOfficeDocumentRejection rows identify the document by `rejectedDocumentType`
  // (a code such as AADHAAR / PAN / PROFILE_IMAGE / CO_APPLICANT_SALARY_SLIP) and
  // generally carry no documentTypeId. Without resolving it, a replacement is grouped
  // under its code string while the original is grouped under its numeric id, so the
  // two never meet and the replacement is misread as an Original.
  // Resolution is fully dynamic against the active DocumentTypeMaster - no numeric
  // assumptions are made here.
  const resolveRejectionDocumentTypeId = useCallback(
    (rejection) => {
      const explicit = Number(rejection?.documentTypeId ?? rejection?.DocumentTypeId);
      if (Number.isFinite(explicit) && explicit > 0) {
        return explicit;
      }

      const rejType = String(rejection?.rejectedDocumentType || '').trim();
      if (!rejType) return null;

      // Try the code as-is first (the helper understands APPLICANT_/CO_APPLICANT_ forms),
      // then the co-applicant prefix stripped, so both applicant and co-applicant
      // replacements land on the same master row as their original.
      return (
        resolveDocumentTypeId(documentTypeOptions, rejType) ||
        resolveDocumentTypeId(
          documentTypeOptions,
          rejType.replace(/^(CO_?APPLICANT|APPLICANT)_/i, '')
        ) ||
        null
      );
    },
    [documentTypeOptions]
  );

  // ── Load and Download Documents for Customer ─────────────────────────────
  // ── Load and Download Documents for Customer ─────────────────────────────
  const loadCustomerDocuments = useCallback(async () => {
    const requestId = ++docsRequestRef.current;
    setIsLoadingDocs(true);
    setDocsLoadError('');
    revokeModalBlobUrls();
    setCustomerDocs([]);

    try {
      const agentCustomerId = await resolveAgentCustomerId();
      console.log('Agent Customer ID:', agentCustomerId);

      const headers = {};
      const token = localStorage.getItem('authToken');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // 1. Fetch document metadata for customer
      let documentList = [];
      try {
        const targetUrl = `${API_BASE}/AgentCustomerDocument/bycustomer/${agentCustomerId}`;
        const res = agentCustomerId ? await fetch(targetUrl, { headers }) : null;
        if (res?.ok) {
          const data = await res.json();
          documentList = Array.isArray(data) ? data : (data?.data || data?.value || data?.items || []);
        }
      } catch (err) {
        console.warn('Could not fetch AgentCustomerDocument list:', err);
      }

      const activeDocs = documentList.filter((doc) => doc.isActive !== false);

      // 2. Fetch live BackOfficeDocumentRejection history for the application to reconstruct updated versions.
      const productDetailsId = resolvedProductDetailsId;

      let allRejections = [];
      if (productDetailsId) {
        try {
          const rejRes = await fetch(`${API_BASE}/BackOfficeDocumentRejection/application/${productDetailsId}`, { headers });
          if (rejRes.ok) {
            const rejData = await rejRes.json();
            allRejections = Array.isArray(rejData) ? rejData : (rejData?.value || rejData?.data || []);
          }
        } catch (rejErr) {
          console.warn('Failed to fetch application document rejections for customer modal:', rejErr);
        }
      }

      const normalizedAllRejections = allRejections.map(normalizeRejectionRecord).filter(Boolean);

      // Filter for primary applicant rejections (applicantSequence = 0 or KYC ID matching Main Applicant)
      const applicantRejections = normalizedAllRejections.filter((r) => {
        if (r.isActive === false || r.IsActive === false) return false;
        const isSeqZero = r.applicantSequence === 0;
        const isTargetKyc = form.applicant?.kycDocumentId && r.kycDocumentId === Number(form.applicant.kycDocumentId);
        if (!isSeqZero && !isTargetKyc) return false;
        if (r.rejectedDocumentType.startsWith('CO_APPLICANT') || r.rejectedDocumentType.startsWith('COAPPLICANT')) return false;
        return Boolean(r.currentDocumentPath && r.currentDocumentPath !== r.originalDocumentPath);
      });

      // 3. Download and create preview blobs for AgentCustomerDocument items
      // Ensure at most 1 Original per canonical category from AgentCustomerDocument
      const agentCategoryMap = new Map();

      const loadedAgentDocs = (await Promise.all(
        activeDocs.map(async (doc) => {
          const docId = doc.agentCustomerDocumentId || doc.agentCustomerId || doc.id;
          const fileName = doc.fileName || 'document';
          const ext = fileName.split('.').pop()?.toLowerCase();
          const isPdf = ext === 'pdf';
          const canonicalCategory = normalizeToCanonicalCategory(doc.documentTypeCode || doc.documentTypeName || doc.documentType);
          const dlUrl = `${API_BASE}/AgentCustomerDocument/download/${docId}`;

          try {
            const dlRes = await fetch(dlUrl, { headers });
            if (!dlRes.ok) {
              throw new Error(`Download failed with status ${dlRes.status}`);
            }

            const rawBlob = await dlRes.blob();
            let mimeType = 'application/octet-stream';
            if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
            else if (ext === 'png') mimeType = 'image/png';
            else if (ext === 'pdf') mimeType = 'application/pdf';
            else if (ext === 'webp') mimeType = 'image/webp';
            else if (rawBlob.type && rawBlob.type !== 'application/octet-stream') {
              mimeType = rawBlob.type;
            }

            const typedBlob = new Blob([rawBlob], { type: mimeType });
            const previewUrl = URL.createObjectURL(typedBlob);
            modalBlobUrlsRef.current.push(previewUrl);

            return {
              ...doc,
              id: `agent_${docId}`,
              agentCustomerDocumentId: docId,
              canonicalCategory,
              applicantSequence: 0,
              storageSource: 'AGENT_CUSTOMER_DOCUMENT',
              documentTypeId: doc.documentTypeId,
              documentTypeName: CANONICAL_CATEGORY_META[canonicalCategory]?.name || doc.documentTypeName || doc.documentType || 'Uploaded Document',
              fileName,
              filePath: doc.filePath,
              fileType: isPdf ? 'pdf' : 'image',
              previewUrl,
              versionLabel: 'Original Document',
              versionDisplay: 'Original Document',
              isOriginal: true,
              isLatest: true,
              isCurrent: true,
              status: 'Active',
              createdAt: doc.createdAt,
              createdBy: doc.createdBy,
              isActive: doc.isActive !== false,
              error: null,
            };
          } catch (dlErr) {
            console.error(`Failed to download document ${docId} (${fileName}):`, dlErr);
            return {
              ...doc,
              id: `agent_${docId}`,
              agentCustomerDocumentId: docId,
              canonicalCategory,
              applicantSequence: 0,
              storageSource: 'AGENT_CUSTOMER_DOCUMENT',
              documentTypeId: doc.documentTypeId,
              documentTypeName: CANONICAL_CATEGORY_META[canonicalCategory]?.name || doc.documentTypeName || doc.documentType || 'Uploaded Document',
              fileName,
              filePath: doc.filePath,
              fileType: isPdf ? 'pdf' : 'image',
              previewUrl: null,
              versionLabel: 'Original Document',
              versionDisplay: 'Original Document',
              isOriginal: true,
              isLatest: true,
              isCurrent: true,
              status: 'Active',
              createdAt: doc.createdAt,
              createdBy: doc.createdBy,
              isActive: doc.isActive !== false,
              error: 'Failed to load preview',
            };
          }
        })
      )).filter(Boolean);

      // Keep only 1 latest Original per canonical category
      const uniqueAgentOriginals = [];
      loadedAgentDocs.forEach((doc) => {
        if (!agentCategoryMap.has(doc.canonicalCategory)) {
          agentCategoryMap.set(doc.canonicalCategory, doc);
          uniqueAgentOriginals.push(doc);
        }
      });

      // 4. Resolve the Primary Main Applicant KYC row (Sequence 0, not a tuple)
      let mainKycRow = mainApplicantKycResolution.row || form.applicant;
      let mainKycDocPath = form.applicant?.documentPath || null;
      let mainKycCreatedAt = form.applicant?.createdAt || null;
      let mainKycId = form.applicant?.kycDocumentId || null;

      if (!mainKycDocPath || !mainKycId) {
        const seqZeroRow = (kycRecordsList || []).find((k) => {
          if (!k || k.isActive === false || k.IsActive === false) return false;
          if (isApplicantDocumentTuple(k)) return false;
          const rowProdId = Number(k.applicationProductDetailsId ?? k.ApplicationProductDetailsId);
          if (productDetailsId && (!Number.isFinite(rowProdId) || rowProdId !== Number(productDetailsId))) return false;
          const rawSeq = k.applicantSequence ?? k.ApplicantSequence;
          return rawSeq === undefined || rawSeq === null || Number(rawSeq) === 0;
        });
        if (seqZeroRow) {
          mainKycRow = seqZeroRow;
          mainKycId = seqZeroRow.applicationKYCDocumentId ?? seqZeroRow.ApplicationKYCDocumentId ?? mainKycId;
          mainKycDocPath = seqZeroRow.documentPath || seqZeroRow.DocumentPath || mainKycDocPath;
          mainKycCreatedAt = seqZeroRow.createdAt || seqZeroRow.CreatedAt || mainKycCreatedAt;
        }
      }

      if (mainKycId) {
        try {
          const mRes = await fetch(`${API_BASE}/ApplicationKYCDocuments/${mainKycId}`, { headers });
          if (mRes.ok) {
            const mData = await mRes.json();
            if (mData && !isApplicantDocumentTuple(mData)) {
              mainKycRow = mData;
              mainKycDocPath = mData.documentPath || mData.DocumentPath || null;
              mainKycCreatedAt = mData.createdAt || mData.CreatedAt || mainKycCreatedAt;
            }
          }
        } catch {}
      }

      // 5. Reconstruct Updated Documents from BackOfficeDocumentRejection
      // Group by canonical category and select only the latest authoritative rejection per category
      const getRejectionTimestamp = (r) =>
        new Date(r?.verifiedAt || r?.resubmittedAt || r?.rejectedAt || r?.createdAt || 0).getTime();

      const isLaterRejection = (newRej, existingRej) => {
        const tNew = getRejectionTimestamp(newRej);
        const tExist = getRejectionTimestamp(existingRej);
        if (tNew !== tExist) return tNew > tExist;
        return (Number(newRej?.backOfficeDocumentRejectionId) || 0) > (Number(existingRej?.backOfficeDocumentRejectionId) || 0);
      };

      const latestByCategory = new Map();
      applicantRejections.forEach((rej) => {
        const cat = normalizeToCanonicalCategory(rej.rejectedDocumentType);
        const existing = latestByCategory.get(cat);
        if (!existing || isLaterRejection(rej, existing)) {
          latestByCategory.set(cat, rej);
        }
      });

      const updatedDocsFromRej = [];
      const downloadRejPromises = [];

      latestByCategory.forEach((rej, cat) => {
        const cleanCurr = normalizeDocPath(rej.currentDocumentPath);
        if (!cleanCurr) return;

        const isLatest = true;
        const versionLabel = 'Latest Updated';
        const fileName = cleanCurr.split('/').pop() || rej.rejectedDocumentType || 'Updated_Document';
        const ext = fileName.split('.').pop()?.toLowerCase();
        const isPdf = ext === 'pdf';

        // Resolve real AgentCustomerDocumentId if cleanCurr points to an Agent document
        let agentDocId = null;
        const isAgentPath = cleanCurr.startsWith('UploadedFiles/AgentCustomers/') || cleanCurr.startsWith('AgentCustomers/');
        if (isAgentPath) {
          const cleanCurrLower = cleanCurr.toLowerCase();
          const matchedAgentDoc = activeDocs.find((d) => {
            const p = normalizeDocPath(d.filePath || d.documentPath || d.path || '');
            return p && p.toLowerCase() === cleanCurrLower;
          });
          const rawId = matchedAgentDoc?.agentCustomerDocumentId ?? matchedAgentDoc?.id ?? null;
          if (rawId && Number.isInteger(Number(rawId)) && Number(rawId) > 0) {
            agentDocId = Number(rawId);
          }
        }

        const updatedItem = {
          id: `rej_${rej.backOfficeDocumentRejectionId || cleanCurr}`,
          agentCustomerDocumentId: agentDocId,
          rejectionId: rej.backOfficeDocumentRejectionId,
          canonicalCategory: cat,
          applicantSequence: 0,
          storageSource: isAgentPath ? 'AGENT_CUSTOMER_DOCUMENT' : 'REJECTION_HISTORY',
          documentTypeId: resolveRejectionDocumentTypeId(rej),
          documentTypeName: CANONICAL_CATEGORY_META[cat]?.name || (rej.rejectedDocumentType ? String(rej.rejectedDocumentType).replace(/_/g, ' ') : 'Updated Document'),
          fileName,
          filePath: cleanCurr,
          fileType: isPdf ? 'pdf' : 'image',
          previewUrl: null,
          versionLabel,
          versionDisplay: versionLabel,
          isOriginal: false,
          isLatest: true,
          isCurrent: Boolean(rej.status === 'Verified'),
          status: rej.status || 'Resubmitted',
          rejectionRemarks: rej.rejectionRemarks,
          createdAt: rej.resubmittedAt || rej.verifiedAt || rej.rejectedAt,
          isActive: true,
          error: null,
        };

        updatedDocsFromRej.push(updatedItem);
        downloadRejPromises.push(
          fetchCoAppDocBlobByPath(cleanCurr, fileName, agentDocId).then((blobRes) => {
            updatedItem.previewUrl = blobRes.url;
            updatedItem.fileType = blobRes.fileType || updatedItem.fileType;
            updatedItem.error = blobRes.error;
            updatedItem.isHistoricalUnavailable = blobRes.isHistoricalUnavailable;
          })
        );
      });

      // 6. Manual document (ZIP / Images) from documentPath
      const manualApplicantDocs = [];
      const allMainManualPaths = documentPaths(mainKycDocPath);
      if (allMainManualPaths.length > 0 && !agentCategoryMap.has('MANUAL')) {
        allMainManualPaths.forEach((manualPath, mIdx) => {
          const cleanM = normalizeDocPath(manualPath);
          if (cleanM) {
            const fileName = cleanM.split('/').pop() || (allMainManualPaths.length > 1 ? `Manual_Document_${mIdx + 1}` : 'manual_document');
            const ext = fileName.split('.').pop()?.toLowerCase();
            const isZip = ext === 'zip' || ext === 'rar' || ext === '7z';
            const isPdf = ext === 'pdf';

            const manualItem = {
              id: `main_manual_${mIdx}`,
              agentCustomerDocumentId: null,
              canonicalCategory: 'MANUAL',
              applicantSequence: 0,
              storageSource: 'APPLICATION_KYC_MANUAL',
              documentTypeId: null,
              documentTypeName: allMainManualPaths.length > 1 ? `Manual Document ${mIdx + 1}` : 'Manual Document (ZIP/Images)',
              documentTypeCode: 'APPLICANT_MANUAL',
              fileName,
              filePath: cleanM,
              fileType: isZip ? 'zip' : (isPdf ? 'pdf' : 'image'),
              previewUrl: null,
              versionLabel: 'Original Document',
              versionDisplay: 'Original Document',
              isOriginal: true,
              isLatest: true,
              isCurrent: true,
              createdAt: mainKycCreatedAt,
              isActive: true,
              error: null,
            };

            manualApplicantDocs.push(manualItem);
            if (!isZip) {
              downloadRejPromises.push(
                fetchCoAppDocBlobByPath(cleanM, fileName).then((blobRes) => {
                  manualItem.previewUrl = blobRes.url;
                  manualItem.fileType = blobRes.fileType || manualItem.fileType;
                  manualItem.error = blobRes.error;
                  manualItem.isHistoricalUnavailable = blobRes.isHistoricalUnavailable;
                })
              );
            }
          }
        });
      }

      // 7. Fallback: If any canonical category is missing from AgentCustomerDocument,
      // load from primary KYC row / financial tuple rows
      const financialRows = {};
      const typeIds = Object.fromEntries(KYC_CATEGORIES.map((category) =>
        [category.key, resolveDocumentTypeId(documentTypeOptions, category.name)]));

      if (productDetailsId) {
        await Promise.all(['salarySlip', 'bankStatement'].map(async (key) => {
          if (!typeIds[key]) return;
          try {
            const result = await rmCustomerService.getApplicantDocument(productDetailsId, 0, typeIds[key]);
            if (result) {
              financialRows[key] = result?.data ?? result?.value ?? result;
            }
          } catch {
            // Optional sequence-0 financial tuple lookup failure should not break modal loading
          }
        }));
      }

      const coveredCategories = new Set([
        ...uniqueAgentOriginals.map((d) => d.canonicalCategory),
        ...manualApplicantDocs.map((d) => d.canonicalCategory),
      ]);

      const missingCanonicalDocs = storedCategoryDocuments(mainKycRow, financialRows, typeIds)
        .map((doc) => {
          const cat = normalizeToCanonicalCategory(doc.documentTypeCode || doc.documentTypeName);
          const isIdentity = ['PROFILE', 'AADHAAR', 'PAN'].includes(cat);

          // If this category has a rejection history for the Main Applicant, use the immutable originalDocumentPath
          const matchingRejs = applicantRejections
            .filter((r) => normalizeToCanonicalCategory(r.rejectedDocumentType) === cat)
            .sort((a, b) => {
              const timeA = new Date(a.createdAt || 0).getTime();
              const timeB = new Date(b.createdAt || 0).getTime();
              if (timeA !== timeB) return timeA - timeB;
              return (Number(a.backOfficeDocumentRejectionId) || 0) - (Number(b.backOfficeDocumentRejectionId) || 0);
            });

          const firstRej =
            matchingRejs.find((r) => {
              const path = normalizeDocPath(r.originalDocumentPath);
              return Boolean(path);
            }) ||
            matchingRejs[0] ||
            null;
          const immutableOrigPath = firstRej?.originalDocumentPath ? normalizeDocPath(firstRej.originalDocumentPath) : null;
          const effectiveFilePath = immutableOrigPath || doc.filePath;
          const effectiveFileName = immutableOrigPath ? immutableOrigPath.split('/').pop() : doc.fileName;

          return {
            ...doc,
            agentCustomerDocumentId: null,
            canonicalCategory: cat,
            applicantSequence: 0,
            storageSource: isIdentity ? 'APPLICATION_KYC_IDENTITY' : 'APPLICATION_KYC_FINANCIAL',
            documentTypeName: CANONICAL_CATEGORY_META[cat]?.name || doc.documentTypeName,
            fileName: effectiveFileName,
            filePath: effectiveFilePath,
            isOriginal: true,
            versionLabel: 'Original Document',
            versionDisplay: 'Original Document',
            isLatest: !firstRej,
            isCurrent: !firstRej,
            status: firstRej?.status || 'Active',
            rejectionRemarks: firstRej?.rejectionRemarks || null,
            createdAt: firstRej?.createdAt || doc.createdAt,
            error: null,
          };
        })
        .filter((doc) => !coveredCategories.has(doc.canonicalCategory));

      await Promise.allSettled([
        ...downloadRejPromises,
        ...missingCanonicalDocs.map(async (doc) => {
          const preview = await fetchCoAppDocBlobByPath(doc.filePath, doc.fileName);
          doc.previewUrl = preview.url;
          doc.fileType = preview.fileType || (/\.pdf$/i.test(doc.fileName) ? 'pdf' : 'image');
          doc.error = preview.error;
          doc.isHistoricalUnavailable = preview.isHistoricalUnavailable;
        }),
      ]);

      const allApplicantDocs = [
        ...uniqueAgentOriginals,
        ...manualApplicantDocs,
        ...missingCanonicalDocs,
        ...updatedDocsFromRej,
      ];

      if (requestId === docsRequestRef.current) {
        setCustomerDocs(
          overlayPendingManualDocument(
            allApplicantDocs,
            form.applicant.identityDocumentRawFiles || [],
            (file) => {
              const url = URL.createObjectURL(file);
              modalBlobUrlsRef.current.push(url);
              return url;
            },
            'APPLICANT_MANUAL'
          )
        );
      }
    } catch (err) {
      console.error('Error in loadCustomerDocuments:', err);
      if (requestId === docsRequestRef.current) setDocsLoadError(err.message || 'Unable to load documents. The document service returned a server error.');
    } finally {
      if (requestId === docsRequestRef.current) setIsLoadingDocs(false);
    }
  }, [
    resolveAgentCustomerId,
    revokeModalBlobUrls,
    resolvedProductDetailsId,
    normalizeDocPath,
    fetchCoAppDocBlobByPath,
    resolveRejectionDocumentTypeId,
    form.applicant,
    kycRecordsList,
    mainApplicantKycResolution,
    documentTypeOptions,
  ]);

  // ── Load and Reconstruct Documents for Co-Applicant ──────────────────────
  const loadCoApplicantDocuments = useCallback(async (coAppIndex) => {
    const requestId = ++docsRequestRef.current;
    setIsLoadingDocs(true);
    setDocsLoadError('');
    revokeModalBlobUrls();
    setCustomerDocs([]);

    try {
      const coApp = form.coApplicants[coAppIndex];
      let kycId = coApp?.kycDocumentId || coApp?.applicationKYCDocumentId || null;

      if (!kycId) {
        const coSeq = coAppIndex + 1;
        const coSeqRow = (kycRecordsList || []).find((k) => {
          if (!k || k.isActive === false || k.IsActive === false) return false;
          if (isApplicantDocumentTuple(k)) return false;
          const rowProdId = Number(k.applicationProductDetailsId ?? k.ApplicationProductDetailsId);
          if (!Number.isFinite(rowProdId) || rowProdId !== Number(resolvedProductDetailsId)) return false;
          const rawSeq = k.applicantSequence ?? k.ApplicantSequence;
          if (rawSeq === undefined || rawSeq === null) return false;
          return Number(rawSeq) === coSeq;
        });
        kycId = coSeqRow?.applicationKYCDocumentId ?? coSeqRow?.ApplicationKYCDocumentId ?? null;
      }

      const token = localStorage.getItem('authToken');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // 1. Fetch current KYC record data to ensure latest paths
      let latestKyc = coApp || {};
      try {
        const kycRes = kycId ? await fetch(`${API_BASE}/ApplicationKYCDocuments/${kycId}`, { headers }) : null;
        if (kycRes?.ok) {
          const kycData = await kycRes.json();
          if (kycData) {
            const serverDocPath = kycData.documentPath || kycData.DocumentPath || null;
            const combinedDocPath = manualDocumentPath(serverDocPath);

            latestKyc = {
              ...coApp,
              ...kycData,
              aadharDocumentPath: kycData.aadharDocumentPath || kycData.AadharDocumentPath || coApp.aadharDocumentPath || null,
              panCardPath: kycData.panCardPath || kycData.PanCardPath || coApp.panCardPath || null,
              profileImagePath: kycData.profileImagePath || kycData.ProfileImagePath || coApp.profileImagePath || null,
              documentPath: combinedDocPath || null,
              createdAt: kycData.createdAt || kycData.CreatedAt || coApp.createdAt || null,
              modifiedAt: kycData.modifiedAt || kycData.ModifiedAt || coApp.modifiedAt || null,
            };
          }
        }
      } catch (e) {
        console.warn('Could not fetch fresh ApplicationKYCDocuments record:', e);
      }

      // 2. Fetch rejections for the application
      const productDetailsId =
        appData?.applicationProductDetailsId ||
        appData?.ApplicationProductDetailsId ||
        latestKyc?.applicationProductDetailsId ||
        resolvedProductDetailsId ||
        null;

      let allRejections = [];
      try {
        let rejUrl = `${API_BASE}/BackOfficeDocumentRejection`;
        if (productDetailsId) {
          rejUrl = `${API_BASE}/BackOfficeDocumentRejection/application/${productDetailsId}`;
        }
        const rejRes = await fetch(rejUrl, { headers });
        if (rejRes.ok) {
          const rejData = await rejRes.json();
          allRejections = Array.isArray(rejData) ? rejData : (rejData?.value || rejData?.data || []);
        } else if (productDetailsId) {
          const fallbackRes = await fetch(`${API_BASE}/BackOfficeDocumentRejection`, { headers });
          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            allRejections = Array.isArray(fallbackData) ? fallbackData : (fallbackData?.value || fallbackData?.data || []);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch document rejections:', err);
      }

      const normalizedAllRejections = allRejections.map(normalizeRejectionRecord).filter(Boolean);

      // Filter by target Co-Applicant sequence or KYC Document ID
      const coSeq = coAppIndex + 1;
      const targetCoAppKycId = Number(kycId || 0);
      const coRejections = normalizedAllRejections.filter((r) => {
        if (r.isActive === false || r.IsActive === false) return false;
        const matchesSeq = r.applicantSequence === coSeq;
        const matchesKyc = targetCoAppKycId > 0 && r.kycDocumentId === targetCoAppKycId;
        return matchesSeq || matchesKyc;
      });

      const persistedDocs = coApplicantPersistedDocs[coAppIndex] || {};

      // Fetch latest applicant-level documents for Salary Slip & Bank Statement if not in local persisted state
      let salarySlipPath = persistedDocs.salarySlip?.documentPath || null;
      let bankStatementPath = persistedDocs.bankStatement?.documentPath || null;

      if (productDetailsId && documentTypeOptions.length > 0) {
        const salarySlipTypeId = resolveDocumentTypeId(documentTypeOptions, 'Salary Slip');
        const bankStatementTypeId = resolveDocumentTypeId(documentTypeOptions, 'Bank Statement');
        const seq = coAppIndex + 1;

        if (salarySlipTypeId) {
          try {
            const res = await rmCustomerService.getApplicantDocument(productDetailsId, seq, salarySlipTypeId);
            const d = res?.data || res?.value || res;
            if (d?.documentPath || d?.DocumentPath) {
              salarySlipPath = d.documentPath || d.DocumentPath;
            }
          } catch {}
        }

        if (bankStatementTypeId) {
          try {
            const res = await rmCustomerService.getApplicantDocument(productDetailsId, seq, bankStatementTypeId);
            const d = res?.data || res?.value || res;
            if (d?.documentPath || d?.DocumentPath) {
              bankStatementPath = d.documentPath || d.DocumentPath;
            }
          } catch {}
        }
      }

      // 3. Define the 6 Canonical Categories
      const categories = [
        {
          code: 'CO_APPLICANT_PROFILE',
          canonicalCategory: 'PROFILE',
          name: 'Profile Image',
          activePath: latestKyc.profileImagePath,
          persistedKey: 'profile',
          defaultName: `CoApplicant_${coAppIndex + 1}_Profile.jpg`,
          storageSource: 'APPLICATION_KYC_IDENTITY',
        },
        {
          code: 'CO_APPLICANT_AADHAAR',
          canonicalCategory: 'AADHAAR',
          name: 'Aadhaar Document',
          activePath: latestKyc.aadharDocumentPath,
          persistedKey: 'aadhaar',
          defaultName: `CoApplicant_${coAppIndex + 1}_Aadhaar`,
          storageSource: 'APPLICATION_KYC_IDENTITY',
        },
        {
          code: 'CO_APPLICANT_PAN',
          canonicalCategory: 'PAN',
          name: 'PAN Card',
          activePath: latestKyc.panCardPath,
          persistedKey: 'pan',
          defaultName: `CoApplicant_${coAppIndex + 1}_PAN`,
          storageSource: 'APPLICATION_KYC_IDENTITY',
        },
        {
          code: 'CO_APPLICANT_SALARY_SLIP',
          canonicalCategory: 'SALARY_SLIP',
          name: 'Salary Slip / Income Sheet',
          activePath: salarySlipPath,
          persistedKey: 'salarySlip',
          defaultName: `CoApplicant_${coAppIndex + 1}_SalarySlip.pdf`,
          storageSource: 'APPLICATION_KYC_FINANCIAL',
        },
        {
          code: 'CO_APPLICANT_BANK_STATEMENT',
          canonicalCategory: 'BANK_STATEMENT',
          name: 'Bank Statement',
          activePath: bankStatementPath,
          persistedKey: 'bankStatement',
          defaultName: `CoApplicant_${coAppIndex + 1}_BankStatement.pdf`,
          storageSource: 'APPLICATION_KYC_FINANCIAL',
        },
      ];

      const reconstructedDocs = [];
      const downloadPromises = [];

      for (const cat of categories) {
        const catRejections = coRejections
          .filter((r) => normalizeToCanonicalCategory(r.rejectedDocumentType) === cat.canonicalCategory)
          .sort((a, b) => {
            const timeA = new Date(a.createdAt || 0).getTime();
            const timeB = new Date(b.createdAt || 0).getTime();
            if (timeA !== timeB) return timeA - timeB;
            return (Number(a.backOfficeDocumentRejectionId) || 0) - (Number(b.backOfficeDocumentRejectionId) || 0);
          });

        const seenPaths = new Set();
        const persisted = persistedDocs[cat.persistedKey];

        if (catRejections.length === 0) {
          // ── CASE A: NEVER REJECTED ──
          if (cat.activePath || (persisted && persisted.exists)) {
            const cleanPath = normalizeDocPath(cat.activePath);
            if (cleanPath) seenPaths.add(cleanPath.toLowerCase());

            const fileName =
              cleanPath ? cleanPath.split('/').pop() : (persisted?.fileName || cat.defaultName);
            const ext = fileName.split('.').pop()?.toLowerCase();
            const isPdf = ext === 'pdf' || persisted?.mimeType === 'application/pdf';

            const item = {
              id: `${kycId}_${cat.code}_orig`,
              agentCustomerDocumentId: null,
              kycDocumentId: kycId,
              canonicalCategory: cat.canonicalCategory,
              applicantSequence: coSeq,
              storageSource: cat.storageSource,
              documentTypeName: cat.name,
              documentTypeCode: cat.code,
              fileName,
              filePath: cleanPath || null,
              fileType: isPdf ? 'pdf' : 'image',
              previewUrl: null,
              versionLabel: 'Original Document',
              versionDisplay: 'Original Document',
              isOriginal: true,
              isLatest: true,
              isCurrent: true,
              status: 'Active',
              createdAt: latestKyc.createdAt,
              error: null,
            };

            reconstructedDocs.push(item);

            if (cleanPath) {
              downloadPromises.push(
                fetchCoAppDocBlobByPath(cleanPath, fileName).then((blobRes) => {
                  item.previewUrl = blobRes.url;
                  item.fileType = blobRes.fileType || item.fileType;
                  item.error = blobRes.error;
                  item.isHistoricalUnavailable = blobRes.isHistoricalUnavailable;
                })
              );
            }
          }
        } else {
          // ── CASE B: REJECTED ONE OR MORE TIMES ──
          const firstRej =
            catRejections.find((r) => {
              const path = normalizeDocPath(r.originalDocumentPath);
              return Boolean(path);
            }) ||
            catRejections[0] ||
            null;
          const origPathRaw = firstRej?.originalDocumentPath;
          const cleanOrig = normalizeDocPath(origPathRaw);

          if (cleanOrig) {
            seenPaths.add(cleanOrig.toLowerCase());
            const fileName = cleanOrig.split('/').pop() || `${cat.name}_Old`;
            const ext = fileName.split('.').pop()?.toLowerCase();
            const isPdf = ext === 'pdf';

            const origItem = {
              id: `${kycId}_${cat.code}_v1`,
              agentCustomerDocumentId: null,
              kycDocumentId: kycId,
              canonicalCategory: cat.canonicalCategory,
              applicantSequence: coSeq,
              storageSource: cat.storageSource,
              documentTypeName: cat.name,
              documentTypeCode: cat.code,
              fileName,
              filePath: cleanOrig,
              fileType: isPdf ? 'pdf' : 'image',
              previewUrl: null,
              versionLabel: 'Original Document',
              versionDisplay: 'Original Document',
              isOriginal: true,
              isLatest: false,
              isCurrent: false,
              status: firstRej?.status || 'ReturnedToRM',
              rejectionRemarks: firstRej?.rejectionRemarks,
              createdAt: firstRej?.createdAt || latestKyc.createdAt,
              error: null,
            };

            reconstructedDocs.push(origItem);
            downloadPromises.push(
              fetchCoAppDocBlobByPath(cleanOrig, fileName).then((blobRes) => {
                origItem.previewUrl = blobRes.url;
                origItem.fileType = blobRes.fileType || origItem.fileType;
                origItem.error = blobRes.error;
                origItem.isHistoricalUnavailable = blobRes.isHistoricalUnavailable;
              })
            );
          } else {
            // Legacy record where originalDocumentPath is null across ALL rejection records for this category
            const legacyItem = {
              id: `${kycId}_${cat.code}_legacy_orig`,
              agentCustomerDocumentId: null,
              kycDocumentId: kycId,
              canonicalCategory: cat.canonicalCategory,
              applicantSequence: coSeq,
              storageSource: cat.storageSource,
              documentTypeName: cat.name,
              documentTypeCode: cat.code,
              fileName: 'Prior Version',
              filePath: null,
              fileType: 'other',
              previewUrl: null,
              versionLabel: 'Original Document',
              versionDisplay: 'Original Document',
              isOriginal: true,
              isLatest: false,
              isCurrent: false,
              isLegacyFallback: true,
              status: firstRej?.status || 'ReturnedToRM',
              rejectionRemarks: firstRej?.rejectionRemarks,
              createdAt: firstRej?.createdAt || latestKyc.createdAt,
              error: null,
            };
            reconstructedDocs.push(legacyItem);
          }

          // Build Updated Versions (keep only latest authoritative updated rejection per category)
          const validRejs = catRejections.filter((r) => {
            const curr = normalizeDocPath(r.currentDocumentPath);
            const orig = normalizeDocPath(r.originalDocumentPath);
            return curr && (!orig || curr.toLowerCase() !== orig.toLowerCase());
          });

          const latestValidRej = validRejs.length > 0 ? validRejs[validRejs.length - 1] : null;
          if (latestValidRej) {
            const rej = latestValidRej;
            const cleanCurr = normalizeDocPath(rej.currentDocumentPath);
            const isLatest = true;
            const versionLabel = 'Latest Updated';
            const fileName = cleanCurr.split('/').pop() || cat.defaultName;
            const ext = fileName.split('.').pop()?.toLowerCase();
            const isPdf = ext === 'pdf';

            const updatedItem = {
              id: `${kycId}_${cat.code}_rej_${rej.backOfficeDocumentRejectionId || 'latest'}`,
              agentCustomerDocumentId: null,
              rejectionId: rej.backOfficeDocumentRejectionId,
              kycDocumentId: kycId,
              canonicalCategory: cat.canonicalCategory,
              applicantSequence: coSeq,
              storageSource: 'REJECTION_HISTORY',
              documentTypeName: cat.name,
              documentTypeCode: cat.code,
              fileName,
              filePath: cleanCurr,
              fileType: isPdf ? 'pdf' : 'image',
              previewUrl: null,
              versionLabel,
              versionDisplay: versionLabel,
              isOriginal: false,
              isLatest: true,
              isCurrent: Boolean(rej.status === 'Verified'),
              status: rej.status === 'ReturnedToRM' ? 'ReturnedToRM' : (rej.status || 'Resubmitted'),
              rejectionRemarks: rej.rejectionRemarks,
              createdAt: rej.createdAt,
              error: null,
            };

            reconstructedDocs.push(updatedItem);

            if (cleanCurr) {
              downloadPromises.push(
                fetchCoAppDocBlobByPath(cleanCurr, fileName).then((blobRes) => {
                  updatedItem.previewUrl = blobRes.url;
                  updatedItem.fileType = blobRes.fileType || updatedItem.fileType;
                  updatedItem.error = blobRes.error;
                  updatedItem.isHistoricalUnavailable = blobRes.isHistoricalUnavailable;
                })
              );
            }
          }
        }
      }

      // 4. Process Manual Documents (ZIP/Images) from documentPath
      if (latestKyc.documentPath) {
        const normSalary = normalizeDocPath(salarySlipPath)?.toLowerCase();
        const normBank = normalizeDocPath(bankStatementPath)?.toLowerCase();
        const allCoManualPaths = documentPaths(latestKyc.documentPath);

        allCoManualPaths.forEach((manualPath, mIdx) => {
          const cleanM = normalizeDocPath(manualPath);
          const cleanMLower = cleanM?.toLowerCase();

          if (cleanM && cleanMLower !== normSalary && cleanMLower !== normBank) {
            const fileName = cleanM.split('/').pop() || (allCoManualPaths.length > 1 ? `CoApplicant_${coAppIndex + 1}_Manual_${mIdx + 1}` : `CoApplicant_${coAppIndex + 1}_Manual`);
            const ext = fileName.split('.').pop()?.toLowerCase();
            const isZip = ext === 'zip' || ext === 'rar' || ext === '7z';
            const isPdf = ext === 'pdf';

            const manualItem = {
              id: `${kycId}_manual_${mIdx}`,
              agentCustomerDocumentId: null,
              kycDocumentId: kycId,
              canonicalCategory: 'MANUAL',
              applicantSequence: coSeq,
              storageSource: 'APPLICATION_KYC_MANUAL',
              documentTypeName: allCoManualPaths.length > 1 ? `Manual Document ${mIdx + 1}` : 'Manual Document (ZIP/Images)',
              documentTypeCode: 'CO_APPLICANT_MANUAL',
              fileName,
              filePath: cleanM,
              fileType: isZip ? 'zip' : (isPdf ? 'pdf' : 'image'),
              previewUrl: null,
              versionLabel: 'Original Document',
              versionDisplay: 'Original Document',
              isOriginal: true,
              isLatest: true,
              isCurrent: true,
              status: 'Active',
              createdAt: latestKyc.createdAt,
              error: null,
            };

            reconstructedDocs.push(manualItem);

            if (!isZip) {
              downloadPromises.push(
                fetchCoAppDocBlobByPath(cleanM, fileName).then((blobRes) => {
                  manualItem.previewUrl = blobRes.url;
                  manualItem.fileType = blobRes.fileType || manualItem.fileType;
                  manualItem.error = blobRes.error;
                  manualItem.isHistoricalUnavailable = blobRes.isHistoricalUnavailable;
                })
              );
            }
          }
        });
      }

      await Promise.allSettled(downloadPromises);
      if (requestId !== docsRequestRef.current) return;
      const visibleDocuments = overlayPendingDocuments(
        reconstructedDocs,
        coApplicantDocs[coAppIndex] || {},
        coApp?.identityDocumentRawFiles || [],
        (file) => {
          const url = URL.createObjectURL(file);
          modalBlobUrlsRef.current.push(url);
          return url;
        }
      );
      setCustomerDocs(visibleDocuments);
    } catch (err) {
      console.error('Error loading Co-Applicant documents:', err);
      if (requestId === docsRequestRef.current) setDocsLoadError(err.message || 'Unable to load Co-Applicant documents.');
    } finally {
      if (requestId === docsRequestRef.current) setIsLoadingDocs(false);
    }
  }, [
    form.coApplicants,
    kycRecordsList,
    appData,
    coApplicantPersistedDocs,
    coApplicantDocs,
    documentTypeOptions,
    resolvedProductDetailsId,
    normalizeDocPath,
    fetchCoAppDocBlobByPath,
    revokeModalBlobUrls,
  ]);

  // Open modal handler
  const handleOpenDocsModal = (target) => {
    setViewingDocsFor(target);
    setActiveDocsTab('original');
    if (target === 'applicant') {
      loadCustomerDocuments();
    } else if (typeof target === 'number') {
      loadCoApplicantDocuments(target);
    }
  };

  // Close modal handler
  const handleCloseDocsModal = () => {
    docsRequestRef.current += 1;
    setViewingDocsFor(null);
    setSelectedPreviewDoc(null);
    setActiveDocsTab('original');
    revokeModalBlobUrls();
    setCustomerDocs([]);
  };

  const updatePerson = (type, field, value, index = null) => {
    setForm((prev) => {
      if (type === 'applicant') {
        return { ...prev, applicant: typeof value === 'function' ? value(prev.applicant) : { ...prev.applicant, [field]: value } };
      } else {
        const newCo = [...prev.coApplicants];
        newCo[index] = typeof value === 'function' ? value(newCo[index]) : { ...newCo[index], [field]: value };
        return { ...prev, coApplicants: newCo };
      }
    });
    const prefix = `${type}${index !== null ? `.${index}` : ''}`;
    setErrors((prev) => {
      const newE = { ...prev };
      delete newE[`${prefix}.${field}`];
      if (field === 'numberOfDocuments' || field === 'identityDocumentRawFiles') {
        delete newE[`${prefix}.manualDocuments`];
        delete newE[`${prefix}.identityDocumentFiles`];
        delete newE[`${prefix}.numberOfDocuments`];
      }
      return newE;
    });
  };

  const handleReplacePersistedManualSlot = async (personType, personIndex, slotIdx, file) => {
    const person = personType === 'applicant' ? form.applicant : form.coApplicants[personIndex];
    const kycId = person?.kycDocumentId;
    if (!kycId) {
      updatePerson(personType, 'identityDocumentRawFiles', (current) => {
        const raw = Array.isArray(current.identityDocumentRawFiles) ? [...current.identityDocumentRawFiles] : [];
        raw[slotIdx] = file;
        return { ...current, identityDocumentRawFiles: raw };
      }, personIndex);
      return;
    }

    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    const authHeaders = {};
    if (token) authHeaders['Authorization'] = `Bearer ${token}`;

    const formData = new FormData();
    formData.append('file', file);

    const replaceUrl = `${API_BASE}/ApplicationKYCDocuments/${kycId}/manual/${slotIdx}`;
    const res = await fetch(replaceUrl, {
      method: 'PUT',
      headers: authHeaders,
      body: formData,
    });

    if (!res.ok) {
      const errTxt = await res.text().catch(() => '');
      throw new Error(`Failed to replace Manual Document ${slotIdx + 1} (${res.status}): ${errTxt || res.statusText}`);
    }

    // Re-fetch Primary KYC row to refresh DocumentPath while preserving NumberOfDocuments
    const getRes = await fetch(`${API_BASE}/ApplicationKYCDocuments/${kycId}`, { headers: authHeaders });
    if (getRes.ok) {
      const updatedRow = await getRes.json();
      const newDocPath = updatedRow.documentPath ?? updatedRow.DocumentPath ?? null;
      const preservedNumDocs = updatedRow.numberOfDocuments ?? updatedRow.NumberOfDocuments ?? person.numberOfDocuments;

      updatePerson(personType, 'documentPath', newDocPath, personIndex);
      updatePerson(personType, 'numberOfDocuments', preservedNumDocs, personIndex);
      updatePerson(personType, 'identityDocumentRawFiles', (current) => {
        const raw = Array.isArray(current.identityDocumentRawFiles) ? [...current.identityDocumentRawFiles] : [];
        raw[slotIdx] = null;
        return { ...current, identityDocumentRawFiles: raw, documentPath: newDocPath, numberOfDocuments: preservedNumDocs };
      }, personIndex);

      setDraftSection('kycDocuments', (prev) => {
        const next = { ...prev };
        if (personType === 'applicant') {
          next.applicant = { ...next.applicant, documentPath: newDocPath, numberOfDocuments: preservedNumDocs };
        } else if (Array.isArray(next.coApplicants)) {
          next.coApplicants = next.coApplicants.map((co, i) => i === personIndex ? { ...co, documentPath: newDocPath, numberOfDocuments: preservedNumDocs } : co);
        }
        return next;
      });
    }
  };

  const handleContinue = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    try {
      await saveKycDocuments();
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const saveKycDocuments = async () => {
    if (!kycRecordsLoaded) {
      setErrorPopup({ title: 'KYC documents are not loaded',
        message: 'Please wait for existing documents to load before saving. If loading failed, refresh and try again.',
        variant: 'error' });
      return;
    }
    let currentErrors = {};
    const appErrs = validateKyc(form.applicant);
    if (Object.keys(appErrs).length > 0) {
      Object.entries(appErrs).forEach(([k, v]) => (currentErrors[`applicant.${k}`] = v));
    }

    // Main Applicant identity document availability, evaluated against real backend
    // sources only: canonical ApplicationKYCDocuments path, hydrated server file, or a
    // matching AgentCustomerDocument record.
    //
    // These documents have no card or file chooser on this screen (they are reviewed via
    // "Attached Documents"), so a missing one is reported below as a named, actionable
    // message rather than as a field-level error on a control that does not exist.
    const missingAgentIdentityDocs = [
      {
        label: 'Profile Image',
        present: Boolean(
          form.applicant.profileImagePath ||
          applicantPersistedDocs.profile?.exists ||
          agentSourceDocs.profile
        ),
      },
      {
        label: 'Aadhaar',
        present: Boolean(
          form.applicant.aadharDocumentPath ||
          applicantPersistedDocs.aadhaar?.exists ||
          agentSourceDocs.aadhaar
        ),
      },
      {
        label: 'PAN Card',
        present: Boolean(
          form.applicant.panCardPath ||
          applicantPersistedDocs.pan?.exists ||
          agentSourceDocs.pan
        ),
      },
    ]
      .filter((doc) => !doc.present)
      .map((doc) => doc.label);

    form.coApplicants.forEach((co, i) => {
      const coErrs = validateKyc(co);
      if (Object.keys(coErrs).length > 0) {
        Object.entries(coErrs).forEach(([k, v]) => (currentErrors[`coApplicants.${i}.${k}`] = v));
      }
    });
    if (Object.keys(currentErrors).length > 0) {
      setErrors(currentErrors);
      setErrorPopup({
        title: 'Validation Error',
        message: 'Please fill all required KYC fields and upload required documents before continuing.',
        variant: 'validation',
      });
      return;
    }

    // Identity documents are supplied by the Agent and cannot be uploaded from this
    // screen, so the message names exactly what is missing and where it must come from.
    if (missingAgentIdentityDocs.length > 0) {
      setErrorPopup({
        title: 'Agent documents missing',
        message:
          `The Main Applicant ${missingAgentIdentityDocs.join(', ')} ` +
          `${missingAgentIdentityDocs.length > 1 ? 'documents have' : 'document has'} not been uploaded by the Agent. ` +
          'These are reviewed under "Attached Documents" and cannot be uploaded from this screen. ' +
          'Please ask the Agent to upload them before continuing.',
        variant: 'validation',
      });
      return;
    }

    // Verification/DocumentType IDs are resolved strictly from loaded master data.
    // If the masters are unavailable there is nothing valid to resolve against, so
    // block here with an accurate message instead of failing later as "invalid status".
    if (!Array.isArray(verificationOptions) || verificationOptions.length === 0) {
      setErrorPopup({
        title: 'Master data unavailable',
        message:
          'Verification Master could not be loaded. Please refresh the page and try again before saving KYC documents.',
        variant: 'error',
      });
      return;
    }

    // Live application id only. `appData.id` is deliberately NOT accepted as a fallback:
    // it is the route/customer identifier and must never stand in for an
    // ApplicationProductDetailsId.
    const applicationProductDetailsId = resolvedProductDetailsId;

    if (!applicationProductDetailsId || isNaN(Number(applicationProductDetailsId))) {
      setErrorPopup({
        title: 'Missing application details',
        message: 'Application product details are not saved yet. Please go back and save Application Details first.',
        variant: 'validation',
      });
      return;
    }

    // Deterministic data-integrity gate: more than one active sequence-0 KYC row for this
    // application is ambiguous. Silently picking one would write identity files to a row
    // Back Office may not read, so the save is blocked instead.
    // The Main Applicant row cannot be identified because the KYC list does not carry
    // applicantSequence. Creating a row here would duplicate an existing one.
    if (mainApplicantKycResolution.sequenceFieldMissing) {
      setErrorPopup({
        title: 'Cannot identify Main Applicant KYC record',
        message:
          'The KYC records returned for this application do not include an applicant sequence, ' +
          'so the Main Applicant record cannot be identified reliably. Saving has been stopped to ' +
          'avoid creating a duplicate KYC record. Please report this to support.',
        variant: 'error',
      });
      return;
    }

    if (mainApplicantKycResolution.ambiguous) {
      const duplicateIds = mainApplicantKycResolution.rows
        .map((r) => r.applicationKYCDocumentId ?? r.ApplicationKYCDocumentId)
        .filter(Boolean)
        .join(', ');
      setErrorPopup({
        title: 'KYC data inconsistency',
        message:
          `This application has ${mainApplicantKycResolution.rows.length} active Main Applicant (sequence 0) KYC records` +
          `${duplicateIds ? ` (IDs: ${duplicateIds})` : ''}. ` +
          'Exactly one is required. Please have this corrected before saving KYC documents.',
        variant: 'error',
      });
      return;
    }

    const savedSection = appData.kycDocuments || {};
    const allPersons = [
      {
        ...form.applicant,
        personType: 'applicant',
        index: null,
        // Main Applicant identity comes exclusively from the live sequence-0 KYC row.
        // No draft/localStorage id precedence and no positional kycRecordsList[0] guess:
        // a wrong row here silently writes identity files to another applicant's record.
        kycDocumentId: mainApplicantKycResolution.id,
        aadharDocumentPath:
          mainApplicantKycResolution.row?.aadharDocumentPath ??
          mainApplicantKycResolution.row?.AadharDocumentPath ??
          null,
        panCardPath:
          mainApplicantKycResolution.row?.panCardPath ??
          mainApplicantKycResolution.row?.PanCardPath ??
          null,
        profileImagePath:
          mainApplicantKycResolution.row?.profileImagePath ??
          mainApplicantKycResolution.row?.ProfileImagePath ??
          null,
      },
      ...form.coApplicants.map((co, i) => {
        const coSeq = i + 1;
        const coRow = (kycRecordsList || []).find((k) => {
          if (!k || k.isActive === false || k.IsActive === false) return false;
          if (isApplicantDocumentTuple(k)) return false;
          const rowProdId = Number(k.applicationProductDetailsId ?? k.ApplicationProductDetailsId);
          if (!Number.isFinite(rowProdId) || rowProdId !== Number(applicationProductDetailsId)) return false;
          const rawSeq = k.applicantSequence ?? k.ApplicantSequence;
          if (rawSeq === undefined || rawSeq === null) return false;
          return Number(rawSeq) === coSeq;
        });

        const resolvedCoKycId =
          (coRow ? Number(coRow.applicationKYCDocumentId ?? coRow.ApplicationKYCDocumentId) : null) ||
          co.kycDocumentId ||
          co.applicationKYCDocumentId ||
          savedSection?.coApplicants?.[i]?.kycDocumentId ||
          savedSection?.coApplicants?.[i]?.applicationKYCDocumentId ||
          null;

        return {
          ...co,
          personType: 'coApplicants',
          index: i,
          kycDocumentId: resolvedCoKycId,
          aadharDocumentPath:
            coRow?.aadharDocumentPath ??
            coRow?.AadharDocumentPath ??
            null,
          panCardPath:
            coRow?.panCardPath ??
            coRow?.PanCardPath ??
            null,
          profileImagePath:
            coRow?.profileImagePath ??
            coRow?.ProfileImagePath ??
            null,
        };
      }),
    ];

    try {
      const token = localStorage.getItem('authToken');
      const authHeaders = {};
      if (token) {
        authHeaders['Authorization'] = `Bearer ${token}`;
      }

      for (const person of allPersons) {
        const resolvedVerificationId = resolveVerificationId(person.verificationStatus);
        if (!resolvedVerificationId) {
          setErrorPopup({
            title: 'Verification status required',
            message: 'Please select a valid verification status.',
            variant: 'validation',
          });
          return;
        }

        const isUpdate = !!person.kycDocumentId;
        const url = isUpdate
          ? `${API_BASE}/ApplicationKYCDocuments/${person.kycDocumentId}`
          : `${API_BASE}/ApplicationKYCDocuments`;

        // A previous attempt may have saved identity uploads before a later file failed.
        // Read their current paths before PUT so retrying cannot clear those uploads.
        if (isUpdate) {
          const latestResponse = await fetch(url, { headers: authHeaders });
          if (!latestResponse.ok) throw new Error('Could not load current KYC documents before saving. Please retry.');
          const latest = await latestResponse.json();
          person.aadharDocumentPath = latest.aadharDocumentPath ?? latest.AadharDocumentPath ?? null;
          person.panCardPath = latest.panCardPath ?? latest.PanCardPath ?? null;
          person.profileImagePath = latest.profileImagePath ?? latest.ProfileImagePath ?? null;
        }

        const numDocs = Number(person.numberOfDocuments) >= 0 ? Number(person.numberOfDocuments) : 0;
        const safeDocumentPath = documentPaths(person.documentPath).join(',') || null;
        person.documentPath = safeDocumentPath;

        const payload = {
          ApplicationProductDetailsId: Number(applicationProductDetailsId),
          ApplicantSequence: person.personType === 'applicant' ? 0 : (person.index + 1),
          AadhaarLastFourDigits: person.aadhaarLast4 || null,
          PANCardNo: person.panCardNo || null,
          DocumentNumber: person.identityDocumentNo || null,
          VerificationId: resolvedVerificationId,
          DocumentTypeId: person.identityDocumentType ? Number(person.identityDocumentType) : null,
          DocumentPath: safeDocumentPath,
          AadharDocumentPath: person.aadharDocumentPath || null,
          PanCardPath: person.panCardPath || null,
          ProfileImagePath: person.profileImagePath || null,
          numberOfDocuments: numDocs,
          CreatedBy: 1,
        };
        if (isUpdate) {
          payload.ApplicationKYCDocumentId = Number(person.kycDocumentId);
        }

        console.log(`Saving KYC [${isUpdate ? 'PUT' : 'POST'}]:`, payload);

        const response = await fetch(url, {
          method: isUpdate ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const parsed = parseApiErrorBody(errData, 'Unable to save KYC documents. Please check the form and try again.');
          setErrorPopup({
            title: 'Could not save KYC',
            message: parsed.message,
            details: parsed.items,
            variant: parsed.variant,
          });
          return;
        }

        let savedData = {};
        if (response.status !== 204) {
          const text = await response.text();
          if (text) {
            try {
              savedData = JSON.parse(text);
            } catch {
              /* ignore */
            }
          }
        }
        // The id returned by the create/update call is authoritative for the rest of this
        // Save & Continue cycle. On PUT the server may return 204/no body, in which case
        // the row we just updated (resolved live by sequence) is the correct id.
        const savedId =
          (typeof savedData === 'number' ? savedData : null) ||
          savedData.applicationKYCDocumentId ||
          savedData.ApplicationKYCDocumentId ||
          savedData.id ||
          savedData.Id ||
          savedData?.data?.applicationKYCDocumentId ||
          savedData?.data?.id ||
          (isUpdate ? person.kycDocumentId : null);

        if (savedId) {
          person.kycDocumentId = savedId;
          person.applicationKYCDocumentId = savedId;
        }

        // A newly created row that returns no usable id cannot be targeted for identity
        // uploads. Continuing would upload against `undefined` or an unrelated row.
        if (!person.kycDocumentId) {
          setErrorPopup({
            title: 'KYC record id unavailable',
            message:
              `The KYC record for ${
                person.personType === 'applicant' ? 'the Main Applicant' : `Co-Applicant ${person.index + 1}`
              } was saved but the server did not return its identifier, so documents cannot be attached to it. Please retry.`,
            variant: 'error',
          });
          return;
        }

        // Record progress after every commit so a later failure can be retried.
        const rememberPerson = (current) => {
          Object.assign(person, current);
          setForm((prev) => person.personType === 'applicant'
            ? { ...prev, applicant: { ...prev.applicant, ...current } }
            : { ...prev, coApplicants: prev.coApplicants.map((co, index) => index === person.index ? { ...co, ...current } : co) });
          setKycRecordsList((prev) => {
            const row = { ...payload, applicationKYCDocumentId: person.kycDocumentId,
              documentPath: person.documentPath,
              numberOfDocuments: person.numberOfDocuments,
              aadharDocumentPath: person.aadharDocumentPath,
              panCardPath: person.panCardPath, profileImagePath: person.profileImagePath };
            return [...prev.filter((record) => Number(record.applicationKYCDocumentId ?? record.ApplicationKYCDocumentId) !== Number(person.kycDocumentId)), row];
          });
        };
        rememberPerson(person);
        const recordUrl = API_BASE + '/ApplicationKYCDocuments/' + person.kycDocumentId;
        const readRecord = async () => {
          const result = await fetch(recordUrl, { headers: authHeaders });
          if (!result.ok) throw new Error('Could not verify saved KYC documents. Please retry.');
          return result.json();
        };
        await persistManualUploads({
          person,
          upload: async (body) => {
            const result = await fetch(recordUrl + '/upload', { method: 'POST', headers: authHeaders, body });
            if (!result.ok) throw new Error('A document upload failed. Your file is still selected; please retry.');
            return result.status === 204 ? null : result.json().catch(() => null);
          },
          read: readRecord,
          onCommitted: rememberPerson,
        });

        // Step 2a: Identity documents (Profile Image, Aadhaar, PAN) promotion/upload across all applicant sequences
        // Priority:
        // 1. RM explicitly selected fresh File -> use RM File
        // 2. Existing canonical ApplicationKYCDocuments path exists -> preserve existing
        // 3. Matching real AgentCustomerDocument for this sequence exists -> download actual bytes and promote
        // 4. Neither exists -> skip (validation already checked required docs)
        const isApplicant = person.personType === 'applicant';
        const personSeq = isApplicant ? 0 : (person.index + 1);
        const personLabel = isApplicant ? 'Main Applicant' : `Co-Applicant ${person.index + 1}`;
        const coIdx = person.index;

        if (person.kycDocumentId) {
          const identityDocTypes = [
            { key: 'profile', route: 'profile-image', canonicalField: 'profileImagePath', targetName: 'Profile Image' },
            { key: 'aadhaar', route: 'aadhar', canonicalField: 'aadharDocumentPath', targetName: 'Aadhaar' },
            { key: 'pan', route: 'pan', canonicalField: 'panCardPath', targetName: 'PAN Card' },
          ];
          let anyIdentityFileUploaded = false;

          for (const { key, route, canonicalField, targetName } of identityDocTypes) {
            let effectiveFile = isApplicant ? applicantDocs[key] : (coApplicantDocs[coIdx]?.[key] || null);
            const canonicalPath = person[canonicalField];
            const hasCanonicalPath = Boolean(
              canonicalPath &&
              typeof canonicalPath === 'string' &&
              canonicalPath.trim() !== ''
            );
            const persistedDoc = isApplicant ? applicantPersistedDocs[key] : (coApplicantPersistedDocs[coIdx]?.[key] || null);
            const agentDoc = isApplicant ? (agentSourceDocs[key] || agentSourceDocs[0]?.[key]) : agentSourceDocs[personSeq]?.[key];

            // Priority 1: RM explicitly selected fresh File
            if (effectiveFile instanceof File) {
              // use effectiveFile
            }
            // Priority 2: Canonical KYC file already exists on server -> preserve existing
            else if (hasCanonicalPath) {
              continue;
            }
            // Priority 3: Matching Agent document exists for this specific applicant sequence -> promote actual Agent file
            else if (agentDoc) {
              const docId = agentDoc.agentCustomerDocumentId || agentDoc.id;
              try {
                const dlHeaders = {};
                if (token) dlHeaders['Authorization'] = `Bearer ${token}`;
                const dlRes = await fetch(`${API_BASE}/AgentCustomerDocument/download/${docId}`, { headers: dlHeaders });
                if (!dlRes.ok) {
                  throw new Error(`Failed to download Agent ${targetName} document (HTTP ${dlRes.status})`);
                }
                const rawBlob = await dlRes.blob();
                if (!rawBlob || rawBlob.size === 0) {
                  throw new Error(`Agent ${targetName} document file is empty`);
                }
                const fileName = agentDoc.fileName || `${key}_doc`;
                const ext = fileName.split('.').pop()?.toLowerCase();
                let mimeType = rawBlob.type || 'application/octet-stream';
                if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
                else if (ext === 'png') mimeType = 'image/png';
                else if (ext === 'pdf') mimeType = 'application/pdf';

                effectiveFile = new File([rawBlob], fileName, { type: mimeType });
              } catch (dlErr) {
                setErrorPopup({
                  title: 'Agent Document Transfer Failed',
                  message: dlErr.message || `Failed to download Agent ${targetName} document for ${personLabel} from server.`,
                  variant: 'error',
                });
                return; // Stop navigation on failure!
              }
            }

            if (!(effectiveFile instanceof File)) continue;

            anyIdentityFileUploaded = true;
            const isReplacement = hasCanonicalPath;
            const uploadMethod = isReplacement ? 'PUT' : 'POST';
            const uploadUrl = `${API_BASE}/ApplicationKYCDocuments/${person.kycDocumentId}/${route}`;
            const formData = new FormData();
            formData.append('file', effectiveFile);

            const uploadHeaders = {};
            if (token) uploadHeaders['Authorization'] = `Bearer ${token}`;

            let uploadResponse = await fetch(uploadUrl, {
              method: uploadMethod,
              headers: uploadHeaders,
              body: formData,
            });

            // Fallback retry if method mismatch
            if (!uploadResponse.ok && [400, 404, 405, 409].includes(uploadResponse.status)) {
              const fallbackMethod = uploadMethod === 'POST' ? 'PUT' : 'POST';
              uploadResponse = await fetch(uploadUrl, {
                method: fallbackMethod,
                headers: uploadHeaders,
                body: formData,
              });
            }

            if (!uploadResponse.ok) {
              const uploadErrText = await uploadResponse.text().catch(() => '');
              let errorBody = {};
              try {
                errorBody = uploadErrText ? JSON.parse(uploadErrText) : {};
              } catch {
                errorBody = { message: uploadErrText };
              }
              const parsed = parseApiErrorBody(
                errorBody,
                `${personLabel} ${targetName} upload failed with HTTP ${uploadResponse.status}.`
              );
              setErrorPopup({
                title: 'Identity Document Upload Failed',
                message: parsed.message || uploadErrText || `${personLabel} ${targetName} upload failed with HTTP ${uploadResponse.status}.`,
                details: parsed.items,
                variant: parsed.variant || 'error',
              });
              return;
            }

            // ── Live persistence verification ──────────────────────────────
            let verifiedRow = null;
            try {
              const verifyRes = await fetch(`${API_BASE}/ApplicationKYCDocuments/${person.kycDocumentId}`, {
                headers: authHeaders,
              });
              if (!verifyRes.ok) {
                throw new Error(`KYC record could not be re-read (HTTP ${verifyRes.status}).`);
              }
              verifiedRow = await verifyRes.json();
            } catch (verifyErr) {
              setErrorPopup({
                title: 'Document Persistence Not Confirmed',
                message:
                  `${personLabel} ${targetName} was uploaded but the saved KYC record could not be re-read to confirm it. ` +
                  `${verifyErr.message || ''}`.trim(),
                variant: 'error',
              });
              return;
            }

            let verifiedPath = readCanonicalIdentityPath(verifiedRow, key);
            if (!verifiedPath) {
              // Try fallback patch if upload response body carried path
              const uploadBody = await uploadResponse.clone().json().catch(() => ({}));
              const fallbackPath =
                uploadBody?.documentPath ||
                uploadBody?.DocumentPath ||
                uploadBody?.filePath ||
                uploadBody?.FilePath ||
                uploadBody?.path ||
                uploadBody?.url ||
                (key === 'profile' ? (uploadBody?.profileImagePath || uploadBody?.ProfileImagePath) : key === 'aadhaar' ? (uploadBody?.aadharDocumentPath || uploadBody?.AadharDocumentPath) : (uploadBody?.panCardPath || uploadBody?.PanCardPath)) ||
                null;

              if (fallbackPath) {
                try {
                  const patchPayload = {
                    ...payload,
                    ApplicationKYCDocumentId: Number(person.kycDocumentId),
                    [key === 'profile' ? 'ProfileImagePath' : key === 'aadhaar' ? 'AadharDocumentPath' : 'PanCardPath']: fallbackPath,
                  };
                  const patchRes = await fetch(`${API_BASE}/ApplicationKYCDocuments/${person.kycDocumentId}`, {
                    method: 'PUT',
                    headers: { ...authHeaders, 'Content-Type': 'application/json' },
                    body: JSON.stringify(patchPayload),
                  });
                  if (patchRes.ok) {
                    const recheck = await fetch(`${API_BASE}/ApplicationKYCDocuments/${person.kycDocumentId}`, { headers: authHeaders });
                    if (recheck.ok) {
                      const recheckData = await recheck.json();
                      verifiedPath = readCanonicalIdentityPath(recheckData, key);
                    }
                  }
                } catch {
                  // ignore
                }
              }
            }

            if (!verifiedPath) {
              setErrorPopup({
                title: 'Document Not Saved',
                message:
                  `${personLabel} ${targetName} upload returned success, but the KYC record (ID ${person.kycDocumentId}) ` +
                  `still has no stored ${key === 'profile' ? 'ProfileImagePath' : key === 'aadhaar' ? 'AadharDocumentPath' : 'PanCardPath'}. ` +
                  'The file was not persisted, so Back Office would show it as Not Uploaded. Save has been stopped.',
                variant: 'error',
              });
              return;
            }

            // Reflect the verified backend value into the working record.
            if (key === 'profile') person.profileImagePath = verifiedPath;
            else if (key === 'aadhaar') person.aadharDocumentPath = verifiedPath;
            else if (key === 'pan') person.panCardPath = verifiedPath;

            rememberPerson(person);

            // Preview refresh only after persistence is confirmed.
            try {
              const getDocRes = await fetch(`${API_BASE}/ApplicationKYCDocuments/${person.kycDocumentId}/${route}`, {
                headers: uploadHeaders,
              });
              if (getDocRes.ok) {
                const blob = await getDocRes.blob();
                if (blob && blob.size > 0) {
                  const blobUrl = URL.createObjectURL(blob);
                  activeBlobUrlsRef.current.push(blobUrl);
                  if (isApplicant) {
                    setApplicantPersistedDocs((prev) => ({
                      ...prev,
                      [key]: {
                        exists: true,
                        fileName: effectiveFile.name,
                        blobUrl,
                        mimeType: blob.type || effectiveFile.type,
                        size: blob.size || effectiveFile.size,
                        documentPath: verifiedPath,
                      },
                    }));
                  } else {
                    setCoApplicantPersistedDocs((prev) =>
                      updateApplicantSlot(prev, coIdx, key, {
                        exists: true,
                        fileName: effectiveFile.name,
                        blobUrl,
                        mimeType: blob.type || effectiveFile.type,
                        size: blob.size || effectiveFile.size,
                        documentPath: verifiedPath,
                      })
                    );
                  }
                }
              }
            } catch (getErr) {
              console.warn(`Failed to refresh ${personLabel} ${key} preview after upload:`, getErr);
            }

            if (isApplicant) {
              setApplicantDocs((prev) => ({ ...prev, [key]: null }));
            } else {
              setCoApplicantDocs((prev) => clearUploadedSlot(prev, coIdx, key, effectiveFile));
            }
          }

          if (anyIdentityFileUploaded) {
            const refreshedKycResponse = await fetch(
              `${API_BASE}/ApplicationKYCDocuments/${person.kycDocumentId}`,
              { headers: authHeaders }
            );
            if (refreshedKycResponse.ok) {
              const latestKyc = await refreshedKycResponse.json();
              person.aadharDocumentPath =
                readCanonicalIdentityPath(latestKyc, 'aadhaar') || person.aadharDocumentPath || null;
              person.panCardPath =
                readCanonicalIdentityPath(latestKyc, 'pan') || person.panCardPath || null;
              person.profileImagePath =
                readCanonicalIdentityPath(latestKyc, 'profile') || person.profileImagePath || null;
              rememberPerson(person);
            }
          }

          // Step 2b: Financial Documents (Salary Slip / Bank Statement)
          const financialDocTypes = [
            { key: 'salarySlip', targetName: 'Salary Slip' },
            { key: 'bankStatement', targetName: 'Bank Statement' },
          ];

          const currentRm = getCurrentRMContext();
          const currentUser = (() => {
            try {
              return JSON.parse(localStorage.getItem('sivels_currentUser') || '{}');
            } catch {
              return {};
            }
          })();
          const uploadedBy =
            currentRm?.rmId ||
            currentUser?.userId ||
            currentUser?.id ||
            currentUser?.rmId ||
            Number(localStorage.getItem('userId')) ||
            Number(localStorage.getItem('rmId')) ||
            null;

          for (const { key, targetName } of financialDocTypes) {
            const docTypeId = resolveDocumentTypeId(documentTypeOptions, targetName);
            if (!docTypeId) continue;

            let effectiveFile = isApplicant ? applicantDocs[key] : (coApplicantDocs[coIdx]?.[key] || null);

            // Check if application-level tuple already exists
            let existingTuple = null;
            try {
              const checkRes = await fetch(
                `${API_BASE}/ApplicationKYCDocuments/applicant-document?applicationProductDetailsId=${applicationProductDetailsId}&applicantSequence=${personSeq}&documentTypeId=${docTypeId}`,
                { headers: authHeaders }
              );
              if (checkRes.ok) {
                existingTuple = await checkRes.json();
              }
            } catch {
              // ignore
            }

            const hasTuple =
              isApplicantDocumentTuple(existingTuple) &&
              Boolean(existingTuple?.documentPath || existingTuple?.DocumentPath);

            // Priority 1: RM selected fresh File
            if (effectiveFile instanceof File) {
              // proceed to upload
            }
            // Priority 2: Already exists in application tuple
            else if (hasTuple) {
              continue;
            }
            // Priority 3: Matching Agent document exists -> promote
            else {
              const agentDoc = isApplicant ? (agentSourceDocs[key] || agentSourceDocs[0]?.[key]) : agentSourceDocs[personSeq]?.[key];
              if (agentDoc) {
                const docId = agentDoc.agentCustomerDocumentId || agentDoc.id;
                try {
                  const dlHeaders = {};
                  if (token) dlHeaders['Authorization'] = `Bearer ${token}`;
                  const dlRes = await fetch(`${API_BASE}/AgentCustomerDocument/download/${docId}`, { headers: dlHeaders });
                  if (!dlRes.ok) throw new Error(`Failed to download Agent ${targetName} document (HTTP ${dlRes.status})`);
                  const rawBlob = await dlRes.blob();
                  if (!rawBlob || rawBlob.size === 0) throw new Error(`Agent ${targetName} document file is empty`);
                  const fileName = agentDoc.fileName || `${key}_doc`;
                  const ext = fileName.split('.').pop()?.toLowerCase();
                  let mimeType = rawBlob.type || 'application/octet-stream';
                  if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
                  else if (ext === 'png') mimeType = 'image/png';
                  else if (ext === 'pdf') mimeType = 'application/pdf';

                  effectiveFile = new File([rawBlob], fileName, { type: mimeType });
                } catch (dlErr) {
                  setErrorPopup({
                    title: 'Agent Document Transfer Failed',
                    message: dlErr.message || `Failed to download Agent ${targetName} document for ${personLabel} from server.`,
                    variant: 'error',
                  });
                  return;
                }
              }
            }

            if (!(effectiveFile instanceof File)) continue;

            const rawVerificationValue =
              person.verificationId ||
              person.VerificationId ||
              person.verificationStatus ||
              null;
            const resolvedFinVerificationId = resolveVerificationId(rawVerificationValue) || resolvedVerificationId;

            if (!resolvedFinVerificationId) {
              setErrorPopup({
                title: 'Verification Status Required',
                message: `Verification Status must be selected for ${personLabel} before uploading financial documents.`,
                variant: 'validation',
              });
              return;
            }

            const uploadUrl = `${API_BASE}/ApplicationKYCDocuments/applicant-document/upload`;
            const formData = new FormData();
            formData.append('file', effectiveFile);
            formData.append('applicationProductDetailsId', String(applicationProductDetailsId));
            formData.append('applicantSequence', String(personSeq));
            formData.append('documentTypeId', String(docTypeId));
            formData.append('verificationId', String(resolvedFinVerificationId));
            if (uploadedBy) formData.append('uploadedBy', String(uploadedBy));

            const uploadHeaders = {};
            if (token) uploadHeaders['Authorization'] = `Bearer ${token}`;

            let uploadResponse = await fetch(uploadUrl, {
              method: 'POST',
              headers: uploadHeaders,
              body: formData,
            });

            if (!uploadResponse.ok && [400, 404, 405, 409].includes(uploadResponse.status)) {
              uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                headers: uploadHeaders,
                body: formData,
              });
            }

            if (!uploadResponse.ok) {
              const uploadErrText = await uploadResponse.text().catch(() => '');
              let errorBody = {};
              try {
                errorBody = uploadErrText ? JSON.parse(uploadErrText) : {};
              } catch {
                errorBody = { message: uploadErrText };
              }
              const parsed = parseApiErrorBody(
                errorBody,
                `${personLabel} ${targetName} upload failed with HTTP ${uploadResponse.status}.`
              );
              setErrorPopup({
                title: 'Financial Document Upload Failed',
                message: parsed.message || uploadErrText || `${personLabel} ${targetName} upload failed with HTTP ${uploadResponse.status}.`,
                details: parsed.items,
                variant: parsed.variant || 'error',
              });
              return;
            }

            // Refresh the stored application-level document so the UI shows the saved server file
            try {
              const getDocRes = await fetch(
                `${API_BASE}/ApplicationKYCDocuments/applicant-document?applicationProductDetailsId=${applicationProductDetailsId}&applicantSequence=${personSeq}&documentTypeId=${docTypeId}`,
                { headers: uploadHeaders }
              );
              if (getDocRes.ok) {
                const docRecord = await getDocRes.json();
                const savedPath = docRecord?.documentPath || docRecord?.DocumentPath || null;
                if (savedPath) {
                  const cleanPath = savedPath.replace(/\\/g, '/').replace(/^\/+/, '');
                  const dlRes = await fetch(
                    `${API_BASE}/ApplicationKYCDocuments/download?path=${encodeURIComponent(cleanPath)}`,
                    { headers: uploadHeaders }
                  );
                  if (dlRes.ok) {
                    const blob = await dlRes.blob();
                    if (blob && blob.size > 0) {
                      const blobUrl = URL.createObjectURL(blob);
                      activeBlobUrlsRef.current.push(blobUrl);
                      if (isApplicant) {
                        setApplicantPersistedDocs((prev) => ({
                          ...prev,
                          [key]: {
                            exists: true,
                            fileName: effectiveFile.name,
                            blobUrl,
                            mimeType: blob.type || effectiveFile.type,
                            size: blob.size || effectiveFile.size,
                            documentPath: savedPath,
                            documentTypeId: docTypeId,
                            applicantSequence: 0,
                          },
                        }));
                        setApplicantDocs((prev) => ({ ...prev, [key]: null }));
                      } else {
                        setCoApplicantPersistedDocs((prev) =>
                          updateApplicantSlot(prev, coIdx, key, {
                            exists: true,
                            fileName: effectiveFile.name,
                            blobUrl,
                            mimeType: blob.type || effectiveFile.type,
                            size: blob.size || effectiveFile.size,
                            documentPath: savedPath,
                            documentTypeId: docTypeId,
                            applicantSequence: personSeq,
                          })
                        );
                        setCoApplicantDocs((prev) => clearUploadedSlot(prev, coIdx, key, effectiveFile));
                      }
                    }
                  }
                }
              }
            } catch (getErr) {
              console.warn(`Failed to refresh ${personLabel} ${key} after upload:`, getErr);
            }
          }
        }
      }

      const updatedForm = {
        applicant: {
          ...form.applicant,
          kycDocumentId:
            form.applicant.kycDocumentId ||
            form.applicant.applicationKYCDocumentId ||
            allPersons[0]?.kycDocumentId ||
            allPersons[0]?.applicationKYCDocumentId ||
            appData.kycDocuments?.applicant?.kycDocumentId ||
            appData.kycDocuments?.applicant?.applicationKYCDocumentId ||
            appData.sections?.kycDocuments?.applicant?.kycDocumentId ||
            appData.sections?.kycDocuments?.applicant?.applicationKYCDocumentId ||
            null,
          applicationKYCDocumentId:
            form.applicant.applicationKYCDocumentId ||
            form.applicant.kycDocumentId ||
            allPersons[0]?.applicationKYCDocumentId ||
            allPersons[0]?.kycDocumentId ||
            appData.kycDocuments?.applicant?.applicationKYCDocumentId ||
            appData.kycDocuments?.applicant?.kycDocumentId ||
            appData.sections?.kycDocuments?.applicant?.applicationKYCDocumentId ||
            appData.sections?.kycDocuments?.applicant?.kycDocumentId ||
            null,
          numberOfDocuments: Number(allPersons[0].numberOfDocuments) || 0,
          documentPath: allPersons[0].documentPath || null,
          aadharDocumentPath: allPersons[0].aadharDocumentPath || form.applicant.aadharDocumentPath || null,
          panCardPath: allPersons[0].panCardPath || form.applicant.panCardPath || null,
          profileImagePath: allPersons[0].profileImagePath || form.applicant.profileImagePath || null,
          manualDocuments: allPersons[0].manualDocuments || '',
          identityDocumentFiles: allPersons[0].identityDocumentFiles || [],
          identityDocumentCount: String(allPersons[0].numberOfDocuments || 0),
          fileSize: allPersons[0].fileSize || null,
          identityDocumentRawFiles: [],
        },
        coApplicants: form.coApplicants.map((co, i) => {
          const rawCoDocPath = allPersons[i + 1]?.documentPath || co.documentPath;
          const coNumDocs = Number(allPersons[i + 1]?.numberOfDocuments ?? co.numberOfDocuments) || 0;
          return {
            ...co,
            kycDocumentId: allPersons[i + 1]?.kycDocumentId || co.kycDocumentId || co.applicationKYCDocumentId,
            applicationKYCDocumentId: allPersons[i + 1]?.kycDocumentId || co.kycDocumentId || co.applicationKYCDocumentId,
            numberOfDocuments: coNumDocs,
            documentPath: rawCoDocPath || null,
            aadharDocumentPath: allPersons[i + 1]?.aadharDocumentPath || co.aadharDocumentPath || null,
            panCardPath: allPersons[i + 1]?.panCardPath || co.panCardPath || null,
            profileImagePath: allPersons[i + 1]?.profileImagePath || co.profileImagePath || null,
            manualDocuments: allPersons[i + 1]?.manualDocuments || co.manualDocuments || '',
            identityDocumentFiles: allPersons[i + 1]?.identityDocumentFiles || co.identityDocumentFiles || [],
            identityDocumentCount: String(coNumDocs),
            fileSize: allPersons[i + 1]?.fileSize || co.fileSize || null,
            identityDocumentRawFiles: [],
          };
        }),
      };

      saveApplication(appId, buildSectionUpdate(appData, 'kycDocuments', updatedForm));

      navigate(ROUTES.PERSONAL_INFORMATION.replace(':applicationId', appId));
    } catch (err) {
      console.error('Error saving KYC:', err);
      setErrorPopup({
        title: 'Connection error',
        message: err.message || 'Network error while saving KYC documents. Please try again.',
        variant: 'error',
      });
    }
  };

  const handleBack = () => {
    navigate(ROUTES.APPLICATION_DETAILS.replace(':applicationId', appId));
  };

  const viewingPersonTitle =
    viewingDocsFor === 'applicant'
      ? 'Applicant'
      : viewingDocsFor !== null
      ? `Co-Applicant ${viewingDocsFor + 1}`
      : '';

  return (
    <>
      <ErrorPopup
        show={!!errorPopup}
        title={errorPopup?.title}
        message={errorPopup?.message}
        details={errorPopup?.details}
        variant={errorPopup?.variant}
        onClose={() => setErrorPopup(null)}
      />
      <WizardSectionLayout
        appId={appId}
        appData={appData}
        steps={APPLICATION_WIZARD_STEPS}
        activeStep={2}
        title="Step 2: KYC Documents"
        subtitle="Capture Aadhaar, PAN and identity document details. Validate Aadhaar using OTP where required."
        backLabel="Back to Application Details"
        continueLabel={isSaving ? 'Saving documents…' : 'Save & Continue'}
        onBack={handleBack}
        onContinue={handleContinue}
        onStepClick={(step) => navigate(step.route.replace(':applicationId', appId))}
        headerAction={
          <Button
            variant="secondary"
            size="sm"
            icon={ArrowLeftIcon ? <ArrowLeftIcon size={14} /> : null}
            onClick={handleBack}
          >
            Back to Application Details
          </Button>
        }
        footerHint={`KYC details are stored for ${
          activeCount > 1 ? `${activeCount} applicant records` : 'the applicant record'
        } on the same application.`}
      >
        <fieldset disabled={isSaving} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <KycCard
          title="Applicant KYC"
          person={form.applicant}
          isCoApplicant={false}
          applicantDocs={applicantDocs}
          applicantPersistedDocs={applicantPersistedDocs}
          agentSourceDocs={agentSourceDocs}
          onApplicantDocChange={handleApplicantDocChange}
          onApplicantDocRemove={handleApplicantDocRemove}
          onViewLocalFile={handleViewLocalFile}
          onViewPersistedDoc={handleViewPersistedDoc}
          onViewAgentDoc={handleViewAgentDoc}
          onReplacePersistedSlot={(slotIdx, file) => handleReplacePersistedManualSlot('applicant', null, slotIdx, file)}
          onChange={(field, value) => updatePerson('applicant', field, value)}
          onViewDocuments={() => handleOpenDocsModal('applicant')}
          documentTypeOptions={documentTypeOptions}
          verificationOptions={verificationOptions}
          isLoadingMasters={isLoadingMasters}
          errors={Object.fromEntries(
            Object.entries(errors)
              .filter(([key]) => key.startsWith('applicant.'))
              .map(([key, value]) => [key.split('.').slice(1).join('.'), value])
          )}
        />

        {activeCount > 0 &&
          form.coApplicants.map((person, index) => (
            <KycCard
              key={`co-kyc-${index}`}
              title={`Co-Applicant ${index + 1} KYC`}
              person={person}
              isCoApplicant={true}
              coApplicantDocs={coApplicantDocs[index]}
              coApplicantPersistedDocs={coApplicantPersistedDocs[index]}
              onCoApplicantDocChange={(docType, file) => handleCoApplicantDocChange(index, docType, file)}
              onCoApplicantDocRemove={(docType) => handleCoApplicantDocRemove(index, docType)}
              onViewLocalFile={handleViewLocalFile}
              onViewPersistedDoc={handleViewPersistedDoc}
              onReplacePersistedSlot={(slotIdx, file) => handleReplacePersistedManualSlot('coApplicants', index, slotIdx, file)}
              onChange={(field, value) => updatePerson('coApplicants', field, value, index)}
              onViewDocuments={() => handleOpenDocsModal(index)}
              documentTypeOptions={documentTypeOptions}
              verificationOptions={verificationOptions}
              isLoadingMasters={isLoadingMasters}
              errors={Object.fromEntries(
                Object.entries(errors)
                  .filter(([key]) => key.startsWith(`coApplicants.${index}.`))
                  .map(([key, value]) => [key.split('.').slice(2).join('.'), value])
              )}
            />
          ))}
        </fieldset>
      </WizardSectionLayout>

      {/* ===================================================================
          DOCUMENTS PREVIEW GALLERY MODAL
      ==================================================================== */}
      <Modal
        show={viewingDocsFor !== null}
        onHide={handleCloseDocsModal}
        title={`${viewingPersonTitle} - Uploaded Documents`}
        size="lg"
        footer={
          <Button variant="primary" onClick={handleCloseDocsModal}>
            Done
          </Button>
        }
      >
        {/* Loading state */}
        {isLoadingDocs && (
          <div className="kyc-docs-loading">
            <div className="kyc-docs-spinner" />
            <span className="kyc-docs-loading-text">Loading documents...</span>
          </div>
        )}

        {/* Error state */}
        {!isLoadingDocs && docsLoadError && (
          <div className="kyc-docs-empty" style={{ borderColor: '#fca5a5', backgroundColor: '#fff5f5' }}>
            <div className="kyc-docs-empty-icon" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
              <AlertCircle size={24} />
            </div>
            <p className="kyc-docs-empty-title" style={{ color: '#b91c1c' }}>
              {docsLoadError}
            </p>
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw size={13} />}
              onClick={() => {
                if (viewingDocsFor === 'applicant') {
                  loadCustomerDocuments();
                } else if (typeof viewingDocsFor === 'number') {
                  loadCoApplicantDocuments(viewingDocsFor);
                }
              }}
            >
              Retry Loading
            </Button>
          </div>
        )}

        {/* Empty state */}
        {!isLoadingDocs && !docsLoadError && customerDocs.length === 0 && (
          <div className="kyc-docs-empty">
            <div className="kyc-docs-empty-icon">
              <FolderOpen size={24} />
            </div>
            <p className="kyc-docs-empty-title">
              {viewingDocsFor === 'applicant'
                ? 'No documents uploaded for this applicant'
                : 'No documents uploaded for this Co-Applicant'}
            </p>
            <p className="kyc-docs-empty-desc">
              {viewingDocsFor === 'applicant'
                ? 'Customer has not submitted any KYC or verification documents yet.'
                : 'No KYC or verification documents have been uploaded for this Co-Applicant yet.'}
            </p>
          </div>
        )}

        {/* Tabs for Original vs Updated Documents */}
        {!isLoadingDocs && !docsLoadError && customerDocs.length > 0 && (
          <div className="kyc-docs-tabs-nav">
            <button
              type="button"
              className={`kyc-docs-tab-btn ${activeDocsTab === 'original' ? 'kyc-docs-tab-btn--active' : ''}`}
              onClick={() => setActiveDocsTab('original')}
            >
              <span>Original Documents</span>
              <span className="kyc-docs-tab-count">{originalDocs.length}</span>
            </button>
            <button
              type="button"
              className={`kyc-docs-tab-btn ${activeDocsTab === 'updated' ? 'kyc-docs-tab-btn--active' : ''}`}
              onClick={() => setActiveDocsTab('updated')}
            >
              <span>Updated Documents</span>
              <span className="kyc-docs-tab-count">{updatedDocs.length}</span>
            </button>
          </div>
        )}

        {/* Original Documents Tab Content */}
        {!isLoadingDocs && customerDocs.length > 0 && activeDocsTab === 'original' && (
          <div className="kyc-docs-grid">
            {originalDocs.map((doc) => {
              const isPdf = doc.fileType === 'pdf';
              const isZip = doc.fileType === 'zip';

              return (
                <div key={doc.id || doc.agentCustomerDocumentId} className="kyc-doc-card">
                  <div className="kyc-doc-header">
                    <div className="kyc-doc-title-row">
                      <span className="kyc-doc-type-label" title={doc.documentTypeName}>
                        {doc.documentTypeName}
                      </span>
                      <div className="kyc-doc-badges-group">
                        <span className="kyc-doc-badge kyc-doc-badge--original">
                          {doc.isPending ? 'Not saved' : 'Original'}
                        </span>
                        {doc.status && doc.status !== 'Active' && (
                          <span className={`kyc-doc-badge ${
                            doc.status === 'ReturnedToRM' ? 'kyc-doc-badge--returned' :
                            doc.status === 'Verified' ? 'kyc-doc-badge--verified' :
                            'kyc-doc-badge--resubmitted'
                          }`}>
                            {doc.status === 'ReturnedToRM' ? 'Returned to RM' : doc.status}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="kyc-doc-filename" title={doc.fileName}>
                      {doc.fileName}
                    </span>
                    {doc.createdAt && (
                      <span className="kyc-doc-date">
                        <Clock size={11} />
                        <span>{formatUploadDate(doc.createdAt)}</span>
                      </span>
                    )}
                  </div>

                  {/* Failed or unavailable individual download */}
                  {doc.isHistoricalUnavailable ? (
                    <div className="kyc-doc-error-card" style={{ backgroundColor: '#fffbeb', borderColor: '#fef3c7' }}>
                      <AlertCircle size={18} color="#d97706" />
                      <span className="kyc-doc-error-text" style={{ color: '#92400e', fontSize: '11.5px', textAlign: 'center', padding: '0 8px' }}>
                        Previous version file is no longer available on the server.
                      </span>
                    </div>
                  ) : doc.error ? (
                    <div className="kyc-doc-error-card">
                      <AlertCircle size={18} color="#dc2626" />
                      <span className="kyc-doc-error-text">{doc.error || 'Preview unavailable'}</span>
                    </div>
                  ) : doc.isLegacyFallback ? (
                    <div className="kyc-doc-legacy-card">
                      <AlertCircle size={20} color="#d97706" />
                      <span className="kyc-doc-legacy-text">
                        Prior version path was not recorded for this legacy entry.
                      </span>
                    </div>
                  ) : isZip ? (
                    <div className="kyc-doc-zip-card">
                      <div className="kyc-doc-zip-icon-wrap">
                        <FolderArchive size={22} />
                      </div>
                      {doc.filePath ? (
                        <button
                          type="button"
                          className="kyc-doc-zip-view-btn"
                          title="Download Archive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadArchiveDoc(doc);
                          }}
                        >
                          <Download size={12} />
                          <span>Download ZIP</span>
                        </button>
                      ) : (
                        <span className="kyc-doc-filename" style={{ fontSize: '11px', color: '#64748b' }}>Archive file</span>
                      )}
                    </div>
                  ) : isPdf ? (
                    /* PDF Document Preview Card */
                    <div
                      className="kyc-doc-pdf-card"
                      onClick={() => setSelectedPreviewDoc(doc)}
                      title="Click to view PDF"
                    >
                      <div className="kyc-doc-pdf-icon-wrap">
                        <FileText size={22} />
                      </div>
                      <span className="kyc-doc-pdf-view-btn">
                        <Eye size={12} />
                        <span>View PDF</span>
                      </span>
                    </div>
                  ) : (
                    /* Image Document Thumbnail */
                    <div
                      className="kyc-doc-thumb-wrapper"
                      onClick={() => setSelectedPreviewDoc(doc)}
                      title="Click to zoom image"
                    >
                      <img
                        src={doc.previewUrl}
                        alt={doc.documentTypeName}
                        className="kyc-doc-thumb-img"
                        loading="lazy"
                      />
                      <div className="kyc-doc-zoom-hint">
                        <Eye size={11} />
                        <span>Zoom</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Updated Documents Tab Content */}
        {!isLoadingDocs && customerDocs.length > 0 && activeDocsTab === 'updated' && (
          <>
            {updatedDocs.length === 0 ? (
              <div className="kyc-docs-empty" style={{ padding: '36px 20px' }}>
                <div className="kyc-docs-empty-icon" style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}>
                  <FolderOpen size={24} />
                </div>
                <p className="kyc-docs-empty-title">No updated documents</p>
                <p className="kyc-docs-empty-desc">
                  {viewingDocsFor === 'applicant'
                    ? 'No updated or replacement documents uploaded for this applicant.'
                    : 'No updated or replacement documents uploaded for this Co-Applicant.'}
                </p>
              </div>
            ) : (
              <div className="kyc-docs-grid">
                {updatedDocs.map((doc) => {
                  const isPdf = doc.fileType === 'pdf';
                  const isZip = doc.fileType === 'zip';

                  return (
                    <div key={doc.id || doc.agentCustomerDocumentId} className="kyc-doc-card">
                      <div className="kyc-doc-header">
                        <div className="kyc-doc-title-row">
                          <span className="kyc-doc-type-label" title={doc.documentTypeName}>
                            {doc.documentTypeName}
                          </span>
                          <div className="kyc-doc-badges-group">
                            <span className="kyc-doc-badge kyc-doc-badge--updated">
                              {doc.versionLabel}
                            </span>
                            {doc.isLatest ? (
                              <span className="kyc-doc-badge kyc-doc-badge--latest">
                                Latest
                              </span>
                            ) : (
                              <span className="kyc-doc-badge kyc-doc-badge--previous">
                                Previous Update
                              </span>
                            )}
                            {doc.isCurrent && doc.status === 'Verified' && (
                              <span className="kyc-doc-badge kyc-doc-badge--current">
                                Current
                              </span>
                            )}
                            {doc.status && doc.status !== 'Active' && (
                              <span className={`kyc-doc-badge ${
                                doc.status === 'ReturnedToRM' ? 'kyc-doc-badge--returned' :
                                doc.status === 'Verified' ? 'kyc-doc-badge--verified' :
                                'kyc-doc-badge--resubmitted'
                              }`}>
                                {doc.status === 'ReturnedToRM' ? 'Returned to RM' : doc.status}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="kyc-doc-filename" title={doc.fileName}>
                          {doc.fileName}
                        </span>
                        {doc.createdAt && (
                          <span className="kyc-doc-date">
                            <Clock size={11} />
                            <span>{formatUploadDate(doc.createdAt)}</span>
                          </span>
                        )}
                      </div>

                      {/* Failed or unavailable individual download */}
                      {doc.isHistoricalUnavailable ? (
                        <div className="kyc-doc-error-card" style={{ backgroundColor: '#fffbeb', borderColor: '#fef3c7' }}>
                          <AlertCircle size={18} color="#d97706" />
                          <span className="kyc-doc-error-text" style={{ color: '#92400e', fontSize: '11.5px', textAlign: 'center', padding: '0 8px' }}>
                            Previous version file is no longer available on the server.
                          </span>
                        </div>
                      ) : doc.error ? (
                        <div className="kyc-doc-error-card">
                          <AlertCircle size={18} color="#dc2626" />
                          <span className="kyc-doc-error-text">{doc.error || 'Preview unavailable'}</span>
                        </div>
                      ) : doc.isLegacyFallback ? (
                        <div className="kyc-doc-legacy-card">
                          <AlertCircle size={20} color="#d97706" />
                          <span className="kyc-doc-legacy-text">
                            Prior version path was not recorded for this legacy entry.
                          </span>
                        </div>
                      ) : isZip ? (
                        <div className="kyc-doc-zip-card">
                          <div className="kyc-doc-zip-icon-wrap">
                            <FolderArchive size={22} />
                          </div>
                          {doc.filePath ? (
                            <button
                              type="button"
                              className="kyc-doc-zip-view-btn"
                              title="Download Archive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadArchiveDoc(doc);
                              }}
                            >
                              <Download size={12} />
                              <span>Download ZIP</span>
                            </button>
                          ) : (
                            <span className="kyc-doc-filename" style={{ fontSize: '11px', color: '#64748b' }}>Archive file</span>
                          )}
                        </div>
                      ) : isPdf ? (
                        /* PDF Document Preview Card */
                        <div
                          className="kyc-doc-pdf-card"
                          onClick={() => setSelectedPreviewDoc(doc)}
                          title="Click to view PDF"
                        >
                          <div className="kyc-doc-pdf-icon-wrap">
                            <FileText size={22} />
                          </div>
                          <span className="kyc-doc-pdf-view-btn">
                            <Eye size={12} />
                            <span>View PDF</span>
                          </span>
                        </div>
                      ) : (
                        /* Image Document Thumbnail */
                        <div
                          className="kyc-doc-thumb-wrapper"
                          onClick={() => setSelectedPreviewDoc(doc)}
                          title="Click to zoom image"
                        >
                          <img
                            src={doc.previewUrl}
                            alt={doc.documentTypeName}
                            className="kyc-doc-thumb-img"
                            loading="lazy"
                          />
                          <div className="kyc-doc-zoom-hint">
                            <Eye size={11} />
                            <span>Zoom</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </Modal>

      {/* ===================================================================
          FULLSCREEN LIGHTBOX / PREVIEW MODAL
      ==================================================================== */}
      {selectedPreviewDoc && (
        <div
          className="kyc-lightbox-overlay"
          onClick={() => setSelectedPreviewDoc(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="kyc-lightbox-header" onClick={(e) => e.stopPropagation()}>
            <div className="kyc-lightbox-title-group">
              <span className="kyc-lightbox-title">{selectedPreviewDoc.documentTypeName}</span>
              <span className="kyc-lightbox-filename">{selectedPreviewDoc.fileName}</span>
            </div>

            <div className="kyc-lightbox-actions">
              {selectedPreviewDoc.previewUrl && (
                <a
                  href={selectedPreviewDoc.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="kyc-lightbox-action-btn"
                  title="Open in new window"
                >
                  <ExternalLink size={14} />
                  <span>Open in Tab</span>
                </a>
              )}
              {selectedPreviewDoc.previewUrl && (
                <a
                  href={selectedPreviewDoc.previewUrl}
                  download={selectedPreviewDoc.fileName}
                  className="kyc-lightbox-action-btn"
                  title="Download file"
                >
                  <Download size={14} />
                  <span>Download</span>
                </a>
              )}
              <button
                type="button"
                className="kyc-lightbox-close-btn"
                onClick={() => setSelectedPreviewDoc(null)}
                aria-label="Close Preview"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="kyc-lightbox-body" onClick={(e) => e.stopPropagation()}>
            {selectedPreviewDoc.fileType === 'pdf' ? (
              <iframe
                src={selectedPreviewDoc.previewUrl}
                title={selectedPreviewDoc.fileName}
                className="kyc-lightbox-iframe"
              />
            ) : (
              <img
                src={selectedPreviewDoc.previewUrl}
                alt={selectedPreviewDoc.documentTypeName}
                className="kyc-lightbox-img"
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
