import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import iconMap from '../../config/iconMap';
import InfoBar from '../../components/InfoBar/InfoBar';
import StepProgress from '../../components/StepProgress/StepProgress';
import CustomerSummary from '../../components/CustomerSummary/CustomerSummary';
import Button from '../../components/Button/Button';
import { ROUTES } from '../../config/routeConfig';
import { useApplicationDraftStore } from '../../state/ApplicationDraftContext';
import { formatDateTime } from '../../utils/dateHelper';
import '../CustomerVerification/CustomerVerification.css';
import './CreateLogin.css';

function joinAddress(address = {}) {
  return [address.line1, address.line2, address.city, address.state, address.pincode]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(', ');
}

export default function CreateLogin() {
  const navigate = useNavigate();
  const { applicationId } = useParams();
  const appId = applicationId;
  const { getApplication, ensureApplication } = useApplicationDraftStore();

  useEffect(() => {
    ensureApplication(appId);
  }, [appId, ensureApplication]);

  const appData = getApplication(appId);
  const registration = appData.registration || {};
  const primaryApplicant = registration.primaryApplicant || {};
  const addressDetails = registration.address || {};
  const employmentDetails = registration.employment || {};

  const customerData = {
    appId: appData.id,
    name: primaryApplicant.fullName || appData.customerName,
    status: appData.status,
    mobile: primaryApplicant.mobile || appData.mobile,
    age: appData.age,
    gender: primaryApplicant.gender || appData.gender,
    loanType: appData.loanProductDisplay || appData.loanType,
    occupation: employmentDetails.occupation || appData.occupation,
    income: employmentDetails.totalMonthlyIncome || appData.income,
    loanAmount: appData.loanAmountDisplay || appData.amount,
    loanPurpose: appData.purposeOfLoan || appData.loanType,
    address: joinAddress(addressDetails.current) || appData.address,
    aadhaarNo: appData.aadhaarNo ? `XXXX XXXX ${appData.aadhaarNo.slice(-4)}` : 'XXXX XXXX 3210',
    agentName: appData.agentName,
    createdDate: appData.createdDate,
    agentRemarks: appData.agentRemarks,
  };

  const ArrowRightIcon = iconMap['ArrowRight'];
  const ArrowLeftIcon = iconMap['ArrowLeft'];
  const UserIcon = iconMap['User'];
  const CheckCircle2Icon = iconMap['CheckCircle2'];
  const PhoneIcon = iconMap['Phone'];
  const ShieldCheckIcon = iconMap['ShieldCheck'];
  const InfoIcon = iconMap['Info'];
  const BriefcaseIcon = iconMap['Briefcase'];
  const IndianRupeeIcon = iconMap['IndianRupee'];
  const EyeIcon = iconMap['Eye'];
  const SendIcon = iconMap['Send'];
  const RefreshCwIcon = iconMap['RefreshCw'];

  const steps = [
    { id: '1', label: 'Application Details' },
    { id: '2', label: 'Customer Verification' },
    { id: '3', label: 'Aadhaar eKYC' },
    { id: '4', label: 'Customer Registration' },
    { id: '5', label: 'Create Login' },
    { id: '6', label: 'Review & Submit' },
  ];

  const handleProceed = () => {
    navigate(ROUTES.REVIEW_SUBMIT.replace(':applicationId', appId));
  };

  const handleBack = () => {
    navigate(ROUTES.CUSTOMER_REGISTRATION.replace(':applicationId', appId));
  };

  return (
    <div className="page-container--no-scroll" style={{ gap: '10px' }}>
      <div className="cv-top-bar-row">
        <div className="cv-infobar-flex">
          <InfoBar
            appId={customerData.appId}
            agentName={`${customerData.agentName} (AGT0001)`}
            branch={customerData.address ? customerData.address.split(',')[0] : 'KK Nagar'}
            submittedTime={formatDateTime(customerData.createdDate || customerData.createdAt, 'Not submitted')}
            status={customerData.status}
          />
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={ArrowLeftIcon ? <ArrowLeftIcon size={14} /> : null}
          onClick={handleBack}
        >
          Back to Customer Registration
        </Button>
      </div>

      <div className="cv-main-grid">
        <div className="cv-left-col">
          <CustomerSummary customer={customerData} />

          <div className="panel" style={{ marginTop: '12px' }}>
            <h3 className="cv-section-title" style={{ marginBottom: '12px' }}>Verification Status</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                {CheckCircle2Icon && <CheckCircle2Icon size={16} className="text-success" />}
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>Customer Verification</div>
                  <div className="text-success" style={{ fontSize: '11px', fontWeight: 600 }}>Completed</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                {CheckCircle2Icon && <CheckCircle2Icon size={16} className="text-success" />}
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>Aadhaar eKYC</div>
                  <div className="text-success" style={{ fontSize: '11px', fontWeight: 600 }}>Verified</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                {CheckCircle2Icon && <CheckCircle2Icon size={16} className="text-success" />}
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>Customer Registration</div>
                  <div className="text-success" style={{ fontSize: '11px', fontWeight: 600 }}>Completed</div>
                </div>
              </div>
            </div>
            <div style={{ borderTop: '1px solid #edf2f7', marginTop: '12px', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Overall Status</span>
              <span className="badge-available">All Verified</span>
            </div>
          </div>
        </div>

        <div className="cv-center-col">
          <StepProgress steps={steps} activeStep={5} />

          <div className="panel cv-form-panel">
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <h3 className="cv-section-title">Step 5: Create Customer Login</h3>
              <p className="text-muted" style={{ fontSize: '11.5px', marginTop: '4px' }}>
                Customer login will be created using the mobile number. OTP will be sent for verification.
              </p>

              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="form-label" style={{ fontSize: '11.5px', fontWeight: 700 }}>Mobile Number (Login ID)</label>
                <div className="input-with-icon" style={{ marginTop: '4px' }}>
                  {PhoneIcon && <PhoneIcon size={16} className="input-icon" />}
                  <input
                    type="text"
                    className="form-input input-padded"
                    value={appData.mobile || '98765 43210'}
                    readOnly
                    style={{ background: '#f8fafc', color: '#0f172a', fontWeight: 600 }}
                  />
                </div>
                <span className="text-success" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontWeight: 600 }}>
                  {CheckCircle2Icon && <CheckCircle2Icon size={13} />}
                  This mobile number will be used as Login ID
                </span>
              </div>

              <div style={{ marginTop: '16px' }}>
                <h4 className="cv-sub-title">Send OTP for Login Verification</h4>
                <p className="text-muted" style={{ fontSize: '11px', marginBottom: '10px' }}>
                  Click the button below to send OTP to the customer's mobile number.
                </p>
                <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '8px', border: '1px solid #bbf7d0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ background: '#dcfce7', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {PhoneIcon && <PhoneIcon size={18} className="text-success" />}
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#166534', fontWeight: 500 }}>Mobile Number</div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#14532d' }}>{appData.mobile || '98765 43210'}</div>
                    </div>
                  </div>
                  <Button variant="primary" fullWidth icon={SendIcon ? <SendIcon size={15} /> : null}>Send OTP</Button>
                </div>
              </div>

              <div style={{ marginTop: '20px' }}>
                <label className="form-label" style={{ fontSize: '11.5px', fontWeight: 700 }}>Enter OTP</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', marginTop: '6px' }}>
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <input
                      key={i}
                      type="text"
                      maxLength={1}
                      style={{ width: '42px', height: '42px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '16px', fontWeight: 600, color: '#0f172a', background: '#f8fafc', outline: 'none' }}
                      placeholder="-"
                    />
                  ))}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginLeft: 'auto', marginRight: '8px' }}>
                    <span className="text-success font-bold" style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {iconMap['Clock'] && <iconMap.Clock size={14} />} 01:49
                    </span>
                    <span className="text-muted" style={{ fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', fontWeight: 600 }}>
                      {RefreshCwIcon && <RefreshCwIcon size={10} />} Resend OTP
                    </span>
                  </div>
                </div>
              </div>

              <div className="alert-banner alert-banner--blue" style={{ marginTop: 'auto', marginBottom: '16px' }}>
                {InfoIcon && <InfoIcon size={14} />}
                <span>OTP will be valid for 2 minutes.</span>
              </div>
            </div>

            <div className="cv-action-footer flex-align-center justify-between" style={{ marginTop: '0', paddingTop: '16px', flexShrink: 0 }}>
              <Button variant="secondary" onClick={handleBack} size="sm">Cancel</Button>
              <Button variant="primary" size="sm" icon={ArrowRightIcon ? <ArrowRightIcon size={15} /> : null} iconPosition="right" onClick={handleProceed}>Verify & Continue</Button>
            </div>
          </div>
        </div>

        <div className="cv-right-col" style={{ gap: '12px' }}>
          <div className="panel" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              {ShieldCheckIcon && <ShieldCheckIcon size={16} className="text-success" />}
              <h3 className="cv-section-title">Login Information</h3>
            </div>

            <div style={{ background: '#f0fdf4', padding: '18px 16px', borderRadius: '8px', border: '1px solid #bbf7d0', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ background: '#ffffff', width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px', border: '1px solid #bbf7d0' }}>
                {PhoneIcon && <PhoneIcon size={22} className="text-success" />}
              </div>
              <div style={{ fontSize: '11px', color: '#166534', marginBottom: '4px', fontWeight: 600 }}>Login ID (Mobile Number)</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>{appData.mobile || '98765 43210'}</div>
            </div>

            <p style={{ fontSize: '11px', color: '#64748b', textAlign: 'center', marginTop: '14px', lineHeight: 1.4 }}>
              Login will be created using this mobile number after OTP verification.
            </p>
          </div>

          <div className="panel cv-docs-panel">
            <h3 className="cv-section-title" style={{ marginBottom: '14px' }}>Customer Preview</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="cred-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {UserIcon && <UserIcon size={14} className="text-muted" />}
                  <span className="cred-lbl">Name</span>
                </div>
                <span className="cred-val">{primaryApplicant.fullName || appData.customerName || 'Ramesh Kumar'}</span>
              </div>
              <div className="cred-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {PhoneIcon && <PhoneIcon size={14} className="text-muted" />}
                  <span className="cred-lbl">Mobile Number (Login ID)</span>
                </div>
                <span className="cred-val">{primaryApplicant.mobile || appData.mobile || '98765 43210'}</span>
              </div>
              <div className="cred-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {BriefcaseIcon && <BriefcaseIcon size={14} className="text-muted" />}
                  <span className="cred-lbl">Loan Purpose</span>
                </div>
                <span className="cred-val">{appData.purposeOfLoan || appData.loanType || 'Business Expansion'}</span>
              </div>
              <div className="cred-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {iconMap['MapPin'] && <iconMap.MapPin size={14} className="text-muted" />}
                  <span className="cred-lbl">Address</span>
                </div>
                <span className="cred-val">{joinAddress(addressDetails.current) || appData.address || '-'}</span>
              </div>
              <div className="cred-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {IndianRupeeIcon && <IndianRupeeIcon size={14} className="text-muted" />}
                  <span className="cred-lbl">Applied For</span>
                </div>
                <span className="cred-val">{appData.loanProductDisplay || appData.loanType || 'Business Loan'}</span>
              </div>
            </div>

            <div style={{ marginTop: '20px' }}>
              <Button variant="secondary" size="sm" fullWidth icon={EyeIcon ? <EyeIcon size={14} /> : null}>View Full Details</Button>
            </div>

            <div className="alert-banner alert-banner--blue cv-blue-alert-footer" style={{ marginTop: '16px' }}>
              {InfoIcon && <InfoIcon size={14} />}
              <span>After login is created, the customer can track loan status, payments and documents.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
