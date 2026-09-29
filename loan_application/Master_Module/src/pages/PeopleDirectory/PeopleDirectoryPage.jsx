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
import { agentCustomerService } from '../../../../Core/src/services/agentCustomerService';
import { getProfileImageUrl, getDocumentUrl, buildFileUrl } from '../../utils/profileImageHelper';
import { resolveApplicationOwnership } from '../../../../Core/src/utils/ownershipHelper';
import './PeopleDirectory.css';
import '../Dashboard/Dashboard.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';

const unwrap = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.value)) return response.value;
  if (Array.isArray(response?.data?.value)) return response.data.value;
  return [];
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

const getAadhaarPath = (record) =>
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

const getPanPath = (record) =>
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

const getProfilePath = (record) =>
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

const isPdfFile = (urlOrPath = '') => {
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

  const numeric = Number(value);
  if (numeric === 2) return 'Approved';
  if (numeric === 1) return 'Pending';
  if (numeric === 0) return 'New';

  const raw = String(value || '').trim();
  if (!raw || raw.toLowerCase() === 'draft') return 'New';
  return raw.replace(/^./, (letter) => letter.toUpperCase());
};

const authHeaders = () => {
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

function DirectoryAvatar({ role, id, name, className = 'role-avatar', style, version = null }) {
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

  const effectiveVersion = version || liveVersion;
  const imageUrl = getProfileImageUrl(role, id, effectiveVersion);

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
        <img
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
    title: 'Area Specialists (AMS)',
    subtitle: 'Cover designated districts, local channels, and regional operations.',
    icon: ShieldCheck,
    color: 'purple',
    searchPlaceholder: 'Search AMS by name, code, contact, branch, city...',
    emptyText: 'No area specialists found.',
    addLabel: 'Add user',
  },
  customer: {
    key: 'customer',
    title: 'Customers',
    subtitle: 'Network customer and application records.',
    icon: FileText,
    color: 'orange',
    searchPlaceholder: 'Search customers by name, mobile, loan purpose, status...',
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
  const [selectedAms, setSelectedAms] = useState(null);
  const [loadingAmsModal, setLoadingAmsModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [imageVersion, setImageVersion] = useState(() => Date.now());

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

        const appsByAgent = appRows.reduce((map, app) => {
          const aId = read(app, ['agentId', 'AgentId', 'assignedAgentId']);
          if (aId) map.set(String(aId), (map.get(String(aId)) || 0) + 1);
          return map;
        }, new Map());

        const liveAgents = agentRows
          .map((agent) => {
            const rmId = read(agent, ['rmId', 'RMId', 'relationshipManagerId', 'RelationshipManagerId', 'createdBy']);
            const id = read(agent, ['agentId', 'AgentId', 'id', 'Id']);
            const agentName = read(agent, ['fullName', 'FullName', 'agentName', 'AgentName', 'name', 'Name'], 'Unnamed agent');
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
              aadhaarDocumentPath: getAadhaarPath(agent),
              panCardPath: getPanPath(agent),
              profileImagePath: getProfilePath(agent),
              rawRecord: agent,
            };
          })
          .filter((a) => a.id || a.name);

        setRecords(liveAgents);
      } else if (roleKey === 'rm') {
        const [rmResult, agentResult] = await Promise.allSettled([
          getAllRelationshipManagers(),
          getAllAgents(),
        ]);

        const rmRows = rmResult.status === 'fulfilled' ? unwrap(rmResult.value) : [];
        const agentRows = agentResult.status === 'fulfilled' ? unwrap(agentResult.value) : [];

        const liveRms = rmRows
          .map((rm) => {
            const id = read(rm, ['rmId', 'RMId', 'id', 'Id']);
            const rmName =
              read(rm, ['fullName', 'FullName', 'rmName', 'RMName', 'name', 'Name']) ||
              `${read(rm, ['firstName', 'FirstName'], '')} ${read(rm, ['lastName', 'LastName'], '')}`.trim() ||
              'Unnamed RM';
            const assignedAgentsCount = agentRows.filter((agent) => {
              const aRmId = read(agent, ['rmId', 'RMId', 'relationshipManagerId', 'RelationshipManagerId', 'createdBy']);
              const aRmName = read(agent, ['relationshipManager', 'RelationshipManager', 'rmName', 'RMName']);
              return String(aRmId) === String(id) || aRmName === rmName;
            }).length;

            return {
              id,
              rmId: id,
              name: rmName,
              fullName: rmName,
              email: read(rm, ['emailAddress', 'EmailAddress', 'email', 'Email']),
              phone: read(rm, ['mobileNumber', 'MobileNumber', 'phone', 'Phone']),
              branch: read(rm, ['branch', 'Branch', 'branchName', 'BranchName']),
              status: status(read(rm, ['status', 'Status', 'isActive', 'IsActive'])),
              agents: assignedAgentsCount,
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
            const fullName = read(item, ['fullName', 'FullName', 'name', 'Name'], 'Unnamed AMS');
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

            return {
              id: read(application, ['agentCustomerId', 'AgentCustomerId', 'applicationId', 'id']),
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
              loanPurpose: read(application, ['loanPurposeName', 'LoanPurposeName', 'loanType'], '—'),
              amount: money(read(application, ['expectedLoanAmount', 'ExpectedLoanAmount', 'disbursedAmount', 'loanAmount', 'requestedAmount'])),
              remarks: read(application, ['remarks', 'Remarks'], '—'),
              status: normalizeApplicationStatus(
                read(application, ['status', 'applicationStatus', 'ApplicationStatus'], '0'),
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
      if (roleKey === 'customer') {
        return [item.id, item.customerName, item.mobile, item.email, item.loanPurpose, item.agentName, item.rmName, item.status]
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
    const roleType = type || (roleKey === 'rm' ? 'Relationship manager' : roleKey === 'backOffice' ? 'Back Office' : 'Agent');
    const targetId = person?.id || person?.agentId || person?.rmId || person?.backOfficeId;
    if (!targetId && !person) return;

    const initialPerson = {
      ...person,
      type: roleType,
      id: targetId || person?.id,
      name: person?.name || person?.fullName || 'Unnamed',
      fullName: person?.fullName || person?.name || 'Unnamed',
      email: person?.email || person?.emailAddress || 'Not available',
      phone: person?.phone || person?.mobileNumber || 'Not available',
      status: person?.status || 'Active',
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
        isActive: currentRecord.isActive ?? currentRecord.IsActive ?? ams.isActive ?? true,
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
      const response = await fetch(targetUrl, { headers });
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
              <p className="people-dir-subtitle">{meta.subtitle}</p>
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
                      <td><strong>{agent.applications || 0}</strong></td>
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
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className="empty-table" colSpan="6">Loading live manager data…</td></tr>
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
                        <strong>{rm.agents || 0}</strong>
                        <small style={{ display: 'block' }}>{rm.agents === 1 ? 'agent' : 'agents'}</small>
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
                    <td className="empty-table" colSpan="6">
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
                  <th>AMS Code</th>
                  <th>Contact</th>
                  <th>Gender / Details</th>
                  <th>Branch / Location</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className="empty-table" colSpan="7">Loading live AMS data…</td></tr>
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

          {roleKey === 'customer' && (
            <table>
              <thead>
                <tr>
                  <th>App / Customer ID</th>
                  <th>Customer</th>
                  <th>Loan Purpose</th>
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
                      <td><strong>#{customer.id}</strong></td>
                      <td>
                        <div className="agent-name">
                          <span>{initials(customer.customerName)}</span>
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
                        <button
                          type="button"
                          className="details-button"
                          onClick={() => setSelectedApplication(customer)}
                        >
                          <Eye size={15} /> View details
                        </button>
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

      {/* RM / Agent / Back Office Details Modal */}
      {selectedPerson && (
        <div
          className="person-dialog-backdrop"
          role="presentation"
          onMouseDown={() => setSelectedPerson(null)}
        >
          <section
            className="person-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedPerson.type} details`}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="person-dialog-close"
              onClick={() => setSelectedPerson(null)}
              aria-label="Close details"
            >
              <X size={18} />
            </button>
            <DirectoryAvatar
              role={
                selectedPerson.type === 'Relationship manager' || selectedPerson.type === 'RM'
                  ? 'RM'
                  : selectedPerson.type === 'Back Office'
                  ? 'BackOffice'
                  : selectedPerson.type === 'AMS'
                  ? 'AMS'
                  : 'Agent'
              }
              id={selectedPerson.id || selectedPerson.agentId || selectedPerson.rmId || selectedPerson.backOfficeId || selectedPerson.amsId}
              name={selectedPerson.name}
              className="person-dialog-avatar"
              version={selectedPerson.imageVersion || imageVersion}
            />
            <span className="eyebrow">{selectedPerson.type}</span>
            <h2>{selectedPerson.name}</h2>
            <span className={`status ${String(selectedPerson.status || 'active').toLowerCase()}`}>
              {selectedPerson.status || 'Active'}
            </span>
            <dl className="person-detail-grid">
              <div>
                <dt>Email</dt>
                <dd>{selectedPerson.email || 'Not available'}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{selectedPerson.phone || 'Not available'}</dd>
              </div>
              {selectedPerson.type === 'Agent' ? (
                <>
                  <div>
                    <dt>Assigned RM</dt>
                    <dd>{selectedPerson.rm}</dd>
                  </div>
                  <div>
                    <dt>Applications</dt>
                    <dd>{selectedPerson.applications}</dd>
                  </div>
                </>
              ) : selectedPerson.type === 'Back Office' ? (
                <>
                  <div>
                    <dt>Branch</dt>
                    <dd>{selectedPerson.branch || 'Not available'}</dd>
                  </div>
                  <div>
                    <dt>Back Office Code</dt>
                    <dd>{selectedPerson.backOfficeCode || 'Not available'}</dd>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <dt>Branch</dt>
                    <dd>{selectedPerson.branch || 'Not available'}</dd>
                  </div>
                  <div>
                    <dt>Assigned agents</dt>
                    <dd>{selectedPerson.agents}</dd>
                  </div>
                </>
              )}
            </dl>

            {/* Documents Section */}
            <div className="ams-modal-section" style={{ width: '100%', marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <h3 className="ams-section-title">Documents</h3>
              <div className="ams-doc-links-grid">
                {/* Aadhaar Card */}
                <div className="ams-doc-card">
                  <div className="ams-doc-card-info">
                    <FileText size={18} className="ams-doc-icon" />
                    <div>
                      <strong>Aadhaar Card</strong>
                      <small>
                        {getAadhaarPath(selectedPerson) || selectedPerson.aadhaarDocumentPath
                          ? 'Document uploaded'
                          : 'No document uploaded'}
                      </small>
                    </div>
                  </div>
                  {(getAadhaarPath(selectedPerson) || selectedPerson.aadhaarDocumentPath) ? (
                    <button
                      type="button"
                      className="details-button"
                      onClick={() => {
                        const personRole =
                          selectedPerson.type === 'Relationship manager' || selectedPerson.type === 'RM'
                            ? 'RM'
                            : selectedPerson.type === 'Back Office'
                            ? 'BackOffice'
                            : selectedPerson.type === 'AMS'
                            ? 'AMS'
                            : 'Agent';
                        const personId = selectedPerson.id || selectedPerson.agentId || selectedPerson.rmId || selectedPerson.backOfficeId || selectedPerson.amsId;
                        handlePreviewDocument(
                          'Aadhaar Card',
                          getAadhaarPath(selectedPerson) || selectedPerson.aadhaarDocumentPath,
                          personRole,
                          personId
                        );
                      }}
                    >
                      <Eye size={14} /> View Document
                    </button>
                  ) : (
                    <span className="ams-doc-missing">Unavailable</span>
                  )}
                </div>

                {/* PAN Card */}
                <div className="ams-doc-card">
                  <div className="ams-doc-card-info">
                    <FileText size={18} className="ams-doc-icon" />
                    <div>
                      <strong>PAN Card</strong>
                      <small>
                        {getPanPath(selectedPerson) || selectedPerson.panCardPath
                          ? 'Document uploaded'
                          : 'No document uploaded'}
                      </small>
                    </div>
                  </div>
                  {(getPanPath(selectedPerson) || selectedPerson.panCardPath) ? (
                    <button
                      type="button"
                      className="details-button"
                      onClick={() => {
                        const personRole =
                          selectedPerson.type === 'Relationship manager' || selectedPerson.type === 'RM'
                            ? 'RM'
                            : selectedPerson.type === 'Back Office'
                            ? 'BackOffice'
                            : selectedPerson.type === 'AMS'
                            ? 'AMS'
                            : 'Agent';
                        const personId = selectedPerson.id || selectedPerson.agentId || selectedPerson.rmId || selectedPerson.backOfficeId || selectedPerson.amsId;
                        handlePreviewDocument(
                          'PAN Card',
                          getPanPath(selectedPerson) || selectedPerson.panCardPath,
                          personRole,
                          personId
                        );
                      }}
                    >
                      <Eye size={14} /> View Document
                    </button>
                  ) : (
                    <span className="ams-doc-missing">Unavailable</span>
                  )}
                </div>

                {/* Profile Image */}
                <div className="ams-doc-card">
                  <div className="ams-doc-card-info">
                    <Camera size={18} className="ams-doc-icon" />
                    <div>
                      <strong>Profile Image</strong>
                      <small>Photograph uploaded</small>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="details-button"
                    onClick={() => {
                      const personRole =
                        selectedPerson.type === 'Relationship manager' || selectedPerson.type === 'RM'
                          ? 'RM'
                          : selectedPerson.type === 'Back Office'
                          ? 'BackOffice'
                          : selectedPerson.type === 'AMS'
                          ? 'AMS'
                          : 'Agent';
                      const personId = selectedPerson.id || selectedPerson.agentId || selectedPerson.rmId || selectedPerson.backOfficeId || selectedPerson.amsId;
                      handlePreviewDocument(
                        'Profile Image',
                        getProfilePath(selectedPerson) || selectedPerson.profileImagePath,
                        personRole,
                        personId,
                        selectedPerson.imageVersion || imageVersion
                      );
                    }}
                  >
                    <Eye size={14} /> View Image
                  </button>
                </div>
              </div>
            </div>

            <div className="person-dialog-actions">
              <button className="masters-btn-secondary" onClick={() => setSelectedPerson(null)}>
                Close
              </button>
              <button
                className="primary-button"
                onClick={() => {
                  setSelectedPerson(null);
                  if (selectedPerson.type === 'Agent') {
                    navigate(`/edit-agent/${selectedPerson.id}`);
                  } else if (selectedPerson.type === 'Back Office') {
                    navigate(`/edit-back-office/${selectedPerson.id}`);
                  } else {
                    navigate(`/edit-relationship-manager/${selectedPerson.id}`);
                  }
                }}
              >
                <Pencil size={16} /> Edit {selectedPerson.type === 'Agent' ? 'agent' : selectedPerson.type === 'Back Office' ? 'back office' : 'RM'}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Customer / Application Details Modal */}
      {selectedApplication && (
        <div
          className="person-dialog-backdrop"
          role="presentation"
          onMouseDown={() => setSelectedApplication(null)}
        >
          <section
            className="person-dialog application-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Application details"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="person-dialog-close"
              onClick={() => setSelectedApplication(null)}
              aria-label="Close application details"
            >
              <X size={18} />
            </button>
            <div className="person-dialog-avatar">{initials(selectedApplication.customerName)}</div>
            <span className="eyebrow">Application #{selectedApplication.id}</span>
            <h2>{selectedApplication.customerName}</h2>
            <span className={`status ${selectedApplication.status.toLowerCase().replace(/\s+/g, '-')}`}>
              {selectedApplication.status}
            </span>
            <dl className="person-detail-grid application-detail-grid">
              <div>
                <dt>Mobile</dt>
                <dd>{selectedApplication.mobile}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{selectedApplication.email}</dd>
              </div>
              <div>
                <dt>Loan purpose</dt>
                <dd>{selectedApplication.loanPurpose}</dd>
              </div>
              <div>
                <dt>Expected amount</dt>
                <dd>{formatAmount(selectedApplication.amount)}</dd>
              </div>
              <div>
                <dt>Employment type</dt>
                <dd>{selectedApplication.employmentType}</dd>
              </div>
              <div>
                <dt>Branch</dt>
                <dd>{selectedApplication.branch}</dd>
              </div>
              <div>
                <dt>Field agent</dt>
                <dd>
                  {selectedApplication.agentName}
                  <small>{selectedApplication.agentPhone}</small>
                </dd>
              </div>
              <div>
                <dt>Relationship manager</dt>
                <dd>{selectedApplication.rmName}</dd>
              </div>
              <div>
                <dt>Submitted (IST)</dt>
                <dd>{formatDateTime(selectedApplication.createdAt)}</dd>
              </div>
              <div>
                <dt>Last updated (IST)</dt>
                <dd>{formatDateTime(selectedApplication.updatedAt)}</dd>
              </div>
              <div className="full-width">
                <dt>Remarks</dt>
                <dd>{selectedApplication.remarks}</dd>
              </div>
            </dl>
            <div className="person-dialog-actions">
              <button className="masters-btn-secondary" onClick={() => setSelectedApplication(null)}>
                Close
              </button>
            </div>
          </section>
        </div>
      )}

      {/* AMS Full Details Modal */}
      {selectedAms && (
        <div
          className="person-dialog-backdrop"
          role="presentation"
          onMouseDown={() => setSelectedAms(null)}
        >
          <section
            className="person-dialog ams-details-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Area Management Specialist details"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="person-dialog-close"
              onClick={() => setSelectedAms(null)}
              aria-label="Close AMS details"
            >
              <X size={18} />
            </button>

            {/* Modal Header */}
            <div className="ams-modal-header">
              <DirectoryAvatar
                role="AMS"
                id={selectedAms.amsId || selectedAms.id}
                name={selectedAms.fullName}
                className="person-dialog-avatar ams-modal-avatar"
                version={selectedAms.imageVersion || imageVersion}
              />
              <div className="ams-modal-title-block">
                <span className="eyebrow">AREA MANAGEMENT SPECIALIST</span>
                <h2>{selectedAms.fullName}</h2>
                <div className="ams-badge-row">
                  {selectedAms.amsCode && (
                    <span className="ams-code-badge">Code: {selectedAms.amsCode}</span>
                  )}
                  <span className={`status ${selectedAms.isActive !== false ? 'active' : 'inactive'}`}>
                    {selectedAms.isActive !== false ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>

            {loadingAmsModal ? (
              <p className="loading-line">Loading details…</p>
            ) : (
              <div className="ams-modal-scrollable">
                {/* Personal Information */}
                <div className="ams-modal-section">
                  <h3 className="ams-section-title">Personal Information</h3>
                  <dl className="person-detail-grid">
                    <div>
                      <dt>Full Name</dt>
                      <dd>{selectedAms.fullName || '—'}</dd>
                    </div>
                    <div>
                      <dt>AMS Code</dt>
                      <dd>{selectedAms.amsCode || '—'}</dd>
                    </div>
                    <div>
                      <dt>Date of Birth</dt>
                      <dd>{formatDob(selectedAms.dateOfBirth)}</dd>
                    </div>
                    <div>
                      <dt>Gender</dt>
                      <dd>
                        {selectedAms.genderName ||
                          (selectedAms.genderId === 1
                            ? 'Male'
                            : selectedAms.genderId === 2
                            ? 'Female'
                            : selectedAms.genderId === 3
                            ? 'Other'
                            : '—')}
                      </dd>
                    </div>
                    <div>
                      <dt>Mobile Number</dt>
                      <dd>{selectedAms.mobileNumber || '—'}</dd>
                    </div>
                    <div>
                      <dt>Email Address</dt>
                      <dd>{selectedAms.emailAddress || '—'}</dd>
                    </div>
                  </dl>
                </div>

                {/* Location Information */}
                <div className="ams-modal-section">
                  <h3 className="ams-section-title">Location Information</h3>
                  <dl className="person-detail-grid">
                    <div className="full-width">
                      <dt>Address</dt>
                      <dd>{selectedAms.address || '—'}</dd>
                    </div>
                    <div>
                      <dt>State</dt>
                      <dd>{selectedAms.stateName || (selectedAms.stateId ? `State ID: ${selectedAms.stateId}` : '—')}</dd>
                    </div>
                    <div>
                      <dt>City</dt>
                      <dd>{selectedAms.cityName || (selectedAms.cityId ? `City ID: ${selectedAms.cityId}` : '—')}</dd>
                    </div>
                    <div>
                      <dt>Pincode</dt>
                      <dd>{selectedAms.pincode || '—'}</dd>
                    </div>
                    <div>
                      <dt>Branch</dt>
                      <dd>{selectedAms.branch || '—'}</dd>
                    </div>
                    <div className="full-width">
                      <dt>Districts</dt>
                      <dd>
                        {formatDistrictList(selectedAms.districts || selectedAms.districtNames)}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Employment & Banking */}
                <div className="ams-modal-section">
                  <h3 className="ams-section-title">Employment & Banking</h3>
                  <dl className="person-detail-grid">
                    <div>
                      <dt>Date Joined</dt>
                      <dd>{formatDateTimeFriendly(selectedAms.dateJoined) || '—'}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>{selectedAms.isActive !== false ? 'Active' : 'Inactive'}</dd>
                    </div>
                    <div>
                      <dt>Account Number</dt>
                      <dd>{selectedAms.accountNumber || '—'}</dd>
                    </div>
                    <div>
                      <dt>IFSC Code</dt>
                      <dd>{selectedAms.ifscCode || '—'}</dd>
                    </div>
                  </dl>
                </div>

                {/* Assigned Districts (if available) */}
                {((selectedAms.districts && selectedAms.districts.length > 0) || (selectedAms.districtNames && selectedAms.districtNames.length > 0)) && (
                  <div className="ams-modal-section">
                    <h3 className="ams-section-title">Assigned Districts</h3>
                    <div className="ams-district-pills">
                      {(selectedAms.districts || selectedAms.districtNames).map((d, i) => (
                        <span key={d.districtId || i} className="ams-summary-pill">
                          {typeof d === 'string' ? d : d.districtName || d.name || `District #${d.districtId || i}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Documents Section */}
                <div className="ams-modal-section">
                  <h3 className="ams-section-title">Documents</h3>
                  <div className="ams-doc-links-grid">
                    {/* Aadhaar Card */}
                    <div className="ams-doc-card">
                      <div className="ams-doc-card-info">
                        <FileText size={18} className="ams-doc-icon" />
                        <div>
                          <strong>Aadhaar Card</strong>
                          <small>
                            {getAadhaarPath(selectedAms) || selectedAms.aadhaarDocumentPath
                              ? 'Document uploaded'
                              : 'No document uploaded'}
                          </small>
                        </div>
                      </div>
                      {(getAadhaarPath(selectedAms) || selectedAms.aadhaarDocumentPath) ? (
                        <button
                          type="button"
                          className="details-button"
                          onClick={() =>
                            handlePreviewDocument(
                              'Aadhaar Card',
                              getAadhaarPath(selectedAms) || selectedAms.aadhaarDocumentPath,
                              'AMS',
                              selectedAms.amsId || selectedAms.id || selectedAms.AmsId
                            )
                          }
                        >
                          <Eye size={14} /> View Document
                        </button>
                      ) : (
                        <span className="ams-doc-missing">Unavailable</span>
                      )}
                    </div>

                    {/* PAN Card */}
                    <div className="ams-doc-card">
                      <div className="ams-doc-card-info">
                        <FileText size={18} className="ams-doc-icon" />
                        <div>
                          <strong>PAN Card</strong>
                          <small>
                            {getPanPath(selectedAms) || selectedAms.panCardPath
                              ? 'Document uploaded'
                              : 'No document uploaded'}
                          </small>
                        </div>
                      </div>
                      {(getPanPath(selectedAms) || selectedAms.panCardPath) ? (
                        <button
                          type="button"
                          className="details-button"
                          onClick={() =>
                            handlePreviewDocument(
                              'PAN Card',
                              getPanPath(selectedAms) || selectedAms.panCardPath,
                              'AMS',
                              selectedAms.amsId || selectedAms.id || selectedAms.AmsId
                            )
                          }
                        >
                          <Eye size={14} /> View Document
                        </button>
                      ) : (
                        <span className="ams-doc-missing">Unavailable</span>
                      )}
                    </div>

                    {/* Profile Image */}
                    {(getProfilePath(selectedAms) || selectedAms.profileImagePath) && (
                      <div className="ams-doc-card">
                        <div className="ams-doc-card-info">
                          <Camera size={18} className="ams-doc-icon" />
                          <div>
                            <strong>Profile Image</strong>
                            <small>Photograph uploaded</small>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="details-button"
                          onClick={() =>
                            handlePreviewDocument(
                              'Profile Image',
                              getProfilePath(selectedAms) || selectedAms.profileImagePath,
                              'AMS',
                              selectedAms.amsId || selectedAms.id || selectedAms.AmsId,
                              selectedAms.imageVersion || imageVersion
                            )
                          }
                        >
                          <Eye size={14} /> View Image
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="person-dialog-actions">
              <button className="masters-btn-secondary" onClick={() => setSelectedAms(null)}>
                Close
              </button>
              <button
                className="primary-button"
                onClick={() => {
                  const targetId = selectedAms.id || selectedAms.amsId || selectedAms.AmsId;
                  setSelectedAms(null);
                  navigate(`/edit-ams/${targetId}`);
                }}
              >
                <Pencil size={16} /> Edit AMS
              </button>
            </div>
          </section>
        </div>
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
      )}
    </div>
  );
}

export default PeopleDirectoryPage;
