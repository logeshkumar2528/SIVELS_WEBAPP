import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PenTool, Calendar, User, Briefcase, UserCheck, Phone, CheckCircle } from 'lucide-react';
import iconMap from '../../config/iconMap';
import Button from '../../components/Button/Button';
import Modal from '../../components/Modal/Modal';
import { ROUTES } from '../../config/routeConfig';
import { APPLICATION_WIZARD_STEPS } from '../../config/applicationWizard';
import { useApplicationDraftStore } from '../../state/ApplicationDraftContext';
import WizardSectionLayout from '../../components/WizardSectionLayout/WizardSectionLayout';
import { buildSectionUpdate, getSectionState } from '../applicationWizard/flowUtils';

function buildDeclarationState(appData) {
  const saved = getSectionState(appData, 'declaration', {});
  return {
    applicantSignature: saved.applicantSignature || '',
    applicantDate: saved.applicantDate || '',
    coApplicantSignature: saved.coApplicantSignature || '',
    coApplicantDate: saved.coApplicantDate || '',
    ackApplicantName: saved.ackApplicantName || appData.applicantName || '',
    ackProduct: saved.ackProduct || appData.loanProduct || appData.loanType || '',
    ackReceivedBy: saved.ackReceivedBy || appData.agentName || '',
    ackDate: saved.ackDate || '',
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

  useEffect(() => {
    ensureApplication(appId);
  }, [appId, ensureApplication]);

  const appData = getApplication(appId);
  const ArrowLeftIcon = iconMap['ArrowLeft'];

  useEffect(() => {
    setForm(buildDeclarationState(getApplication(appId)));
  }, [appId, getApplication]);

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

  const finalizeSubmit = () => {
    saveApplication(appId, { status: 'Ready for Review' });
    navigate('/rm/applications/field-verification');
  };

  const handleBack = () => {
    navigate(ROUTES.DOCUMENT_CHECKLIST.replace(':applicationId', appId));
  };

  return (
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
      <div className="aw-mini-card" style={{ marginBottom: '24px' }}>
        <div className="aw-mini-card__header">
          <div>
            <div className="aw-mini-card__title">Declaration</div>
            <div className="aw-mini-card__subtitle">Terms and conditions</div>
          </div>
        </div>
        <div className="aw-mini-card__body">
          <div style={{ padding: '16px', backgroundColor: '#fafcfb', border: '1px solid var(--color-border-light)', borderRadius: '8px', fontSize: '12.5px', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
            I/We declare that the information given in this application is true, correct and complete to the best of my/our knowledge. I/We authorise Sivels Finance (a unit of Sivels Holding Pvt Ltd) and its representatives to verify the details furnished, obtain credit bureau reports, and process my/our personal data for evaluation, sanction and servicing of this loan, in accordance with applicable law. I/We understand that the Admin Fee is non-refundable, and that submission of this form does not guarantee sanction of the loan applied for.
          </div>

          <div className="aw-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="aw-field">
                <label className="form-label">Signature of Applicant</label>
                <div className="aw-input-wrapper">
                  <PenTool className="aw-input-icon" size={14} />
                  <input className="form-input aw-input aw-input--with-icon" value={form.applicantSignature} onChange={(e) => persist({ ...form, applicantSignature: e.target.value })} placeholder="Type name to sign" />
                </div>
              </div>
              <div className="aw-field">
                <label className="form-label">Date</label>
                <div className="aw-input-wrapper">
                  <Calendar className="aw-input-icon" size={14} />
                  <input type="date" className="form-input aw-input aw-input--with-icon" value={form.applicantDate} onChange={(e) => persist({ ...form, applicantDate: e.target.value })} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="aw-field">
                <label className="form-label">Signature of Co-Applicant</label>
                <div className="aw-input-wrapper">
                  <PenTool className="aw-input-icon" size={14} />
                  <input className="form-input aw-input aw-input--with-icon" value={form.coApplicantSignature} onChange={(e) => persist({ ...form, coApplicantSignature: e.target.value })} placeholder="Type name to sign" />
                </div>
              </div>
              <div className="aw-field">
                <label className="form-label">Date</label>
                <div className="aw-input-wrapper">
                  <Calendar className="aw-input-icon" size={14} />
                  <input type="date" className="form-input aw-input aw-input--with-icon" value={form.coApplicantDate} onChange={(e) => persist({ ...form, coApplicantDate: e.target.value })} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
                <input className="form-input aw-input aw-input--with-icon" value={form.ackApplicantName} onChange={(e) => persist({ ...form, ackApplicantName: e.target.value })} />
              </div>
            </div>
            <div className="aw-field">
              <label className="form-label">Product Applied For</label>
              <div className="aw-input-wrapper">
                <Briefcase className="aw-input-icon" size={14} />
                <input className="form-input aw-input aw-input--with-icon" value={form.ackProduct} onChange={(e) => persist({ ...form, ackProduct: e.target.value })} />
              </div>
            </div>
            <div className="aw-field">
              <label className="form-label">Received By (RM Name & Sign)</label>
              <div className="aw-input-wrapper">
                <UserCheck className="aw-input-icon" size={14} />
                <input className="form-input aw-input aw-input--with-icon" value={form.ackReceivedBy} onChange={(e) => persist({ ...form, ackReceivedBy: e.target.value })} />
              </div>
            </div>
            <div className="aw-field">
              <label className="form-label">Date of Receipt</label>
              <div className="aw-input-wrapper">
                <Calendar className="aw-input-icon" size={14} />
                <input type="date" className="form-input aw-input aw-input--with-icon" value={form.ackDate} onChange={(e) => persist({ ...form, ackDate: e.target.value })} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal 
        show={showSubmitModal} 
        onHide={() => { if(otpStep !== 'success') setShowSubmitModal(false); }} 
        title={otpStep === 'confirm_creation' ? 'Confirm Account Creation' : 'Verify Mobile Number'} 
        size="sm"
        footer={
          otpStep === 'confirm_creation' ? (
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', width: '100%' }}>
              <Button variant="secondary" onClick={() => setShowSubmitModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => setOtpStep('initial')}>OK</Button>
            </div>
          ) : otpStep === 'success' ? (
            <div style={{ width: '100%' }}>
              <Button variant="primary" style={{ width: '100%', justifyContent: 'center' }} onClick={finalizeSubmit}>
                Continue
              </Button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', width: '100%' }}>
              <Button variant="secondary" onClick={() => setShowSubmitModal(false)}>Cancel</Button>
            </div>
          )
        }
      >
        {otpStep === 'success' ? (
          <div style={{ textAlign: 'center', padding: '16px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '140px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '50%', background: '#effaf2', color: '#0F7A4C', marginBottom: '16px', flexShrink: 0 }}>
               <CheckCircle size={24} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: '0 0 8px 0' }}>Profile Created</h3>
            <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>Application submitted successfully.</p>
          </div>
        ) : otpStep === 'confirm_creation' ? (
          <div style={{ padding: '16px 4px', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '140px' }}>
            <p style={{ color: '#475569', fontSize: '13px', lineHeight: '1.5', margin: 0, textAlign: 'center' }}>
              Are you sure you want to create an account for <strong>{(() => {
                const applicant = appData.registration?.personalInformation?.applicant;
                const computedName = applicant ? `${applicant.firstName || ''} ${applicant.lastName || ''}`.trim() : '';
                return appData.customerName || computedName || 'Unknown';
              })()}</strong><br />(ID: <strong>{appId}</strong>)?
            </p>
          </div>
        ) : (
          <div style={{ padding: '16px 4px', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '140px' }}>
            <div>
              <p style={{ color: '#475569', fontSize: '13px', marginBottom: '16px', lineHeight: '1.5', textAlign: 'center' }}>
                Please verify the applicant's mobile number.
              </p>
              
              <div className="aw-field" style={{ marginBottom: '0' }}>
                <div className="aw-input-wrapper">
                  <Phone className="aw-input-icon" size={14} />
                  <input 
                    className="form-input aw-input aw-input--with-icon" 
                    value={otpStep === 'otp_sent' ? otpValue : (appData.registration?.personalInformation?.applicant?.mobileNo || appData.mobileNo || appData.mobile || '')} 
                    disabled={otpStep !== 'otp_sent'}
                    placeholder={otpStep === 'otp_sent' ? "Enter 4-digit OTP" : ""}
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
                      style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', padding: '4px 12px', fontSize: '12px', fontWeight: 600, background: '#0F7A4C', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', zIndex: 10 }}
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
                      style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', padding: '4px 12px', fontSize: '12px', fontWeight: 600, background: '#0F7A4C', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', zIndex: 10, opacity: otpValue.length < 4 ? 0.5 : 1 }}
                    >
                      Verify
                    </button>
                  )}
                </div>
                {otpStep === 'otp_sent' && (
                   <p style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', textAlign: 'center' }}>OTP sent to {appData.registration?.personalInformation?.applicant?.mobileNo || appData.mobileNo || appData.mobile || ''}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

    </WizardSectionLayout>
  );
}
