import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BriefcaseBusiness,
  Camera,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  deactivateOperationsUser,
  getAllOperationsUsers,
  getOperationsUserAadhaarBlob,
  getOperationsUserById,
  getOperationsUserPanBlob,
  getOperationsUserProfileImageBlob,
  normalizeOperationsUser,
} from '../../api/operationsUserApi';
import { masterService } from '../../../../Core/src/services/masterService';
import { DocumentPreviewModal, isPdfUrl } from '../../components/DocumentUpload/DocumentUploadSection';
import { MasterModal } from '../../components/masters/MasterModal/MasterModal';
import { MasterStatusBadge } from '../../components/masters/MasterStatusBadge/MasterStatusBadge';
import { usePermissions } from '../../../../Core/src/auth/permissions';
import AuthImage from '../../../../Core/src/auth/AuthImage';
import '../../components/masters/MasterTable/MasterTable.css';
import '../PeopleDirectory/PeopleDirectory.css';
import '../Dashboard/Dashboard.css';
import '../masters/StatusRole/StatusRole.css';

const ROLE_FILTERS = [
  { value: '', label: 'All Operations users' },
  { value: 'MAKER', label: 'Operations Maker' },
  { value: 'CHECKER', label: 'Operations Checker' },
];

const DOCUMENT_LOADERS = {
  aadhaar: getOperationsUserAadhaarBlob,
  pan: getOperationsUserPanBlob,
  profileImage: getOperationsUserProfileImageBlob,
};

const read = (record, ...keys) => {
  for (const key of keys) {
    if (record?.[key] !== undefined && record?.[key] !== null && String(record[key]).trim()) return record[key];
  }
  return '—';
};

const readValue = (record, ...keys) => {
  for (const key of keys) {
    if (record?.[key] !== undefined && record?.[key] !== null && String(record[key]).trim()) return record[key];
  }
  return null;
};

const readDisplayName = (record, ...keys) => {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value !== 'string') continue;
    const text = value.trim();
    if (text && !/^\d+$/.test(text)) return text;
  }
  return null;
};

const unwrapLookup = (response) => {
  const value = response?.value ?? response?.data ?? response?.result ?? response;
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.value)) return value.value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.result)) return value.result;
  return [];
};

const DETAIL_LOOKUPS = {
  gender: {
    outputKey: 'genderName',
    load: () => masterService.getGenders(),
    idKeys: ['genderId', 'GenderId'],
    nameKeys: ['genderName', 'GenderName', 'gender', 'Gender'],
    itemIdKeys: ['genderId', 'GenderId', 'id', 'Id'],
    itemNameKeys: ['genderName', 'GenderName', 'name', 'Name', 'description', 'Description'],
  },
  country: {
    outputKey: 'countryName',
    load: () => masterService.getCountries(),
    idKeys: ['countryId', 'CountryId'],
    nameKeys: ['countryName', 'CountryName', 'country', 'Country'],
    itemIdKeys: ['countryId', 'CountryId', 'id', 'Id'],
    itemNameKeys: ['countryName', 'CountryName', 'name', 'Name'],
  },
  state: {
    outputKey: 'stateName',
    load: () => masterService.getStates(),
    idKeys: ['stateId', 'StateId'],
    nameKeys: ['stateName', 'StateName', 'state', 'State'],
    itemIdKeys: ['stateId', 'StateId', 'id', 'Id'],
    itemNameKeys: ['stateName', 'StateName', 'name', 'Name'],
  },
  district: {
    outputKey: 'districtName',
    load: () => masterService.getDistricts(),
    idKeys: ['districtId', 'DistrictId'],
    nameKeys: ['districtName', 'DistrictName', 'district', 'District'],
    itemIdKeys: ['districtId', 'DistrictId', 'id', 'Id'],
    itemNameKeys: ['districtName', 'DistrictName', 'name', 'Name'],
  },
  city: {
    outputKey: 'cityName',
    load: () => masterService.getCities(),
    idKeys: ['cityId', 'CityId'],
    nameKeys: ['cityName', 'CityName', 'city', 'City'],
    itemIdKeys: ['cityId', 'CityId', 'id', 'Id'],
    itemNameKeys: ['cityName', 'CityName', 'name', 'Name'],
  },
};

const errorMessage = (error, fallback) => {
  const status = error?.response?.status;
  if (status === 400) return error?.response?.data?.message || 'The request was not accepted.';
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return 'You do not have permission to manage Operations users.';
  if (status === 404) return 'The Operations user was not found.';
  return error?.response?.data?.message || error?.message || fallback;
};

const documentName = (key) => key === 'profileImage' ? 'Profile Image' : key === 'aadhaar' ? 'Aadhaar' : 'PAN';

const formatDate = (value) => {
  if (!value || value === '—') return '—';
  const dateText = String(value).slice(0, 10);
  const date = new Date(`${dateText}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const initials = (name = '') => String(name)
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join('')
  .toUpperCase() || 'O';

function OperationsDirectoryAvatar({ operationsUserId, name }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl = null;
    setImageUrl(null);
    setImageFailed(false);

    if (!operationsUserId) return undefined;

    getOperationsUserProfileImageBlob(operationsUserId)
      .then((blob) => {
        if (!blob || typeof blob.size !== 'number' || blob.size <= 0) {
          throw new Error('Profile image is unavailable.');
        }
        objectUrl = URL.createObjectURL(blob);
        if (active) setImageUrl(objectUrl);
      })
      .catch(() => {
        if (active) setImageFailed(true);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [operationsUserId]);

  return (
    <span
      className="role-avatar"
      style={{ borderRadius: '50%', overflow: 'hidden', padding: 0 }}
      aria-label={`${name || 'Operations user'} profile image`}
    >
      {imageUrl && !imageFailed ? (
        <img
          src={imageUrl}
          alt=""
          className="role-avatar-image"
          style={{ width: '100%', height: '100%', borderRadius: 'inherit' }}
          onError={() => setImageFailed(true)}
        />
      ) : initials(name)}
    </span>
  );
}

function OperationsDetailsModal({
  isOpen,
  loading,
  user,
  documents,
  documentsLoading,
  documentsError,
  onClose,
  onPreview,
}) {
  if (!isOpen) return null;

  const fullName = read(user, 'fullName');
  const displayName = fullName === '—' ? 'Operations User' : fullName;
  const role = read(user, 'roleName', 'roleCode');
  const status = user
    ? { label: user.isActive ? 'Active' : 'Inactive', variant: user.isActive ? 'active' : 'inactive' }
    : { label: '—', variant: 'unknown' };

  return (
    <div className="exec-record-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="exec-record-dialog" role="dialog" aria-modal="true" aria-label="Operations user details" onMouseDown={(event) => event.stopPropagation()}>
        <div className="exec-record-header">
          <div className="exec-header-identity">
            <span className="exec-header-avatar" style={{ overflow: 'hidden', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              {documents.profileImage?.url ? (
                <AuthImage src={documents.profileImage.url} alt={`${displayName} avatar`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
              ) : initials(displayName)}
            </span>
            <div className="exec-header-text">
              <h2 className="exec-header-name">{displayName}</h2>
              <div className="exec-header-meta">
                <span className="exec-header-role">{role}</span>
                {read(user, 'employeeCode') !== '—' && <><span className="exec-header-dot">•</span><span className="exec-header-code">{read(user, 'employeeCode')}</span></>}
                <span className={`exec-header-status-badge ${status.variant}`}>{status.label}</span>
              </div>
            </div>
          </div>
          <button type="button" className="exec-dialog-close" onClick={onClose} aria-label="Close details"><X size={18} /></button>
        </div>

        {loading ? (
          <div className="exec-record-loading"><RefreshCw size={22} className="master-spin" /><span>Loading employee details…</span></div>
        ) : (
          <div className="exec-record-body">
            <section className="exec-section">
              <div className="exec-section-header"><ShieldCheck size={15} className="exec-section-icon" /><h3 className="exec-section-title">Personal &amp; Contact Information</h3></div>
              <div className="exec-grid-4col">
                <div className="exec-field"><span className="exec-field-label">Full Name</span><span className="exec-field-value">{fullName}</span></div>
                <div className="exec-field"><span className="exec-field-label">Date of Birth</span><span className="exec-field-value">{formatDate(read(user, 'dateOfBirth', 'dob'))}</span></div>
                <div className="exec-field"><span className="exec-field-label">Gender</span><span className="exec-field-value">{read(user, 'genderName')}</span></div>
                <div className="exec-field"><span className="exec-field-label">Mobile Number</span><span className="exec-field-value">{read(user, 'mobileNumber')}</span></div>
                <div className="exec-field exec-field-span-2"><span className="exec-field-label">Email Address</span><span className="exec-field-value">{read(user, 'emailAddress')}</span></div>
                <div className="exec-field exec-field-span-2"><span className="exec-field-label">Address</span><span className="exec-field-value">{read(user, 'address', 'Address')}</span></div>
                <div className="exec-field"><span className="exec-field-label">Country</span><span className="exec-field-value">{read(user, 'countryName')}</span></div>
                <div className="exec-field"><span className="exec-field-label">State</span><span className="exec-field-value">{read(user, 'stateName')}</span></div>
                <div className="exec-field"><span className="exec-field-label">District</span><span className="exec-field-value">{read(user, 'districtName')}</span></div>
                <div className="exec-field"><span className="exec-field-label">City</span><span className="exec-field-value">{read(user, 'cityName')}</span></div>
                <div className="exec-field"><span className="exec-field-label">Pincode</span><span className="exec-field-value monospace">{read(user, 'pincode', 'pinCode')}</span></div>
              </div>
            </section>

            <section className="exec-section">
              <div className="exec-section-header"><BriefcaseBusiness size={15} className="exec-section-icon" /><h3 className="exec-section-title">Work &amp; Organization</h3></div>
              <div className="exec-grid-4col">
                <div className="exec-field"><span className="exec-field-label">Employee Code</span><span className="exec-field-value highlight">{read(user, 'employeeCode')}</span></div>
                <div className="exec-field"><span className="exec-field-label">Role / Designation</span><span className="exec-field-value">{role}</span></div>
                <div className="exec-field"><span className="exec-field-label">Branch</span><span className="exec-field-value">{read(user, 'branch', 'branchName')}</span></div>
                <div className="exec-field"><span className="exec-field-label">Date Joined</span><span className="exec-field-value">{formatDate(read(user, 'dateJoined'))}</span></div>
                <div className="exec-field"><span className="exec-field-label">Status</span><span className="exec-field-value"><MasterStatusBadge status={user?.isActive} /></span></div>
              </div>
            </section>

            <section className="exec-section">
              <div className="exec-section-header"><FileText size={15} className="exec-section-icon" /><h3 className="exec-section-title">KYC &amp; Documents</h3></div>
              {documentsError && <div className="exec-doc-unavailable">{documentsError}</div>}
              {documentsLoading ? <div className="exec-record-loading"><RefreshCw size={18} className="master-spin" /> Loading documents...</div> : <div className="exec-docs-grid-3col">
                {['aadhaar', 'pan', 'profileImage'].map((key) => {
                  const doc = documents[key];
                  const isProfile = key === 'profileImage';
                  return (
                    <div className="exec-doc-card" key={key}>
                      <div className="exec-doc-card-info"><span className="exec-doc-icon">{isProfile ? <Camera size={18} /> : <FileText size={18} />}</span><div className="exec-doc-text"><strong className="exec-doc-title">{documentName(key)}</strong><span className="exec-doc-subtext">{doc?.url ? (isProfile ? 'Photograph uploaded' : 'Document uploaded') : 'No document uploaded'}</span></div></div>
                      {doc?.url ? <button type="button" className="exec-doc-view-btn" onClick={() => onPreview(doc)}><Eye size={13} /> {isProfile ? 'View Image' : 'View Document'}</button> : <span className="exec-doc-unavailable">{doc?.error || 'Unavailable'}</span>}
                    </div>
                  );
                })}
              </div>}
            </section>
          </div>
        )}

        <div className="exec-record-footer"><button type="button" className="exec-footer-close-btn" onClick={onClose}>Close</button></div>
      </section>
    </div>
  );
}

export default function OperationsUsersPage() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const canView = can('MASTERS.VIEW');
  const canEdit = can('MASTERS.EDIT');
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [documentPreviews, setDocumentPreviews] = useState({});
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState('');
  const [previewDoc, setPreviewDoc] = useState(null);
  const [deactivationTarget, setDeactivationTarget] = useState(null);
  const [deactivating, setDeactivating] = useState(false);
  const objectUrlsRef = useRef([]);
  const lookupCacheRef = useRef(new Map());
  const detailsRequestRef = useRef(0);
  const pageSize = 10;

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getAllOperationsUsers({ roleCode: roleFilter || undefined });
      setRecords(response.map(normalizeOperationsUser));
      setCurrentPage(1);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to load Operations users.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canView) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter, canView]);

  useEffect(() => () => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const filteredRecords = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return records;
    return records.filter((record) => [
      record.employeeCode,
      record.fullName,
      record.roleCode,
      record.roleName,
      record.mobileNumber,
      record.emailAddress,
      record.branch,
    ].some((value) => String(value || '').toLowerCase().includes(term)));
  }, [records, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const visibleRecords = filteredRecords.slice((safePage - 1) * pageSize, safePage * pageSize);

  const loadLookup = (lookupKey) => {
    const cached = lookupCacheRef.current.get(lookupKey);
    if (cached) return cached;

    const request = DETAIL_LOOKUPS[lookupKey].load()
      .then(unwrapLookup)
      .catch(() => []);
    lookupCacheRef.current.set(lookupKey, request);
    return request;
  };

  const resolveDetailFields = async (detail) => {
    const resolvedFields = {};
    const unresolved = Object.entries(DETAIL_LOOKUPS).filter(([, config]) => (
      !readDisplayName(detail, ...config.nameKeys)
      && readValue(detail, ...config.idKeys) !== null
    ));
    const collections = await Promise.all(unresolved.map(async ([lookupKey]) => [
      lookupKey,
      await loadLookup(lookupKey),
    ]));

    Object.entries(DETAIL_LOOKUPS).forEach(([lookupKey, config]) => {
      const directName = readDisplayName(detail, ...config.nameKeys);
      if (directName) {
        resolvedFields[config.outputKey] = directName;
        return;
      }

      const persistedId = readValue(detail, ...config.idKeys);
      const collection = collections.find(([key]) => key === lookupKey)?.[1] || [];
      const match = persistedId === null ? null : collection.find((item) => {
        const itemId = readValue(item, ...config.itemIdKeys);
        return itemId !== null && String(itemId) === String(persistedId);
      });
      resolvedFields[config.outputKey] = readDisplayName(match, ...config.itemNameKeys);
    });

    return { ...detail, ...resolvedFields };
  };

  const loadDocuments = async (operationsUserId, requestId) => {
    setDocumentsLoading(true);
    setDocumentsError('');
    setDocumentPreviews({});
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];
    const results = await Promise.all(Object.entries(DOCUMENT_LOADERS).map(async ([key, loader]) => {
      try {
        const blob = await loader(operationsUserId);
        if (!(blob instanceof Blob) || blob.size === 0) return [key, null];
        const url = URL.createObjectURL(blob);
        if (requestId !== detailsRequestRef.current) {
          URL.revokeObjectURL(url);
          return [key, null];
        }
        objectUrlsRef.current.push(url);
        return [key, { url, name: documentName(key), isPdf: blob.type === 'application/pdf' || isPdfUrl(blob.name || '') }];
      } catch (requestError) {
        if (requestError?.response?.status === 404) return [key, null];
        return [key, { error: errorMessage(requestError, `${documentName(key)} preview is unavailable.`) }];
      }
    }));
    if (requestId === detailsRequestRef.current) {
      setDocumentPreviews(Object.fromEntries(results));
      setDocumentsLoading(false);
    }
  };

  const openDetails = async (record) => {
    const requestId = ++detailsRequestRef.current;
    setDetailsLoading(true);
    setDocumentsError('');
    setSelectedUser(null);
    try {
      const detail = normalizeOperationsUser(await getOperationsUserById(record.operationsUserId));
      if (requestId !== detailsRequestRef.current) return;
      const resolvedDetail = await resolveDetailFields(detail);
      if (requestId !== detailsRequestRef.current) return;
      setSelectedUser(resolvedDetail);
      try {
        await loadDocuments(resolvedDetail.operationsUserId, requestId);
      } catch (requestError) {
        if (requestId === detailsRequestRef.current) {
          setDocumentsError(errorMessage(requestError, 'Some document previews are unavailable.'));
        }
      }
    } catch (requestError) {
      if (requestId === detailsRequestRef.current) {
        toast.error(errorMessage(requestError, 'Unable to load Operations user details.'));
      }
    } finally {
      if (requestId === detailsRequestRef.current) setDetailsLoading(false);
    }
  };

  const closeDetails = () => {
    if (detailsLoading) return;
    setSelectedUser(null);
    setDocumentPreviews({});
    setDocumentsError('');
    setPreviewDoc(null);
  };

  const confirmDeactivation = async () => {
    if (!deactivationTarget?.operationsUserId || deactivating) return;
    setDeactivating(true);
    try {
      await deactivateOperationsUser(deactivationTarget.operationsUserId);
      toast.success('Operations user deactivated successfully.');
      setDeactivationTarget(null);
      await load();
    } catch (requestError) {
      toast.error(errorMessage(requestError, 'Unable to deactivate the Operations user.'));
    } finally {
      setDeactivating(false);
    }
  };

  if (!canView) {
    return (
      <div className="people-directory-page">
        <div className="people-directory-card"><p>You do not have permission to view Operations users.</p></div>
      </div>
    );
  }

  return (
    <div className="people-directory-page">
      <button type="button" className="people-dir-back-btn" onClick={() => navigate('/dashboard')}>
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <section className="people-directory-card">
        <div className="people-dir-header">
          <div className="people-dir-heading-row">
            <div className="people-dir-title-wrap">
              <div className="people-dir-title-badge">
                <span className="people-dir-icon" style={{ background: '#defbe6', color: '#198038' }}><ShieldCheck size={20} /></span>
                <h1>Operations Users</h1>
                <span className="people-dir-count-badge">{records.length}</span>
              </div>
              <p className="people-dir-subtitle">Manage Operations Maker and Checker accounts.</p>
            </div>
            {canEdit && (
              <button type="button" className="masters-btn-primary" onClick={() => navigate('/create-user?type=operationsMaker')}>
                <Plus size={17} /> Add Operations User
              </button>
            )}
          </div>

          <div className="people-dir-controls">
            <label className="people-dir-search-box">
              <Search size={16} />
              <input value={search} onChange={(event) => { setSearch(event.target.value); setCurrentPage(1); }} placeholder="Search users..." aria-label="Search Operations users" />
              {search && <button type="button" className="people-dir-search-clear" onClick={() => { setSearch(''); setCurrentPage(1); }} aria-label="Clear search"><X size={14} /></button>}
            </label>
            <select className="form-input access-select" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} aria-label="Filter Operations users by role">
              {ROLE_FILTERS.map((filter) => <option key={filter.value} value={filter.value}>{filter.label}</option>)}
            </select>
            <span className="people-dir-search-badge">{filteredRecords.length} matching users</span>
            <button type="button" className="masters-btn-secondary" onClick={load} disabled={loading} title="Refresh"><RefreshCw size={16} className={loading ? 'master-spin' : ''} /></button>
          </div>
        </div>

        {error ? (
          <div className="master-table-state"><p className="master-table-error">Unable to load Operations users</p><p className="master-table-error-sub">{error}</p><button type="button" className="masters-btn-secondary" onClick={load}>Try again</button></div>
        ) : (
          <>
            <div className="people-dir-table-wrap">
              <table style={{ minWidth: '1120px' }}>
                <thead><tr><th>Employee Code</th><th>Full Name</th><th>Role</th><th>Mobile Number</th><th>Email</th><th>Branch</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {loading ? <tr><td colSpan="8" className="master-table-state">Loading Operations users...</td></tr> : visibleRecords.length === 0 ? <tr><td colSpan="8" className="master-table-state">No Operations users found.</td></tr> : visibleRecords.map((record) => (
                    <tr key={record.operationsUserId}>
                      <td style={{ whiteSpace: 'nowrap' }}>{read(record, 'employeeCode')}</td>
                      <td>
                        <div className="agent-name">
                          <OperationsDirectoryAvatar operationsUserId={record.operationsUserId} name={record.fullName} />
                          <strong>{read(record, 'fullName')}</strong>
                        </div>
                      </td>
                      <td>{read(record, 'roleName', 'roleCode')}</td>
                      <td>{read(record, 'mobileNumber')}</td>
                      <td>{read(record, 'emailAddress')}</td>
                      <td>{read(record, 'branch')}</td>
                      <td><MasterStatusBadge status={record.isActive} /></td>
                      <td>
                        <div className="master-table-actions">
                          <button type="button" className="master-action-btn edit-btn" style={{ width: 'auto', height: '2rem', padding: '0 0.55rem', gap: '0.25rem', whiteSpace: 'nowrap' }} onClick={() => openDetails(record)}><Eye size={15} /> View</button>
                          {canEdit && <button type="button" className="master-action-btn edit-btn" style={{ width: 'auto', height: '2rem', padding: '0 0.55rem', gap: '0.25rem', whiteSpace: 'nowrap' }} onClick={() => navigate(`/edit-operations-user/${record.operationsUserId}`)}><Pencil size={15} /> Edit</button>}
                          {canEdit && record.isActive !== false && <button type="button" className="master-action-btn delete-btn" style={{ width: 'auto', height: '2rem', padding: '0 0.55rem', gap: '0.25rem', whiteSpace: 'nowrap' }} onClick={() => setDeactivationTarget(record)}><Power size={15} /> Deactivate</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="people-dir-pagination-bar">
              <span className="people-dir-pagination-info">Showing {filteredRecords.length ? (safePage - 1) * pageSize + 1 : 0} to {Math.min(safePage * pageSize, filteredRecords.length)} of {filteredRecords.length} users</span>
              <div className="people-dir-pagination-controls">
                <button type="button" className="people-dir-page-btn" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={safePage <= 1}><ChevronLeft size={15} /> Previous</button>
                <div className="people-dir-page-numbers"><button type="button" className="people-dir-page-number active">{safePage}</button><span>of {totalPages}</span></div>
                <button type="button" className="people-dir-page-btn" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={safePage >= totalPages}>Next <ChevronRight size={15} /></button>
              </div>
            </div>
          </>
        )}
      </section>

      <OperationsDetailsModal
        isOpen={detailsLoading || Boolean(selectedUser)}
        loading={detailsLoading}
        user={selectedUser}
        documents={documentPreviews}
        documentsLoading={documentsLoading}
        documentsError={documentsError}
        onClose={closeDetails}
        onPreview={setPreviewDoc}
      />

      <DocumentPreviewModal isOpen={Boolean(previewDoc)} onClose={() => setPreviewDoc(null)} doc={previewDoc} />

      <MasterModal isOpen={Boolean(deactivationTarget)} onClose={() => !deactivating && setDeactivationTarget(null)} title="Deactivate Operations User" subtitle="This action changes the user's active status." icon={<Power size={20} />}>
        <p style={{ color: '#475569', marginTop: 0 }}>Are you sure you want to deactivate <strong>{deactivationTarget?.fullName || 'this user'}</strong>?</p>
        <div className="form-actions">
          <button type="button" className="masters-btn-secondary" onClick={() => setDeactivationTarget(null)} disabled={deactivating}>Cancel</button>
          <button type="button" className="masters-btn-danger" onClick={confirmDeactivation} disabled={deactivating}>{deactivating ? <RefreshCw size={16} className="master-spin" /> : <Power size={16} />} Deactivate</button>
        </div>
      </MasterModal>
    </div>
  );
}
