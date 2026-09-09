import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  User,
  Phone,
  Mail,
  Briefcase,
  MapPin,
  Landmark,
  ArrowLeft,
  CheckCircle2,
  X,
  RefreshCw,
  Building2,
  Save,
  LoaderCircle,
  UserRound
} from 'lucide-react';
import {
  DocumentUploadCard,
  DocumentPreviewModal,
  fetchDocumentBlobUrl,
  isPdfUrl,
} from '../../components/DocumentUpload/DocumentUploadSection';
import {
  uploadAgentAadhaar,
  uploadAgentPan,
  uploadAgentProfileImage,
  getAgentProfileImageBlob,
} from '../../api/agentApi';
import { getProfileImageUrl } from '../../utils/profileImageHelper';
import { getFileUrl, isPdfFile, getAadhaarPath, getPanPath, getProfilePath, getDocumentUrl } from '../Dashboard/Dashboard';
import { generateUserCode } from '../../utils/codeGenerator';
import '../RelationshipManager/RelationshipManagerCreate.css';
import './AgentCreate.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';

const GENDER_OPTIONS = [
  { value: 1, label: 'Male' },
  { value: 2, label: 'Female' },
  { value: 3, label: 'Other' },
];

export default function AgentCreate({ onSuccessRedirect, agentId: agentIdProp } = {}) {
  const navigate = useNavigate();
  const { agentId: agentIdParam } = useParams();
  const editAgentId = agentIdProp || agentIdParam || null;
  const isEditMode = Boolean(editAgentId);

  const [existingAgent, setExistingAgent] = useState(null);
  const [loadingAgent, setLoadingAgent] = useState(Boolean(editAgentId));

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
  const currentRmName = currentUser?.fullName || currentUser?.name || 'Administrator';
  const currentBranch = currentUser?.branch || '';
  const isAdmin = true; // Master Module context
  const [rmOptions, setRmOptions] = useState([]);
  const [selectedRmId, setSelectedRmId] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    agentCode: '',
    fullName: '',
    dateOfBirth: '',
    genderId: '',
    relationshipManager: '',
    address: '',
    state: '',
    pincode: '',
    mobileNumber: '',
    emailAddress: '',
    dateJoined: new Date().toISOString().split('T')[0],
    role: 'Agent',
    branch: '',
    bankAccountNumber: '',
    ifscCode: '',
  });

  // Document states
  const [aadhaarFile, setAadhaarFile] = useState(null);
  const [aadhaarPreviewUrl, setAadhaarPreviewUrl] = useState(null);
  const [isAadhaarPdf, setIsAadhaarPdf] = useState(false);

  const [panFile, setPanFile] = useState(null);
  const [panPreviewUrl, setPanPreviewUrl] = useState(null);
  const [isPanPdf, setIsPanPdf] = useState(false);

  const [profileImage, setProfileImage] = useState(null);
  const [profilePreviewUrl, setProfilePreviewUrl] = useState(null);

  // Existing document states (for Edit Mode)
  const [existingAadhaarUrl, setExistingAadhaarUrl] = useState(null);
  const [existingAadhaarFileName, setExistingAadhaarFileName] = useState(null);
  const [isExistingAadhaarPdf, setIsExistingAadhaarPdf] = useState(false);

  const [existingPanUrl, setExistingPanUrl] = useState(null);
  const [existingPanFileName, setExistingPanFileName] = useState(null);
  const [isExistingPanPdf, setIsExistingPanPdf] = useState(false);

  const [existingProfileUrl, setExistingProfileUrl] = useState(null);

  // Lightbox Modal for viewing
  const [previewDoc, setPreviewDoc] = useState(null);
  const blobUrlsRef = useRef([]);

  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      });
      blobUrlsRef.current = [];
    };
  }, []);

  // Confirmation & status
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [createdAgentId, setCreatedAgentId] = useState(null);


  useEffect(() => {
    fetch(`${API_BASE}/RMMaster`)
      .then((response) => (response.ok ? response.json() : []))
      .then((result) => {
        const rows = Array.isArray(result) ? result : result?.data || [];
        const options = rows
          .map((rm) => ({
            id: rm.rmId || rm.RMId || rm.id,
            name:
              rm.fullName ||
              rm.name ||
              rm.rmName ||
              rm.RMName ||
              `${rm.firstName || ''} ${rm.lastName || ''}`.trim(),
            branch: rm.branch || rm.Branch || rm.branchName || rm.BranchName || rm.location || '',
          }))
          .filter((rm) => rm.id && rm.name);
        setRmOptions(options);
      })
      .catch(() => setRmOptions([]));
  }, []);

  useEffect(() => {
    if (!editAgentId) return undefined;
    let active = true;

    async function loadAgent() {
      setLoadingAgent(true);
      setErrorMessage('');
      try {
        const token = localStorage.getItem('authToken');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await fetch(`${API_BASE}/AgentMaster/${editAgentId}`, { headers });
        if (!response.ok) {
          throw new Error(`Failed to load agent (${response.status})`);
        }
        const details = await response.json();
        const record = Array.isArray(details)
          ? details[0]
          : details?.value?.[0] || details?.data || details;
        if (!active || !record) return;

        const rmIdValue = record.rmId || record.RMId || '';
        setExistingAgent(record);
        setSelectedRmId(rmIdValue ? String(rmIdValue) : '');
        setFormData({
          agentCode: record.agentCode || record.code || record.AgentCode || '',
          fullName: record.fullName || record.agentName || record.name || '',
          dateOfBirth: record.dateOfBirth ? String(record.dateOfBirth).slice(0, 10) : '',
          genderId: record.genderId ?? '',
          relationshipManager: record.rmName || record.relationshipManager || '',
          address: record.address || '',
          state: record.state || '',
          pincode: record.pincode || '',
          mobileNumber: record.mobileNumber || record.phone || '',
          emailAddress: record.emailAddress || record.email || '',
          dateJoined: record.dateJoined
            ? String(record.dateJoined).slice(0, 10)
            : new Date().toISOString().split('T')[0],
          role: record.role || 'Agent',
          branch: record.branch || record.branchName || '',
          bankAccountNumber: record.bankAccountNumber || '',
          ifscCode: record.ifscCode || '',
        });

        const realAgentId = record.agentId || record.AgentId || record.id || record.Id || editAgentId;
        const aadhaarPath = getAadhaarPath(record) || record.aadhaarDocumentPath || record.aadhaarPath || record.aadhaarCardPath || '';
        const panPath = getPanPath(record) || record.panCardPath || record.panDocumentPath || record.panPath || '';
        const profilePath = getProfilePath(record) || record.profileImagePath || record.profilePath || '';

        const aadhaarUrl = getDocumentUrl('Agent', realAgentId, 'aadhaar', aadhaarPath);
        const panUrl = getDocumentUrl('Agent', realAgentId, 'pan', panPath);

        console.log("Agent record:", record);
        console.log("Agent entityId:", realAgentId);
        console.log("Agent document type:", "Aadhaar Card");
        console.log("Final Agent document URL:", aadhaarUrl);
        console.log("Agent document type:", "PAN Card");
        console.log("Final Agent document URL:", panUrl);

        if (aadhaarPath) {
          setExistingAadhaarUrl(aadhaarUrl);
          setExistingAadhaarFileName(aadhaarPath.split('/').pop().split('\\').pop() || 'Aadhaar Card');
          setIsExistingAadhaarPdf(isPdfUrl(aadhaarPath));
        }

        if (panPath) {
          setExistingPanUrl(panUrl);
          setExistingPanFileName(panPath.split('/').pop().split('\\').pop() || 'PAN Card');
          setIsExistingPanPdf(isPdfUrl(panPath));
        }

        if (realAgentId) {
          const directProfileUrl = getProfileImageUrl('Agent', realAgentId);
          setExistingProfileUrl(directProfileUrl);
        }
      } catch (error) {
        if (active) {
          setErrorMessage(error.message || 'Failed to load agent details.');
        }
      } finally {
        if (active) setLoadingAgent(false);
      }
    }

    loadAgent();
    return () => {
      active = false;
    };
  }, [editAgentId]);

  const handlePreviewExisting = async (title, url, isPdfInitial = false) => {
    const isProfile = String(title || '').toLowerCase().includes('profile') || String(title || '').toLowerCase().includes('photo') || String(title || '').toLowerCase().includes('image');

    const effectiveUrl = isProfile && editAgentId ? getProfileImageUrl('Agent', editAgentId) : url;

    if (!effectiveUrl) return;

    if (isProfile) {
      setPreviewDoc({
        name: title,
        title,
        url: effectiveUrl,
        isPdf: false,
        loading: false,
      });
      return;
    }

    setPreviewDoc({
      name: title,
      title,
      url: effectiveUrl,
      isPdf: isPdfInitial,
      loading: true,
    });

    try {
      const blobResult = await fetchDocumentBlobUrl(effectiveUrl);
      if (blobResult?.url) {
        if (blobResult.isBlob) {
          blobUrlsRef.current.push(blobResult.url);
        }
        setPreviewDoc({
          name: title,
          title,
          url: blobResult.url,
          isPdf: blobResult.isPdf,
          loading: false,
        });
      } else {
        setPreviewDoc({
          name: title,
          title,
          url: effectiveUrl,
          isPdf: isPdfInitial,
          loading: false,
        });
      }
    } catch {
      setPreviewDoc({
        name: title,
        title,
        url: effectiveUrl,
        isPdf: isPdfInitial,
        loading: false,
      });
    }
  };

  const handleClosePreview = () => {
    blobUrlsRef.current.forEach((url) => {
      try {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      } catch {
        // ignore
      }
    });
    blobUrlsRef.current = [];
    setPreviewDoc(null);
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (!isEditMode && (field === 'fullName' || field === 'dateOfBirth' || field === 'mobileNumber')) {
        next.agentCode = generateUserCode(next.fullName, next.dateOfBirth, next.mobileNumber);
      }
      return next;
    });
  };

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

  // Document Handlers
  const handleAadhaarUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (aadhaarPreviewUrl) URL.revokeObjectURL(aadhaarPreviewUrl);
      setAadhaarFile(file);
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      setIsAadhaarPdf(isPdf);
      setAadhaarPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveAadhaar = () => {
    if (aadhaarPreviewUrl) URL.revokeObjectURL(aadhaarPreviewUrl);
    setAadhaarFile(null);
    setAadhaarPreviewUrl(null);
    setIsAadhaarPdf(false);
  };

  const handlePanUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (panPreviewUrl) URL.revokeObjectURL(panPreviewUrl);
      setPanFile(file);
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      setIsPanPdf(isPdf);
      setPanPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemovePan = () => {
    if (panPreviewUrl) URL.revokeObjectURL(panPreviewUrl);
    setPanFile(null);
    setPanPreviewUrl(null);
    setIsPanPdf(false);
  };

  const handleProfileImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (profilePreviewUrl) URL.revokeObjectURL(profilePreviewUrl);
      setProfileImage(file);
      setProfilePreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveProfileImg = () => {
    if (profilePreviewUrl) URL.revokeObjectURL(profilePreviewUrl);
    setProfileImage(null);
    setProfilePreviewUrl(null);
  };

  const validateForm = () => {
    const requiredFields = [
      ['fullName', 'full name'],
      ['dateOfBirth', 'date of birth'],
      ['genderId', 'gender'],
      ['address', 'address'],
      ['state', 'state'],
      ['pincode', 'pincode'],
      ['mobileNumber', 'mobile number'],
      ['dateJoined', 'date joined'],
      ['branch', 'branch'],
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

    if (!selectedRmId && !formData.relationshipManager) {
      return 'Please select a relationship manager.';
    }

    // PAN card validation
    if (!isEditMode && !createdAgentId && !panFile) {
      return 'Please upload the PAN card. PAN is mandatory for agent creation.';
    }

    if (panFile) {
      const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
      const fileName = panFile.name.toLowerCase();
      const isAllowedExt = allowedExtensions.some((ext) => fileName.endsWith(ext));
      const isAllowedMime = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
      ].includes(panFile.type?.toLowerCase());

      if (!isAllowedExt && !isAllowedMime) {
        return 'Please upload PAN card in PDF, JPG, JPEG, or PNG format only.';
      }

      if (panFile.size > 10 * 1024 * 1024) {
        return 'PAN card file size must not exceed 10MB.';
      }
    }

    return '';
  };

  const buildPayload = () => ({
    ...(existingAgent || {}),
    ...(isEditMode ? { agentId: Number(editAgentId) } : {}),
    ...(formData.agentCode ? { agentCode: formData.agentCode } : {}),
    fullName: formData.fullName.trim(),
    dateOfBirth: formData.dateOfBirth,
    genderId: Number(formData.genderId || 0),
    rmId: Number(selectedRmId || currentRmId || currentUser?.id || 1),
    address: formData.address.trim(),
    state: formData.state.trim(),
    pincode: formData.pincode.trim(),
    mobileNumber: formData.mobileNumber.trim(),
    emailAddress: formData.emailAddress.trim(),
    dateJoined: formData.dateJoined,
    role: formData.role.trim(),
    branch: formData.branch.trim() || currentBranch || '',
    isActive: existingAgent?.isActive ?? true,
    bankAccountNumber: formData.bankAccountNumber.trim(),
    ifscCode: formData.ifscCode.trim().toUpperCase(),
    createdBy: existingAgent?.createdBy ?? (currentRmId || Number(currentUser?.id || 1)),
    modifiedBy: currentRmId || Number(currentUser?.id || 1),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }
    setErrorMessage('');
    setConfirmModalOpen(true);
  };

  const confirmCreateAgent = async () => {
    setIsSaving(true);
    setErrorMessage('');

    try {
      let targetAgentId = isEditMode ? Number(editAgentId) : createdAgentId;

      if (!targetAgentId || isEditMode) {
        const payload = buildPayload();
        const endpoint = isEditMode
          ? `${API_BASE}/AgentMaster/${editAgentId}`
          : `${API_BASE}/AgentMaster`;
        const response = await fetch(endpoint, {
          method: isEditMode ? 'PUT' : 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorDetailsFromApi = errorText;
          try {
            errorDetailsFromApi = errorText ? JSON.parse(errorText) : null;
          } catch {}
          throw new Error(
            errorDetailsFromApi?.message ||
              errorDetailsFromApi?.Message ||
              errorText ||
              `Failed to save agent (${response.status})`
          );
        }

        let responseData = null;
        try {
          responseData = await response.json();
        } catch {}

        const extractedId =
          responseData?.agentId ||
          responseData?.AgentId ||
          responseData?.id ||
          responseData?.data?.agentId ||
          responseData?.value?.[0]?.agentId ||
          (typeof responseData === 'number' ? responseData : null) ||
          (isEditMode ? Number(editAgentId) : null);

        targetAgentId = extractedId;
        if (!isEditMode && extractedId) {
          setCreatedAgentId(extractedId);
        }
      }

      if (!targetAgentId) {
        throw new Error('Agent saved, but failed to retrieve Agent ID from server response.');
      }

      if (aadhaarFile && targetAgentId) {
        try {
          await uploadAgentAadhaar(targetAgentId, aadhaarFile);
        } catch (err) {
          console.warn('Agent Aadhaar upload failed:', err);
        }
      }

      if (panFile && targetAgentId) {
        try {
          await uploadAgentPan(targetAgentId, panFile);
        } catch (err) {
          console.warn('Agent PAN upload failed:', err);
        }
      }

      if (profileImage && targetAgentId) {
        try {
          await uploadAgentProfileImage(targetAgentId, profileImage);
        } catch (err) {
          console.warn('Agent Profile Image upload failed:', err);
        }
      }

      setConfirmModalOpen(false);
      setSubmittedSuccess(true);
      setTimeout(() => {
        setSubmittedSuccess(false);
        navigate(onSuccessRedirect || '/dashboard');
      }, 1200);
    } catch (error) {
      console.error('Failed to save agent:', error);
      setConfirmModalOpen(false);
      setErrorMessage(error.message || `Failed to ${isEditMode ? 'update' : 'create'} agent.`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="agent-master-create-page">
      {errorMessage && (
        <div className="agent-alert agent-alert-danger" role="alert">
          <span>{errorMessage}</span>
          <button
            type="button"
            className="agent-alert-close"
            onClick={() => setErrorMessage('')}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {loadingAgent && (
        <div className="agent-loading-banner">
          <RefreshCw size={18} className="spin-icon" />
          <span>Loading agent details...</span>
        </div>
      )}

      {submittedSuccess && (
        <div className="agent-alert agent-alert-success" role="status">
          <CheckCircle2 size={18} />
          <span>{isEditMode ? 'Agent updated successfully!' : 'Agent created successfully!'}</span>
        </div>
      )}

      <div className="agent-master-form-card">
        <form onSubmit={handleSubmit}>
          {/* SECTION 1: AGENT INFORMATION */}
          <section className="agent-form-section">
            <div className="agent-section-header">
              <div className="agent-section-title-wrap">
                <UserRound size={20} className="agent-section-icon" />
                <div>
                  <h2 className="agent-section-heading">
                    {isEditMode ? 'Edit Agent' : 'Agent Information'}
                  </h2>
                  <p className="agent-section-sub">
                    Personal, location, and banking details for this agent.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="agent-back-btn"
                onClick={() => navigate(onSuccessRedirect || '/dashboard')}
              >
                <ArrowLeft size={15} /> Back
              </button>
            </div>

            <div className="agent-form-grid">
              {/* Row 1 */}
              <div className="agent-field-group">
                <label className="agent-field-label">
                  Agent Code <span className="req-star">*</span>
                </label>
                <input
                  type="text"
                  className="agent-input rm-code-input agent-input-readonly"
                  value={formData.agentCode || ''}
                  readOnly
                  disabled
                />
                <small className="rm-field-hint">
                  {isEditMode ? 'System code' : 'Generated automatically'}
                </small>
              </div>

              <div className="agent-field-group">
                <label className="agent-field-label">
                  Full Name <span className="req-star">*</span>
                </label>
                <input
                  type="text"
                  className="agent-input"
                  placeholder="Enter full name"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  required
                />
              </div>

              <div className="agent-field-group">
                <label className="agent-field-label">
                  Date of Birth <span className="req-star">*</span>
                </label>
                <input
                  type="date"
                  className="agent-input"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              <div className="agent-field-group">
                <label className="agent-field-label">
                  Gender <span className="req-star">*</span>
                </label>
                <select
                  className="agent-input"
                  value={formData.genderId}
                  onChange={(e) => handleInputChange('genderId', e.target.value)}
                  required
                >
                  <option value="">Select gender</option>
                  {GENDER_OPTIONS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 2 */}
              <div className="agent-field-group">
                <label className="agent-field-label">
                  Relationship Manager <span className="req-star">*</span>
                </label>
                <select
                  className="agent-input"
                  value={selectedRmId}
                  onChange={(e) => {
                    const option = rmOptions.find((rm) => String(rm.id) === e.target.value);
                    setSelectedRmId(e.target.value);
                    handleInputChange('relationshipManager', option?.name || '');
                    if (option?.branch) handleInputChange('branch', option.branch);
                  }}
                  required
                >
                  <option value="">Select relationship manager</option>
                  {rmOptions.map((rm) => (
                    <option key={rm.id} value={rm.id}>
                      {rm.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="agent-field-group">
                <label className="agent-field-label">
                  Branch <span className="req-star">*</span>
                </label>
                <input
                  type="text"
                  className="agent-input"
                  placeholder="Enter or select branch"
                  value={formData.branch}
                  onChange={(e) => handleInputChange('branch', e.target.value)}
                  required
                />
              </div>

              <div className="agent-field-group">
                <label className="agent-field-label">
                  Mobile Number <span className="req-star">*</span>
                </label>
                <input
                  type="tel"
                  className="agent-input"
                  placeholder="10-digit mobile"
                  maxLength={10}
                  value={formData.mobileNumber}
                  onChange={(e) =>
                    handleInputChange('mobileNumber', e.target.value.replace(/\D/g, ''))
                  }
                  required
                />
              </div>

              {/* Address (Span 2 or full) */}
              <div className="agent-field-group agent-field-wide">
                <label className="agent-field-label">
                  Address <span className="req-star">*</span>
                </label>
                <input
                  type="text"
                  className="agent-input"
                  placeholder="Enter complete address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  required
                />
              </div>

              <div className="agent-field-group">
                <label className="agent-field-label">
                  Mail ID <span className="agent-optional-hint">(Optional)</span>
                </label>
                <input
                  type="email"
                  className="agent-input"
                  placeholder="Enter email address"
                  value={formData.emailAddress}
                  onChange={(e) => handleInputChange('emailAddress', e.target.value)}
                />
              </div>

              {/* Row 4 */}
              <div className="agent-field-group">
                <label className="agent-field-label">
                  State <span className="req-star">*</span>
                </label>
                <input
                  type="text"
                  className="agent-input"
                  placeholder="Enter state"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  required
                />
              </div>

              <div className="agent-field-group">
                <label className="agent-field-label">
                  Pincode <span className="req-star">*</span>
                </label>
                <input
                  type="text"
                  className="agent-input"
                  placeholder="6-digit pincode"
                  maxLength={6}
                  value={formData.pincode}
                  onChange={(e) =>
                    handleInputChange('pincode', e.target.value.replace(/\D/g, ''))
                  }
                  required
                />
              </div>

              <div className="agent-field-group">
                <label className="agent-field-label">
                  Date Joined <span className="req-star">*</span>
                </label>
                <input
                  type="date"
                  className="agent-input"
                  value={formData.dateJoined}
                  onChange={(e) => handleInputChange('dateJoined', e.target.value)}
                  required
                />
              </div>

              {/* Row 5: Banking */}
              <div className="agent-field-group">
                <label className="agent-field-label">
                  Bank Account Number <span className="req-star">*</span>
                </label>
                <input
                  type="text"
                  className="agent-input"
                  placeholder="Enter account number"
                  value={formData.bankAccountNumber}
                  onChange={(e) => handleInputChange('bankAccountNumber', e.target.value)}
                  required
                />
              </div>

              <div className="agent-field-group">
                <label className="agent-field-label">
                  IFSC Code <span className="req-star">*</span>
                </label>
                <input
                  type="text"
                  className="agent-input text-uppercase"
                  placeholder="Enter IFSC code"
                  maxLength={11}
                  value={formData.ifscCode}
                  onChange={(e) => handleInputChange('ifscCode', e.target.value.toUpperCase())}
                  required
                />
              </div>

              <div className="agent-field-group">
                <label className="agent-field-label">
                  Role <span className="req-star">*</span>
                </label>
                <input
                  type="text"
                  className="agent-input agent-input-readonly"
                  value={formData.role}
                  readOnly
                />
              </div>
            </div>
          </section>

          {/* SECTION 2: REQUIRED DOCUMENTS */}
          <section className="agent-form-section">
            <div className="agent-section-title-wrap">
              <Building2 size={20} className="agent-section-icon" />
              <div>
                <h2 className="agent-section-heading">Required Documents</h2>
                <p className="agent-section-sub">
                  Upload verification documents and photographs for this agent account.
                </p>
              </div>
            </div>

            <div className="doc-upload-grid">
              {/* 1. Aadhaar Card */}
              <DocumentUploadCard
                title="Aadhaar Card"
                required={!isEditMode && !existingAadhaarUrl}
                subtitle={
                  isEditMode && existingAadhaarUrl
                    ? 'Existing document uploaded. Select new file to replace.'
                    : 'Upload clear image of Aadhaar Card'
                }
                note="JPG, PNG or PDF (Max. 10MB)"
                accept=".pdf,.jpg,.jpeg,.png"
                icon="document"
                file={aadhaarFile}
                previewUrl={aadhaarPreviewUrl}
                isPdf={isAadhaarPdf}
                isExisting={!aadhaarFile && Boolean(existingAadhaarUrl)}
                existingUrl={existingAadhaarUrl}
                existingFileName={existingAadhaarFileName}
                onViewExisting={() =>
                  handlePreviewExisting(
                    'Aadhaar Card',
                    existingAadhaarUrl,
                    isExistingAadhaarPdf
                  )
                }
                onUpload={handleAadhaarUpload}
                onRemove={handleRemoveAadhaar}
                onView={() =>
                  setPreviewDoc({
                    name: aadhaarFile?.name || 'Aadhaar Card',
                    url: aadhaarPreviewUrl,
                    isPdf: isAadhaarPdf,
                  })
                }
              />

              {/* 2. PAN Card */}
              <DocumentUploadCard
                title="PAN Card"
                required={!isEditMode && !existingPanUrl}
                subtitle={
                  isEditMode && existingPanUrl
                    ? 'Existing document uploaded. Select new file to replace.'
                    : 'Upload clear image of PAN Card (mandatory)'
                }
                note="JPG, PNG or PDF (Max. 10MB)"
                accept=".pdf,.jpg,.jpeg,.png"
                icon="document"
                file={panFile}
                previewUrl={panPreviewUrl}
                isPdf={isPanPdf}
                isExisting={!panFile && Boolean(existingPanUrl)}
                existingUrl={existingPanUrl}
                existingFileName={existingPanFileName}
                onViewExisting={() =>
                  handlePreviewExisting(
                    'PAN Card',
                    existingPanUrl,
                    isExistingPanPdf
                  )
                }
                onUpload={handlePanUpload}
                onRemove={handleRemovePan}
                onView={() =>
                  setPreviewDoc({
                    name: panFile?.name || 'PAN Card',
                    url: panPreviewUrl,
                    isPdf: isPanPdf,
                  })
                }
              />

              {/* 3. Profile Image */}
              <DocumentUploadCard
                title="Profile Image"
                required={!isEditMode && !existingProfileUrl}
                subtitle={
                  isEditMode && existingProfileUrl
                    ? 'Existing photo uploaded. Select new image to replace.'
                    : 'Upload clear image of Profile Image'
                }
                note="JPG, PNG (Max. 5MB)"
                accept=".jpg,.jpeg,.png"
                icon="camera"
                file={profileImage}
                previewUrl={profilePreviewUrl}
                isProfile
                isExisting={!profileImage && Boolean(existingProfileUrl)}
                existingUrl={existingProfileUrl}
                existingFileName="Profile Photo"
                onViewExisting={() =>
                  handlePreviewExisting(
                    'Profile Photo',
                    existingProfileUrl,
                    false
                  )
                }
                onUpload={handleProfileImageUpload}
                onRemove={handleRemoveProfileImg}
                onView={() =>
                  setPreviewDoc({
                    name: profileImage?.name || 'Profile Image',
                    url: profilePreviewUrl,
                    isPdf: false,
                  })
                }
              />
            </div>
          </section>

          {/* FOOTER ACTIONS */}
          <div className="agent-form-footer">
            <button
              type="button"
              className="agent-btn-secondary"
              onClick={() => navigate(onSuccessRedirect || '/dashboard')}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="agent-btn-primary"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <LoaderCircle size={16} className="spin-icon" /> Saving...
                </>
              ) : (
                <>
                  <Save size={16} /> {isEditMode ? 'Update Agent' : 'Save Agent'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* DOCUMENT PREVIEW LIGHTBOX */}
      <DocumentPreviewModal
        isOpen={Boolean(previewDoc)}
        onClose={handleClosePreview}
        doc={previewDoc}
      />

      {/* CONFIRMATION POPUP */}
      {confirmModalOpen && (
        <div className="doc-modal-backdrop" onClick={() => !isSaving && setConfirmModalOpen(false)}>
          <div
            className="doc-modal-dialog"
            style={{ maxWidth: '480px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="doc-modal-header">
              <span className="doc-modal-title">
                {isEditMode ? 'Confirm Agent Update' : 'Confirm Agent Creation'}
              </span>
              <button
                type="button"
                className="doc-modal-close-btn"
                onClick={() => setConfirmModalOpen(false)}
                disabled={isSaving}
              >
                <X size={18} />
              </button>
            </div>
            <div className="doc-modal-body" style={{ minHeight: 'auto', flexDirection: 'column', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <CheckCircle2 size={24} color="#16a34a" />
                <div>
                  <strong>{isEditMode ? 'Update this agent profile?' : 'Ready to create this agent?'}</strong>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                    Agent and documents will be saved to the database.
                  </p>
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', width: '100%', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div><strong>Name:</strong> {formData.fullName}</div>
                <div><strong>Branch:</strong> {formData.branch || '-'}</div>
                <div><strong>Mobile:</strong> {formData.mobileNumber}</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '14px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
              <button
                type="button"
                className="agent-btn-secondary"
                onClick={() => setConfirmModalOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="agent-btn-primary"
                onClick={confirmCreateAgent}
                disabled={isSaving}
              >
                {isSaving ? 'Processing...' : (isEditMode ? 'Yes, Update' : 'Yes, Create Agent')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
