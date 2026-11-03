import { useEffect, useMemo, useState } from 'react';
import iconMap from '../../config/iconMap';
import { getStoredUser } from '../../../../../../Core/src/auth/session';
import { getInitials } from '../../../../../../Core/src/utils/profileImageHelper';
import { API_BASE_URL } from '../../../../../../Core/src/api/apiConfig';
import AuthImage from '../../../../../../Core/src/auth/AuthImage';
import { apiFetch } from '../../../../../../Core/src/api/apiFetch';
import './Profile.css';
import '../../../../../back_office/src/back-office/pages/Profile/Profile.css';

const display = (value) => (value === null || value === undefined || value === '' ? '—' : value);

function Field({ label, value }) {
  return <div className="bo-sage-field-item"><span className="bo-sage-label">{label}</span><span className="bo-sage-value">{display(value)}</span></div>;
}

export default function Profile() {
  const sessionUser = getStoredUser(['INVESTOR']) || {};
  const [investor, setInvestor] = useState(sessionUser.investor || sessionUser);
  const [profileError, setProfileError] = useState('');
  const [genderName, setGenderName] = useState(null);

  useEffect(() => {
    let active = true;
    apiFetch('/InvestorsMaster/me')
      .then(async (response) => {
        if (!response.ok) throw new Error(`Investor profile request failed (${response.status})`);
        const body = await response.json();
        const data = body?.data ?? body?.result ?? body?.value ?? body;
        if (active && data) setInvestor(data.investor || data);
      })
      .catch((error) => {
        if (active) setProfileError(error.message || 'Unable to load investor profile.');
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const genderId = investor?.genderId ?? investor?.GenderId;
    if (genderId == null || genderId === '') return undefined;
    let active = true;
    apiFetch('/gender')
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        const rows = body?.data ?? body?.result ?? body?.value ?? body;
        const list = Array.isArray(rows) ? rows : [];
        const match = list.find((row) => String(row?.id ?? row?.genderId ?? row?.GenderId) === String(genderId));
        if (active) setGenderName(match?.name ?? match?.genderName ?? match?.GenderName ?? null);
      })
      .catch(() => { if (active) setGenderName(null); });
    return () => { active = false; };
  }, [investor?.genderId, investor?.GenderId]);
  const get = (...keys) => display(keys.map((key) => investor?.[key]).find((value) => value !== null && value !== undefined && value !== ''));
  const name = get('fullName', 'name');
  const roleDesignation = display(investor?.designation || investor?.designationName || investor?.roleName || investor?.role || sessionUser.roleName || sessionUser.role);
  // The Investor image endpoint resolves the image for the authenticated user;
  // do not use the stored relative path directly because it cannot carry the JWT.
  const imageUrl = `${API_BASE_URL}/InvestorsMaster/me/profile-image`;
  const rawStatus = investor?.status ?? investor?.isActive;
  const status = rawStatus === true ? 'Active' : display(rawStatus);
  const initials = useMemo(() => getInitials(name, 'IN'), [name]);
  const UserIcon = iconMap.UserCircle || iconMap.User;
  const MapPinIcon = iconMap.MapPin;
  const ShieldIcon = iconMap.ShieldCheck || iconMap.Shield;
  const BuildingIcon = iconMap.Building2;
  const CalendarIcon = iconMap.Calendar;
  const CheckIcon = iconMap.CheckCircle2 || iconMap.Check;

  return <div className="bo-profile-dashboard"><div className="bo-profile-grid-layout">
    <aside className="bo-identity-panel">
      <div className="bo-identity-avatar-wrap">{imageUrl ? <AuthImage src={imageUrl} alt={name} className="bo-identity-avatar-img" /> : <span className="bo-identity-initials">{initials}</span>}</div>
      <h2 className="bo-identity-name">{name}</h2>
      <div className="bo-identity-code-badge"><ShieldIcon size={13} /><span>{get('investorCode', 'code')}</span></div>
      <p className="bo-identity-role">{roleDesignation}</p>
      <div className={`bo-identity-status-pill ${status === 'Active' ? 'is-active' : 'is-inactive'}`}><span className="bo-identity-status-dot" /><span>{status}</span></div>
      <div className="bo-identity-divider" />
      <div className="bo-identity-meta-list">
        <Meta icon={BuildingIcon} label="Branch" value={get('branch', 'branchName')} />
        <Meta icon={ShieldIcon} label="Department" value={investor?.department || investor?.departmentName || 'NA'} />
        <Meta icon={CalendarIcon} label="Member Since" value={get('createdAt', 'dateJoined', 'dateOfJoining')} />
      </div>
    </aside>
    <main className="bo-sage-panel">
      {profileError && <div className="bo-sage-row bo-sage-row-alt-2"><Field label="Profile status" value={profileError} /></div>}
      <section className="bo-sage-section"><SectionHeader icon={UserIcon} title="Personal Information" /><div className="bo-sage-row bo-sage-row-alt-1"><Field label="Full Name" value={name} /><Field label="Date of Birth" value={get('dateOfBirth', 'dob')} /></div><div className="bo-sage-row bo-sage-row-alt-2"><Field label="Gender" value={genderName || get('gender')} /><Field label="Joining Date" value={get('dateJoined', 'dateOfJoining')} /></div></section>
      <section className="bo-sage-section"><SectionHeader icon={MapPinIcon} title="Contact & Location" /><div className="bo-sage-row bo-sage-row-alt-1"><Field label="Mobile Number" value={get('mobileNumber', 'phone')} /><Field label="Email Address" value={get('emailAddress', 'email')} /></div><div className="bo-sage-row bo-sage-row-alt-2"><Field label="Residential Address" value={get('address')} /><Field label="Location" value={[investor?.location, investor?.cityName, investor?.stateName, investor?.pincode].filter(Boolean).join(', ')} /></div></section>
      <section className="bo-sage-section"><SectionHeader icon={ShieldIcon} title="Work Information" /><div className="bo-sage-row bo-sage-row-alt-1"><Field label="Investor Code" value={get('investorCode', 'code')} /><Field label="Role / Designation" value={roleDesignation} /></div><div className="bo-sage-row bo-sage-row-alt-2"><Field label="Assigned Branch" value={get('branch', 'branchName')} /><Field label="Department" value={investor?.department || investor?.departmentName || 'NA'} /></div><div className="bo-sage-row bo-sage-row-alt-1"><div className="bo-sage-field-item bo-sage-col-full"><span className="bo-sage-label">Access Scope & Permissions</span><div className="bo-sage-permissions-wrap">{sessionUser.permissions?.length ? sessionUser.permissions.map((permission) => <span key={permission} className="bo-sage-perm-tag"><CheckIcon size={12} /> {permission}</span>) : <span className="bo-sage-perm-tag is-role"><ShieldIcon size={12} /> Role-based operational access &amp; verification</span>}</div></div></div></section>
    </main>
  </div></div>;
}

function SectionHeader({ icon: Icon, title }) { return <div className="bo-sage-section-header"><Icon size={14} className="bo-sage-section-icon" /><h3>{title}</h3></div>; }
function Meta({ icon: Icon, label, value }) { return <div className="bo-identity-meta-item"><Icon size={14} className="bo-identity-meta-icon" /><div className="bo-identity-meta-content"><span className="bo-identity-meta-label">{label}</span><span className="bo-identity-meta-value">{value}</span></div></div>; }
