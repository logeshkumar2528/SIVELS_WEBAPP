import { useState, useRef } from 'react';
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
import { ROUTES } from '../../config/routeConfig';
import './AddAgent.css';

const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
];

export default function AddAgent() {
  const navigate = useNavigate();
  const aadhaarInputRef = useRef(null);
  const profileImgInputRef = useRef(null);

  // Form State matching the OLD UI exact fields
  const [formData, setFormData] = useState({
    // Row 1
    fullName: '',
    dateOfBirth: '',

    // Row 2
    gender: '',
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
    role: '',

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
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
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

  const handleSubmit = (e) => {
    e.preventDefault();
    // UI-only confirmation feedback
    setSubmittedSuccess(true);
    setTimeout(() => {
      setSubmittedSuccess(false);
    }, 4000);
  };

  return (
    <div className="agent-creation-page">
      {submittedSuccess && (
        <div className="agent-creation-toast" role="alert">
          <CheckCircle2 size={18} className="toast-icon" />
          <div className="toast-content">
            <span className="toast-title">Form Validated (UI Mode)</span>
            <span className="toast-desc">Agent profile form is filled. Backend integration will be connected in Phase 2.</span>
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
                onClick={() => navigate(ROUTES.MY_AGENTS)}
                className="agent-creation-back-btn"
              >
                Back to Agents
              </Button>
            </div>
            <div className="section-divider" />

            <div className="form-grid-2col">
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
                  value={formData.gender}
                  onChange={(val) => handleInputChange('gender', val)}
                  options={GENDER_OPTIONS}
                  placeholder="Select gender"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Relationship Manager <span className="required-star">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter Relationship Manager Name"
                  value={formData.relationshipManager}
                  onChange={(e) => handleInputChange('relationshipManager', e.target.value)}
                  required
                />
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
                  className="form-control"
                  placeholder="Enter role"
                  value={formData.role}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  required
                />
              </div>

              {/* Row 7: Branch * | Bank Account Number * */}
              <div className="form-group">
                <label className="form-label">
                  Branch <span className="required-star">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter branch"
                  value={formData.branch}
                  onChange={(e) => handleInputChange('branch', e.target.value)}
                  required
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

            <div className="documents-grid">
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
              onClick={() => navigate(ROUTES.MY_AGENTS)}
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
    </div>
  );
}
