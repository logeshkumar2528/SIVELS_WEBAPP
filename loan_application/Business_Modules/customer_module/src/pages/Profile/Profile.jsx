import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CircleUserRound,
  CreditCard,
  FileText,
  Landmark,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import { useCustomerProfile } from '../../hooks/useCustomerProfile';
import { resolveApplicationStatus } from '../../config/statusConfig';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import approvalDocumentService from '../../../../../Core/src/features/approval-documents/services/approvalDocumentService';
import { resolveApiUrl } from '../../../../../Core/src/api/apiConfig';
import { useAuthedObjectUrl } from '../../../../../Core/src/auth/useAuthedObjectUrl';
import {
  formatDisplayDate,
  formatIndianCurrency,
  formatMobileNumber,
  maskAccountNumber,
} from '../../services/customerProfileService';
import './Profile.css';

/**
 * Formats authoritative sanctioned loan amount without defaulting to requested amounts.
 * Preserves genuine zero values.
 */
function formatSanctionedAmount(amount) {
  if (amount === 0 || amount === '0') {
    return '₹0';
  }
  if (amount != null && amount !== '') {
    const num = Number(amount);
    if (!Number.isNaN(num) && Number.isFinite(num)) {
      return `₹${num.toLocaleString('en-IN')}`;
    }
  }
  return 'Pending Credit Sanction';
}

/**
 * Resolves authoritative application number.
 * Displays only confirmed API identifier without synthetic fallback or blind prefixing.
 */
function formatApplicationNumber(rawAppId) {
  if (!rawAppId) return 'Pending Generation';
  const str = String(rawAppId).trim();
  if (!str || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') {
    return 'Pending Generation';
  }
  return str;
}

/**
 * Derives dynamic 2-letter uppercase initials from customer name.
 */
function getInitials(name) {
  if (!name || typeof name !== 'string') return 'CU';
  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  const upper = trimmed.toUpperCase();
  const consonants = upper.slice(1).replace(/[AEIOU\s]/gi, '');
  if (consonants.length > 0) {
    return upper[0] + consonants[0];
  }
  return upper.slice(0, 2);
}

const TABS = [
  { id: 'all', label: 'All Details', icon: FileText },
  { id: 'personal', label: 'Personal', icon: CircleUserRound },
  { id: 'financial', label: 'Financial', icon: Landmark },
  { id: 'loans', label: 'Loan Accounts', icon: CreditCard },
];

export default function Profile() {
  const { profile, fallbackIdentity, loading, error, refetch } = useCustomerProfile();
  const [activeTab, setActiveTab] = useState('all');
  const [avatarImgError, setAvatarImgError] = useState(false);

  // Authoritative loan identifier from Core service as secondary confirmation
  const [loanIdentifier, setLoanIdentifier] = useState(null);
  const [loadingIdentifier, setLoadingIdentifier] = useState(true);

  useEffect(() => {
    let isMounted = true;
    approvalDocumentService
      .getMyLoanIdentifier()
      .then((data) => {
        if (isMounted) {
          setLoanIdentifier(data);
          setLoadingIdentifier(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('[Profile] Failed to load customer loan identifier:', err?.message || err);
          setLoanIdentifier(null);
          setLoadingIdentifier(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Profile photograph resolution with authenticated blob fetch
  const profileImagePath = profile?.kyc?.profileImagePath;
  const imageApiUrl = profileImagePath ? resolveApiUrl(profileImagePath) : null;
  const authedImageUrl = useAuthedObjectUrl(imageApiUrl);

  // Customer identity resolution
  const rawFullName = (profile?.fullName || fallbackIdentity?.fullName || '').trim();
  const fullName = rawFullName || (loading ? 'Loading…' : 'Not provided');
  const initials = getInitials(rawFullName || 'Customer');

  const nameParts = rawFullName ? rawFullName.split(/\s+/) : [];
  const firstName = nameParts.length > 0 ? nameParts[0] : (loading ? 'Loading…' : 'Not provided');
  const lastName =
    nameParts.length > 1
      ? nameParts.slice(1).join(' ')
      : (rawFullName ? '—' : (loading ? 'Loading…' : 'Not provided'));

  const customerCode =
    profile?.customerCode || fallbackIdentity?.customerCode || (loading ? 'Loading…' : 'Not provided');

  const memberSince = profile?.createdAt
    ? formatDisplayDate(profile.createdAt)
    : (fallbackIdentity?.createdAt ? formatDisplayDate(fallbackIdentity.createdAt) : (loading ? 'Loading…' : 'Not provided'));

  const dateOfBirth = profile?.dateOfBirth ? formatDisplayDate(profile.dateOfBirth) : 'Not provided';
  const gender = profile?.gender || 'Not provided';
  const maritalStatus = profile?.maritalStatus || 'Not provided';
  const nationality = profile?.nationality || fallbackIdentity?.nationality || 'Not provided';

  // Communication & Addresses
  const rawMobile = profile?.mobileNumber || fallbackIdentity?.mobileNumber || '';
  const mobileNumber = rawMobile ? formatMobileNumber(rawMobile) : (loading ? 'Loading…' : 'Not provided');
  const email = profile?.email || fallbackIdentity?.email || (loading ? 'Loading…' : 'Not provided');

  const isMobileVerified = Boolean(rawMobile);
  const isEmailVerified = Boolean(profile?.email || fallbackIdentity?.emailVerified);

  // Primary and permanent address resolution
  const primaryAddr = profile?.addresses?.[0];
  const permanentAddr = profile?.addresses?.[1];
  const currentAddress = primaryAddr?.fullAddress || fallbackIdentity?.currentAddress || 'Not provided';

  let permanentAddress = 'Not provided';
  if (primaryAddr?.mailingAsCurrent) {
    permanentAddress = 'Same as Current Address';
  } else if (permanentAddr?.fullAddress) {
    permanentAddress = permanentAddr.fullAddress;
  } else if (fallbackIdentity?.permanentAddress) {
    permanentAddress = fallbackIdentity.permanentAddress;
  }

  const city = primaryAddr?.city || fallbackIdentity?.city || 'Not provided';
  const district = primaryAddr?.district || fallbackIdentity?.district || 'Not provided';
  const state = primaryAddr?.state || fallbackIdentity?.state || 'Not provided';
  const pincode = primaryAddr?.pincode || fallbackIdentity?.pincode || 'Not provided';

  // Employment classification
  const emp = profile?.employment;
  const isBusinessEmployment = Boolean(
    (emp?.employmentTypeName && /business|self[- ]?employed/i.test(emp.employmentTypeName)) ||
    (emp?.businessDetails?.businessNature || emp?.businessDetails?.gstNumber) ||
    (fallbackIdentity?.employmentTypeName && /business|self[- ]?employed/i.test(fallbackIdentity.employmentTypeName))
  );

  const employmentType =
    emp?.employmentTypeName ||
    fallbackIdentity?.employmentTypeName ||
    (loading ? 'Loading…' : 'Not provided');

  // Bank details
  const primaryBank = profile?.bankAccounts?.[0];
  const bankName = primaryBank?.bankName || fallbackIdentity?.bankName || 'Not provided';
  const accountHolderName = primaryBank?.accountHolderName || rawFullName || fallbackIdentity?.accountHolderName || 'Not provided';
  const maskedAccount = primaryBank?.maskedAccountNumber
    ? primaryBank.maskedAccountNumber
    : maskAccountNumber(fallbackIdentity?.accountNumber);
  const ifscCode = primaryBank?.ifsc || fallbackIdentity?.ifscCode || 'Not provided';
  const branchName = primaryBank?.branchName || fallbackIdentity?.branchName || 'Not provided';

  // Authoritative KYC status values
  const aadhaarStatus =
    profile?.kyc?.aadhaarStatus ||
    fallbackIdentity?.aadhaarStatus ||
    (fallbackIdentity?.kycStatus ? String(fallbackIdentity.kycStatus) : null);
  const panStatus =
    profile?.kyc?.panStatus ||
    fallbackIdentity?.panStatus ||
    (fallbackIdentity?.kycStatus ? String(fallbackIdentity.kycStatus) : null);
  const aadhaarDisplay = aadhaarStatus || 'Not available';
  const panDisplay = panStatus || 'Not available';
  const emailDisplay = isEmailVerified ? 'Verified' : 'Not available';

  // Applications
  const applications = profile?.applications && profile.applications.length > 0 ? profile.applications : [];
  const hasFallbackApplication = Boolean(
    fallbackIdentity?.appId ||
    fallbackIdentity?.expectedLoanAmount != null ||
    fallbackIdentity?.loanPurposeName ||
    fallbackIdentity?.customerCode
  );
  const hasRegisteredApplication = applications.length > 0 || hasFallbackApplication;

  const totalApplicationCount = profile?.applicationCount ?? (applications.length > 0 ? applications.length : (hasFallbackApplication ? 1 : 0));

  // Status resolution for primary badge
  const primaryStatus = applications[0]?.status ?? profile?.status ?? fallbackIdentity?.status;
  const statusMeta = resolveApplicationStatus(primaryStatus);

  // References from primary application
  const appReferences = applications[0]?.references || [];
  const ref1 = appReferences[0];
  const ref2 = appReferences[1];

  // Error boundary state
  if (error && !profile && !fallbackIdentity) {
    return (
      <div className="profile-page">
        <header className="profile-heading">
          <div>
            <h1>Customer Profile</h1>
            <p>Manage your personal and financial information</p>
          </div>
        </header>
        <div className="profile-error-card" role="alert">
          <AlertCircle size={36} className="error-icon" />
          <div className="profile-error-content">
            <h3>Unable to load profile</h3>
            <p>We could not retrieve your authenticated profile details. Please try again.</p>
            <button type="button" className="profile-retry-btn" onClick={() => refetch()}>
              <RefreshCw size={16} /> Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* PAGE HEADING */}
      <header className="profile-heading">
        <div>
          <h1>Customer Profile</h1>
          <p>Manage your personal and financial information</p>
        </div>
      </header>

      {/* 1. PREMIUM CUSTOMER IDENTITY HEADER */}
      <section className="profile-identity-header">
        <div className="profile-header-main">
          <div className="profile-avatar-circle" aria-label={`Customer Avatar: ${initials}`}>
            {authedImageUrl && !avatarImgError ? (
              <img
                src={authedImageUrl}
                alt={fullName}
                className="profile-avatar-img"
                onError={() => setAvatarImgError(true)}
              />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <div className="profile-header-identity">
            <div className="profile-name-row">
              <h2>{fullName}</h2>
              <StatusBadge status={statusMeta.key} label={statusMeta.label} />
            </div>
            <div className="profile-badge-row">
              <span className="profile-id-pill">
                Customer ID: <strong>{customerCode}</strong>
              </span>
              <span className="profile-member-pill">
                <CalendarDays size={14} /> Member since: <strong>{memberSince}</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="profile-header-meta">
          <div className="profile-stat-item">
            <span className="stat-label">Total Loan Applications</span>
            <span className="stat-value-text">{loading ? '—' : totalApplicationCount}</span>
            <span className="stat-subtext">
              {totalApplicationCount === 1 ? '1 Active Facility' : `${totalApplicationCount} Active Facilities`}
            </span>
          </div>
          <div className="profile-stat-divider" />
          <div className="profile-stat-item">
            <span className="stat-label">Account Identity</span>
            <span className="stat-value-badge">Authenticated</span>
            <span className="stat-subtext">Verified Session</span>
          </div>
        </div>
      </section>

      {/* 2. PROFILE NAVIGATION TABS */}
      <nav className="profile-nav-tabs" role="tablist" aria-label="Profile Sections Navigation">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`profile-tab-${tab.id}`}
              aria-controls={`profile-panel-${tab.id}`}
              aria-selected={isActive}
              tabIndex={0}
              className={`profile-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 3. PROFILE CONTENT GRID */}
      <div className="profile-tab-content">
        <div className="profile-cards-grid">
          {/* PERSONAL INFORMATION CARD (All, Personal) */}
          {(activeTab === 'all' || activeTab === 'personal') && (
            <section className="profile-card">
              <header className="profile-card-header">
                <div className="card-header-icon"><CircleUserRound size={18} /></div>
                <div>
                  <h3>Personal Information</h3>
                  <small>Basic demographic details from your identity record</small>
                </div>
              </header>
              <dl className="profile-data-grid">
                <div>
                  <dt>First Name</dt>
                  <dd className={firstName === 'Not provided' ? 'not-provided' : ''}>{firstName}</dd>
                </div>
                <div>
                  <dt>Last Name</dt>
                  <dd className={lastName === 'Not provided' ? 'not-provided' : ''}>{lastName}</dd>
                </div>
                <div>
                  <dt>Customer ID</dt>
                  <dd className={customerCode === 'Not provided' ? 'not-provided' : ''}>{customerCode}</dd>
                </div>
                <div>
                  <dt>Registration Date</dt>
                  <dd className={memberSince === 'Not provided' ? 'not-provided' : ''}>{memberSince}</dd>
                </div>
                <div>
                  <dt>Date of Birth</dt>
                  <dd className={dateOfBirth === 'Not provided' ? 'not-provided' : ''}>{dateOfBirth}</dd>
                </div>
                <div>
                  <dt>Gender</dt>
                  <dd className={gender === 'Not provided' ? 'not-provided' : ''}>{gender}</dd>
                </div>
                <div>
                  <dt>Marital Status</dt>
                  <dd className={maritalStatus === 'Not provided' ? 'not-provided' : ''}>{maritalStatus}</dd>
                </div>
                <div>
                  <dt>Nationality</dt>
                  <dd className={nationality === 'Not provided' ? 'not-provided' : ''}>{nationality}</dd>
                </div>
              </dl>
            </section>
          )}

          {/* CONTACT & ADDRESS CARD (All, Personal) */}
          {(activeTab === 'all' || activeTab === 'personal') && (
            <section className="profile-card">
              <header className="profile-card-header">
                <div className="card-header-icon"><Phone size={18} /></div>
                <div>
                  <h3>Contact & Address</h3>
                  <small>Verified communication channels and residential records</small>
                </div>
              </header>
              <dl className="profile-data-grid">
                <div className="grid-col-full">
                  <dt>Registered Mobile</dt>
                  <dd className={mobileNumber === 'Not provided' ? 'not-provided' : ''}>
                    {mobileNumber}
                    {isMobileVerified && <span className="verified-pill">Verified</span>}
                  </dd>
                </div>
                <div className="grid-col-full">
                  <dt>Email Address</dt>
                  <dd className={email === 'Not provided' ? 'not-provided' : ''}>
                    {email}
                    {isEmailVerified && <span className="verified-pill">Verified</span>}
                  </dd>
                </div>
                <div className="grid-col-full">
                  <dt>Current Residential Address</dt>
                  <dd className={currentAddress === 'Not provided' ? 'not-provided' : ''}>{currentAddress}</dd>
                </div>
                <div className="grid-col-full">
                  <dt>Permanent Address</dt>
                  <dd className={permanentAddress === 'Not provided' ? 'not-provided' : ''}>{permanentAddress}</dd>
                </div>
                <div>
                  <dt>City / District</dt>
                  <dd className={city === 'Not provided' && district === 'Not provided' ? 'not-provided' : ''}>
                    {city !== 'Not provided' || district !== 'Not provided' ? `${city}, ${district}` : 'Not provided'}
                  </dd>
                </div>
                <div>
                  <dt>State & Pincode</dt>
                  <dd className={state === 'Not provided' && pincode === 'Not provided' ? 'not-provided' : ''}>
                    {state !== 'Not provided' || pincode !== 'Not provided' ? `${state} - ${pincode}` : 'Not provided'}
                  </dd>
                </div>
              </dl>
            </section>
          )}

          {/* EMPLOYMENT & BUSINESS CARD (All, Financial) */}
          {(activeTab === 'all' || activeTab === 'financial') && (
            <section className="profile-card">
              <header className="profile-card-header">
                <div className="card-header-icon"><BriefcaseBusiness size={18} /></div>
                <div>
                  <h3>Employment & Business</h3>
                  <small>
                    {isBusinessEmployment
                      ? 'Enterprise and operational business registration details'
                      : 'Corporate employer and compensation profile'}
                  </small>
                </div>
              </header>
              {isBusinessEmployment ? (
                <dl className="profile-data-grid">
                  <div>
                    <dt>Employment Classification</dt>
                    <dd>{employmentType}</dd>
                  </div>
                  <div>
                    <dt>Business Nature</dt>
                    <dd className={emp?.businessDetails?.businessNature ? '' : 'not-provided'}>
                      {emp?.businessDetails?.businessNature || 'Not provided'}
                    </dd>
                  </div>
                  <div>
                    <dt>GST Number</dt>
                    <dd className={emp?.businessDetails?.gstNumber ? '' : 'not-provided'}>
                      {emp?.businessDetails?.gstNumber || 'Not provided'}
                    </dd>
                  </div>
                  <div>
                    <dt>Annual Turnover</dt>
                    <dd className={emp?.businessDetails?.annualTurnover ? '' : 'not-provided'}>
                      {emp?.businessDetails?.annualTurnover
                        ? formatIndianCurrency(emp.businessDetails.annualTurnover)
                        : 'Not provided'}
                    </dd>
                  </div>
                </dl>
              ) : (
                <dl className="profile-data-grid">
                  <div>
                    <dt>Employment Type</dt>
                    <dd className={employmentType === 'Not provided' ? 'not-provided' : ''}>{employmentType}</dd>
                  </div>
                  <div>
                    <dt>Employer Name</dt>
                    <dd className={emp?.employerName ? '' : 'not-provided'}>
                      {emp?.employerName || 'Not provided'}
                    </dd>
                  </div>
                  <div>
                    <dt>Designation</dt>
                    <dd className={emp?.designation ? '' : 'not-provided'}>
                      {emp?.designation || 'Not provided'}
                    </dd>
                  </div>
                  <div>
                    <dt>Gross Monthly Income</dt>
                    <dd className={emp?.grossMonthlyIncome != null ? '' : 'not-provided'}>
                      {formatIndianCurrency(emp?.grossMonthlyIncome)}
                    </dd>
                  </div>
                  <div>
                    <dt>Net Monthly Income</dt>
                    <dd className={emp?.netMonthlyIncome != null ? '' : 'not-provided'}>
                      {formatIndianCurrency(emp?.netMonthlyIncome)}
                    </dd>
                  </div>
                </dl>
              )}
            </section>
          )}

          {/* BANK INFORMATION CARD (All, Financial) */}
          {(activeTab === 'all' || activeTab === 'financial') && (
            <section className="profile-card">
              <header className="profile-card-header">
                <div className="card-header-icon"><Landmark size={18} /></div>
                <div>
                  <h3>Bank Information</h3>
                  <small>Disbursement and repayment banking mandate details</small>
                </div>
              </header>
              <dl className="profile-data-grid">
                <div>
                  <dt>Bank Name</dt>
                  <dd className={bankName === 'Not provided' ? 'not-provided' : ''}>{bankName}</dd>
                </div>
                <div>
                  <dt>Account Holder</dt>
                  <dd className={accountHolderName === 'Not provided' ? 'not-provided' : ''}>{accountHolderName}</dd>
                </div>
                <div>
                  <dt>Masked Account Number</dt>
                  <dd className={maskedAccount === 'Not provided' ? 'not-provided' : ''}>{maskedAccount}</dd>
                </div>
                <div>
                  <dt>IFSC Code</dt>
                  <dd className={ifscCode === 'Not provided' ? 'not-provided' : ''}>{ifscCode}</dd>
                </div>
                <div className="grid-col-full">
                  <dt>Branch Name</dt>
                  <dd className={branchName === 'Not provided' ? 'not-provided' : ''}>{branchName}</dd>
                </div>
              </dl>
            </section>
          )}

          {/* KYC VERIFICATION CARD (All, Financial) */}
          {(activeTab === 'all' || activeTab === 'financial') && (
            <section className="profile-card">
              <header className="profile-card-header">
                <div className="card-header-icon"><ShieldCheck size={18} /></div>
                <div>
                  <h3>KYC Verification Status</h3>
                  <small>Statutory compliance and identity verification records</small>
                </div>
              </header>
              <div className="profile-kyc-list">
                <div className="kyc-row-item">
                  <div className="kyc-item-icon"><Building2 size={18} /></div>
                  <div className="kyc-item-details">
                    <div className="kyc-item-title-row">
                      <strong>Aadhaar Verification</strong>
                      <span className={`kyc-tag ${aadhaarStatus && String(aadhaarStatus).toLowerCase().includes('verif') ? 'verified' : ''}`}>
                        {aadhaarDisplay}
                      </span>
                    </div>
                    <p>Identity document verification record.</p>
                  </div>
                </div>

                <div className="kyc-row-item">
                  <div className="kyc-item-icon"><Mail size={18} /></div>
                  <div className="kyc-item-details">
                    <div className="kyc-item-title-row">
                      <strong>PAN Verification</strong>
                      <span className={`kyc-tag ${panStatus && String(panStatus).toLowerCase().includes('verif') ? 'verified' : ''}`}>
                        {panDisplay}
                      </span>
                    </div>
                    <p>Tax identifier verification record.</p>
                  </div>
                </div>

                <div className="kyc-row-item">
                  <div className="kyc-item-icon"><Phone size={18} /></div>
                  <div className="kyc-item-details">
                    <div className="kyc-item-title-row">
                      <strong>Mobile OTP Verification</strong>
                      <span className={`kyc-tag ${isMobileVerified ? 'verified' : ''}`}>
                        {isMobileVerified ? 'Verified' : 'Not available'}
                      </span>
                    </div>
                    <p>Session authenticated via registered mobile number.</p>
                  </div>
                </div>

                <div className="kyc-row-item">
                  <div className="kyc-item-icon"><ShieldCheck size={18} /></div>
                  <div className="kyc-item-details">
                    <div className="kyc-item-title-row">
                      <strong>Email Verification</strong>
                      <span className={`kyc-tag ${isEmailVerified ? 'verified' : ''}`}>
                        {emailDisplay}
                      </span>
                    </div>
                    <p>Electronic mail verification record.</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* REFERENCE INFORMATION CARD (All, Personal) */}
          {(activeTab === 'all' || activeTab === 'personal') && (
            <section className="profile-card">
              <header className="profile-card-header">
                <div className="card-header-icon"><UsersRound size={18} /></div>
                <div>
                  <h3>Reference Information</h3>
                  <small>Personal contacts maintained for loan verification compliance</small>
                </div>
              </header>
              <div className="profile-references-grid">
                <div className="reference-column">
                  <h4>Reference 1</h4>
                  <dl className="profile-data-grid">
                    <div>
                      <dt>Full Name</dt>
                      <dd className={ref1?.fullName ? '' : 'not-provided'}>{ref1?.fullName || 'Not provided'}</dd>
                    </div>
                    <div>
                      <dt>Relationship</dt>
                      <dd className={ref1?.relationshipName && ref1.relationshipName !== 'Not provided' ? '' : 'not-provided'}>
                        {ref1?.relationshipName || 'Not provided'}
                      </dd>
                    </div>
                    <div className="grid-col-full">
                      <dt>Contact Number</dt>
                      <dd className={ref1?.mobileNumber ? '' : 'not-provided'}>
                        {ref1?.mobileNumber ? formatMobileNumber(ref1.mobileNumber) : 'Not provided'}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="reference-column">
                  <h4>Reference 2</h4>
                  <dl className="profile-data-grid">
                    <div>
                      <dt>Full Name</dt>
                      <dd className={ref2?.fullName ? '' : 'not-provided'}>{ref2?.fullName || 'Not provided'}</dd>
                    </div>
                    <div>
                      <dt>Relationship</dt>
                      <dd className={ref2?.relationshipName && ref2.relationshipName !== 'Not provided' ? '' : 'not-provided'}>
                        {ref2?.relationshipName || 'Not provided'}
                      </dd>
                    </div>
                    <div className="grid-col-full">
                      <dt>Contact Number</dt>
                      <dd className={ref2?.mobileNumber ? '' : 'not-provided'}>
                        {ref2?.mobileNumber ? formatMobileNumber(ref2.mobileNumber) : 'Not provided'}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* 4. LOAN ACCOUNTS OVERVIEW (All, Loan Accounts) */}
        {(activeTab === 'all' || activeTab === 'loans') && (
          <section className="profile-card profile-loan-section">
            <header className="profile-card-header">
              <div className="card-header-icon"><CreditCard size={18} /></div>
              <div>
                <h3>Loan Accounts & Applications</h3>
                <small>Summary of authenticated loan requests and active credit facilities</small>
              </div>
            </header>

            {applications.length > 0 ? (
              <div className="profile-loan-accounts-list">
                {applications.map((app, idx) => {
                  const appStatusMeta = resolveApplicationStatus(app.status);
                  const appNumber = formatApplicationNumber(app.applicationNumber || app.appId);
                  const appProduct = app.loanProductName || 'Personal Loan';
                  const appPurpose = app.loanPurposeName ? `Purpose: ${app.loanPurposeName}` : 'Personal Loan Facility';
                  const appRequested = formatIndianCurrency(app.loanAmount);
                  const appSanctioned = formatSanctionedAmount(app.sanctionedAmount ?? (idx === 0 ? loanIdentifier?.sanctionedAmount : null));
                  const appLoanAccount = app.loanAccountNumber || (idx === 0 ? loanIdentifier?.loanAccountNumber : null) || 'Pending Allocation';
                  const appRoi = app.roi != null ? `${app.roi}% p.a.` : 'Available on sanction';
                  const appTenure = app.loanTenure != null ? `${app.loanTenure} Months` : 'Available on sanction';
                  const appEmi = app.emi != null ? formatIndianCurrency(app.emi) : 'Available on sanction';

                  return (
                    <div key={app.applicationProductDetailsId || idx} className="profile-loan-card">
                      <div className="profile-loan-card-top">
                        <div>
                          <span className="loan-app-badge">{appNumber}</span>
                          <h4 className="loan-product-title">{appProduct}</h4>
                          <p className="loan-purpose-text">{appPurpose}</p>
                        </div>
                        <div className="loan-status-wrapper">
                          <StatusBadge status={appStatusMeta.key} label={appStatusMeta.label} />
                        </div>
                      </div>

                      <div className="profile-loan-metrics-grid">
                        <div className="loan-metric-box">
                          <span className="metric-label">Requested Loan Amount</span>
                          <span className="metric-val">{appRequested}</span>
                        </div>

                        <div className="loan-metric-box">
                          <span className="metric-label">Sanctioned Amount</span>
                          <span className="metric-val highlight">{appSanctioned}</span>
                        </div>

                        <div className="loan-metric-box">
                          <span className="metric-label">Loan Account Number</span>
                          <span className="metric-val font-mono">{appLoanAccount}</span>
                        </div>

                        <div className="loan-metric-box">
                          <span className="metric-label">Interest Rate (ROI)</span>
                          <span className={app.roi != null ? 'metric-val' : 'metric-val text-muted'}>{appRoi}</span>
                        </div>

                        <div className="loan-metric-box">
                          <span className="metric-label">Tenure</span>
                          <span className={app.loanTenure != null ? 'metric-val' : 'metric-val text-muted'}>{appTenure}</span>
                        </div>

                        <div className="loan-metric-box">
                          <span className="metric-label">Monthly EMI</span>
                          <span className={app.emi != null ? 'metric-val' : 'metric-val text-muted'}>{appEmi}</span>
                        </div>
                      </div>

                      {/* Workflow History Timeline */}
                      {app.workflow && app.workflow.length > 0 && (
                        <div className="profile-app-workflow-timeline">
                          <h5 className="workflow-timeline-title">Application Timeline</h5>
                          <div className="workflow-steps">
                            {app.workflow.map((step, sIdx) => (
                              <div key={sIdx} className="workflow-step-item">
                                <div className="workflow-step-dot" />
                                <div className="workflow-step-body">
                                  <div className="workflow-step-header">
                                    <span className="workflow-step-status">{step.status}</span>
                                    {step.updatedAt && (
                                      <span className="workflow-step-date">{formatDisplayDate(step.updatedAt)}</span>
                                    )}
                                  </div>
                                  {step.comments && <p className="workflow-step-comments">{step.comments}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="profile-loan-empty-banner">
                  <FileText size={18} />
                  <span>No additional loan accounts found for this profile. Subsequent applications will synchronize here.</span>
                </div>
              </div>
            ) : hasFallbackApplication ? (
              <div className="profile-loan-accounts-list">
                <div className="profile-loan-card">
                  <div className="profile-loan-card-top">
                    <div>
                      <span className="loan-app-badge">{formatApplicationNumber(fallbackIdentity?.appId)}</span>
                      <h4 className="loan-product-title">
                        {fallbackIdentity?.loanPurposeName ? `${fallbackIdentity.loanPurposeName} Loan` : 'Personal Loan'}
                      </h4>
                      <p className="loan-purpose-text">Purpose: {fallbackIdentity?.loanPurposeName || 'Personal Needs'}</p>
                    </div>
                    <div className="loan-status-wrapper">
                      <StatusBadge status={statusMeta.key} label={statusMeta.label} />
                    </div>
                  </div>

                  <div className="profile-loan-metrics-grid">
                    <div className="loan-metric-box">
                      <span className="metric-label">Requested Loan Amount</span>
                      <span className="metric-val">
                        {fallbackIdentity?.expectedLoanAmount != null ? formatIndianCurrency(fallbackIdentity.expectedLoanAmount) : 'Not provided'}
                      </span>
                    </div>

                    <div className="loan-metric-box">
                      <span className="metric-label">Sanctioned Amount</span>
                      <span className="metric-val highlight">{formatSanctionedAmount(loanIdentifier?.sanctionedAmount)}</span>
                    </div>

                    <div className="loan-metric-box">
                      <span className="metric-label">Loan Account Number</span>
                      <span className="metric-val font-mono">
                        {loanIdentifier?.loanAccountNumber || (loadingIdentifier ? 'Checking…' : 'Pending Allocation')}
                      </span>
                    </div>

                    <div className="loan-metric-box">
                      <span className="metric-label">Interest Rate (ROI)</span>
                      <span className="metric-val text-muted">Available on sanction</span>
                    </div>

                    <div className="loan-metric-box">
                      <span className="metric-label">Tenure</span>
                      <span className="metric-val text-muted">Available on sanction</span>
                    </div>

                    <div className="loan-metric-box">
                      <span className="metric-label">Monthly EMI</span>
                      <span className="metric-val text-muted">Available on sanction</span>
                    </div>
                  </div>
                </div>

                <div className="profile-loan-empty-banner">
                  <FileText size={18} />
                  <span>No additional loan accounts found for this profile. Subsequent applications will synchronize here.</span>
                </div>
              </div>
            ) : (
              <div className="profile-loan-empty-state">
                <CreditCard size={32} />
                <h4>No Active Loan Accounts</h4>
                <p>You do not currently have any registered loan applications or active credit lines.</p>
              </div>
            )}
          </section>
        )}
      </div>

      {/* 5. PRIVACY & SECURITY NOTICE FOOTER */}
      <footer className="profile-security-footer">
        <LockKeyhole size={16} />
        <span>
          Your personal and account records are processed securely in accordance with Sivels Finance customer privacy policies.
        </span>
      </footer>
    </div>
  );
}
