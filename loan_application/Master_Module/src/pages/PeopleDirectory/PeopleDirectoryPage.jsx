import { apiFetch } from '../../../../Core/src/api/apiFetch';
import { API_BASE_URL } from '../../../../Core/src/api/apiConfig';
import { getAccessToken } from '../../../../Core/src/auth/tokenStore';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  Camera,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Landmark,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { formatDateTime, formatDateTimeFriendly } from '../../utils/dateHelper';
import { getAllAgents, getAgentById } from '../../api/agentApi';
import { getAllRelationshipManagers, getRelationshipManager } from '../../api/rmApi';
import { getAllBackOffice, getBackOfficeById } from '../../api/backOfficeApi';
import { getAllAMS, getAMSById, getAMSDistrictsByAmsId } from '../../api/amsApi';
import { getAllCreditManagers, getCreditManagerById } from '../../api/creditManagerApi';
import { getAllCreditHeads, getCreditHeadById } from '../../api/creditHeadApi';
import { agentCustomerService } from '../../../../Core/src/services/agentCustomerService';
import { selectLatestCustomerPhotoDoc } from '../../../../Core/src/utils/documentTypeHelper';
import { getProfileImageUrl, getDocumentUrl, buildFileUrl } from '../../utils/profileImageHelper';
import { resolveApplicationOwnership } from '../../../../Core/src/utils/ownershipHelper';
import { getStates } from '../../api/masters/stateApi';
import { getCities } from '../../api/masters/cityApi';
import { getDistricts } from '../../api/masters/districtApi';
import './PeopleDirectory.css';
import '../Dashboard/Dashboard.css';
import AuthImage from '../../../../Core/src/auth/AuthImage';
import { useAuthedObjectUrl } from '../../../../Core/src/auth/useAuthedObjectUrl';

const API_BASE = API_BASE_URL;

const unwrap = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.value)) return response.value;
  if (Array.isArray(response?.data?.value)) return response.data.value;
  return [];
};

// Module-level cached promises/data to ensure location lookups are fetched once across the Master directory session
let locationLookupCache = null;
let locationLookupPromise = null;

export const fetchLocationLookups = () => {
  if (locationLookupCache) return Promise.resolve(locationLookupCache);
  if (!locationLookupPromise) {
    locationLookupPromise = Promise.allSettled([getStates(), getCities(), getDistricts()])
      .then(([statesRes, citiesRes, districtsRes]) => {
        locationLookupCache = {
          states: statesRes.status === 'fulfilled' ? unwrap(statesRes.value) : [],
          cities: citiesRes.status === 'fulfilled' ? unwrap(citiesRes.value) : [],
          districts: districtsRes.status === 'fulfilled' ? unwrap(districtsRes.value) : [],
        };
        return locationLookupCache;
      })
      .catch(() => {
        locationLookupCache = { states: [], cities: [], districts: [] };
        return locationLookupCache;
      });
  }
  return locationLookupPromise;
};

const read = (record, keys, fallback = '') =>
  keys.map((key) => record?.[key]).find((value) => value !== undefined && value !== null && value !== '') ?? fallback;

const status = (value, fallback = 'Active') =>
  typeof value === 'boolean'
    ? value
      ? 'Active'
      : 'Inactive'
    : String(value || fallback).replace(/^./, (letter) => letter.toUpperCase());

const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'A';

const money = (value) => Number(String(value ?? '').replace(/[^0-9.-]/g, '')) || 0;

const formatAmount = (amount) =>
  amount > 0
    ? new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(amount)
    : '—';

export const getAadhaarPath = (record) =>
  read(record, [
    'aadhaarDocumentPath',
    'AadhaarDocumentPath',
    'aadharDocumentPath',
    'AadharDocumentPath',
    'aadhaarPath',
    'AadhaarPath',
    'aadharPath',
    'AadharPath',
    'aadhaarCardPath',
    'AadhaarCardPath',
    'aadharCardPath',
    'AadharCardPath',
  ]);

export const getPanPath = (record) =>
  read(record, [
    'panCardPath',
    'PanCardPath',
    'PANCardPath',
    'panDocumentPath',
    'PanDocumentPath',
    'PANDocumentPath',
    'panPath',
    'PanPath',
    'PANPath',
  ]);

export const getProfilePath = (record) =>
  read(record, [
    'profileImagePath',
    'ProfileImagePath',
    'profilePath',
    'ProfilePath',
    'profileImage',
    'ProfileImage',
    'profilePicturePath',
    'ProfilePicturePath',
  ]);

export const isPdfFile = (urlOrPath = '') => {
  if (!urlOrPath) return false;
  return /\.pdf(\?.*)?$/i.test(String(urlOrPath));
};

const formatDistrictList = (districts) => {
  if (!districts || !Array.isArray(districts) || districts.length === 0) {
    return 'No districts assigned';
  }
  const names = districts
    .map((d) => {
      if (typeof d === 'string') return d.trim();
      if (typeof d === 'object' && d !== null) {
        return (d.districtName || d.name || d.district || `District #${d.districtId || ''}`).trim();
      }
      return String(d || '').trim();
    })
    .filter(Boolean);

  return names.length > 0 ? names.join(', ') : 'No districts assigned';
};

const formatDob = (dob) => {
  if (!dob) return '—';
  try {
    const d = new Date(dob);
    if (isNaN(d.getTime())) return String(dob).slice(0, 10);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return String(dob);
  }
};

const normalizeApplicationStatus = (value, statusName = '') => {
  const named = String(statusName || '').trim().toLowerCase();
  if (named.includes('approved')) return 'Approved';
  if (named.includes('returned') || named.includes('reject')) return 'Returned';
  if (named.includes('review')) return 'Under Review';
  if (named.includes('pending') || named.includes('progress')) return 'Pending';
  if (named.includes('new') || named.includes('draft')) return 'New';
  if (named.includes('disburs')) return 'Disbursed';

  if (value !== null && value !== undefined && value !== '') {
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) {
      if (numeric === 6) return 'Returned';
      if (numeric === 5) return 'Rejected';
      if (numeric === 4) return 'Approved';
      if (numeric === 3) return 'Under Review';
      if (numeric === 2) return 'Logged to HO';
      if (numeric === 1) return 'Pending';
      if (numeric === 0) return 'New';
    }
  }

  const raw = String(value || '').trim();
  if (!raw || raw.toLowerCase() === 'draft') return 'New';
  return raw.replace(/^./, (letter) => letter.toUpperCase());
};

const isCustomerEditable = (record) => {
  if (!record) return false;
  const val = record.rawStatus !== undefined && record.rawStatus !== null ? record.rawStatus : record.status;
  if (val === null || val === undefined || val === '' || typeof val === 'boolean') return false;
  const num = Number(val);
  return !Number.isNaN(num) && num === 0;
};

const authHeaders = () => {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

function DirectoryAvatar({ role, id, name, className = 'role-avatar', style, version = null, imagePath = undefined }) {
  const [error, setError] = useState(false);
  const [liveVersion, setLiveVersion] = useState(version || Date.now());

  useEffect(() => {
    if (version) {
      setLiveVersion(version);
      setError(false);
    }
  }, [version]);

  useEffect(() => {
    const handleUpdate = (e) => {
      if (!e.detail?.role || e.detail.role.toLowerCase() === String(role).toLowerCase()) {
        setLiveVersion(e.detail?.timestamp || Date.now());
        setError(false);
      }
    };
    window.addEventListener('profile-image-updated', handleUpdate);
    return () => window.removeEventListener('profile-image-updated', handleUpdate);
  }, [role]);

  // If imagePath is explicitly provided and is empty/null/false (and no live update occurred), skip image fetch
  const hasNoExplicitImage = imagePath !== undefined && !imagePath && liveVersion === version;
  const effectiveVersion = version || liveVersion;
  const imageUrl = hasNoExplicitImage ? null : getProfileImageUrl(role, id, effectiveVersion);

  useEffect(() => {
    setError(false);
  }, [imageUrl]);

  if (imageUrl && !error) {
    return (
      <span
        className={className}
        style={{
          overflow: 'hidden',
          padding: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style,
        }}
      >
        <AuthImage
          src={imageUrl}
          alt={`${name || role} avatar`}
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
          onError={() => setError(true)}
        />
      </span>
    );
  }

  return <span className={className} style={style}>{initials(name)}</span>;
}

const customerPhotoCache = new Map();

function CustomerDirectoryAvatar({ customerId, name, className = 'role-avatar', style }) {
  const [photoUrl, setPhotoUrl] = useState(() => {
    const idKey = String(customerId || '');
    return idKey ? (customerPhotoCache.get(idKey) || null) : null;
  });

  useEffect(() => {
    if (!customerId) return;
    const idKey = String(customerId);

    if (customerPhotoCache.has(idKey)) {
      setPhotoUrl(customerPhotoCache.get(idKey));
      return;
    }

    let isMounted = true;

    async function loadCustomerPhoto() {
      try {
        const docsRes = await agentCustomerService.getDocumentsByCustomerId(customerId);
        const docs = Array.isArray(docsRes) ? docsRes : (docsRes?.data || docsRes?.value || []);
        const photoDoc = selectLatestCustomerPhotoDoc(docs);

        if (!photoDoc) {
          if (isMounted) setPhotoUrl(null);
          return;
        }

        const docId = photoDoc.agentCustomerDocumentId ?? photoDoc.AgentCustomerDocumentId ?? photoDoc.id;
        if (!docId) {
          if (isMounted) setPhotoUrl(null);
          return;
        }

        const blob = await agentCustomerService.downloadDocument(docId);
        if (blob && blob.size > 0) {
          let mimeType = blob.type && blob.type !== 'application/octet-stream' ? blob.type : 'image/jpeg';
          const fileName = String(photoDoc.fileName || photoDoc.documentName || photoDoc.filePath || '').toLowerCase();
          if (fileName.endsWith('.png')) mimeType = 'image/png';
          else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) mimeType = 'image/jpeg';
          else if (fileName.endsWith('.webp')) mimeType = 'image/webp';

          const typedBlob = blob.type === mimeType ? blob : new Blob([blob], { type: mimeType });
          const objectUrl = URL.createObjectURL(typedBlob);

          // Only cache successful downloads
          customerPhotoCache.set(idKey, objectUrl);

          if (isMounted) {
            setPhotoUrl(objectUrl);
          }
        } else {
          if (isMounted) setPhotoUrl(null);
        }
      } catch {
        // Do not cache failed requests permanently
        if (isMounted) {
          setPhotoUrl(null);
        }
      }
    }

    loadCustomerPhoto();

    return () => {
      isMounted = false;
    };
  }, [customerId]);

  const handleImageError = () => {
    const idKey = String(customerId || '');
    if (idKey && customerPhotoCache.has(idKey)) {
      const url = customerPhotoCache.get(idKey);
      if (url && url.startsWith('blob:')) {
        try { URL.revokeObjectURL(url); } catch (_) {}
      }
      customerPhotoCache.delete(idKey);
    }
    setPhotoUrl(null);
  };

  if (photoUrl) {
    return (
      <span
        className={className}
        style={{
          overflow: 'hidden',
          padding: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style,
        }}
      >
        <img
          src={photoUrl}
          alt={name ? `${name} avatar` : 'Customer avatar'}
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
          onError={handleImageError}
        />
      </span>
    );
  }

  return <span className={className} style={style}>{initials(name)}</span>;
}

function SublistRecordsModal({ modalData, onClose }) {
  if (!modalData) return null;
  const { title, type, records = [] } = modalData;
  const isCustomer = type === 'customers';

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="exec-record-backdrop"
      role="presentation"
      style={{ zIndex: 1200 }}
      onMouseDown={onClose}
    >
      <section
        className="exec-record-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          maxWidth: '640px',
          width: '92%',
          maxHeight: '85vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#FFFFFF',
          borderRadius: '10px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)'
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header
          style={{
            background: 'linear-gradient(135deg, #0F3E2E 0%, #16533D 100%)',
            color: '#FFFFFF',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={18} style={{ color: '#86EFAC' }} />
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#FFFFFF' }}>{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
              borderRadius: '4px',
              opacity: 0.85
            }}
          >
            <X size={18} />
          </button>
        </header>

        <div style={{ padding: '16px 20px', overflowY: 'auto', overflowX: 'hidden', flex: 1, backgroundColor: '#FFFFFF' }}>
          {records.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#64748B', fontSize: '14px' }}>
              No {isCustomer ? 'customers' : 'agents'} found.
            </div>
          ) : (
            <table
              style={{
                width: '100%',
                minWidth: '0px',
                tableLayout: 'fixed',
                borderCollapse: 'collapse',
                fontSize: '13px'
              }}
            >
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E8F0', backgroundColor: '#F8FAFC', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px', width: '60px', color: '#475569', fontWeight: 600 }}>S.No</th>
                  <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 600, overflowWrap: 'break-word' }}>
                    {isCustomer ? 'Customer Name' : 'Agent Name'}
                  </th>
                  <th style={{ padding: '10px 12px', width: '160px', color: '#475569', fontWeight: 600, overflowWrap: 'break-word' }}>
                    {isCustomer ? 'Customer Code' : 'Agent Code'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {records.map((item, idx) => (
                  <tr
                    key={item.id || idx}
                    style={{
                      borderBottom: '1px solid #E2E8F0',
                      backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA'
                    }}
                  >
                    <td style={{ padding: '10px 12px', color: '#64748B', fontWeight: 500, verticalAlign: 'middle' }}>
                      {item.sNo || idx + 1}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#0F172A', fontWeight: 600, verticalAlign: 'middle', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                      {item.name || '—'}
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#166534', fontWeight: 600, verticalAlign: 'middle', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                      {item.code || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <footer
          style={{
            padding: '12px 20px',
            backgroundColor: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span style={{ fontSize: '12px', color: '#64748B' }}>
            Total: <strong>{records.length}</strong> {records.length === 1 ? (isCustomer ? 'Customer' : 'Agent') : (isCustomer ? 'Customers' : 'Agents')}
          </span>
          <button
            type="button"
            className="details-button"
            onClick={onClose}
            style={{ padding: '6px 16px', fontSize: '13px' }}
          >
            Close
          </button>
        </footer>
      </section>
    </div>
  );
}

export function DocumentPreviewLightbox({ previewDoc, onClose }) {
  if (!previewDoc) return null;

  return (
    <div
      className="ams-doc-preview-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        className="ams-doc-preview-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={previewDoc.title || 'Document Preview'}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="ams-doc-preview-header">
          <h3>
            {previewDoc.isPdf ? <FileText size={18} /> : <Camera size={18} />}
            {previewDoc.title || 'Document Preview'}
          </h3>
          <div className="ams-doc-preview-header-actions">
            {previewDoc.url && (
              <a
                href={previewDoc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ams-doc-newtab-btn"
                title="Open in new window or tab"
              >
                <ArrowUpRight size={14} /> Open in New Tab
              </a>
            )}
            <button
              type="button"
              className="ams-doc-preview-close"
              onClick={onClose}
              aria-label="Close preview"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="ams-doc-preview-body">
          {previewDoc.loading ? (
            <div className="doc-loading-container">
              <LoaderCircle size={28} className="doc-spin-icon" />
              <span>Loading document preview...</span>
            </div>
          ) : previewDoc.isPdf ? (
            <div className="ams-doc-iframe-container">
              <iframe
                src={previewDoc.url}
                title={previewDoc.title || 'PDF Preview'}
                className="ams-doc-iframe"
              />
              <div className="ams-doc-fallback-bar">
                <span>Trouble viewing PDF?</span>
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ams-doc-newtab-btn"
                >
                  <ArrowUpRight size={13} /> Open in new tab
                </a>
              </div>
            </div>
          ) : (
            <div className="ams-doc-image-container">
              <img
                src={previewDoc.url}
                alt={previewDoc.title || 'Preview'}
                className="ams-doc-image"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const errBox = document.getElementById('dir-doc-img-error');
                  if (errBox) errBox.style.display = 'flex';
                }}
              />
              <div id="dir-doc-img-error" className="ams-doc-error-box" style={{ display: 'none' }}>
                <p>Unable to load image preview directly.</p>
                {previewDoc.url && (
                  <a
                    href={previewDoc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ams-doc-newtab-btn"
                  >
                    <ArrowUpRight size={14} /> Open Image in New Tab
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ExecutiveEmployeeRecordModal({
  person,
  roleType,
  loading = false,
  imageVersion = null,
  locations = null,
  onClose,
  onPreviewDocument,
  onViewSublist = null,
}) {
  if (!person) return null;

  const [activeLocations, setActiveLocations] = useState(() => locations || locationLookupCache || { states: [], cities: [], districts: [] });

  useEffect(() => {
    if (locations && (locations.states?.length || locations.cities?.length || locations.districts?.length)) {
      setActiveLocations(locations);
      return;
    }
    let isMounted = true;
    fetchLocationLookups().then((data) => {
      if (isMounted && data) {
        setActiveLocations(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [locations]);

  const stateLookupMap = useMemo(() => {
    const list = activeLocations?.states || [];
    const map = new Map();
    list.forEach((item) => {
      const id = item?.stateId ?? item?.id ?? item?.StateId;
      const name = item?.stateName ?? item?.name ?? item?.StateName;
      if (id !== undefined && id !== null && name && typeof name === 'string') {
        const cleanName = name.trim();
        map.set(String(id).trim(), cleanName);
        map.set(Number(id), cleanName);
      }
    });
    return map;
  }, [activeLocations?.states]);

  const cityLookupMap = useMemo(() => {
    const list = activeLocations?.cities || [];
    const map = new Map();
    list.forEach((item) => {
      const id = item?.cityId ?? item?.id ?? item?.CityId;
      const name = item?.cityName ?? item?.name ?? item?.CityName;
      if (id !== undefined && id !== null && name && typeof name === 'string') {
        const cleanName = name.trim();
        map.set(String(id).trim(), cleanName);
        map.set(Number(id), cleanName);
      }
    });
    return map;
  }, [activeLocations?.cities]);

  const districtLookupMap = useMemo(() => {
    const list = activeLocations?.districts || [];
    const map = new Map();
    list.forEach((item) => {
      const id = item?.districtId ?? item?.id ?? item?.DistrictId;
      const name = item?.districtName ?? item?.name ?? item?.DistrictName;
      if (id !== undefined && id !== null && name && typeof name === 'string') {
        const cleanName = name.trim();
        map.set(String(id).trim(), cleanName);
        map.set(Number(id), cleanName);
      }
    });
    return map;
  }, [activeLocations?.districts]);

  const normRole = useMemo(() => {
    const t = String(roleType || person?.type || '').toLowerCase();
    if (t.includes('credithead') || t.includes('credit head')) return 'CreditHead';
    if (t.includes('agent')) return 'Agent';
    if (t.includes('relation') || t === 'rm') return 'RM';
    if (t.includes('back')) return 'BackOffice';
    if (t.includes('ams') || t.includes('area')) return 'AMS';
    if (t.includes('credit')) return 'CreditManager';
    return 'Agent';
  }, [roleType, person?.type]);

  const roleTitle = useMemo(() => {
    switch (normRole) {
      case 'Agent': return 'Agent';
      case 'RM': return 'Relationship Manager';
      case 'BackOffice': return 'Back Office';
      case 'AMS': return 'Area Sourcing Manager (ASM)';
      case 'CreditManager': return 'Credit Manager';
      case 'CreditHead': return 'Credit Head';
      default: return roleType || 'Employee';
    }
  }, [normRole, roleType]);

  const personId =
    person?.id ||
    person?.agentId ||
    person?.rmId ||
    person?.backOfficeId ||
    person?.creditManagerId ||
    person?.creditHeadId ||
    person?.amsId ||
    person?.AmsId;

  const fullName =
    read(person, ['fullName', 'FullName', 'agentName', 'rmName', 'name', 'Name']) ||
    (normRole === 'AMS' ? 'Unnamed ASM' : 'Unnamed Employee');

  const employeeCode = useMemo(() => {
    switch (normRole) {
      case 'Agent':
        return read(person, ['agentCode', 'AgentCode', 'code', 'Code']);
      case 'RM':
        return read(person, ['rmCode', 'RMCode', 'code', 'Code']);
      case 'BackOffice':
        return read(person, ['backOfficeCode', 'BackOfficeCode', 'code', 'Code']);
      case 'AMS':
        return read(person, ['amsCode', 'AmsCode', 'code', 'Code']);
      case 'CreditManager':
        return read(person, ['creditManagerCode', 'CreditManagerCode', 'code', 'Code']);
      case 'CreditHead':
        return read(person, ['creditHeadCode', 'CreditHeadCode', 'code', 'Code']);
      default:
        return read(person, ['code', 'Code']);
    }
  }, [normRole, person]);

  const statusInfo = useMemo(() => {
    const rawActive = person?.isActive ?? person?.IsActive;
    if (typeof rawActive === 'boolean') {
      return { label: rawActive ? 'Active' : 'Inactive', variant: rawActive ? 'active' : 'inactive' };
    }
    if (typeof rawActive === 'number') {
      if (rawActive === 1) return { label: 'Active', variant: 'active' };
      if (rawActive === 0) return { label: 'Inactive', variant: 'inactive' };
    }
    const rawStatus = person?.status ?? person?.Status;
    if (typeof rawStatus === 'boolean') {
      return { label: rawStatus ? 'Active' : 'Inactive', variant: rawStatus ? 'active' : 'inactive' };
    }
    if (typeof rawStatus === 'string' && rawStatus.trim()) {
      const s = rawStatus.trim().toLowerCase();
      if (s === 'active' || s === '1' || s === 'true') return { label: 'Active', variant: 'active' };
      if (s === 'inactive' || s === '0' || s === 'false') return { label: 'Inactive', variant: 'inactive' };
      return { label: rawStatus.trim(), variant: 'other' };
    }
    return { label: '—', variant: 'unknown' };
  }, [person]);

  const genderLabel = useMemo(() => {
    const name = read(person, ['genderName', 'GenderName', 'gender', 'Gender']);
    if (name && typeof name === 'string' && name.trim()) return name.trim();
    const id = person?.genderId ?? person?.GenderId;
    if (id === 1 || id === '1') return 'Male';
    if (id === 2 || id === '2') return 'Female';
    if (id === 3 || id === '3') return 'Other';
    return '—';
  }, [person]);

  const cityVal = useMemo(() => {
    const existingName = read(person, ['cityName', 'CityName', 'city', 'City']);
    if (existingName && typeof existingName === 'string' && existingName.trim() && !/^city\s*id/i.test(existingName.trim())) {
      if (isNaN(Number(existingName.trim()))) {
        return existingName.trim();
      }
    }
    const rawId = person?.cityId ?? person?.CityId;
    if (rawId !== undefined && rawId !== null && rawId !== '') {
      const resolved = cityLookupMap.get(String(rawId).trim()) ?? cityLookupMap.get(Number(rawId));
      if (resolved) return resolved;
    }
    if (existingName && typeof existingName === 'string' && existingName.trim() && !/^city\s*id/i.test(existingName.trim())) {
      return existingName.trim();
    }
    return '';
  }, [person, cityLookupMap]);

  const districtVal = useMemo(() => {
    const existingName = read(person, ['districtName', 'DistrictName', 'district', 'District']);
    if (existingName && typeof existingName === 'string' && existingName.trim() && !/^district\s*id/i.test(existingName.trim())) {
      if (isNaN(Number(existingName.trim()))) {
        return existingName.trim();
      }
    }
    const rawId = person?.districtId ?? person?.DistrictId;
    if (rawId !== undefined && rawId !== null && rawId !== '') {
      const resolved = districtLookupMap.get(String(rawId).trim()) ?? districtLookupMap.get(Number(rawId));
      if (resolved) return resolved;
    }
    if (existingName && typeof existingName === 'string' && existingName.trim() && !/^district\s*id/i.test(existingName.trim())) {
      return existingName.trim();
    }
    return '';
  }, [person, districtLookupMap]);

  const stateVal = useMemo(() => {
    const existingName = read(person, ['stateName', 'StateName', 'state', 'State']);
    if (existingName && typeof existingName === 'string' && existingName.trim() && !/^state\s*id/i.test(existingName.trim())) {
      if (isNaN(Number(existingName.trim()))) {
        return existingName.trim();
      }
    }
    const rawId = person?.stateId ?? person?.StateId;
    if (rawId !== undefined && rawId !== null && rawId !== '') {
      const resolved = stateLookupMap.get(String(rawId).trim()) ?? stateLookupMap.get(Number(rawId));
      if (resolved) return resolved;
    }
    if (existingName && typeof existingName === 'string' && existingName.trim() && !/^state\s*id/i.test(existingName.trim())) {
      return existingName.trim();
    }
    return '';
  }, [person, stateLookupMap]);

  const pincodeVal = read(person, ['pincode', 'Pincode', 'postalCode']);
  const departmentVal = read(person, ['department', 'Department', 'departmentName', 'DepartmentName']);

  const bankAccount = useMemo(() => {
    const raw = read(person, ['bankAccountNumber', 'BankAccountNumber', 'accountNumber', 'AccountNumber']);
    if (raw === undefined || raw === null) return '—';
    const clean = String(raw).trim();
    if (!clean || clean.toLowerCase() === 'null' || clean.toLowerCase() === 'undefined') return '—';
    return clean;
  }, [person]);

  const ifscCode = read(person, ['ifscCode', 'IfscCode', 'IFSCCode', 'ifsc', 'IFSC']) || '—';

  const aadhaarPath = getAadhaarPath(person) || person?.aadhaarDocumentPath || '';
  const panPath = getPanPath(person) || person?.panCardPath || '';
  const profilePath = getProfilePath(person) || person?.profileImagePath || '';

  return (
    <div
      className="exec-record-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="exec-record-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`${roleTitle} details`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header: Dark Green Executive Theme */}
        <div className="exec-record-header">
          <div className="exec-header-identity">
            <DirectoryAvatar
              role={normRole}
              id={personId}
              name={fullName}
              className="exec-header-avatar"
              version={person.imageVersion || imageVersion}
              imagePath={profilePath}
            />
            <div className="exec-header-text">
              <h2 className="exec-header-name">{fullName}</h2>
              <div className="exec-header-meta">
                <span className="exec-header-role">{roleTitle}</span>
                {employeeCode && (
                  <>
                    <span className="exec-header-dot">•</span>
                    <span className="exec-header-code">{employeeCode}</span>
                  </>
                )}
                <span className={`exec-header-status-badge ${statusInfo.variant}`}>
                  {statusInfo.label}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="exec-dialog-close"
            onClick={onClose}
            aria-label="Close details"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        {loading ? (
          <div className="exec-record-loading">
            <LoaderCircle size={22} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
            <span>Loading employee details…</span>
          </div>
        ) : (
          <div className="exec-record-body">
            {/* Section 1: Personal & Contact Information */}
            <div className="exec-section">
              <div className="exec-section-header">
                <Users size={15} className="exec-section-icon" />
                <h3 className="exec-section-title">Personal & Contact Information</h3>
              </div>
              <div className="exec-grid-4col">
                <div className="exec-field">
                  <span className="exec-field-label">Full Name</span>
                  <span className="exec-field-value">{fullName}</span>
                </div>
                <div className="exec-field">
                  <span className="exec-field-label">Date of Birth</span>
                  <span className="exec-field-value">
                    {formatDob(read(person, ['dateOfBirth', 'DateOfBirth', 'dob']))}
                  </span>
                </div>
                <div className="exec-field">
                  <span className="exec-field-label">Gender</span>
                  <span className="exec-field-value">{genderLabel}</span>
                </div>
                <div className="exec-field">
                  <span className="exec-field-label">Mobile Number</span>
                  <span className="exec-field-value">
                    {read(person, ['mobileNumber', 'MobileNumber', 'phone', 'Phone']) || '—'}
                  </span>
                </div>
                <div className="exec-field exec-field-span-2">
                  <span className="exec-field-label">Email Address</span>
                  <span className="exec-field-value">
                    {read(person, ['emailAddress', 'EmailAddress', 'email', 'Email']) || '—'}
                  </span>
                </div>
                <div className="exec-field exec-field-span-2">
                  <span className="exec-field-label">Residential Address</span>
                  <span className="exec-field-value">
                    {read(person, ['address', 'Address', 'streetAddress']) || '—'}
                  </span>
                </div>
                {(cityVal || normRole !== 'Agent') && (
                  <div className="exec-field">
                    <span className="exec-field-label">City</span>
                    <span className="exec-field-value">{cityVal || '—'}</span>
                  </div>
                )}
                {(districtVal || normRole === 'BackOffice' || normRole === 'CreditManager') && (
                  <div className="exec-field">
                    <span className="exec-field-label">District</span>
                    <span className="exec-field-value">{districtVal || '—'}</span>
                  </div>
                )}
                <div className="exec-field">
                  <span className="exec-field-label">State</span>
                  <span className="exec-field-value">{stateVal || '—'}</span>
                </div>
                <div className="exec-field">
                  <span className="exec-field-label">Pincode</span>
                  <span className="exec-field-value monospace">{pincodeVal || '—'}</span>
                </div>
              </div>
            </div>

            {/* Section 2: Work & Organization */}
            <div className="exec-section">
              <div className="exec-section-header">
                <BriefcaseBusiness size={15} className="exec-section-icon" />
                <h3 className="exec-section-title">Work & Organization</h3>
              </div>
              <div className="exec-grid-4col">
                <div className="exec-field">
                  <span className="exec-field-label">Employee Code</span>
                  <span className="exec-field-value highlight">{employeeCode || '—'}</span>
                </div>
                <div className="exec-field">
                  <span className="exec-field-label">Role / Designation</span>
                  <span className="exec-field-value">{roleTitle}</span>
                </div>
                <div className="exec-field">
                  <span className="exec-field-label">Branch</span>
                  <span className="exec-field-value">
                    {read(person, ['branch', 'Branch', 'branchName', 'BranchName']) || '—'}
                  </span>
                </div>
                <div className="exec-field">
                  <span className="exec-field-label">Date Joined</span>
                  <span className="exec-field-value">
                    {formatDob(read(person, ['dateJoined', 'DateJoined', 'joiningDate']))}
                  </span>
                </div>

                {/* Role-Specific Fields */}
                {normRole === 'Agent' && (
                  <>
                    <div className="exec-field">
                      <span className="exec-field-label">Assigned Relationship Manager</span>
                      <span className="exec-field-value">
                        {read(person, ['rm', 'relationshipManager', 'RelationshipManager', 'rmName', 'RMName']) || 'Unassigned'}
                      </span>
                    </div>
                    <div className="exec-field">
                      <span className="exec-field-label">Sourced Applications</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span className="exec-field-value highlight">
                          {person.applications !== undefined && person.applications !== null ? String(person.applications) : '0'}
                        </span>
                        {Number(person.applications || 0) > 0 && (
                          <button
                            type="button"
                            className="details-button"
                            style={{ padding: '2px 8px', fontSize: '11px', height: 'auto', lineHeight: '1.3' }}
                            onClick={() => onViewSublist?.({
                              title: `Customers — ${fullName}`,
                              type: 'customers',
                              records: person.customerList || []
                            })}
                          >
                            View Customers
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {normRole === 'RM' && (
                  <div className="exec-field">
                    <span className="exec-field-label">Assigned Agents</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span className="exec-field-value">
                        {person.agents !== undefined && person.agents !== null
                          ? String(person.agents)
                          : person.assignedAgentsCount !== undefined
                          ? String(person.assignedAgentsCount)
                          : '—'}
                      </span>
                      {Number(person.agents || person.assignedAgentsCount || 0) > 0 && (
                        <button
                          type="button"
                          className="details-button"
                          style={{ padding: '2px 8px', fontSize: '11px', height: 'auto', lineHeight: '1.3' }}
                          onClick={() => onViewSublist?.({
                            title: `Assigned Agents — ${fullName}`,
                            type: 'agents',
                            records: person.assignedAgentsList || []
                          })}
                        >
                          View Agents
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {(normRole === 'BackOffice' || normRole === 'CreditManager') && (
                  <div className="exec-field">
                    <span className="exec-field-label">District</span>
                    <span className="exec-field-value">{districtVal || '—'}</span>
                  </div>
                )}

                {departmentVal && (
                  <div className="exec-field">
                    <span className="exec-field-label">Department</span>
                    <span className="exec-field-value">{departmentVal}</span>
                  </div>
                )}

                {normRole === 'AMS' && (
                  <div className="exec-field exec-field-full">
                    <span className="exec-field-label">Assigned Districts</span>
                    {((person.districts && person.districts.length > 0) || (person.districtNames && person.districtNames.length > 0)) ? (
                      <div className="exec-district-pills">
                        {(person.districts || person.districtNames).map((d, i) => (
                          <span key={d?.districtId || i} className="exec-district-pill">
                            {typeof d === 'string' ? d : d?.districtName || d?.name || `District #${d?.districtId || i}`}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="exec-field-value">—</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Banking Information */}
            <div className="exec-section exec-section-compact">
              <div className="exec-section-header">
                <Landmark size={15} className="exec-section-icon" />
                <h3 className="exec-section-title">Banking Information</h3>
              </div>
              <div className="exec-grid-4col">
                <div className="exec-field exec-field-span-2">
                  <span className="exec-field-label">Bank Account Number</span>
                  <span className="exec-field-value monospace">{bankAccount}</span>
                </div>
                <div className="exec-field exec-field-span-2">
                  <span className="exec-field-label">IFSC Code</span>
                  <span className="exec-field-value monospace">{ifscCode}</span>
                </div>
              </div>
            </div>

            {/* Section 4: KYC & Documents */}
            <div className="exec-section">
              <div className="exec-section-header">
                <FileText size={15} className="exec-section-icon" />
                <h3 className="exec-section-title">KYC & Documents</h3>
              </div>
              <div className="exec-docs-grid-3col">
                {/* Aadhaar Card */}
                <div className="exec-doc-card">
                  <div className="exec-doc-card-info">
                    <FileText size={18} className="exec-doc-icon" />
                    <div className="exec-doc-text">
                      <strong className="exec-doc-title">Aadhaar Card</strong>
                      <span className="exec-doc-subtext">
                        {aadhaarPath ? 'Document uploaded' : 'No document uploaded'}
                      </span>
                    </div>
                  </div>
                  {aadhaarPath ? (
                    <button
                      type="button"
                      className="exec-doc-view-btn"
                      onClick={() => onPreviewDocument('Aadhaar Card', aadhaarPath, normRole, personId)}
                    >
                      <Eye size={13} /> View Document
                    </button>
                  ) : (
                    <span className="exec-doc-unavailable">Unavailable</span>
                  )}
                </div>

                {/* PAN Card */}
                <div className="exec-doc-card">
                  <div className="exec-doc-card-info">
                    <FileText size={18} className="exec-doc-icon" />
                    <div className="exec-doc-text">
                      <strong className="exec-doc-title">PAN Card</strong>
                      <span className="exec-doc-subtext">
                        {panPath ? 'Document uploaded' : 'No document uploaded'}
                      </span>
                    </div>
                  </div>
                  {panPath ? (
                    <button
                      type="button"
                      className="exec-doc-view-btn"
                      onClick={() => onPreviewDocument('PAN Card', panPath, normRole, personId)}
                    >
                      <Eye size={13} /> View Document
                    </button>
                  ) : (
                    <span className="exec-doc-unavailable">Unavailable</span>
                  )}
                </div>

                {/* Profile Image */}
                <div className="exec-doc-card">
                  <div className="exec-doc-card-info">
                    <Camera size={18} className="exec-doc-icon" />
                    <div className="exec-doc-text">
                      <strong className="exec-doc-title">Profile Image</strong>
                      <span className="exec-doc-subtext">
                        {profilePath ? 'Photograph uploaded' : 'No image uploaded'}
                      </span>
                    </div>
                  </div>
                  {profilePath ? (
                    <button
                      type="button"
                      className="exec-doc-view-btn"
                      onClick={() => onPreviewDocument('Profile Image', profilePath, normRole, personId, person.imageVersion || imageVersion)}
                    >
                      <Eye size={13} /> View Image
                    </button>
                  ) : (
                    <span className="exec-doc-unavailable">Unavailable</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer: Purely View-Only */}
        <div className="exec-record-footer">
          <button
            type="button"
            className="exec-footer-close-btn"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </section>
    </div>
  );
}

const ROLE_META = {
  agent: {
    key: 'agent',
    title: 'Agents',
    subtitle: 'Field agents sourcing applications and managing client relationships.',
    icon: BriefcaseBusiness,
    color: 'blue',
    searchPlaceholder: 'Search agents by name, contact, RM, branch...',
    emptyText: 'No agents found.',
    addLabel: 'Add user',
  },
  rm: {
    key: 'rm',
    title: 'Relationship Managers',
    subtitle: 'Own agent coverage, regional operations, and team performance.',
    icon: Users,
    color: 'green',
    searchPlaceholder: 'Search relationship managers by name, phone, branch...',
    emptyText: 'No relationship managers found.',
    addLabel: 'Add user',
  },
  backOffice: {
    key: 'backOffice',
    title: 'Back Office',
    subtitle: 'Support verification, branch processing, and operations.',
    icon: Building2,
    color: 'teal',
    searchPlaceholder: 'Search back office by name, code, contact, branch...',
    emptyText: 'No back office users found.',
    addLabel: 'Add user',
  },
  ams: {
    key: 'ams',
    title: 'Area Specialists (ASM)',
    subtitle: 'Cover designated districts, local channels, and regional operations.',
    icon: ShieldCheck,
    color: 'purple',
    searchPlaceholder: 'Search ASM by name, code, contact, branch, city...',
    emptyText: 'No area specialists found.',
    addLabel: 'Add user',
  },
  creditManager: {
    key: 'creditManager',
    title: 'Credit Managers',
    subtitle: 'Review, evaluate, and sanction loan applications across branches.',
    icon: Landmark,
    color: 'indigo',
    searchPlaceholder: 'Search credit managers by name, code, contact, branch...',
    emptyText: 'No credit managers found.',
    addLabel: 'Add user',
  },
  creditHead: {
    key: 'creditHead',
    title: 'Credit Heads',
    subtitle: 'Review, sanction, and oversee senior credit approvals and portfolio health.',
    icon: Landmark,
    color: 'indigo',
    searchPlaceholder: 'Search credit heads by name, code, contact, branch...',
    emptyText: 'No credit heads found.',
    addLabel: 'Add user',
  },
  customer: {
    key: 'customer',
    title: 'Customers',
    subtitle: 'Network customer and application records.',
    icon: FileText,
    color: 'orange',
    searchPlaceholder: 'Search customers by name, mobile, loan product, status...',
    emptyText: 'No customer records found.',
    addLabel: 'Add user',
  },
};

export function PeopleDirectoryPage({ roleKey = 'agent' }) {
  const navigate = useNavigate();
  const meta = ROLE_META[roleKey] || ROLE_META.agent;
  const RoleIcon = meta.icon;

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [selectedPerson, setSelectedPerson] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [customerDocuments, setCustomerDocuments] = useState([]);
  const [customerDocumentsLoading, setCustomerDocumentsLoading] = useState(false);
  const [customerDocumentsError, setCustomerDocumentsError] = useState('');
  const [selectedAms, setSelectedAms] = useState(null);
  const [loadingAmsModal, setLoadingAmsModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const previewSrc = useAuthedObjectUrl(previewDoc?.url);
  const [imageVersion, setImageVersion] = useState(() => Date.now());
  const [locations, setLocations] = useState(() => locationLookupCache || { states: [], cities: [], districts: [] });
  const [sublistModal, setSublistModal] = useState(null);

  useEffect(() => {
    let active = true;
    fetchLocationLookups().then((data) => {
      if (active && data) {
        setLocations(data);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const customerId = selectedApplication?.id;

    if (roleKey !== 'customer' || !customerId) {
      setCustomerDocuments([]);
      setCustomerDocumentsLoading(false);
      setCustomerDocumentsError('');
      return undefined;
    }

    setCustomerDocumentsLoading(true);
    setCustomerDocumentsError('');
    agentCustomerService.getDocumentsByCustomerId(customerId)
      .then((response) => {
        if (!active) return;
        const documents = Array.isArray(response)
          ? response
          : (response?.data || response?.value || []);
        setCustomerDocuments(Array.isArray(documents) ? documents : []);
      })
      .catch(() => {
        if (active) {
          setCustomerDocuments([]);
          setCustomerDocumentsError('Unable to load agent-uploaded documents.');
        }
      })
      .finally(() => {
        if (active) setCustomerDocumentsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [roleKey, selectedApplication?.id]);

  const blobUrlsRef = useRef([]);

  const cleanupBlobUrls = useCallback(() => {
    blobUrlsRef.current.forEach((url) => {
      try {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      } catch (e) {
        // ignore
      }
    });
    blobUrlsRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      cleanupBlobUrls();
      customerPhotoCache.forEach((url) => {
        try {
          if (url && url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
          }
        } catch (e) {
          // ignore
        }
      });
      customerPhotoCache.clear();
    };
  }, [cleanupBlobUrls]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    setImageVersion(Date.now());
    try {
      if (roleKey === 'agent') {
        const [agentResult, rmResult, appResult] = await Promise.allSettled([
          getAllAgents(),
          getAllRelationshipManagers(),
          agentCustomerService.getAllCustomers(),
        ]);

        const agentRows = agentResult.status === 'fulfilled' ? unwrap(agentResult.value) : [];
        const rmRows = rmResult.status === 'fulfilled' ? unwrap(rmResult.value) : [];
        const appRows = appResult.status === 'fulfilled' ? unwrap(appResult.value) : [];

        const rmNames = new Map(
          rmRows.map((rm) => {
            const id = read(rm, ['rmId', 'RMId', 'id', 'Id']);
            const name =
              read(rm, ['fullName', 'FullName', 'rmName', 'RMName', 'name', 'Name']) ||
              `${read(rm, ['firstName', 'FirstName'], '')} ${read(rm, ['lastName', 'LastName'], '')}`.trim();
            return [String(id), name];
          })
        );

        const appsByAgent = new Map();
        const appRecordsByAgent = new Map();

        appRows.forEach((app) => {
          const ownership = resolveApplicationOwnership(app);
          const aId = ownership.isAgentCreated ? ownership.agentId : null;
          if (aId) {
            const key = String(aId);
            appsByAgent.set(key, (appsByAgent.get(key) || 0) + 1);
            if (!appRecordsByAgent.has(key)) {
              appRecordsByAgent.set(key, []);
            }
            appRecordsByAgent.get(key).push(app);
          }
        });

        const liveAgents = agentRows
          .map((agent) => {
            const rmId = read(agent, ['rmId', 'RMId', 'relationshipManagerId', 'RelationshipManagerId', 'createdBy']);
            const id = read(agent, ['agentId', 'AgentId', 'id', 'Id']);
            const agentName = read(agent, ['fullName', 'FullName', 'agentName', 'AgentName', 'name', 'Name'], 'Unnamed agent');
            const rawApps = appRecordsByAgent.get(String(id)) || [];
            const sortedApps = [...rawApps].sort((a, b) => {
              const idA = Number(a?.agentCustomerId ?? a?.id ?? 0);
              const idB = Number(b?.agentCustomerId ?? b?.id ?? 0);
              if (idA && idB && idA !== idB) return idA - idB;
              const nameA = String(read(a, ['fullName', 'FullName', 'customerName', 'name', 'Name']) || '');
              const nameB = String(read(b, ['fullName', 'FullName', 'customerName', 'name', 'Name']) || '');
              return nameA.localeCompare(nameB);
            });
            const customerList = sortedApps.map((app, index) => {
              const custName = read(app, ['fullName', 'FullName', 'customerName', 'name', 'Name'], 'Unknown Customer');
              const rawCode = read(app, ['customerCode', 'CustomerCode', 'appId', 'AppId']);
              const codeVal = (rawCode && String(rawCode).trim() && String(rawCode).trim() !== 'null' && String(rawCode).trim() !== 'undefined')
                ? String(rawCode).trim()
                : '—';
              return {
                sNo: index + 1,
                id: app?.agentCustomerId ?? app?.id,
                name: custName,
                code: codeVal,
              };
            });

            return {
              id,
              agentId: id,
              name: agentName,
              fullName: agentName,
              agentCode: read(agent, ['agentCode', 'AgentCode', 'code', 'Code']),
              email: read(agent, ['emailAddress', 'EmailAddress', 'email', 'Email']),
              phone: read(agent, ['mobileNumber', 'MobileNumber', 'phone', 'Phone']),
              rm: read(agent, ['relationshipManager', 'RelationshipManager', 'rmName', 'RMName']) || rmNames.get(String(rmId)) || 'Unassigned',
              rmId,
              branch: read(agent, ['branch', 'Branch', 'branchName', 'BranchName']),
              status: status(read(agent, ['status', 'Status', 'isActive', 'IsActive'])),
              applications: appsByAgent.get(String(id)) || 0,
              customerList,
              aadhaarDocumentPath: getAadhaarPath(agent),
              panCardPath: getPanPath(agent),
              profileImagePath: getProfilePath(agent),
              rawRecord: agent,
            };
          })
          .filter((a) => a.id || a.name);

        setRecords(liveAgents);
      } else if (roleKey === 'rm') {
        const [rmResult, agentResult, appResult] = await Promise.allSettled([
          getAllRelationshipManagers(),
          getAllAgents(),
          agentCustomerService.getAllCustomers(),
        ]);

        const rmRows = rmResult.status === 'fulfilled' ? unwrap(rmResult.value) : [];
        const agentRows = agentResult.status === 'fulfilled' ? unwrap(agentResult.value) : [];
        const isCustomerApiSuccess = appResult.status === 'fulfilled';
        const customerRows = isCustomerApiSuccess ? unwrap(appResult.value) : [];

        const directCustomersByRm = new Map();
        const seenCustomerIdsByRm = new Map();
        if (isCustomerApiSuccess) {
          customerRows.forEach((customer) => {
            const rawRole = String(read(customer, ['createdByRole', 'CreatedByRole']) || '').trim().toLowerCase();
            if (rawRole !== 'rm') return;

            const rawAgentId = read(customer, ['agentId', 'AgentId']);
            if (rawAgentId !== null && rawAgentId !== undefined && String(rawAgentId).trim() !== '' && Number(rawAgentId) !== 0) {
              return;
            }

            const rawRmId = read(customer, ['rmId', 'RMId']);
            const targetRmId = Number(rawRmId);
            if (!Number.isFinite(targetRmId) || targetRmId <= 0) return;

            const custKey = String(read(customer, ['agentCustomerId', 'AgentCustomerId', 'id', 'Id']) || '');
            if (!custKey) return;

            const rmKey = String(targetRmId);
            if (!seenCustomerIdsByRm.has(rmKey)) seenCustomerIdsByRm.set(rmKey, new Set());
            if (seenCustomerIdsByRm.get(rmKey).has(custKey)) return;
            seenCustomerIdsByRm.get(rmKey).add(custKey);

            if (!directCustomersByRm.has(rmKey)) directCustomersByRm.set(rmKey, []);
            directCustomersByRm.get(rmKey).push(customer);
          });
        }

        const liveRms = rmRows
          .map((rm) => {
            const id = read(rm, ['rmId', 'RMId', 'id', 'Id']);
            const rmName =
              read(rm, ['fullName', 'FullName', 'rmName', 'RMName', 'name', 'Name']) ||
              `${read(rm, ['firstName', 'FirstName'], '')} ${read(rm, ['lastName', 'LastName'], '')}`.trim() ||
              'Unnamed RM';
            const matchedAgents = agentRows.filter((agent) => {
              const aRmId = read(agent, ['rmId', 'RMId', 'relationshipManagerId', 'RelationshipManagerId', 'createdBy']);
              const aRmName = read(agent, ['relationshipManager', 'RelationshipManager', 'rmName', 'RMName']);
              return String(aRmId) === String(id) || aRmName === rmName;
            });
            const sortedAgents = [...matchedAgents].sort((a, b) => {
              const idA = Number(read(a, ['agentId', 'AgentId', 'id', 'Id']) || 0);
              const idB = Number(read(b, ['agentId', 'AgentId', 'id', 'Id']) || 0);
              if (idA && idB && idA !== idB) return idA - idB;
              const nameA = String(read(a, ['fullName', 'FullName', 'agentName', 'AgentName', 'name', 'Name']) || '');
              const nameB = String(read(b, ['fullName', 'FullName', 'agentName', 'AgentName', 'name', 'Name']) || '');
              return nameA.localeCompare(nameB);
            });
            const assignedAgentsList = sortedAgents.map((agent, index) => {
              const agentName = read(agent, ['fullName', 'FullName', 'agentName', 'AgentName', 'name', 'Name'], 'Unnamed agent');
              const rawAgentCode = read(agent, ['agentCode', 'AgentCode', 'code', 'Code']);
              const codeVal = (rawAgentCode && String(rawAgentCode).trim() && String(rawAgentCode).trim() !== 'null' && String(rawAgentCode).trim() !== 'undefined')
                ? String(rawAgentCode).trim()
                : '—';
              return {
                sNo: index + 1,
                id: read(agent, ['agentId', 'AgentId', 'id', 'Id']),
                name: agentName,
                code: codeVal,
              };
            });

            const rawDirectCusts = directCustomersByRm.get(String(id)) || [];
            const sortedDirectCusts = [...rawDirectCusts].sort((a, b) => {
              const idA = Number(read(a, ['agentCustomerId', 'AgentCustomerId', 'id', 'Id']) || 0);
              const idB = Number(read(b, ['agentCustomerId', 'AgentCustomerId', 'id', 'Id']) || 0);
              if (idA && idB && idA !== idB) return idA - idB;
              const nameA = String(read(a, ['fullName', 'FullName', 'customerName', 'name', 'Name']) || '');
              const nameB = String(read(b, ['fullName', 'FullName', 'customerName', 'name', 'Name']) || '');
              return nameA.localeCompare(nameB);
            });
            const directCustomersList = sortedDirectCusts.map((cust, index) => {
              const custName = read(cust, ['fullName', 'FullName', 'customerName', 'name', 'Name'], 'Unknown Customer');
              const rawCustCode = read(cust, ['customerCode', 'CustomerCode', 'appId', 'AppId']);
              const codeVal = (rawCustCode && String(rawCustCode).trim() && String(rawCustCode).trim() !== 'null' && String(rawCustCode).trim() !== 'undefined')
                ? String(rawCustCode).trim()
                : '—';
              return {
                sNo: index + 1,
                id: read(cust, ['agentCustomerId', 'AgentCustomerId', 'id', 'Id']),
                name: custName,
                code: codeVal,
              };
            });

            return {
              id,
              rmId: id,
              name: rmName,
              fullName: rmName,
              email: read(rm, ['emailAddress', 'EmailAddress', 'email', 'Email']),
              phone: read(rm, ['mobileNumber', 'MobileNumber', 'phone', 'Phone']),
              branch: read(rm, ['branch', 'Branch', 'branchName', 'BranchName']),
              status: status(read(rm, ['status', 'Status', 'isActive', 'IsActive'])),
              agents: assignedAgentsList.length,
              assignedAgentsList,
              directCustomersLoadingError: !isCustomerApiSuccess,
              directCustomersCount: isCustomerApiSuccess ? directCustomersList.length : null,
              directCustomersList,
              aadhaarDocumentPath: getAadhaarPath(rm),
              panCardPath: getPanPath(rm),
              profileImagePath: getProfilePath(rm),
              rawRecord: rm,
            };
          })
          .filter((rm) => rm.id && rm.name);

        setRecords(liveRms);
      } else if (roleKey === 'backOffice') {
        const backOfficeResult = await getAllBackOffice();
        const backOfficeRows = unwrap(backOfficeResult);
        const liveBackOffice = backOfficeRows
          .map((item) => {
            const id = read(item, ['backOfficeId', 'BackOfficeId', 'id', 'Id']);
            const boName = read(item, ['fullName', 'FullName', 'name', 'Name'], 'Unnamed back office officer');
            return {
              id,
              backOfficeId: id,
              backOfficeCode: read(item, ['backOfficeCode', 'BackOfficeCode', 'code', 'Code']),
              name: boName,
              fullName: boName,
              email: read(item, ['emailAddress', 'EmailAddress', 'email', 'Email']),
              phone: read(item, ['mobileNumber', 'MobileNumber', 'phone', 'Phone']),
              branch: read(item, ['branch', 'Branch', 'branchName', 'BranchName']),
              status: status(read(item, ['status', 'Status', 'isActive', 'IsActive'])),
              aadhaarDocumentPath: getAadhaarPath(item),
              panCardPath: getPanPath(item),
              profileImagePath: getProfilePath(item),
              rawRecord: item,
            };
          })
          .filter((item) => item.id || item.name);

        setRecords(liveBackOffice);
      } else if (roleKey === 'ams') {
        const amsResult = await getAllAMS();
        const amsRows = unwrap(amsResult);
        const liveAms = amsRows
          .map((item) => {
            const id = read(item, ['amsId', 'AmsId', 'id', 'Id']);
            const fullName = read(item, ['fullName', 'FullName', 'name', 'Name'], 'Unnamed ASM');
            return {
              id,
              amsId: id,
              amsCode: read(item, ['amsCode', 'AmsCode', 'code', 'Code']),
              fullName,
              name: fullName,
              genderId: item.genderId ?? item.GenderId,
              genderName: read(item, ['genderName', 'GenderName', 'gender', 'Gender']),
              dateOfBirth: read(item, ['dateOfBirth', 'DateOfBirth', 'dob', 'DOB']),
              address: read(item, ['address', 'Address']),
              stateId: item.stateId ?? item.StateId,
              stateName: read(item, ['stateName', 'StateName', 'state', 'State']),
              cityId: item.cityId ?? item.CityId,
              cityName: read(item, ['cityName', 'CityName', 'city', 'City']),
              pincode: read(item, ['pincode', 'Pincode']),
              mobileNumber: read(item, ['mobileNumber', 'MobileNumber', 'phone', 'Phone']),
              emailAddress: read(item, ['emailAddress', 'EmailAddress', 'email', 'Email']),
              branch: read(item, ['branch', 'Branch', 'branchName', 'BranchName']),
              dateJoined: read(item, ['dateJoined', 'DateJoined']),
              isActive: item.isActive ?? item.IsActive ?? true,
              accountNumber: read(item, ['accountNumber', 'AccountNumber']),
              ifscCode: read(item, ['ifscCode', 'IfscCode']),
              aadhaarDocumentPath: getAadhaarPath(item),
              panCardPath: getPanPath(item),
              profileImagePath: getProfilePath(item),
              districtNames: Array.isArray(item.districtNames || item.districts || item.amsDistricts)
                ? item.districtNames || item.districts || item.amsDistricts
                : [],
              rawRecord: item,
            };
          })
          .filter((a) => a.id || a.fullName);

        setRecords(liveAms);
      } else if (roleKey === 'creditManager') {
        const cmResult = await getAllCreditManagers();
        const cmRows = unwrap(cmResult);
        const liveCm = cmRows
          .map((item) => {
            const id = read(item, ['creditManagerId', 'CreditManagerId', 'id', 'Id']);
            const cmName = read(item, ['fullName', 'FullName', 'name', 'Name'], 'Unnamed credit manager');
            return {
              id,
              creditManagerId: id,
              creditManagerCode: read(item, ['creditManagerCode', 'CreditManagerCode', 'code', 'Code']),
              name: cmName,
              fullName: cmName,
              dateOfBirth: read(item, ['dateOfBirth', 'DateOfBirth', 'dob', 'DOB']),
              genderId: item.genderId ?? item.GenderId,
              genderName: read(item, ['genderName', 'GenderName', 'gender', 'Gender']),
              address: read(item, ['address', 'Address']),
              stateId: item.stateId ?? item.StateId,
              stateName: read(item, ['stateName', 'StateName', 'state', 'State']),
              cityId: item.cityId ?? item.CityId,
              cityName: read(item, ['cityName', 'CityName', 'city', 'City']),
              districtId: item.districtId ?? item.DistrictId,
              districtName: read(item, ['districtName', 'DistrictName', 'district', 'District']),
              pincode: read(item, ['pincode', 'Pincode']),
              email: read(item, ['emailAddress', 'EmailAddress', 'email', 'Email']),
              emailAddress: read(item, ['emailAddress', 'EmailAddress', 'email', 'Email']),
              phone: read(item, ['mobileNumber', 'MobileNumber', 'phone', 'Phone']),
              mobileNumber: read(item, ['mobileNumber', 'MobileNumber', 'phone', 'Phone']),
              branch: read(item, ['branch', 'Branch', 'branchName', 'BranchName']),
              dateJoined: read(item, ['dateJoined', 'DateJoined']),
              accountNumber: read(item, ['accountNumber', 'AccountNumber']),
              ifscCode: read(item, ['ifscCode', 'IfscCode', 'IFSCCode']),
              status: status(read(item, ['status', 'Status', 'isActive', 'IsActive'])),
              isActive: item.isActive ?? item.IsActive ?? true,
              aadhaarDocumentPath: getAadhaarPath(item),
              panCardPath: getPanPath(item),
              profileImagePath: getProfilePath(item),
              rawRecord: item,
            };
          })
          .filter((item) => item.id || item.name);

        setRecords(liveCm);
      } else if (roleKey === 'creditHead') {
        const chResult = await getAllCreditHeads();
        const chRows = unwrap(chResult);
        const liveCh = chRows
          .map((item) => {
            const id = read(item, ['creditHeadId', 'CreditHeadId', 'id', 'Id']);
            const chName = read(item, ['fullName', 'FullName', 'name', 'Name'], 'Unnamed credit head');
            return {
              id,
              creditHeadId: id,
              creditHeadCode: read(item, ['creditHeadCode', 'CreditHeadCode', 'code', 'Code']),
              name: chName,
              fullName: chName,
              dateOfBirth: read(item, ['dateOfBirth', 'DateOfBirth', 'dob', 'DOB']),
              genderId: item.genderId ?? item.GenderId,
              genderName: read(item, ['genderName', 'GenderName', 'gender', 'Gender']),
              address: read(item, ['address', 'Address']),
              stateId: item.stateId ?? item.StateId,
              stateName: read(item, ['stateName', 'StateName', 'state', 'State']),
              cityId: item.cityId ?? item.CityId,
              cityName: read(item, ['cityName', 'CityName', 'city', 'City']),
              districtId: item.districtId ?? item.DistrictId,
              districtName: read(item, ['districtName', 'DistrictName', 'district', 'District']),
              pincode: read(item, ['pincode', 'Pincode']),
              email: read(item, ['emailAddress', 'EmailAddress', 'email', 'Email']),
              emailAddress: read(item, ['emailAddress', 'EmailAddress', 'email', 'Email']),
              phone: read(item, ['mobileNumber', 'MobileNumber', 'phone', 'Phone']),
              mobileNumber: read(item, ['mobileNumber', 'MobileNumber', 'phone', 'Phone']),
              branch: read(item, ['branch', 'Branch', 'branchName', 'BranchName']),
              dateJoined: read(item, ['dateJoined', 'DateJoined']),
              accountNumber: read(item, ['accountNumber', 'AccountNumber']),
              ifscCode: read(item, ['ifscCode', 'IfscCode', 'IFSCCode']),
              status: status(read(item, ['status', 'Status', 'isActive', 'IsActive'])),
              isActive: item.isActive ?? item.IsActive ?? true,
              aadhaarDocumentPath: getAadhaarPath(item),
              panCardPath: getPanPath(item),
              profileImagePath: getProfilePath(item),
              rawRecord: item,
            };
          })
          .filter((item) => item.id || item.name);

        setRecords(liveCh);
      } else if (roleKey === 'customer') {
        const [appResult, agentResult, rmResult] = await Promise.allSettled([
          agentCustomerService.getAllCustomers(),
          getAllAgents(),
          getAllRelationshipManagers(),
        ]);

        const customerRows = appResult.status === 'fulfilled' ? unwrap(appResult.value) : [];
        const agentRows = agentResult.status === 'fulfilled' ? unwrap(agentResult.value) : [];
        const rmRows = rmResult.status === 'fulfilled' ? unwrap(rmResult.value) : [];

        const liveRms = rmRows.map((rm) => {
          const id = read(rm, ['rmId', 'RMId', 'id', 'Id']);
          const name = read(rm, ['fullName', 'FullName', 'rmName', 'RMName', 'name', 'Name']) || `${read(rm, ['firstName', 'FirstName'], '')} ${read(rm, ['lastName', 'LastName'], '')}`.trim() || 'Unnamed RM';
          return { id, name, branch: read(rm, ['branch', 'Branch', 'branchName', 'BranchName']) };
        });
        const rmNames = new Map(liveRms.map((rm) => [String(rm.id), rm.name]));
        const rmsById = new Map(liveRms.map((rm) => [String(rm.id), rm]));

        const agentLookup = new Map();
        agentRows.forEach((agent) => {
          const id = read(agent, ['agentId', 'AgentId', 'id', 'Id']);
          if (!id) return;
          const rmId = read(agent, ['rmId', 'RMId', 'relationshipManagerId', 'RelationshipManagerId', 'createdBy']);
          agentLookup.set(String(id), {
            id,
            name: read(agent, ['fullName', 'FullName', 'agentName', 'AgentName', 'name', 'Name'], 'Unnamed agent'),
            email: read(agent, ['emailAddress', 'EmailAddress', 'email', 'Email']),
            phone: read(agent, ['mobileNumber', 'MobileNumber', 'phone', 'Phone']),
            branch: read(agent, ['branch', 'Branch', 'branchName', 'BranchName']),
            rmId,
            rmName: read(agent, ['relationshipManager', 'RelationshipManager', 'rmName', 'RMName']) || rmNames.get(String(rmId)) || 'Unassigned',
          });
        });

        const liveApplications = customerRows
          .map((application) => {
            const ownership = resolveApplicationOwnership(application, agentLookup, rmsById);
            const resolvedAgentId = ownership.agentId;
            const agent = resolvedAgentId ? (agentLookup.get(String(resolvedAgentId)) || {}) : {};
            const resolvedRmId = ownership.rmId || read(application, ['rmId', 'RMId']) || agent.rmId || '';
            const rmObj = resolvedRmId ? (rmsById.get(String(resolvedRmId)) || {}) : {};
            const resolvedRmName = ownership.rmName && ownership.rmName !== '—'
              ? ownership.rmName
              : (rmObj.name || rmNames.get(String(resolvedRmId)) || agent.rmName || 'Unassigned');
            const resolvedAgentName = ownership.agentName && ownership.agentName !== '—'
              ? ownership.agentName
              : (read(application, ['agentName', 'AgentName']) || agent.name || '—');

            const rawStatus = read(application, ['status', 'applicationStatus', 'ApplicationStatus', 'Status'], '0');

            return {
              id: read(application, ['agentCustomerId', 'AgentCustomerId', 'applicationId', 'id']),
              customerCode: read(application, ['customerCode', 'CustomerCode'], ''),
              agentId: resolvedAgentId,
              agentName: resolvedAgentName,
              agentPhone: agent.phone || '—',
              agentEmail: agent.email || '—',
              rmId: resolvedRmId,
              rmName: resolvedRmName,
              customerName: read(application, ['fullName', 'customerName', 'FullName'], 'Unknown customer'),
              mobile: read(application, ['mobileNumber', 'MobileNumber', 'mobile'], '—'),
              email: read(application, ['email', 'Email', 'emailAddress'], '—'),
              employmentType: read(application, ['employmentTypeName', 'EmploymentTypeName'], '—'),
              loanPurpose: read(application, ['loanProductName', 'LoanProductName', 'loanPurposeName', 'LoanPurposeName', 'loanType'], '—'),
              amount: money(read(application, ['expectedLoanAmount', 'ExpectedLoanAmount', 'disbursedAmount', 'loanAmount', 'requestedAmount'])),
              remarks: read(application, ['remarks', 'Remarks'], '—'),
              rawStatus,
              status: normalizeApplicationStatus(
                rawStatus,
                read(application, ['statusName', 'StatusName'])
              ),
              isActive: application.isActive ?? application.IsActive ?? true,
              createdAt: read(application, ['createdAt', 'CreatedAt', 'createdDate']),
              updatedAt: read(application, ['modifiedAt', 'ModifiedAt', 'updatedAt', 'createdAt', 'createdDate']),
              branch: agent.branch || rmObj.branch || '—',
            };
          })
          .filter((application) => application.id);

        setRecords(liveApplications);
      }
    } catch (err) {
      console.error(`Failed to load ${roleKey} directory data:`, err);
      setError(`Unable to load live ${meta.title.toLowerCase()} records. Check your connection.`);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [roleKey, meta.title]);

  useEffect(() => {
    loadData();
    setSearchQuery('');
    setCurrentPage(1);
  }, [loadData]);

  const filteredRecords = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();
    if (!search) return records;

    return records.filter((item) => {
      if (roleKey === 'agent') {
        return [item.name, item.fullName, item.email, item.phone, item.rm, item.branch, item.status]
          .some((val) => String(val || '').toLowerCase().includes(search));
      }
      if (roleKey === 'rm') {
        return [item.name, item.fullName, item.email, item.phone, item.branch, item.status]
          .some((val) => String(val || '').toLowerCase().includes(search));
      }
      if (roleKey === 'backOffice') {
        return [item.name, item.fullName, item.email, item.phone, item.backOfficeCode, item.branch, item.status]
          .some((val) => String(val || '').toLowerCase().includes(search));
      }
      if (roleKey === 'ams') {
        return [item.fullName, item.name, item.amsCode, item.emailAddress, item.mobileNumber, item.genderName, item.branch, item.cityName]
          .some((val) => String(val || '').toLowerCase().includes(search));
      }
      if (roleKey === 'creditManager') {
        return [item.fullName, item.name, item.creditManagerCode, item.emailAddress, item.email, item.mobileNumber, item.phone, item.branch, item.cityName, item.status]
          .some((val) => String(val || '').toLowerCase().includes(search));
      }
      if (roleKey === 'creditHead') {
        return [item.fullName, item.name, item.creditHeadCode, item.emailAddress, item.email, item.mobileNumber, item.phone, item.branch, item.cityName, item.status]
          .some((val) => String(val || '').toLowerCase().includes(search));
      }
      if (roleKey === 'customer') {
        return [item.id, item.customerCode, item.customerName, item.mobile, item.email, item.loanPurpose, item.agentName, item.rmName, item.status]
          .some((val) => String(val || '').toLowerCase().includes(search));
      }
      return true;
    });
  }, [records, searchQuery, roleKey]);

  const totalRecords = filteredRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRecords);
  const visibleRecords = useMemo(
    () => filteredRecords.slice(startIndex, startIndex + pageSize),
    [filteredRecords, startIndex, pageSize]
  );

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setCurrentPage(1);
  };

  // View Person Modal Handler
  const handleOpenPersonDetails = async (person, type) => {
    const roleType = type || (roleKey === 'rm' ? 'Relationship manager' : roleKey === 'backOffice' ? 'Back Office' : roleKey === 'creditHead' ? 'Credit Head' : roleKey === 'creditManager' ? 'Credit Manager' : 'Agent');
    const targetId = person?.id || person?.agentId || person?.rmId || person?.backOfficeId || person?.creditManagerId || person?.creditHeadId;
    if (!targetId && !person) return;

    const rawIsActive = person?.isActive ?? person?.IsActive;
    const initialStatus = typeof rawIsActive === 'boolean'
      ? (rawIsActive ? 'Active' : 'Inactive')
      : (person?.status ? String(person.status) : '—');

    const initialPerson = {
      ...person,
      type: roleType,
      id: targetId || person?.id,
      name: person?.name || person?.fullName || 'Unnamed',
      fullName: person?.fullName || person?.name || 'Unnamed',
      email: person?.email || person?.emailAddress || '—',
      phone: person?.phone || person?.mobileNumber || '—',
      status: initialStatus,
      branch: person?.branch || '',
      aadhaarDocumentPath: getAadhaarPath(person),
      panCardPath: getPanPath(person),
      profileImagePath: getProfilePath(person),
    };
    setSelectedPerson(initialPerson);

    if (!targetId) return;

    try {
      if (roleType === 'Relationship manager' || roleType === 'RM') {
        const response = await getRelationshipManager(targetId);
        const recordValue = response?.data !== undefined ? response.data : response;
        const record = Array.isArray(recordValue)
          ? recordValue[0]
          : (recordValue?.value?.[0] || recordValue?.data || recordValue?.value || recordValue);

        if (record && typeof record === 'object') {
          const freshName =
            read(record, ['fullName', 'FullName', 'rmName', 'RMName', 'name', 'Name']) ||
            `${read(record, ['firstName', 'FirstName'], '')} ${read(record, ['lastName', 'LastName'], '')}`.trim() ||
            initialPerson.name;
          const freshEmail = read(record, ['emailAddress', 'EmailAddress', 'email', 'Email']) || initialPerson.email;
          const freshPhone = read(record, ['mobileNumber', 'MobileNumber', 'phone', 'Phone']) || initialPerson.phone;
          const freshBranch = read(record, ['branch', 'Branch', 'branchName', 'BranchName']) || initialPerson.branch;
          const freshStatus = status(read(record, ['status', 'Status', 'isActive', 'IsActive']), initialPerson.status);

          setSelectedPerson((prev) => ({
            ...prev,
            ...record,
            id: targetId,
            rmId: targetId,
            type: 'Relationship manager',
            name: freshName,
            fullName: freshName,
            email: freshEmail,
            phone: freshPhone,
            branch: freshBranch,
            status: freshStatus,
            aadhaarDocumentPath: getAadhaarPath(record) || initialPerson.aadhaarDocumentPath,
            panCardPath: getPanPath(record) || initialPerson.panCardPath,
            profileImagePath: getProfilePath(record) || initialPerson.profileImagePath,
            rawRecord: record,
          }));
        }
      } else if (roleType === 'Back Office') {
        const response = await getBackOfficeById(targetId);
        const recordValue = response?.data !== undefined ? response.data : response;
        const record = Array.isArray(recordValue)
          ? recordValue[0]
          : (recordValue?.value?.[0] || recordValue?.data || recordValue?.value || recordValue);

        if (record && typeof record === 'object') {
          const freshName = read(record, ['fullName', 'FullName', 'name', 'Name']) || initialPerson.name;
          const freshCode = read(record, ['backOfficeCode', 'BackOfficeCode', 'code', 'Code']) || initialPerson.backOfficeCode;
          const freshEmail = read(record, ['emailAddress', 'EmailAddress', 'email', 'Email']) || initialPerson.email;
          const freshPhone = read(record, ['mobileNumber', 'MobileNumber', 'phone', 'Phone']) || initialPerson.phone;
          const freshBranch = read(record, ['branch', 'Branch', 'branchName', 'BranchName']) || initialPerson.branch;
          const freshStatus = status(read(record, ['status', 'Status', 'isActive', 'IsActive']), initialPerson.status);

          setSelectedPerson((prev) => ({
            ...prev,
            ...record,
            id: targetId,
            backOfficeId: targetId,
            type: 'Back Office',
            name: freshName,
            fullName: freshName,
            backOfficeCode: freshCode,
            email: freshEmail,
            phone: freshPhone,
            branch: freshBranch,
            status: freshStatus,
            aadhaarDocumentPath: getAadhaarPath(record) || initialPerson.aadhaarDocumentPath,
            panCardPath: getPanPath(record) || initialPerson.panCardPath,
            profileImagePath: getProfilePath(record) || initialPerson.profileImagePath,
            rawRecord: record,
          }));
        }
      } else if (roleType === 'Credit Manager' || roleType === 'CreditManager') {
        const response = await getCreditManagerById(targetId);
        const recordValue = response?.data !== undefined ? response.data : response;
        const record = Array.isArray(recordValue)
          ? recordValue[0]
          : (recordValue?.value?.[0] || recordValue?.data || recordValue?.value || recordValue);

        if (record && typeof record === 'object') {
          const freshName = read(record, ['fullName', 'FullName', 'name', 'Name']) || initialPerson.name;
          const freshCode = read(record, ['creditManagerCode', 'CreditManagerCode', 'code', 'Code']) || initialPerson.creditManagerCode;
          const freshEmail = read(record, ['emailAddress', 'EmailAddress', 'email', 'Email']) || initialPerson.email;
          const freshPhone = read(record, ['mobileNumber', 'MobileNumber', 'phone', 'Phone']) || initialPerson.phone;
          const freshBranch = read(record, ['branch', 'Branch', 'branchName', 'BranchName']) || initialPerson.branch;
          const freshStatus = status(read(record, ['status', 'Status', 'isActive', 'IsActive']), initialPerson.status);

          setSelectedPerson((prev) => ({
            ...prev,
            ...record,
            id: targetId,
            creditManagerId: targetId,
            type: 'Credit Manager',
            name: freshName,
            fullName: freshName,
            creditManagerCode: freshCode,
            email: freshEmail,
            phone: freshPhone,
            branch: freshBranch,
            status: freshStatus,
            aadhaarDocumentPath: getAadhaarPath(record) || initialPerson.aadhaarDocumentPath,
            panCardPath: getPanPath(record) || initialPerson.panCardPath,
            profileImagePath: getProfilePath(record) || initialPerson.profileImagePath,
            rawRecord: record,
          }));
        }
      } else if (roleType === 'Credit Head' || roleType === 'CreditHead') {
        const response = await getCreditHeadById(targetId);
        const recordValue = response?.data !== undefined ? response.data : response;
        const record = Array.isArray(recordValue)
          ? recordValue[0]
          : (recordValue?.value?.[0] || recordValue?.data || recordValue?.value || recordValue);

        if (record && typeof record === 'object') {
          const freshName = read(record, ['fullName', 'FullName', 'name', 'Name']) || initialPerson.name;
          const freshCode = read(record, ['creditHeadCode', 'CreditHeadCode', 'code', 'Code']) || initialPerson.creditHeadCode;
          const freshEmail = read(record, ['emailAddress', 'EmailAddress', 'email', 'Email']) || initialPerson.email;
          const freshPhone = read(record, ['mobileNumber', 'MobileNumber', 'phone', 'Phone']) || initialPerson.phone;
          const freshBranch = read(record, ['branch', 'Branch', 'branchName', 'BranchName']) || initialPerson.branch;
          const freshStatus = status(read(record, ['status', 'Status', 'isActive', 'IsActive']), initialPerson.status);

          setSelectedPerson((prev) => ({
            ...prev,
            ...record,
            id: targetId,
            creditHeadId: targetId,
            type: 'Credit Head',
            name: freshName,
            fullName: freshName,
            creditHeadCode: freshCode,
            email: freshEmail,
            phone: freshPhone,
            branch: freshBranch,
            status: freshStatus,
            aadhaarDocumentPath: getAadhaarPath(record) || initialPerson.aadhaarDocumentPath,
            panCardPath: getPanPath(record) || initialPerson.panCardPath,
            profileImagePath: getProfilePath(record) || initialPerson.profileImagePath,
            rawRecord: record,
          }));
        }
      } else if (roleType === 'Agent') {
        const response = await getAgentById(targetId);
        const recordValue = response?.data !== undefined ? response.data : response;
        const record = Array.isArray(recordValue)
          ? recordValue[0]
          : (recordValue?.value?.[0] || recordValue?.data || recordValue?.value || recordValue);

        if (record && typeof record === 'object') {
          const freshName = read(record, ['fullName', 'FullName', 'agentName', 'AgentName', 'name', 'Name']) || initialPerson.name;
          const freshEmail = read(record, ['emailAddress', 'EmailAddress', 'email', 'Email']) || initialPerson.email;
          const freshPhone = read(record, ['mobileNumber', 'MobileNumber', 'phone', 'Phone']) || initialPerson.phone;
          const freshRm = read(record, ['relationshipManager', 'RelationshipManager', 'rmName', 'RMName']) || initialPerson.rm;
          const freshBranch = read(record, ['branch', 'Branch', 'branchName', 'BranchName']) || initialPerson.branch;
          const freshStatus = status(read(record, ['status', 'Status', 'isActive', 'IsActive']), initialPerson.status);

          setSelectedPerson((prev) => ({
            ...prev,
            ...record,
            id: targetId,
            agentId: targetId,
            type: 'Agent',
            name: freshName,
            fullName: freshName,
            email: freshEmail,
            phone: freshPhone,
            rm: freshRm,
            branch: freshBranch,
            status: freshStatus,
            aadhaarDocumentPath: getAadhaarPath(record) || initialPerson.aadhaarDocumentPath,
            panCardPath: getPanPath(record) || initialPerson.panCardPath,
            profileImagePath: getProfilePath(record) || initialPerson.profileImagePath,
            rawRecord: record,
          }));
        }
      }
    } catch (err) {
      console.error(`Failed to load full ${roleType} details:`, err);
    }
  };

  // View AMS Modal Handler
  const handleOpenAmsDetails = async (ams) => {
    const targetId = ams?.id || ams?.amsId || ams?.AmsId;
    if (!targetId) return;

    const freshVersion = Date.now();
    setSelectedAms({ ...ams, imageVersion: freshVersion });
    setLoadingAmsModal(true);
    try {
      const [fullDataResult, districtDataResult] = await Promise.allSettled([
        getAMSById(targetId),
        getAMSDistrictsByAmsId(targetId),
      ]);

      const fullData = fullDataResult.status === 'fulfilled' ? fullDataResult.value : null;
      const record = Array.isArray(fullData)
        ? fullData[0]
        : (fullData?.data?.value?.[0] || fullData?.data || fullData?.value?.[0] || fullData);

      let mappedDistricts = [];
      if (districtDataResult.status === 'fulfilled' && districtDataResult.value) {
        const rawDistricts = districtDataResult.value;
        mappedDistricts = Array.isArray(rawDistricts)
          ? rawDistricts
          : (rawDistricts?.data || rawDistricts?.value || []);
      }

      const currentRecord = (record && typeof record === 'object') ? record : {};
      const fallbackDistricts = Array.isArray(currentRecord.districtNames || currentRecord.districts || currentRecord.amsDistricts)
        ? currentRecord.districtNames || currentRecord.districts || currentRecord.amsDistricts
        : (ams?.districts || ams?.districtNames || []);

      const finalDistricts = mappedDistricts.length > 0 ? mappedDistricts : fallbackDistricts;

      const mappedAms = {
        ...ams,
        ...currentRecord,
        id: targetId,
        amsId: targetId,
        imageVersion: freshVersion,
        amsCode: read(currentRecord, ['amsCode', 'AmsCode', 'code'], ams.amsCode || ''),
        fullName: read(currentRecord, ['fullName', 'FullName', 'name'], ams.fullName || 'Unnamed AMS'),
        genderId: currentRecord.genderId ?? currentRecord.GenderId ?? ams.genderId,
        genderName: read(currentRecord, ['genderName', 'GenderName', 'gender', 'Gender'], ams.genderName || ''),
        dateOfBirth: read(currentRecord, ['dateOfBirth', 'DateOfBirth', 'dob'], ams.dateOfBirth || ''),
        address: read(currentRecord, ['address', 'Address'], ams.address || ''),
        stateId: currentRecord.stateId ?? currentRecord.StateId ?? ams.stateId,
        stateName: read(currentRecord, ['stateName', 'StateName', 'state', 'State'], ams.stateName || ''),
        cityId: currentRecord.cityId ?? currentRecord.CityId ?? ams.cityId,
        cityName: read(currentRecord, ['cityName', 'CityName', 'city', 'City'], ams.cityName || ''),
        pincode: read(currentRecord, ['pincode', 'Pincode'], ams.pincode || ''),
        mobileNumber: read(currentRecord, ['mobileNumber', 'MobileNumber', 'phone', 'Phone'], ams.mobileNumber || ''),
        emailAddress: read(currentRecord, ['emailAddress', 'EmailAddress', 'email', 'Email'], ams.emailAddress || ''),
        branch: read(currentRecord, ['branch', 'Branch', 'branchName', 'BranchName'], ams.branch || ''),
        dateJoined: read(currentRecord, ['dateJoined', 'DateJoined'], ams.dateJoined || ''),
        isActive: currentRecord.isActive ?? currentRecord.IsActive ?? ams.isActive,
        accountNumber: read(currentRecord, ['accountNumber', 'AccountNumber'], ams.accountNumber || ''),
        ifscCode: read(currentRecord, ['ifscCode', 'IfscCode'], ams.ifscCode || ''),
        aadhaarDocumentPath: getAadhaarPath(currentRecord) || ams.aadhaarDocumentPath || '',
        panCardPath: getPanPath(currentRecord) || ams.panCardPath || '',
        profileImagePath: getProfilePath(currentRecord) || ams.profileImagePath || '',
        districts: finalDistricts,
        districtNames: finalDistricts,
        rawRecord: currentRecord,
      };

      setSelectedAms(mappedAms);
    } catch (err) {
      console.error('Failed to load full AMS details:', err);
    } finally {
      setLoadingAmsModal(false);
    }
  };

  const handleClosePreview = () => {
    cleanupBlobUrls();
    setPreviewDoc(null);
  };

  const handlePreviewDocument = async (title, rawPath, role = null, entityId = null, version = null) => {
    let targetUrl = '';
    const isProfile =
      String(title || '').toLowerCase().includes('profile') ||
      String(title || '').toLowerCase().includes('photo') ||
      String(title || '').toLowerCase().includes('image');
    const effectiveVersion = version || imageVersion;

    if (isProfile && role && entityId) {
      targetUrl = getProfileImageUrl(role, entityId, effectiveVersion);
    } else {
      targetUrl = getDocumentUrl(role, entityId, title, rawPath);
    }

    if (!targetUrl) return;

    if (isProfile) {
      setPreviewDoc({
        title,
        name: title,
        url: targetUrl,
        rawPath,
        isPdf: false,
        loading: false,
      });
      return;
    }

    const isPdfInitial = isPdfFile(targetUrl) || (rawPath ? isPdfFile(rawPath) : false);

    setPreviewDoc({
      title,
      name: title,
      url: targetUrl,
      rawPath,
      isPdf: isPdfInitial,
      loading: true,
    });

    try {
      const headers = authHeaders();
      const response = await apiFetch(targetUrl, { headers });
      if (response.ok) {
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        blobUrlsRef.current.push(objectUrl);
        const isPdf = blob.type === 'application/pdf' || isPdfInitial;
        setPreviewDoc({
          title,
          name: title,
          url: objectUrl,
          rawPath,
          isPdf,
          loading: false,
        });
      } else {
        setPreviewDoc((prev) => (prev ? { ...prev, loading: false } : null));
      }
    } catch (err) {
      console.warn('Blob preview fetch failed, using fallback URL:', err);
      setPreviewDoc((prev) => (prev ? { ...prev, loading: false } : null));
    }
  };

  const handlePreviewAgentDocument = async (document) => {
    const documentId = document?.agentCustomerDocumentId ?? document?.AgentCustomerDocumentId ?? document?.id ?? document?.Id;
    if (!documentId) return;

    const title = document?.documentTypeName || document?.customerDocumentTypeName || document?.documentName || document?.fileName || 'Customer Document';
    const fileName = document?.fileName || document?.documentName || '';
    setPreviewDoc({ title, name: title, url: '', rawPath: fileName, isPdf: isPdfFile(fileName), loading: true });

    try {
      const blob = await agentCustomerService.downloadDocument(documentId);
      const objectUrl = URL.createObjectURL(blob);
      blobUrlsRef.current.push(objectUrl);
      const isPdf = blob.type === 'application/pdf' || isPdfFile(fileName);
      setPreviewDoc({ title, name: title, url: objectUrl, rawPath: fileName, isPdf, loading: false });
    } catch (error) {
      console.warn('Could not preview customer document:', error);
      setPreviewDoc((previous) => (previous ? { ...previous, loading: false } : null));
    }
  };

  return (
    <div className="people-directory-page">
      <button
        type="button"
        className="people-dir-back-btn"
        onClick={() => navigate('/dashboard')}
        aria-label="Back to Dashboard"
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <div className="people-directory-card">
        <div className="people-dir-header">
          <div className="people-dir-heading-row">
            <div className="people-dir-title-wrap">
              <div className="people-dir-title-badge">
                <div className={`people-dir-icon ${meta.color}`}>
                  <RoleIcon size={20} />
                </div>
                <h1>{meta.title}</h1>
                <span className="people-dir-count-badge">
                  {records.length} {records.length === 1 ? 'record' : 'records'}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="primary-button"
              onClick={() => navigate('/create-user')}
            >
              <Plus size={16} /> {meta.addLabel}
            </button>
          </div>

          <div className="people-dir-controls">
            <div className="people-dir-search-box">
              <Search size={16} />
              <input
                aria-label={`Search ${meta.title}`}
                placeholder={meta.searchPlaceholder}
                value={searchQuery}
                onChange={handleSearchChange}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="people-dir-search-clear"
                  onClick={handleClearSearch}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {searchQuery && (
              <span className="people-dir-search-badge">
                Filtered: {totalRecords} of {records.length}
              </span>
            )}
          </div>
        </div>

        {error && <div className="dashboard-error" role="status" style={{ marginBottom: '16px' }}>{error}</div>}

        <div className="people-dir-table-wrap">
          {roleKey === 'agent' && (
            <table>
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Contact</th>
                  <th>Assigned RM</th>
                  <th>Applications</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className="empty-table" colSpan="6">Loading live agent data…</td></tr>
                ) : visibleRecords.length ? (
                  visibleRecords.map((agent) => (
                    <tr key={agent.id || agent.name}>
                      <td>
                        <div className="agent-name">
                          <DirectoryAvatar role="Agent" id={agent.id} name={agent.name} version={imageVersion} />
                          <strong>{agent.name}</strong>
                        </div>
                      </td>
                      <td>
                        <div>{agent.email || '—'}</div>
                        <small>{agent.phone || '—'}</small>
                      </td>
                      <td>{agent.rm || 'Unassigned'}</td>
                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap' }}>
                          <strong style={{ color: '#111827', fontSize: '13px' }}>{agent.applications || 0}</strong>
                          {Number(agent.applications || 0) > 0 && (
                            <button
                              type="button"
                              className="details-button"
                              style={{ padding: '3px 8px', fontSize: '12px', height: 'auto', lineHeight: '1.2' }}
                              onClick={() => setSublistModal({
                                title: `Customers — ${agent.name}`,
                                type: 'customers',
                                records: agent.customerList || []
                              })}
                            >
                              View Customers
                            </button>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`status ${String(agent.status || 'active').toLowerCase().replace(/\s+/g, '-')}`}>
                          {agent.status || 'Active'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="details-button"
                            onClick={() => handleOpenPersonDetails(agent, 'Agent')}
                          >
                            <Eye size={15} /> View
                          </button>
                          <button
                            type="button"
                            className="details-button edit-button"
                            onClick={() => navigate(`/edit-agent/${agent.id}`)}
                          >
                            <Pencil size={15} /> Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="empty-table" colSpan="6">
                      {searchQuery ? 'No matching agents found.' : meta.emptyText}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {roleKey === 'rm' && (
            <table>
              <thead>
                <tr>
                  <th>Relationship Manager</th>
                  <th>Contact</th>
                  <th>Branch</th>
                  <th>Assigned Agents</th>
                  <th>RM Direct Customers</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className="empty-table" colSpan="7">Loading live manager data…</td></tr>
                ) : visibleRecords.length ? (
                  visibleRecords.map((rm) => (
                    <tr key={rm.id || rm.name}>
                      <td>
                        <div className="agent-name">
                          <DirectoryAvatar role="RM" id={rm.id} name={rm.name} version={imageVersion} />
                          <strong>{rm.name}</strong>
                        </div>
                      </td>
                      <td>
                        <div>{rm.email || '—'}</div>
                        <small>{rm.phone || '—'}</small>
                      </td>
                      <td>{rm.branch || '—'}</td>
                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: '13px', color: '#374151', display: 'inline-flex', alignItems: 'baseline', gap: '4px' }}>
                            <strong style={{ color: '#111827' }}>{rm.agents || 0}</strong>
                            <span style={{ color: '#6B7280', fontSize: '12px' }}>{rm.agents === 1 ? 'agent' : 'agents'}</span>
                          </span>
                          {Number(rm.agents || 0) > 0 && (
                            <button
                              type="button"
                              className="details-button"
                              style={{ padding: '3px 8px', fontSize: '12px', height: 'auto', lineHeight: '1.2' }}
                              onClick={() => setSublistModal({
                                title: `Assigned Agents — ${rm.name}`,
                                type: 'agents',
                                records: rm.assignedAgentsList || []
                              })}
                            >
                              View Agents
                            </button>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap' }}>
                          {rm.directCustomersLoadingError ? (
                            <span style={{ fontSize: '12px', color: '#94A3B8' }}>Unavailable</span>
                          ) : (
                            <>
                              <span style={{ fontSize: '13px', color: '#374151', display: 'inline-flex', alignItems: 'baseline', gap: '4px' }}>
                                <strong style={{ color: '#111827' }}>{rm.directCustomersCount ?? 0}</strong>
                                <span style={{ color: '#6B7280', fontSize: '12px' }}>
                                  {rm.directCustomersCount === 1 ? 'customer' : 'customers'}
                                </span>
                              </span>
                              {Number(rm.directCustomersCount || 0) > 0 && (
                                <button
                                  type='button'
                                  className='details-button'
                                  style={{ padding: '3px 8px', fontSize: '12px', height: 'auto', lineHeight: '1.2' }}
                                  onClick={() => setSublistModal({
                                    title: `RM Direct Customers — ${rm.name}`,
                                    type: 'customers',
                                    records: rm.directCustomersList || []
                                  })}
                                >
                                  View Customers
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`status ${String(rm.status || 'active').toLowerCase().replace(/\s+/g, '-')}`}>
                          {rm.status || 'Active'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="details-button"
                            onClick={() => handleOpenPersonDetails(rm, 'Relationship manager')}
                          >
                            <Eye size={15} /> View
                          </button>
                          <button
                            type="button"
                            className="details-button edit-button"
                            onClick={() => navigate(`/edit-relationship-manager/${rm.id}`)}
                          >
                            <Pencil size={15} /> Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="empty-table" colSpan="7">
                      {searchQuery ? 'No matching relationship managers found.' : meta.emptyText}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {roleKey === 'backOffice' && (
            <table>
              <thead>
                <tr>
                  <th>Officer</th>
                  <th>Code / ID</th>
                  <th>Contact</th>
                  <th>Branch</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className="empty-table" colSpan="6">Loading live back office data…</td></tr>
                ) : visibleRecords.length ? (
                  visibleRecords.map((backOffice) => {
                    const displayName = backOffice.name || 'Unnamed officer';
                    const boId = backOffice.id || backOffice.backOfficeId;
                    return (
                      <tr key={boId || backOffice.backOfficeCode || displayName}>
                        <td>
                          <div className="agent-name">
                            <DirectoryAvatar role="BackOffice" id={boId} name={displayName} version={imageVersion} />
                            <strong>{displayName}</strong>
                          </div>
                        </td>
                        <td>
                          <strong>{backOffice.backOfficeCode || (boId ? `#${boId}` : '—')}</strong>
                        </td>
                        <td>
                          <div>{backOffice.email || '—'}</div>
                          <small>{backOffice.phone || '—'}</small>
                        </td>
                        <td>{backOffice.branch || '—'}</td>
                        <td>
                          <span className={`status ${String(backOffice.status || 'active').toLowerCase().replace(/\s+/g, '-')}`}>
                            {backOffice.status || 'Active'}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              type="button"
                              className="details-button"
                              onClick={() => handleOpenPersonDetails(backOffice, 'Back Office')}
                            >
                              <Eye size={15} /> View
                            </button>
                            <button
                              type="button"
                              className="details-button edit-button"
                              onClick={() => navigate(`/edit-back-office/${boId}`)}
                            >
                              <Pencil size={15} /> Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="empty-table" colSpan="6">
                      {searchQuery ? 'No matching back office officers found.' : meta.emptyText}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {roleKey === 'ams' && (
            <table>
              <thead>
                <tr>
                  <th>Specialist</th>
                  <th>ASM Code</th>
                  <th>Contact</th>
                  <th>Gender / Details</th>
                  <th>Branch / Location</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className="empty-table" colSpan="7">Loading live ASM data…</td></tr>
                ) : visibleRecords.length ? (
                  visibleRecords.map((ams) => {
                    const displayName = ams.fullName || ams.name || 'Unnamed specialist';
                    const amsId = ams.id || ams.amsId;
                    const genderLabel =
                      ams.genderName ||
                      (ams.genderId === 1 ? 'Male' : ams.genderId === 2 ? 'Female' : ams.genderId === 3 ? 'Other' : '—');
                    return (
                      <tr key={amsId || ams.amsCode || displayName}>
                        <td>
                          <div className="agent-name">
                            <DirectoryAvatar role="AMS" id={amsId} name={displayName} version={imageVersion} />
                            <strong>{displayName}</strong>
                          </div>
                        </td>
                        <td>
                          <strong>{ams.amsCode || (amsId ? `#${amsId}` : '—')}</strong>
                        </td>
                        <td>
                          <div>{ams.emailAddress || '—'}</div>
                          <small>{ams.mobileNumber || '—'}</small>
                        </td>
                        <td>{genderLabel}</td>
                        <td>{ams.branch || ams.cityName || '—'}</td>
                        <td>
                          <span className={`status ${ams.isActive !== false ? 'active' : 'inactive'}`}>
                            {ams.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              type="button"
                              className="details-button"
                              onClick={() => handleOpenAmsDetails(ams)}
                            >
                              <Eye size={15} /> View
                            </button>
                            <button
                              type="button"
                              className="details-button edit-button"
                              onClick={() => navigate(`/edit-ams/${amsId}`)}
                            >
                              <Pencil size={15} /> Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="empty-table" colSpan="7">
                      {searchQuery ? 'No matching area specialists found.' : meta.emptyText}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {roleKey === 'creditManager' && (
            <table>
              <thead>
                <tr>
                  <th>Credit Manager</th>
                  <th>Credit Manager Code</th>
                  <th>Contact</th>
                  <th>Branch</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className="empty-table" colSpan="6">Loading live credit manager data…</td></tr>
                ) : visibleRecords.length ? (
                  visibleRecords.map((cm) => {
                    const displayName = cm.fullName || cm.name || 'Unnamed credit manager';
                    const cmId = cm.id || cm.creditManagerId;
                    return (
                      <tr key={cmId || cm.creditManagerCode || displayName}>
                        <td>
                          <div className="agent-name">
                            <DirectoryAvatar
                              role="CreditManager"
                              id={cmId}
                              name={displayName}
                              version={imageVersion}
                              imagePath={cm.profileImagePath}
                            />
                            <strong>{displayName}</strong>
                          </div>
                        </td>
                        <td>
                          <strong>{cm.creditManagerCode || (cmId ? `#${cmId}` : '—')}</strong>
                        </td>
                        <td>
                          <div>{cm.emailAddress || cm.email || '—'}</div>
                          <small>{cm.mobileNumber || cm.phone || '—'}</small>
                        </td>
                        <td>{cm.branch || '—'}</td>
                        <td>
                          <span className={`status ${cm.isActive !== false ? 'active' : 'inactive'}`}>
                            {cm.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              type="button"
                              className="details-button"
                              onClick={() => handleOpenPersonDetails(cm, 'Credit Manager')}
                            >
                              <Eye size={15} /> View
                            </button>
                            <button
                              type="button"
                              className="details-button edit-button"
                              onClick={() => navigate(`/edit-credit-manager/${cmId}`)}
                            >
                              <Pencil size={15} /> Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="empty-table" colSpan="6">
                      {searchQuery ? 'No matching credit managers found.' : meta.emptyText}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {roleKey === 'creditHead' && (
            <table>
              <thead>
                <tr>
                  <th>Credit Head</th>
                  <th>Credit Head Code</th>
                  <th>Contact</th>
                  <th>Branch</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className="empty-table" colSpan="6">Loading live credit head data…</td></tr>
                ) : visibleRecords.length ? (
                  visibleRecords.map((ch) => {
                    const displayName = ch.fullName || ch.name || 'Unnamed credit head';
                    const chId = ch.id || ch.creditHeadId;
                    return (
                      <tr key={chId || ch.creditHeadCode || displayName}>
                        <td>
                          <div className="agent-name">
                            <DirectoryAvatar
                              role="CreditHead"
                              id={chId}
                              name={displayName}
                              version={imageVersion}
                              imagePath={ch.profileImagePath}
                            />
                            <strong>{displayName}</strong>
                          </div>
                        </td>
                        <td>
                          <strong>{ch.creditHeadCode || (chId ? `#${chId}` : '—')}</strong>
                        </td>
                        <td>
                          <div>{ch.emailAddress || ch.email || '—'}</div>
                          <small>{ch.mobileNumber || ch.phone || '—'}</small>
                        </td>
                        <td>{ch.branch || '—'}</td>
                        <td>
                          <span className={`status ${ch.isActive !== false ? 'active' : 'inactive'}`}>
                            {ch.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              type="button"
                              className="details-button"
                              onClick={() => handleOpenPersonDetails(ch, 'Credit Head')}
                            >
                              <Eye size={15} /> View
                            </button>
                            <button
                              type="button"
                              className="details-button edit-button"
                              onClick={() => navigate(`/edit-credit-head/${chId}`)}
                            >
                              <Pencil size={15} /> Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="empty-table" colSpan="6">
                      {searchQuery ? 'No matching credit heads found.' : meta.emptyText}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {roleKey === 'customer' && (
            <table>
              <thead>
                <tr>
                  <th>App / Customer ID</th>
                  <th>Customer</th>
                  <th>Loan Product</th>
                  <th>Expected Amount</th>
                  <th>Agent / RM</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className="empty-table" colSpan="7">Loading live customer records…</td></tr>
                ) : visibleRecords.length ? (
                  visibleRecords.map((customer) => (
                    <tr key={customer.id}>
                      <td><strong>{customer.customerCode || `#${customer.id}`}</strong></td>
                      <td>
                        <div className="agent-name">
                          <CustomerDirectoryAvatar
                            customerId={customer.id}
                            name={customer.customerName}
                          />
                          <div>
                            <strong>{customer.customerName}</strong>
                            <small>{customer.mobile}</small>
                          </div>
                        </div>
                      </td>
                      <td>{customer.loanPurpose || '—'}</td>
                      <td>{formatAmount(customer.amount)}</td>
                      <td>
                        <div>{customer.agentName || '—'}</div>
                        <small>{customer.rmName || '—'}</small>
                      </td>
                      <td>
                        <span className={`status ${String(customer.status || 'new').toLowerCase().replace(/\s+/g, '-')}`}>
                          {customer.status}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="details-button"
                            onClick={() => setSelectedApplication(customer)}
                          >
                            <Eye size={15} /> View details
                          </button>
                          <button
                            type="button"
                            className={`details-button edit-button ${!isCustomerEditable(customer) ? 'disabled' : ''}`}
                            disabled={!isCustomerEditable(customer)}
                            title={
                              !isCustomerEditable(customer)
                                ? 'Customer details can only be edited when application status is 0 (Draft/New).'
                                : 'Edit customer profile'
                            }
                            onClick={() => {
                              if (isCustomerEditable(customer)) {
                                navigate(`/edit-customer/${customer.id}`);
                              }
                            }}
                          >
                            <Pencil size={15} /> Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="empty-table" colSpan="7">
                      {searchQuery ? 'No matching customer records found.' : meta.emptyText}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Client-side Pagination Footer */}
        {totalRecords > 0 && (
          <div className="people-dir-pagination-bar">
            <span className="people-dir-pagination-info">
              Showing {startIndex + 1}–{endIndex} of {totalRecords} records
            </span>
            <div className="people-dir-pagination-controls">
              <button
                type="button"
                className="people-dir-page-btn"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} /> Previous
              </button>

              <div className="people-dir-page-numbers">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    className={`people-dir-page-number ${pageNum === currentPage ? 'active' : ''}`}
                    onClick={() => setCurrentPage(pageNum)}
                    aria-label={`Go to page ${pageNum}`}
                    aria-current={pageNum === currentPage ? 'page' : undefined}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="people-dir-page-btn"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                aria-label="Next page"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Executive Employee Record Modal (Agent, RM, Back Office, Credit Manager) */}
      {selectedPerson && (
        <ExecutiveEmployeeRecordModal
          person={selectedPerson}
          roleType={selectedPerson.type}
          imageVersion={selectedPerson.imageVersion || imageVersion}
          locations={locations}
          onClose={() => setSelectedPerson(null)}
          onPreviewDocument={handlePreviewDocument}
          onViewSublist={setSublistModal}
        />
      )}

      {/* Customer / Application Details Modal */}
      {selectedApplication && (
        <div
          className="exec-record-backdrop"
          role="presentation"
          onMouseDown={() => setSelectedApplication(null)}
        >
          <section
            className="exec-record-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Customer details"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="exec-record-header">
              <div className="exec-header-identity">
                <CustomerDirectoryAvatar
                  customerId={selectedApplication.id}
                  name={selectedApplication.customerName}
                  className="exec-header-avatar"
                  style={{ width: '44px', height: '44px', borderRadius: '50%' }}
                />
                <div className="exec-header-text">
                  <h2 className="exec-header-name">{selectedApplication.customerName}</h2>
                  <div className="exec-header-meta">
                    <span className="exec-header-role">Customer</span>
                    <span className="exec-header-dot">•</span>
                    <span className="exec-header-code">
                      {selectedApplication.customerCode || `APP #${selectedApplication.id}`}
                    </span>
                    <span className="exec-header-status-badge active">
                      {selectedApplication.status}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="exec-dialog-close"
                onClick={() => setSelectedApplication(null)}
                aria-label="Close customer details"
              >
                <X size={18} />
              </button>
            </div>

            <div className="exec-record-body">
              <div className="exec-section">
                <div className="exec-section-header">
                  <Users size={15} className="exec-section-icon" />
                  <h3 className="exec-section-title">Personal & Contact Information</h3>
                </div>
                <div className="exec-grid-4col">
                  <div className="exec-field">
                    <span className="exec-field-label">Full Name</span>
                    <span className="exec-field-value">{selectedApplication.customerName}</span>
                  </div>
                  <div className="exec-field">
                    <span className="exec-field-label">Mobile Number</span>
                    <span className="exec-field-value">{selectedApplication.mobile || '—'}</span>
                  </div>
                  <div className="exec-field exec-field-span-2">
                    <span className="exec-field-label">Email Address</span>
                    <span className="exec-field-value">{selectedApplication.email || '—'}</span>
                  </div>
                  <div className="exec-field">
                    <span className="exec-field-label">Employment Type</span>
                    <span className="exec-field-value">{selectedApplication.employmentType || '—'}</span>
                  </div>
                </div>
              </div>

              <div className="exec-section">
                <div className="exec-section-header">
                  <BriefcaseBusiness size={15} className="exec-section-icon" />
                  <h3 className="exec-section-title">Loan & Application Information</h3>
                </div>
                <div className="exec-grid-4col">
                  <div className="exec-field exec-field-span-2">
                    <span className="exec-field-label">Loan Product</span>
                    <span className="exec-field-value">{selectedApplication.loanPurpose || '—'}</span>
                  </div>
                  <div className="exec-field">
                    <span className="exec-field-label">Expected Amount</span>
                    <span className="exec-field-value highlight">{formatAmount(selectedApplication.amount)}</span>
                  </div>
                  <div className="exec-field">
                    <span className="exec-field-label">Application Status</span>
                    <span className="exec-field-value">{selectedApplication.status || '—'}</span>
                  </div>
                </div>
              </div>

              <div className="exec-section">
                <div className="exec-section-header">
                  <Building2 size={15} className="exec-section-icon" />
                  <h3 className="exec-section-title">Assignment & Organization</h3>
                </div>
                <div className="exec-grid-4col">
                  <div className="exec-field">
                    <span className="exec-field-label">Branch</span>
                    <span className="exec-field-value">{selectedApplication.branch || '—'}</span>
                  </div>
                  <div className="exec-field">
                    <span className="exec-field-label">Field Agent</span>
                    <span className="exec-field-value">{selectedApplication.agentName || '—'}</span>
                  </div>
                  <div className="exec-field">
                    <span className="exec-field-label">Agent Mobile</span>
                    <span className="exec-field-value">{selectedApplication.agentPhone || '—'}</span>
                  </div>
                  <div className="exec-field">
                    <span className="exec-field-label">Relationship Manager</span>
                    <span className="exec-field-value">{selectedApplication.rmName || '—'}</span>
                  </div>
                </div>
              </div>

              <div className="exec-section">
                <div className="exec-section-header">
                  <FileText size={15} className="exec-section-icon" />
                  <h3 className="exec-section-title">Agent Uploaded Documents</h3>
                </div>
                {customerDocumentsLoading ? (
                  <div className="exec-record-loading">Loading uploaded documents…</div>
                ) : customerDocumentsError ? (
                  <div className="exec-doc-unavailable">{customerDocumentsError}</div>
                ) : customerDocuments.length === 0 ? (
                  <div className="exec-doc-unavailable">No documents uploaded by the agent.</div>
                ) : (
                  <div className="exec-docs-grid-3col">
                    {customerDocuments.map((document, index) => {
                      const documentId = document?.agentCustomerDocumentId ?? document?.AgentCustomerDocumentId ?? document?.id ?? document?.Id ?? index;
                      const title = document?.documentTypeName || document?.customerDocumentTypeName || document?.documentName || document?.fileName || 'Customer Document';
                      const fileName = document?.fileName || document?.documentName || 'Uploaded document';
                      return (
                        <div className="exec-doc-card" key={`${documentId}-${index}`}>
                          <div className="exec-doc-card-info">
                            <FileText size={17} className="exec-doc-icon" />
                            <div className="exec-doc-text">
                              <strong className="exec-doc-title">{title}</strong>
                              <span className="exec-doc-subtext" title={fileName}>Uploaded by Agent</span>
                            </div>
                          </div>
                          {documentId !== index ? (
                            <button
                              type="button"
                              className="exec-doc-view-btn"
                              onClick={() => handlePreviewAgentDocument(document)}
                            >
                              <Eye size={13} /> View
                            </button>
                          ) : (
                            <span className="exec-doc-unavailable">Unavailable</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="exec-section exec-section-compact">
                <div className="exec-section-header">
                  <FileText size={15} className="exec-section-icon" />
                  <h3 className="exec-section-title">Application Timeline & Remarks</h3>
                </div>
                <div className="exec-grid-4col">
                  <div className="exec-field exec-field-span-2">
                    <span className="exec-field-label">Submitted (IST)</span>
                    <span className="exec-field-value">{formatDateTime(selectedApplication.createdAt)}</span>
                  </div>
                  <div className="exec-field exec-field-span-2">
                    <span className="exec-field-label">Last Updated (IST)</span>
                    <span className="exec-field-value">{formatDateTime(selectedApplication.updatedAt)}</span>
                  </div>
                  <div className="exec-field exec-field-full">
                    <span className="exec-field-label">Remarks</span>
                    <span className="exec-field-value">{selectedApplication.remarks || '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="exec-record-footer">
              <button className="exec-footer-close-btn" onClick={() => setSelectedApplication(null)}>
                Close
              </button>
              {isCustomerEditable(selectedApplication) && (
                <button
                  type="button"
                  className="exec-doc-view-btn"
                  onClick={() => {
                    const id = selectedApplication.id;
                    setSelectedApplication(null);
                    navigate(`/edit-customer/${id}`);
                  }}
                >
                  <Pencil size={15} /> Edit Customer
                </button>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Executive Employee Record Modal (AMS) */}
      {selectedAms && (
        <ExecutiveEmployeeRecordModal
          person={selectedAms}
          roleType="AMS"
          loading={loadingAmsModal}
          imageVersion={selectedAms.imageVersion || imageVersion}
          locations={locations}
          onClose={() => setSelectedAms(null)}
          onPreviewDocument={handlePreviewDocument}
          onViewSublist={setSublistModal}
        />
      )}

      {/* Dedicated Document / Image Preview Lightbox */}
      {previewDoc && (
        <div
          className="ams-doc-preview-backdrop"
          role="presentation"
          onMouseDown={handleClosePreview}
        >
          <div
            className="ams-doc-preview-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={previewDoc.title || 'Document Preview'}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="ams-doc-preview-header">
              <h3>
                {previewDoc.isPdf ? <FileText size={18} /> : <Camera size={18} />}
                {previewDoc.title || 'Document Preview'}
              </h3>
              <div className="ams-doc-preview-header-actions">
                {previewDoc.url && (
                  <a
                    href={previewSrc || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ams-doc-newtab-btn"
                    title="Open in new window or tab"
                  >
                    <ArrowUpRight size={14} /> Open in New Tab
                  </a>
                )}
                <button
                  type="button"
                  className="ams-doc-preview-close"
                  onClick={handleClosePreview}
                  aria-label="Close preview"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="ams-doc-preview-body">
              {previewDoc.loading ? (
                <div className="doc-loading-container">
                  <LoaderCircle size={28} className="doc-spin-icon" />
                  <span>Loading document preview...</span>
                </div>
              ) : previewDoc.isPdf ? (
                <div className="ams-doc-iframe-container">
                  <iframe
                    src={previewSrc || undefined}
                    title={previewDoc.title || 'PDF Preview'}
                    className="ams-doc-iframe"
                  />
                  <div className="ams-doc-fallback-bar">
                    <span>Trouble viewing PDF?</span>
                    <a
                      href={previewSrc || undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ams-doc-newtab-btn"
                    >
                      <ArrowUpRight size={13} /> Open in new tab
                    </a>
                  </div>
                </div>
              ) : (
                <div className="ams-doc-image-container">
                  <img
                    src={previewSrc || undefined}
                    alt={previewDoc.title || 'Preview'}
                    className="ams-doc-image"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const errBox = document.getElementById('dir-doc-img-error');
                      if (errBox) errBox.style.display = 'flex';
                    }}
                  />
                  <div id="dir-doc-img-error" className="ams-doc-error-box" style={{ display: 'none' }}>
                    <p>Unable to load image preview directly.</p>
                    {previewDoc.url && (
                      <a
                        href={previewSrc || undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ams-doc-newtab-btn"
                      >
                        <ArrowUpRight size={14} /> Open Image in New Tab
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sublist Records Modal (View Customers / View Agents) */}
      {sublistModal && (
        <SublistRecordsModal
          modalData={sublistModal}
          onClose={() => setSublistModal(null)}
        />
      )}
    </div>
  );
}

export default PeopleDirectoryPage;
