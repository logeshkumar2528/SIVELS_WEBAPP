import React, { useState } from "react";
import { Modal } from "react-bootstrap";
import { 
  ArrowLeft, Copy, User, MapPin, Calendar, CheckCircle2, 
  Phone, FileText, ArrowRight, Eye, Check, Info, ShieldCheck,
  Send, Lock, RefreshCw, IndianRupee
} from "lucide-react";
import "../Rm.css";

export default function CreateLoginPage({ onBack, onProceed }) {
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const handleOtpChange = (index, val) => {
    // Only allow numbers
    if (val && !/^\d+$/.test(val)) return;
    const newOtp = [...otp];
    newOtp[index] = val.slice(-1);
    setOtp(newOtp);
    
    // Auto-focus next
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  return (
    <main className="content">
      {/* Top action row */}
      <div className="flex-align-center" style={{ justifyContent: "flex-end", marginBottom: "16px" }}>
        <button className="btn-outline flex-align-center gap-2" onClick={onBack}>
          <ArrowLeft size={16} /> Back to Customer Registration
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
              Verification Status
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div className="flex-align-center gap-3">
                <CheckCircle2 size={18} color="#16a34a" />
                <div style={{ lineHeight: 1.2 }}>
                  <div className="font-bold text-dark" style={{ fontSize: "13px" }}>Customer Verification</div>
                  <div style={{ color: "#16a34a", fontSize: "12px", fontWeight: 600 }}>Completed</div>
                </div>
              </div>
              <div className="flex-align-center gap-3">
                <CheckCircle2 size={18} color="#16a34a" />
                <div style={{ lineHeight: 1.2 }}>
                  <div className="font-bold text-dark" style={{ fontSize: "13px" }}>Aadhaar eKYC</div>
                  <div style={{ color: "#16a34a", fontSize: "12px", fontWeight: 600 }}>Verified</div>
                </div>
              </div>
              <div className="flex-align-center gap-3">
                <CheckCircle2 size={18} color="#16a34a" />
                <div style={{ lineHeight: 1.2 }}>
                  <div className="font-bold text-dark" style={{ fontSize: "13px" }}>Customer Registration</div>
                  <div style={{ color: "#16a34a", fontSize: "12px", fontWeight: 600 }}>Completed</div>
                </div>
              </div>
            </div>

            <hr style={{ border: "none", borderTop: "1px dashed #edf0f2", margin: "0 0 16px 0" }} />

            <div className="flex-align-center" style={{ justifyContent: "space-between" }}>
              <span className="font-bold text-dark" style={{ fontSize: "13px" }}>Overall Status</span>
              <span style={{ background: "#eafbf1", color: "#16a34a", padding: "4px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: 700 }}>All Verified</span>
            </div>
          </div>
        </section>

        {/* Middle & Right Col Wrapper */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', gridColumn: 'span 2' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
            {/* Middle Col: Login Form */}
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
                <div className="step-item">
                  <div className="step-circle" style={{ background: "#16a34a", borderColor: "#16a34a", color: "#fff" }}>
                    <Check size={16} strokeWidth={3} />
                  </div>
                  <span className="step-label" style={{ color: "#16241f", fontWeight: 700 }}>Customer<br/>Registration</span>
                </div>
                <div className="step-item active">
                  <div className="step-circle">4</div>
                  <span className="step-label">Create<br/>Login</span>
                </div>
                <div className="step-item">
                  <div className="step-circle">5</div>
                  <span className="step-label">Review<br/>& Submit</span>
                </div>
              </div>

              <h3 className="font-bold text-dark" style={{ fontSize: "16px", marginBottom: "6px" }}>Step 4: Create Customer Login</h3>
              <p className="text-muted" style={{ fontSize: "12.5px", marginBottom: "24px" }}>Customer login will be created using the mobile number. OTP will be sent for verification.</p>
              
              <div className="input-group" style={{ marginBottom: "8px" }}>
                <label className="input-label">Mobile Number (Login ID)</label>
                <div className="input-with-icon">
                  <Phone size={18} className="input-icon" />
                  <input type="text" className="form-input" value="98765 43210" readOnly />
                </div>
              </div>
              <div className="flex-align-center gap-1" style={{ color: "#16a34a", fontSize: "11.5px", fontWeight: 600, marginBottom: "24px" }}>
                <CheckCircle2 size={14} /> This mobile number will be used as Login ID
              </div>

              <div style={{ background: "#f8fafc", border: "1px solid #edf0f2", borderRadius: "8px", padding: "16px", marginBottom: "24px" }}>
                <h4 className="font-bold text-dark" style={{ fontSize: "13px", margin: "0 0 6px" }}>Send OTP for Login Verification</h4>
                <p className="text-muted" style={{ fontSize: "11.5px", margin: "0 0 16px" }}>Click the button below to send OTP to the customer's mobile number.</p>
                
                <div style={{ background: "#e2e8f0", padding: "12px 16px", borderRadius: "6px", display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                  <Phone size={18} color="#0f7a4c" />
                  <div style={{ lineHeight: 1.2 }}>
                    <div style={{ fontSize: "11px", color: "#5b6472", fontWeight: 600 }}>Mobile Number</div>
                    <div className="font-bold text-dark" style={{ fontSize: "14px", letterSpacing: "0.5px" }}>98765 43210</div>
                  </div>
                </div>

                <button 
                  className="btn-primary w-100 flex-align-center gap-2" 
                  style={{ justifyContent: "center" }}
                  onClick={() => setOtpSent(true)}
                >
                  <Send size={16} /> Send OTP
                </button>
              </div>

              <div className="input-group" style={{ marginBottom: "24px" }}>
                <label className="input-label">Enter OTP <span style={{ color: "#e6394a" }}>*</span></label>
                <div className="flex-align-center gap-3">
                  <div className="otp-container">
                    {otp.map((digit, idx) => (
                      <input 
                        id={`otp-${idx}`}
                        key={idx} 
                        type="text" 
                        className="otp-box" 
                        placeholder="-" 
                        value={digit} 
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      />
                    ))}
                  </div>
                  <div style={{ marginLeft: "auto", display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <div className="flex-align-center gap-1" style={{ color: "#16a34a", fontSize: "12.5px", fontWeight: 700 }}>
                      <Calendar size={14} /> 01:49
                    </div>
                    <button className="btn-text flex-align-center gap-1" style={{ fontSize: "11px" }}>
                      <RefreshCw size={12} /> Resend OTP
                    </button>
                  </div>
                </div>
              </div>

              <div className="alert-box blue-alert" style={{ marginBottom: "32px", padding: "10px 16px" }}>
                <Info size={16} /> OTP will be valid for 2 minutes.
              </div>

              <div className="flex-align-center gap-3">
                <button className="btn-outline flex-1" style={{ justifyContent: "center" }}>Cancel</button>
                <button className="btn-primary flex-1 flex-align-center gap-2" style={{ justifyContent: "center" }} onClick={onProceed}>
                  Verify & Continue <ArrowRight size={16} />
                </button>
              </div>
            </section>

            {/* Right Col: Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              <section className="panel" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "20px" }}>
                <div className="flex-align-center gap-2 font-bold text-dark" style={{ fontSize: "14px", marginBottom: "16px" }}>
                  <ShieldCheck size={18} color="#0f7a4c" /> Login Information
                </div>
                
                <div style={{ background: "#fff", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "16px", display: "flex", alignItems: "center", gap: "16px", marginBottom: "12px" }}>
                  <div style={{ width: "36px", height: "36px", background: "#f0fdf4", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #bbf7d0" }}>
                    <Phone size={18} color="#16a34a" />
                  </div>
                  <div style={{ lineHeight: 1.2 }}>
                    <div style={{ fontSize: "11.5px", color: "#5b6472", fontWeight: 600 }}>Login ID (Mobile Number)</div>
                    <div className="font-bold text-dark" style={{ fontSize: "16px", letterSpacing: "0.5px" }}>98765 43210</div>
                  </div>
                </div>

                <p style={{ margin: 0, fontSize: "12px", color: "#16241f", lineHeight: "1.5" }}>
                  Login will be created using this mobile number after OTP verification.
                </p>
              </section>

              <section className="panel" style={{ padding: "20px" }}>
                <h3 className="font-bold text-dark" style={{ fontSize: "14px", marginBottom: "20px" }}>Customer Preview</h3>
                
                <div className="info-kv-row">
                  <User size={16} className="info-row-icon" />
                  <div className="info-row-k">Name</div>
                  <div className="info-row-v" style={{ textAlign: "right" }}>Ramesh Kumar</div>
                </div>
                <div className="info-kv-row">
                  <Phone size={16} className="info-row-icon" />
                  <div className="info-row-k">Mobile Number (Login ID)</div>
                  <div className="info-row-v" style={{ textAlign: "right" }}>98765 43210</div>
                </div>
                <div className="info-kv-row">
                  <FileText size={16} className="info-row-icon" />
                  <div className="info-row-k">Loan Purpose</div>
                  <div className="info-row-v" style={{ textAlign: "right" }}>Business Expansion</div>
                </div>
                <div className="info-kv-row">
                  <IndianRupee size={16} className="info-row-icon" />
                  <div className="info-row-k">Applied For</div>
                  <div className="info-row-v" style={{ textAlign: "right" }}>Business Loan</div>
                </div>

                <button className="btn-outline w-100 flex-align-center gap-2 mt-4" style={{ justifyContent: "center" }} onClick={() => setShowDetailsModal(true)}>
                  <Eye size={14} /> View Full Details
                </button>
              </section>

              <div className="alert-box blue-alert">
                <Info size={16} />
                <span>After login is created, the customer can track loan status, payments and documents.</span>
              </div>

            </div>

          </div>
        </div>
      </div>

      {/* Full Details Modal */}
      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: "16px", fontWeight: 800 }}>Customer Details Summary</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: "24px" }}>
          <h4 className="font-bold text-dark" style={{ fontSize: "14px", marginBottom: "16px", color: "#0f7a4c" }}>Personal Information</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "32px", background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #edf0f2" }}>
            <div><span className="text-muted" style={{fontSize: "12px", display: "block"}}>Full Name</span><span className="font-bold text-dark" style={{fontSize: "13.5px"}}>Ramesh Kumar</span></div>
            <div><span className="text-muted" style={{fontSize: "12px", display: "block"}}>Date of Birth</span><span className="font-bold text-dark" style={{fontSize: "13.5px"}}>12/05/1993</span></div>
            <div><span className="text-muted" style={{fontSize: "12px", display: "block"}}>Gender</span><span className="font-bold text-dark" style={{fontSize: "13.5px"}}>Male</span></div>
            <div><span className="text-muted" style={{fontSize: "12px", display: "block"}}>Marital Status</span><span className="font-bold text-dark" style={{fontSize: "13.5px"}}>Married</span></div>
          </div>

          <h4 className="font-bold text-dark" style={{ fontSize: "14px", marginBottom: "16px", color: "#0f7a4c" }}>Contact & Address</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "32px", background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #edf0f2" }}>
            <div><span className="text-muted" style={{fontSize: "12px", display: "block"}}>Mobile Number</span><span className="font-bold text-dark" style={{fontSize: "13.5px"}}>98765 43210</span></div>
            <div><span className="text-muted" style={{fontSize: "12px", display: "block"}}>Alternate Number</span><span className="font-bold text-dark" style={{fontSize: "13.5px"}}>91234 56789</span></div>
            <div><span className="text-muted" style={{fontSize: "12px", display: "block"}}>Email ID</span><span className="font-bold text-dark" style={{fontSize: "13.5px"}}>ramesh.kumar@gmail.com</span></div>
            <div style={{ gridColumn: "span 2" }}><span className="text-muted" style={{fontSize: "12px", display: "block"}}>Address</span><span className="font-bold text-dark" style={{fontSize: "13.5px"}}>Door No. 12/05, 1st Main Road, KK Nagar, Chennai – 600078, Tamil Nadu</span></div>
          </div>

          <h4 className="font-bold text-dark" style={{ fontSize: "14px", marginBottom: "16px", color: "#0f7a4c" }}>Loan & Occupation</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px", background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #edf0f2" }}>
            <div><span className="text-muted" style={{fontSize: "12px", display: "block"}}>Occupation / Work</span><span className="font-bold text-dark" style={{fontSize: "13.5px"}}>Business</span></div>
            <div><span className="text-muted" style={{fontSize: "12px", display: "block"}}>Monthly Income</span><span className="font-bold text-dark" style={{fontSize: "13.5px"}}>₹ 35,000</span></div>
            <div><span className="text-muted" style={{fontSize: "12px", display: "block"}}>Loan Purpose</span><span className="font-bold text-dark" style={{fontSize: "13.5px"}}>Business Expansion</span></div>
            <div><span className="text-muted" style={{fontSize: "12px", display: "block"}}>Education</span><span className="font-bold text-dark" style={{fontSize: "13.5px"}}>Graduate</span></div>
          </div>
        </Modal.Body>
      </Modal>

    </main>
  );
}
