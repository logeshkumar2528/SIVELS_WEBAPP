import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, LoaderCircle, MapPin, Save, ShieldCheck, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { getRoles } from '../../api/accessControlApi';
import {
  createOperationsUser,
  extractOperationsUserId,
  getOperationsUserAadhaarBlob,
  getOperationsUserById,
  getOperationsUserPanBlob,
  getOperationsUserProfileImageBlob,
  normalizeOperationsUser,
  uploadOperationsUserAadhaar,
  uploadOperationsUserPan,
  uploadOperationsUserProfileImage,
  updateOperationsUser,
} from '../../api/operationsUserApi';
import { getBankBranches } from '../../api/masters/bankBranchApi';
import { getCountries } from '../../api/masters/countryApi';
import { masterService } from '../../../../Core/src/services/masterService';
import { getCurrentUserId } from '../../utils/authHelper';
import { usePermissions } from '../../../../Core/src/auth/permissions';
import {
  DocumentPreviewModal,
  DocumentUploadCard,
  isPdfUrl,
} from '../../components/DocumentUpload/DocumentUploadSection';
import '../RelationshipManager/RelationshipManagerCreate.css';
import '../masters/StatusRole/StatusRole.css';

const ROLE_CODES = ['MAKER', 'CHECKER'];

const createInitialForm = (roleCode) => ({
  roleCode: ROLE_CODES.includes(roleCode) ? roleCode : 'MAKER',
  fullName: '',
  dateOfBirth: '',
  genderId: '',
  countryId: '',
  address: '',
  stateId: '',
  cityId: '',
  districtId: '',
  pincode: '',
  mobileNumber: '',
  emailAddress: '',
  branchId: '',
  dateJoined: new Date().toISOString().slice(0, 10),
});

const unwrap = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.value)) return response.value;
  if (Array.isArray(response?.data?.value)) return response.data.value;
  return [];
};

const read = (record, ...keys) => {
  for (const key of keys) {
    if (record?.[key] !== undefined && record?.[key] !== null) return record[key];
  }
  return '';
};

const roleCodeOf = (role) => {
  const directCode = String(
    read(role, 'roleCode', 'RoleCode', 'baseRoleCode', 'BaseRoleCode', 'code', 'Code'),
  ).trim().toUpperCase();
  if (ROLE_CODES.includes(directCode)) return directCode;
  const roleName = String(read(role, 'roleName', 'RoleName', 'role', 'Role')).replace(/[\s_-]/g, '').toLowerCase();
  if (roleName.includes('checker')) return 'CHECKER';
  if (roleName.includes('maker')) return 'MAKER';
  return directCode;
};

const roleIdOf = (role) => read(role, 'roleId', 'RoleId', 'id', 'Id');

const recordFromResponse = (response) => response || null;

const errorMessage = (error, fallback) => {
  const status = error?.response?.status;
  if (status === 400) return error?.response?.data?.message || 'Please review the entered Operations user details.';
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return 'You do not have permission to manage Operations users.';
  if (status === 404) return 'The Operations user could not be found.';
  return error?.response?.data?.message || error?.message || fallback;
};

const isValidEmail = (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
const isValidMobile = (value) => /^[6-9]\d{9}$/.test(String(value || '').trim());
const isValidPincode = (value) => /^\d{6}$/.test(String(value || '').trim());

const createDocumentState = () => ({
  aadhaar: { file: null, previewUrl: null, isPdf: false, existingUrl: null, existingFileName: null, existingIsPdf: false },
  pan: { file: null, previewUrl: null, isPdf: false, existingUrl: null, existingFileName: null, existingIsPdf: false },
  profile: { file: null, previewUrl: null, isPdf: false, existingUrl: null, existingFileName: null, existingIsPdf: false },
});

const documentConfig = {
  aadhaar: { title: 'Aadhaar Card', maxSizeMb: 10, accept: '.pdf,.jpg,.jpeg,.png', isProfile: false },
  pan: { title: 'PAN Card', maxSizeMb: 10, accept: '.pdf,.jpg,.jpeg,.png', isProfile: false },
  profile: { title: 'Profile Image', maxSizeMb: 5, accept: '.jpg,.jpeg,.png', isProfile: true },
};

export default function OperationsUserCreate({ initialRoleCode = 'MAKER' } = {}) {
  const navigate = useNavigate();
  const { operationsUserId } = useParams();
  const { can } = usePermissions();
  const isEditMode = Boolean(operationsUserId);

  const [form, setForm] = useState(() => createInitialForm(initialRoleCode));
  const [roles, setRoles] = useState([]);
  const [editRoleFallback, setEditRoleFallback] = useState(null);
  const [genders, setGenders] = useState([]);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [cities, setCities] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [documentError, setDocumentError] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [documents, setDocuments] = useState(createDocumentState);
  const [previewDoc, setPreviewDoc] = useState(null);
  const blobUrlsRef = useRef([]);

  const operationsRoles = useMemo(
    () => roles.filter((role) => ROLE_CODES.includes(roleCodeOf(role)) && role.isActive !== false && role.IsActive !== false),
    [roles],
  );

  const selectedRole = useMemo(
    () => {
      const resolvedRole = operationsRoles.find((role) => roleCodeOf(role) === form.roleCode);
      if (resolvedRole) return resolvedRole;
      const roleExistsInResponse = roles.some((role) => roleCodeOf(role) === form.roleCode);
      if (
        isEditMode
        && !roleExistsInResponse
        && editRoleFallback?.roleCode === form.roleCode
        && roleIdOf(editRoleFallback)
      ) {
        return editRoleFallback;
      }
      return null;
    },
    [editRoleFallback, form.roleCode, isEditMode, operationsRoles, roles],
  );

  useEffect(() => () => {
    blobUrlsRef.current.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore cleanup failures
      }
    });
    blobUrlsRef.current = [];
  }, []);

  const updateDocument = (key, patch) => {
    setDocuments((current) => ({
      ...current,
      [key]: { ...current[key], ...patch },
    }));
    setDocumentError('');
  };

  const handleDocumentUpload = (key, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const config = documentConfig[key];
    const allowedTypes = config.isProfile
      ? ['image/jpeg', 'image/jpg', 'image/png']
      : ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setDocumentError(`${config.title} must be a PDF, JPG, JPEG, or PNG file.`);
      event.target.value = '';
      return;
    }
    if (file.size > config.maxSizeMb * 1024 * 1024) {
      setDocumentError(`${config.title} must not exceed ${config.maxSizeMb}MB.`);
      event.target.value = '';
      return;
    }

    const previousPreview = documents[key].previewUrl;
    if (previousPreview) URL.revokeObjectURL(previousPreview);
    updateDocument(key, {
      file,
      previewUrl: URL.createObjectURL(file),
      isPdf: file.type === 'application/pdf' || isPdfUrl(file.name),
    });
    event.target.value = '';
  };

  const handleRemoveDocument = (key) => {
    const previousPreview = documents[key].previewUrl;
    if (previousPreview) URL.revokeObjectURL(previousPreview);
    updateDocument(key, { file: null, previewUrl: null, isPdf: false });
  };

  const loadExistingDocuments = async (targetId) => {
    const loaders = [
      ['aadhaar', getOperationsUserAadhaarBlob],
      ['pan', getOperationsUserPanBlob],
      ['profile', getOperationsUserProfileImageBlob],
    ];
    const results = await Promise.allSettled(loaders.map(([, loader]) => loader(targetId)));
    const next = {};
    let failed = false;

    results.forEach((result, index) => {
      const [key] = loaders[index];
      if (result.status !== 'fulfilled') {
        if (result.reason?.response?.status !== 404) failed = true;
        return;
      }
      const blob = result.value;
      if (!blob || typeof blob.size !== 'number' || blob.size <= 0) return;
      const url = URL.createObjectURL(blob);
      blobUrlsRef.current.push(url);
      next[key] = {
        existingUrl: url,
        existingFileName: documentConfig[key].title,
        existingIsPdf: blob.type === 'application/pdf',
      };
    });

    if (Object.keys(next).length) {
      setDocuments((current) => ({
        ...current,
        ...Object.fromEntries(Object.entries(next).map(([key, value]) => [key, { ...current[key], ...value }])),
      }));
    }
    if (failed) setDocumentError('One or more existing Operations documents could not be retrieved.');
  };

  useEffect(() => {
    if (!isEditMode && ROLE_CODES.includes(initialRoleCode)) {
      setForm((current) => ({ ...current, roleCode: initialRoleCode }));
    }
  }, [initialRoleCode, isEditMode]);

  const visibleStates = useMemo(() => states.filter((row) => {
    const countryId = read(row, 'countryId', 'CountryId');
    return !form.countryId || !countryId || String(countryId) === String(form.countryId);
  }), [states, form.countryId]);

  const visibleDistricts = useMemo(() => districts.filter((row) => {
    const stateId = read(row, 'stateId', 'StateId');
    return !form.stateId || !stateId || String(stateId) === String(form.stateId);
  }), [districts, form.stateId]);

  const visibleCities = useMemo(() => cities.filter((row) => {
    const stateId = read(row, 'stateId', 'StateId');
    const districtId = read(row, 'districtId', 'DistrictId');
    return (!form.stateId || !stateId || String(stateId) === String(form.stateId))
      && (!form.districtId || !districtId || String(districtId) === String(form.districtId));
  }), [cities, form.stateId, form.districtId]);

  useEffect(() => {
    let active = true;

    Promise.all([
      getRoles(),
      masterService.getGenders(),
      getCountries(),
      masterService.getStates(),
      masterService.getDistricts(),
      masterService.getCities(),
      getBankBranches(),
      isEditMode ? getOperationsUserById(operationsUserId) : Promise.resolve(null),
    ])
      .then(([roleResponse, genderResponse, countryResponse, stateResponse, districtResponse, cityResponse, branchResponse, recordResponse]) => {
        if (!active) return;
        const roleRows = unwrap(roleResponse);
        const record = recordFromResponse(recordResponse);
        const recordValue = record ? normalizeOperationsUser(record) : null;
        const branchRows = unwrap(branchResponse);

        setRoles(roleRows);
        setGenders(unwrap(genderResponse));
        setCountries(unwrap(countryResponse));
        setStates(unwrap(stateResponse));
        setDistricts(unwrap(districtResponse));
        setCities(unwrap(cityResponse));
        setBranches(branchRows);

        if (recordValue) {
          const recordRoleCode = roleCodeOf(recordValue);
          const existingRoleCode = ROLE_CODES.includes(recordRoleCode) ? recordRoleCode : '';
          const existingRoleId = read(recordValue, 'roleId', 'RoleId');
          const recordBranch = read(recordValue, 'branch', 'Branch', 'branchName', 'BranchName');
          const matchedBranch = branchRows.find((branch) => String(read(branch, 'branchName', 'BranchName', 'branch', 'Branch', 'name', 'Name')).trim().toLowerCase() === String(recordBranch).trim().toLowerCase());
          setEditRoleFallback(existingRoleCode && existingRoleId ? {
            roleCode: existingRoleCode,
            roleId: existingRoleId,
          } : null);
          setForm({
            roleCode: existingRoleCode || initialRoleCode,
            fullName: read(recordValue, 'fullName', 'FullName', 'name', 'Name'),
            dateOfBirth: read(recordValue, 'dateOfBirth', 'DateOfBirth') ? String(read(recordValue, 'dateOfBirth', 'DateOfBirth')).slice(0, 10) : '',
            genderId: read(recordValue, 'genderId', 'GenderId'),
            countryId: read(recordValue, 'countryId', 'CountryId'),
            address: read(recordValue, 'address', 'Address'),
            stateId: read(recordValue, 'stateId', 'StateId'),
            cityId: read(recordValue, 'cityId', 'CityId'),
            districtId: read(recordValue, 'districtId', 'DistrictId'),
            pincode: read(recordValue, 'pincode', 'Pincode'),
            mobileNumber: read(recordValue, 'mobileNumber', 'MobileNumber', 'phoneNumber', 'PhoneNumber'),
            emailAddress: read(recordValue, 'emailAddress', 'EmailAddress', 'email', 'Email'),
            branchId: read(recordValue, 'branchId', 'BranchId', 'bankBranchId', 'BankBranchId') || (matchedBranch ? read(matchedBranch, 'branchId', 'BranchId', 'bankBranchId', 'BankBranchId', 'id', 'Id') : ''),
            dateJoined: read(recordValue, 'dateJoined', 'DateJoined') ? String(read(recordValue, 'dateJoined', 'DateJoined')).slice(0, 10) : '',
          });
          setIsActive(recordValue.isActive);
          loadExistingDocuments(operationsUserId);
        }
      })
      .catch((requestError) => {
        if (active) setError(errorMessage(requestError, 'Unable to load Operations user form data.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [initialRoleCode, isEditMode, operationsUserId]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError('');
  };

  const validate = () => {
    const currentUserId = getCurrentUserId();
    if (!selectedRole || !roleIdOf(selectedRole)) return 'The selected Operations role is not available from the backend.';
    if (!form.fullName.trim()) return 'Full Name is required.';
    if (!form.dateOfBirth) return 'Date of Birth is required.';
    if (new Date(form.dateOfBirth) > new Date()) return 'Date of Birth cannot be in the future.';
    if (!form.genderId) return 'Gender is required.';
    if (!form.countryId) return 'Country is required.';
    if (!form.address.trim()) return 'Address is required.';
    if (!form.stateId) return 'State is required.';
    if (!form.cityId) return 'City is required.';
    if (!form.districtId) return 'District is required.';
    if (!isValidPincode(form.pincode)) return 'Pincode must contain exactly 6 digits.';
    if (!isValidMobile(form.mobileNumber)) return 'Mobile Number must contain 10 digits and start with 6-9.';
    if (!isValidEmail(form.emailAddress)) return 'Enter a valid Email Address.';
    if (!form.branchId) return 'Branch is required.';
    if (!form.dateJoined) return 'Date Joined is required.';
    if (!isEditMode && !currentUserId) return 'The authenticated Admin ID is unavailable. Please sign in again.';
    return '';
  };

  const buildPayload = () => {
    const branch = branches.find((row) => String(read(row, 'branchId', 'BranchId', 'bankBranchId', 'BankBranchId', 'id', 'Id')) === String(form.branchId));
    const state = states.find((row) => String(read(row, 'stateId', 'StateId', 'id', 'Id')) === String(form.stateId));
    const city = cities.find((row) => String(read(row, 'cityId', 'CityId', 'id', 'Id')) === String(form.cityId));
    const district = districts.find((row) => String(read(row, 'districtId', 'DistrictId', 'id', 'Id')) === String(form.districtId));
    const payload = {
      roleId: roleIdOf(selectedRole),
      fullName: form.fullName.trim(),
      dateOfBirth: form.dateOfBirth,
      genderId: form.genderId,
      countryId: form.countryId,
      address: form.address.trim(),
      stateId: form.stateId,
      state: read(state, 'stateName', 'StateName', 'name', 'Name'),
      cityId: form.cityId,
      city: read(city, 'cityName', 'CityName', 'name', 'Name'),
      districtId: form.districtId,
      district: read(district, 'districtName', 'DistrictName', 'name', 'Name'),
      pincode: form.pincode.trim(),
      mobileNumber: form.mobileNumber.trim(),
      emailAddress: form.emailAddress.trim(),
      branchId: form.branchId,
      branch: read(branch, 'branchName', 'BranchName', 'branch', 'Branch', 'name', 'Name'),
      dateJoined: form.dateJoined,
      isActive,
    };

    if (!isEditMode) payload.createdBy = getCurrentUserId();
    return payload;
  };

  const uploadSelectedDocuments = async (targetId) => {
    const uploads = [
      ['aadhaar', uploadOperationsUserAadhaar],
      ['pan', uploadOperationsUserPan],
      ['profile', uploadOperationsUserProfileImage],
    ];
    for (const [key, upload] of uploads) {
      const document = documents[key];
      if (!document.file) continue;
      try {
        await upload(targetId, document.file, Boolean(document.existingUrl));
      } catch (requestError) {
        const detail = requestError?.response?.data?.message
          || requestError?.message
          || 'The server rejected the document upload.';
        const operation = isEditMode ? 'updated' : 'created';
        throw new Error(`Operations user ${operation}, but ${documentConfig[key].title} upload failed: ${detail}`);
      }
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    setSaving(true);
    setError('');
    setDocumentError('');
    try {
      const payload = buildPayload();
      let targetId = operationsUserId;
      if (isEditMode) {
        await updateOperationsUser(operationsUserId, payload);
      } else {
        const response = await createOperationsUser(payload);
        targetId = extractOperationsUserId(response);
        if (!targetId) throw new Error('The Operations user was saved, but no operationsUserId was returned for document upload.');
      }
      await uploadSelectedDocuments(targetId);
      toast.success(isEditMode ? 'Operations user updated successfully.' : 'Operations user created successfully.');
      navigate('/operations-users');
    } catch (requestError) {
      const message = requestError?.response?.status
        ? errorMessage(requestError, 'Unable to save the Operations user.')
        : requestError?.message || 'Unable to save the Operations user.';
      const isDocumentRequest = typeof FormData !== 'undefined' && requestError?.config?.data instanceof FormData;
      if (isDocumentRequest || /document|file|upload/i.test(message)) {
        setDocumentError(message);
      } else {
        setError(message);
      }
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (!can('MASTERS.EDIT')) {
    return (
      <div className="masters-page">
        <div className="master-table-state">
          <p className="master-table-error">Access denied</p>
          <p className="master-table-error-sub">You do not have permission to manage Operations users.</p>
        </div>
      </div>
    );
  }

  const renderDocumentCard = (key) => {
    const config = documentConfig[key];
    const document = documents[key];
    return (
      <DocumentUploadCard
        key={key}
        title={config.title}
        subtitle={key === 'profile' ? 'Upload a clear profile image' : `Upload ${config.title.toLowerCase()}`}
        note={`${config.isProfile ? 'JPG or PNG' : 'JPG, PNG or PDF'} (Max. ${config.maxSizeMb}MB)`}
        accept={config.accept}
        icon={config.isProfile ? 'camera' : 'document'}
        isProfile={config.isProfile}
        file={document.file}
        previewUrl={document.previewUrl || document.existingUrl}
        isPdf={document.file ? document.isPdf : document.existingIsPdf}
        isExisting={Boolean(!document.file && document.existingUrl)}
        existingUrl={document.existingUrl}
        existingFileName={document.existingFileName}
        onUpload={(event) => handleDocumentUpload(key, event)}
        onRemove={() => handleRemoveDocument(key)}
        onView={() => setPreviewDoc({
          name: document.file?.name || config.title,
          url: document.previewUrl,
          isPdf: document.isPdf,
        })}
        onViewExisting={() => setPreviewDoc({
          name: document.existingFileName || config.title,
          url: document.existingUrl,
          isPdf: document.existingIsPdf,
        })}
      />
    );
  };

  return (
    <div className="masters-page rm-create-page">
      <header className="rm-hero">
        <div className="rm-hero-icon"><ShieldCheck size={26} /></div>
        <div>
          <span className="rm-eyebrow">OPERATIONS USER MANAGEMENT</span>
          <h1>{isEditMode ? 'Edit Operations user' : 'Create Operations user'}</h1>
          <p>Manage Maker and Checker profiles using backend-provided role and master data.</p>
        </div>
      </header>

      {loading ? (
        <div className="rm-create-card" style={{ display: 'grid', placeItems: 'center', minHeight: '280px' }}>
          <LoaderCircle size={22} className="rm-spinner" />
          <p style={{ marginTop: '10px', color: '#64748b' }}>Loading Operations user form…</p>
        </div>
      ) : (
        <form className="rm-create-card" onSubmit={handleSubmit} noValidate>
          <section className="rm-section">
            <div className="rm-section-heading">
              <UserRound size={19} />
              <div>
                <h2>Operations user details</h2>
                <p>Only confirmed Operations identity and assignment fields are collected.</p>
              </div>
            </div>
            <div className="rm-form-grid">
              <label className="form-group">
                <span className="form-label">Role <span className="text-danger">*</span></span>
                <select className="form-input" value={form.roleCode} onChange={(event) => updateField('roleCode', event.target.value)} disabled={saving}>
                  {ROLE_CODES.map((code) => (
                    <option key={code} value={code} disabled={!operationsRoles.some((role) => roleCodeOf(role) === code)}>
                      {code === 'MAKER' ? 'Operations Maker' : 'Operations Checker'}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-group">
                <span className="form-label">Full Name <span className="text-danger">*</span></span>
                <input className="form-input" value={form.fullName} onChange={(event) => updateField('fullName', event.target.value)} disabled={saving} />
              </label>
              <label className="form-group">
                <span className="form-label">Date of Birth <span className="text-danger">*</span></span>
                <input type="date" className="form-input" value={form.dateOfBirth} onChange={(event) => updateField('dateOfBirth', event.target.value)} disabled={saving} />
              </label>
              <label className="form-group">
                <span className="form-label">Gender <span className="text-danger">*</span></span>
                <select className="form-input" value={form.genderId} onChange={(event) => updateField('genderId', event.target.value)} disabled={saving}>
                  <option value="">Select gender</option>
                  {genders.filter((gender) => gender.isActive !== false && gender.IsActive !== false).map((gender) => {
                    const id = read(gender, 'genderId', 'GenderId', 'id', 'Id');
                    return <option key={id} value={id}>{read(gender, 'genderName', 'GenderName', 'name', 'Name', 'description', 'Description')}</option>;
                  })}
                </select>
              </label>
            </div>
          </section>

          <section className="rm-section">
            <div className="rm-section-heading">
              <MapPin size={19} />
              <div>
                <h2>Location and contact</h2>
                <p>Location choices are loaded from the existing master services.</p>
              </div>
            </div>
            <div className="rm-form-grid">
              <label className="form-group rm-field-wide">
                <span className="form-label">Address <span className="text-danger">*</span></span>
                <input className="form-input" value={form.address} onChange={(event) => updateField('address', event.target.value)} disabled={saving} />
              </label>
              <label className="form-group">
                <span className="form-label">Country <span className="text-danger">*</span></span>
                <select className="form-input" value={form.countryId} onChange={(event) => updateField('countryId', event.target.value)} disabled={saving}>
                  <option value="">Select country</option>
                  {countries.map((country) => {
                    const id = read(country, 'countryId', 'CountryId', 'id', 'Id');
                    return <option key={id} value={id}>{read(country, 'countryName', 'CountryName', 'name', 'Name')}</option>;
                  })}
                </select>
              </label>
              <label className="form-group">
                <span className="form-label">State <span className="text-danger">*</span></span>
                <select className="form-input" value={form.stateId} onChange={(event) => updateField('stateId', event.target.value)} disabled={saving || !form.countryId}>
                  <option value="">{form.countryId ? 'Select state' : 'Select country first'}</option>
                  {visibleStates.map((state) => {
                    const id = read(state, 'stateId', 'StateId', 'id', 'Id');
                    return <option key={id} value={id}>{read(state, 'stateName', 'StateName', 'name', 'Name')}</option>;
                  })}
                </select>
              </label>
              <label className="form-group">
                <span className="form-label">District <span className="text-danger">*</span></span>
                <select className="form-input" value={form.districtId} onChange={(event) => updateField('districtId', event.target.value)} disabled={saving || !form.stateId}>
                  <option value="">{form.stateId ? 'Select district' : 'Select state first'}</option>
                  {visibleDistricts.map((district) => {
                    const id = read(district, 'districtId', 'DistrictId', 'id', 'Id');
                    return <option key={id} value={id}>{read(district, 'districtName', 'DistrictName', 'name', 'Name')}</option>;
                  })}
                </select>
              </label>
              <label className="form-group">
                <span className="form-label">City <span className="text-danger">*</span></span>
                <select className="form-input" value={form.cityId} onChange={(event) => updateField('cityId', event.target.value)} disabled={saving || !form.districtId}>
                  <option value="">{form.districtId ? 'Select city' : 'Select district first'}</option>
                  {visibleCities.map((city) => {
                    const id = read(city, 'cityId', 'CityId', 'id', 'Id');
                    return <option key={id} value={id}>{read(city, 'cityName', 'CityName', 'name', 'Name')}</option>;
                  })}
                </select>
              </label>
              <label className="form-group">
                <span className="form-label">Pincode <span className="text-danger">*</span></span>
                <input className="form-input" inputMode="numeric" value={form.pincode} onChange={(event) => updateField('pincode', event.target.value)} disabled={saving} />
              </label>
              <label className="form-group">
                <span className="form-label">Mobile Number <span className="text-danger">*</span></span>
                <input className="form-input" inputMode="tel" value={form.mobileNumber} onChange={(event) => updateField('mobileNumber', event.target.value)} disabled={saving} />
              </label>
              <label className="form-group">
                <span className="form-label">Email Address</span>
                <input type="email" className="form-input" value={form.emailAddress} onChange={(event) => updateField('emailAddress', event.target.value)} disabled={saving} />
              </label>
              <label className="form-group">
                <span className="form-label">Branch <span className="text-danger">*</span></span>
                <select className="form-input" value={form.branchId} onChange={(event) => updateField('branchId', event.target.value)} disabled={saving}>
                  <option value="">Select branch</option>
                  {branches.filter((branch) => branch.isActive !== false && branch.IsActive !== false).map((branch) => {
                    const id = read(branch, 'branchId', 'BranchId', 'bankBranchId', 'BankBranchId', 'id', 'Id');
                    return <option key={id} value={id}>{read(branch, 'branchName', 'BranchName', 'branch', 'Branch', 'name', 'Name')}</option>;
                  })}
                </select>
              </label>
              <label className="form-group">
                <span className="form-label">Date Joined <span className="text-danger">*</span></span>
                <input type="date" className="form-input" value={form.dateJoined} onChange={(event) => updateField('dateJoined', event.target.value)} disabled={saving || !isEditMode} />
              </label>
            </div>
          </section>

          <section className="rm-section">
            <div className="rm-section-heading">
              <ShieldCheck size={19} />
              <div>
                <h2>Required Documents</h2>
                <p>Upload or replace Operations identity documents and profile image.</p>
              </div>
            </div>
            <div className="doc-upload-grid">
              {['aadhaar', 'pan', 'profile'].map(renderDocumentCard)}
            </div>
            {documentError && <p className="form-error-msg">{documentError}</p>}
          </section>

          <label className="rm-active">
            <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} disabled={saving} />
            <span>
              <strong>Active Operations user</strong>
              <small>Allow this user to access the system when the backend account is active.</small>
            </span>
          </label>

          {error && <p className="form-error-msg">{error}</p>}

          <div className="form-actions">
            <button type="button" className="masters-btn-secondary" onClick={() => navigate('/operations-users')} disabled={saving}>
              <ArrowLeft size={17} /> Cancel
            </button>
            <button type="submit" className="masters-btn-primary" disabled={saving || !selectedRole}>
              {saving ? <LoaderCircle size={17} className="rm-spinner" /> : <Save size={17} />}
              {isEditMode ? 'Save changes' : 'Create user'}
            </button>
          </div>
          <DocumentPreviewModal
            isOpen={Boolean(previewDoc)}
            onClose={() => setPreviewDoc(null)}
            doc={previewDoc}
          />
        </form>
      )}
    </div>
  );
}
