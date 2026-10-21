import { useState, useEffect, useMemo, useRef } from 'react';
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
  Camera,
  Loader2,
  BadgeIndianRupee
} from 'lucide-react'
import { useAgentIdentity } from '../../hooks/useAgentIdentity'
import { useAuth } from '../../../../../../Core/src/context/AuthContext'
import { isCustomerOwnedByAgent } from '../../utils/agentOwnershipHelper'
import { getProfileImageUrl, updateProfileImage, getInitials } from '../../utils/profileImageHelper'
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
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const fileInputRef = useRef(null);

  const [customersCount, setCustomersCount] = useState('...');

  const { currentUser } = useAuth();
  const { agentData, loadingAgent, agentId, isAgent, isUnauthorized } = useAgentIdentity();

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

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !resolvedAgentId) return;
    try {
      setIsUploading(true);
      setUploadError('');
      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);
      await updateProfileImage('Agent', resolvedAgentId, file);
      setImageVersion(Date.now());
      setUploadSuccess('Profile image updated successfully');
    } catch (err) {
      console.error('Failed to update profile image', err);
      setUploadError(err?.message || 'Failed to update profile image');
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

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

  const fullLocation = [
    agentData?.cityName || agentData?.city,
    agentData?.districtName || agentData?.district,
    agentData?.state || agentData?.State || (isAgent ? (currentUser?.state || currentUser?.State) : null),
    agentData?.pincode || agentData?.Pincode || (isAgent ? (currentUser?.pincode || currentUser?.Pincode) : null),
  ].filter(Boolean).join(', ') || '—';

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
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={agentName}
                className="agent-identity-avatar-img"
              />
            ) : !imageError && profileImageUrl ? (
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

            <button
              type="button"
              className="profile-avatar-edit-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              title="Change profile photo"
              aria-label="Change profile photo"
            >
              {isUploading ? <Loader2 size={12} className="profile-spin" /> : <Camera size={12} />}
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/jpg,image/png,image/webp"
              style={{ display: 'none' }}
            />
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
              <div className="agent-sage-field-item">
                <span className="agent-sage-label">Location</span>
                <span className="agent-sage-value">{fullLocation}</span>
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
