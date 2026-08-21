import React, { useState } from "react";
import { Row, Col, Breadcrumb, Nav, Button, Form } from "react-bootstrap";
import {
  Mail,
  Phone,
  Calendar,
  Edit2,
  Shield,
  ShieldCheck,
  Camera,
  FileDown,
  Trash2,
  KeyRound,
  Clock,
  ArrowUpRight,
} from "../icons/icons";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

import Card from "../components/Card";
import SectionHeader from "../components/SectionHeader";

/* ------------------------------------------------------------------ */
/*  DUMMY DATA — swap this block for real API responses later          */
/* ------------------------------------------------------------------ */

const investor = {
  name: "Rajesh Kumar",
  role: "Investment Manager",
  employeeId: "INV100245",
  department: "Investment",
  reportingManager: "Suresh Babu",
  dateOfJoining: "15 Jan 2023",
  branch: "Chennai - Main Branch",
  phone: "+91 98765 43210",
  email: "rajesh.kumar@sivelsfinance.com",
  location: "Chennai, Tamil Nadu, India",
  profileCompletion: 90,
};

const personalInfo = {
  fullName: "Rajesh Kumar",
  dob: "12 Mar 1990",
  gender: "Male",
  address: "No. 18, 2nd Street, Anna Nagar, Chennai - 600040, Tamil Nadu, India",
  email: "rajesh.kumar@sivelsfinance.com",
  mobile: "+91 98765 43210",
  alternateNumber: "+91 91234 56789",
  pan: "ABCDE1234F",
  aadhaar: "XXXX XXXX 1234",
};

const securityInfo = [
  { label: "Password", value: "••••••••", action: "Change" },
  { label: "Two-Factor Authentication", value: "Enabled", action: "Change" },
  { label: "Backup Email", value: "rajesh.kumar@gmail.com", action: "Change" },
  { label: "Backup Mobile", value: "+91 98765 43210", action: "Change" },
  { label: "Last Password Change", value: "05 Jun 2025, 10:30 AM", action: null },
];

const recentActivity = [
  { title: "Logged in from Windows — Chennai, India", time: "05 Jun 2025, 09:30 AM" },
  { title: "Password changed successfully", time: "29 Jun 2025", badge: "Current" },
  { title: "Profile information updated", time: "25 Jun 2025, 08:40 AM" },
  { title: "Logged in from Android — Chennai, India", time: "20 Jun 2025, 11:22 AM" },
];

const quickActions = [
  { icon: Camera, label: "Update Profile Picture" },
  { icon: FileDown, label: "Download Profile Summary" },
  { icon: KeyRound, label: "Change Password" },
  { icon: Trash2, label: "Deactivate Account", danger: true },
];

const TABS = ["Personal Information", "Security", "Preferences", "Activity Log"];

const completionData = [
  { value: investor.profileCompletion, color: "#16A34A" },
  { value: 100 - investor.profileCompletion, color: "#E5F5EA" },
];

/* ------------------------------------------------------------------ */
/*  SECTIONS                                                            */
/* ------------------------------------------------------------------ */

function PageHeader() {
  return (
    <div className="px-4 pt-4 pb-2">
      <Breadcrumb className="ni-breadcrumb mb-1">
        <Breadcrumb.Item>Dashboard</Breadcrumb.Item>
        <Breadcrumb.Item>My Profile</Breadcrumb.Item>
        <Breadcrumb.Item active>Profile</Breadcrumb.Item>
      </Breadcrumb>
      <h1 className="page-title mb-0">Profile</h1>
    </div>
  );
}

function ProfileSummaryCard() {
  return (
    <Card bodyClassName="p-4">
      <Row className="align-items-center g-3">
        <Col xs="auto">
          <div className="profile-avatar d-flex align-items-center justify-content-center">
            {investor.name
              .split(" ")
              .map((p) => p[0])
              .join("")}
          </div>
        </Col>
        <Col>
          <p className="mb-0 fw-semibold text-dark">{investor.name}</p>
          <p className="mb-2 profile-role">{investor.role}</p>
          <div className="d-flex flex-wrap gap-3 profile-contact">
            <span className="d-flex align-items-center gap-1">
              <Phone size={13} /> {investor.phone}
            </span>
            <span className="d-flex align-items-center gap-1">
              <Mail size={13} /> {investor.email}
            </span>
            <span className="d-flex align-items-center gap-1">
              <Calendar size={13} /> {investor.location}
            </span>
          </div>
        </Col>
        <Col md={5}>
          <Row className="g-2">
            <Col xs={6}>
              <p className="mb-0 summary-label">Employee ID</p>
              <p className="mb-0 summary-value">{investor.employeeId}</p>
            </Col>
            <Col xs={6}>
              <p className="mb-0 summary-label">Role</p>
              <p className="mb-0 summary-value">{investor.role}</p>
            </Col>
            <Col xs={6}>
              <p className="mb-0 summary-label">Department</p>
              <p className="mb-0 summary-value">{investor.department}</p>
            </Col>
            <Col xs={6}>
              <p className="mb-0 summary-label">Reporting Manager</p>
              <p className="mb-0 summary-value">{investor.reportingManager}</p>
            </Col>
            <Col xs={6}>
              <p className="mb-0 summary-label">Date of Joining</p>
              <p className="mb-0 summary-value">{investor.dateOfJoining}</p>
            </Col>
            <Col xs={6}>
              <p className="mb-0 summary-label">Branch</p>
              <p className="mb-0 summary-value">{investor.branch}</p>
            </Col>
          </Row>
        </Col>
      </Row>
    </Card>
  );
}

function ProfileCompletionCard({ onToast }) {
  return (
    <Card fullHeight bodyClassName="p-4 d-flex flex-column align-items-center text-center">
      <p className="section-title mb-3 align-self-start">Profile Completion</p>
      <div className="donut-wrap-sm position-relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={completionData} dataKey="value" innerRadius={40} outerRadius={58} startAngle={90} endAngle={-270} stroke="none">
              {completionData.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center position-absolute d-flex flex-column align-items-center justify-content-center">
          <p className="mb-0 fw-semibold">{investor.profileCompletion}%</p>
        </div>
      </div>
      <p className="mb-3 mt-2 small text-secondary">
        Keep your profile updated to get the best experience.
      </p>
      <Button className="w-100 login-btn" onClick={() => onToast("Opening profile editor")}>
        Update Profile
      </Button>
    </Card>
  );
}

function ProfileTabs({ activeTab, onChange }) {
  return (
    <Nav variant="tabs" className="profile-tabs px-1">
      {TABS.map((tab) => (
        <Nav.Item key={tab}>
          <Nav.Link active={activeTab === tab} onClick={() => onChange(tab)}>
            {tab}
          </Nav.Link>
        </Nav.Item>
      ))}
    </Nav>
  );
}

function PersonalInformationCard({ onToast }) {
  return (
    <Card fullHeight>
      <div className="d-flex align-items-center justify-content-between mb-2">
        <SectionHeader title="Personal Information" />
        <Button
          variant="outline-secondary"
          size="sm"
          className="d-flex align-items-center gap-1 mb-2"
          onClick={() => onToast("Opening profile editor")}
        >
          <Edit2 size={13} /> Edit Information
        </Button>
      </div>
      <Row className="g-3">
        <Col md={6}>
          <p className="mb-0 profile-field-label">Full Name</p>
          <p className="mb-3 profile-field-value">{personalInfo.fullName}</p>
          <p className="mb-0 profile-field-label">Date of Birth</p>
          <p className="mb-3 profile-field-value">{personalInfo.dob}</p>
          <p className="mb-0 profile-field-label">Gender</p>
          <p className="mb-3 profile-field-value">{personalInfo.gender}</p>
          <p className="mb-0 profile-field-label">Address</p>
          <p className="mb-0 profile-field-value">{personalInfo.address}</p>
        </Col>
        <Col md={6}>
          <p className="mb-0 profile-field-label">Email Address</p>
          <p className="mb-3 profile-field-value">{personalInfo.email}</p>
          <p className="mb-0 profile-field-label">Mobile Number</p>
          <p className="mb-3 profile-field-value">{personalInfo.mobile}</p>
          <p className="mb-0 profile-field-label">Alternate Number</p>
          <p className="mb-3 profile-field-value">{personalInfo.alternateNumber}</p>
          <p className="mb-0 profile-field-label">PAN Number</p>
          <p className="mb-3 profile-field-value">{personalInfo.pan}</p>
          <p className="mb-0 profile-field-label">Aadhaar Number</p>
          <p className="mb-0 profile-field-value">{personalInfo.aadhaar}</p>
        </Col>
      </Row>
    </Card>
  );
}

function SecurityInformationCard({ onToast }) {
  return (
    <Card fullHeight>
      <SectionHeader title="Security Information" />
      {securityInfo.map((row) => (
        <div key={row.label} className="d-flex align-items-center justify-content-between security-row">
          <div className="d-flex align-items-center gap-2">
            <Shield size={14} className="text-secondary flex-shrink-0" />
            <div>
              <p className="mb-0 profile-field-label">{row.label}</p>
              <p className="mb-0 profile-field-value">{row.value}</p>
            </div>
          </div>
          {row.action && (
            <Button
              variant="link"
              size="sm"
              className="p-0 text-decoration-none"
              onClick={() => onToast(`${row.action} — ${row.label}`)}
            >
              {row.action}
            </Button>
          )}
        </div>
      ))}
    </Card>
  );
}

function PreferencesCard({ preferences, onToggle }) {
  return (
    <Card fullHeight>
      <SectionHeader title="Preferences" />
      <div className="d-flex align-items-center justify-content-between mb-2">
        <span className="profile-field-label">Theme</span>
        <span className="profile-field-value">Light Mode</span>
      </div>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <span className="profile-field-label">Language</span>
        <span className="profile-field-value">English</span>
      </div>
      <div className="d-flex align-items-center justify-content-between mb-2">
        <span className="profile-field-label">Email Notifications</span>
        <Form.Check
          type="switch"
          checked={preferences.email}
          onChange={() => onToggle("email")}
        />
      </div>
      <div className="d-flex align-items-center justify-content-between">
        <span className="profile-field-label">SMS Notifications</span>
        <Form.Check
          type="switch"
          checked={preferences.sms}
          onChange={() => onToggle("sms")}
        />
      </div>
    </Card>
  );
}

function RecentActivityCard({ onToast }) {
  return (
    <Card fullHeight>
      <SectionHeader title="Recent Activity" action="View All" onAction={onToast} />
      {recentActivity.map((a, i) => (
        <div key={i} className="d-flex align-items-start justify-content-between mb-2">
          <div className="d-flex align-items-start gap-2">
            <Clock size={14} className="text-secondary flex-shrink-0 mt-1" />
            <div>
              <p className="mb-0 small text-dark">{a.title}</p>
              <p className="mb-0 activity-time">{a.time}</p>
            </div>
          </div>
          {a.badge && <span className="profile-current-badge">{a.badge}</span>}
        </div>
      ))}
    </Card>
  );
}

function QuickActionsCard({ onToast }) {
  return (
    <Card fullHeight>
      <SectionHeader title="Quick Actions" />
      {quickActions.map((a) => {
        const Icon = a.icon;
        return (
          <Button
            key={a.label}
            variant="light"
            onClick={() => onToast(a.label)}
            className={`w-100 d-flex align-items-center justify-content-between text-start quick-action-row mb-1 ${
              a.danger ? "text-danger" : "text-dark"
            }`}
          >
            <span className="d-flex align-items-center gap-2 small fw-medium">
              <Icon size={15} /> {a.label}
            </span>
            <ArrowUpRight size={13} className="opacity-50" />
          </Button>
        );
      })}
    </Card>
  );
}

function FooterNote() {
  return (
    <div className="d-flex align-items-center justify-content-center gap-2 px-4 py-3 profile-footer-note">
      <ShieldCheck size={14} className="text-secondary flex-shrink-0" />
      <span>Keeping your profile information updated helps us serve you better and ensures account security.</span>
    </div>
  );
}

function TabPlaceholder({ label }) {
  return (
    <Card bodyClassName="text-center py-5">
      <p className="mb-0 small text-muted">
        {label} isn't built yet — wire it up the same way as Personal Information once the screen design is ready.
      </p>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                                */
/* ------------------------------------------------------------------ */

export default function ProfilePage({ onToast }) {
  const [activeTab, setActiveTab] = useState("Personal Information");
  const [preferences, setPreferences] = useState({ email: true, sms: true });

  const handleToggle = (key) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
      <PageHeader />

      <Row className="g-3 px-4" xs={1} lg={3}>
        <Col lg={8}>
          <ProfileSummaryCard />
        </Col>
        <Col lg={4}>
          <ProfileCompletionCard onToast={onToast} />
        </Col>
      </Row>

      <div className="px-4 mt-4">
        <ProfileTabs activeTab={activeTab} onChange={setActiveTab} />
      </div>

      <div className="px-4 mt-3">
        {activeTab === "Personal Information" ? (
          <>
            <Row className="g-3" xs={1} lg={2}>
              <Col>
                <PersonalInformationCard onToast={onToast} />
              </Col>
              <Col>
                <SecurityInformationCard onToast={onToast} />
              </Col>
            </Row>

            <Row className="g-3 mt-1" xs={1} md={3}>
              <Col>
                <PreferencesCard preferences={preferences} onToggle={handleToggle} />
              </Col>
              <Col>
                <RecentActivityCard onToast={onToast} />
              </Col>
              <Col>
                <QuickActionsCard onToast={onToast} />
              </Col>
            </Row>
          </>
        ) : (
          <TabPlaceholder label={activeTab} />
        )}
      </div>

      <FooterNote />
    </>
  );
}