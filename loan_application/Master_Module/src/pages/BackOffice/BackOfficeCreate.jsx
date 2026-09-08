import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, LoaderCircle, MapPin, Save, UserRound, Landmark } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createBackOffice,
  extractBackOfficeId,
  getBackOfficeById,
  updateBackOffice,
  uploadBackOfficeAadhaar,
  uploadBackOfficePan,
  uploadBackOfficeProfileImage,
} from '../../api/backOfficeApi';
import { masterService } from '../../../../Core/src/services/masterService';
import { getBankBranches } from '../../api/masters/bankBranchApi';
import { getCurrentUserId } from '../../utils/authHelper';
import { generateUserCode } from '../../utils/codeGenerator';
import { DocumentPreviewModal, DocumentUploadCard } from '../../components/DocumentUpload/DocumentUploadSection';
import '../RelationshipManager/RelationshipManagerCreate.css';

const createInitialForm = () => ({
  backOfficeCode: '',
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

export default function BackOfficeCreate({ onSuccessRedirect = '/dashboard' } = {}) {
  const navigate = useNavigate();
  const { backOfficeId: backOfficeIdParam } = useParams();
  const editBackOfficeId = backOfficeIdParam || null;
  const isEditMode = Boolean(editBackOfficeId);

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

  const [previewDoc, setPreviewDoc] = useState(null);

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
        console.error('Failed to load back office master options:', err);
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
        const response = await getBackOfficeById(editBackOfficeId);
        const record = Array.isArray(response)
          ? response[0]
          : response?.value?.[0] || response?.data?.value?.[0] || response?.data || response;

        if (!active || !record) {
          throw new Error('Back office record not found.');
        }

        setForm({
          backOfficeCode: record.backOfficeCode || record.BackOfficeCode || '',
          fullName: record.fullName || record.FullName || '',
          dateOfBirth: record.dateOfBirth ? String(record.dateOfBirth).slice(0, 10) : '',
          genderId: record.genderId ?? record.GenderId ?? '',
          address: record.address || record.Address || '',
          stateId: record.stateId ?? record.StateId ?? '',
          cityId: record.cityId ?? record.CityId ?? '',
          districtId: record.districtId ?? record.DistrictId ?? '',
          pincode: record.pincode || record.Pincode || '',
          mobileNumber: record.mobileNumber || record.MobileNumber || '',
          emailAddress: record.emailAddress || record.EmailAddress || '',
          branch: record.branch || record.Branch || '',
          dateJoined: record.dateJoined ? String(record.dateJoined).slice(0, 10) : new Date().toISOString().slice(0, 10),
          accountNumber: record.accountNumber || record.AccountNumber || '',
          ifscCode: record.ifscCode || record.IFSCCode || record.IfscCode || '',
        });
        setIsActive(record.isActive !== false && record.IsActive !== false);
      } catch (err) {
        if (active) {
          setError(err.response?.data?.message || err.message || 'Unable to load back office details.');
        }
      } finally {
        if (active) setLoadingRecord(false);
      }
    }

    loadRecord();
    return () => {
      active = false;
    };
  }, [editBackOfficeId, isEditMode]);

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
      if (!isEditMode && (key === 'fullName' || key === 'dateOfBirth' || key === 'mobileNumber')) {
        next.backOfficeCode = generateUserCode(next.fullName, next.dateOfBirth, next.mobileNumber);
      }
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
      'backOfficeCode',
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
      const payload = {
        backOfficeCode: form.backOfficeCode.trim(),
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
        isActive,
        accountNumber: form.accountNumber.trim(),
        ifscCode: form.ifscCode.trim().toUpperCase(),
        createdBy: getCurrentUserId() || 1,
        modifiedBy: getCurrentUserId() || 1,
      };

      let targetBackOfficeId = editBackOfficeId || null;

      if (isEditMode) {
        await updateBackOffice(editBackOfficeId, { ...payload, backOfficeId: Number(editBackOfficeId) });
      } else {
        const response = await createBackOffice(payload);
        targetBackOfficeId = extractBackOfficeId(response);
        if (!targetBackOfficeId) {
          throw new Error('Back office saved, but failed to retrieve Back Office ID from server response.');
        }
      }

      if (aadhaarFile && targetBackOfficeId) {
        await uploadBackOfficeAadhaar(targetBackOfficeId, aadhaarFile);
      }

      if (panFile && targetBackOfficeId) {
        await uploadBackOfficePan(targetBackOfficeId, panFile);
      }

      if (profileImage && targetBackOfficeId) {
        await uploadBackOfficeProfileImage(targetBackOfficeId, profileImage);
      }

      toast.success(isEditMode ? 'Back office updated successfully!' : 'Back office created successfully!');
      navigate(onSuccessRedirect);
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        `Unable to ${isEditMode ? 'update' : 'create'} back office. Please check details and try again.`;
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const renderField = ([key, label, type]) => (
    <label className={`form-group ${key === 'address' ? 'rm-field-wide' : ''}`} key={key}>
      <span className="form-label">
        {label} {key !== 'emailAddress' && <b className="text-danger">*</b>}
      </span>
      {['genderId', 'stateId', 'cityId', 'districtId', 'branch'].includes(key) ? (
        <select
          className={`form-input ${fieldErrors[key] ? 'rm-invalid' : ''}`}
          value={form[key]}
          onBlur={() => validateField(key)}
          onChange={(event) => update(key, event.target.value)}
          disabled={
            saving ||
            loadingMasterData ||
            loadingRecord ||
            (key === 'cityId' && !form.stateId) ||
            (key === 'districtId' && !form.stateId)
          }
        >
          <option value="">
            {key === 'cityId' && !form.stateId
              ? 'Select state first'
              : key === 'districtId' && !form.stateId
                ? 'Select state first'
                : `Select ${label.toLowerCase()}`}
          </option>
          {key === 'genderId' &&
            genders.map((gender) => {
              const id = gender.genderId ?? gender.id;
              const name = gender.genderName ?? gender.name ?? gender.description;
              return <option key={id} value={id}>{name}</option>;
            })}
          {key === 'stateId' &&
            states.map((state) => {
              const id = state.stateId ?? state.id;
              const name = state.stateName ?? state.name;
              return <option key={id} value={id}>{name}</option>;
            })}
          {key === 'cityId' &&
            visibleCities.map((city) => {
              const id = city.cityId ?? city.id;
              const name = city.cityName ?? city.name;
              return <option key={id} value={id}>{name}</option>;
            })}
          {key === 'districtId' &&
            visibleDistricts.map((district) => {
              const id = district.districtId ?? district.id;
              const name = district.districtName ?? district.name;
              return <option key={id} value={id}>{name}</option>;
            })}
          {key === 'branch' &&
            branches
              .filter((branch) => branch.isActive !== false)
              .map((branch) => {
                const name = branch.branchName ?? branch.branch ?? branch.name;
                return <option key={branch.branchId ?? branch.id ?? name} value={name}>{name}</option>;
              })}
        </select>
      ) : (
        <input
          className={`form-input ${key === 'backOfficeCode' ? 'rm-code-input' : ''} ${type === 'date' ? 'rm-date-input' : ''} ${fieldErrors[key] ? 'rm-invalid' : ''}`}
          type={type}
          value={form[key]}
          onBlur={() => validateField(key)}
          onChange={(event) => update(key, event.target.value)}
          disabled={saving || loadingRecord || key === 'backOfficeCode' || (!isEditMode && key === 'dateJoined')}
          readOnly={key === 'backOfficeCode' || (!isEditMode && key === 'dateJoined')}
          required={key !== 'emailAddress'}
        />
      )}
      {key === 'backOfficeCode' && <small className="rm-field-hint">{isEditMode ? 'System code' : 'Generated automatically'}</small>}
      {key === 'dateJoined' && !isEditMode && <small className="rm-field-hint">Set automatically on creation</small>}
      {fieldErrors[key] && <small className="rm-validation-error">{fieldErrors[key]}</small>}
    </label>
  );

  const fieldGroups = [
    {
      title: 'Personal details',
      description: 'Basic information used to identify the back office officer.',
      icon: UserRound,
      fields: [
        ['backOfficeCode', 'Back Office Code', 'text'],
        ['fullName', 'Full Name', 'text'],
        ['dateOfBirth', 'Date of Birth', 'date'],
        ['genderId', 'Gender', 'select'],
      ],
    },
    {
      title: 'Location & contact',
      description: 'Where the officer works and how they can be reached.',
      icon: MapPin,
      fields: [
        ['address', 'Address', 'text'],
        ['stateId', 'State', 'select'],
        ['cityId', 'City', 'select'],
        ['districtId', 'District', 'select'],
        ['pincode', 'Pincode', 'text'],
        ['mobileNumber', 'Mobile Number', 'tel'],
        ['emailAddress', 'Email Address', 'email'],
        ['branch', 'Branch', 'select'],
        ['dateJoined', 'Date Joined', 'date'],
      ],
    },
    {
      title: 'Banking details',
      description: 'Payment details for the back office officer.',
      icon: Landmark,
      fields: [
        ['accountNumber', 'Account Number', 'text'],
        ['ifscCode', 'IFSC Code', 'text'],
      ],
    },
  ];

  return (
    <div className="masters-page rm-create-page">
      <header className="rm-hero">
        <div className="rm-hero-icon"><Building2 size={26} /></div>
        <div>
          <span className="rm-eyebrow">TEAM MANAGEMENT</span>
          <h1>{isEditMode ? 'Edit back office' : 'Create back office'}</h1>
          <p>
            {isEditMode
              ? 'Update the back office officer profile, contact details, banking details, and document uploads.'
              : 'Set up a new back office officer with the same RM-style personal, location, banking, and document flow.'}
          </p>
        </div>
      </header>

      {(loadingMasterData || loadingRecord) && (
        <div className="rm-create-card" style={{ display: 'grid', placeItems: 'center', minHeight: '280px' }}>
          <LoaderCircle size={22} className="rm-spinner" />
          <p style={{ marginTop: '10px', color: '#64748b' }}>
            {loadingRecord ? 'Loading back office details…' : 'Loading master options…'}
          </p>
        </div>
      )}

      {!loadingMasterData && !loadingRecord && (
        <form className="rm-create-card" onSubmit={handleSubmit}>
          {fieldGroups.map(({ title, description, icon: Icon, fields }) => (
            <section className="rm-section" key={title}>
              <div className="rm-section-heading">
                <Icon size={19} />
                <div>
                  <h2>{title}</h2>
                  <p>{description}</p>
                </div>
              </div>
              <div className="rm-form-grid">{fields.map(renderField)}</div>
            </section>
          ))}

          <section className="rm-section">
            <div className="rm-section-heading">
              <Building2 size={19} />
              <div>
                <h2>Required Documents</h2>
                <p>Upload identification documents and a profile image for this back office officer.</p>
              </div>
            </div>
            <div className="doc-upload-grid">
              <DocumentUploadCard
                title="Aadhaar Card"
                required
                subtitle="Upload clear image of Aadhaar Card"
                note="JPG, PNG or PDF (Max. 10MB)"
                accept=".pdf,.jpg,.jpeg,.png"
                icon="document"
                file={aadhaarFile}
                previewUrl={aadhaarPreviewUrl}
                isPdf={isAadhaarPdf}
                onUpload={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(setAadhaarFile, setAadhaarPreviewUrl, setIsAadhaarPdf, file, 10);
                }}
                onRemove={() => {
                  if (aadhaarPreviewUrl) URL.revokeObjectURL(aadhaarPreviewUrl);
                  setAadhaarFile(null);
                  setAadhaarPreviewUrl(null);
                  setIsAadhaarPdf(false);
                }}
                onView={() => setPreviewDoc({ name: aadhaarFile?.name || 'Aadhaar Card', url: aadhaarPreviewUrl, isPdf: isAadhaarPdf })}
              />

              <DocumentUploadCard
                title="PAN Card"
                required
                subtitle="Upload clear image of PAN Card"
                note="JPG, PNG or PDF (Max. 10MB)"
                accept=".pdf,.jpg,.jpeg,.png"
                icon="document"
                file={panFile}
                previewUrl={panPreviewUrl}
                isPdf={isPanPdf}
                onUpload={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(setPanFile, setPanPreviewUrl, setIsPanPdf, file, 10);
                }}
                onRemove={() => {
                  if (panPreviewUrl) URL.revokeObjectURL(panPreviewUrl);
                  setPanFile(null);
                  setPanPreviewUrl(null);
                  setIsPanPdf(false);
                }}
                onView={() => setPreviewDoc({ name: panFile?.name || 'PAN Card', url: panPreviewUrl, isPdf: isPanPdf })}
              />

              <DocumentUploadCard
                title="Profile Image"
                required
                subtitle="Upload clear image of Profile Image"
                note="JPG, PNG (Max. 5MB)"
                accept=".jpg,.jpeg,.png"
                icon="camera"
                file={profileImage}
                previewUrl={profilePreviewUrl}
                isProfile
                onUpload={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(setProfileImage, setProfilePreviewUrl, () => {}, file, 5);
                }}
                onRemove={() => {
                  if (profilePreviewUrl) URL.revokeObjectURL(profilePreviewUrl);
                  setProfileImage(null);
                  setProfilePreviewUrl(null);
                }}
                onView={() => setPreviewDoc({ name: profileImage?.name || 'Profile Image', url: profilePreviewUrl, isPdf: false })}
              />
            </div>
          </section>

          <label className="rm-active">
            <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} disabled={saving} />
            <span>
              <strong>Active back office officer</strong>
              <small>Allow this back office officer to be used in the system.</small>
            </span>
          </label>

          {error && <p className="form-error-msg">{error}</p>}

          <div className="form-actions">
            <button type="button" className="masters-btn-secondary" onClick={() => navigate(onSuccessRedirect)} disabled={saving}>
              <ArrowLeft size={17} /> Cancel
            </button>
            <button type="submit" className="masters-btn-primary" disabled={saving || loadingMasterData || loadingRecord}>
              {saving || loadingRecord ? (
                <>
                  <LoaderCircle className="rm-spinner" size={17} /> {loadingRecord ? 'Loading...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Save size={17} /> {isEditMode ? 'Update back office' : 'Create back office'}
                </>
              )}
            </button>
          </div>
        </form>
      )}

      <DocumentPreviewModal
        isOpen={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        doc={previewDoc}
      />
    </div>
  );
}
