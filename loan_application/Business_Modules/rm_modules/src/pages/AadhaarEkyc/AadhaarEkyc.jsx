import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import iconMap from '../../config/iconMap';
import StepProgress from '../../components/StepProgress/StepProgress';
import Button from '../../components/Button/Button';
import InfoBar from '../../components/InfoBar/InfoBar';
import Modal from '../../components/Modal/Modal';
import CustomerSummary from '../../components/CustomerSummary/CustomerSummary';
import { ROUTES } from '../../config/routeConfig';
import { useApplicationDraftStore } from '../../state/ApplicationDraftContext';
import { formatDateTime } from '../../utils/dateHelper';
import './AadhaarEkyc.css';

export default function AadhaarEkyc() {
  const navigate = useNavigate();
  const { applicationId } = useParams();
  const appId = applicationId;
  const { getApplication, ensureApplication } = useApplicationDraftStore();

  useEffect(() => {
    ensureApplication(appId);
  }, [appId, ensureApplication]);

  const appData = getApplication(appId);

  const customerData = {
    appId: appData.id,
    name: appData.customerName,
    status: appData.status || 'Pending Verification',
    mobile: appData.mobile,
    age: '32 Years',
    gender: 'Male',
    loanType: appData.loanProductDisplay || appData.loanType || 'Business Loan',
    occupation: 'Business',
    income: 'Rs. 35,000 - Rs. 50,000',
    loanAmount: appData.loanAmountDisplay || appData.amount || 'Rs. 1,50,000',
    loanPurpose: appData.purposeOfLoan || appData.loanType || 'Business Expansion',
    address: appData.address || 'KK Nagar, Chennai - 600078',
    aadhaarNo: appData.aadhaarNo ? `XXXX XXXX ${appData.aadhaarNo.slice(-4)}` : 'XXXX XXXX 3210',
    agentName: appData.agentName || 'Karthik Raja',
    createdDate: appData.createdDate || '05 Jun 2025',
    agentRemarks: 'Customer interested in business loan.',
  };

  const [aadhaarNo, setAadhaarNo] = useState(appData.aadhaarNo || '1234 5678 9012');
  const [mobileNo] = useState(appData.mobile || '98765 43210');
  const [otp, setOtp] = useState(['6', '2', '4', '1', '8', '7']);
  const [isOtpVerified] = useState(true);
  const [showDocModal, setShowDocModal] = useState(false);

  const ArrowRightIcon = iconMap['ArrowRight'];
  const ArrowLeftIcon = iconMap['ArrowLeft'];
  const CheckCircle2Icon = iconMap['CheckCircle2'];
  const PhoneIcon = iconMap['Phone'];
  const FileTextIcon = iconMap['FileText'];
  const EyeIcon = iconMap['Eye'];
  const InfoIcon = iconMap['Info'];
  const XIcon = iconMap['X'];
  const RefreshCwIcon = iconMap['RefreshCw'];
  const MapPinIcon = iconMap['MapPin'];
  const CalendarIcon = iconMap['Calendar'];
  const UserIcon = iconMap['User'];
  const TimerIcon = iconMap['Timer'] || iconMap['Clock'];

  const steps = [
    { id: '1', label: 'Application Details' },
    { id: '2', label: 'Customer Verification' },
    { id: '3', label: 'Aadhaar eKYC' },
    { id: '4', label: 'Customer Registration' },
    { id: '5', label: 'Create Login' },
    { id: '6', label: 'Review & Submit' },
  ];

  const handleProceed = () => {
    navigate(ROUTES.CUSTOMER_REGISTRATION.replace(':applicationId', appId));
  };

  const handleBack = () => {
    navigate(ROUTES.CUSTOMER_VERIFICATION.replace(':applicationId', appId));
  };

  return (
    <div className="page-container--no-scroll akyc-page-root">
      <div className="akyc-topbar">
        <div className="akyc-infobar-wrap">
          <InfoBar
            appId={appData.applicationNumber || appData.id}
            agentName={`${appData.agentName || 'Karthik Raja'} (AGT0001)`}
            branch={appData.branch || 'KK Nagar'}
            submittedTime={formatDateTime(appData.createdDate || appData.createdAt, 'Not submitted')}
            status={appData.status || 'Pending Verification'}
          />
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={ArrowLeftIcon ? <ArrowLeftIcon size={14} /> : null}
          onClick={handleBack}
        >
          Back to Customer Verification
        </Button>
      </div>

      <div className="akyc-main-grid">
        <div className="akyc-left-col">
          <CustomerSummary customer={customerData} />
        </div>

        <div className="akyc-center-col">
          <StepProgress steps={steps} activeStep={3} />

          <div className="akyc-form-card">
            <div className="akyc-form-header">
              <div>
                <h3 className="akyc-form-title">Step 3: Aadhaar eKYC Verification</h3>
                <p className="akyc-form-sub">Enter Aadhaar number and verify using OTP received on customer's mobile number.</p>
              </div>
            </div>

            <div className="akyc-field-group">
              <label className="akyc-label">Aadhaar Number</label>
              <div className="akyc-input-row">
                {FileTextIcon && <FileTextIcon size={15} className="akyc-input-icon" />}
                <input
                  type="text"
                  className="akyc-input font-mono"
                  value={aadhaarNo}
                  onChange={(e) => setAadhaarNo(e.target.value)}
                  placeholder="XXXX XXXX XXXX"
                />
                {XIcon && (
                  <button className="akyc-clear-btn" onClick={() => setAadhaarNo('')}>
                    <XIcon size={14} />
                  </button>
                )}
              </div>
              <span className="akyc-valid-msg">
                {CheckCircle2Icon && <CheckCircle2Icon size={12} />}
                Aadhaar number format is valid
              </span>
            </div>

            <div className="akyc-field-group">
              <label className="akyc-label">Registered Mobile Number</label>
              <div className="akyc-input-row">
                {PhoneIcon && <PhoneIcon size={15} className="akyc-input-icon" />}
                <input
                  type="text"
                  className="akyc-input"
                  value={mobileNo}
                  readOnly
                />
                <span className="akyc-verified-badge">
                  {CheckCircle2Icon && <CheckCircle2Icon size={11} />} Verified
                </span>
              </div>
            </div>

            <div className="akyc-field-group">
              <div className="akyc-label-row">
                <label className="akyc-label">Enter OTP</label>
                <button className="akyc-resend-btn">
                  {RefreshCwIcon && <RefreshCwIcon size={11} />} Resend OTP
                </button>
              </div>
              <div className="akyc-otp-row">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    type="text"
                    maxLength={1}
                    className="akyc-otp-box"
                    value={digit}
                    onChange={(e) => {
                      const newOtp = [...otp];
                      newOtp[idx] = e.target.value;
                      setOtp(newOtp);
                    }}
                  />
                ))}
              </div>
            </div>

            {isOtpVerified && (
              <div className="akyc-otp-success-bar">
                <div className="akyc-success-left">
                  {CheckCircle2Icon && <CheckCircle2Icon size={15} />}
                  <span>OTP Verified Successfully</span>
                </div>
                <div className="akyc-success-right">
                  OTP will expire in 01:45
                  {TimerIcon && <TimerIcon size={13} />}
                </div>
              </div>
            )}

            <div className="akyc-form-footer">
              <Button variant="secondary" size="sm" onClick={handleBack}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={ArrowRightIcon ? <ArrowRightIcon size={15} /> : null}
                iconPosition="right"
                onClick={handleProceed}
              >
                Verify Aadhaar
              </Button>
            </div>

            <div className="akyc-security-note">
              {InfoIcon && <InfoIcon size={13} className="akyc-info-icon" />}
              <span>eKYC is secured and your customer's data is encrypted.</span>
              <span className="akyc-note-sep">Rs.</span>
              <span>We do not store Aadhaar number.</span>
            </div>
          </div>
        </div>

        <div className="akyc-right-col">
          <div className="akyc-details-card">
            <div className="akyc-details-header">
              <h3 className="akyc-details-title">Aadhaar Details (Fetched)</h3>
              <div className="akyc-aadhaar-logo-group">
                <div className="akyc-aadhaar-logo">
                  <span className="logo-sun">Sun</span>
                  <span className="logo-text">AADHAAR</span>
                </div>
              </div>
            </div>

            <div className="akyc-id-card">
              <div className="akyc-card-gov-header">
                <div className="akyc-card-emblem">Rs.</div>
                <div className="akyc-card-gov-text">
                  <span className="gov-hindi">Rs. Rs.</span>
                  <span className="gov-english">GOVERNMENT OF INDIA</span>
                </div>
                <div className="akyc-tricolor-strip" />
              </div>

              <div className="akyc-card-body">
                <div className="akyc-card-photo">
                  <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(appData.customerName || 'Ramesh Kumar')}&background=1b5e20&color=ffffff&size=128&bold=true`}
                    alt="Aadhaar Photo"
                    className="akyc-card-photo-img"
                  />
                </div>
                <div className="akyc-card-details">
                  <div className="akyc-card-field">
                    <span className="akyc-cf-label">Name</span>
                    <span className="akyc-cf-val bold-cap">{(appData.customerName || 'RAMESH KUMAR').toUpperCase()}</span>
                  </div>
                  <div className="akyc-card-field-row">
                    <div className="akyc-card-field">
                      <span className="akyc-cf-label">DOB</span>
                      <span className="akyc-cf-val">12/05/1993</span>
                    </div>
                    <div className="akyc-card-field">
                      <span className="akyc-cf-label">Gender</span>
                      <span className="akyc-cf-val">MALE</span>
                    </div>
                  </div>
                  <div className="akyc-card-number">{appData.aadhaarNo || '1234 5678 9012'}</div>
                </div>
                <div className="akyc-card-qr">
                  <div className="akyc-qr-box">QR</div>
                </div>
              </div>

              <div className="akyc-card-tagline">Rs. Rs., Rs. Rs.</div>
            </div>

            <div className="akyc-fetched-list">
              <div className="akyc-fetched-row">
                <span className="afr-icon">{UserIcon && <UserIcon size={13} />}</span>
                <span className="afr-key">Name</span>
                <span className="afr-val">{appData.customerName || 'Ramesh Kumar'}</span>
              </div>
              <div className="akyc-fetched-row">
                <span className="afr-icon">{CalendarIcon && <CalendarIcon size={13} />}</span>
                <span className="afr-key">Date of Birth</span>
                <span className="afr-val">12/05/1993</span>
              </div>
              <div className="akyc-fetched-row">
                <span className="afr-icon">{UserIcon && <UserIcon size={13} />}</span>
                <span className="afr-key">Gender</span>
                <span className="afr-val">Male</span>
              </div>
              <div className="akyc-fetched-row">
                <span className="afr-icon">{UserIcon && <UserIcon size={13} />}</span>
                <span className="afr-key">Father's Name</span>
                <span className="afr-val">S. Kumar</span>
              </div>
              <div className="akyc-fetched-row">
                <span className="afr-icon">{PhoneIcon && <PhoneIcon size={13} />}</span>
                <span className="afr-key">Mobile</span>
                <span className="afr-val">XXXXXXX210</span>
              </div>
              <div className="akyc-fetched-row">
                <span className="afr-icon">{FileTextIcon && <FileTextIcon size={13} />}</span>
                <span className="afr-key">Aadhaar No.</span>
                <span className="afr-val font-mono">XXXX XXXX 9012</span>
              </div>
              <div className="akyc-fetched-row akyc-fetched-row--top">
                <span className="afr-icon">{MapPinIcon && <MapPinIcon size={13} />}</span>
                <span className="afr-key">Address</span>
                <span className="afr-val afr-addr">Door No. 12/05, 1st Main Road, KK Nagar, Chennai - 600078, Tamil Nadu</span>
              </div>
            </div>

            <div className="akyc-view-btn-wrap">
              <Button
                variant="outline"
                fullWidth
                size="sm"
                icon={EyeIcon ? <EyeIcon size={14} /> : null}
                onClick={() => setShowDocModal(true)}
              >
                View Full Aadhaar
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Modal show={showDocModal} onHide={() => setShowDocModal(false)} title="UIDAI Aadhaar Document Preview" size="lg">
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <div className="doc-modal-display">Rs. Official Aadhaar Card Document Preview</div>
          <p className="text-muted" style={{ marginTop: '12px' }}>Verified & signed by UIDAI authority.</p>
        </div>
      </Modal>
    </div>
  );
}
