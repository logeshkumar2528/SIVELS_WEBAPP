import React, { useState } from "react";
import { 
  ArrowLeft, Copy, User, MapPin, Calendar, CheckCircle2, 
  Phone, FileText, ArrowRight, Check, Info, ShieldCheck,
  Send, Lock, IndianRupee, Edit3, FileBadge, Home, Landmark,
  Save, FileSignature
} from "lucide-react";
import "../Rm.css";

export default function ReviewSubmitPage({ onBack, onSubmit, onSaveDraft }) {
  const [notes, setNotes] = useState("");

  return (
    <main className="content">
      {/* Top action row */}
      <div className="flex-align-center" style={{ justifyContent: "flex-end", marginBottom: "16px" }}>
        <button className="btn-outline flex-align-center gap-2" onClick={onBack}>
          <ArrowLeft size={16} /> Back to Create Login
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
        
        {/* Left Col: Customer Summary & Progress Status */}
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
            <h4 className="font-bold text-dark" style={{ fontSize: "14px", marginBottom: "20px" }}>
              Progress Status
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
              <div className="flex-align-center gap-3">
                <CheckCircle2 size={18} color="#16a34a" />
                <div style={{ lineHeight: 1.2 }}>
                  <div className="font-bold text-dark" style={{ fontSize: "13px" }}>Create Login</div>
                  <div style={{ color: "#16a34a", fontSize: "12px", fontWeight: 600 }}>Completed</div>
                </div>
              </div>
            </div>

            <hr style={{ border: "none", borderTop: "1px dashed #edf0f2", margin: "0 0 16px 0" }} />

            <div className="flex-align-center" style={{ justifyContent: "space-between" }}>
              <span className="font-bold text-dark" style={{ fontSize: "13px" }}>Overall Status</span>
              <span style={{ background: "#eafbf1", color: "#16a34a", padding: "4px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: 700 }}>Ready to Submit</span>
            </div>
          </div>
        </section>

        {/* Middle & Right Col Wrapper */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', gridColumn: 'span 2' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr', gap: '24px' }}>
            {/* Middle Col: Review Form */}
            <section style={{ padding: "0", background: "transparent", border: "none" }}>
              
              {/* Stepper */}
              <div className="panel" style={{ padding: "24px 24px 0 24px", marginBottom: "20px", borderBottom: "none", borderRadius: "16px 16px 0 0" }}>
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
                  <div className="step-item">
                    <div className="step-circle" style={{ background: "#16a34a", borderColor: "#16a34a", color: "#fff" }}>
                      <Check size={16} strokeWidth={3} />
                    </div>
                    <span className="step-label" style={{ color: "#16241f", fontWeight: 700 }}>Create<br/>Login</span>
                  </div>
                  <div className="step-item active">
                    <div className="step-circle">5</div>
                    <span className="step-label">Review<br/>& Submit</span>
                  </div>
                </div>

                <h3 className="font-bold text-dark" style={{ fontSize: "16px", marginBottom: "6px" }}>Step 5: Review & Submit</h3>
                <p className="text-muted" style={{ fontSize: "12.5px", marginBottom: "24px" }}>Please review all the details before submitting the application to Back Office.</p>
              </div>

              {/* Data Cards (Transparent background wrapper) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Info Grid row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  
                  {/* Customer Information */}
                  <div className="panel review-data-card" style={{ padding: "20px" }}>
                    <div className="flex-align-center" style={{ justifyContent: "space-between", marginBottom: "16px" }}>
                      <div className="flex-align-center gap-2 font-bold text-dark" style={{ fontSize: "14px" }}>
                        <User size={16} color="#0f7a4c" /> Customer Information
                      </div>
                      <button className="btn-text flex-align-center gap-1" style={{ color: "#3b82f6" }}>
                        <Edit3 size={12} /> Edit
                      </button>
                    </div>
                    <div className="review-kv-row">
                      <span className="review-k">Full Name</span>
                      <span className="review-colon">:</span>
                      <span className="review-v">Ramesh Kumar</span>
                    </div>
                    <div className="review-kv-row">
                      <span className="review-k">Mobile Number (Login ID)</span>
                      <span className="review-colon">:</span>
                      <span className="review-v">98765 43210</span>
                    </div>
                    <div className="review-kv-row">
                      <span className="review-k">Date of Birth</span>
                      <span className="review-colon">:</span>
                      <span className="review-v">12/05/1993</span>
                    </div>
                    <div className="review-kv-row">
                      <span className="review-k">Gender</span>
                      <span className="review-colon">:</span>
                      <span className="review-v">Male</span>
                    </div>
                    <div className="review-kv-row" style={{ alignItems: "flex-start" }}>
                      <span className="review-k">Address</span>
                      <span className="review-colon">:</span>
                      <span className="review-v">Door No. 12/05, 1st Main Road,<br/>KK Nagar, Chennai – 600078, Tamil Nadu</span>
                    </div>
                  </div>

                  {/* Loan Information */}
                  <div className="panel review-data-card" style={{ padding: "20px" }}>
                    <div className="flex-align-center" style={{ justifyContent: "space-between", marginBottom: "16px" }}>
                      <div className="flex-align-center gap-2 font-bold text-dark" style={{ fontSize: "14px" }}>
                        <IndianRupee size={16} color="#0f7a4c" /> Loan Information
                      </div>
                      <button className="btn-text flex-align-center gap-1" style={{ color: "#3b82f6" }}>
                        <Edit3 size={12} /> Edit
                      </button>
                    </div>
                    <div className="review-kv-row">
                      <span className="review-k">Loan Purpose</span>
                      <span className="review-colon">:</span>
                      <span className="review-v">Business Expansion</span>
                    </div>
                    <div className="review-kv-row">
                      <span className="review-k">Loan Amount Requested</span>
                      <span className="review-colon">:</span>
                      <span className="review-v">₹ 1,50,000</span>
                    </div>
                    <div className="review-kv-row">
                      <span className="review-k">Monthly Income (Approx.)</span>
                      <span className="review-colon">:</span>
                      <span className="review-v">₹ 35,000</span>
                    </div>
                    <div className="review-kv-row">
                      <span className="review-k">Occupation / Work Type</span>
                      <span className="review-colon">:</span>
                      <span className="review-v">Business</span>
                    </div>
                    <div className="review-kv-row">
                      <span className="review-k">Applied For</span>
                      <span className="review-colon">:</span>
                      <span className="review-v">Business Loan</span>
                    </div>
                  </div>

                </div>

                {/* Documents Uploaded */}
                <div className="panel review-data-card" style={{ padding: "20px" }}>
                  <div className="flex-align-center" style={{ justifyContent: "space-between", marginBottom: "20px" }}>
                    <div className="flex-align-center gap-2 font-bold text-dark" style={{ fontSize: "14px" }}>
                      <FileBadge size={16} color="#0f7a4c" /> Documents Uploaded
                    </div>
                    <button className="btn-text flex-align-center gap-1" style={{ color: "#3b82f6" }}>
                      <Edit3 size={12} /> Edit
                    </button>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
                    
                    {/* Small Doc Card */}
                    <div className="small-doc-card">
                      <span className="small-doc-title">Aadhaar Card</span>
                      <FileText size={24} color="#8a94a6" style={{ margin: "10px 0" }} />
                      <div className="flex-align-center gap-1" style={{ color: "#16a34a", fontSize: "11px", fontWeight: 700 }}>
                        <CheckCircle2 size={12} /> Verified
                      </div>
                    </div>
                    <div className="small-doc-card">
                      <span className="small-doc-title">PAN Card</span>
                      <FileText size={24} color="#8a94a6" style={{ margin: "10px 0" }} />
                      <div className="flex-align-center gap-1" style={{ color: "#16a34a", fontSize: "11px", fontWeight: 700 }}>
                        <CheckCircle2 size={12} /> Verified
                      </div>
                    </div>
                    <div className="small-doc-card">
                      <span className="small-doc-title">Address Proof</span>
                      <Home size={24} color="#8a94a6" style={{ margin: "10px 0" }} />
                      <div className="flex-align-center gap-1" style={{ color: "#16a34a", fontSize: "11px", fontWeight: 700 }}>
                        <CheckCircle2 size={12} /> Verified
                      </div>
                    </div>
                    <div className="small-doc-card">
                      <span className="small-doc-title">Income Proof</span>
                      <IndianRupee size={24} color="#8a94a6" style={{ margin: "10px 0" }} />
                      <div className="flex-align-center gap-1" style={{ color: "#16a34a", fontSize: "11px", fontWeight: 700 }}>
                        <CheckCircle2 size={12} /> Verified
                      </div>
                    </div>
                    <div className="small-doc-card">
                      <span className="small-doc-title">Bank Statement</span>
                      <Landmark size={24} color="#8a94a6" style={{ margin: "10px 0" }} />
                      <div className="flex-align-center gap-1" style={{ color: "#16a34a", fontSize: "11px", fontWeight: 700 }}>
                        <CheckCircle2 size={12} /> Verified
                      </div>
                    </div>

                  </div>
                </div>

                {/* Login Information */}
                <div className="panel review-data-card" style={{ padding: "20px" }}>
                  <div className="flex-align-center" style={{ justifyContent: "space-between", marginBottom: "16px" }}>
                    <div className="flex-align-center gap-2 font-bold text-dark" style={{ fontSize: "14px" }}>
                      <FileSignature size={16} color="#0f7a4c" /> Login Information
                    </div>
                    <button className="btn-text flex-align-center gap-1" style={{ color: "#3b82f6" }}>
                      <Edit3 size={12} /> Edit
                    </button>
                  </div>
                  <div className="flex-align-center" style={{ justifyContent: "space-between" }}>
                    <div className="review-kv-row" style={{ margin: 0 }}>
                      <span className="review-k" style={{ width: "160px" }}>Login ID (Mobile Number)</span>
                      <span className="review-colon">:</span>
                      <span className="review-v">98765 43210</span>
                    </div>
                    <span style={{ background: "#f0fdf4", color: "#16a34a", padding: "6px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: 700 }}>
                      Login will be created after OTP verification
                    </span>
                  </div>
                </div>

                {/* Alert */}
                <div className="alert-box blue-alert">
                  <Info size={16} />
                  <span>After submission, this application will be sent to Back Office for final approval.</span>
                </div>

                {/* Bottom Actions Row */}
                <div className="flex-align-center" style={{ justifyContent: "space-between", marginTop: "12px", gap: "24px" }}>
                  <button className="btn-outline flex-align-center gap-2" style={{ padding: "12px 24px" }} onClick={onSaveDraft}>
                    <Save size={16} /> Save as Draft
                  </button>
                  
                  <div className="flex-align-center gap-3">
                    <button className="btn-outline flex-align-center gap-2" style={{ padding: "12px 24px" }} onClick={onBack}>
                      <ArrowLeft size={16} /> Back
                    </button>
                    <button className="btn-primary flex-align-center gap-2" style={{ padding: "12px 24px", background: "#0f5132" }} onClick={onSubmit}>
                      <Send size={16} /> Submit to Back Office <ArrowRight size={16} />
                    </button>
                  </div>
                </div>

              </div>

            </section>

            {/* Right Col: Checklist & Notes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              <section className="panel" style={{ padding: "24px" }}>
                <h3 className="font-bold text-dark flex-align-center gap-2" style={{ fontSize: "14px", marginBottom: "20px" }}>
                  <ShieldCheck size={18} color="#0f7a4c" /> Verification Checklist
                </h3>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "32px" }}>
                  {[
                    "Customer details verified",
                    "Aadhaar eKYC completed",
                    "Customer registered successfully",
                    "Login created with mobile number",
                    "All documents verified",
                    "All information reviewed"
                  ].map((item, idx) => (
                    <div key={idx} className="flex-align-center gap-2" style={{ fontSize: "12.5px", color: "#16241f", fontWeight: 600 }}>
                      <CheckCircle2 size={16} color="#16a34a" /> {item}
                    </div>
                  ))}
                </div>

                <h3 className="font-bold text-dark" style={{ fontSize: "13px", marginBottom: "12px" }}>RM Notes (Optional)</h3>
                <textarea 
                  className="notes-textarea"
                  placeholder="Enter notes here..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={250}
                  style={{ height: "100px", marginBottom: "4px" }}
                />
                <div className="text-muted" style={{ fontSize: "11px", marginBottom: "24px" }}>
                  {notes.length} / 250 Characters
                </div>

                <div className="alert-box green-alert" style={{ flexDirection: "column", gap: "6px", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "16px" }}>
                  <div className="flex-align-center gap-2 font-bold" style={{ color: "#166534", fontSize: "13px" }}>
                    <CheckCircle2 size={16} /> You are about to submit this application
                  </div>
                  <div style={{ color: "#16241f", fontSize: "11.5px", paddingLeft: "24px", lineHeight: 1.4 }}>
                    Please ensure all details are correct. Once submitted, you cannot edit the application.
                  </div>
                </div>

              </section>

            </div>

          </div>

        </div>
      </div>
    </main>
  );
}
