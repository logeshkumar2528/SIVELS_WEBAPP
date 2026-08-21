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
  User,
  Users,
  Home,
  Lock,
} from "../icons/icons";
import { Moon, Globe, Bell, Smartphone as Mobile, Activity, Settings2, Monitor, ChevronDown, ChevronRight, Info, Download, CreditCard as IdCard } from "lucide-react";
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

function ProfileBanner({ onToast }) {
  return (
    <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)", display: "flex", flexWrap: "wrap", gap: "32px", alignItems: "stretch" }}>
      
      {/* Left Section: Avatar & Basic Info */}
      <div style={{ display: "flex", gap: "24px", minWidth: "300px", flex: 1 }}>
        <img src="https://i.pravatar.cc/150?img=68" alt="Rajesh Kumar" style={{ width: "100px", height: "100px", borderRadius: "50%", objectFit: "cover" }} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#0f172a", margin: "0 0 8px 0" }}>{investor.name}</h2>
          <div style={{ display: "inline-block", background: "#dcfce7", color: "#16a34a", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 700, marginBottom: "16px", alignSelf: "flex-start" }}>
            {investor.role}
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: "#0f172a", fontWeight: 500 }}>
              <Mail size={16} color="#64748b" /> {investor.email}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: "#0f172a", fontWeight: 500 }}>
              <Phone size={16} color="#64748b" /> {investor.phone}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: "#0f172a", fontWeight: 500 }}>
              <span style={{ display: "flex", justifyContent: "center", width: "16px" }}><Calendar size={16} color="#64748b" /></span> {investor.location}
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: "1px", background: "#e2e8f0", margin: "0 16px" }} className="d-none d-lg-block"></div>

      {/* Middle Section: Meta Info Grid */}
      <div style={{ flex: 1.5, minWidth: "400px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", alignContent: "start", paddingTop: "8px" }}>
        
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
          <div style={{ color: "#64748b", marginTop: "2px" }}><Shield size={16} /></div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600, marginBottom: "4px" }}>Employee ID</div>
            <div style={{ fontSize: "13px", color: "#0f172a", fontWeight: 700 }}>{investor.employeeId}</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
          <div style={{ color: "#64748b", marginTop: "2px" }}><ShieldCheck size={16} /></div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600, marginBottom: "4px" }}>Role</div>
            <div style={{ fontSize: "13px", color: "#0f172a", fontWeight: 700 }}>{investor.role}</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
          <div style={{ color: "#64748b", marginTop: "2px" }}><Users size={16} /></div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600, marginBottom: "4px" }}>Department</div>
            <div style={{ fontSize: "13px", color: "#0f172a", fontWeight: 700 }}>{investor.department}</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
          <div style={{ color: "#64748b", marginTop: "2px" }}><Users size={16} /></div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600, marginBottom: "4px" }}>Reporting Manager</div>
            <div style={{ fontSize: "13px", color: "#0f172a", fontWeight: 700 }}>{investor.reportingManager}</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
          <div style={{ color: "#64748b", marginTop: "2px" }}><Calendar size={16} /></div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600, marginBottom: "4px" }}>Date of Joining</div>
            <div style={{ fontSize: "13px", color: "#0f172a", fontWeight: 700 }}>{investor.dateOfJoining}</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
          <div style={{ color: "#64748b", marginTop: "2px" }}><Calendar size={16} /></div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600, marginBottom: "4px" }}>Branch</div>
            <div style={{ fontSize: "13px", color: "#0f172a", fontWeight: 700 }}>{investor.branch}</div>
          </div>
        </div>

      </div>

      {/* Right Section: Profile Completion */}
      <div style={{ minWidth: "320px", flex: 0.8 }}>
        <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "20px", display: "flex", flexDirection: "column", height: "100%" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", marginBottom: "16px" }}>Profile Completion</div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
            <div style={{ position: "relative", width: "70px", height: "70px", flexShrink: 0 }}>
              {/* CSS Donut Chart */}
              <svg viewBox="0 0 36 36" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#16a34a" strokeWidth="4" strokeDasharray={`${investor.profileCompletion}, 100`} />
              </svg>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 800, color: "#0f172a" }}>
                {investor.profileCompletion}%
              </div>
            </div>
            <div style={{ fontSize: "12px", color: "#0f172a", fontWeight: 500, lineHeight: "1.5" }}>
              Keep your profile updated<br/>to get the best experience.
            </div>
          </div>

          <button onClick={() => onToast("Opening profile editor")} style={{ width: "100%", background: "#fff", border: "1px solid #16a34a", color: "#16a34a", borderRadius: "6px", padding: "10px", fontSize: "13px", fontWeight: 700, cursor: "pointer", marginTop: "auto" }}>
            Update Profile
          </button>
        </div>
      </div>

    </div>
  );
}

function ProfileTabs({ activeTab, onChange }) {
  const tabs = [
    { label: "Personal Information", icon: User },
    { label: "Security", icon: ShieldCheck },
    { label: "Preferences", icon: Settings2 },
    { label: "Activity Log", icon: Activity },
  ];
  
  return (
    <div style={{ display: "flex", gap: "32px", borderBottom: "1px solid #e2e8f0", padding: "0 8px" }}>
      {tabs.map((t) => {
        const isActive = activeTab === t.label;
        const Icon = t.icon;
        return (
          <div 
            key={t.label} 
            onClick={() => onChange(t.label)}
            style={{ 
              display: "flex", alignItems: "center", gap: "8px", 
              padding: "12px 4px", cursor: "pointer",
              borderBottom: isActive ? "2px solid #16a34a" : "2px solid transparent",
              color: isActive ? "#16a34a" : "#64748b",
              fontWeight: 700, fontSize: "14px",
              transition: "all 0.2s"
            }}
          >
            <Icon size={16} />
            {t.label}
          </div>
        );
      })}
    </div>
  );
}

function PersonalInformationCard({ onToast }) {
  return (
    <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "24px", height: "100%", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <h3 style={{ fontSize: "15px", fontWeight: 800, color: "#1e3a8a", margin: 0 }}>Personal Information</h3>
        <button onClick={() => onToast("Edit Information")} style={{ background: "#fff", border: "1px solid #16a34a", color: "#16a34a", borderRadius: "6px", padding: "6px 12px", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
          <Edit2 size={12} /> Edit Information
        </button>
      </div>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* Col 1 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <div style={{ color: "#64748b", marginTop: "2px" }}><User size={16} /></div>
            <div>
              <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600, marginBottom: "4px" }}>Full Name</div>
              <div style={{ fontSize: "13px", color: "#0f172a", fontWeight: 600 }}>{personalInfo.fullName}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <div style={{ color: "#64748b", marginTop: "2px" }}><Calendar size={16} /></div>
            <div>
              <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600, marginBottom: "4px" }}>Date of Birth</div>
              <div style={{ fontSize: "13px", color: "#0f172a", fontWeight: 600 }}>{personalInfo.dob}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <div style={{ color: "#64748b", marginTop: "2px" }}><Users size={16} /></div>
            <div>
              <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600, marginBottom: "4px" }}>Gender</div>
              <div style={{ fontSize: "13px", color: "#0f172a", fontWeight: 600 }}>{personalInfo.gender}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <div style={{ color: "#64748b", marginTop: "2px" }}><Home size={16} /></div>
            <div>
              <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600, marginBottom: "4px" }}>Address</div>
              <div style={{ fontSize: "13px", color: "#0f172a", fontWeight: 600, lineHeight: "1.5" }}>{personalInfo.address}</div>
            </div>
          </div>
        </div>

        {/* Col 2 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <div style={{ color: "#64748b", marginTop: "2px" }}><Mail size={16} /></div>
            <div>
              <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600, marginBottom: "4px" }}>Email Address</div>
              <div style={{ fontSize: "13px", color: "#0f172a", fontWeight: 600 }}>{personalInfo.email}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <div style={{ color: "#64748b", marginTop: "2px" }}><Mobile size={16} /></div>
            <div>
              <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600, marginBottom: "4px" }}>Mobile Number</div>
              <div style={{ fontSize: "13px", color: "#0f172a", fontWeight: 600 }}>{personalInfo.mobile}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <div style={{ color: "#64748b", marginTop: "2px" }}><Phone size={16} /></div>
            <div>
              <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600, marginBottom: "4px" }}>Alternate Number</div>
              <div style={{ fontSize: "13px", color: "#0f172a", fontWeight: 600 }}>{personalInfo.alternateNumber}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <div style={{ color: "#64748b", marginTop: "2px" }}><IdCard size={16} /></div>
            <div>
              <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600, marginBottom: "4px" }}>PAN Number</div>
              <div style={{ fontSize: "13px", color: "#0f172a", fontWeight: 600 }}>{personalInfo.pan}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <div style={{ color: "#64748b", marginTop: "2px" }}><IdCard size={16} /></div>
            <div>
              <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600, marginBottom: "4px" }}>Aadhaar Number</div>
              <div style={{ fontSize: "13px", color: "#0f172a", fontWeight: 600 }}>{personalInfo.aadhaar}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SecurityInformationCard({ onToast }) {
  return (
    <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "24px", height: "100%", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <h3 style={{ fontSize: "15px", fontWeight: 800, color: "#1e3a8a", margin: 0 }}>Security Information</h3>
      </div>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {securityInfo.map((row, i) => {
          let Icon = Shield;
          if (row.label === "Password") Icon = Lock;
          if (row.label === "Backup Email") Icon = Mail;
          if (row.label === "Backup Mobile") Icon = Mobile;
          if (row.label === "Last Password Change") Icon = KeyRound;

          const isTwoFactor = row.label === "Two-Factor Authentication";

          return (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
                <div style={{ color: "#64748b" }}><Icon size={16} /></div>
                <div style={{ fontSize: "13px", color: "#0f172a", fontWeight: 600, width: "180px" }}>{row.label}</div>
                <div style={{ fontSize: "13px", color: isTwoFactor ? "#16a34a" : "#0f172a", fontWeight: 600 }}>{row.value}</div>
              </div>
              {row.action && (
                <button onClick={() => onToast(row.action)} style={{ background: "transparent", border: "none", color: "#16a34a", fontSize: "13px", fontWeight: 700, cursor: "pointer", padding: 0 }}>
                  {row.action}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PreferencesCard({ preferences, onToggle }) {
  return (
    <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "24px", height: "100%", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
      <h3 style={{ fontSize: "15px", fontWeight: 800, color: "#1e3a8a", margin: "0 0 24px 0" }}>Preferences</h3>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Moon size={16} color="#64748b" />
            <span style={{ fontSize: "13px", color: "#0f172a", fontWeight: 600 }}>Theme</span>
          </div>
          <div style={{ fontSize: "13px", color: "#0f172a", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            Light Mode <ChevronDown size={14} color="#64748b" />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Globe size={16} color="#64748b" />
            <span style={{ fontSize: "13px", color: "#0f172a", fontWeight: 600 }}>Language</span>
          </div>
          <div style={{ fontSize: "13px", color: "#0f172a", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            English <ChevronDown size={14} color="#64748b" />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Bell size={16} color="#64748b" />
            <span style={{ fontSize: "13px", color: "#0f172a", fontWeight: 600 }}>Email Notifications</span>
          </div>
          <Form.Check type="switch" checked={preferences.email} onChange={() => onToggle("email")} style={{ margin: 0 }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Mobile size={16} color="#64748b" />
            <span style={{ fontSize: "13px", color: "#0f172a", fontWeight: 600 }}>SMS Notifications</span>
          </div>
          <Form.Check type="switch" checked={preferences.sms} onChange={() => onToggle("sms")} style={{ margin: 0 }} />
        </div>
      </div>
    </div>
  );
}

function RecentActivityCard({ onToast }) {
  return (
    <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "24px", height: "100%", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <h3 style={{ fontSize: "15px", fontWeight: 800, color: "#1e3a8a", margin: 0 }}>Recent Activity</h3>
        <button onClick={() => onToast("View All Activity")} style={{ background: "transparent", border: "none", color: "#16a34a", fontSize: "13px", fontWeight: 700, cursor: "pointer", padding: 0 }}>
          View All
        </button>
      </div>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", cursor: "pointer" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <div style={{ color: "#64748b", marginTop: "2px" }}><Monitor size={16} /></div>
            <div>
              <div style={{ fontSize: "13px", color: "#0f172a", fontWeight: 600 }}>Logged in from Windows - Chennai, India</div>
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>05 Jun 2025, 10:30 AM</div>
            </div>
          </div>
          <span style={{ background: "#dcfce7", color: "#16a34a", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 700 }}>Current</span>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", cursor: "pointer" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <div style={{ color: "#64748b", marginTop: "2px" }}><Lock size={16} /></div>
            <div>
              <div style={{ fontSize: "13px", color: "#0f172a", fontWeight: 600 }}>Password changed successfully</div>
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>31 May 2025, 04:15 PM</div>
            </div>
          </div>
          <ChevronRight size={16} color="#cbd5e1" />
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", cursor: "pointer" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <div style={{ color: "#64748b", marginTop: "2px" }}><User size={16} /></div>
            <div>
              <div style={{ fontSize: "13px", color: "#0f172a", fontWeight: 600 }}>Profile information updated</div>
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>28 May 2025, 02:40 PM</div>
            </div>
          </div>
          <ChevronRight size={16} color="#cbd5e1" />
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", cursor: "pointer" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <div style={{ color: "#64748b", marginTop: "2px" }}><Mobile size={16} /></div>
            <div>
              <div style={{ fontSize: "13px", color: "#0f172a", fontWeight: 600 }}>Logged in from Android - Chennai, India</div>
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>25 May 2025, 11:22 AM</div>
            </div>
          </div>
          <ChevronRight size={16} color="#cbd5e1" />
        </div>
      </div>
    </div>
  );
}

function QuickActionsCard({ onToast }) {
  return (
    <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "24px", height: "100%", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
      <h3 style={{ fontSize: "15px", fontWeight: 800, color: "#1e3a8a", margin: "0 0 24px 0" }}>Quick Actions</h3>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }} onClick={() => onToast("Update Picture")}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Camera size={16} color="#64748b" />
            <span style={{ fontSize: "13px", color: "#0f172a", fontWeight: 600 }}>Update Profile Picture</span>
          </div>
          <ChevronRight size={16} color="#cbd5e1" />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }} onClick={() => onToast("Download Summary")}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Download size={16} color="#64748b" />
            <span style={{ fontSize: "13px", color: "#0f172a", fontWeight: 600 }}>Download Profile Summary</span>
          </div>
          <ChevronRight size={16} color="#cbd5e1" />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }} onClick={() => onToast("Change Password")}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <KeyRound size={16} color="#64748b" />
            <span style={{ fontSize: "13px", color: "#0f172a", fontWeight: 600 }}>Change Password</span>
          </div>
          <ChevronRight size={16} color="#cbd5e1" />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }} onClick={() => onToast("Deactivate Account")}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Shield size={16} color="#ef4444" />
            <span style={{ fontSize: "13px", color: "#ef4444", fontWeight: 600 }}>Deactivate Account</span>
          </div>
          <ChevronRight size={16} color="#fca5a5" />
        </div>
      </div>
    </div>
  );
}

function FooterNote() {
  return (
    <div className="px-4 pb-4">
      <div style={{ background: "#f0fdf4", border: "1px solid #dcfce7", borderRadius: "8px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "12px" }}>
        <Info size={16} color="#16a34a" />
        <span style={{ fontSize: "12px", color: "#16a34a", fontWeight: 600 }}>Keeping your profile information updated helps us serve you better and ensures account security.</span>
      </div>
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
      <div className="px-4 pt-4 mt-2 mb-4">
        <ProfileBanner onToast={onToast} />
      </div>

      <div className="px-4 mb-4">
        <ProfileTabs activeTab={activeTab} onChange={setActiveTab} />
      </div>

      <div className="px-4 mb-4">
        {activeTab === "Personal Information" ? (
          <>
            <Row className="g-4 mb-4" xs={1} lg={2}>
              <Col>
                <PersonalInformationCard onToast={onToast} />
              </Col>
              <Col>
                <SecurityInformationCard onToast={onToast} />
              </Col>
            </Row>

            <Row className="g-4" xs={1} md={3}>
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