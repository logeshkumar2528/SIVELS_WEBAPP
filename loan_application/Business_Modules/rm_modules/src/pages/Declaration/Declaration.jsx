import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PenTool, Calendar, User, Briefcase, UserCheck, Phone, CheckCircle } from 'lucide-react';
import iconMap from '../../config/iconMap';
import Button from '../../components/Button/Button';
import Modal from '../../components/Modal/Modal';
import { ROUTES } from '../../config/routeConfig';
import { APPLICATION_WIZARD_STEPS } from '../../config/applicationWizard';
import { useApplicationDraftStore } from '../../state/ApplicationDraftContext';
import WizardSectionLayout from '../../components/WizardSectionLayout/WizardSectionLayout';
import ErrorPopup from '../../components/ErrorPopup/ErrorPopup';
import { buildApplicationDisplayId, buildSectionUpdate, getSectionState, getApplicantCount, createArray, resolveApplicantName } from '../applicationWizard/flowUtils';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';

function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

function isObsoleteMock(val) {
  if (!val) return true;
  const s = String(val).trim().toLowerCase();
  return (
    s === 'anil kumar' ||
    s === 'karthik raja' ||
    s === 'rajesh kumar' ||
    s === '2025-06-06' ||
    s === '06-06-2025'
  );
}

function isObsoleteRmName(val) {
  if (!val) return true;
  const s = String(val).trim().toLowerCase();
  return (
    s === 'karthik raja' ||
    s === 'rajesh kumar' ||
    s === 'dineshkumar' ||
    s === 'dinesh kumar'
  );
}

async function fetchLiveRMNameFromApi() {
  try {
    const res = await fetch(`${API_BASE}/RMMaster`);
    if (res.ok) {
      const data = await res.json();
      const rows = Array.isArray(data) ? data : (Array.isArray(data?.value) ? data.value : []);

      let currentUser = {};
      try {
        const raw = localStorage.getItem('sivels_currentUser');
        if (raw) currentUser = JSON.parse(raw);
      } catch {
        // ignore
      }

      const currentMobile = String(currentUser?.mobileNumber || currentUser?.phone || '').replace(/\D/g, '');
      const currentRmId = Number(currentUser?.rmId || currentUser?.RMId || 0);

      const match =
        rows.find((row) => Number(row.rmId || row.RMId) === currentRmId && currentRmId > 0) ||
        rows.find((row) => currentMobile && String(row.mobileNumber || '').replace(/\D/g, '') === currentMobile) ||
        rows.find((row) => row.isActive !== false) ||
        rows[0];

      if (match?.fullName || match?.name) {
        return match.fullName || match.name;
      }
    }
  } catch (err) {
    console.error('Error fetching RM name from RMMaster:', err);
  }

  return 'Sivashanmugam M';
}

function buildDeclarationState(appData) {
  const saved = getSectionState(appData, 'declaration', {});
  const resolvedName = resolveApplicantName(appData);
  const applicantName = resolvedName !== 'Applicant' ? resolvedName : '';
  const coApplicantCount = getApplicantCount(appData);
  const savedCoApplicants = Array.isArray(saved.coApplicants) ? saved.coApplicants : [];
  const today = getTodayDate();
  const productName = appData.loanProductDisplay || appData.loanType || appData.purposeOfLoan || 'Personal Loan';

  const rawSig = saved.applicantSignature;
  const rawAppDate = saved.applicantDate;
  const rawAckName = saved.ackApplicantName;
  const rawAckProduct = saved.ackProduct;
  const rawAckReceivedBy = saved.ackReceivedBy;
  const rawAckDate = saved.ackDate;

  return {
    applicantSignature: isObsoleteMock(rawSig) ? (applicantName || '') : rawSig,
    applicantDate: isObsoleteMock(rawAppDate) ? today : rawAppDate,
    coApplicants: createArray(coApplicantCount, (index) => ({
      signature: isObsoleteMock(savedCoApplicants[index]?.signature)
        ? ''
        : savedCoApplicants[index]?.signature || '',
      date: isObsoleteMock(savedCoApplicants[index]?.date)
        ? today
        : savedCoApplicants[index]?.date || today,
    })),
    coApplicantSignature: saved.coApplicantSignature || '',
    coApplicantDate: saved.coApplicantDate || today,
    ackApplicantName: isObsoleteMock(rawAckName) ? (applicantName || '') : rawAckName,
    ackProduct: isObsoleteMock(rawAckProduct) ? productName : rawAckProduct,
    ackReceivedBy: isObsoleteRmName(rawAckReceivedBy) ? 'Sivashanmugam M' : rawAckReceivedBy,
    ackDate: isObsoleteMock(rawAckDate) ? today : rawAckDate,
  };
}

export default function Declaration() {
  const navigate = useNavigate();
  const { applicationId } = useParams();
  const appId = applicationId;
  const { getApplication, ensureApplication, saveApplication } = useApplicationDraftStore();
  const [form, setForm] = useState(() => buildDeclarationState(getApplication(appId)));
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [otpStep, setOtpStep] = useState('initial');
  const [otpValue, setOtpValue] = useState('');
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [errorPopup, setErrorPopup] = useState(null);

  useEffect(() => {
    ensureApplication(appId);
  }, [appId, ensureApplication]);

  const appData = getApplication(appId);
  const applicationDisplayId = buildApplicationDisplayId(appData, appId);
  const coApplicantCount = getApplicantCount(appData);
  const ArrowLeftIcon = iconMap['ArrowLeft'];

  // Load customer and RM from GET API
  useEffect(() => {
    let active = true;

    async function loadApiData() {
      if (!appId) return;
      const today = getTodayDate();

      try {
        // 1. Fetch customer data via GET /AgentAddCustomer/:appId
        const custResponse = await fetch(`${API_BASE}/AgentAddCustomer/${appId}`);
        let customerRecord = null;
        if (custResponse.ok) {
          const custData = await custResponse.json();
          customerRecord = Array.isArray(custData) ? custData[0] : (custData?.value ? custData.value[0] : custData);
        }

        const custName = customerRecord?.fullName || customerRecord?.customerName || appData?.customerName || '';
        const prodName = customerRecord?.loanPurposeName || customerRecord?.loanType || appData?.loanProductDisplay || appData?.loanType || 'Personal Loan';

        // 2. Fetch RM name from RMMaster (as in RM Profile)
        const resolvedRmName = await fetchLiveRMNameFromApi();

        if (active) {
          // Save in draft store
          saveApplication(appId, {
            agentCustomerId: customerRecord?.agentCustomerId || customerRecord?.AgentCustomerId || appId,
            customerName: custName || appData.customerName,
            loanProductDisplay: prodName,
            loanType: prodName,
            branch: customerRecord?.branch || appData.branch,
            createdDate: customerRecord?.createdAt || customerRecord?.createdDate || appData.createdDate,
            agentName: customerRecord?.agentName || appData.agentName,
          });

          // Update form state with live API values
          setForm((prev) => {
            const shouldOverwriteSig = isObsoleteMock(prev.applicantSignature) || !prev.applicantSignature || prev.applicantSignature === 'Muthu A';
            const shouldOverwriteAck = isObsoleteMock(prev.ackApplicantName) || !prev.ackApplicantName || prev.ackApplicantName === 'Muthu A';
            const shouldOverwriteRm = isObsoleteRmName(prev.ackReceivedBy);

            const next = {
              ...prev,
              applicantSignature: shouldOverwriteSig ? (custName || prev.applicantSignature) : prev.applicantSignature,
              applicantDate: isObsoleteMock(prev.applicantDate) ? today : (prev.applicantDate || today),
              ackApplicantName: shouldOverwriteAck ? (custName || prev.ackApplicantName) : prev.ackApplicantName,
              ackProduct: isObsoleteMock(prev.ackProduct) ? prodName : (prev.ackProduct || prodName),
              ackReceivedBy: shouldOverwriteRm ? resolvedRmName : (prev.ackReceivedBy || resolvedRmName),
              ackDate: isObsoleteMock(prev.ackDate) ? today : (prev.ackDate || today),
            };

            saveApplication(appId, buildSectionUpdate(getApplication(appId), 'declaration', next));
            return next;
          });
        }
      } catch (err) {
        console.error('Error fetching live data for Declaration:', err);
      }
    }

    loadApiData();

    return () => {
      active = false;
    };
  }, [appId]);

  const persist = (nextForm) => {
    setForm(nextForm);
    saveApplication(appId, buildSectionUpdate(appData, 'declaration', nextForm));
  };

  const handleSubmit = () => {
    saveApplication(appId, buildSectionUpdate(appData, 'declaration', form));
    setOtpStep('confirm_creation');
    setOtpValue('');
    setShowSubmitModal(true);
  };

  const finalizeSubmit = async () => {
    if (isFinalizing) return;
    setIsFinalizing(true);

    try {
      // 1. Fetch latest customer record to ensure full payload
      let customerRecord = null;
      const getRes = await fetch(`${API_BASE}/AgentAddCustomer/${appId}`);
      if (getRes.ok) {
        const data = await getRes.json();
        customerRecord = Array.isArray(data) ? data[0] : (data?.value ? data.value[0] : data);
      }

      if (!customerRecord) {
        throw new Error('Unable to retrieve customer record for status update.');
      }

      // 2. Build full payload with status: 2 (Logged to HO / Completed)
      const payload = {
        agentCustomerId: Number(customerRecord.agentCustomerId || customerRecord.AgentCustomerId || appId),
        agentId: Number(customerRecord.agentId ?? customerRecord.AgentId ?? 1),
        fullName: customerRecord.fullName || customerRecord.FullName || customerRecord.customerName || appData.customerName || '',
        mobileNumber: customerRecord.mobileNumber || customerRecord.MobileNumber || customerRecord.mobile || appData.mobile || '',
        email: customerRecord.email || customerRecord.Email || customerRecord.emailAddress || appData.email || '',
        employmentTypeId: Number(customerRecord.employmentTypeId ?? customerRecord.EmploymentTypeId ?? 1),
        loanPurposeId: Number(customerRecord.loanPurposeId ?? customerRecord.LoanPurposeId ?? 1),
        expectedLoanAmount: Number(customerRecord.expectedLoanAmount ?? customerRecord.ExpectedLoanAmount ?? 0),
        remarks: customerRecord.remarks || customerRecord.Remarks || '',
        status: 2,
        isActive: customerRecord.isActive !== undefined ? customerRecord.isActive : (customerRecord.IsActive !== undefined ? customerRecord.IsActive : true),
      };

      // 3. Send PUT request
      const putRes = await fetch(`${API_BASE}/AgentAddCustomer/${appId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!putRes.ok) {
        throw new Error(`Failed to update application status to Logged to HO (${putRes.status})`);
      }

      saveApplication(appId, { status: 'Logged to HO' });
      setShowSubmitModal(false);
      navigate(ROUTES.APPROVED_APPLICATIONS);
    } catch (err) {
      console.error('Error finalizing application submission:', err);
      setErrorPopup({
        title: 'Could not complete application',
        message: err.message || 'The application could not be completed. Please try again.',
        variant: 'error',
      });
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleBack = () => {
    navigate(ROUTES.DOCUMENT_CHECKLIST.replace(':applicationId', appId));
  };

  const displayCustomerName = resolveApplicantName(appData);

  return (
    <>
      <ErrorPopup
        show={!!errorPopup}
        title={errorPopup?.title}
        message={errorPopup?.message}
        details={errorPopup?.details}
        variant={errorPopup?.variant}
        onClose={() => setErrorPopup(null)}
      />
      <WizardSectionLayout
      appId={appId}
      appData={appData}
      steps={APPLICATION_WIZARD_STEPS}
      activeStep={12}
      title="Step 12: Declaration"
      subtitle="Final review of declaration and acknowledgement of receipt."
      backLabel="Back to Checklist"
      continueLabel="Review & Submit Application"
      onBack={handleBack}
      onContinue={handleSubmit}
      onStepClick={(step) => navigate(step.route.replace(':applicationId', appId))}
      headerAction={
        <Button
          variant="secondary"
          size="sm"
          icon={ArrowLeftIcon ? <ArrowLeftIcon size={14} /> : null}
          onClick={handleBack}
        >
          Back to Checklist
        </Button>
      }
      footerHint="This is the final section before review and submission."
    >
      {/* SECTION 1: DECLARATION & APPLICANT SIGNATURE */}
      <div className="aw-mini-card" style={{ marginBottom: '24px' }}>
        <div className="aw-mini-card__header">
          <div>
            <div className="aw-mini-card__title">Declaration</div>
            <div className="aw-mini-card__subtitle">Terms and conditions</div>
          </div>
        </div>
        <div className="aw-mini-card__body">
          <div
            style={{
              padding: '16px',
              backgroundColor: '#fafcfb',
              border: '1px solid var(--color-border-light)',
              borderRadius: '8px',
              fontSize: '12.5px',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.6,
              marginBottom: '24px',
            }}
          >
            I/We declare that the information given in this application is true, correct and complete to the best of
            my/our knowledge. I/We authorise Sivels Finance (a unit of Sivels Holding Pvt Ltd) and its representatives
            to verify the details furnished, obtain credit bureau reports, and process my/our personal data for
            evaluation, sanction and servicing of this loan, in accordance with applicable law. I/We understand that the
            Admin Fee is non-refundable, and that submission of this form does not guarantee sanction of the loan applied
            for.
          </div>

          {coApplicantCount === 0 ? (
            <div className="aw-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              <div className="aw-field">
                <label className="form-label">Signature of Applicant</label>
                <div className="aw-input-wrapper">
                  <PenTool className="aw-input-icon" size={14} />
                  <input
                    className="form-input aw-input aw-input--with-icon"
                    value={form.applicantSignature}
                    readOnly
                    onChange={(e) => persist({ ...form, applicantSignature: e.target.value })}
                    placeholder="Enter applicant signature"
                  />
                </div>
              </div>
              <div className="aw-field">
                <label className="form-label">Date</label>
                <div className="aw-input-wrapper">
                  <Calendar className="aw-input-icon" size={14} />
                  <input
                    type="date"
                    className="form-input aw-input aw-input--with-icon"
                    value={form.applicantDate}
                    readOnly
                    onChange={(e) => persist({ ...form, applicantDate: e.target.value })}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="aw-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                <div className="aw-field">
                  <label className="form-label">Signature of Applicant</label>
                  <div className="aw-input-wrapper">
                    <PenTool className="aw-input-icon" size={14} />
                    <input
                      className="form-input aw-input aw-input--with-icon"
                      value={form.applicantSignature}
                      readOnly
                      onChange={(e) => persist({ ...form, applicantSignature: e.target.value })}
                      placeholder="Enter applicant signature"
                    />
                  </div>
                </div>
                <div className="aw-field">
                  <label className="form-label">Date</label>
                  <div className="aw-input-wrapper">
                    <Calendar className="aw-input-icon" size={14} />
                    <input
                      type="date"
                      className="form-input aw-input aw-input--with-icon"
                      value={form.applicantDate}
                      readOnly
                      onChange={(e) => persist({ ...form, applicantDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {form.coApplicants.map((coApp, index) => (
                <div key={index} className="aw-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                  <div className="aw-field">
                    <label className="form-label">
                      Signature of Co-Applicant {index + 1}
                    </label>
                    <div className="aw-input-wrapper">
                      <PenTool className="aw-input-icon" size={14} />
                      <input
                        className="form-input aw-input aw-input--with-icon"
                        value={coApp.signature}
                        readOnly
                        onChange={(e) => {
                          const updated = [...form.coApplicants];
                          updated[index] = { ...updated[index], signature: e.target.value };
                          persist({
                            ...form,
                            coApplicants: updated,
                            coApplicantSignature: updated[0]?.signature || '',
                          });
                        }}
                        placeholder="Enter co-applicant signature"
                      />
                    </div>
                  </div>
                  <div className="aw-field">
                    <label className="form-label">Date</label>
                    <div className="aw-input-wrapper">
                      <Calendar className="aw-input-icon" size={14} />
                      <input
                        type="date"
                        className="form-input aw-input aw-input--with-icon"
                        value={coApp.date}
                        readOnly
                        onChange={(e) => {
                          const updated = [...form.coApplicants];
                          updated[index] = { ...updated[index], date: e.target.value };
                          persist({
                            ...form,
                            coApplicants: updated,
                            coApplicantDate: updated[0]?.date || '',
                          });
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: ACKNOWLEDGEMENT OF RECEIPT (CUSTOMER COPY) */}
      <div className="aw-mini-card">
        <div className="aw-mini-card__header">
          <div>
            <div className="aw-mini-card__title">Acknowledgement of Receipt (Customer Copy)</div>
            <div className="aw-mini-card__subtitle">To be filled by RM upon document collection</div>
          </div>
        </div>
        <div className="aw-mini-card__body">
          <div className="aw-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div className="aw-field">
              <label className="form-label">Name of Applicant</label>
              <div className="aw-input-wrapper">
                <User className="aw-input-icon" size={14} />
                <input
                  className="form-input aw-input aw-input--with-icon"
                  value={form.ackApplicantName}
                  readOnly
                  placeholder="Enter applicant name"
                  onChange={(e) => persist({ ...form, ackApplicantName: e.target.value })}
                />
              </div>
            </div>

            <div className="aw-field">
              <label className="form-label">Product Applied For</label>
              <div className="aw-input-wrapper">
                <Briefcase className="aw-input-icon" size={14} />
                <input
                  className="form-input aw-input aw-input--with-icon"
                  value={form.ackProduct}
                  readOnly
                  placeholder="Enter product applied for"
                  onChange={(e) => persist({ ...form, ackProduct: e.target.value })}
                />
              </div>
            </div>

            <div className="aw-field">
              <label className="form-label">Received By (RM Name & Sign)</label>
              <div className="aw-input-wrapper">
                <UserCheck className="aw-input-icon" size={14} />
                <input
                  className="form-input aw-input aw-input--with-icon"
                  value={form.ackReceivedBy}
                  readOnly
                  placeholder="Enter RM Name & Sign"
                  onChange={(e) => persist({ ...form, ackReceivedBy: e.target.value })}
                />
              </div>
            </div>

            <div className="aw-field">
              <label className="form-label">Date of Receipt</label>
              <div className="aw-input-wrapper">
                <Calendar className="aw-input-icon" size={14} />
                <input
                  type="date"
                  className="form-input aw-input aw-input--with-icon"
                  value={form.ackDate}
                  readOnly
                  onChange={(e) => persist({ ...form, ackDate: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONFIRMATION / SUBMISSION MODAL */}
      <Modal
        show={showSubmitModal}
        onHide={() => {
          if (otpStep !== 'success') setShowSubmitModal(false);
        }}
        title={otpStep === 'confirm_creation' ? 'Confirm Account Creation' : 'Verify Mobile Number'}
        size="sm"
        footer={
          otpStep === 'confirm_creation' ? (
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', width: '100%' }}>
              <Button variant="secondary" onClick={() => setShowSubmitModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => setOtpStep('initial')}>
                OK
              </Button>
            </div>
          ) : otpStep === 'success' ? (
            <div style={{ width: '100%' }}>
              <Button
                variant="primary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={finalizeSubmit}
                disabled={isFinalizing}
              >
                {isFinalizing ? 'Completing...' : 'Continue'}
              </Button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', width: '100%' }}>
              <Button variant="secondary" onClick={() => setShowSubmitModal(false)}>
                Cancel
              </Button>
            </div>
          )
        }
      >
        {otpStep === 'success' ? (
          <div
            style={{
              textAlign: 'center',
              padding: '16px 4px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '140px',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#effaf2',
                color: '#0F7A4C',
                marginBottom: '16px',
                flexShrink: 0,
              }}
            >
              <CheckCircle size={24} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: '0 0 8px 0' }}>
              Profile Created
            </h3>
            <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>Application submitted successfully.</p>
          </div>
        ) : otpStep === 'confirm_creation' ? (
          <div
            style={{
              padding: '16px 4px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              height: '140px',
            }}
          >
            <p
              style={{
                color: '#475569',
                fontSize: '13px',
                lineHeight: '1.5',
                margin: 0,
                textAlign: 'center',
              }}
            >
              Are you sure you want to submit application for <strong>{displayCustomerName}</strong>
              <br />
              (ID: <strong>{applicationDisplayId}</strong>)?
            </p>
          </div>
        ) : (
          <div
            style={{
              padding: '16px 4px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              height: '140px',
            }}
          >
            <div>
              <p
                style={{
                  color: '#475569',
                  fontSize: '13px',
                  marginBottom: '16px',
                  lineHeight: '1.5',
                  textAlign: 'center',
                }}
              >
                Please verify the applicant's mobile number.
              </p>

              <div className="aw-field" style={{ marginBottom: '0' }}>
                <div className="aw-input-wrapper">
                  <Phone className="aw-input-icon" size={14} />
                  <input
                    className="form-input aw-input aw-input--with-icon"
                    value={
                      otpStep === 'otp_sent'
                        ? otpValue
                        : appData.registration?.personalInformation?.applicant?.mobileNo ||
                          appData.mobileNo ||
                          appData.mobile ||
                          ''
                    }
                    disabled={otpStep !== 'otp_sent'}
                    placeholder={otpStep === 'otp_sent' ? 'Enter 4-digit OTP' : ''}
                    onChange={(e) => {
                      if (otpStep === 'otp_sent') {
                        setOtpValue(e.target.value.replace(/[^\d]/g, ''));
                      }
                    }}
                    maxLength={otpStep === 'otp_sent' ? 4 : 10}
                  />
                  {otpStep === 'initial' && (
                    <button
                      type="button"
                      onClick={() => setOtpStep('otp_sent')}
                      style={{
                        position: 'absolute',
                        right: '4px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        padding: '4px 12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: '#0F7A4C',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        zIndex: 10,
                      }}
                    >
                      Send OTP
                    </button>
                  )}
                  {otpStep === 'otp_sent' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (otpValue.length === 4) {
                          setOtpStep('success');
                        }
                      }}
                      disabled={otpValue.length < 4}
                      style={{
                        position: 'absolute',
                        right: '4px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        padding: '4px 12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: '#0F7A4C',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        zIndex: 10,
                        opacity: otpValue.length < 4 ? 0.5 : 1,
                      }}
                    >
                      Verify
                    </button>
                  )}
                </div>
                {otpStep === 'otp_sent' && (
                  <p style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', textAlign: 'center' }}>
                    OTP sent to{' '}
                    {appData.registration?.personalInformation?.applicant?.mobileNo ||
                      appData.mobileNo ||
                      appData.mobile ||
                      ''}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </WizardSectionLayout>
    </>
  );
}
