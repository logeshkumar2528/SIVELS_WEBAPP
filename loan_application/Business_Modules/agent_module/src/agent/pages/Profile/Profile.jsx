import { useState, useEffect, useMemo } from 'react';
import {
  Phone,
  Mail,
  Calendar,
  Shield,
  User,
  CheckCircle2,
  Building2,
  MapPin,
  X,
  ChevronRight,
  BadgeIndianRupee
} from 'lucide-react'
import { useAgentIdentity } from '../../hooks/useAgentIdentity'
import { useAuth } from '../../../../../../Core/src/context/AuthContext'
import { isCustomerOwnedByAgent } from '../../utils/agentOwnershipHelper'
import { getProfileImageUrl, getInitials } from '../../utils/profileImageHelper'
import { agentCustomerService } from '../../../../../../Core/src/services/agentCustomerService'
import { formatDate } from '../../../../../../Core/src/utils/dateHelper'
import './Profile.css'
import AuthImage from '../../../../../../Core/src/auth/AuthImage';
import './Profile.css';

function isAgentRole(role) {
  if (!role) return false;
  const s = String(role).trim().toLowerCase();
  return s === 'agent' || s === 'field agent' || s === 'dsa' || s === 'direct selling agent';
}

function isPresent(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function isDisplayName(value) {
  const text = String(value ?? '').trim();
  return Boolean(text) && text !== '—' && text !== '0' && !/^\d+$/.test(text) && !/\bid\b/i.test(text);
}

function resolveLocationValue(record, config, locations) {
  const source = record || {};
  const nameValue = config.nameKeys
    .map((key) => source[key])
    .find((value) => isDisplayName(value));
  if (nameValue !== undefined) return String(nameValue).trim();

  const rawId = config.idKeys
    .map((key) => source[key])
    .find((value) => isPresent(value) && String(value).trim() !== '0');
  if (!isPresent(rawId)) return '';

  const list = locations?.[config.collection] || [];
  const match = list.find((item) => {
    const itemId = config.itemIdKeys.map((key) => item?.[key]).find(isPresent);
    return itemId !== undefined && String(itemId).trim() === String(rawId).trim();
  });
  const resolvedName = match && config.itemNameKeys.map((key) => match?.[key]).find(isDisplayName);
  return resolvedName ? String(resolvedName).trim() : '';
}

function resolveLocationField(primary, fallback, config, locations) {
  const hasPrimaryValue = [...config.nameKeys, ...config.idKeys].some((key) => isPresent(primary?.[key]));
  const value = resolveLocationValue(hasPrimaryValue ? primary : fallback, config, locations);
  return value || '—';
}

function resolvePincode(primary, fallback) {
  const keys = ['pincode', 'Pincode', 'pinCode', 'PinCode', 'postalCode', 'PostalCode'];
  const primaryValue = keys.map((key) => primary?.[key]).find(isPresent);
  const value = primaryValue !== undefined
    ? primaryValue
    : keys.map((key) => fallback?.[key]).find(isPresent);
  return isPresent(value) && String(value).trim() !== '0' ? String(value).trim() : '—';
}

function ProfileSkeleton() {
  return (
    <div className="agent-profile-dashboard agent-profile-skeleton" aria-label="Loading profile">
      <div className="agent-profile-skeleton-hero" />
      <div className="agent-profile-skeleton-grid" />
    </div>
  );
}

export default function Profile() {
  const [imageError, setImageError] = useState(false);
  const [imageVersion, setImageVersion] = useState(Date.now());

  const [customersCount, setCustomersCount] = useState('...');

  const { currentUser } = useAuth();
  const { agentData, loadingAgent, agentId, isAgent, isUnauthorized, locations } = useAgentIdentity();

  // Authoritative numeric Agent ID (distinct from alphanumeric Agent Code)
  const resolvedAgentId =
    agentId ||
    agentData?.agentId ||
    agentData?.AgentId ||
    (isAgent ? (currentUser?.agentId || currentUser?.AgentId) : null) ||
    (typeof window !== 'undefined' ? localStorage.getItem('agentId') : null) ||
    null;

  const profileImageUrl = useMemo(
    () => (resolvedAgentId ? getProfileImageUrl('Agent', resolvedAgentId, imageVersion) : null),
    [resolvedAgentId, imageVersion]
  );


  useEffect(() => {
    setImageError(false);
  }, [profileImageUrl]);

  useEffect(() => {
    if (loadingAgent || !resolvedAgentId) return;
    agentCustomerService
      .getAllCustomers()
      .then((data) => {
        const allCustomers = Array.isArray(data)
          ? data
          : data?.data || data?.items || data?.result || data?.list || [];
        const myCustomers = allCustomers.filter((c) => isCustomerOwnedByAgent(c, resolvedAgentId));
        setCustomersCount(myCustomers.length.toString());
      })
      .catch((err) => {
        console.error('Failed to load customers count', err);
        setCustomersCount('0');
      });
  }, [resolvedAgentId, loadingAgent]);

  if (loadingAgent) {
    return <ProfileSkeleton />;
  }

  // Guard: Unauthorized session or non-agent session attempting to access Agent Profile
  if (!resolvedAgentId) {
    const isOtherRole = currentUser?.role && !isAgentRole(currentUser.role);
    return (
      <div className="agent-profile-dashboard" style={{ padding: '40px 20px', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '480px', width: '100%', background: '#ffffff', border: '1px solid #D5E3D8', borderRadius: '16px', padding: '32px 24px', textAlign: 'center', boxShadow: '0 4px 16px rgba(23, 74, 47, 0.06)' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Shield size={28} />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#173B28', margin: '0 0 8px 0' }}>
            {isOtherRole ? 'Unauthorized Access' : 'Agent Identity Not Found'}
          </h2>
          <p style={{ fontSize: '13px', color: '#527964', lineHeight: 1.5, margin: '0 0 20px 0' }}>
            {isOtherRole
              ? `You are currently logged in with a non-Agent account (${currentUser.role}). Please log in with an authenticated Agent account to access the Agent Profile.`
              : 'Unable to establish an authenticated Agent identity. Please log in with your registered Agent credentials.'}
          </p>
          <button
            type="button"
            onClick={() => { window.location.href = '/login'; }}
            style={{ padding: '9px 22px', borderRadius: '8px', background: '#174A2F', color: '#ffffff', border: 'none', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Authoritative Agent Name
  const agentName =
    agentData?.fullName ||
    agentData?.FullName ||
    agentData?.name ||
    (isAgent ? (currentUser?.fullName || currentUser?.FullName || currentUser?.name) : null) ||
    'Agent';

  // Authoritative Agent Role: Strictly enforce an Agent role, never display CreditManager
  const rawRole =
    agentData?.role ||
    agentData?.Role ||
    (isAgentRole(currentUser?.role) ? currentUser?.role : null);

  const agentRole = isAgentRole(rawRole)
    ? (String(rawRole).trim().toLowerCase() === 'agent' ? 'Field Agent' : rawRole)
    : 'Field Agent';

  // Authoritative Human-Readable Agent Code (e.g. AG00001)
  const agentCode =
    agentData?.agentCode ||
    agentData?.AgentCode ||
    agentData?.code ||
    (isAgent ? (currentUser?.agentCode || currentUser?.AgentCode || currentUser?.code) : null) ||
    '—';

  // Assigned Branch
  const agentBranch =
    agentData?.branch ||
    agentData?.Branch ||
    agentData?.branchName ||
    agentData?.BranchName ||
    (isAgent ? (currentUser?.branch || currentUser?.Branch || currentUser?.branchName || currentUser?.BranchName) : null) ||
    '—';

  // Contact Details
  const agentMobile =
    agentData?.mobileNumber ||
    agentData?.MobileNumber ||
    agentData?.mobile ||
    agentData?.Mobile ||
    agentData?.phone ||
    (isAgent ? (currentUser?.mobileNumber || currentUser?.MobileNumber || currentUser?.mobile || currentUser?.phone) : null) ||
    '—';

  const agentEmail =
    agentData?.emailAddress ||
    agentData?.EmailAddress ||
    agentData?.email ||
    agentData?.Email ||
    (isAgent ? (currentUser?.emailAddress || currentUser?.EmailAddress || currentUser?.email) : null) ||
    '—';

  // Dates
  const rawDateJoined =
    agentData?.dateJoined ||
    agentData?.DateJoined ||
    agentData?.joinedDate ||
    agentData?.JoinedDate ||
    agentData?.createdAt ||
    agentData?.CreatedAt ||
    (isAgent ? (currentUser?.dateJoined || currentUser?.DateJoined || currentUser?.joinedDate || currentUser?.createdAt) : null);

  const rawDob =
    agentData?.dateOfBirth ||
    agentData?.DateOfBirth ||
    agentData?.dob ||
    agentData?.DOB ||
    (isAgent ? (currentUser?.dateOfBirth || currentUser?.DateOfBirth || currentUser?.dob) : null);

  const agentDateJoined = formatDate(rawDateJoined, '—');
  const agentDob = formatDate(rawDob, '—');

  // Gender
  const genderId =
    agentData?.genderId ??
    agentData?.GenderId ??
    (isAgent ? (currentUser?.genderId ?? currentUser?.GenderId) : null);

  const genderName =
    agentData?.genderName ||
    agentData?.GenderName ||
    (isAgent ? (currentUser?.genderName || currentUser?.GenderName) : null);

  const agentGender =
    genderName ||
    (genderId === 6 || genderId === 1 ? 'Male' : genderId === 7 || genderId === 2 ? 'Female' : '—');

  // Residential Address & Location
  const agentAddress =
    agentData?.address ||
    agentData?.Address ||
    (isAgent ? (currentUser?.address || currentUser?.Address) : null) ||
    '—';

  const locationConfigs = {
    country: {
      nameKeys: ['countryName', 'CountryName', 'country', 'Country'],
      idKeys: ['countryId', 'CountryId', 'country', 'Country'],
      collection: 'countries',
      itemIdKeys: ['countryId', 'CountryId', 'id', 'Id'],
      itemNameKeys: ['countryName', 'CountryName', 'name', 'Name'],
    },
    state: {
      nameKeys: ['stateName', 'StateName', 'state', 'State'],
      idKeys: ['stateId', 'StateId', 'state', 'State'],
      collection: 'states',
      itemIdKeys: ['stateId', 'StateId', 'id', 'Id'],
      itemNameKeys: ['stateName', 'StateName', 'name', 'Name'],
    },
    district: {
      nameKeys: ['districtName', 'DistrictName', 'district', 'District'],
      idKeys: ['districtId', 'DistrictId', 'district', 'District'],
      collection: 'districts',
      itemIdKeys: ['districtId', 'DistrictId', 'id', 'Id'],
      itemNameKeys: ['districtName', 'DistrictName', 'name', 'Name'],
    },
    city: {
      nameKeys: ['cityName', 'CityName', 'city', 'City'],
      idKeys: ['cityId', 'CityId', 'city', 'City'],
      collection: 'cities',
      itemIdKeys: ['cityId', 'CityId', 'id', 'Id'],
      itemNameKeys: ['cityName', 'CityName', 'name', 'Name'],
    },
  };

  const countryName = resolveLocationField(agentData, isAgent ? currentUser : null, locationConfigs.country, locations);
  const stateName = resolveLocationField(agentData, isAgent ? currentUser : null, locationConfigs.state, locations);
  const districtName = resolveLocationField(agentData, isAgent ? currentUser : null, locationConfigs.district, locations);
  const cityName = resolveLocationField(agentData, isAgent ? currentUser : null, locationConfigs.city, locations);
  const pincode = resolvePincode(agentData, isAgent ? currentUser : null);

  const department =
    agentData?.department ||
    agentData?.Department ||
    'Field Sales & Sourcing';

  const isActive =
    agentData?.isActive ??
    agentData?.IsActive ??
    (agentData?.status ? String(agentData.status).toLowerCase() === 'active' : true);

  const statusClass = isActive ? 'is-active' : 'is-inactive';
  const statusLabel = isActive ? 'Active' : 'Inactive';
  const showImage = Boolean(profileImageUrl && !imageError);

  return (
    <div className="agent-profile-dashboard">
      <div className="agent-profile-grid-layout">
        {/* LEFT — Dark-green employee identity panel */}
        <aside className="agent-identity-panel">
          <div className="agent-identity-avatar-wrap" style={{ position: 'relative' }}>
            {!imageError && profileImageUrl ? (
              <AuthImage 
                src={profileImageUrl} 
                alt={agentName} 
                className="agent-identity-avatar-img"
                onError={() => setImageError(true)}
              />
            ) : (
              <span className="agent-identity-initials">
                {getInitials(agentName, 'AG')}
              </span>
            )}

          </div>

          <h2 className="agent-identity-name">{agentName}</h2>

          <div className="agent-identity-code-badge">
            <BadgeIndianRupee size={13} />
            <span>{agentCode}</span>
          </div>

          <p className="agent-identity-role">{agentRole}</p>

          <div className={`agent-identity-status-pill ${statusClass}`}>
            <span className="agent-identity-status-dot" />
            <span>{statusLabel}</span>
          </div>

          <div className="agent-identity-divider" />

          <div className="agent-identity-meta-list">
            <div className="agent-identity-meta-item">
              <Building2 size={14} className="agent-identity-meta-icon" />
              <div className="agent-identity-meta-content">
                <span className="agent-identity-meta-label">Branch</span>
                <span className="agent-identity-meta-value">{agentBranch}</span>
              </div>
            </div>

            <div className="agent-identity-meta-item">
              <Shield size={14} className="agent-identity-meta-icon" />
              <div className="agent-identity-meta-content">
                <span className="agent-identity-meta-label">Department</span>
                <span className="agent-identity-meta-value">{department}</span>
              </div>
            </div>

            <div className="agent-identity-meta-item">
              <Calendar size={14} className="agent-identity-meta-icon" />
              <div className="agent-identity-meta-content">
                <span className="agent-identity-meta-label">Member Since</span>
                <span className="agent-identity-meta-value">{agentDateJoined}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* RIGHT — One unified sage-green information panel */}
        <main className="agent-sage-panel">
          {/* Section 1: Personal Information */}
          <section className="agent-sage-section">
            <div className="agent-sage-section-header">
              <User size={14} className="agent-sage-section-icon" />
              <h3>Personal Information</h3>
            </div>
            <div className="agent-sage-row agent-sage-row-alt-1">
              <div className="agent-sage-field-item">
                <span className="agent-sage-label">Full Name</span>
                <span className="agent-sage-value">{agentName}</span>
              </div>
              <div className="agent-sage-field-item">
                <span className="agent-sage-label">Date of Birth</span>
                <span className="agent-sage-value">{agentDob}</span>
              </div>
            </div>
            <div className="agent-sage-row agent-sage-row-alt-2">
              <div className="agent-sage-field-item">
                <span className="agent-sage-label">Gender</span>
                <span className="agent-sage-value">{agentGender}</span>
              </div>
              <div className="agent-sage-field-item">
                <span className="agent-sage-label">Joining Date</span>
                <span className="agent-sage-value">{agentDateJoined}</span>
              </div>
            </div>
          </section>

          {/* Section 2: Contact & Location */}
          <section className="agent-sage-section">
            <div className="agent-sage-section-header">
              <MapPin size={14} className="agent-sage-section-icon" />
              <h3>Contact &amp; Location</h3>
            </div>
            <div className="agent-sage-row agent-sage-row-alt-1">
              <div className="agent-sage-field-item">
                <span className="agent-sage-label">Mobile Number</span>
                <span className="agent-sage-value">{agentMobile}</span>
              </div>
              <div className="agent-sage-field-item">
                <span className="agent-sage-label">Email Address</span>
                <span className="agent-sage-value">{agentEmail}</span>
              </div>
            </div>
            <div className="agent-sage-row agent-sage-row-alt-2">
              <div className="agent-sage-field-item">
                <span className="agent-sage-label">Residential Address</span>
                <span className="agent-sage-value">{agentAddress}</span>
              </div>
            </div>
            <div className="agent-sage-row agent-sage-row-alt-1">
              <div className="agent-sage-field-item">
                <span className="agent-sage-label">Country</span>
                <span className="agent-sage-value">{countryName}</span>
              </div>
              <div className="agent-sage-field-item">
                <span className="agent-sage-label">State</span>
                <span className="agent-sage-value">{stateName}</span>
              </div>
            </div>
            <div className="agent-sage-row agent-sage-row-alt-2">
              <div className="agent-sage-field-item">
                <span className="agent-sage-label">District</span>
                <span className="agent-sage-value">{districtName}</span>
              </div>
              <div className="agent-sage-field-item">
                <span className="agent-sage-label">City</span>
                <span className="agent-sage-value">{cityName}</span>
              </div>
            </div>
            <div className="agent-sage-row agent-sage-row-alt-1">
              <div className="agent-sage-field-item">
                <span className="agent-sage-label">Pincode</span>
                <span className="agent-sage-value">{pincode}</span>
              </div>
            </div>
          </section>

          {/* Section 3: Work Information */}
          <section className="agent-sage-section">
            <div className="agent-sage-section-header">
              <Shield size={14} className="agent-sage-section-icon" />
              <h3>Work Information</h3>
            </div>
            <div className="agent-sage-row agent-sage-row-alt-1">
              <div className="agent-sage-field-item">
                <span className="agent-sage-label">Agent Code</span>
                <span className="agent-sage-value">{agentCode}</span>
              </div>
              <div className="agent-sage-field-item">
                <span className="agent-sage-label">Role / Designation</span>
                <span className="agent-sage-value">{agentRole}</span>
              </div>
            </div>
            <div className="agent-sage-row agent-sage-row-alt-2">
              <div className="agent-sage-field-item">
                <span className="agent-sage-label">Assigned Branch</span>
                <span className="agent-sage-value">{agentBranch}</span>
              </div>
              <div className="agent-sage-field-item">
                <span className="agent-sage-label">Department</span>
                <span className="agent-sage-value">{department}</span>
              </div>
            </div>
            <div className="agent-sage-row agent-sage-row-alt-1">
              <div className="agent-sage-field-item agent-sage-col-full">
                <span className="agent-sage-label">Access Scope &amp; Responsibilities</span>
                <div className="agent-sage-permissions-wrap">
                  <span className="agent-sage-perm-tag">
                    <CheckCircle2 size={12} /> Direct loan application sourcing &amp; onboarding
                  </span>
                  <span className="agent-sage-perm-tag">
                    <CheckCircle2 size={12} /> Customer document verification &amp; submission
                  </span>
                  <span className="agent-sage-perm-tag">
                    <CheckCircle2 size={12} /> Sourced Customers ({customersCount})
                  </span>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
