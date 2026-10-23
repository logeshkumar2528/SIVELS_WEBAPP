import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Landmark, LoaderCircle, MapPin, Save, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createCreditHead,
  extractCreditHeadId,
  getCreditHeadById,
  updateCreditHead,
  uploadCreditHeadAadhaar,
  uploadCreditHeadPan,
  uploadCreditHeadProfileImage,
} from '../../api/creditHeadApi';
import { masterService } from '../../../../Core/src/services/masterService';
import { getBankBranches } from '../../api/masters/bankBranchApi';
import { getCurrentUserId } from '../../utils/authHelper';
import { DocumentPreviewModal, DocumentUploadCard, fetchDocumentBlobUrl, isPdfUrl } from '../../components/DocumentUpload/DocumentUploadSection';
import { getProfileImageUrl, getDocumentUrl } from '../../utils/profileImageHelper';
import { StaffRoleSelect, toRoleId } from '../../components/StaffRoleSelect/StaffRoleSelect';
import '../RelationshipManager/RelationshipManagerCreate.css';

const createInitialForm = () => ({
  creditHeadCode: '',
  fullName: '',
  dateOfBirth: '',
  genderId: '',
  address: '',
  stateId: '',
  cityId: '',
  districtId: '',
  pincode: '',
  mobileNumber: '',
  emailAddress: '',
  branch: '',
  dateJoined: new Date().toISOString().slice(0, 10),
  accountNumber: '',
  ifscCode: '',
});

const normalise = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.value)) return response.value;
  if (Array.isArray(response?.data?.value)) return response.data.value;
  return [];
};

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
const isValidIfsc = (value) => /^[A-Z]{4}0[A-Z0-9]{6}$/i.test(String(value || '').trim());
const isValidMobile = (value) => /^[6-9]\d{9}$/.test(String(value || '').trim());
const isValidPincode = (value) => /^\d{6}$/.test(String(value || '').trim());
const isValidAccount = (value) => /^\d{9,18}$/.test(String(value || '').trim());

export default function CreditHeadCreate({ onSuccessRedirect = '/credit-heads' } = {}) {
  const navigate = useNavigate();
  const { chId: chIdParam } = useParams();
  const editChId = chIdParam || null;
  const isEditMode = Boolean(editChId);

  const [form, setForm] = useState(createInitialForm);
  const [loadingMasterData, setLoadingMasterData] = useState(true);
  const [loadingRecord, setLoadingRecord] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isActive, setIsActive] = useState(true);
  const [staffRoleId, setStaffRoleId] = useState('');
  const [genders, setGenders] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [branches, setBranches] = useState([]);

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

  useEffect(() => {
    let active = true;
    setLoadingMasterData(true);

    Promise.all([
      masterService.getGenders(),
      masterService.getStates(),
      masterService.getCities(),
      masterService.getDistricts(),
      getBankBranches(),
    ])
      .then(([genderRes, stateRes, cityRes, districtRes, branchRes]) => {
        if (!active) return;
        setGenders(normalise(genderRes));
        setStates(normalise(stateRes));
        setCities(normalise(cityRes));
        setDistricts(normalise(districtRes));
        setBranches(normalise(branchRes));
      })
      .catch((err) => {
        console.error('Failed to load credit head master options:', err);
        if (active) setError('Unable to load master options. Please refresh and try again.');
      })
      .finally(() => {
        if (active) setLoadingMasterData(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isEditMode) return undefined;
    let active = true;

    async function loadRecord() {
      setLoadingRecord(true);
      setError('');
      try {
        const response = await getCreditHeadById(editChId);
        if (!active) return;
        const record = Array.isArray(response)
          ? response[0]
          : (response?.data !== undefined ? response.data : (response?.value?.[0] || response));

        if (!record) {
          throw new Error('Credit head details were not returned by server.');
        }

        setForm({
          creditHeadCode: record.creditHeadCode || record.code || '',
          fullName: record.fullName || record.name || '',
          dateOfBirth: record.dateOfBirth ? String(record.dateOfBirth).slice(0, 10) : '',
          genderId: record.genderId ? String(record.genderId) : '',
          address: record.address || '',
          stateId: record.stateId ? String(record.stateId) : '',
          cityId: record.cityId ? String(record.cityId) : '',
          districtId: record.districtId ? String(record.districtId) : '',
          pincode: record.pincode || '',
          mobileNumber: record.mobileNumber || record.phone || '',
          emailAddress: record.emailAddress || record.email || '',
          branch: record.branch || '',
          dateJoined: record.dateJoined ? String(record.dateJoined).slice(0, 10) : new Date().toISOString().slice(0, 10),
          accountNumber: record.accountNumber || '',
          ifscCode: record.ifscCode || '',
        });

        setIsActive(record.isActive !== false);

        const aadhaarPath = record.aadhaarDocumentPath || record.aadharDocumentPath || record.aadhaarPath || record.aadharPath || record.AadhaarDocumentPath || '';
        const panPath = record.panCardPath || record.panDocumentPath || record.panPath || record.PanCardPath || '';
        const profilePath = record.profileImagePath || record.profilePath || record.ProfileImagePath || '';

        if (aadhaarPath) {
          const url = getDocumentUrl('CreditHead', editChId, 'aadhar', aadhaarPath);
          setExistingAadhaarUrl(url);
          setExistingAadhaarFileName(aadhaarPath.split('/').pop().split('\\').pop() || 'Aadhaar Card');
          setIsExistingAadhaarPdf(isPdfUrl(aadhaarPath));
        }

        if (panPath) {
          const url = getDocumentUrl('CreditHead', editChId, 'pan', panPath);
          setExistingPanUrl(url);
          setExistingPanFileName(panPath.split('/').pop().split('\\').pop() || 'PAN Card');
          setIsExistingPanPdf(isPdfUrl(panPath));
        }

        if (profilePath) {
          const directProfileUrl = getProfileImageUrl('CreditHead', editChId);
          setExistingProfileUrl(directProfileUrl);
        }
      } catch (err) {
        if (active) {
          setError(err.response?.data?.message || err.message || 'Unable to load credit head details.');
        }
      } finally {
        if (active) setLoadingRecord(false);
      }
    }

    loadRecord();
    return () => {
      active = false;
    };
  }, [editChId, isEditMode]);

  const handlePreviewExisting = async (title, url, isPdfInitial = false) => {
    const isProfile = String(title || '').toLowerCase().includes('profile') || String(title || '').toLowerCase().includes('photo') || String(title || '').toLowerCase().includes('image');
    const effectiveUrl = isProfile && editChId ? getProfileImageUrl('CreditHead', editChId) : url;

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
      const blobUrl = await fetchDocumentBlobUrl(effectiveUrl);
      blobUrlsRef.current.push(blobUrl);
      setPreviewDoc((prev) => {
        if (!prev || prev.url !== effectiveUrl) return prev;
        return {
          ...prev,
          url: blobUrl,
          loading: false,
        };
      });
    } catch (err) {
      console.error('Failed to download document blob:', err);
      setPreviewDoc((prev) => {
        if (!prev || prev.url !== effectiveUrl) return prev;
        return {
          ...prev,
          loading: false,
          error: 'Unable to load preview securely. You may still open the link directly.',
        };
      });
    }
  };

  const filteredDistricts = useMemo(() => {
    if (!form.stateId) return districts;
    return districts.filter((d) => String(d.stateId) === String(form.stateId));
  }, [districts, form.stateId]);

  const filteredCities = useMemo(() => {
    if (!form.stateId && !form.districtId) return cities;
    return cities.filter((c) => {
      const matchState = !form.stateId || String(c.stateId) === String(form.stateId);
      const matchDistrict = !form.districtId || String(c.districtId) === String(form.districtId);
      return matchState && matchDistrict;
    });
  }, [cities, form.stateId, form.districtId]);

  const handleFieldChange = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'stateId') {
        next.districtId = '';
        next.cityId = '';
      } else if (field === 'districtId') {
        next.cityId = '';
      }
      return next;
    });

    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleAadhaarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    const isValidFormat = isPdf || /\.(jpg|jpeg|png)$/i.test(file.name);

    if (!isValidFormat) {
      toast.error('Aadhaar must be a PDF, JPG, JPEG, or PNG file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit.');
      return;
    }

    if (aadhaarPreviewUrl) URL.revokeObjectURL(aadhaarPreviewUrl);
    setAadhaarFile(file);
    setIsAadhaarPdf(isPdf);
    setAadhaarPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveAadhaar = () => {
    if (aadhaarPreviewUrl) URL.revokeObjectURL(aadhaarPreviewUrl);
    setAadhaarFile(null);
    setAadhaarPreviewUrl(null);
    setIsAadhaarPdf(false);
  };

  const handlePanUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    const isValidFormat = isPdf || /\.(jpg|jpeg|png)$/i.test(file.name);

    if (!isValidFormat) {
      toast.error('PAN must be a PDF, JPG, JPEG, or PNG file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit.');
      return;
    }

    if (panPreviewUrl) URL.revokeObjectURL(panPreviewUrl);
    setPanFile(file);
    setIsPanPdf(isPdf);
    setPanPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemovePan = () => {
    if (panPreviewUrl) URL.revokeObjectURL(panPreviewUrl);
    setPanFile(null);
    setPanPreviewUrl(null);
    setIsPanPdf(false);
  };

  const handleProfileImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!/\.(jpg|jpeg|png|webp)$/i.test(file.name)) {
      toast.error('Profile photo must be a JPG, JPEG, PNG, or WebP image.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit.');
      return;
    }

    if (profilePreviewUrl) URL.revokeObjectURL(profilePreviewUrl);
    setProfileImage(file);
    setProfilePreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveProfileImage = () => {
    if (profilePreviewUrl) URL.revokeObjectURL(profilePreviewUrl);
    setProfileImage(null);
    setProfilePreviewUrl(null);
  };

  const validate = () => {
    const errors = {};

    if (!form.fullName.trim()) errors.fullName = 'Full name is required.';
    if (!form.dateOfBirth) errors.dateOfBirth = 'Date of birth is required.';
    if (!form.genderId) errors.genderId = 'Gender is required.';
    if (!form.address.trim()) errors.address = 'Address is required.';
    if (!form.stateId) errors.stateId = 'State is required.';
    if (!form.cityId) errors.cityId = 'City is required.';
    if (!form.districtId) errors.districtId = 'District is required.';

    if (!form.pincode.trim()) {
      errors.pincode = 'Pincode is required.';
    } else if (!isValidPincode(form.pincode)) {
      errors.pincode = 'Pincode must be a 6-digit number.';
    }

    if (!form.mobileNumber.trim()) {
      errors.mobileNumber = 'Mobile number is required.';
    } else if (!isValidMobile(form.mobileNumber)) {
      errors.mobileNumber = 'Mobile number must be a valid 10-digit number.';
    }

    if (form.emailAddress.trim() && !isValidEmail(form.emailAddress)) {
      errors.emailAddress = 'Invalid email address format.';
    }

    if (!form.branch.trim()) errors.branch = 'Branch is required.';
    if (!form.dateJoined) errors.dateJoined = 'Date joined is required.';

    if (!form.accountNumber.trim()) {
      errors.accountNumber = 'Account number is required.';
    } else if (!isValidAccount(form.accountNumber)) {
      errors.accountNumber = 'Account number must be 9 to 18 digits.';
    }

    if (!form.ifscCode.trim()) {
      errors.ifscCode = 'IFSC code is required.';
    } else if (!isValidIfsc(form.ifscCode)) {
      errors.ifscCode = 'IFSC code must match standard format (e.g., SBIN0001234).';
    }

    if (!isEditMode && !aadhaarFile) {
      errors.aadhaar = 'Aadhaar document is mandatory for new credit heads.';
    }

    if (!isEditMode && !panFile) {
      errors.pan = 'PAN card document is mandatory for new credit heads.';
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validate();
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      setError(firstError);
      toast.error(firstError);
      return;
    }

    setSaving(true);
    setError('');

    try {
      const currentAdminId = getCurrentUserId() || null;
      let targetChId = editChId ? Number(editChId) : null;

      if (isEditMode) {
        const updatePayload = {
          creditHeadId: Number(editChId),
          creditHeadCode: form.creditHeadCode ? form.creditHeadCode.trim() : '',
          fullName: form.fullName.trim(),
          dateOfBirth: form.dateOfBirth,
          genderId: Number(form.genderId || 0),
          address: form.address.trim(),
          stateId: Number(form.stateId || 0),
          cityId: Number(form.cityId || 0),
          districtId: Number(form.districtId || 0),
          pincode: form.pincode.trim(),
          mobileNumber: form.mobileNumber.trim(),
          emailAddress: form.emailAddress.trim() || null,
          branch: form.branch.trim(),
          dateJoined: form.dateJoined,
          accountNumber: form.accountNumber.trim(),
          ifscCode: form.ifscCode.trim().toUpperCase(),
          userId: null,
          isActive,
          roleId: toRoleId(staffRoleId),
          modifiedBy: currentAdminId,
        };

        await updateCreditHead(editChId, updatePayload);
      } else {
        const createPayload = {
          fullName: form.fullName.trim(),
          dateOfBirth: form.dateOfBirth,
          genderId: Number(form.genderId || 0),
          address: form.address.trim(),
          stateId: Number(form.stateId || 0),
          cityId: Number(form.cityId || 0),
          districtId: Number(form.districtId || 0),
          pincode: form.pincode.trim(),
          mobileNumber: form.mobileNumber.trim(),
          emailAddress: form.emailAddress.trim() || null,
          branch: form.branch.trim(),
          dateJoined: form.dateJoined,
          accountNumber: form.accountNumber.trim(),
          ifscCode: form.ifscCode.trim().toUpperCase(),
          userId: null,
          isActive,
          roleId: toRoleId(staffRoleId),
          createdBy: currentAdminId,
        };

        const response = await createCreditHead(createPayload);
        targetChId = extractCreditHeadId(response);
        if (!targetChId) {
          throw new Error('Credit head saved, but failed to retrieve Credit Head ID from server response.');
        }
      }

      // Document uploads / replacements based on existing backend availability
      const shouldReplaceAadhaar = Boolean(isEditMode && existingAadhaarUrl);
      if (aadhaarFile && targetChId) {
        await uploadCreditHeadAadhaar(targetChId, aadhaarFile, shouldReplaceAadhaar);
      }

      const shouldReplacePan = Boolean(isEditMode && existingPanUrl);
      if (panFile && targetChId) {
        await uploadCreditHeadPan(targetChId, panFile, shouldReplacePan);
      }

      const shouldReplaceProfile = Boolean(isEditMode && existingProfileUrl);
      if (profileImage && targetChId) {
        await uploadCreditHeadProfileImage(targetChId, profileImage, shouldReplaceProfile);
      }

      toast.success(isEditMode ? 'Credit head updated successfully!' : 'Credit head created successfully!');
      navigate(onSuccessRedirect);
    } catch (err) {
      console.error('Failed to save credit head:', err);
      const apiMessage = err?.response?.data?.message || err?.response?.data?.title || err?.message || 'Failed to save credit head.';
      setError(apiMessage);
      toast.error(apiMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="masters-page rm-create-page">
      <button className="people-dir-back-btn" onClick={() => navigate(onSuccessRedirect)} type="button">
        <ArrowLeft size={16} /> Back to Credit Heads
      </button>

      <header className="rm-hero" style={{ marginTop: '16px' }}>
        <div className="rm-hero-icon" style={{ background: 'linear-gradient(145deg, #4f46e5, #4338ca)' }}>
          <Landmark size={26} />
        </div>
        <div>
          <span className="rm-eyebrow">CREDIT HEAD MANAGEMENT</span>
          <h1>{isEditMode ? 'Edit Credit Head' : 'Add Credit Head'}</h1>
          <p>
            {isEditMode
              ? 'Update personal details, branch assignments, and compliance documents.'
              : 'Onboard a new credit head to manage loan evaluation, sanctions, and regional portfolios.'}
          </p>
        </div>
      </header>

      {error && (
        <div
          style={{
            marginBottom: '20px',
            padding: '14px 18px',
            borderRadius: '10px',
            background: '#fff1f0',
            border: '1px solid #ffccc7',
            color: '#cf1322',
            fontSize: '13px',
          }}
          role="status"
        >
          {error}
        </div>
      )}

      {(loadingMasterData || loadingRecord) && (
        <div className="rm-create-card" style={{ display: 'grid', placeItems: 'center', minHeight: '280px' }}>
          <LoaderCircle size={24} className="rm-spinner" />
          <p style={{ marginTop: '10px', color: '#64748b' }}>
            {loadingRecord ? 'Loading credit head details…' : 'Loading master options…'}
          </p>
        </div>
      )}

      {!loadingMasterData && !loadingRecord && (
        <form className="rm-create-card" onSubmit={handleSubmit} noValidate>
          {/* Section 1: Personal Details */}
          <section className="rm-section">
            <div className="rm-section-heading">
              <UserRound size={19} />
              <div>
                <h2>Personal Details</h2>
                <p>Basic information used to identify the credit head.</p>
              </div>
            </div>

            <div className="rm-form-grid">
              {isEditMode && form.creditHeadCode && (
                <div className="form-group">
                  <label className="form-label" htmlFor="creditHeadCode">Credit Head Code</label>
                  <input
                    id="creditHeadCode"
                    type="text"
                    value={form.creditHeadCode}
                    disabled
                    readOnly
                    className="form-input rm-code-input"
                  />
                  <small className="rm-field-hint">Generated by backend</small>
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="fullName">Full Name <b style={{ color: '#da1e28' }}>*</b></label>
                <input
                  id="fullName"
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  className={`form-input ${fieldErrors.fullName ? 'rm-invalid' : ''}`}
                  value={form.fullName}
                  onChange={(e) => handleFieldChange('fullName', e.target.value)}
                  disabled={saving}
                />
                {fieldErrors.fullName && <small className="rm-validation-error">{fieldErrors.fullName}</small>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="dateOfBirth">Date of Birth <b style={{ color: '#da1e28' }}>*</b></label>
                <input
                  id="dateOfBirth"
                  type="date"
                  className={`form-input ${fieldErrors.dateOfBirth ? 'rm-invalid' : ''}`}
                  value={form.dateOfBirth}
                  onChange={(e) => handleFieldChange('dateOfBirth', e.target.value)}
                  disabled={saving}
                />
                {fieldErrors.dateOfBirth && <small className="rm-validation-error">{fieldErrors.dateOfBirth}</small>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="genderId">Gender <b style={{ color: '#da1e28' }}>*</b></label>
                <select
                  id="genderId"
                  className={`form-input ${fieldErrors.genderId ? 'rm-invalid' : ''}`}
                  value={form.genderId}
                  onChange={(e) => handleFieldChange('genderId', e.target.value)}
                  disabled={saving}
                >
                  <option value="">Select gender</option>
                  {genders.map((g) => {
                    const id = g.genderId ?? g.id;
                    const name = g.genderName ?? g.name;
                    return (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    );
                  })}
                </select>
                {fieldErrors.genderId && <small className="rm-validation-error">{fieldErrors.genderId}</small>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="mobileNumber">Mobile Number <b style={{ color: '#da1e28' }}>*</b></label>
                <input
                  id="mobileNumber"
                  type="tel"
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  className={`form-input ${fieldErrors.mobileNumber ? 'rm-invalid' : ''}`}
                  value={form.mobileNumber}
                  onChange={(e) => handleFieldChange('mobileNumber', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  disabled={saving}
                />
                {fieldErrors.mobileNumber && <small className="rm-validation-error">{fieldErrors.mobileNumber}</small>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="emailAddress">Email Address</label>
                <input
                  id="emailAddress"
                  type="email"
                  placeholder="e.g. credit.head@sivels.com"
                  className={`form-input ${fieldErrors.emailAddress ? 'rm-invalid' : ''}`}
                  value={form.emailAddress}
                  onChange={(e) => handleFieldChange('emailAddress', e.target.value)}
                  disabled={saving}
                />
                {fieldErrors.emailAddress && <small className="rm-validation-error">{fieldErrors.emailAddress}</small>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="branch">Branch <b style={{ color: '#da1e28' }}>*</b></label>
                <select
                  id="branch"
                  className={`form-input ${fieldErrors.branch ? 'rm-invalid' : ''}`}
                  value={form.branch}
                  onChange={(e) => handleFieldChange('branch', e.target.value)}
                  disabled={saving}
                >
                  <option value="">Select branch</option>
                  {branches.map((b) => {
                    const id = b.branchId ?? b.id;
                    const name = b.branchName ?? b.branch ?? b.name;
                    return (
                      <option key={id || name} value={name}>
                        {name}
                      </option>
                    );
                  })}
                </select>
                {fieldErrors.branch && <small className="rm-validation-error">{fieldErrors.branch}</small>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="dateJoined">Date Joined <b style={{ color: '#da1e28' }}>*</b></label>
                <input
                  id="dateJoined"
                  type="date"
                  className={`form-input ${fieldErrors.dateJoined ? 'rm-invalid' : ''}`}
                  value={form.dateJoined}
                  onChange={(e) => handleFieldChange('dateJoined', e.target.value)}
                  disabled={saving}
                />
                {fieldErrors.dateJoined && <small className="rm-validation-error">{fieldErrors.dateJoined}</small>}
              </div>
            </div>
          </section>

          {/* Section 2: Address & Location */}
          <section className="rm-section">
            <div className="rm-section-heading">
              <MapPin size={19} />
              <div>
                <h2>Address & Location</h2>
                <p>Residential and location details of the credit head.</p>
              </div>
            </div>

            <div className="rm-form-grid">
              <div className="form-group rm-field-wide">
                <label className="form-label" htmlFor="address">Address <b style={{ color: '#da1e28' }}>*</b></label>
                <input
                  id="address"
                  type="text"
                  placeholder="Enter complete residential/work address"
                  className={`form-input ${fieldErrors.address ? 'rm-invalid' : ''}`}
                  value={form.address}
                  onChange={(e) => handleFieldChange('address', e.target.value)}
                  disabled={saving}
                />
                {fieldErrors.address && <small className="rm-validation-error">{fieldErrors.address}</small>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="stateId">State <b style={{ color: '#da1e28' }}>*</b></label>
                <select
                  id="stateId"
                  className={`form-input ${fieldErrors.stateId ? 'rm-invalid' : ''}`}
                  value={form.stateId}
                  onChange={(e) => handleFieldChange('stateId', e.target.value)}
                  disabled={saving}
                >
                  <option value="">Select state</option>
                  {states.map((s) => {
                    const id = s.stateId ?? s.id;
                    const name = s.stateName ?? s.name;
                    return (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    );
                  })}
                </select>
                {fieldErrors.stateId && <small className="rm-validation-error">{fieldErrors.stateId}</small>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="districtId">District <b style={{ color: '#da1e28' }}>*</b></label>
                <select
                  id="districtId"
                  className={`form-input ${fieldErrors.districtId ? 'rm-invalid' : ''}`}
                  value={form.districtId}
                  onChange={(e) => handleFieldChange('districtId', e.target.value)}
                  disabled={saving || !form.stateId}
                >
                  <option value="">{form.stateId ? 'Select district' : 'Select state first'}</option>
                  {filteredDistricts.map((d) => {
                    const id = d.districtId ?? d.id;
                    const name = d.districtName ?? d.name;
                    return (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    );
                  })}
                </select>
                {fieldErrors.districtId && <small className="rm-validation-error">{fieldErrors.districtId}</small>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="cityId">City <b style={{ color: '#da1e28' }}>*</b></label>
                <select
                  id="cityId"
                  className={`form-input ${fieldErrors.cityId ? 'rm-invalid' : ''}`}
                  value={form.cityId}
                  onChange={(e) => handleFieldChange('cityId', e.target.value)}
                  disabled={saving || !form.stateId}
                >
                  <option value="">{form.stateId ? 'Select city' : 'Select state first'}</option>
                  {filteredCities.map((c) => {
                    const id = c.cityId ?? c.id;
                    const name = c.cityName ?? c.name;
                    return (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    );
                  })}
                </select>
                {fieldErrors.cityId && <small className="rm-validation-error">{fieldErrors.cityId}</small>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="pincode">Pincode <b style={{ color: '#da1e28' }}>*</b></label>
                <input
                  id="pincode"
                  type="text"
                  placeholder="6-digit pincode"
                  maxLength={6}
                  className={`form-input ${fieldErrors.pincode ? 'rm-invalid' : ''}`}
                  value={form.pincode}
                  onChange={(e) => handleFieldChange('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={saving}
                />
                {fieldErrors.pincode && <small className="rm-validation-error">{fieldErrors.pincode}</small>}
              </div>
            </div>
          </section>

          {/* Section 3: Banking Details */}
          <section className="rm-section">
            <div className="rm-section-heading">
              <Landmark size={19} />
              <div>
                <h2>Banking Details</h2>
                <p>Salary account and payment processing details.</p>
              </div>
            </div>

            <div className="rm-form-grid">
              <div className="form-group">
                <label className="form-label" htmlFor="accountNumber">Account Number <b style={{ color: '#da1e28' }}>*</b></label>
                <input
                  id="accountNumber"
                  type="text"
                  placeholder="9 to 18-digit bank account number"
                  maxLength={18}
                  className={`form-input ${fieldErrors.accountNumber ? 'rm-invalid' : ''}`}
                  value={form.accountNumber}
                  onChange={(e) => handleFieldChange('accountNumber', e.target.value.replace(/\D/g, '').slice(0, 18))}
                  disabled={saving}
                />
                {fieldErrors.accountNumber && <small className="rm-validation-error">{fieldErrors.accountNumber}</small>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="ifscCode">IFSC Code <b style={{ color: '#da1e28' }}>*</b></label>
                <input
                  id="ifscCode"
                  type="text"
                  placeholder="e.g. SBIN0001234"
                  maxLength={11}
                  className={`form-input ${fieldErrors.ifscCode ? 'rm-invalid' : ''}`}
                  value={form.ifscCode}
                  onChange={(e) => handleFieldChange('ifscCode', e.target.value.toUpperCase().slice(0, 11))}
                  disabled={saving}
                />
                {fieldErrors.ifscCode && <small className="rm-validation-error">{fieldErrors.ifscCode}</small>}
              </div>
            </div>
          </section>

          {/* Section 4: Documents & KYC */}
          <section className="rm-section">
            <div className="rm-section-heading">
              <FileText size={19} />
              <div>
                <h2>Required Documents</h2>
                <p>Upload identification documents and profile image for this credit head.</p>
              </div>
            </div>

            <div className="doc-upload-grid">
              <div>
                <DocumentUploadCard
                  title="Aadhaar Card"
                  required={!isEditMode && !existingAadhaarUrl}
                  subtitle="Upload clear copy in PDF, JPG, or PNG format."
                  note="JPG, PNG or PDF (Max. 5MB)"
                  accept=".pdf,.jpg,.jpeg,.png"
                  icon="document"
                  file={aadhaarFile}
                  previewUrl={aadhaarPreviewUrl || existingAadhaarUrl}
                  isPdf={aadhaarFile ? isAadhaarPdf : isExistingAadhaarPdf}
                  isExisting={Boolean(!aadhaarFile && existingAadhaarUrl)}
                  existingUrl={existingAadhaarUrl}
                  existingFileName={existingAadhaarFileName}
                  onViewExisting={() => handlePreviewExisting('Aadhaar Card', existingAadhaarUrl, isExistingAadhaarPdf)}
                  onUpload={handleAadhaarUpload}
                  onRemove={handleRemoveAadhaar}
                  onView={() => setPreviewDoc({ name: aadhaarFile?.name || 'Aadhaar Card', title: 'Aadhaar Card', url: aadhaarPreviewUrl, isPdf: isAadhaarPdf })}
                />
                {fieldErrors.aadhaar && <small className="rm-validation-error" style={{ display: 'block', marginTop: '6px' }}>{fieldErrors.aadhaar}</small>}
              </div>

              <div>
                <DocumentUploadCard
                  title="PAN Card"
                  required={!isEditMode && !existingPanUrl}
                  subtitle="Upload clear copy in PDF, JPG, or PNG format."
                  note="JPG, PNG or PDF (Max. 5MB)"
                  accept=".pdf,.jpg,.jpeg,.png"
                  icon="document"
                  file={panFile}
                  previewUrl={panPreviewUrl || existingPanUrl}
                  isPdf={panFile ? isPanPdf : isExistingPanPdf}
                  isExisting={Boolean(!panFile && existingPanUrl)}
                  existingUrl={existingPanUrl}
                  existingFileName={existingPanFileName}
                  onViewExisting={() => handlePreviewExisting('PAN Card', existingPanUrl, isExistingPanPdf)}
                  onUpload={handlePanUpload}
                  onRemove={handleRemovePan}
                  onView={() => setPreviewDoc({ name: panFile?.name || 'PAN Card', title: 'PAN Card', url: panPreviewUrl, isPdf: isPanPdf })}
                />
                {fieldErrors.pan && <small className="rm-validation-error" style={{ display: 'block', marginTop: '6px' }}>{fieldErrors.pan}</small>}
              </div>

              <div>
                <DocumentUploadCard
                  title="Profile Image"
                  required={false}
                  subtitle="Upload passport size photograph in JPG, PNG or WebP format."
                  note="JPG, PNG or WebP (Max. 5MB)"
                  accept=".jpg,.jpeg,.png,.webp"
                  icon="camera"
                  file={profileImage}
                  previewUrl={profilePreviewUrl || existingProfileUrl}
                  isProfile
                  isExisting={Boolean(!profileImage && existingProfileUrl)}
                  existingUrl={existingProfileUrl}
                  existingFileName="Profile Photograph"
                  onViewExisting={() => handlePreviewExisting('Profile Image', existingProfileUrl, false)}
                  onUpload={handleProfileImageUpload}
                  onRemove={handleRemoveProfileImage}
                  onView={() => setPreviewDoc({ name: profileImage?.name || 'Profile Image', title: 'Profile Image', url: profilePreviewUrl, isPdf: false })}
                />
              </div>
            </div>
          </section>

          {/* Active Status Toggle */}
          <label className="rm-active">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              disabled={saving}
            />
            <span>
              <strong>Active Credit Head</strong>
              <small>Allow this credit head to evaluate and sanction loans.</small>
            </span>
          </label>
          <StaffRoleSelect
            legacyType="CreditHead"
            legacyId={editChId}
            value={staffRoleId}
            onChange={setStaffRoleId}
            disabled={saving || loadingRecord}
          />

          {/* Form Actions */}
          <div className="form-actions">
            <button
              type="button"
              className="masters-btn-secondary"
              onClick={() => navigate(onSuccessRedirect)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="masters-btn-primary"
              disabled={saving || loadingMasterData || loadingRecord}
            >
              {saving ? (
                <>
                  <LoaderCircle size={16} className="rm-spinner" /> Saving…
                </>
              ) : (
                <>
                  <Save size={16} /> {isEditMode ? 'Update Credit Head' : 'Create Credit Head'}
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        doc={previewDoc}
      />
    </div>
  );
}
