import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Phone,
  Mail,
  Briefcase,
  MapPin,
  Landmark,
  CreditCard,
  FileText,
  Upload,
  Camera,
  ArrowLeft,
  CheckCircle2,
  X,
  Eye,
  Trash2,
  ExternalLink,
  FileCheck,
  RefreshCw,
  Calendar as CalendarIcon,
  ShieldCheck,
  Building2
} from 'lucide-react';
import Button from '../../components/Button/Button';
import Select from '../../components/Select/Select';
import DatePicker from '../../components/DatePicker/DatePicker';
import Modal from '../../components/Modal/Modal';
import ErrorPopup from '../../components/ErrorPopup/ErrorPopup';
import { ROUTES } from '../../config/routeConfig';
import './AddAgent.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';

const GENDER_OPTIONS = [
  { value: 1, label: 'Male' },
  { value: 2, label: 'Female' },
  { value: 3, label: 'Other' },
];

export default function AddAgent({ onSuccessRedirect } = {}) {
  const navigate = useNavigate();
  const aadhaarInputRef = useRef(null);
  const profileImgInputRef = useRef(null);

  const getCurrentUser = () => {
    try {
      const raw = localStorage.getItem('sivels_currentUser');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const currentUser = useMemo(() => getCurrentUser(), []);
  const currentRmId = Number(currentUser?.rmId || currentUser?.RMId || currentUser?.rmid || 0);
  const currentRmName = currentUser?.fullName || currentUser?.name || 'this RM';
  const currentBranch = currentUser?.branch || '';
  const isAdmin = /admin|administrator|master/i.test(String(currentUser?.role || currentUser?.Role || currentUser?.userRole || ''));
  const [rmOptions, setRmOptions] = useState([]);
  const [selectedRmId, setSelectedRmId] = useState('');

  // Form State matching the OLD UI exact fields
  const [formData, setFormData] = useState({
    // Row 1
    fullName: '',
    dateOfBirth: '',

    // Row 2
    genderId: '',
    relationshipManager: '',

    // Row 3 (Full width)
    address: '',

    // Row 4
    state: '',
    pincode: '',

    // Row 5
    mobileNumber: '',
    emailAddress: '',

    // Row 6
    dateJoined: new Date().toISOString().split('T')[0],
    role: 'Agent',

    // Row 7
    branch: '',
    bankAccountNumber: '',

    // Row 8
    ifscCode: '',
  });

  // Document states for local preview
  const [aadhaarFile, setAadhaarFile] = useState(null);
  const [aadhaarPreviewUrl, setAadhaarPreviewUrl] = useState(null);
  const [isAadhaarPdf, setIsAadhaarPdf] = useState(false);

  const [profileImage, setProfileImage] = useState(null);
  const [profilePreviewUrl, setProfilePreviewUrl] = useState(null);

  // Modal Lightbox
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorDetails, setErrorDetails] = useState(null);

  useEffect(() => {
    if (currentUser) {
      setFormData((prev) => ({
        ...prev,
        relationshipManager: currentRmName,
        branch: prev.branch || currentBranch || '',
        role: prev.role || 'Agent',
      }));
    }
  }, [currentBranch, currentRmName, currentUser]);

  useEffect(() => {
    fetch(`${API_BASE}/RMMaster`)
      .then((response) => response.ok ? response.json() : [])
      .then((result) => {
        const rows = Array.isArray(result) ? result : result?.data || [];
        const options = rows.map((rm) => ({
          id: rm.rmId || rm.RMId || rm.id,
          name: rm.fullName || rm.name || rm.rmName || rm.RMName || `${rm.firstName || ''} ${rm.lastName || ''}`.trim(),
          branch: rm.branch || rm.Branch || rm.branchName || rm.BranchName || rm.location || '',
        })).filter((rm) => rm.id && rm.name);
        setRmOptions(options);
        const matchedRm = options.find((rm) => Number(rm.id) === currentRmId);
        if (!isAdmin && matchedRm?.branch) {
          setFormData((prev) => ({ ...prev, branch: matchedRm.branch }));
        }
      })
      .catch(() => setRmOptions([]));
  }, [isAdmin, currentRmId]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const buildPayload = () => ({
    fullName: formData.fullName.trim(),
    dateOfBirth: formData.dateOfBirth,
    genderId: Number(formData.genderId || 0),
    rmId: isAdmin ? Number(selectedRmId || 0) : (currentRmId || Number(currentUser?.id || currentUser?.userId || 0)),
    address: formData.address.trim(),
    state: formData.state.trim(),
    pincode: formData.pincode.trim(),
    mobileNumber: formData.mobileNumber.trim(),
    emailAddress: formData.emailAddress.trim(),
    dateJoined: formData.dateJoined,
    role: formData.role.trim(),
    branch: formData.branch.trim() || currentBranch || '',
    isActive: true,
    bankAccountNumber: formData.bankAccountNumber.trim(),
    ifscCode: formData.ifscCode.trim().toUpperCase(),
    createdBy: currentRmId || Number(currentUser?.id || currentUser?.userId || 0),
  });

  const getAuthHeaders = () => {
    const headers = {
      'Content-Type': 'application/json',
    };
    const token = localStorage.getItem('authToken');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  };

  const handleAadhaarUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (aadhaarPreviewUrl) {
        URL.revokeObjectURL(aadhaarPreviewUrl);
      }
      setAadhaarFile(file);
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      setIsAadhaarPdf(isPdf);
      const url = URL.createObjectURL(file);
      setAadhaarPreviewUrl(url);
    }
  };

  const handleRemoveAadhaar = (e) => {
    e?.stopPropagation();
    if (aadhaarPreviewUrl) {
      URL.revokeObjectURL(aadhaarPreviewUrl);
    }
    setAadhaarFile(null);
    setAadhaarPreviewUrl(null);
    setIsAadhaarPdf(false);
    if (aadhaarInputRef.current) aadhaarInputRef.current.value = '';
  };

  const handleProfileImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (profilePreviewUrl) {
        URL.revokeObjectURL(profilePreviewUrl);
      }
      setProfileImage(file);
      const url = URL.createObjectURL(file);
      setProfilePreviewUrl(url);
    }
  };

  const handleRemoveProfileImg = (e) => {
    e?.stopPropagation();
    if (profilePreviewUrl) {
      URL.revokeObjectURL(profilePreviewUrl);
    }
    setProfileImage(null);
    setProfilePreviewUrl(null);
    if (profileImgInputRef.current) profileImgInputRef.current.value = '';
  };

  const handleViewAadhaar = (e) => {
    e?.stopPropagation();
    if (!aadhaarFile) return;
    setDocModalOpen(true);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    const kb = bytes / 1024;
    return `${kb.toFixed(1)} KB`;
  };

  const validateForm = () => {
    const requiredFields = [
      ['fullName', 'full name'],
      ['pincode', 'pincode'],
      ['mobileNumber', 'mobile number'],
      ['bankAccountNumber', 'bank account number'],
      ['ifscCode', 'ifsc code'],
    ];

    for (const [field, label] of requiredFields) {
      if (!String(formData[field] ?? '').trim()) {
        return `Please fill ${label}.`;
      }
    }

    if (!String(formData.pincode).match(/^\d{6}$/)) {
      return 'Please enter a valid 6-digit pincode.';
    }

    if (!String(formData.mobileNumber).match(/^\d{10}$/)) {
      return 'Please enter a valid 10-digit mobile number.';
    }

    if (!String(formData.bankAccountNumber).match(/^\d{9,18}$/)) {
      return 'Please enter a valid bank account number.';
    }

    if (!String(formData.ifscCode).match(/^[A-Z]{4}0[A-Z0-9]{6}$/)) {
      return 'Please enter a valid IFSC code.';
    }

    if (isAdmin && !selectedRmId) {
      return 'Please select a relationship manager.';
    }

    if (!isAdmin && !currentRmId) {
      return 'RM session was not found. Please log in again.';
    }

    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      setErrorDetails(null);
      return;
    }
    setErrorMessage('');
    setErrorDetails(null);
    setConfirmModalOpen(true);
  };

  const confirmCreateAgent = async () => {
    setIsSaving(true);
    setErrorMessage('');
    setErrorDetails(null);

    try {
      const payload = buildPayload();
      console.log('Creating agent with payload:', payload);

      const response = await fetch(`${API_BASE}/AgentMaster`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorDetailsFromApi = errorText;
        try {
          errorDetailsFromApi = errorText ? JSON.parse(errorText) : null;
        } catch {
          // Keep plain-text API errors as-is.
        }
        const error = new Error(
          errorDetailsFromApi?.message ||
          errorDetailsFromApi?.Message ||
          errorDetailsFromApi?.title ||
          errorText ||
          `Failed to save agent (${response.status})`
        );
        error.details = errorDetailsFromApi;
        throw error;
      }

      setConfirmModalOpen(false);
      setSubmittedSuccess(true);
      setTimeout(() => {
        setSubmittedSuccess(false);
        navigate(onSuccessRedirect || ROUTES.MY_AGENTS);
      }, 1200);
    } catch (error) {
      console.error('Failed to create agent:', error);
      setErrorMessage(error.message || 'Failed to create agent.');
      setErrorDetails(error.details || null);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="agent-creation-page">
      <ErrorPopup
        show={!!errorMessage}
        title="Could not save agent"
        message={errorMessage}
        details={errorDetails}
        onClose={() => {
          setErrorMessage('');
          setErrorDetails(null);
        }}
      />

      {submittedSuccess && (
        <div className="agent-creation-toast" role="alert">
          <CheckCircle2 size={18} className="toast-icon" />
          <div className="toast-content">
            <span className="toast-title">Agent created successfully</span>
            <span className="toast-desc">The agent has been saved to the database.</span>
          </div>
          <button
            type="button"
            className="toast-close"
            onClick={() => setSubmittedSuccess(false)}
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ===================================================================
          ONE OVERALL MAIN FORM CONTAINER CARD
      ==================================================================== */}
      <div className="agent-creation-main-card">
        <form onSubmit={handleSubmit} className="agent-creation-form">
          
          {/* SECTION 1: AGENT INFORMATION */}
          <div className="form-section">
            <div className="section-header-row">
              <h2 className="section-heading">Agent Information</h2>
              <Button
                variant="secondary"
                size="sm"
                icon={<ArrowLeft size={15} />}
            onClick={() => navigate(onSuccessRedirect || ROUTES.MY_AGENTS)}
                className="agent-creation-back-btn"
              >
                Back to Agents
              </Button>
            </div>
            <div className="section-divider" />

            <div className="form-grid-2col agent-info-grid">
              {/* Row 1: Full Name * | Date of Birth * */}
              <div className="form-group">
                <label className="form-label">
                  Full Name <span className="required-star">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter full name"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Date of Birth <span className="required-star">*</span>
                </label>
                <DatePicker
                  value={formData.dateOfBirth}
                  onChange={(val) => handleInputChange('dateOfBirth', val)}
                  placeholder="DD/MM/YYYY"
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Row 2: Gender * | Relationship Manager * */}
              <div className="form-group">
                <label className="form-label">
                  Gender <span className="required-star">*</span>
                </label>
                <Select
                  value={formData.genderId}
                  onChange={(val) => handleInputChange('genderId', val)}
                  options={GENDER_OPTIONS}
                  placeholder="Select gender"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Relationship Manager <span className="required-star">*</span>
                </label>
                {isAdmin ? (
                  <select className="form-control" value={selectedRmId} onChange={(e) => { const option = rmOptions.find((rm) => String(rm.id) === e.target.value); setSelectedRmId(e.target.value); handleInputChange('relationshipManager', option?.name || ''); handleInputChange('branch', option?.branch || ''); }} required>
                    <option value="">Select relationship manager</option>
                    {rmOptions.map((rm) => <option key={rm.id} value={rm.id}>{rm.name}</option>)}
                  </select>
                ) : (
                  <input type="text" className="form-control form-control-readonly" value={formData.relationshipManager} readOnly aria-readonly="true" />
                )}
              </div>

              {/* Row 3: Address * (Full Width) */}
              <div className="form-group form-group-full">
                <label className="form-label">
                  Address <span className="required-star">*</span>
                </label>
                <textarea
                  className="form-control form-textarea"
                  rows={3}
                  placeholder="Enter complete address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  required
                />
              </div>

              {/* Row 4: State * | Pincode * */}
              <div className="form-group">
                <label className="form-label">
                  State <span className="required-star">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter state"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Pincode <span className="required-star">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter 6-digit pincode"
                  maxLength={6}
                  value={formData.pincode}
                  onChange={(e) => handleInputChange('pincode', e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>

              {/* Row 5: Mobile Number * | Email Address * */}
              <div className="form-group">
                <label className="form-label">
                  Mobile Number <span className="required-star">*</span>
                </label>
                <input
                  type="tel"
                  className="form-control"
                  placeholder="Enter 10-digit mobile number"
                  maxLength={10}
                  value={formData.mobileNumber}
                  onChange={(e) => handleInputChange('mobileNumber', e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Mail ID <span style={{ color: '#64748b', fontWeight: 400, fontSize: '11.5px' }}>(Optional)</span>
                </label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="Enter mail id (optional)"
                  value={formData.emailAddress}
                  onChange={(e) => handleInputChange('emailAddress', e.target.value)}
                />
              </div>

              {/* Row 6: Date Joined * | Role * */}
              <div className="form-group">
                <label className="form-label">
                  Date Joined <span className="required-star">*</span>
                </label>
                <DatePicker
                  value={formData.dateJoined}
                  onChange={(val) => handleInputChange('dateJoined', val)}
                  placeholder="DD/MM/YYYY"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Role <span className="required-star">*</span>
                </label>
                <input
                  type="text"
                  className="form-control form-control-readonly"
                  value={formData.role}
                  readOnly
                  aria-readonly="true"
                />
              </div>

              {/* Row 7: Branch * | Bank Account Number * */}
              <div className="form-group">
                <label className="form-label">
                  Branch <span className="required-star">*</span>
                </label>
                <input
                  type="text"
                  className="form-control form-control-readonly"
                  value={formData.branch}
                  readOnly
                  aria-readonly="true"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Bank Account Number <span className="required-star">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter bank account number"
                  value={formData.bankAccountNumber}
                  onChange={(e) => handleInputChange('bankAccountNumber', e.target.value)}
                  required
                />
              </div>

              {/* Row 8: IFSC Code * */}
              <div className="form-group">
                <label className="form-label">
                  IFSC Code <span className="required-star">*</span>
                </label>
                <input
                  type="text"
                  className="form-control text-uppercase"
                  placeholder="Enter IFSC code"
                  maxLength={11}
                  value={formData.ifscCode}
                  onChange={(e) => handleInputChange('ifscCode', e.target.value.toUpperCase())}
                  required
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: REQUIRED DOCUMENTS */}
          <div className="form-section">
            <h2 className="section-heading">Required Documents</h2>
            <div className="section-divider" />

            <div className="documents-grid agent-docs-grid">
              {/* LEFT: Aadhaar Card * */}
              <div className="upload-box-container">
                <div className="upload-box-header">
                  <span className="upload-title">
                    Aadhaar Card <span className="required-star">*</span>
                  </span>
                  <span className="upload-subtitle">Upload clear image of Aadhaar Card</span>
                  <span className="upload-format-note">JPG, PNG or PDF (Max. 10MB)</span>
                </div>

                <input
                  ref={aadhaarInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden-file-input"
                  onChange={handleAadhaarUpload}
                />

                {!aadhaarFile ? (
                  <div
                    className="upload-dropzone"
                    onClick={() => aadhaarInputRef.current?.click()}
                  >
                    <div className="upload-icon-wrap">
                      <FileText size={22} className="upload-icon" />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Upload size={14} />}
                      className="upload-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        aadhaarInputRef.current?.click();
                      }}
                    >
                      Upload Document
                    </Button>
                  </div>
                ) : (
                  <div className="upload-preview-box">
                    <div className="preview-thumb-col">
                      {isAadhaarPdf ? (
                        <div className="pdf-thumb-box">
                          <FileText size={22} className="pdf-icon" />
                          <span className="pdf-label">PDF</span>
                        </div>
                      ) : (
                        <img
                          src={aadhaarPreviewUrl}
                          alt="Aadhaar Thumbnail"
                          className="img-thumb"
                          onClick={handleViewAadhaar}
                        />
                      )}
                    </div>

                    <div className="preview-info-col">
                      <div className="preview-name-row">
                        <FileCheck size={14} className="check-icon" />
                        <span className="preview-filename" title={aadhaarFile.name}>
                          {aadhaarFile.name}
                        </span>
                      </div>
                      <span className="preview-filesize">
                        {formatFileSize(aadhaarFile.size)} • {isAadhaarPdf ? 'PDF File' : 'Image'}
                      </span>
                    </div>

                    <div className="preview-actions-col">
                      <button
                        type="button"
                        className="btn-action btn-action-view"
                        onClick={handleViewAadhaar}
                      >
                        <Eye size={13} />
                        <span>View</span>
                      </button>
                      <button
                        type="button"
                        className="btn-action btn-action-remove"
                        onClick={handleRemoveAadhaar}
                      >
                        <Trash2 size={13} />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT: Profile Image * */}
              <div className="upload-box-container">
                <div className="upload-box-header">
                  <span className="upload-title">
                    Profile Image <span className="required-star">*</span>
                  </span>
                  <span className="upload-subtitle">Upload clear image of Profile Image</span>
                  <span className="upload-format-note">JPG, PNG (Max. 5MB)</span>
                </div>

                <input
                  ref={profileImgInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  className="hidden-file-input"
                  onChange={handleProfileImageUpload}
                />

                {!profileImage ? (
                  <div
                    className="upload-dropzone"
                    onClick={() => profileImgInputRef.current?.click()}
                  >
                    <div className="upload-icon-wrap">
                      <Camera size={22} className="upload-icon" />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Upload size={14} />}
                      className="upload-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        profileImgInputRef.current?.click();
                      }}
                    >
                      Upload Document
                    </Button>
                  </div>
                ) : (
                  <div className="upload-preview-box">
                    <div className="preview-thumb-col">
                      <img
                        src={profilePreviewUrl}
                        alt="Profile Photo"
                        className="img-thumb profile-thumb-circle"
                      />
                    </div>

                    <div className="preview-info-col">
                      <div className="preview-name-row">
                        <FileCheck size={14} className="check-icon" />
                        <span className="preview-filename" title={profileImage.name}>
                          {profileImage.name}
                        </span>
                      </div>
                      <span className="preview-filesize">
                        {formatFileSize(profileImage.size)} • Profile Photo
                      </span>
                    </div>

                    <div className="preview-actions-col">
                      <button
                        type="button"
                        className="btn-action btn-action-change"
                        onClick={() => profileImgInputRef.current?.click()}
                      >
                        <RefreshCw size={13} />
                        <span>Change</span>
                      </button>
                      <button
                        type="button"
                        className="btn-action btn-action-remove"
                        onClick={handleRemoveProfileImg}
                      >
                        <Trash2 size={13} />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

      <div className="section-divider" />

          {/* BOTTOM ACTION BUTTONS */}
          <div className="form-actions-footer">
            <Button
              variant="secondary"
              size="md"
              onClick={() => navigate(onSuccessRedirect || ROUTES.MY_AGENTS)}
              className="btn-footer-cancel"
              >
                Cancel
              </Button>

            <Button
              variant="primary"
              size="md"
              type="submit"
              icon={<CheckCircle2 size={16} />}
              className="btn-footer-save"
              >
              Save Agent
            </Button>
          </div>
        </form>
      </div>

      {/* DOCUMENT PREVIEW MODAL */}
      <Modal
        show={docModalOpen}
        onHide={() => setDocModalOpen(false)}
        title={aadhaarFile ? `Aadhaar Document: ${aadhaarFile.name}` : 'Document Preview'}
        size="lg"
      >
        <div className="modal-preview-content">
          {isAadhaarPdf ? (
            <div className="pdf-container">
              <iframe
                src={aadhaarPreviewUrl}
                title="Aadhaar PDF Preview"
                className="pdf-iframe"
              />
              <div className="pdf-fallback-row">
                <span>Having trouble previewing?</span>
                <a
                  href={aadhaarPreviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pdf-external-link"
                >
                  <ExternalLink size={14} />
                  <span>Open PDF in New Tab</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="image-container">
              <img
                src={aadhaarPreviewUrl}
                alt="Aadhaar Preview"
                className="modal-full-img"
              />
            </div>
          )}
        </div>
      </Modal>

      <Modal
        show={confirmModalOpen}
        onHide={() => !isSaving && setConfirmModalOpen(false)}
        title="Confirm Agent Creation"
        size="md"
        className="confirm-agent-modal"
        footer={(
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
            <Button type="button" variant="secondary" className="confirm-cancel-btn" onClick={() => setConfirmModalOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="button" variant="primary" className="confirm-create-btn" onClick={confirmCreateAgent} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Yes, Create Agent'}
            </Button>
          </div>
        )}
      >
        <div style={{ display: 'grid', gap: '10px' }}>
          <div className="confirm-agent-intro"><div className="confirm-agent-icon"><CheckCircle2 size={22} /></div><div><strong>Ready to create this agent?</strong><span>The agent will be mapped to the selected relationship manager.</span></div></div>
          <div className="confirm-agent-summary"><div><span>Agent</span><strong>{formData.fullName || '-'}</strong></div><div><span>Relationship manager</span><strong>{isAdmin ? (formData.relationshipManager || 'Not selected') : (formData.relationshipManager || currentRmName || '-')}</strong></div><div><span>Branch</span><strong>{formData.branch || currentBranch || '-'}</strong></div><div><span>Mobile</span><strong>{formData.mobileNumber || '-'}</strong></div></div>
        </div>
      </Modal>
    </div>
  );
}
