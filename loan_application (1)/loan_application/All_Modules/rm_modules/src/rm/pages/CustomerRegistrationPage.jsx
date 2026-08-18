import React, { useState } from "react";
import { Modal } from "react-bootstrap";
import { 
  ArrowLeft, Copy, User, MapPin, Calendar, CheckCircle2, 
  Phone, FileText, ArrowRight, Eye, Check, ChevronDown, Info, IndianRupee
} from "lucide-react";
import "../Rm.css";

export default function CustomerRegistrationPage({ onBack, onProceed }) {
  const [showDocModal, setShowDocModal] = useState(false);

  return (
    <main className="content">
      {/* Top action row */}
      <div className="flex-align-center" style={{ justifyContent: "flex-end", marginBottom: "16px" }}>
        <button className="btn-outline flex-align-center gap-2" onClick={onBack}>
          <ArrowLeft size={16} /> Back to Aadhaar eKYC
        </button>
      </div>

      {/* Meta Info Panel */}
      <div className="panel flex-align-center meta-row-panel" style={{ padding: "16px 24px", marginBottom: "24px", justifyContent: "space-between" }}>
        <div className="meta-item">
          <FileText size={20} className="meta-icon" />
          <div>
            <span className="meta-label">Application ID</span>
            <span className="meta-value flex-align-center gap-1">APP25060500024 <Copy size={14} color="#8a94a6" style={{cursor:'pointer'}} /></span>
          </div>
        </div>
        <div className="topbar-divider" style={{height:'32px'}} />
        <div className="meta-item">
          <User size={20} className="meta-icon" />
          <div>
            <span className="meta-label">Customer Name</span>
            <span className="meta-value">Ramesh Kumar</span>
          </div>
        </div>
        <div className="topbar-divider" style={{height:'32px'}} />
        <div className="meta-item">
          <Phone size={20} className="meta-icon" />
          <div>
            <span className="meta-label">Mobile Number</span>
            <span className="meta-value">98765 43210</span>
          </div>
        </div>
        <div className="topbar-divider" style={{height:'32px'}} />
        <div className="meta-item">
          <User size={20} className="meta-icon" />
          <div>
            <span className="meta-label">Submitted By (Agent)</span>
            <span className="meta-value">Thiru (AGT0001)</span>
          </div>
        </div>
        <div className="topbar-divider" style={{height:'32px'}} />
        <div className="meta-item">
          <MapPin size={20} className="meta-icon" />
          <div>
            <span className="meta-label">Area / Branch</span>
            <span className="meta-value">KK Nagar</span>
          </div>
        </div>
        <div className="topbar-divider" style={{height:'32px'}} />
        <div className="meta-item">
          <Calendar size={20} className="meta-icon" />
          <div>
            <span className="meta-label">Submitted Time</span>
            <span className="meta-value">05 Jun 2025, 10:25 AM</span>
          </div>
        </div>
      </div>

      {/* 3-Column Layout */}
      <div className="cv-grid">
        
        {/* Left Col: Customer Summary */}
        <section className="panel" style={{ padding: "0" }}>
          <div style={{ padding: "20px" }}>
            <h3 className="font-bold text-dark" style={{ fontSize: "15px", marginBottom: "24px" }}>Customer Summary</h3>
            
            <div className="flex-col-center text-center">
              <img src="https://ui-avatars.com/api/?name=Ramesh+Kumar&background=eafbf1&color=16a34a&size=100&rounded=true" alt="Ramesh" style={{ width: "80px", height: "80px", marginBottom: "12px" }} />
              <h2 className="font-bold text-dark" style={{ fontSize: "18px", margin: "0 0 6px" }}>Ramesh Kumar</h2>
              <div className="flex-align-center gap-1 text-dark font-bold" style={{ fontSize: "14px", marginBottom: "6px" }}>
                <Phone size={14} /> 98765 43210
              </div>
              <div className="text-muted" style={{ fontSize: "12.5px", marginBottom: "16px" }}>
                Age: 32 Years &nbsp;|&nbsp; Male
              </div>
              <div style={{ background: "#eafbf1", color: "#16a34a", padding: "6px 16px", borderRadius: "6px", fontSize: "12.5px", fontWeight: "700" }}>
                Applied For: Business Loan
              </div>
            </div>
          </div>
          
          <hr style={{ border: "none", borderTop: "1px solid #edf0f2", margin: "0" }} />
          
          <div style={{ padding: "20px" }}>
            <h4 className="font-bold text-dark" style={{ fontSize: "14px", marginBottom: "16px" }}>
              Verified Information
            </h4>
            
            <div className="flex-align-center gap-2 mb-2" style={{ color: "#16a34a", fontSize: "12.5px", fontWeight: 700, marginBottom: "10px" }}>
              <CheckCircle2 size={16} /> Aadhaar Verified
            </div>
            <div className="flex-align-center gap-2" style={{ color: "#16a34a", fontSize: "12.5px", fontWeight: 700, marginBottom: "20px" }}>
              <CheckCircle2 size={16} /> Mobile Verified
            </div>

            <div className="info-kv">
              <div className="info-k">Aadhaar Number</div>
              <div className="info-v" style={{ fontSize: "14px", letterSpacing: "0.5px" }}>1234 5678 9012</div>
            </div>
            <div className="info-kv">
              <div className="info-k">Registered Mobile</div>
              <div className="info-v" style={{ fontSize: "14px", letterSpacing: "0.5px" }}>98765 43210</div>
            </div>
          </div>
        </section>

        {/* Middle Col: Registration Form */}
        <section className="panel" style={{ padding: "24px" }}>
          {/* Stepper */}
          <div className="stepper-wrap" style={{marginBottom: "32px"}}>
            <div className="stepper-line" style={{ background: "repeating-linear-gradient(90deg, #16a34a, #16a34a 4px, transparent 4px, transparent 8px)" }} />
            <div className="step-item">
              <div className="step-circle" style={{ background: "#16a34a", borderColor: "#16a34a", color: "#fff" }}>
                <Check size={16} strokeWidth={3} />
              </div>
              <span className="step-label" style={{ color: "#16241f", fontWeight: 700 }}>Customer<br/>Verification</span>
            </div>
            <div className="step-item">
              <div className="step-circle" style={{ background: "#16a34a", borderColor: "#16a34a", color: "#fff" }}>
                <Check size={16} strokeWidth={3} />
              </div>
              <span className="step-label" style={{ color: "#16241f", fontWeight: 700 }}>Aadhaar<br/>eKYC</span>
            </div>
            <div className="step-item active">
              <div className="step-circle">3</div>
              <span className="step-label">Customer<br/>Registration</span>
            </div>
            <div className="step-item">
              <div className="step-circle">4</div>
              <span className="step-label">Create<br/>Login</span>
            </div>
            <div className="step-item">
              <div className="step-circle">5</div>
              <span className="step-label">Review<br/>& Submit</span>
            </div>
          </div>

          <h3 className="font-bold text-dark" style={{ fontSize: "16px", marginBottom: "6px" }}>Step 3: Customer Registration</h3>
          <p className="text-muted" style={{ fontSize: "12.5px", marginBottom: "24px" }}>Enter complete customer details for loan application.</p>
          
          <div className="reg-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
            <div className="input-group">
              <label className="input-label" style={{ fontWeight: 600 }}>Full Name <span style={{ color: "#e6394a" }}>*</span></label>
              <input type="text" className="reg-input" defaultValue="Ramesh Kumar" />
            </div>
            <div className="input-group">
              <label className="input-label" style={{ fontWeight: 600 }}>Mobile Number <span style={{ color: "#e6394a" }}>*</span></label>
              <input type="text" className="reg-input" defaultValue="98765 43210" />
            </div>
            <div className="input-group">
              <label className="input-label" style={{ fontWeight: 600 }}>Date of Birth <span style={{ color: "#e6394a" }}>*</span></label>
              <div className="input-with-icon">
                <input type="text" className="reg-input w-100" defaultValue="12/05/1993" />
                <Calendar size={16} className="input-icon-right" />
              </div>
            </div>
            <div className="input-group">
              <label className="input-label" style={{ fontWeight: 600 }}>Alternate Mobile Number</label>
              <input type="text" className="reg-input" defaultValue="91234 56789" />
            </div>
            <div className="input-group">
              <label className="input-label" style={{ fontWeight: 600 }}>Gender <span style={{ color: "#e6394a" }}>*</span></label>
              <div className="select-wrapper">
                <select className="reg-input w-100">
                  <option>Male</option>
                </select>
                <ChevronDown size={16} className="select-icon" />
              </div>
            </div>
            <div className="input-group">
              <label className="input-label" style={{ fontWeight: 600 }}>Marital Status <span style={{ color: "#e6394a" }}>*</span></label>
              <div className="select-wrapper">
                <select className="reg-input w-100">
                  <option>Married</option>
                </select>
                <ChevronDown size={16} className="select-icon" />
              </div>
            </div>
            <div className="input-group">
              <label className="input-label" style={{ fontWeight: 600 }}>Email ID</label>
              <input type="text" className="reg-input" defaultValue="ramesh.kumar@gmail.com" />
            </div>
            <div className="input-group">
              <label className="input-label" style={{ fontWeight: 600 }}>Address <span style={{ color: "#e6394a" }}>*</span></label>
              <input type="text" className="reg-input" defaultValue="Door No. 12/05, 1st Main Road, KK Nagar, Chennai – 600078, Tamil Nadu" />
            </div>
            <div className="input-group">
              <label className="input-label" style={{ fontWeight: 600 }}>Occupation / Work Type <span style={{ color: "#e6394a" }}>*</span></label>
              <input type="text" className="reg-input" defaultValue="Business" />
            </div>
            <div className="input-group">
              <label className="input-label" style={{ fontWeight: 600 }}>Loan Purpose <span style={{ color: "#e6394a" }}>*</span></label>
              <div className="select-wrapper">
                <select className="reg-input w-100">
                  <option>Business Expansion</option>
                  <option>Housing Loan</option>
                  <option>Property Purchase</option>
                  <option>Personal Reason</option>
                  <option>Education</option>
                </select>
                <ChevronDown size={16} className="select-icon" />
              </div>
            </div>
            <div className="input-group">
              <label className="input-label" style={{ fontWeight: 600 }}>Monthly Income (Approx.) <span style={{ color: "#e6394a" }}>*</span></label>
              <div className="input-with-icon">
                <IndianRupee size={16} className="input-icon" />
                <input type="text" className="reg-input w-100" defaultValue="35,000" style={{ paddingLeft: "36px" }} />
              </div>
            </div>
            <div className="input-group">
              <label className="input-label" style={{ fontWeight: 600 }}>Education Qualification</label>
              <div className="select-wrapper">
                <select className="reg-input w-100">
                  <option>Graduate</option>
                </select>
                <ChevronDown size={16} className="select-icon" />
              </div>
            </div>
          </div>

          <h4 className="font-bold" style={{ color: "#0f7a4c", fontSize: "13px", marginBottom: "16px" }}>Nominee / Reference Details</h4>
          
          <div className="reg-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '32px' }}>
            <div className="input-group">
              <label className="input-label" style={{ fontWeight: 600 }}>Nominee 1 Name</label>
              <input type="text" className="reg-input" defaultValue="S. Lakshmi" />
            </div>
            <div className="input-group">
              <label className="input-label" style={{ fontWeight: 600 }}>Nominee 1 Relationship</label>
              <div className="select-wrapper">
                <select className="reg-input w-100">
                  <option>Wife</option>
                  <option>Husband</option>
                  <option>Spouse</option>
                  <option>Parent</option>
                  <option>Child</option>
                  <option>Sibling</option>
                  <option>Other</option>
                </select>
                <ChevronDown size={16} className="select-icon" />
              </div>
            </div>
            <div className="input-group">
              <label className="input-label" style={{ fontWeight: 600 }}>Nominee 1 Mobile Number</label>
              <input type="text" className="reg-input" defaultValue="98765 67890" />
            </div>

            <div className="input-group">
              <label className="input-label" style={{ fontWeight: 600 }}>Nominee 2 Name</label>
              <input type="text" className="reg-input" defaultValue="" />
            </div>
            <div className="input-group">
              <label className="input-label" style={{ fontWeight: 600 }}>Nominee 2 Relationship</label>
              <div className="select-wrapper">
                <select className="reg-input w-100">
                  <option>Parent</option>
                  <option>Wife</option>
                  <option>Husband</option>
                  <option>Spouse</option>
                  <option>Child</option>
                  <option>Sibling</option>
                  <option>Other</option>
                </select>
                <ChevronDown size={16} className="select-icon" />
              </div>
            </div>
            <div className="input-group">
              <label className="input-label" style={{ fontWeight: 600 }}>Nominee 2 Mobile Number</label>
              <input type="text" className="reg-input" defaultValue="" />
            </div>
          </div>

          <div className="flex-align-center" style={{ justifyContent: "space-between" }}>
            <button className="btn-outline flex-align-center" style={{ padding: "10px 32px" }}>Cancel</button>
            <button className="btn-primary flex-align-center gap-2" style={{ padding: "10px 24px" }} onClick={onProceed}>
              Save & Continue <ArrowRight size={16} />
            </button>
          </div>
        </section>

        {/* Right Col: Documents Pane */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          <div className="alert-box green-alert" style={{ flexDirection: "column", gap: "8px", border: "1px solid #bbf7d0", background: "#f0fdf4" }}>
            <div className="flex-align-center gap-2" style={{ color: "#166534" }}>
              <Info size={16} color="#166534" />
              <span className="font-bold">Important Note</span>
            </div>
            <ul style={{ margin: "4px 0 0", paddingLeft: "24px", color: "#166534", fontSize: "12px", lineHeight: "1.5", display: "flex", flexDirection: "column", gap: "10px" }}>
              <li>Please enter correct details as per your official documents.</li>
              <li>These details will be used for loan processing and customer login creation.</li>
              <li>All fields marked with <span style={{ color: "#e6394a" }}>*</span> are mandatory.</li>
            </ul>
          </div>

          <section className="panel" style={{ padding: "24px" }}>
            <h3 className="font-bold text-dark" style={{ fontSize: "14px", marginBottom: "16px" }}>Documents Verified</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "32px" }}>
              <div className="flex-align-center" style={{ justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
                <div className="flex-align-center gap-2 font-bold text-dark" style={{ fontSize: "13px" }}>
                  <FileText size={16} color="#0f7a4c" /> Aadhaar Card
                </div>
                <div className="flex-align-center gap-1" style={{ color: "#16a34a", fontSize: "12px", fontWeight: 700 }}>
                  Verified <CheckCircle2 size={14} />
                </div>
              </div>
              <div className="flex-align-center" style={{ justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
                <div className="flex-align-center gap-2 font-bold text-dark" style={{ fontSize: "13px" }}>
                  <Phone size={16} color="#0f7a4c" /> Mobile Number
                </div>
                <div className="flex-align-center gap-1" style={{ color: "#16a34a", fontSize: "12px", fontWeight: 700 }}>
                  Verified <CheckCircle2 size={14} />
                </div>
              </div>
            </div>

            <h3 className="font-bold text-dark" style={{ fontSize: "14px", marginBottom: "16px" }}>Aadhaar Preview</h3>
            <div className="doc-card" style={{ marginBottom: "20px", border: "1px solid #e2e8f0" }}>
              <img src="/dummy_aadhaar.jpg" alt="Aadhaar Front" style={{ width: "100%", height: "180px", objectFit: "cover", display: "block" }} />
            </div>
            <button onClick={() => setShowDocModal(true)} className="btn-outline w-100 flex-align-center gap-2" style={{ justifyContent: "center" }}>
              <Eye size={14} /> View Full Aadhaar
            </button>
          </section>

        </div>

      </div>

      {/* Document Viewer Modal */}
      <Modal show={showDocModal} onHide={() => setShowDocModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: "16px", fontWeight: 800 }}>Aadhaar Card Viewer</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: "0" }}>
          <div style={{ width: "100%", background: "#f8fafc", padding: "24px", display: "flex", justifyContent: "center" }}>
            <img 
              src="/dummy_aadhaar.jpg" 
              alt="Aadhaar Document" 
              style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }} 
            />
          </div>
        </Modal.Body>
      </Modal>

    </main>
  );
}
