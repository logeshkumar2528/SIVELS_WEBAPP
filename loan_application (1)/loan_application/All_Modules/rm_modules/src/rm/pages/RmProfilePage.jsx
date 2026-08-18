import React from "react";
import { 
  User, Briefcase, Mail, Phone, MapPin, Camera, 
  ShieldCheck, Clock, Edit3, Lock, BarChart2, 
  History, FileText, XCircle, RefreshCw, ArrowRight,
  CheckCircle2, File
} from "lucide-react";
import "../Rm.css";

export default function RmProfilePage() {
  return (
    <main className="content" style={{ paddingBottom: "16px" }}>
      {/* Title */}
      <div className="welcome-row" style={{ marginBottom: "24px" }}>
        <div>
          <h1 className="welcome-title">My Profile</h1>
          <div className="flex-align-center gap-2 text-muted" style={{ fontSize: "13px" }}>
            <span>Dashboard</span> <span style={{ fontSize: "10px" }}>❯</span> <span className="font-bold text-dark">Profile</span>
          </div>
        </div>
      </div>

      {/* Top Header Card */}
      <div className="panel profile-header-card flex-align-center" style={{ padding: "24px", marginBottom: "24px", justifyContent: "space-between" }}>
        
        {/* Left Side: Info */}
        <div className="flex-align-center gap-4">
          <div style={{ position: "relative" }}>
            <img 
              src="https://ui-avatars.com/api/?name=Ramesh+Kumar&background=eafbf1&color=16a34a&size=120&rounded=true" 
              alt="Avatar" 
              style={{ width: "96px", height: "96px", border: "4px solid #f8fafc", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}
            />
            <div style={{ position: "absolute", bottom: "4px", right: "4px", background: "#fff", border: "1px solid #edf0f2", borderRadius: "50%", padding: "6px", cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
              <Camera size={14} color="#5b6472" />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div className="flex-align-center gap-3" style={{ marginBottom: "4px" }}>
              <h2 className="font-bold text-dark" style={{ fontSize: "20px", margin: 0 }}>Ramesh Kumar</h2>
              <span style={{ background: "#eafbf1", color: "#16a34a", padding: "4px 12px", borderRadius: "999px", fontSize: "11px", fontWeight: 700 }}>Administrator</span>
            </div>
            <div className="flex-align-center gap-2 text-muted" style={{ fontSize: "13px" }}>
              <Briefcase size={14} /> RM ID : RM0001
            </div>
            <div className="flex-align-center gap-2 text-muted" style={{ fontSize: "13px" }}>
              <Mail size={14} /> ramesh.kumar@sivelsfinance.com
            </div>
            <div className="flex-align-center gap-2 text-muted" style={{ fontSize: "13px" }}>
              <Phone size={14} /> +91 98765 43210
            </div>
            <div className="flex-align-center gap-2 text-muted" style={{ fontSize: "13px" }}>
              <MapPin size={14} /> Chennai, Tamil Nadu, India
            </div>
          </div>
        </div>

        {/* Vertical Divider */}
        <div style={{ width: "1px", height: "100px", background: "#edf0f2", margin: "0 24px" }} />

        {/* Right Side: Stats */}
        <div className="flex-align-center gap-3">
          <div className="profile-stat-box" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
            <Briefcase size={24} color="#16a34a" style={{ marginBottom: "8px" }} />
            <div className="font-bold text-dark" style={{ fontSize: "24px", lineHeight: 1.1 }}>128</div>
            <div style={{ fontSize: "11px", color: "#16241f", fontWeight: 600, marginTop: "4px" }}>Total Applications</div>
            <div style={{ fontSize: "10px", color: "#16a34a", fontWeight: 700 }}>All Time</div>
          </div>
          <div className="profile-stat-box" style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}>
            <ShieldCheck size={24} color="#3b82f6" style={{ marginBottom: "8px" }} />
            <div className="font-bold text-dark" style={{ fontSize: "24px", lineHeight: 1.1 }}>86</div>
            <div style={{ fontSize: "11px", color: "#16241f", fontWeight: 600, marginTop: "4px" }}>Approved</div>
            <div style={{ fontSize: "10px", color: "#3b82f6", fontWeight: 700 }}>67.19%</div>
          </div>
          <div className="profile-stat-box" style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}>
            <Clock size={24} color="#f97316" style={{ marginBottom: "8px" }} />
            <div className="font-bold text-dark" style={{ fontSize: "24px", lineHeight: 1.1 }}>28</div>
            <div style={{ fontSize: "11px", color: "#16241f", fontWeight: 600, marginTop: "4px" }}>Pending</div>
            <div style={{ fontSize: "10px", color: "#f97316", fontWeight: 700 }}>21.88%</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="profile-tabs">
        <div className="profile-tab active">Profile Information</div>
        <div className="profile-tab">Change Password</div>
        <div className="profile-tab">Notification Preferences</div>
        <div className="profile-tab">Activity Log</div>
      </div>

      {/* Content Grid */}
      <div className="profile-grid">
        
        {/* Row 1, Col 1: Personal Information */}
        <section className="panel" style={{ padding: "24px" }}>
          <div className="flex-align-center" style={{ justifyContent: "space-between", marginBottom: "24px" }}>
            <div className="flex-align-center gap-2 font-bold text-dark" style={{ fontSize: "15px" }}>
              <div style={{ background: "#eafbf1", padding: "6px", borderRadius: "50%" }}>
                <User size={16} color="#0f7a4c" />
              </div>
              Personal Information
            </div>
            <button className="btn-outline flex-align-center gap-1" style={{ padding: "6px 12px", fontSize: "12px" }}>
              <Edit3 size={12} /> Edit
            </button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            <div className="flex-col">
              <span className="text-muted" style={{ fontSize: "11px", marginBottom: "4px" }}>Full Name</span>
              <span className="font-bold text-dark" style={{ fontSize: "13px" }}>Ramesh Kumar</span>
            </div>
            <div className="flex-col">
              <span className="text-muted" style={{ fontSize: "11px", marginBottom: "4px" }}>Mobile Number</span>
              <span className="font-bold text-dark" style={{ fontSize: "13px" }}>98765 43210</span>
            </div>
            <div className="flex-col">
              <span className="text-muted" style={{ fontSize: "11px", marginBottom: "4px" }}>Email ID</span>
              <span className="font-bold text-dark" style={{ fontSize: "13px" }}>ramesh.kumar@sivelsfinance.com</span>
            </div>
            <div className="flex-col">
              <span className="text-muted" style={{ fontSize: "11px", marginBottom: "4px" }}>Date of Birth</span>
              <span className="font-bold text-dark" style={{ fontSize: "13px" }}>12/05/1993</span>
            </div>
            <div className="flex-col">
              <span className="text-muted" style={{ fontSize: "11px", marginBottom: "4px" }}>Gender</span>
              <span className="font-bold text-dark" style={{ fontSize: "13px" }}>Male</span>
            </div>
            <div className="flex-col">
              <span className="text-muted" style={{ fontSize: "11px", marginBottom: "4px" }}>Language</span>
              <span className="font-bold text-dark" style={{ fontSize: "13px" }}>English</span>
            </div>
          </div>
          
          <div className="flex-col">
            <span className="text-muted" style={{ fontSize: "11px", marginBottom: "4px" }}>Address</span>
            <span className="font-bold text-dark" style={{ fontSize: "13px", lineHeight: 1.4 }}>
              Door No. 12/05, 1st Main Road,<br/>KK Nagar, Chennai – 600078, Tamil Nadu, India
            </span>
          </div>
        </section>

        {/* Row 1, Col 2: Account & Access */}
        <section className="panel" style={{ padding: "24px", display: "flex", flexDirection: "column" }}>
          <div className="flex-align-center gap-2 font-bold text-dark" style={{ fontSize: "15px", marginBottom: "24px" }}>
            <div style={{ background: "#eafbf1", padding: "6px", borderRadius: "50%" }}>
              <Lock size={16} color="#0f7a4c" />
            </div>
            Account & Access
          </div>

          <div className="flex-align-center" style={{ justifyContent: "space-between", flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="flex-col">
                <span className="text-muted" style={{ fontSize: "11px", marginBottom: "4px" }}>Role</span>
                <span className="font-bold text-dark" style={{ fontSize: "13px" }}>Administrator</span>
              </div>
              <div className="flex-col">
                <span className="text-muted" style={{ fontSize: "11px", marginBottom: "4px" }}>Access Level</span>
                <span className="font-bold text-dark" style={{ fontSize: "13px" }}>Full Access</span>
              </div>
              <div className="flex-col">
                <span className="text-muted" style={{ fontSize: "11px", marginBottom: "4px" }}>Last Login</span>
                <span className="font-bold text-dark" style={{ fontSize: "13px" }}>05 Jun 2025, 10:30 AM</span>
              </div>
              <div className="flex-col">
                <span className="text-muted" style={{ fontSize: "11px", marginBottom: "4px" }}>Account Created On</span>
                <span className="font-bold text-dark" style={{ fontSize: "13px" }}>20 Apr 2024, 09:15 AM</span>
              </div>
            </div>

            <div style={{ paddingRight: "16px" }}>
              <div style={{ width: "120px", height: "120px", borderRadius: "50%", background: "#eafbf1", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                <div style={{ position: "absolute", inset: "-12px", border: "1px dashed #bbf7d0", borderRadius: "50%" }}></div>
                <div style={{ position: "absolute", inset: "-24px", border: "1px dashed rgba(187,247,208,0.5)", borderRadius: "50%" }}></div>
                <div style={{ background: "#0f5132", width: "80px", height: "90px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}>
                  <ShieldCheck size={40} color="#fff" strokeWidth={2.5} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Row 2, Col 1: Application Overview */}
        <section className="panel" style={{ padding: "24px" }}>
          <div className="flex-align-center gap-2 font-bold text-dark" style={{ fontSize: "15px", marginBottom: "24px" }}>
            <div style={{ background: "#eafbf1", padding: "6px", borderRadius: "50%" }}>
              <BarChart2 size={16} color="#0f7a4c" />
            </div>
            Application Overview
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px", marginBottom: "24px" }}>
            
            <div className="app-stat-box" style={{ background: "#f8fafc", border: "1px solid #edf0f2" }}>
              <FileText size={20} color="#16a34a" style={{ marginBottom: "6px" }} />
              <div className="font-bold text-dark" style={{ fontSize: "18px" }}>128</div>
              <div style={{ fontSize: "10px", color: "#16241f", fontWeight: 600 }}>Total Submitted</div>
              <div style={{ fontSize: "9px", color: "#8a94a6", marginTop: "2px" }}>All Time</div>
            </div>
            
            <div className="app-stat-box" style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}>
              <CheckCircle2 size={20} color="#3b82f6" style={{ marginBottom: "6px" }} />
              <div className="font-bold text-dark" style={{ fontSize: "18px" }}>86</div>
              <div style={{ fontSize: "10px", color: "#16241f", fontWeight: 600 }}>Approved</div>
              <div style={{ fontSize: "9px", color: "#3b82f6", marginTop: "2px" }}>67.19%</div>
            </div>
            
            <div className="app-stat-box" style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}>
              <Clock size={20} color="#f97316" style={{ marginBottom: "6px" }} />
              <div className="font-bold text-dark" style={{ fontSize: "18px" }}>28</div>
              <div style={{ fontSize: "10px", color: "#16241f", fontWeight: 600 }}>Pending</div>
              <div style={{ fontSize: "9px", color: "#f97316", marginTop: "2px" }}>21.88%</div>
            </div>
            
            <div className="app-stat-box" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
              <XCircle size={20} color="#ef4444" style={{ marginBottom: "6px" }} />
              <div className="font-bold text-dark" style={{ fontSize: "18px" }}>4</div>
              <div style={{ fontSize: "10px", color: "#16241f", fontWeight: 600 }}>Rejected</div>
              <div style={{ fontSize: "9px", color: "#ef4444", marginTop: "2px" }}>3.12%</div>
            </div>

          </div>

          <button className="btn-outline w-100 flex-align-center gap-2" style={{ justifyContent: "center", padding: "10px" }}>
            View All Applications <ArrowRight size={14} />
          </button>
        </section>

        {/* Row 2, Col 2: Recent Activity */}
        <section className="panel" style={{ padding: "24px" }}>
          <div className="flex-align-center" style={{ justifyContent: "space-between", marginBottom: "24px" }}>
            <div className="flex-align-center gap-2 font-bold text-dark" style={{ fontSize: "15px" }}>
              <div style={{ background: "#eafbf1", padding: "6px", borderRadius: "50%" }}>
                <History size={16} color="#0f7a4c" />
              </div>
              Recent Activity
            </div>
            <a href="#" className="font-bold" style={{ color: "#16a34a", fontSize: "12px", textDecoration: "none" }}>View All</a>
          </div>

          <div className="activity-list">
            <div className="activity-item">
              <div className="activity-icon" style={{ color: "#16a34a" }}><CheckCircle2 size={16} /></div>
              <div className="activity-text">Application APP25060500024 approved</div>
              <div className="activity-time">05 Jun 2025, 10:25 AM</div>
            </div>
            <div className="activity-item">
              <div className="activity-icon" style={{ color: "#f97316" }}><Clock size={16} /></div>
              <div className="activity-text">Application APP25060500023 pending review</div>
              <div className="activity-time">05 Jun 2025, 09:50 AM</div>
            </div>
            <div className="activity-item">
              <div className="activity-icon" style={{ color: "#3b82f6" }}><File size={16} /></div>
              <div className="activity-text">New application APP25060500022 submitted</div>
              <div className="activity-time">05 Jun 2025, 09:15 AM</div>
            </div>
            <div className="activity-item">
              <div className="activity-icon" style={{ color: "#a855f7" }}><RefreshCw size={16} /></div>
              <div className="activity-text">Application APP25060500021 returned</div>
              <div className="activity-time">04 Jun 2025, 04:40 PM</div>
            </div>
            <div className="activity-item">
              <div className="activity-icon" style={{ color: "#16a34a" }}><CheckCircle2 size={16} /></div>
              <div className="activity-text">Application APP25060500020 approved</div>
              <div className="activity-time">04 Jun 2025, 03:20 PM</div>
            </div>
          </div>
        </section>

      </div>

      <div style={{ textAlign: "center", marginTop: "24px", color: "#8a94a6", fontSize: "11px", fontWeight: 600 }}>
        © 2025 Sivels Finance. All rights reserved.
      </div>
    </main>
  );
}
