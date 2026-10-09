import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Landmark, LoaderCircle, MapPin, Save, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createCreditManager,
  extractCreditManagerId,
  getCreditManagerById,
  updateCreditManager,
  uploadCreditManagerAadhaar,
  uploadCreditManagerPan,
  uploadCreditManagerProfileImage,
} from '../../api/creditManagerApi';
import { masterService } from '../../../../Core/src/services/masterService';
import { getBankBranches } from '../../api/masters/bankBranchApi';
import { getCurrentUserId } from '../../utils/authHelper';
import { DocumentPreviewModal, DocumentUploadCard, fetchDocumentBlobUrl, isPdfUrl } from '../../components/DocumentUpload/DocumentUploadSection';
import { getProfileImageUrl, getDocumentUrl } from '../../utils/profileImageHelper';
import '../RelationshipManager/RelationshipManagerCreate.css';

const createInitialForm = () => ({
  creditManagerCode: '',
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

export default function CreditManagerCreate({ onSuccessRedirect = '/credit-managers' } = {}) {
  const navigate = useNavigate();
  const { cmId: cmIdParam } = useParams();
  const editCmId = cmIdParam || null;
  const isEditMode = Boolean(editCmId);

  const [form, setForm] = useState(createInitialForm);
  const [loadingMasterData, setLoadingMasterData] = useState(true);
  const [loadingRecord, setLoadingRecord] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isActive, setIsActive] = useState(true);
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
        console.error('Failed to load credit manager master options:', err);
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
        const response = await getCreditManagerById(editCmId);
        const record = Array.isArray(response)
          ? response[0]
          : response?.value?.[0] || response?.data?.value?.[0] || response?.data || response;

        if (!active || !record) {
          throw new Error('Credit manager record not found.');
        }

        setForm({
          creditManagerCode: record.creditManagerCode || record.CreditManagerCode || record.code || record.Code || '',
          fullName: record.fullName || record.FullName || record.name || record.Name || '',
          dateOfBirth: record.dateOfBirth ? String(record.dateOfBirth).slice(0, 10) : '',
          genderId: record.genderId ?? record.GenderId ?? '',
          address: record.address || record.Address || '',
          stateId: record.stateId ?? record.StateId ?? '',
          cityId: record.cityId ?? record.CityId ?? '',
          districtId: record.districtId ?? record.DistrictId ?? '',
          pincode: record.pincode || record.Pincode || '',
          mobileNumber: record.mobileNumber || record.MobileNumber || '',
          emailAddress: record.emailAddress || record.EmailAddress || '',
          branch: record.branch || record.Branch || record.branchName || record.BranchName || '',
          dateJoined: record.dateJoined ? String(record.dateJoined).slice(0, 10) : new Date().toISOString().slice(0, 10),
          accountNumber: record.accountNumber || record.AccountNumber || '',
          ifscCode: record.ifscCode || record.IFSCCode || record.IfscCode || '',
        });
        setIsActive(record.isActive !== false && record.IsActive !== false);

        const aadhaarPath = record.aadhaarDocumentPath || record.aadhaarPath || record.aadhaarCardPath || record.AadhaarDocumentPath || '';
        const panPath = record.panCardPath || record.panDocumentPath || record.panPath || record.PanCardPath || '';
        const profilePath = record.profileImagePath || record.profilePath || record.ProfileImagePath || '';

        if (aadhaarPath) {
          const url = getDocumentUrl('CreditManager', editCmId, 'aadhar', aadhaarPath);
          setExistingAadhaarUrl(url);
          setExistingAadhaarFileName(aadhaarPath.split('/').pop().split('\\').pop() || 'Aadhaar Card');
          setIsExistingAadhaarPdf(isPdfUrl(aadhaarPath));
        }

        if (panPath) {
          const url = getDocumentUrl('CreditManager', editCmId, 'pan', panPath);
          setExistingPanUrl(url);
          setExistingPanFileName(panPath.split('/').pop().split('\\').pop() || 'PAN Card');
          setIsExistingPanPdf(isPdfUrl(panPath));
        }

        if (profilePath || editCmId) {
          const directProfileUrl = getProfileImageUrl('CreditManager', editCmId);
          setExistingProfileUrl(directProfileUrl);
        }
      } catch (err) {
        if (active) {
          setError(err.response?.data?.message || err.message || 'Unable to load credit manager details.');
        }
      } finally {
        if (active) setLoadingRecord(false);
      }
    }

    loadRecord();
    return () => {
      active = false;
    };
  }, [editCmId, isEditMode]);

  const handlePreviewExisting = async (title, url, isPdfInitial = false) => {
    const isProfile = String(title || '').toLowerCase().includes('profile') || String(title || '').toLowerCase().includes('photo') || String(title || '').toLowerCase().includes('image');
    const effectiveUrl = isProfile && editCmId ? getProfileImageUrl('CreditManager', editCmId) : url;

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

  const selectedStateId = String(form.stateId || '');
  const visibleCities = useMemo(
    () =>
      !selectedStateId
        ? []
        : cities.filter((city) => {
            const cityStateId = city.stateId ?? city.StateId ?? city.stateID;
            return String(cityStateId) === selectedStateId;
          }),
    [cities, selectedStateId]
  );

  const visibleDistricts = useMemo(
    () =>
      !selectedStateId
        ? []
        : districts.filter((district) => {
            const districtStateId = district.stateId ?? district.StateId ?? district.stateID;
            return !districtStateId || String(districtStateId) === selectedStateId;
          }),
    [districts, selectedStateId]
  );

  const update = (key, value) => {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === 'stateId') {
        next.cityId = '';
        next.districtId = '';
      }
      return next;
    });
    setError('');
    setFieldErrors((current) => ({ ...current, [key]: '' }));
  };

  const validateField = (key, value = form[key]) => {
    if (key === 'creditManagerCode' && !isEditMode) return '';
    const text = String(value || '').trim();
    let message = '';
    const today = new Date().toISOString().slice(0, 10);

    if (!text && key !== 'emailAddress') {
      message = 'This field is required.';
    } else if (key === 'dateOfBirth' && text > today) {
      message = 'Date of birth cannot be in the future.';
    } else if (key === 'mobileNumber' && !isValidMobile(text)) {
      message = 'Enter a valid 10-digit mobile number.';
    } else if (key === 'emailAddress' && text && !isValidEmail(text)) {
      message = 'Enter a valid email address.';
    } else if (key === 'pincode' && !isValidPincode(text)) {
      message = 'Pincode must contain exactly 6 digits.';
    } else if (key === 'accountNumber' && !isValidAccount(text)) {
      message = 'Account number must contain 9-18 digits.';
    } else if (key === 'ifscCode' && !isValidIfsc(text)) {
      message = 'Enter a valid IFSC code.';
    }

    setFieldErrors((current) => ({ ...current, [key]: message }));
    return message;
  };

  const validateForm = () => {
    const requiredKeys = [
      ...(isEditMode ? ['creditManagerCode'] : []),
      'fullName',
      'dateOfBirth',
      'genderId',
      'address',
      'stateId',
      'cityId',
      'districtId',
      'pincode',
      'mobileNumber',
      'branch',
      'dateJoined',
      'accountNumber',
      'ifscCode',
    ];

    const nextErrors = {};
    requiredKeys.forEach((key) => {
      const message = validateField(key, form[key]);
      if (message) nextErrors[key] = message;
    });

    const emailError = form.emailAddress ? validateField('emailAddress', form.emailAddress) : '';
    if (emailError) nextErrors.emailAddress = emailError;

    setFieldErrors((current) => ({ ...current, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  };

  const handleFileUpload = (setter, previewSetter, pdfSetter, file, maxSizeMb) => {
    const isAllowedExt = /\.(pdf|jpg|jpeg|png)$/i.test(file.name);
    const isAllowedMime = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'].includes(file.type?.toLowerCase());

    if (!isAllowedExt && !isAllowedMime) {
      toast.error('Please upload a document in PDF, JPG, JPEG, or PNG format only.');
      return false;
    }

    if (file.size > maxSizeMb * 1024 * 1024) {
      toast.error(`File size must not exceed ${maxSizeMb}MB.`);
      return false;
    }

    previewSetter((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
    setter(file);
    pdfSetter(file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      setError('Please correct the highlighted fields.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const currentAdminId = getCurrentUserId() || null;
      let targetCmId = editCmId ? Number(editCmId) : null;

      if (isEditMode) {
        const updatePayload = {
          creditManagerId: Number(editCmId),
          creditManagerCode: form.creditManagerCode ? form.creditManagerCode.trim() : '',
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
          modifiedBy: currentAdminId,
        };

        await updateCreditManager(editCmId, updatePayload);
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
          createdBy: currentAdminId,
        };

        const response = await createCreditManager(createPayload);
        targetCmId = extractCreditManagerId(response);
        if (!targetCmId) {
          throw new Error('Credit manager saved, but failed to retrieve Credit Manager ID from server response.');
        }
      }

      if (aadhaarFile && targetCmId) {
        await uploadCreditManagerAadhaar(targetCmId, aadhaarFile, isEditMode);
      }

      if (panFile && targetCmId) {
        await uploadCreditManagerPan(targetCmId, panFile, isEditMode);
      }

      if (profileImage && targetCmId) {
        await uploadCreditManagerProfileImage(targetCmId, profileImage, isEditMode);
      }

      toast.success(isEditMode ? 'Credit manager updated successfully!' : 'Credit manager created successfully!');
      navigate(onSuccessRedirect);
    } catch (err) {
      console.error('Failed to save credit manager:', err);
      const apiMessage = err?.response?.data?.message || err?.response?.data?.title || err?.message || 'Failed to save credit manager.';
      setError(apiMessage);
      toast.error(apiMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="rm-create-page">
      <button className="rm-create-back" onClick={() => navigate('/credit-managers')} type="button">
        <ArrowLeft size={16} /> Back to Credit Managers
      </button>

      <header className="rm-create-header">
        <div className="rm-create-icon">
          <Landmark size={24} />
        </div>
        <div>
          <span>CREDIT MANAGEMENT</span>
          <h1>{isEditMode ? 'Edit Credit Manager' : 'Create Credit Manager'}</h1>
          <p>
            {isEditMode
              ? 'Update the credit manager details, contact information, branch assignment, and documents.'
              : 'Add a new credit manager to review, evaluate, and sanction loan applications.'}
          </p>
        </div>
      </header>

      {error && <div className="rm-create-error" role="status">{error}</div>}

      {loadingRecord ? (
        <div className="rm-create-loading">
          <LoaderCircle size={28} className="master-spin" />
          <span>Loading credit manager record…</span>
        </div>
      ) : (
        <form className="rm-create-form" onSubmit={handleSubmit} noValidate>
          {/* Section 1: Personal Details */}
          <section className="rm-form-card">
            <div className="rm-card-header">
              <UserRound size={18} />
              <h2>Personal details</h2>
            </div>

            <div className="rm-form-grid">
              {isEditMode && (
                <div className="rm-form-field">
                  <label htmlFor="creditManagerCode">Credit Manager Code</label>
                  <input
                    id="creditManagerCode"
                    type="text"
                    value={form.creditManagerCode}
                    disabled
                    className="disabled-input"
                  />
                  <small className="field-hint">Generated by backend</small>
                </div>
              )}

              <div className="rm-form-field">
                <label htmlFor="fullName">Full name *</label>
                <input
                  id="fullName"
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={form.fullName}
                  onChange={(e) => update('fullName', e.target.value)}
                  onBlur={() => validateField('fullName')}
                  aria-invalid={Boolean(fieldErrors.fullName)}
                />
                {fieldErrors.fullName && <span className="field-error">{fieldErrors.fullName}</span>}
              </div>

              <div className="rm-form-field">
                <label htmlFor="dateOfBirth">Date of birth *</label>
                <input
                  id="dateOfBirth"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => update('dateOfBirth', e.target.value)}
                  onBlur={() => validateField('dateOfBirth')}
                  aria-invalid={Boolean(fieldErrors.dateOfBirth)}
                />
                {fieldErrors.dateOfBirth && <span className="field-error">{fieldErrors.dateOfBirth}</span>}
              </div>

              <div className="rm-form-field">
                <label htmlFor="genderId">Gender *</label>
                <select
                  id="genderId"
                  value={form.genderId}
                  onChange={(e) => update('genderId', e.target.value)}
                  onBlur={() => validateField('genderId')}
                  disabled={loadingMasterData}
                  aria-invalid={Boolean(fieldErrors.genderId)}
                >
                  <option value="">Select gender</option>
                  {genders.map((gender) => {
                    const id = gender.genderId ?? gender.GenderId ?? gender.id;
                    const name = gender.genderName ?? gender.GenderName ?? gender.name;
                    return (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    );
                  })}
                </select>
                {fieldErrors.genderId && <span className="field-error">{fieldErrors.genderId}</span>}
              </div>

              <div className="rm-form-field">
                <label htmlFor="mobileNumber">Mobile number *</label>
                <input
                  id="mobileNumber"
                  type="tel"
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  value={form.mobileNumber}
                  onChange={(e) => update('mobileNumber', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  onBlur={() => validateField('mobileNumber')}
                  aria-invalid={Boolean(fieldErrors.mobileNumber)}
                />
                {fieldErrors.mobileNumber && <span className="field-error">{fieldErrors.mobileNumber}</span>}
              </div>

              <div className="rm-form-field">
                <label htmlFor="emailAddress">Email address</label>
                <input
                  id="emailAddress"
                  type="email"
                  placeholder="e.g. credit.manager@sivels.com"
                  value={form.emailAddress}
                  onChange={(e) => update('emailAddress', e.target.value)}
                  onBlur={() => validateField('emailAddress')}
                  aria-invalid={Boolean(fieldErrors.emailAddress)}
                />
                {fieldErrors.emailAddress && <span className="field-error">{fieldErrors.emailAddress}</span>}
              </div>

              <div className="rm-form-field">
                <label htmlFor="branch">Branch *</label>
                <select
                  id="branch"
                  value={form.branch}
                  onChange={(e) => update('branch', e.target.value)}
                  onBlur={() => validateField('branch')}
                  disabled={loadingMasterData}
                  aria-invalid={Boolean(fieldErrors.branch)}
                >
                  <option value="">Select branch</option>
                  {branches.map((b) => {
                    const name = b.branchName || b.BranchName || b.name || b;
                    const id = b.branchId || b.BranchId || b.id || name;
                    return (
                      <option key={id} value={name}>
                        {name}
                      </option>
                    );
                  })}
                </select>
                {fieldErrors.branch && <span className="field-error">{fieldErrors.branch}</span>}
              </div>

              <div className="rm-form-field">
                <label htmlFor="dateJoined">Date joined *</label>
                <input
                  id="dateJoined"
                  type="date"
                  value={form.dateJoined}
                  onChange={(e) => update('dateJoined', e.target.value)}
                  onBlur={() => validateField('dateJoined')}
                  aria-invalid={Boolean(fieldErrors.dateJoined)}
                />
                {fieldErrors.dateJoined && <span className="field-error">{fieldErrors.dateJoined}</span>}
              </div>

              <div className="rm-form-field">
                <label htmlFor="isActive">Status</label>
                <div className="rm-status-toggle">
                  <input
                    id="isActive"
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  <span>{isActive ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Address & Location */}
          <section className="rm-form-card">
            <div className="rm-card-header">
              <MapPin size={18} />
              <h2>Address & location</h2>
            </div>

            <div className="rm-form-grid">
              <div className="rm-form-field rm-field-full">
                <label htmlFor="address">Address *</label>
                <textarea
                  id="address"
                  rows={2}
                  placeholder="Enter complete residential/work address"
                  value={form.address}
                  onChange={(e) => update('address', e.target.value)}
                  onBlur={() => validateField('address')}
                  aria-invalid={Boolean(fieldErrors.address)}
                />
                {fieldErrors.address && <span className="field-error">{fieldErrors.address}</span>}
              </div>

              <div className="rm-form-field">
                <label htmlFor="stateId">State *</label>
                <select
                  id="stateId"
                  value={form.stateId}
                  onChange={(e) => update('stateId', e.target.value)}
                  onBlur={() => validateField('stateId')}
                  disabled={loadingMasterData}
                  aria-invalid={Boolean(fieldErrors.stateId)}
                >
                  <option value="">Select state</option>
                  {states.map((st) => {
                    const id = st.stateId ?? st.StateId ?? st.stateID ?? st.id;
                    const name = st.stateName ?? st.StateName ?? st.name;
                    return (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    );
                  })}
                </select>
                {fieldErrors.stateId && <span className="field-error">{fieldErrors.stateId}</span>}
              </div>

              <div className="rm-form-field">
                <label htmlFor="cityId">City *</label>
                <select
                  id="cityId"
                  value={form.cityId}
                  onChange={(e) => update('cityId', e.target.value)}
                  onBlur={() => validateField('cityId')}
                  disabled={loadingMasterData || !form.stateId}
                  aria-invalid={Boolean(fieldErrors.cityId)}
                >
                  <option value="">Select city</option>
                  {visibleCities.map((ct) => {
                    const id = ct.cityId ?? ct.CityId ?? ct.cityID ?? ct.id;
                    const name = ct.cityName ?? ct.CityName ?? ct.name;
                    return (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    );
                  })}
                </select>
                {fieldErrors.cityId && <span className="field-error">{fieldErrors.cityId}</span>}
              </div>

              <div className="rm-form-field">
                <label htmlFor="districtId">District *</label>
                <select
                  id="districtId"
                  value={form.districtId}
                  onChange={(e) => update('districtId', e.target.value)}
                  onBlur={() => validateField('districtId')}
                  disabled={loadingMasterData || !form.stateId}
                  aria-invalid={Boolean(fieldErrors.districtId)}
                >
                  <option value="">Select district</option>
                  {visibleDistricts.map((dist) => {
                    const id = dist.districtId ?? dist.DistrictId ?? dist.id;
                    const name = dist.districtName ?? dist.DistrictName ?? dist.name;
                    return (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    );
                  })}
                </select>
                {fieldErrors.districtId && <span className="field-error">{fieldErrors.districtId}</span>}
              </div>

              <div className="rm-form-field">
                <label htmlFor="pincode">Pincode *</label>
                <input
                  id="pincode"
                  type="text"
                  placeholder="6-digit pincode"
                  maxLength={6}
                  value={form.pincode}
                  onChange={(e) => update('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onBlur={() => validateField('pincode')}
                  aria-invalid={Boolean(fieldErrors.pincode)}
                />
                {fieldErrors.pincode && <span className="field-error">{fieldErrors.pincode}</span>}
              </div>
            </div>
          </section>

          {/* Section 3: Banking & Accounts */}
          <section className="rm-form-card">
            <div className="rm-card-header">
              <Landmark size={18} />
              <h2>Banking details</h2>
            </div>

            <div className="rm-form-grid">
              <div className="rm-form-field">
                <label htmlFor="accountNumber">Account number *</label>
                <input
                  id="accountNumber"
                  type="text"
                  placeholder="9 to 18-digit bank account number"
                  maxLength={18}
                  value={form.accountNumber}
                  onChange={(e) => update('accountNumber', e.target.value.replace(/\D/g, '').slice(0, 18))}
                  onBlur={() => validateField('accountNumber')}
                  aria-invalid={Boolean(fieldErrors.accountNumber)}
                />
                {fieldErrors.accountNumber && <span className="field-error">{fieldErrors.accountNumber}</span>}
              </div>

              <div className="rm-form-field">
                <label htmlFor="ifscCode">IFSC code *</label>
                <input
                  id="ifscCode"
                  type="text"
                  placeholder="e.g. HDFC0001234"
                  maxLength={11}
                  value={form.ifscCode}
                  onChange={(e) => update('ifscCode', e.target.value.toUpperCase().slice(0, 11))}
                  onBlur={() => validateField('ifscCode')}
                  aria-invalid={Boolean(fieldErrors.ifscCode)}
                />
                {fieldErrors.ifscCode && <span className="field-error">{fieldErrors.ifscCode}</span>}
              </div>
            </div>
          </section>

          {/* Section 4: Document Uploads */}
          <section className="rm-form-card">
            <div className="rm-card-header">
              <Landmark size={18} />
              <h2>Documents & KYC</h2>
            </div>

            <div className="rm-form-grid">
              <DocumentUploadCard
                label="Aadhaar Card"
                hint="Upload Aadhaar card in PDF, JPG, or PNG format (max 5MB)."
                selectedFile={aadhaarFile}
                previewUrl={aadhaarPreviewUrl}
                isPdf={isAadhaarPdf}
                existingUrl={existingAadhaarUrl}
                existingFileName={existingAadhaarFileName}
                isExistingPdf={isExistingAadhaarPdf}
                onFileChange={(f) => handleFileUpload(setAadhaarFile, setAadhaarPreviewUrl, setIsAadhaarPdf, f, 5)}
                onPreviewExisting={(title, url, isPdf) => handlePreviewExisting(title, url, isPdf)}
              />

              <DocumentUploadCard
                label="PAN Card"
                hint="Upload PAN card in PDF, JPG, or PNG format (max 5MB)."
                selectedFile={panFile}
                previewUrl={panPreviewUrl}
                isPdf={isPanPdf}
                existingUrl={existingPanUrl}
                existingFileName={existingPanFileName}
                isExistingPdf={isExistingPanPdf}
                onFileChange={(f) => handleFileUpload(setPanFile, setPanPreviewUrl, setIsPanPdf, f, 5)}
                onPreviewExisting={(title, url, isPdf) => handlePreviewExisting(title, url, isPdf)}
              />

              <DocumentUploadCard
                label="Profile Photograph"
                hint="Upload passport-size photo in JPG or PNG format (max 2MB)."
                selectedFile={profileImage}
                previewUrl={profilePreviewUrl}
                isPdf={false}
                existingUrl={existingProfileUrl}
                existingFileName={existingProfileUrl ? 'Profile Photograph' : null}
                isExistingPdf={false}
                onFileChange={(f) => handleFileUpload(setProfileImage, setProfilePreviewUrl, () => {}, f, 2)}
                onPreviewExisting={(title, url) => handlePreviewExisting(title, url, false)}
              />
            </div>
          </section>

          {/* Form Actions */}
          <div className="rm-form-actions">
            <button
              type="button"
              className="masters-btn-secondary"
              onClick={() => navigate('/credit-managers')}
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? <LoaderCircle size={17} className="master-spin" /> : <Save size={17} />}
              {saving ? 'Saving…' : isEditMode ? 'Update Credit Manager' : 'Create Credit Manager'}
            </button>
          </div>
        </form>
      )}

      <DocumentPreviewModal previewDoc={previewDoc} onClose={() => setPreviewDoc(null)} />
    </main>
  );
}
