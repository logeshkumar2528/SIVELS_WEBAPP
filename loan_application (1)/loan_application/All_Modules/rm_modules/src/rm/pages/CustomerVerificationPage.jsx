import React, { useState } from "react";
import { Modal } from "react-bootstrap";
import { 
  ArrowLeft, Copy, User, MapPin, Calendar, CheckCircle2, 
  Phone, Briefcase, FileText, IndianRupee, MessageSquare, 
  Info, CheckSquare, XCircle, ArrowRight, Eye, ShieldAlert,
  AlertCircle, Activity
} from "lucide-react";
import "../Rm.css";

export default function CustomerVerificationPage({ onBack, onProceed }) {
  const [checklist, setChecklist] = useState({
    q1: null, q2: null, q3: null, q4: null, q5: null, q6: null
  });
  const [notes, setNotes] = useState("");
  const [showDocModal, setShowDocModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);

  const handleRadio = (q, val) => setChecklist(prev => ({ ...prev, [q]: val }));

  const openDoc = (docName) => {
    setSelectedDoc(docName);
    setShowDocModal(true);
  };

  return (
    <main className="content">
      {/* Top action row */}
      <div className="flex-align-center" style={{ justifyContent: "flex-end", marginBottom: "16px" }}>
        <button className="btn-outline flex-align-center gap-2" onClick={onBack}>
          <ArrowLeft size={16} /> Back to New Applications
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
        <div className="topbar-divider" style={{height:'32px'}} />
        <div className="meta-item">
          <Activity size={20} className="meta-icon" />
          <div>
            <span className="meta-label">Status</span>
            <div style={{ marginTop: "2px" }}>
              <span className="badge-new" style={{background:'#eafbf1', color:'#16a34a', padding:'2px 10px', borderRadius:'999px', fontSize:'12px', fontWeight:700}}>New</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3-Column Layout */}
      <div className="cv-grid">
        
        {/* Left Col: Customer Summary */}
        <section className="panel" style={{ padding: "0" }}>
          <div style={{ padding: "16px 20px 20px" }}>
            <div className="flex-align-center justify-between" style={{ marginBottom: "16px" }}>
              <h3 className="font-bold text-dark" style={{ fontSize: "15px", margin: 0 }}>Customer Summary</h3>
              <span className="badge-new" style={{ background: '#eafbf1', color: '#16a34a', padding: '2px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700 }}>Pending Verification</span>
            </div>
            
            <div className="flex-col-center text-center">
              <img src="https://ui-avatars.com/api/?name=Ramesh+Kumar&background=eafbf1&color=16a34a&size=100&rounded=true" alt="Ramesh" style={{ width: "64px", height: "64px", borderRadius: "50%", marginBottom: "10px", border: "2px solid #bbf7d0" }} />
              <h2 className="font-bold text-dark" style={{ fontSize: "16px", margin: "0 0 4px" }}>Ramesh Kumar</h2>
              <div className="flex-align-center gap-1 text-dark font-bold" style={{ fontSize: "13px", marginBottom: "4px" }}>
                <Phone size={13} color="#8a94a6" /> 98765 43210
              </div>
              <div className="text-muted" style={{ fontSize: "11.5px", marginBottom: "12px" }}>
                Age: 32 Years &nbsp;|&nbsp; Male
              </div>
              <div style={{ background: "#eafbf1", color: "#16a34a", border: "1px solid #bbf7d0", padding: "4px 14px", borderRadius: "999px", fontSize: "11.5px", fontWeight: "700" }}>
                Applied For: Business Loan
              </div>
            </div>
          </div>
          
          <hr style={{ border: "none", borderTop: "1px solid #edf0f2", margin: "0" }} />
          
          <div style={{ padding: "16px 20px" }}>
            <h4 className="flex-align-center gap-2 font-bold text-dark" style={{ fontSize: "12.5px", marginBottom: "12px", background: "#f8fafc", padding: "6px 10px", borderRadius: "6px", border: "1px solid #edf2f7" }}>
              <FileText size={15} color="#0f7a4c" /> Submitted Information (by Agent)
            </h4>
            
            <div className="info-kv-list" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div className="info-kv-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "#f8fafc", borderRadius: "6px", border: "1px solid #edf2f7", fontSize: "11.5px" }}>
                <span style={{ color: "#8a94a6", fontWeight: 500 }}>Occupation</span>
                <span style={{ fontWeight: 600, color: "#16241f" }}>Business / Retailer</span>
              </div>
              <div className="info-kv-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "#f8fafc", borderRadius: "6px", border: "1px solid #edf2f7", fontSize: "11.5px" }}>
                <span style={{ color: "#8a94a6", fontWeight: 500 }}>Monthly Income</span>
                <span style={{ fontWeight: 700, color: "#16241f" }}>₹ 35,000 - ₹ 50,000</span>
              </div>
              <div className="info-kv-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "#f8fafc", borderRadius: "6px", border: "1px solid #edf2f7", fontSize: "11.5px" }}>
                <span style={{ color: "#8a94a6", fontWeight: 500 }}>Loan Requested</span>
                <span style={{ fontWeight: 700, color: "#16a34a", fontSize: "12.5px" }}>₹ 1,50,000</span>
              </div>
              <div className="info-kv-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "#f8fafc", borderRadius: "6px", border: "1px solid #edf2f7", fontSize: "11.5px" }}>
                <span style={{ color: "#8a94a6", fontWeight: 500 }}>Loan Purpose</span>
                <span style={{ fontWeight: 600, color: "#16241f" }}>Business Expansion</span>
              </div>
              <div className="info-kv-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "#f8fafc", borderRadius: "6px", border: "1px solid #edf2f7", fontSize: "11.5px" }}>
                <span style={{ color: "#8a94a6", fontWeight: 500 }}>Area / Branch</span>
                <span style={{ fontWeight: 600, color: "#16241f" }}>KK Nagar, Chennai</span>
              </div>
              <div className="info-kv-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "#f8fafc", borderRadius: "6px", border: "1px solid #edf2f7", fontSize: "11.5px" }}>
                <span style={{ color: "#8a94a6", fontWeight: 500 }}>Field Agent</span>
                <span style={{ fontWeight: 600, color: "#16241f" }}>Karthik Raja (AGT0001)</span>
              </div>
              <div className="info-kv-row" style={{ display: "flex", flexDirection: "column", gap: "2px", padding: "6px 10px", background: "#f8fafc", borderRadius: "6px", border: "1px solid #edf2f7", fontSize: "11.5px" }}>
                <span style={{ color: "#8a94a6", fontWeight: 500 }}>Remarks by Agent</span>
                <span style={{ fontWeight: 500, color: "#5b6472", lineHeight: 1.3 }}>Customer interested in business expansion loan for store.</span>
              </div>
            </div>
          </div>
        </section>

        {/* Middle Col: Verification Flow */}
        <section className="panel" style={{ padding: "24px" }}>
          {/* Stepper */}
          <div className="stepper-wrap">
            <div className="stepper-line" />
            <div className="step-item active">
              <div className="step-circle">1</div>
              <span className="step-label">Customer<br/>Verification</span>
            </div>
            <div className="step-item">
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

          <h3 className="font-bold text-dark" style={{ fontSize: "16px", marginTop: "32px", marginBottom: "16px" }}>Step 1: Customer Verification</h3>
          
          <div className="alert-box green-alert">
            <Info size={16} />
            <span>Please call the customer and verify the basic details before proceeding.</span>
          </div>

          <h4 className="font-bold text-dark" style={{ fontSize: "14px", marginTop: "24px", marginBottom: "16px" }}>Verification Checklist</h4>
          
          <div className="checklist-container">
            {[
              { id: "q1", label: "1. Did you apply for loan with Sivels Finance?" },
              { id: "q2", label: "2. Are you the correct person?" },
              { id: "q3", label: "3. Purpose of loan verified?" },
              { id: "q4", label: "4. Employment / Business verified?" },
              { id: "q5", label: "5. Expected loan amount confirmed?" },
              { id: "q6", label: "6. Customer agrees to proceed?" }
            ].map(q => (
              <div key={q.id} className="checklist-row">
                <div className="flex-align-center gap-3">
                  <div className="check-icon-box">
                    <CheckSquare size={14} color="#0f7a4c" />
                  </div>
                  <span className="font-bold text-dark" style={{ fontSize: "13.5px" }}>{q.label}</span>
                </div>
                <div className="radio-group">
                  <label className="radio-label">
                    <input type="radio" name={q.id} checked={checklist[q.id] === 'yes'} onChange={() => handleRadio(q.id, 'yes')} /> Yes
                  </label>
                  <label className="radio-label">
                    <input type="radio" name={q.id} checked={checklist[q.id] === 'no'} onChange={() => handleRadio(q.id, 'no')} /> No
                  </label>
                </div>
              </div>
            ))}
          </div>

          <h4 className="font-bold text-dark" style={{ fontSize: "13px", marginTop: "24px", marginBottom: "8px" }}>Verification Notes (Optional)</h4>
          <textarea 
            className="notes-textarea"
            placeholder="Enter notes about the customer verification call..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
          />
          <div className="text-right text-muted" style={{ fontSize: "11px", marginTop: "4px" }}>
            {notes.length} / 500
          </div>

          <div className="flex-align-center" style={{ justifyContent: "space-between", marginTop: "24px" }}>
            <button className="btn-outline flex-align-center gap-2" style={{ color: "#5b6472" }}>
              <XCircle size={16} /> Mark as Invalid
            </button>
            <button className="btn-primary flex-align-center gap-2" onClick={onProceed}>
              Proceed to Aadhaar eKYC <ArrowRight size={16} />
            </button>
          </div>
        </section>

        {/* Right Col: Documents Pane */}
        <section className="panel" style={{ padding: "20px" }}>
          <h3 className="font-bold text-dark" style={{ fontSize: "15px", marginBottom: "20px" }}>Documents Submitted by Agent</h3>
          
          <div className="doc-card">
            <div className="doc-card-header">
              <div className="flex-align-center gap-2 font-bold text-dark">
                <FileText size={16} color="#0f7a4c" /> Aadhaar Card
              </div>
              <span className="badge-available">Available</span>
            </div>
            <div className="doc-card-img-placeholder flex-col-center" style={{ padding: 0 }}>
              <img src="/dummy_aadhaar.jpg" alt="Aadhaar" style={{width: "100%", height:"140px", objectFit:"cover"}} />
            </div>
            <div className="doc-card-footer">
              <button onClick={() => openDoc('Aadhaar Card')} className="btn-view-doc flex-align-center gap-2">
                <Eye size={14} /> View Aadhaar
              </button>
            </div>
          </div>

          <div className="doc-card mt-4">
            <div className="doc-card-header">
              <div className="flex-align-center gap-2 font-bold text-dark">
                <FileText size={16} color="#0f7a4c" /> PAN Card
              </div>
              <span className="badge-available">Available</span>
            </div>
            <div className="doc-card-img-placeholder flex-col-center" style={{ padding: 0 }}>
               <img src="/dummy_pan.jpg" alt="PAN" style={{width: "100%", height:"140px", objectFit:"cover"}} />
            </div>
            <div className="doc-card-footer">
              <button onClick={() => openDoc('PAN Card')} className="btn-view-doc flex-align-center gap-2">
                <Eye size={14} /> View PAN
              </button>
            </div>
          </div>

          <div className="alert-box blue-alert mt-4" style={{ marginTop: "24px" }}>
            <AlertCircle size={16} />
            <span>Original documents will be verified during eKYC process.</span>
          </div>

        </section>
      </div>

      {/* Document Viewer Modal */}
      <Modal show={showDocModal} onHide={() => setShowDocModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: "16px", fontWeight: 800 }}>Document Viewer: {selectedDoc}</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: "0" }}>
          <div style={{ width: "100%", background: "#f8fafc", padding: "24px", display: "flex", justifyContent: "center" }}>
            <img 
              src={selectedDoc === 'Aadhaar Card' ? '/dummy_aadhaar.jpg' : '/dummy_pan.jpg'} 
              alt="Document" 
              style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }} 
            />
          </div>
        </Modal.Body>
      </Modal>

    </main>
  );
}
