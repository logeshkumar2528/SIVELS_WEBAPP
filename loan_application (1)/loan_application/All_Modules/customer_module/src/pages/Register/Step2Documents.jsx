import React, { useState, useRef, useEffect } from 'react';
import { CreditCard, Landmark, Fingerprint, UploadCloud, CheckCircle2, Smartphone, ShieldCheck, Trash2, ArrowLeft } from 'lucide-react';
import './Register.css'; // Uses shared styles

export default function Step2Documents({ initialData, onBack, onRegister }) {
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(120);
  
  // File states
  const [panFile, setPanFile] = useState(null);
  const [bankFile, setBankFile] = useState(null);
  const [userPhotoFile, setUserPhotoFile] = useState(null);
  const [aadhaarFile, setAadhaarFile] = useState(null);

  // Preview URL states
  const [panPreview, setPanPreview] = useState(null);
  const [bankPreview, setBankPreview] = useState(null);
  const [userPhotoPreview, setUserPhotoPreview] = useState(null);
  const [aadhaarPreview, setAadhaarPreview] = useState(null);

  // Refs
  const panInputRef = useRef(null);
  const bankInputRef = useRef(null);
  const userPhotoInputRef = useRef(null);
  const aadhaarInputRef = useRef(null);
  const otpInputRefs = useRef([]);

  useEffect(() => {
    if (otpSent && timeLeft > 0) {
      const timerId = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timerId);
    }
  }, [otpSent, timeLeft]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onRegister({ panFile, bankFile, userPhotoFile, aadhaarFile });
  };

  const handleSendOTP = () => {
    setOtpSent(true);
    setTimeLeft(120);
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus to next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    // Auto-focus to previous input on backspace if current is empty
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleFileChange = (e, setFile, setPreview) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFile(file);
      setPreview({
        url: URL.createObjectURL(file),
        isPdf: file.type === 'application/pdf'
      });
    }
  };

  const handleClearFile = (setFile, ref, setPreview) => {
    setFile(null);
    setPreview(null);
    if (ref.current) {
      ref.current.value = '';
    }
  };

  const renderPreview = (preview, fallbackMock) => {
    if (!preview) return (
      <div className="preview-container">
        {fallbackMock}
      </div>
    );
    
    if (preview.isPdf) {
      return (
        <div className="preview-container" style={{ border: '1px solid #ccc' }}>
          <iframe src={preview.url} style={{ width: '100%', height: '100%', border: 'none' }} title="Document Preview" />
        </div>
      );
    }
    
    return (
      <div className="preview-container" style={{ border: '1px solid #ccc', backgroundColor: 'white' }}>
        <img src={preview.url} alt="Document Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Combined PAN & Bank Card */}
      <div className="form-section doc-verify-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ borderBottom: '1px solid #eee', paddingBottom: '16px' }}>
          <h4 style={{ margin: '0 0 4px 0' }}>Identity & Financial Documents</h4>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)' }}>Upload your PAN card and Bank passbook securely.</p>
        </div>

        <div style={{ display: 'flex', gap: '32px' }}>
          
          {/* PAN Group */}
          <div style={{ display: 'flex', flex: '1', gap: '16px' }}>
            <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="doc-icon-box" style={{ width: '36px', height: '36px' }}>
                  <CreditCard size={18} color="var(--color-primary)" />
                </div>
                <div>
                  <h5 style={{ margin: 0, fontSize: '14px' }}>PAN Card</h5>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Upload clear image</span>
                </div>
              </div>

              <div className={`doc-upload-box ${panFile ? 'uploaded' : ''}`} onClick={() => panInputRef.current.click()} style={{ height: '180px' }}>
                <input 
                  type="file" 
                  ref={panInputRef} 
                  style={{ display: 'none' }} 
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => handleFileChange(e, setPanFile, setPanPreview)} 
                />
                {panFile ? (
                  <>
                    <CheckCircle2 size={24} color="var(--color-success, #16A34A)" />
                    <span className="upload-title" style={{ color: 'var(--color-success, #16A34A)' }}>{panFile.name}</span>
                    <span className="upload-subtitle">Selected successfully</span>
                  </>
                ) : (
                  <>
                    <UploadCloud size={24} className="upload-icon" />
                    <span className="upload-title">Click to upload PAN card</span>
                    <span className="upload-subtitle">(JPG, PNG, PDF)</span>
                  </>
                )}
              </div>
            </div>

            <div className="doc-preview-section" style={{ width: '260px', height: 'auto', padding: '12px', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '12px' }}>
                <span className="preview-label" style={{ margin: 0 }}>Preview</span>
                {panFile && (
                  <button type="button" className="btn-clear" onClick={() => handleClearFile(setPanFile, panInputRef, setPanPreview)} style={{ padding: '4px 8px', fontSize: '11px', height: 'auto' }}>
                    <Trash2 size={12}/> Clear
                  </button>
                )}
              </div>
              {renderPreview(panPreview, (
                <div className="mock-card mock-pan">
                  <div className="mock-pan-header">
                    <span>आयकर विभाग</span>
                    <span>भारत सरकार</span>
                    <span style={{ fontSize: '6px', color: '#666' }}>INCOME TAX DEPARTMENT</span>
                    <span style={{ fontSize: '6px', color: '#666' }}>GOVT. OF INDIA</span>
                  </div>
                  <div className="mock-pan-body">
                    <div className="mock-pan-details">
                      <div className="mock-field"><label>Permanent Account Number</label><span>ABCDE1234F</span></div>
                      <div className="mock-field"><label>Name</label><span>Example Name</span></div>
                    </div>
                    <div className="mock-pan-photo"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bank Group */}
          <div style={{ display: 'flex', flex: '1', gap: '16px' }}>
            <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="doc-icon-box" style={{ width: '36px', height: '36px' }}>
                  <Landmark size={18} color="var(--color-primary)" />
                </div>
                <div>
                  <h5 style={{ margin: 0, fontSize: '14px' }}>Bank Passbook</h5>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Upload first page</span>
                </div>
              </div>

              <div className={`doc-upload-box ${bankFile ? 'uploaded' : ''}`} onClick={() => bankInputRef.current.click()} style={{ height: '180px' }}>
                <input 
                  type="file" 
                  ref={bankInputRef} 
                  style={{ display: 'none' }} 
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => handleFileChange(e, setBankFile, setBankPreview)} 
                />
                {bankFile ? (
                  <>
                    <CheckCircle2 size={24} color="var(--color-success, #16A34A)" />
                    <span className="upload-title" style={{ color: 'var(--color-success, #16A34A)' }}>{bankFile.name}</span>
                    <span className="upload-subtitle">Selected successfully</span>
                  </>
                ) : (
                  <>
                    <UploadCloud size={24} className="upload-icon" />
                    <span className="upload-title">Click to upload bank book</span>
                    <span className="upload-subtitle">(JPG, PNG, PDF)</span>
                  </>
                )}
              </div>
            </div>

            <div className="doc-preview-section" style={{ width: '260px', height: 'auto', padding: '12px', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '12px' }}>
                <span className="preview-label" style={{ margin: 0 }}>Preview</span>
                {bankFile && (
                  <button type="button" className="btn-clear" onClick={() => handleClearFile(setBankFile, bankInputRef, setBankPreview)} style={{ padding: '4px 8px', fontSize: '11px', height: 'auto' }}>
                    <Trash2 size={12}/> Clear
                  </button>
                )}
              </div>
              {renderPreview(bankPreview, (
                <div className="mock-card mock-bank">
                  <div className="mock-bank-header">
                    <Landmark size={12} color="white" />
                    <span>ABC BANK</span>
                  </div>
                  <div className="mock-bank-body">
                    <div className="mock-bank-row"><label>Account Holder Name</label><span>Example Name</span></div>
                    <div className="mock-bank-row"><label>Account Number</label><span>123456789012</span></div>
                    <div className="mock-bank-row"><label>IFSC Code</label><span>ABCD0123456</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Combined Profile & Verification */}
      <div className="form-section doc-verify-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ borderBottom: '1px solid #eee', paddingBottom: '16px' }}>
          <h4 style={{ margin: '0 0 4px 0' }}>Profile Photo & Verification</h4>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)' }}>Upload your photo and verify your Aadhaar number.</p>
        </div>

        <div style={{ display: 'flex', gap: '32px' }}>
          
          {/* Left: User Photo */}
          <div style={{ display: 'flex', flex: '1', gap: '16px' }}>
            <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="doc-icon-box" style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </div>
                <div>
                  <h5 style={{ margin: 0, fontSize: '14px' }}>User Photo</h5>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Passport sized photo</span>
                </div>
              </div>

              <div className={`doc-upload-box ${userPhotoFile ? 'uploaded' : ''}`} onClick={() => userPhotoInputRef.current.click()} style={{ height: '180px' }}>
                <input 
                  type="file" 
                  ref={userPhotoInputRef} 
                  style={{ display: 'none' }} 
                  accept=".jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(e, setUserPhotoFile, setUserPhotoPreview)} 
                />
                {userPhotoFile ? (
                  <>
                    <CheckCircle2 size={24} color="var(--color-success, #16A34A)" />
                    <span className="upload-title" style={{ color: 'var(--color-success, #16A34A)' }}>{userPhotoFile.name}</span>
                    <span className="upload-subtitle">Selected successfully</span>
                  </>
                ) : (
                  <>
                    <UploadCloud size={24} className="upload-icon" />
                    <span className="upload-title">Click to upload your photo</span>
                    <span className="upload-subtitle">(JPG, PNG)</span>
                  </>
                )}
              </div>
            </div>

            <div className="doc-preview-section" style={{ width: '240px', height: 'auto', padding: '12px', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '12px' }}>
                <span className="preview-label" style={{ margin: 0 }}>Preview</span>
                {userPhotoFile && (
                  <button type="button" className="btn-clear" onClick={() => handleClearFile(setUserPhotoFile, userPhotoInputRef, setUserPhotoPreview)} style={{ padding: '4px 8px', fontSize: '11px', height: 'auto' }}>
                    <Trash2 size={12}/> Clear
                  </button>
                )}
              </div>
              {renderPreview(userPhotoPreview, (
                <div className="mock-card mock-user-photo">
                  <div className="mock-user-photo-body">
                    <div className="mock-user-silhouette">
                      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="#E0E0E0" stroke="#BDBDBD" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Aadhaar Verification */}
          <div style={{ display: 'flex', flex: '1', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="doc-icon-box" style={{ width: '36px', height: '36px' }}>
                <Smartphone size={18} color="var(--color-primary)" />
              </div>
              <div>
                <h5 style={{ margin: 0, fontSize: '14px' }}>Aadhaar Verification</h5>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>OTP based verification</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', background: '#F8FBF9', padding: '12px 16px', borderRadius: '8px', border: '1px solid #EAF5EE', height: '180px', boxSizing: 'border-box' }}>
              
              <div style={{ display: 'flex', gap: '12px', width: '100%', alignItems: 'flex-end', marginBottom: otpSent ? '10px' : '0' }}>
                <div className="form-group" style={{ flex: '1', margin: 0 }}>
                  <label style={{ fontSize: '12px', marginBottom: '4px', whiteSpace: 'nowrap' }}>Aadhaar Number</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Enter 12 digit Aadhaar number" 
                    maxLength={12} 
                    disabled={otpSent}
                    style={{ height: '34px', marginBottom: 0, width: '100%' }}
                  />
                </div>
                
                {!otpSent && (
                  <button type="button" className="btn-primary" onClick={handleSendOTP} style={{ height: '34px', padding: '0 24px', whiteSpace: 'nowrap', width: 'auto', flex: 'none', minWidth: '120px' }}>
                    Send OTP
                  </button>
                )}
              </div>

              {otpSent && (
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '8px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '11px', margin: 0 }}>Enter OTP</label>
                      <div className="otp-timer-col" style={{ flexDirection: 'row', gap: '8px', alignItems: 'center' }}>
                        <span className="otp-timer" style={{ fontSize: '11px', margin: 0 }}>{formatTime(timeLeft)}</span>
                        <button 
                          type="button" 
                          style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '11px', fontWeight: '600', cursor: timeLeft > 0 ? 'not-allowed' : 'pointer', opacity: timeLeft > 0 ? 0.5 : 1, padding: 0 }}
                          onClick={timeLeft === 0 ? handleSendOTP : undefined}
                        >
                          Resend
                        </button>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-start' }}>
                      {otp.map((digit, index) => (
                        <input
                          key={index}
                          ref={(el) => (otpInputRefs.current[index] = el)}
                          type="text"
                          className="otp-box"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(index, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(index, e)}
                          style={{ width: '36px', height: '36px', margin: 0, padding: 0, textAlign: 'center' }}
                        />
                      ))}
                    </div>
                  </div>

                  {otp.join('').length === 6 ? (
                    <button 
                      type="button" 
                      className="btn-primary" 
                      style={{ padding: '0', height: '32px', maxWidth: '288px', fontSize: '12px', marginTop: 'auto' }}
                      onClick={() => alert('OTP Verified Successfully!')}
                    >
                      Verify OTP
                    </button>
                  ) : (
                    <div className="otp-success-badge" style={{ padding: '0 8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', margin: 0, height: '32px', boxSizing: 'border-box', marginTop: 'auto' }}>
                      <ShieldCheck size={14} className="success-icon" />
                      <span>OTP sent to registered mobile</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      <div className="form-actions" style={{ marginTop: '8px' }}>
        <button type="button" className="btn-secondary" onClick={onBack} style={{ backgroundColor: 'white', border: '1px solid var(--color-primary)', color: 'var(--color-primary)' }}>
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <button type="submit" className="btn-primary small" style={{ padding: '12px 24px', backgroundColor: 'var(--color-primary)' }}>
          <CheckCircle2 size={16} />
          <span>Verify & Register</span>
        </button>
      </div>

    </form>
  );
}

// Ensure Lock is imported by adding it if it wasn't. Ah, I missed importing Lock.
