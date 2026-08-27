import React from 'react';
import { BriefcaseBusiness, Building2, Check, CircleUserRound, Landmark, LockKeyhole, Mail, MapPin, Phone, ShieldCheck, UsersRound } from 'lucide-react';
import { useCustomerIdentity } from '../../hooks/useCustomerIdentity';
import './Profile.css';

export default function Profile() {
  const { customerData } = useCustomerIdentity();

  const fullName = customerData?.fullName?.trim() || 'Arjun Kumar';
  const nameParts = fullName.split(/\s+/);
  const firstName = customerData?.fullName ? nameParts[0] : 'Arjun';
  const lastName = customerData?.fullName ? (nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Kumar') : 'Kumar';

  const mobileNumber = customerData?.mobileNumber
    ? `+91 ${String(customerData.mobileNumber).replace(/\D/g, '').slice(-10)}`
    : '+91 98765 43210';

  const email = customerData?.email || 'arjunkumar@email.com';

  const customerId = customerData?.agentCustomerId
    ? `CUS${String(customerData.agentCustomerId).padStart(6, '0')}`
    : 'CUS2025001234';

  const employmentValues = [
    ['Employment Type', customerData?.employmentTypeName || 'Salaried'],
    ['Employer Name', 'TCS Private Limited'],
    ['Designation', 'Software Engineer'],
    ['Monthly Salary', '₹85,000']
  ];

  const sections = [
    {
      title: 'Personal Information',
      icon: CircleUserRound,
      values: [
        ['First Name', firstName],
        ['Last Name', lastName],
        ['Date of Birth', '15 Aug 1990'],
        ['Gender', 'Male'],
        ['Marital Status', 'Married']
      ]
    },
    {
      title: 'Contact Information',
      icon: Phone,
      values: [
        ['Mobile Number', mobileNumber, true],
        ['Email Address', email, true]
      ]
    },
    { title: 'Address Information', icon: MapPin, address: true },
    { title: 'Employment Information', icon: BriefcaseBusiness, values: employmentValues },
    { title: 'Business Information', optional: true, icon: Building2, values: [['GST Number', '33ABCDE1234F1Z5'], ['Annual Turnover', '₹25,00,000'], ['Business Nature', 'IT Services']] },
    { title: 'Bank Information', icon: Landmark, values: [['Account Number', '5010 1234 5678 9012'], ['IFSC Code', 'HDFC0001234'], ['Bank Name', 'HDFC Bank Ltd']] },
  ];

  return <div className="profile-page">
    <header className="profile-heading"><div><h1>Profile</h1><p>View your personal information</p></div></header>
    <section className="profile-summary">
      <div className="profile-avatar"><CircleUserRound size={43} /></div>
      <div className="profile-summary-text">
        <div><h2>{fullName}</h2><span>Verified Customer</span></div>
        <p>Customer ID: <b>{customerId}</b></p>
        <p>Member since: <b>15 May 2025</b></p>
      </div>
      <div className="profile-completion"><div><b>Profile Completion</b><strong>100%</strong></div><span><i /></span><p><Check size={17} /> Your profile is complete</p></div>
    </section>
    <div className="profile-info-grid">{sections.map((section) => <InfoCard key={section.title} {...section} />)}</div>
    <div className="profile-bottom-grid"><NomineeCard /><KycCard /></div>
    <footer className="profile-security"><LockKeyhole size={14} /> Your personal information is secure and will never be shared with third parties.</footer>
  </div>;
}

function InfoCard({ title, icon: Icon, optional, values, address }) {
  return <section className="profile-info-card"><header><h2><Icon size={17} /> {title} {optional && <small>(Optional)</small>}</h2></header>{address ? <div className="profile-address"><small>Current Address</small><p>No. 123, 4th Cross Street,<br />Anna Nagar, Chennai,<br />Tamil Nadu - 600040</p><hr /><small>Permanent Address</small><p>No. 123, 4th Cross Street,<br />Anna Nagar, Chennai,<br />Tamil Nadu - 600040</p></div> : <dl>{values.map(([label, value, verified]) => <div key={label}><dt>{label}</dt><dd>{value}{verified && <span className="verified">Verified</span>}</dd></div>)}</dl>}</section>;
}

function NomineeCard() { return <section className="nominee-card"><header><h2><UsersRound size={17} /> Reference Information</h2></header><div className="nominee-columns"><Nominee name="Ramesh Kumar" relation="Father" phone="+91 98765 12345" /><Nominee name="Priya Kumar" relation="Sister" phone="+91 91234 56789" /></div></section>; }
function Nominee({ name, relation, phone }) { return <div><b>Reference {name === 'Ramesh Kumar' ? '1' : '2'}</b><dl><dt>Name</dt><dd>{name}</dd><dt>Relationship</dt><dd>{relation}</dd><dt>Mobile Number</dt><dd>{phone}</dd></dl></div>; }
function KycCard() { return <section className="kyc-card"><header><h2><ShieldCheck size={17} /> KYC Verification Status</h2></header><KycItem title="Aadhaar Verification" detail="Verified on 15 May 2025 via DigiLocker" icon={Building2} /><KycItem title="PAN Verification" detail="PAN Number: ABCPK1234E" icon={Mail} /></section>; }
function KycItem({ title, detail, icon: Icon }) { return <div className="kyc-item"><span className="kyc-icon"><Icon size={18} /></span><div><b>{title} <em>Verified</em></b><p>{detail}<br />Verified on 15 May 2025</p></div><span className="kyc-check"><Check size={16} /></span></div>; }
