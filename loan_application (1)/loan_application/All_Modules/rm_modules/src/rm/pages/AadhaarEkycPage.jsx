import React, { useState } from "react";
import { Modal } from "react-bootstrap";
import { 
  ArrowLeft, Copy, User, MapPin, Calendar, CheckCircle2, 
  Phone, Briefcase, FileText, IndianRupee, MessageSquare, 
  Info, ArrowRight, Eye, AlertCircle, X, Shield, Lock,
  RefreshCw, Check
} from "lucide-react";
import "../Rm.css";

export default function AadhaarEkycPage({ onBack, onProceed }) {
  const [otp, setOtp] = useState(["6", "2", "4", "1", "8", "7"]);
  const [showDocModal, setShowDocModal] = useState(false);

  return (
    <main className="content">
      {/* Top action row */}
      <div className="flex-align-center" style={{ justifyContent: "flex-end", marginBottom: "16px" }}>
        <button className="btn-outline flex-align-center gap-2" onClick={onBack}>
          <ArrowLeft size={16} /> Back to Customer Verification
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
            <h4 className="flex-align-center gap-2 font-bold text-dark" style={{ fontSize: "13px", marginBottom: "16px" }}>
              <FileText size={16} color="#0f7a4c" /> Submitted Information (by Agent)
            </h4>
            
            <div className="info-kv">
              <div className="info-k">Occupation</div>
              <div className="info-v">Business</div>
            </div>
            <div className="info-kv">
              <div className="info-k">Monthly Income (Approx.)</div>
              <div className="info-v">₹ 35,000 - ₹ 50,000</div>
            </div>
            <div className="info-kv">
              <div className="info-k">Loan Amount Requested</div>
              <div className="info-v">₹ 1,50,000</div>
            </div>
            <div className="info-kv">
              <div className="info-k">Loan Purpose</div>
              <div className="info-v">Business Expansion</div>
            </div>
          </div>
        </section>

        {/* Middle & Right Col Wrapper */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', gridColumn: 'span 2' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
            {/* Middle Col: eKYC Form */}
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
                <div className="step-item active">
                  <div className="step-circle">2</div>
                  <span className="step-label">Aadhaar<br/>eKYC</span>
                </div>
                <div className="step-item">
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

              <h3 className="font-bold text-dark" style={{ fontSize: "16px", marginBottom: "6px" }}>Step 2: Aadhaar eKYC Verification</h3>
              <p className="text-muted" style={{ fontSize: "12.5px", marginBottom: "24px" }}>Enter Aadhaar number and verify using OTP received on customer's mobile number.</p>
              
              <div className="input-group" style={{ marginBottom: "20px" }}>
                <label className="input-label">Aadhaar Number</label>
                <div className="input-with-icon">
                  <FileText size={18} className="input-icon" />
                  <input type="text" className="form-input" value="1234 5678 9012" readOnly />
                  <X size={16} className="input-icon-right" />
                </div>
                <div className="input-success-msg flex-align-center gap-1 mt-1">
                  <CheckCircle2 size={12} /> Aadhaar number format is valid
                </div>
              </div>

              <div className="input-group" style={{ marginBottom: "24px" }}>
                <label className="input-label">Registered Mobile Number</label>
                <div className="input-with-icon">
                  <Phone size={18} className="input-icon" />
                  <input type="text" className="form-input" value="98765 43210" readOnly />
                  <div className="input-badge-verified">Verified</div>
                </div>
              </div>

              <div className="input-group" style={{ marginBottom: "24px" }}>
                <label className="input-label">Enter OTP</label>
                <div className="flex-align-center" style={{ justifyContent: "space-between" }}>
                  <div className="flex-align-center gap-3">
                    <Lock size={18} color="#8a94a6" />
                    <div className="otp-container">
                      {otp.map((digit, idx) => (
                        <input key={idx} type="text" className="otp-box" value={digit} readOnly />
                      ))}
                    </div>
                  </div>
                  <button className="btn-text flex-align-center gap-1">
                    <RefreshCw size={14} /> Resend OTP
                  </button>
                </div>
              </div>

              <div className="alert-box green-alert flex-align-center" style={{ justifyContent: "space-between", marginBottom: "24px" }}>
                <div className="flex-align-center gap-2">
                  <CheckCircle2 size={16} /> OTP Verified Successfully
                </div>
                <div className="text-muted" style={{ fontSize: "11px", fontWeight: 600 }}>
                  OTP will expire in 01:45 🕒
                </div>
              </div>

              <div className="flex-align-center gap-3 mt-4">
                <button className="btn-outline flex-1" style={{ justifyContent: "center" }}>Cancel</button>
                <button className="btn-primary flex-1 flex-align-center gap-2" style={{ justifyContent: "center" }} onClick={onProceed}>
                  Verify Aadhaar <ArrowRight size={16} />
                </button>
              </div>
            </section>

            {/* Right Col: Aadhaar Details */}
            <section className="panel" style={{ padding: "24px" }}>
              <div className="flex-align-center" style={{ justifyContent: "space-between", marginBottom: "20px" }}>
                <h3 className="font-bold text-dark" style={{ fontSize: "15px", margin: 0 }}>Aadhaar Details (Fetched)</h3>
                <img src="https://upload.wikimedia.org/wikipedia/en/thumb/c/cf/Aadhaar_Logo.svg/1200px-Aadhaar_Logo.svg.png" alt="Aadhaar" style={{ height: "24px", objectFit: "contain" }} />
              </div>

              <div className="doc-card" style={{ marginBottom: "20px", border: "1px solid #e2e8f0" }}>
                <img src="/dummy_aadhaar.jpg" alt="Aadhaar Front" style={{ width: "100%", height: "180px", objectFit: "cover", display: "block" }} />
              </div>

              <div className="info-kv-row">
                <User size={16} className="info-row-icon" />
                <div className="info-row-k">Name</div>
                <div className="info-row-v">Ramesh Kumar</div>
              </div>
              <div className="info-kv-row">
                <Calendar size={16} className="info-row-icon" />
                <div className="info-row-k">Date of Birth</div>
                <div className="info-row-v">12/05/1993</div>
              </div>
              <div className="info-kv-row">
                <User size={16} className="info-row-icon" />
                <div className="info-row-k">Gender</div>
                <div className="info-row-v">Male</div>
              </div>
              <div className="info-kv-row" style={{ alignItems: "flex-start" }}>
                <MapPin size={16} className="info-row-icon" style={{ marginTop: "2px" }} />
                <div className="info-row-k">Address</div>
                <div className="info-row-v" style={{ lineHeight: "1.4" }}>
                  Door No. 12/05, 1st Main Road,<br/>
                  KK Nagar, Chennai – 600078, Tamil Nadu
                </div>
              </div>

              <button onClick={() => setShowDocModal(true)} className="btn-outline w-100 flex-align-center gap-2 mt-4" style={{ justifyContent: "center" }}>
                <Eye size={14} /> View Full Aadhaar
              </button>
            </section>
          </div>

          <div className="alert-box blue-alert" style={{ justifyContent: "space-between" }}>
            <div className="flex-align-center gap-2">
              <Info size={16} /> eKYC is secured and your customer's data is encrypted.
            </div>
            <div style={{ color: "#3b82f6", fontWeight: 600, fontSize: "12px" }}>
              We do not store Aadhaar number.
            </div>
          </div>

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
