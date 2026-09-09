import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, UserRound, MapPin, Landmark, LoaderCircle, Building2 } from 'lucide-react';
import {
  createRelationshipManager,
  getRelationshipManager,
  updateRelationshipManager,
  uploadRMAadhaar,
  uploadRMPan,
  uploadRMProfileImage,
  getRMProfileImageBlob,
  extractRmId,
} from '../../api/rmApi';
import { getBankBranches } from '../../api/masters/bankBranchApi';
import { masterService } from '../../../../Core/src/services/masterService';
import { getCurrentUserId } from '../../utils/authHelper';
import { generateUserCode } from '../../utils/codeGenerator';
import { DocumentUploadCard, DocumentPreviewModal, fetchDocumentBlobUrl, isPdfUrl } from '../../components/DocumentUpload/DocumentUploadSection';
import { getProfileImageUrl } from '../../utils/profileImageHelper';
import { getFileUrl, isPdfFile, getAadhaarPath, getPanPath, getProfilePath, getDocumentUrl } from '../Dashboard/Dashboard';
import './RelationshipManagerCreate.css';

const fields = [
  ['rmCode', 'RM Code', 'text'], ['fullName', 'Full Name', 'text'], ['dateOfBirth', 'Date of Birth', 'date'],
  ['address', 'Address', 'text'], ['stateId', 'State ID', 'number'],
  ['cityId', 'City ID', 'number'], ['pincode', 'Pincode', 'text'], ['mobileNumber', 'Mobile Number', 'tel'],
  ['emailAddress', 'Email Address', 'email'], ['branch', 'Branch', 'text'], ['dateJoined', 'Date Joined', 'date'],
  ['accountNumber', 'Account Number', 'text'], ['ifscCode', 'IFSC Code', 'text'],
];

const applicationDate = () => new Date().toISOString().slice(0, 10);

const emptyForm = () => ({
  ...Object.fromEntries(fields.map(([key]) => [key, ''])),
  rmCode: '',
  dateJoined: applicationDate(),
  genderId: '',
});

export default function RelationshipManagerCreate() {
  const navigate = useNavigate();
  const { rmId } = useParams();
  const isEditMode = Boolean(rmId);
  const [form, setForm] = useState(emptyForm);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingRecord, setLoadingRecord] = useState(isEditMode);
  const [error, setError] = useState('');
  const [genders, setGenders] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loadingGenders, setLoadingGenders] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({});
  const [existingRecord, setExistingRecord] = useState(null);

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

  useEffect(() => {
    Promise.all([masterService.getGenders(), masterService.getStates(), masterService.getCities(), getBankBranches()])
      .then(([genderResponse, stateResponse, cityResponse, branchResponse]) => {
        const records = (response) => Array.isArray(response) ? response : response?.data || [];
        setGenders(records(genderResponse));
        setStates(records(stateResponse));
        setCities(records(cityResponse));
        setBranches(records(branchResponse));
      })
      .catch(() => setError('Unable to load master options. Please refresh and try again.'))
      .finally(() => setLoadingGenders(false));
  }, []);

  useEffect(() => {
    if (!isEditMode) return undefined;
    let active = true;

    async function loadRm() {
      setLoadingRecord(true);
      setError('');
      try {
        const response = await getRelationshipManager(rmId);
        const record = response?.data?.value?.[0] || response?.data?.data || response?.data;
        if (!active || !record) {
          throw new Error('Relationship manager not found.');
        }
        setExistingRecord(record);
        setIsActive(record.isActive !== false);
        setForm({
          rmCode: record.rmCode || '',
          fullName: record.fullName || '',
          dateOfBirth: record.dateOfBirth ? String(record.dateOfBirth).slice(0, 10) : '',
          genderId: record.genderId ?? '',
          address: record.address || '',
          stateId: record.stateId ?? '',
          cityId: record.cityId ?? '',
          pincode: record.pincode || '',
          mobileNumber: record.mobileNumber || '',
          emailAddress: record.emailAddress || '',
          branch: record.branch || '',
          dateJoined: record.dateJoined ? String(record.dateJoined).slice(0, 10) : applicationDate(),
          accountNumber: record.accountNumber || '',
          ifscCode: record.ifscCode || '',
        });

        const aadhaarPath = getAadhaarPath(record) || record.aadhaarDocumentPath || record.aadhaarPath || record.aadhaarCardPath || '';
        const panPath = getPanPath(record) || record.panCardPath || record.panDocumentPath || record.panPath || '';
        const profilePath = getProfilePath(record) || record.profileImagePath || record.profilePath || '';

        if (aadhaarPath) {
          const url = getDocumentUrl('RM', rmId, 'aadhar', aadhaarPath);
          setExistingAadhaarUrl(url);
          setExistingAadhaarFileName(aadhaarPath.split('/').pop().split('\\').pop() || 'Aadhaar Card');
          setIsExistingAadhaarPdf(isPdfUrl(aadhaarPath));
        }

        if (panPath) {
          const url = getDocumentUrl('RM', rmId, 'pan', panPath);
          setExistingPanUrl(url);
          setExistingPanFileName(panPath.split('/').pop().split('\\').pop() || 'PAN Card');
          setIsExistingPanPdf(isPdfUrl(panPath));
        }

        if (rmId) {
          const directProfileUrl = getProfileImageUrl('RM', rmId);
          setExistingProfileUrl(directProfileUrl);
        }
      } catch (err) {
        if (active) {
          setError(err.response?.data?.message || err.message || 'Unable to load relationship manager.');
        }
      } finally {
        if (active) setLoadingRecord(false);
      }
    }

    loadRm();
    return () => {
      active = false;
    };
  }, [isEditMode, rmId]);

  const handlePreviewExisting = async (title, url, isPdfInitial = false) => {
    const isProfile = String(title || '').toLowerCase().includes('profile') || String(title || '').toLowerCase().includes('photo') || String(title || '').toLowerCase().includes('image');

    const effectiveUrl = isProfile && rmId ? getProfileImageUrl('RM', rmId) : url;

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

  const update = (key, value) => {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (!isEditMode && (key === 'fullName' || key === 'dateOfBirth' || key === 'mobileNumber')) {
        next.rmCode = generateUserCode(next.fullName, next.dateOfBirth, next.mobileNumber);
      }
      return next;
    });
    setError('');
    setFieldErrors((current) => ({ ...current, [key]: '' }));
  };

  const validateField = (key, value = form[key]) => {
    const text = String(value || '').trim();
    let message = '';
    if (!text) message = 'This field is required.';
    else if (key === 'mobileNumber' && !/^[6-9]\d{9}$/.test(text)) message = 'Enter a valid 10-digit mobile number.';
    else if (key === 'emailAddress' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) message = 'Enter a valid email address.';
    else if (key === 'pincode' && !/^\d{6}$/.test(text)) message = 'Pincode must contain 6 digits.';
    else if (key === 'accountNumber' && !/^\d{9,18}$/.test(text)) message = 'Account number must contain 9–18 digits.';
    else if (key === 'ifscCode' && !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(text)) message = 'Enter a valid IFSC code.';
    else if (key === 'dateOfBirth' && text > applicationDate()) message = 'Date of birth cannot be in the future.';
    setFieldErrors((current) => ({ ...current, [key]: message }));
    return message;
  };

  const submit = async (event) => {
    event.preventDefault();
    const required = ['rmCode', 'fullName', 'dateOfBirth', 'genderId', 'address', 'stateId', 'cityId', 'pincode', 'mobileNumber', 'emailAddress', 'branch', 'dateJoined', 'accountNumber', 'ifscCode'];
    const validationErrors = required.map((key) => validateField(key)).filter(Boolean);
    if (validationErrors.length) {
      setError('Please correct the highlighted fields.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...(existingRecord || {}),
        ...form,
        genderId: Number(form.genderId),
        stateId: Number(form.stateId),
        cityId: Number(form.cityId),
        isActive,
        createdBy: existingRecord?.createdBy || getCurrentUserId() || 1,
        modifiedBy: getCurrentUserId() || 1,
      };

      let targetRmId = rmId || null;

      if (isEditMode) {
        await updateRelationshipManager(rmId, { ...payload, rmId: Number(rmId) });
      } else {
        const response = await createRelationshipManager(payload);
        targetRmId = extractRmId(response);
      }

      if (aadhaarFile && targetRmId) {
        try {
          await uploadRMAadhaar(targetRmId, aadhaarFile);
        } catch (err) {
          console.warn('RM Aadhaar upload failed:', err);
        }
      }

      if (panFile && targetRmId) {
        try {
          await uploadRMPan(targetRmId, panFile);
        } catch (err) {
          console.warn('RM PAN upload failed:', err);
        }
      }

      if (profileImage && targetRmId) {
        try {
          await uploadRMProfileImage(targetRmId, profileImage);
        } catch (err) {
          console.warn('RM Profile Image upload failed:', err);
        }
      }

      toast.success(isEditMode ? 'Relationship manager updated successfully' : 'Relationship manager created successfully');
      navigate('/dashboard');
    } catch (err) {
      const message = err.response?.status === 409
        ? (err.response?.data?.message || 'A relationship manager with this mobile number or email already exists.')
        : (err.response?.data?.message || `Unable to ${isEditMode ? 'update' : 'create'} relationship manager. Please check the details and try again.`);
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);

    }
  };

  const getId = (record) => record?.stateId ?? record?.cityId;
  const getName = (record) => record?.stateName ?? record?.cityName ?? record?.name ?? record?.description;
  const selectedState = String(form.stateId);
  const visibleCities = cities.filter((city) => {
    const cityStateId = city.stateId ?? city.StateId ?? city.stateID;
    return !cityStateId || !selectedState || String(cityStateId) === selectedState;
  });

  const renderField = ([key, label, type]) => (
    <label className={`form-group ${key === 'address' ? 'rm-field-wide' : ''}`} key={key}>
      <span className="form-label">{label} <b className="text-danger">*</b></span>
      {key === 'stateId' || key === 'cityId' ? (
        <select
          className={`form-input ${fieldErrors[key] ? 'rm-invalid' : ''}`}
          value={form[key]}
          onBlur={() => validateField(key)}
          onChange={(event) => {
            update(key, event.target.value);
            if (key === 'stateId') update('cityId', '');
          }}
          disabled={saving || loadingGenders || loadingRecord}
          required
        >
          <option value="">Select {key === 'stateId' ? 'state' : 'city'}</option>
          {(key === 'stateId' ? states : visibleCities).filter((record) => record.isActive !== false).map((record) => (
            <option key={getId(record)} value={getId(record)}>{getName(record)}</option>
          ))}
        </select>
      ) : key === 'branch' ? (
        <select
          className={`form-input ${fieldErrors[key] ? 'rm-invalid' : ''}`}
          value={form.branch}
          onBlur={() => validateField(key)}
          onChange={(event) => update('branch', event.target.value)}
          disabled={saving || loadingGenders || loadingRecord}
          required
        >
          <option value="">Select branch</option>
          {branches.filter((branch) => branch.isActive !== false).map((branch) => (
            <option key={branch.bankBranchId} value={branch.branchName}>{branch.branchName}</option>
          ))}
        </select>
      ) : (
        <input
          className={`form-input ${key === 'rmCode' ? 'rm-code-input' : ''} ${type === 'date' ? 'rm-date-input' : ''} ${fieldErrors[key] ? 'rm-invalid' : ''}`}
          type={type}
          value={form[key]}
          onBlur={() => validateField(key)}
          onChange={(event) => update(key, event.target.value)}
          disabled={saving || loadingRecord || key === 'rmCode' || (!isEditMode && key === 'dateJoined')}
          readOnly={key === 'rmCode' || (!isEditMode && key === 'dateJoined')}
          required
        />
      )}
      {key === 'rmCode' && <small className="rm-field-hint">{isEditMode ? 'System code' : 'Generated automatically'}</small>}
      {key === 'dateJoined' && !isEditMode && <small className="rm-field-hint">Set automatically on creation</small>}
      {fieldErrors[key] && <small className="rm-validation-error">{fieldErrors[key]}</small>}
    </label>
  );

  return (
    <div className="masters-page rm-create-page">
      <header className="rm-hero">
        <div className="rm-hero-icon"><UserRound size={26} /></div>
        <div>
          <span className="rm-eyebrow">TEAM MANAGEMENT</span>
          <h1>{isEditMode ? 'Edit relationship manager' : 'Create relationship manager'}</h1>
          <p>
            {isEditMode
              ? 'Update personal, location, and banking details for this relationship manager.'
              : 'Set up a new member of your lending network with their personal and banking details.'}
          </p>
        </div>
      </header>
      <form className="rm-create-card" onSubmit={submit}>
        <section className="rm-section">
          <div className="rm-section-heading">
            <UserRound size={19} />
            <div>
              <h2>Personal details</h2>
              <p>Basic information used to identify the relationship manager.</p>
            </div>
          </div>
          <div className="rm-form-grid">
            {fields.slice(0, 3).map(renderField)}
            <label className="form-group">
              <span className="form-label">Gender <b className="text-danger">*</b></span>
              <select
                className="form-input"
                value={form.genderId}
                onChange={(event) => update('genderId', event.target.value)}
                disabled={saving || loadingGenders || loadingRecord}
                required
              >
                <option value="">{loadingGenders ? 'Loading genders...' : 'Select gender'}</option>
                {genders.filter((gender) => gender.isActive !== false).map((gender) => (
                  <option key={gender.genderId} value={gender.genderId}>{gender.genderName}</option>
                ))}
              </select>
            </label>
          </div>
        </section>
        <section className="rm-section">
          <div className="rm-section-heading">
            <MapPin size={19} />
            <div>
              <h2>Location & contact</h2>
              <p>Where the manager works and how they can be reached.</p>
            </div>
          </div>
          <div className="rm-form-grid">{fields.slice(3, 10).map(renderField)}</div>
        </section>
        <section className="rm-section">
          <div className="rm-section-heading">
            <Landmark size={19} />
            <div>
              <h2>Banking details</h2>
              <p>Payment details for the relationship manager.</p>
            </div>
          </div>
          <div className="rm-form-grid">{fields.slice(10).map(renderField)}</div>
        </section>
        <section className="rm-section">
          <div className="rm-section-heading">
            <Building2 size={19} />
            <div>
              <h2>Required Documents</h2>
              <p>Upload identification documents and photographs for this relationship manager.</p>
            </div>
          </div>
          <div className="doc-upload-grid">
            <DocumentUploadCard
              title="Aadhaar Card"
              required={!isEditMode && !existingAadhaarUrl}
              subtitle="Upload clear image of Aadhaar Card"
              note="JPG, PNG or PDF (Max. 10MB)"
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
              onView={() =>
                setPreviewDoc({
                  name: aadhaarFile?.name || 'Aadhaar Card',
                  url: aadhaarPreviewUrl,
                  isPdf: isAadhaarPdf,
                })
              }
            />
            <DocumentUploadCard
              title="PAN Card"
              required={!isEditMode && !existingPanUrl}
              subtitle="Upload clear image of PAN Card"
              note="JPG, PNG or PDF (Max. 10MB)"
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
              onView={() =>
                setPreviewDoc({
                  name: panFile?.name || 'PAN Card',
                  url: panPreviewUrl,
                  isPdf: isPanPdf,
                })
              }
            />
            <DocumentUploadCard
              title="Profile Image"
              required={!isEditMode && !existingProfileUrl}
              subtitle="Upload clear image of Profile Image"
              note="JPG, PNG (Max. 5MB)"
              accept=".jpg,.jpeg,.png"
              icon="camera"
              file={profileImage}
              previewUrl={profilePreviewUrl || existingProfileUrl}
              isProfile
              isExisting={Boolean(!profileImage && existingProfileUrl)}
              existingUrl={existingProfileUrl}
              existingFileName="Profile Photograph"
              onViewExisting={() => handlePreviewExisting('Profile Image', existingProfileUrl, false)}
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
        <label className="rm-active">
          <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} disabled={saving || loadingRecord} />
          <span>
            <strong>Active relationship manager</strong>
            <small>Allow this manager to be assigned to new applications.</small>
          </span>
        </label>
        {error && <p className="form-error-msg">{error}</p>}
        <div className="form-actions">
          <button type="button" className="masters-btn-secondary" onClick={() => navigate('/dashboard')} disabled={saving}>
            <ArrowLeft size={17} /> Cancel
          </button>
          <button type="submit" className="masters-btn-primary" disabled={saving || loadingGenders || loadingRecord}>
            {saving || loadingRecord
              ? <><LoaderCircle className="rm-spinner" size={17} /> {loadingRecord ? 'Loading...' : 'Saving...'}</>
              : <><Save size={17} /> {isEditMode ? 'Update manager' : 'Create manager'}</>}
          </button>
        </div>
      </form>
      <DocumentPreviewModal
        isOpen={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        doc={previewDoc}
      />
    </div>
  );
}
