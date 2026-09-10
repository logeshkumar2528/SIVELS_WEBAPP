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
  FolderOpen
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
import './KycDocuments.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';

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

function buildKycState(appData) {
  const saved = getSectionState(appData, 'kycDocuments', {});
  const count = getApplicantCount(appData);
  const savedCoApplicants = Array.isArray(saved.coApplicants) ? saved.coApplicants : [];

  return {
    applicant: {
      kycDocumentId: saved.applicant?.kycDocumentId || saved.applicant?.applicationKYCDocumentId || null,
      aadhaarLast4: saved.applicant?.aadhaarLast4 || last4FromValue(appData.aadhaarNo),
      panCardNo: saved.applicant?.panCardNo || appData.panCardNo || appData.panNumber || '',
      identityDocumentType: saved.applicant?.identityDocumentType || '',
      identityDocumentCount: saved.applicant?.identityDocumentCount || (saved.applicant?.identityDocumentFiles?.length ? String(saved.applicant.identityDocumentFiles.length) : ''),
      identityDocumentFiles: Array.isArray(saved.applicant?.identityDocumentFiles)
        ? saved.applicant.identityDocumentFiles
        : (saved.applicant?.manualDocuments ? saved.applicant.manualDocuments.split(',').map((s) => s.trim()).filter(Boolean) : []),
      identityDocumentRawFiles: [],
      identityDocumentNo: saved.applicant?.identityDocumentNo || '',
      verificationStatus: saved.applicant?.verificationStatus || 'Pending',
      documentPath: saved.applicant?.documentPath || null,
      manualDocuments: saved.applicant?.manualDocuments || '',
      fileSize: saved.applicant?.fileSize || null,
    },
    coApplicants: createArray(count, (index) => ({
      kycDocumentId: savedCoApplicants[index]?.kycDocumentId || savedCoApplicants[index]?.applicationKYCDocumentId || null,
      aadhaarLast4: savedCoApplicants[index]?.aadhaarLast4 || '',
      panCardNo: savedCoApplicants[index]?.panCardNo || '',
      identityDocumentType: savedCoApplicants[index]?.identityDocumentType || '',
      identityDocumentCount: savedCoApplicants[index]?.identityDocumentCount || (savedCoApplicants[index]?.identityDocumentFiles?.length ? String(savedCoApplicants[index].identityDocumentFiles.length) : ''),
      identityDocumentFiles: Array.isArray(savedCoApplicants[index]?.identityDocumentFiles)
        ? savedCoApplicants[index].identityDocumentFiles
        : (savedCoApplicants[index]?.manualDocuments ? savedCoApplicants[index].manualDocuments.split(',').map((s) => s.trim()).filter(Boolean) : []),
      identityDocumentRawFiles: [],
      identityDocumentNo: savedCoApplicants[index]?.identityDocumentNo || '',
      verificationStatus: savedCoApplicants[index]?.verificationStatus || 'Pending',
      documentPath: savedCoApplicants[index]?.documentPath || null,
      manualDocuments: savedCoApplicants[index]?.manualDocuments || '',
      fileSize: savedCoApplicants[index]?.fileSize || null,
    })),
  };
}

function validateKyc(person) {
  return {};
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
}) {
  const [otpStep, setOtpStep] = useState(person.verificationStatus === 'Verified' ? 'verified' : 'idle');
  const [otpValue, setOtpValue] = useState('');
  const [fileSizeError, setFileSizeError] = useState('');
  const fileInputRefs = useRef([]);

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

  const documentCountOptions = [
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
  ];

  const selectedDocumentCount = Number(person.identityDocumentCount) || 0;
  const selectedDocumentFiles = Array.isArray(person.identityDocumentFiles) ? person.identityDocumentFiles : [];
  const selectedDocumentRawFiles = Array.isArray(person.identityDocumentRawFiles) ? person.identityDocumentRawFiles : [];

  const persistedFiles = useMemo(() => {
    const list = [];
    if (person.documentPath) {
      const rawPaths = String(person.documentPath).split(',').map((s) => s.trim()).filter(Boolean);
      rawPaths.forEach((path, i) => {
        const cleanName = path.split('/').pop() || path.split('\\').pop() || `Document ${i + 1}`;
        list.push({
          path,
          fileName: cleanName,
          size: person.fileSize || null,
          isPersisted: true,
        });
      });
    } else if (person.manualDocuments && typeof person.manualDocuments === 'string' && !selectedDocumentRawFiles.some(Boolean)) {
      const rawNames = person.manualDocuments.split(',').map((s) => s.trim()).filter(Boolean);
      rawNames.forEach((name) => {
        list.push({
          path: name,
          fileName: name,
          size: person.fileSize || null,
          isPersisted: true,
        });
      });
    }
    return list;
  }, [person.documentPath, person.manualDocuments, person.fileSize, selectedDocumentRawFiles]);

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
    if (!value) {
      onChange('identityDocumentCount', '');
      onChange('identityDocumentFiles', []);
      onChange('identityDocumentRawFiles', []);
      onChange('manualDocuments', '');
      setFileSizeError('');
    }
  };

  const handleDocumentCountChange = (value) => {
    const count = Number(value) || 0;
    onChange('identityDocumentCount', value);
    onChange('identityDocumentFiles', Array.from({ length: count }, (_, index) => selectedDocumentFiles[index] || ''));
    onChange('identityDocumentRawFiles', Array.from({ length: count }, (_, index) => selectedDocumentRawFiles[index] || null));
  };

  const handleDocumentFileChange = (index, event) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 150 * 1024 * 1024) {
        setFileSizeError('Each file must be 150 MB or smaller');
        event.target.value = '';
        const nextFiles = [...selectedDocumentFiles];
        nextFiles[index] = '';
        const nextRawFiles = [...selectedDocumentRawFiles];
        nextRawFiles[index] = null;
        onChange('identityDocumentFiles', nextFiles);
        onChange('identityDocumentRawFiles', nextRawFiles);
        onChange('manualDocuments', nextFiles.filter(Boolean).join(', '));
        return;
      }
      setFileSizeError('');
      const nextFiles = [...selectedDocumentFiles];
      nextFiles[index] = file.name;
      const nextRawFiles = [...selectedDocumentRawFiles];
      nextRawFiles[index] = file;
      onChange('identityDocumentFiles', nextFiles);
      onChange('identityDocumentRawFiles', nextRawFiles);
      onChange('manualDocuments', nextFiles.filter(Boolean).join(', '));
    }
  };

  const handleRemoveFile = (index) => {
    const nextFiles = [...selectedDocumentFiles];
    nextFiles[index] = '';
    const nextRawFiles = [...selectedDocumentRawFiles];
    nextRawFiles[index] = null;
    onChange('identityDocumentFiles', nextFiles);
    onChange('identityDocumentRawFiles', nextRawFiles);
    onChange('manualDocuments', nextFiles.filter(Boolean).join(', '));
    if (fileInputRefs.current[index]) {
      fileInputRefs.current[index].value = '';
    }
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

          {!isCoApplicant && (
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
          )}

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
                <Select
                  value={person.identityDocumentCount}
                  onChange={handleDocumentCountChange}
                  options={documentCountOptions}
                  placeholder="Select number"
                />
              </div>
            </div>
          )}

          <div className="aw-field aw-upload-field">
            <label className="form-label">Upload Manual Documents (ZIP/Images)</label>
            {selectedDocumentCount > 0 ? (
              <div className="kyc-upload-container">
                {Array.from({ length: selectedDocumentCount }, (_, index) => {
                  const persisted = persistedFiles[index];
                  const rawFile = selectedDocumentRawFiles[index];
                  const selectedName = selectedDocumentFiles[index];

                  return (
                    <div className="kyc-doc-slot" key={`document-upload-${index}`}>
                      {selectedDocumentCount > 1 && (
                        <div className="kyc-doc-slot-header">
                          <span className="kyc-doc-slot-title">File {index + 1}</span>
                        </div>
                      )}

                      {/* 1. Existing Uploaded File Row */}
                      {persisted && (
                        <div className="kyc-existing-file-row">
                          <div className="kyc-existing-file-main">
                            <div className="kyc-existing-file-icon">
                              {getFileIcon(persisted.fileName)}
                            </div>
                            <div className="kyc-existing-file-details">
                              <span className="kyc-existing-file-name" title={persisted.fileName}>
                                {persisted.fileName}
                              </span>
                              <span className="kyc-existing-file-status">
                                {persisted.size ? `${formatFileSize(persisted.size)} • ` : ''}Uploaded successfully
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="kyc-download-btn"
                            onClick={() => handleDownloadPersisted(persisted)}
                            title={`Download ${persisted.fileName}`}
                          >
                            <Download size={12} />
                            <span>Download</span>
                          </button>
                        </div>
                      )}

                      {/* 2. Choose / Replace File Input */}
                      <div className="kyc-file-input-wrapper">
                        {persisted && (
                          <span className="kyc-replace-label">Replace file:</span>
                        )}
                        <input
                          ref={(element) => {
                            fileInputRefs.current[index] = element;
                          }}
                          type="file"
                          className="form-input aw-input kyc-compact-file-input"
                          accept=".zip,image/*"
                          aria-label={`Upload document ${index + 1}`}
                          onChange={(event) => handleDocumentFileChange(index, event)}
                        />
                      </div>

                      {/* 3. Selected Fresh File Row */}
                      {(rawFile || selectedName) && (
                        <div className="kyc-selected-file-row">
                          <div className="kyc-selected-file-main">
                            <span className="kyc-selected-label">Selected:</span>
                            <span className="kyc-selected-name" title={rawFile?.name || selectedName}>
                              {rawFile?.name || selectedName}
                            </span>
                            {rawFile?.size && (
                              <span className="kyc-selected-size">
                                • {formatFileSize(rawFile.size)}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(index)}
                            className="kyc-clear-file-btn"
                            title="Clear selection"
                            aria-label="Clear selection"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="kyc-upload-container">
                <div className="kyc-doc-slot">
                  {/* 1. Existing Uploaded File Row if any */}
                  {persistedFiles[0] && (
                    <div className="kyc-existing-file-row">
                      <div className="kyc-existing-file-main">
                        <div className="kyc-existing-file-icon">
                          {getFileIcon(persistedFiles[0].fileName)}
                        </div>
                        <div className="kyc-existing-file-details">
                          <span className="kyc-existing-file-name" title={persistedFiles[0].fileName}>
                            {persistedFiles[0].fileName}
                          </span>
                          <span className="kyc-existing-file-status">
                            {persistedFiles[0].size ? `${formatFileSize(persistedFiles[0].size)} • ` : ''}Uploaded successfully
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="kyc-download-btn"
                        onClick={() => handleDownloadPersisted(persistedFiles[0])}
                        title={`Download ${persistedFiles[0].fileName}`}
                      >
                        <Download size={12} />
                        <span>Download</span>
                      </button>
                    </div>
                  )}

                  {/* 2. Choose / Replace File Input */}
                  <div className="kyc-file-input-wrapper">
                    {persistedFiles[0] && (
                      <span className="kyc-replace-label">Replace file:</span>
                    )}
                    <input
                      type="file"
                      className="form-input aw-input kyc-compact-file-input"
                      accept=".zip,image/*"
                      multiple
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 150 * 1024 * 1024) {
                            setFileSizeError('Each file must be 150 MB or smaller');
                            e.target.value = '';
                            return;
                          }
                          setFileSizeError('');
                          onChange('manualDocuments', file.name);
                          onChange('identityDocumentFiles', [file.name]);
                          onChange('identityDocumentRawFiles', [file]);
                        }
                      }}
                    />
                  </div>

                  {/* 3. Selected Fresh File Row */}
                  {selectedDocumentRawFiles[0] && (
                    <div className="kyc-selected-file-row">
                      <div className="kyc-selected-file-main">
                        <span className="kyc-selected-label">Selected:</span>
                        <span className="kyc-selected-name" title={selectedDocumentRawFiles[0].name}>
                          {selectedDocumentRawFiles[0].name}
                        </span>
                        {selectedDocumentRawFiles[0].size && (
                          <span className="kyc-selected-size">
                            • {formatFileSize(selectedDocumentRawFiles[0].size)}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onChange('manualDocuments', '');
                          onChange('identityDocumentFiles', []);
                          onChange('identityDocumentRawFiles', []);
                        }}
                        className="kyc-clear-file-btn"
                        title="Clear selection"
                        aria-label="Clear selection"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            {(fileSizeError || errors.manualDocuments || errors.identityDocumentFiles) && (
              <span className="aw-field-error">
                {fileSizeError || errors.manualDocuments || errors.identityDocumentFiles}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function KycDocuments() {
  const navigate = useNavigate();
  const { applicationId } = useParams();
  const appId = applicationId;
  const { getApplication, ensureApplication, saveApplication } = useApplicationDraftStore();
  const [form, setForm] = useState(() => buildKycState(getApplication(appId)));
  const [errors, setErrors] = useState({});
  const [errorPopup, setErrorPopup] = useState(null);

  // Document viewing state
  const [viewingDocsFor, setViewingDocsFor] = useState(null); // 'applicant' | number (coApplicant index)
  const [customerDocs, setCustomerDocs] = useState([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [docsLoadError, setDocsLoadError] = useState('');
  const [selectedPreviewDoc, setSelectedPreviewDoc] = useState(null);

  const [isLoadingMasters, setIsLoadingMasters] = useState(false);
  const [documentTypeOptions, setDocumentTypeOptions] = useState([]);
  const [verificationOptions, setVerificationOptions] = useState([]);

  // Keep ref of active preview URLs for cleanup
  const activeBlobUrlsRef = useRef([]);
  const hydratedKycIdsRef = useRef(new Set());

  useEffect(() => {
    ensureApplication(appId);
  }, [appId, ensureApplication]);

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

  useEffect(() => {
    setForm(buildKycState(getApplication(appId)));
  }, [appId, activeCount, getApplication]);

  const applicantKycId =
    form.applicant?.kycDocumentId ||
    appData?.kycDocuments?.applicant?.kycDocumentId ||
    appData?.kycDocuments?.applicant?.applicationKYCDocumentId ||
    appData?.applicationKYCDocumentId ||
    null;

  const coApplicantKycIds = useMemo(() => {
    return (form.coApplicants || []).map(
      (co, i) =>
        co?.kycDocumentId ||
        appData?.kycDocuments?.coApplicants?.[i]?.kycDocumentId ||
        appData?.kycDocuments?.coApplicants?.[i]?.applicationKYCDocumentId ||
        null
    );
  }, [form.coApplicants, appData?.kycDocuments?.coApplicants]);

  const coApplicantKycIdsKey = coApplicantKycIds.map((id) => id || '').join(',');

  // Hydrate KYC record from API if kycDocumentId exists
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
            hydratedKycIdsRef.current.add(applicantKycId);
            if (data) {
              const docPath =
                data.documentPath ||
                data.DocumentPath ||
                data.filePath ||
                data.FilePath ||
                data.url ||
                data.Url ||
                null;
              const docFiles = docPath
                ? String(docPath)
                    .split(',')
                    .map((s) => s.trim().split('/').pop() || s.trim())
                    .filter(Boolean)
                : [];
              const docCount = docFiles.length ? String(Math.min(docFiles.length, 3)) : '';

              setForm((prev) => {
                const app = prev.applicant;
                return {
                  ...prev,
                  applicant: {
                    ...app,
                    kycDocumentId: applicantKycId,
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
                    documentPath: docPath || app.documentPath,
                    identityDocumentFiles: app.identityDocumentFiles?.length
                      ? app.identityDocumentFiles
                      : docFiles,
                    manualDocuments:
                      app.manualDocuments || (docFiles.length ? docFiles.join(', ') : ''),
                    identityDocumentCount: app.identityDocumentCount || docCount,
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
              hydratedKycIdsRef.current.add(coKycId);
              if (data) {
                const docPath =
                  data.documentPath ||
                  data.DocumentPath ||
                  data.filePath ||
                  data.FilePath ||
                  data.url ||
                  data.Url ||
                  null;
                const docFiles = docPath
                  ? String(docPath)
                      .split(',')
                      .map((s) => s.trim().split('/').pop() || s.trim())
                      .filter(Boolean)
                  : [];
                const docCount = docFiles.length ? String(Math.min(docFiles.length, 3)) : '';

                setForm((prev) => {
                  const newCo = [...prev.coApplicants];
                  if (newCo[i]) {
                    newCo[i] = {
                      ...newCo[i],
                      kycDocumentId: coKycId,
                      aadhaarLast4:
                        newCo[i].aadhaarLast4 ||
                        (data.aadhaarLastFourDigits ? String(data.aadhaarLastFourDigits) : ''),
                      panCardNo: newCo[i].panCardNo || data.panCardNo || data.PANCardNo || '',
                      identityDocumentNo:
                        newCo[i].identityDocumentNo || data.documentNumber || data.DocumentNumber || '',
                      identityDocumentType:
                        newCo[i].identityDocumentType || (data.documentTypeId ? String(data.documentTypeId) : ''),
                      verificationStatus:
                        newCo[i].verificationStatus && newCo[i].verificationStatus !== 'Pending'
                          ? newCo[i].verificationStatus
                          : data.verificationId
                          ? String(data.verificationId)
                          : 'Pending',
                      documentPath: docPath || newCo[i].documentPath,
                      identityDocumentFiles: newCo[i].identityDocumentFiles?.length
                        ? newCo[i].identityDocumentFiles
                        : docFiles,
                      manualDocuments:
                        newCo[i].manualDocuments || (docFiles.length ? docFiles.join(', ') : ''),
                      identityDocumentCount: newCo[i].identityDocumentCount || docCount,
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

  // ── Document Cleanup Helper ──────────────────────────────────────────────
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      revokeAllBlobUrls();
    };
  }, [revokeAllBlobUrls]);

  // ── Resolve exact agentCustomerId ─────────────────────────────────────────
  const resolveAgentCustomerId = useCallback(async () => {
    console.log('Route Application ID:', appId);
    console.log('Full Application Data:', appData);

    let resolvedId =
      appData?.agentCustomerId ||
      appData?.AgentCustomerId ||
      appData?.customerId ||
      null;

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
                customerName: record.fullName || record.customerName || appData?.customerName || '',
                mobile: record.mobileNumber || record.mobile || appData?.mobile || '',
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

    console.log('Resolved Agent Customer ID:', resolvedId);
    return resolvedId || null;
  }, [appData, appId, saveApplication]);

  // ── Load and Download Documents for Customer ─────────────────────────────
  const loadCustomerDocuments = useCallback(async () => {
    setIsLoadingDocs(true);
    setDocsLoadError('');
    revokeAllBlobUrls();
    setCustomerDocs([]);

    try {
      const agentCustomerId = await resolveAgentCustomerId();
      console.log('Agent Customer ID:', agentCustomerId);

      if (!agentCustomerId) {
        console.error('Agent Customer ID is missing');
        setDocsLoadError('Agent Customer ID is missing for this application. Please ensure customer details are loaded.');
        setIsLoadingDocs(false);
        return;
      }

      const headers = {};
      const token = localStorage.getItem('authToken');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // 1. Fetch document metadata for customer
      const targetUrl = `${API_BASE}/AgentCustomerDocument/bycustomer/${agentCustomerId}`;
      const res = await fetch(targetUrl, { headers });

      if (!res.ok) {
        let errorData = null;
        try {
          errorData = await res.json();
        } catch {
          try {
            errorData = await res.text();
          } catch {
            // ignore
          }
        }

        console.error('Document API Error:', {
          status: res.status,
          data: errorData,
          url: targetUrl,
          agentCustomerId,
        });

        if (res.status === 500) {
          throw new Error('Unable to load documents. The document service returned a server error.');
        } else if (res.status === 404) {
          throw new Error('No document records found for this customer on the server.');
        } else if (res.status === 401 || res.status === 403) {
          throw new Error('You are not authorized to view documents. Please log in again.');
        } else {
          throw new Error(errorData?.message || errorData?.title || `Failed to fetch documents list (HTTP ${res.status})`);
        }
      }

      const data = await res.json();
      const documentList = Array.isArray(data) ? data : (data?.data || data?.value || data?.items || []);
      console.log('Documents API Response:', documentList);

      const activeDocs = documentList.filter((doc) => doc.isActive !== false);

      if (activeDocs.length === 0) {
        setCustomerDocs([]);
        setIsLoadingDocs(false);
        return;
      }

      // 2. Download and create preview blobs for each document in parallel
      const createdUrls = [];
      const loadedDocuments = await Promise.all(
        activeDocs.map(async (doc) => {
          const docId = doc.agentCustomerDocumentId || doc.agentCustomerId || doc.id;
          console.log('Loading document:', doc.agentCustomerDocumentId || doc.id, doc.fileName);

          const fileName = doc.fileName || 'document';
          const ext = fileName.split('.').pop()?.toLowerCase();
          const isPdf = ext === 'pdf';
          const dlUrl = `${API_BASE}/AgentCustomerDocument/download/${docId}`;

          try {
            const dlRes = await fetch(dlUrl, { headers });
            if (!dlRes.ok) {
              let dlErrData = null;
              try {
                dlErrData = await dlRes.json();
              } catch {
                try {
                  dlErrData = await dlRes.text();
                } catch {
                  // ignore
                }
              }
              console.error('Document Download API Error:', {
                status: dlRes.status,
                data: dlErrData,
                documentId: docId,
                fileName,
                url: dlUrl,
                agentCustomerId,
              });
              throw new Error(`Download failed with status ${dlRes.status}`);
            }

            const rawBlob = await dlRes.blob();

            // Map MIME type
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
            createdUrls.push(previewUrl);

            return {
              agentCustomerDocumentId: docId,
              documentTypeId: doc.documentTypeId,
              documentTypeName: doc.documentTypeName || doc.documentType || 'Uploaded Document',
              fileName,
              filePath: doc.filePath,
              fileType: isPdf ? 'pdf' : 'image',
              previewUrl,
              error: null,
            };
          } catch (dlErr) {
            console.error(`Failed to download document ${docId} (${fileName}):`, dlErr);
            return {
              agentCustomerDocumentId: docId,
              documentTypeId: doc.documentTypeId,
              documentTypeName: doc.documentTypeName || doc.documentType || 'Uploaded Document',
              fileName,
              filePath: doc.filePath,
              fileType: isPdf ? 'pdf' : 'image',
              previewUrl: null,
              error: 'Failed to load preview',
            };
          }
        })
      );

      activeBlobUrlsRef.current = createdUrls;
      setCustomerDocs(loadedDocuments);
    } catch (err) {
      console.error('Error in loadCustomerDocuments:', err);
      setDocsLoadError(err.message || 'Unable to load documents. The document service returned a server error.');
    } finally {
      setIsLoadingDocs(false);
    }
  }, [resolveAgentCustomerId, revokeAllBlobUrls]);

  // Open modal handler
  const handleOpenDocsModal = (target) => {
    setViewingDocsFor(target);
    loadCustomerDocuments();
  };

  // Close modal handler
  const handleCloseDocsModal = () => {
    setViewingDocsFor(null);
    setSelectedPreviewDoc(null);
    revokeAllBlobUrls();
    setCustomerDocs([]);
  };

  const updatePerson = (type, field, value, index = null) => {
    setForm((prev) => {
      if (type === 'applicant') {
        return { ...prev, applicant: { ...prev.applicant, [field]: value } };
      } else {
        const newCo = [...prev.coApplicants];
        newCo[index] = { ...newCo[index], [field]: value };
        return { ...prev, coApplicants: newCo };
      }
    });
    if (errors[`${type}${index !== null ? `.${index}` : ''}.${field}`]) {
      setErrors((prev) => {
        const newE = { ...prev };
        delete newE[`${type}${index !== null ? `.${index}` : ''}.${field}`];
        return newE;
      });
    }
  };

  const handleContinue = async () => {
    let currentErrors = {};
    const appErrs = validateKyc(form.applicant);
    if (Object.keys(appErrs).length > 0) {
      Object.entries(appErrs).forEach(([k, v]) => (currentErrors[`applicant.${k}`] = v));
    }
    form.coApplicants.forEach((co, i) => {
      const coErrs = validateKyc(co);
      if (Object.keys(coErrs).length > 0) {
        Object.entries(coErrs).forEach(([k, v]) => (currentErrors[`coApplicants.${i}.${k}`] = v));
      }
    });
    if (Object.keys(currentErrors).length > 0) {
      setErrors(currentErrors);
      return;
    }

    const applicationProductDetailsId = appData.applicationProductDetailsId;

    if (!applicationProductDetailsId) {
      setErrorPopup({
        title: 'Missing application details',
        message: 'Application product details are not saved yet. Please go back and save Application Details first.',
        variant: 'validation',
      });
      return;
    }

    const savedSection = appData.kycDocuments || {};
    const allPersons = [
      {
        ...form.applicant,
        personType: 'applicant',
        index: null,
        kycDocumentId: form.applicant.kycDocumentId || savedSection?.applicant?.kycDocumentId || null,
      },
      ...form.coApplicants.map((co, i) => ({
        ...co,
        personType: 'coApplicants',
        index: i,
        kycDocumentId: co.kycDocumentId || savedSection?.coApplicants?.[i]?.kycDocumentId || null,
      })),
    ];

    try {
      const token = localStorage.getItem('authToken');
      const authHeaders = {};
      if (token) {
        authHeaders['Authorization'] = `Bearer ${token}`;
      }

      for (const person of allPersons) {
        const isUpdate = !!person.kycDocumentId;
        const url = isUpdate
          ? `${API_BASE}/ApplicationKYCDocuments/${person.kycDocumentId}`
          : `${API_BASE}/ApplicationKYCDocuments`;

        const payload = {
          ApplicationProductDetailsId: Number(applicationProductDetailsId),
          AadhaarLastFourDigits: person.aadhaarLast4 || null,
          PANCardNo: person.panCardNo || null,
          DocumentNumber: person.identityDocumentNo || null,
          VerificationId:
            person.verificationStatus && !isNaN(Number(person.verificationStatus))
              ? Number(person.verificationStatus)
              : null,
          DocumentTypeId: person.identityDocumentType ? Number(person.identityDocumentType) : null,
          DocumentPath: person.documentPath || null,
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
        const savedId =
          savedData.applicationKYCDocumentId ||
          savedData.ApplicationKYCDocumentId ||
          savedData.id ||
          person.kycDocumentId;
        if (savedId) person.kycDocumentId = savedId;

        // Step 2: Upload manual documents if raw File objects exist
        const rawFiles = (person.identityDocumentRawFiles || []).filter((f) => f instanceof File);
        if (rawFiles.length > 0 && person.kycDocumentId) {
          for (const rawFile of rawFiles) {
            const formDataUpload = new FormData();
            formDataUpload.append('files', rawFile);
            formDataUpload.append('file', rawFile);

            const uploadHeaders = {};
            if (token) {
              uploadHeaders['Authorization'] = `Bearer ${token}`;
            }

            const uploadUrl = `${API_BASE}/ApplicationKYCDocuments/${person.kycDocumentId}/upload`;
            console.log(`Uploading manual document to: ${uploadUrl}`, rawFile.name);

            const uploadResponse = await fetch(uploadUrl, {
              method: 'POST',
              headers: uploadHeaders,
              body: formDataUpload,
            });

            if (!uploadResponse.ok) {
              const uploadErrText = await uploadResponse.text().catch(() => '');
              console.error(
                `Manual document upload failed for KYC ${person.kycDocumentId}:`,
                uploadResponse.status,
                uploadErrText
              );
            } else {
              console.log(`Uploaded document ${rawFile.name} successfully`);
            }
          }

          // Step 3: Refresh / hydrate with GET /ApplicationKYCDocuments/{id}
          try {
            const getRes = await fetch(`${API_BASE}/ApplicationKYCDocuments/${person.kycDocumentId}`, {
              headers: authHeaders,
            });
            if (getRes.ok) {
              const kycRecord = await getRes.json();
              console.log('Refreshed KYC Document record after upload:', kycRecord);
              const docPath =
                kycRecord.documentPath ||
                kycRecord.DocumentPath ||
                kycRecord.filePath ||
                kycRecord.FilePath ||
                kycRecord.url ||
                kycRecord.Url ||
                null;
              if (docPath) {
                person.documentPath = docPath;
                const docFiles = String(docPath)
                  .split(',')
                  .map((s) => s.trim().split('/').pop() || s.trim())
                  .filter(Boolean);
                person.identityDocumentFiles = docFiles;
                person.manualDocuments = docFiles.join(', ');
                if (!person.identityDocumentCount && docFiles.length > 0) {
                  person.identityDocumentCount = String(Math.min(docFiles.length, 3));
                }
              }
              if (kycRecord.fileSize || kycRecord.FileSize) {
                person.fileSize = kycRecord.fileSize || kycRecord.FileSize;
              }
            }
          } catch (getErr) {
            console.warn('Failed to refresh KYC record after upload:', getErr);
          }
        }
      }

      const updatedForm = {
        applicant: {
          ...form.applicant,
          kycDocumentId: allPersons[0].kycDocumentId,
          documentPath: allPersons[0].documentPath,
          manualDocuments: allPersons[0].manualDocuments,
          identityDocumentFiles: allPersons[0].identityDocumentFiles,
          identityDocumentCount: allPersons[0].identityDocumentCount,
          fileSize: allPersons[0].fileSize,
          identityDocumentRawFiles: [],
        },
        coApplicants: form.coApplicants.map((co, i) => ({
          ...co,
          kycDocumentId: allPersons[i + 1]?.kycDocumentId || co.kycDocumentId,
          documentPath: allPersons[i + 1]?.documentPath || co.documentPath,
          manualDocuments: allPersons[i + 1]?.manualDocuments || co.manualDocuments,
          identityDocumentFiles: allPersons[i + 1]?.identityDocumentFiles || co.identityDocumentFiles,
          identityDocumentCount: allPersons[i + 1]?.identityDocumentCount || co.identityDocumentCount,
          fileSize: allPersons[i + 1]?.fileSize || co.fileSize,
          identityDocumentRawFiles: [],
        })),
      };

      saveApplication(appId, buildSectionUpdate(appData, 'kycDocuments', updatedForm));

      navigate(ROUTES.PERSONAL_INFORMATION.replace(':applicationId', appId));
    } catch (err) {
      console.error('Error saving KYC:', err);
      setErrorPopup({
        title: 'Connection error',
        message: 'Network error while saving KYC documents. Please try again.',
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
        continueLabel="Save & Continue"
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
        <KycCard
          title="Applicant KYC"
          person={form.applicant}
          isCoApplicant={false}
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
        {!isLoadingDocs && docsLoadError && customerDocs.length === 0 && (
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
              onClick={loadCustomerDocuments}
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
            <p className="kyc-docs-empty-title">No documents uploaded for this customer</p>
            <p className="kyc-docs-empty-desc">
              Customer has not submitted any KYC or verification documents yet.
            </p>
          </div>
        )}

        {/* Document Cards Grid */}
        {!isLoadingDocs && customerDocs.length > 0 && (
          <div className="kyc-docs-grid">
            {customerDocs.map((doc) => {
              const isPdf = doc.fileType === 'pdf';

              return (
                <div key={doc.agentCustomerDocumentId} className="kyc-doc-card">
                  <div className="kyc-doc-header">
                    <span className="kyc-doc-type-label" title={doc.documentTypeName}>
                      {doc.documentTypeName}
                    </span>
                    <span className="kyc-doc-filename" title={doc.fileName}>
                      {doc.fileName}
                    </span>
                  </div>

                  {/* Failed individual download */}
                  {doc.error ? (
                    <div className="kyc-doc-error-card">
                      <AlertCircle size={18} color="#dc2626" />
                      <span className="kyc-doc-error-text">Preview unavailable</span>
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
