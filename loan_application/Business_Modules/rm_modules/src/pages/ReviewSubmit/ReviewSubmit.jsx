import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import iconMap from '../../config/iconMap';
import InfoBar from '../../components/InfoBar/InfoBar';
import StepProgress from '../../components/StepProgress/StepProgress';
import CustomerSummary from '../../components/CustomerSummary/CustomerSummary';
import Button from '../../components/Button/Button';
import Modal from '../../components/Modal/Modal';
import { ROUTES } from '../../config/routeConfig';
import { useApplicationDraftStore } from '../../state/ApplicationDraftContext';
import { formatDateTime } from '../../utils/dateHelper';
import '../CustomerVerification/CustomerVerification.css';
import './ReviewSubmit.css';

function joinAddress(address = {}) {
  return [address.line1, address.line2, address.city, address.state, address.pincode]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(', ');
}

export default function ReviewSubmit() {
  const navigate = useNavigate();
  const { applicationId } = useParams();
  const appId = applicationId;
  const { getApplication, ensureApplication } = useApplicationDraftStore();

  const [notes, setNotes] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    ensureApplication(appId);
  }, [appId, ensureApplication]);

  const appData = getApplication(appId);
  const registration = appData.registration || {};
  const primaryApplicant = registration.primaryApplicant || {};
  const addressDetails = registration.address || {};
  const employmentDetails = registration.employment || {};
  const coApplicants = registration.coApplicants || [];
  const nomineeDetails = registration.nomineeDetails || [];

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

  const ArrowLeftIcon = iconMap['ArrowLeft'];
  const CheckCircle2Icon = iconMap['CheckCircle2'];
  const SendIcon = iconMap['Send'];
  const Edit3Icon = iconMap['Edit3'];
  const InfoIcon = iconMap['Info'];
  const UserIcon = iconMap['User'];
  const FileTextIcon = iconMap['FileText'];
  const HomeIcon = iconMap['Home'];
  const IndianRupeeIcon = iconMap['IndianRupee'];
  const LandmarkIcon = iconMap['Landmark'];
  const LockIcon = iconMap['Lock'];
  const ClipboardListIcon = iconMap['ClipboardList'];
  const SaveIcon = iconMap['Save'];
  const steps = [
    { id: '1', label: 'Application Details' },
    { id: '2', label: 'Customer Verification' },
    { id: '3', label: 'Aadhaar eKYC' },
    { id: '4', label: 'Customer Registration' },
    { id: '5', label: 'Create Login' },
    { id: '6', label: 'Review & Submit' },
  ];

  const handleSubmit = () => {
    setShowSuccessModal(true);
  };

  const handleFinish = () => {
    setShowSuccessModal(false);
    navigate(ROUTES.DASHBOARD);
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
          onClick={() => navigate(ROUTES.CREATE_LOGIN.replace(':applicationId', appId))}
        >
          Back to Create Login
        </Button>
      </div>

      <div className="rs-main-container">
        <div className="rs-left-sidebar">
          <CustomerSummary customer={customerData} />

          <div className="panel" style={{ padding: '16px' }}>
            <h3 className="cv-section-title" style={{ marginBottom: '16px' }}>Progress Status</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                {CheckCircle2Icon && <CheckCircle2Icon size={16} className="text-success" />}
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>Application Details</div>
                  <div className="text-success" style={{ fontSize: '11px', fontWeight: 600 }}>Completed</div>
                </div>
              </div>
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
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                {CheckCircle2Icon && <CheckCircle2Icon size={16} className="text-success" />}
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>Create Login</div>
                  <div className="text-success" style={{ fontSize: '11px', fontWeight: 600 }}>Completed</div>
                </div>
              </div>
            </div>
            <div style={{ borderTop: '1px solid #edf2f7', marginTop: '16px', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 500 }}>Overall Status</span>
              <span className="badge-available">Ready to Submit</span>
            </div>
          </div>
        </div>

        <div className="rs-content-area panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="rs-scrollable-content" style={{ padding: '20px 24px' }}>
            <div style={{ marginBottom: '24px' }}>
              <StepProgress steps={steps} activeStep={6} />
            </div>

            <div className="rs-content-grid">
              <div className="rs-middle-col">
                <div>
                  <h3 className="cv-section-title" style={{ fontSize: '16px', marginBottom: '4px' }}>Step 6: Review & Submit</h3>
                  <p className="text-muted" style={{ fontSize: '11.5px' }}>Please review all the details before submitting the application to Back Office.</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="rs-info-card">
                    <div className="rs-card-header">
                      <div className="flex-align-center gap-2">
                        {UserIcon && <UserIcon size={14} className="text-success" />}
                        <span className="font-bold" style={{ fontSize: '12px' }}>Customer Information</span>
                      </div>
                      <span className="text-primary cursor-pointer flex-align-center gap-1" style={{ fontSize: '11px', fontWeight: 600 }} onClick={() => navigate(ROUTES.CUSTOMER_VERIFICATION.replace(':applicationId', appId))}>
                        {Edit3Icon && <Edit3Icon size={12} />} Edit
                      </span>
                    </div>
                    <div className="rs-kv-list">
                      <div className="rs-kv-row"><span>Full Name</span><span>: {customerData.name}</span></div>
                      <div className="rs-kv-row"><span>Mobile Number (Login ID)</span><span>: {customerData.mobile}</span></div>
                      <div className="rs-kv-row"><span>Date of Birth</span><span>: {customerData.age === '32 Years' ? '12/05/1993' : '-'}</span></div>
                      <div className="rs-kv-row"><span>Gender</span><span>: {customerData.gender || 'Male'}</span></div>
                      <div className="rs-kv-row" style={{ alignItems: 'flex-start' }}>
                        <span>Address</span>
                        <span style={{ lineHeight: 1.4 }}>: {customerData.address}</span>
                      </div>
                    </div>
                  </div>

                <div className="rs-info-card">
                  <div className="rs-card-header">
                    <div className="flex-align-center gap-2">
                      {IndianRupeeIcon && <IndianRupeeIcon size={14} className="text-success" />}
                      <span className="font-bold" style={{ fontSize: '12px' }}>Loan Information</span>
                      </div>
                      <span className="text-primary cursor-pointer flex-align-center gap-1" style={{ fontSize: '11px', fontWeight: 600 }} onClick={() => navigate(ROUTES.APPLICATION_DETAILS.replace(':applicationId', appId))}>
                        {Edit3Icon && <Edit3Icon size={12} />} Edit
                      </span>
                    </div>
                    <div className="rs-kv-list">
                      <div className="rs-kv-row"><span>Loan Product</span><span>: {appData.loanProductDisplay || appData.loanType || '-'}</span></div>
                      <div className="rs-kv-row"><span>Loan Transaction Type</span><span>: {appData.loanTransactionType || '-'}</span></div>
                      <div className="rs-kv-row"><span>Loan Purpose</span><span>: {appData.purposeOfLoan || appData.loanType || '-'}</span></div>
                      <div className="rs-kv-row"><span>Loan Amount Requested</span><span>: {appData.loanAmountDisplay || appData.amount || '-'}</span></div>
                      <div className="rs-kv-row"><span>Loan Tenure (Months)</span><span>: {appData.loanTenureMonths || '-'}</span></div>
                      <div className="rs-kv-row"><span>Interest Type</span><span>: {appData.interestType || '-'}</span></div>
                      <div className="rs-kv-row"><span>ROI (%)</span><span>: {appData.roi ?? '-'}</span></div>
                      <div className="rs-kv-row"><span>Co-Applicants</span><span>: {appData.coApplicantsCount ?? 0}</span></div>
                      <div className="rs-kv-row"><span>Distance from Branch</span><span>: {appData.distanceFromBranchKm ?? '-'} Km</span></div>
                    </div>
                  </div>
                </div>

                <div className="rs-info-card">
                  <div className="rs-card-header">
                    <div className="flex-align-center gap-2">
                      {UserIcon && <UserIcon size={14} className="text-success" />}
                      <span className="font-bold" style={{ fontSize: '12px' }}>Registration Details</span>
                    </div>
                    <span className="text-primary cursor-pointer flex-align-center gap-1" style={{ fontSize: '11px', fontWeight: 600 }} onClick={() => navigate(ROUTES.CUSTOMER_REGISTRATION.replace(':applicationId', appId))}>
                      {Edit3Icon && <Edit3Icon size={12} />} Edit
                    </span>
                  </div>
                  <div className="rs-kv-list">
                    <div className="rs-kv-row"><span>Primary Applicant</span><span>: {primaryApplicant.fullName || customerData.name}</span></div>
                    <div className="rs-kv-row"><span>Date of Birth</span><span>: {primaryApplicant.dob || '-'}</span></div>
                    <div className="rs-kv-row"><span>Father / Spouse</span><span>: {primaryApplicant.fatherOrSpouseName || '-'}</span></div>
                    <div className="rs-kv-row"><span>Mobile</span><span>: {primaryApplicant.mobile || customerData.mobile}</span></div>
                    <div className="rs-kv-row"><span>Permanent Address</span><span>: {joinAddress(addressDetails.permanent) || '-'}</span></div>
                    <div className="rs-kv-row"><span>Employment Type</span><span>: {employmentDetails.mode === 'business' ? 'Business' : employmentDetails.mode === 'employed' ? 'Employed' : (employmentDetails.mode || '-')}</span></div>
                    <div className="rs-kv-row"><span>Total Monthly Income</span><span>: {employmentDetails.totalMonthlyIncome || '-'}</span></div>
                    <div className="rs-kv-row"><span>Co-Applicants Added</span><span>: {coApplicants.length}</span></div>
                    <div className="rs-kv-row"><span>Nominees Added</span><span>: {nomineeDetails.length}</span></div>
                  </div>
                </div>

                <div className="rs-info-card">
                  <div className="rs-card-header">
                    <div className="flex-align-center gap-2">
                      {FileTextIcon && <FileTextIcon size={14} className="text-success" />}
                      <span className="font-bold" style={{ fontSize: '12px' }}>Documents Uploaded</span>
                    </div>
                    <span className="text-primary cursor-pointer flex-align-center gap-1" style={{ fontSize: '11px', fontWeight: 600 }} onClick={() => navigate(ROUTES.CUSTOMER_REGISTRATION.replace(':applicationId', appId))}>
                      {Edit3Icon && <Edit3Icon size={12} />} Edit
                    </span>
                  </div>
                  <div className="rs-doc-grid">
                    <div className="rs-doc-item">
                      <span className="rs-doc-name">Aadhaar Card</span>
                      <div className="rs-doc-icon-box"><img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="ID" style={{ width: 24, height: 24 }} /></div>
                      <span className="text-success flex-align-center gap-1" style={{ fontSize: '10px', fontWeight: 700 }}>{CheckCircle2Icon && <CheckCircle2Icon size={12} />} Verified</span>
                    </div>
                    <div className="rs-doc-item">
                      <span className="rs-doc-name">PAN Card</span>
                      <div className="rs-doc-icon-box"><img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="ID" style={{ width: 24, height: 24, filter: 'hue-rotate(180deg)' }} /></div>
                      <span className="text-success flex-align-center gap-1" style={{ fontSize: '10px', fontWeight: 700 }}>{CheckCircle2Icon && <CheckCircle2Icon size={12} />} Verified</span>
                    </div>
                    <div className="rs-doc-item">
                      <span className="rs-doc-name">Address Proof</span>
                      <div className="rs-doc-icon-box">{HomeIcon && <HomeIcon size={24} className="text-muted" />}</div>
                      <span className="text-success flex-align-center gap-1" style={{ fontSize: '10px', fontWeight: 700 }}>{CheckCircle2Icon && <CheckCircle2Icon size={12} />} Verified</span>
                    </div>
                    <div className="rs-doc-item">
                      <span className="rs-doc-name">Income Proof</span>
                      <div className="rs-doc-icon-box">{IndianRupeeIcon && <IndianRupeeIcon size={24} className="text-muted" />}</div>
                      <span className="text-success flex-align-center gap-1" style={{ fontSize: '10px', fontWeight: 700 }}>{CheckCircle2Icon && <CheckCircle2Icon size={12} />} Verified</span>
                    </div>
                    <div className="rs-doc-item">
                      <span className="rs-doc-name">Bank Statement</span>
                      <div className="rs-doc-icon-box">{LandmarkIcon && <LandmarkIcon size={24} className="text-muted" />}</div>
                      <span className="text-success flex-align-center gap-1" style={{ fontSize: '10px', fontWeight: 700 }}>{CheckCircle2Icon && <CheckCircle2Icon size={12} />} Verified</span>
                    </div>
                  </div>
                </div>

                <div className="rs-info-card">
                  <div className="rs-card-header">
                    <div className="flex-align-center gap-2">
                      {LockIcon && <LockIcon size={14} className="text-success" />}
                      <span className="font-bold" style={{ fontSize: '12px' }}>Login Information</span>
                    </div>
                    <span className="text-primary cursor-pointer flex-align-center gap-1" style={{ fontSize: '11px', fontWeight: 600 }} onClick={() => navigate(ROUTES.CREATE_LOGIN.replace(':applicationId', appId))}>
                      {Edit3Icon && <Edit3Icon size={12} />} Edit
                    </span>
                  </div>
                  <div className="flex-align-center justify-between" style={{ padding: '8px 4px' }}>
                    <div className="flex-align-center gap-4">
                      <span style={{ fontSize: '11px', color: '#64748b' }}>Login ID (Mobile Number)</span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>: {customerData.mobile}</span>
                    </div>
                    <span style={{ background: '#f0fdf4', color: '#166534', padding: '4px 10px', borderRadius: '4px', fontSize: '10.5px', fontWeight: 600 }}>
                      Login will be created after OTP verification
                    </span>
                  </div>
                </div>

                <div className="alert-banner alert-banner--blue" style={{ marginTop: '8px' }}>
                  {InfoIcon && <InfoIcon size={14} />}
                  <span>After submission, this application will be sent to Back Office for final approval.</span>
                </div>
              </div>

              <div className="rs-right-col">
                <div className="rs-info-card" style={{ padding: '16px' }}>
                  <div className="flex-align-center gap-2" style={{ marginBottom: '16px' }}>
                    {ClipboardListIcon ? <ClipboardListIcon size={14} className="text-success" /> : <FileTextIcon size={14} className="text-success" />}
                    <span className="font-bold" style={{ fontSize: '12px' }}>Verification Checklist</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="rs-checklist-item">
                      {CheckCircle2Icon && <CheckCircle2Icon size={14} className="text-success" />} Application details saved
                    </div>
                    <div className="rs-checklist-item">
                      {CheckCircle2Icon && <CheckCircle2Icon size={14} className="text-success" />} Customer details verified
                    </div>
                    <div className="rs-checklist-item">
                      {CheckCircle2Icon && <CheckCircle2Icon size={14} className="text-success" />} Aadhaar eKYC completed
                    </div>
                    <div className="rs-checklist-item">
                      {CheckCircle2Icon && <CheckCircle2Icon size={14} className="text-success" />} Customer registered successfully
                    </div>
                    <div className="rs-checklist-item">
                      {CheckCircle2Icon && <CheckCircle2Icon size={14} className="text-success" />} Login created with mobile number
                    </div>
                    <div className="rs-checklist-item">
                      {CheckCircle2Icon && <CheckCircle2Icon size={14} className="text-success" />} All information reviewed
                    </div>
                  </div>
                </div>

                <div className="rs-info-card" style={{ padding: '16px' }}>
                  <span className="font-bold" style={{ fontSize: '12px', display: 'block', marginBottom: '12px' }}>RM Notes (Optional)</span>
                  <textarea
                    className="rs-textarea"
                    placeholder="Enter notes here..."
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={250}
                  />
                  <div style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'right', marginTop: '6px' }}>{notes.length} / 250 Characters</div>
                </div>

                <div className="rs-submit-notice">
                  <div className="flex-align-center gap-2" style={{ color: '#166534', fontWeight: 700, fontSize: '12px', marginBottom: '6px' }}>
                    {CheckCircle2Icon && <CheckCircle2Icon size={14} />} You are about to submit this application
                  </div>
                  <p style={{ fontSize: '11px', color: '#14532d', lineHeight: 1.4 }}>
                    Please ensure all details are correct. Once submitted, you cannot edit the application.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rs-sticky-footer">
            <Button variant="outline" icon={SaveIcon ? <SaveIcon size={14} /> : null}>Save as Draft</Button>

            <div className="flex-align-center gap-3">
              <Button variant="secondary" icon={ArrowLeftIcon ? <ArrowLeftIcon size={14} /> : null} onClick={() => navigate(ROUTES.CREATE_LOGIN.replace(':applicationId', appId))}>Back</Button>
              <Button variant="primary" icon={SendIcon ? <SendIcon size={15} /> : null} iconPosition="right" onClick={handleSubmit} style={{ background: '#0f5132', border: 'none' }}>Submit to Back Office</Button>
            </div>
          </div>
        </div>
      </div>

      <Modal show={showSuccessModal} onHide={handleFinish} title="Application Submitted Successfully!">
        <div style={{ textAlign: 'center', padding: '16px' }}>
          <div style={{ color: 'var(--color-success)', marginBottom: '16px' }}>
            {CheckCircle2Icon && <CheckCircle2Icon size={56} />}
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 8px' }}>
            Application {appId} Forwarded
          </h3>
          <p className="text-muted" style={{ fontSize: '13px' }}>
            Customer {customerData.name}'s application has been successfully forwarded to Back Office for final approval.
          </p>
          <div style={{ marginTop: '24px' }}>
            <Button variant="primary" fullWidth onClick={handleFinish}>
              Return to RM Dashboard
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
