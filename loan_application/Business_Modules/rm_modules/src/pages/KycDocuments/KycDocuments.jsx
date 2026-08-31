import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileText, UserCheck, Image as ImageIcon, X } from 'lucide-react';
import iconMap from '../../config/iconMap';
import Button from '../../components/Button/Button';
import Modal from '../../components/Modal/Modal';
import Select from '../../components/Select/Select';
import { ROUTES } from '../../config/routeConfig';
import { APPLICATION_WIZARD_STEPS } from '../../config/applicationWizard';
import { useApplicationDraftStore } from '../../state/ApplicationDraftContext';
import WizardSectionLayout from '../../components/WizardSectionLayout/WizardSectionLayout';
import {
  buildSectionUpdate,
  createArray,
  getApplicantCount,
  getSectionState,
} from '../applicationWizard/flowUtils';

const DOCUMENT_TYPES = ['Passport', 'Driving Licence', 'Voter ID'];
const STATUS_OPTIONS = ['Pending', 'Verified'];

function last4FromValue(value = '') {
  const digits = String(value).replace(/[^\d]/g, '');
  return digits.slice(-4);
}

function buildKycState(appData) {
  const saved = getSectionState(appData, 'kycDocuments', {});
  const count = getApplicantCount(appData);
  const savedCoApplicants = Array.isArray(saved.coApplicants) ? saved.coApplicants : [];

  return {
    applicant: {
      aadhaarLast4: saved.applicant?.aadhaarLast4 || last4FromValue(appData.aadhaarNo),
      panCardNo: saved.applicant?.panCardNo || appData.panCardNo || appData.panNumber || '',
      identityDocumentType: saved.applicant?.identityDocumentType || '',
      identityDocumentNo: saved.applicant?.identityDocumentNo || '',
      verificationStatus: saved.applicant?.verificationStatus || 'Pending',
    },
    coApplicants: createArray(count, (index) => ({
      aadhaarLast4: savedCoApplicants[index]?.aadhaarLast4 || '',
      panCardNo: savedCoApplicants[index]?.panCardNo || '',
      identityDocumentType: savedCoApplicants[index]?.identityDocumentType || '',
      identityDocumentNo: savedCoApplicants[index]?.identityDocumentNo || '',
      verificationStatus: savedCoApplicants[index]?.verificationStatus || 'Pending',
    })),
  };
}

function validateKyc(person) { return {}; }

function KycCard({ title, person, onChange, errors, onViewDocuments, isCoApplicant, documentTypeOptions = [], verificationOptions = [], isLoadingMasters = false }) {
  const [otpStep, setOtpStep] = useState(person.verificationStatus === 'Verified' ? 'verified' : 'idle');
  const [otpValue, setOtpValue] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (person.verificationStatus !== 'Verified' && otpStep === 'verified') {
      setOtpStep('idle');
    } else if (person.verificationStatus === 'Verified' && otpStep !== 'verified') {
      setOtpStep('verified');
    }
  }, [person.verificationStatus, otpStep]);

  const handleSendOtp = () => {
    setOtpStep('otp_sent');
    setOtpValue('');
  };

  const handleVerifyOtp = () => {
    setOtpStep('verified');
    onChange('verificationStatus', 'Verified');
  };

  const isAadhaarComplete = person.aadhaarLast4?.length === 4;

  const handleRemoveFile = () => {
    onChange('manualDocuments', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="aw-mini-card">
      <div className="aw-mini-card__header">
        <div>
          <div className="aw-mini-card__title">{title}</div>
          <div className="aw-mini-card__subtitle">Aadhaar, PAN and identity document details</div>
        </div>
        <span className={`aw-status-pill ${person.verificationStatus === 'Verified' ? 'aw-status-pill--verified' : 'aw-status-pill--muted'}`}>
          {person.verificationStatus}
        </span>
      </div>

      <div className="aw-mini-card__body">
        <div className="aw-grid">
          <div className="aw-field">
            <label className="form-label">Aadhaar Last 4 Digits</label>
            <div className="aw-input-wrapper">
              <FileText className="aw-input-icon" size={14} />
              <input
                className={`form-input aw-input aw-input--with-icon ${errors.aadhaarLast4 ? 'aw-input--invalid' : ''}`}
                value={otpStep === 'otp_sent' ? otpValue : person.aadhaarLast4}
                placeholder={otpStep === 'otp_sent' ? "Enter OTP" : ""}
                inputMode="numeric"
                maxLength={otpStep === 'otp_sent' ? 6 : 4}
                disabled={otpStep === 'verified'}
                style={{ paddingRight: otpStep !== 'verified' && (isAadhaarComplete || otpStep === 'otp_sent') ? '76px' : '12px' }}
                onChange={(e) => {
                  if (otpStep === 'otp_sent') {
                    setOtpValue(e.target.value.replace(/[^\d]/g, ''));
                  } else {
                    onChange('aadhaarLast4', e.target.value.replace(/[^\d]/g, ''));
                    if (otpStep === 'verified') {
                      setOtpStep('idle');
                      onChange('verificationStatus', 'Pending');
                    }
                  }
                }}
              />
              {otpStep === 'idle' && isAadhaarComplete && (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', padding: '4px 10px', fontSize: '11px', fontWeight: 600, background: '#0F7A4C', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', zIndex: 10 }}
                >
                  Send OTP
                </button>
              )}
              {otpStep === 'otp_sent' && (
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={otpValue.length < 4}
                  style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', padding: '4px 10px', fontSize: '11px', fontWeight: 600, background: '#0F7A4C', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', zIndex: 10, opacity: otpValue.length < 4 ? 0.5 : 1 }}
                >
                  Verify
                </button>
              )}
            </div>
            {errors.aadhaarLast4 && <span className="aw-field-error">{errors.aadhaarLast4}</span>}
          </div>

          <div className="aw-field">
            <label className="form-label">PAN Card No.</label>
            <div className="aw-input-wrapper">
              <FileText className="aw-input-icon" size={14} />
              <input
                className={`form-input aw-input aw-input--with-icon ${errors.panCardNo ? 'aw-input--invalid' : ''}`}
                value={person.panCardNo}
                maxLength={10}
                onChange={(e) => onChange('panCardNo', e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
              />
            </div>
            {errors.panCardNo && <span className="aw-field-error">{errors.panCardNo}</span>}
          </div>

          <div className="aw-field">
            <label className="form-label">Passport / DL / Voter ID Type</label>
            <div className="aw-input-wrapper">
              <Select
                value={person.identityDocumentType}
                onChange={(val) => onChange('identityDocumentType', val)}
                options={documentTypeOptions}
                placeholder={isLoadingMasters ? "Loading..." : "Select document type"}
                disabled={isLoadingMasters}
                className={errors.identityDocumentType ? 'aw-input--invalid' : ''}
              />
            </div>
            {errors.identityDocumentType && <span className="aw-field-error">{errors.identityDocumentType}</span>}
          </div>

          <div className="aw-field">
            <label className="form-label">Document Number</label>
            <div className="aw-input-wrapper">
              <input
                type="text"
                className={`form-input aw-input ${errors.identityDocumentNo ? 'aw-input--invalid' : ''}`}
                value={person.identityDocumentNo}
                onChange={(e) => onChange('identityDocumentNo', e.target.value)}
                placeholder="Enter Document Number"
              />
            </div>
            {errors.identityDocumentNo && <span className="aw-field-error">{errors.identityDocumentNo}</span>}
          </div>

          <div className="aw-field">
            <label className="form-label">Verification Status</label>
            <div className="aw-input-wrapper">
              <Select
                value={person.verificationStatus}
                onChange={(val) => onChange('verificationStatus', val)}
                placeholder={isLoadingMasters ? "Loading..." : "Select status"}
                options={verificationOptions}
                disabled={isLoadingMasters}
                icon={<UserCheck size={14} />}
              />
            </div>
          </div>

          <div className="aw-field">
            <label className="form-label">Attached Documents</label>
            <Button
              variant="secondary"
              size="sm"
              onClick={onViewDocuments}
              icon={<ImageIcon size={14} />}
              style={{ width: '100%', height: '38px', justifyContent: 'center', background: '#f8fafc', border: '1px dashed #cbd5e1', color: '#0f172a' }}
            >
              View Documents
            </Button>
          </div>

          <div className="aw-field">
            <label className="form-label">Upload Manual Documents (ZIP/Images)</label>
            <div className="aw-input-wrapper">
              <input
                ref={fileInputRef}
                type="file"
                className="form-input aw-input"
                accept=".zip,image/*"
                multiple
                onChange={(e) => {
                  if (e.target.files.length > 0) {
                    onChange('manualDocuments', e.target.files[0].name);
                  }
                }}
                style={{ padding: '6px', paddingRight: person.manualDocuments ? '30px' : '6px' }}
              />
              {person.manualDocuments && (
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Remove file"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

  export default function KycDocuments() {
    const navigate = useNavigate();
    const { applicationId } = useParams();
    const appId = applicationId;
    const { getApplication, ensureApplication, saveApplication } = useApplicationDraftStore();
    const [form, setForm] = useState(() => buildKycState(getApplication(appId)));
    const [errors, setErrors] = useState({});

    const [viewingDocsFor, setViewingDocsFor] = useState(null);
    const [zoomedImage, setZoomedImage] = useState(null);
    const [isLoadingMasters, setIsLoadingMasters] = useState(false);
    const [documentTypeOptions, setDocumentTypeOptions] = useState([]);
    const [verificationOptions, setVerificationOptions] = useState([]);

    useEffect(() => {
      ensureApplication(appId);
    }, [appId, ensureApplication]);

    useEffect(() => {
      async function fetchMaster(endpoint, idField, nameField, setState) {
        try {
          const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';
          const res = await fetch(`${baseUrl}/${endpoint}`);
          if (res.ok) {
            const data = await res.json();
            setState(data.map(item => ({ value: item[idField], label: item[nameField], raw: item })));
          }
        } catch (e) {
          console.error(`Failed to fetch ${endpoint}:`, e);
        }
      }
      async function loadMasters() {
        setIsLoadingMasters(true);
        await Promise.allSettled([
          fetchMaster('DocumentTypeMaster', 'documentTypeId', 'documentTypeName', setDocumentTypeOptions),
          fetchMaster('VerificationMaster', 'verificationId', 'verificationName', setVerificationOptions),
        ]);
        setIsLoadingMasters(false);
      }
      loadMasters();
    }, []);

    const appData = getApplication(appId);
    const ArrowLeftIcon = iconMap['ArrowLeft'];
    const activeCount = useMemo(() => getApplicantCount(appData), [appData]);

    useEffect(() => {
      setForm(buildKycState(getApplication(appId)));
    }, [appId, activeCount, getApplication]);

    const updatePerson = (type, field, value, index = null) => {
      setForm(prev => {
        if (type === 'applicant') {
          return { ...prev, applicant: { ...prev.applicant, [field]: value } };
        } else {
          const newCo = [...prev.coApplicants];
          newCo[index] = { ...newCo[index], [field]: value };
          return { ...prev, coApplicants: newCo };
        }
      });
      if (errors[`${type}${index !== null ? `.${index}` : ''}.${field}`]) {
        setErrors(prev => {
          const newE = { ...prev };
          delete newE[`${type}${index !== null ? `.${index}` : ''}.${field}`];
          return newE;
        });
      }
    };

    const handleContinue = async () => {
      let currentErrors = {};
      const appErrs = validateKyc(form.applicant);
      if (Object.keys(appErrs).length > 0) {
        Object.entries(appErrs).forEach(([k, v]) => currentErrors[`applicant.${k}`] = v);
      }
      form.coApplicants.forEach((co, i) => {
        const coErrs = validateKyc(co);
        if (Object.keys(coErrs).length > 0) {
          Object.entries(coErrs).forEach(([k, v]) => currentErrors[`coApplicants.${i}.${k}`] = v);
        }
      });
      if (Object.keys(currentErrors).length > 0) {
        setErrors(currentErrors);
        return;
      }

      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';
      const applicationProductDetailsId = appData.applicationProductDetailsId;

      if (!applicationProductDetailsId) {
        alert('Application product details not saved yet. Please go back and save Application Details first.');
        return;
      }

      const savedSection = appData.kycDocuments || {};
      const allPersons = [
        { ...form.applicant, kycDocumentId: savedSection?.applicant?.kycDocumentId || null },
        ...form.coApplicants.map((co, i) => ({
          ...co,
          kycDocumentId: savedSection?.coApplicants?.[i]?.kycDocumentId || null,
        })),
      ];

      try {
        for (const person of allPersons) {
          const isUpdate = !!person.kycDocumentId;
          const url = isUpdate
            ? `${baseUrl}/ApplicationKYCDocuments/${person.kycDocumentId}`
            : `${baseUrl}/ApplicationKYCDocuments`;

          const payload = {
            ApplicationProductDetailsId: Number(applicationProductDetailsId),
            AadhaarLastFourDigits: person.aadhaarLast4 || null,
            PANCardNo: person.panCardNo || null,
            DocumentNumber: person.identityDocumentNo || null,
            VerificationId: person.verificationStatus ? Number(person.verificationStatus) : null,
            DocumentTypeId: person.identityDocumentType ? Number(person.identityDocumentType) : null,
            DocumentPath: null,
            CreatedBy: 1,
          };
          if (isUpdate) {
            payload.ApplicationKYCDocumentId = Number(person.kycDocumentId);
          }

          console.log(`Saving KYC [${isUpdate ? 'PUT' : 'POST'}]:`, payload);

          const response = await fetch(url, {
            method: isUpdate ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            let msg = errData.Message || errData.title || 'Unknown error';
            if (errData.errors) msg += '\n' + JSON.stringify(errData.errors, null, 2);
            alert(`Failed to save KYC:\n${msg}`);
            return;
          }

          let savedData = {};
          if (response.status !== 204) {
            const text = await response.text();
            if (text) { try { savedData = JSON.parse(text); } catch (e) { /* ignore */ } }
          }
          const savedId = savedData.applicationKYCDocumentId || savedData.ApplicationKYCDocumentId;
          if (savedId) person.kycDocumentId = savedId;
        }

        saveApplication(appId, {
          ...buildSectionUpdate(appData, 'kycDocuments', form),
          kycDocuments: {
            applicant: { ...form.applicant, kycDocumentId: allPersons[0].kycDocumentId },
            coApplicants: form.coApplicants.map((co, i) => ({
              ...co,
              kycDocumentId: allPersons[i + 1]?.kycDocumentId || co.kycDocumentId,
            })),
          },
        });

        navigate(ROUTES.PERSONAL_INFORMATION.replace(':applicationId', appId));
      } catch (err) {
        console.error('Error saving KYC:', err);
        alert('Network error while saving KYC documents.');
      }
    };
  
    const handleBack = () => {
      navigate(ROUTES.APPLICATION_DETAILS.replace(':applicationId', appId));
    };
  
    const viewingPersonTitle = viewingDocsFor === 'applicant'
      ? 'Applicant'
      : (viewingDocsFor !== null ? `Co-Applicant ${viewingDocsFor + 1}` : '');
  
    return (
      <>
        <WizardSectionLayout
          appId={appId}
          appData={appData}
          steps={APPLICATION_WIZARD_STEPS}
          activeStep={2}
          title="Step 2: KYC Documents"
          subtitle="Capture Aadhaar, PAN and identity document details. Validate Aadhaar using OTP where required."
          backLabel="Back to Application Details"
          continueLabel="Save & Continue"
          onBack={handleBack}
          onContinue={handleContinue}
          onStepClick={(step) => navigate(step.route.replace(':applicationId', appId))}
          headerAction={
            <Button
              variant="secondary"
              size="sm"
              icon={ArrowLeftIcon ? <ArrowLeftIcon size={14} /> : null}
              onClick={handleBack}
            >
              Back to Application Details
            </Button>
          }
          footerHint={`KYC details are stored for ${activeCount > 1 ? `${activeCount} applicant records` : 'the applicant record'} on the same application.`}
        >
  
          <KycCard
            title="Applicant KYC"
            person={form.applicant}
            onChange={(field, value) => updatePerson('applicant', field, value)}
            onViewDocuments={() => setViewingDocsFor('applicant')}
            documentTypeOptions={documentTypeOptions}
            verificationOptions={verificationOptions}
            isLoadingMasters={isLoadingMasters}
            errors={Object.fromEntries(
              Object.entries(errors)
                .filter(([key]) => key.startsWith('applicant.'))
                .map(([key, value]) => [key.split('.').slice(1).join('.'), value]),
            )}
          />
  
          {activeCount > 0 && form.coApplicants.map((person, index) => (
            <KycCard
              key={`co-kyc-${index}`}
              title={`Co-Applicant ${index + 1} KYC`}
              person={person}
              isCoApplicant={true}
              onChange={(field, value) => updatePerson('coApplicants', field, value, index)}
              onViewDocuments={() => setViewingDocsFor(index)}
              documentTypeOptions={documentTypeOptions}
              verificationOptions={verificationOptions}
              isLoadingMasters={isLoadingMasters}
              errors={Object.fromEntries(
                Object.entries(errors)
                  .filter(([key]) => key.startsWith(`coApplicants.${index}.`))
                  .map(([key, value]) => [key.split('.').slice(2).join('.'), value]),
              )}
            />
          ))}
        </WizardSectionLayout>
  
          <Modal show={viewingDocsFor !== null} onHide={() => setViewingDocsFor(null)} title={`${viewingPersonTitle} - Uploaded Documents`} size="lg">
            <div className="kyc-doc-gallery" style={{ display: 'grid', gap: '16px', gridTemplateColumns: viewingDocsFor === 'applicant' ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Aadhaar Card (Front)</span>
                <div 
                  style={{ width: '100%', height: '110px', borderRadius: '8px', border: '1px solid var(--color-border-light)', overflow: 'hidden', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', cursor: 'zoom-in' }}
                  onClick={() => setZoomedImage('https://placehold.co/1200x800/effaf2/0F7A4C?text=Aadhaar+Front')}
                >
                   <img src="https://placehold.co/600x400/effaf2/0F7A4C?text=Aadhaar+Front" alt="Aadhaar Front" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Aadhaar Card (Back)</span>
                <div 
                  style={{ width: '100%', height: '110px', borderRadius: '8px', border: '1px solid var(--color-border-light)', overflow: 'hidden', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', cursor: 'zoom-in' }}
                  onClick={() => setZoomedImage('https://placehold.co/1200x800/effaf2/0F7A4C?text=Aadhaar+Back')}
                >
                   <img src="https://placehold.co/600x400/effaf2/0F7A4C?text=Aadhaar+Back" alt="Aadhaar Back" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-text-primary)' }}>PAN Card</span>
                <div 
                  style={{ width: '100%', height: '110px', borderRadius: '8px', border: '1px solid var(--color-border-light)', overflow: 'hidden', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', cursor: 'zoom-in' }}
                  onClick={() => setZoomedImage('https://placehold.co/1200x800/effaf2/0F7A4C?text=PAN+Card')}
                >
                   <img src="https://placehold.co/600x400/effaf2/0F7A4C?text=PAN+Card" alt="PAN Card" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
              </div>
              
              {viewingDocsFor === 'applicant' && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Salary Slip</span>
                    <div 
                      style={{ width: '100%', height: '110px', borderRadius: '8px', border: '1px solid var(--color-border-light)', overflow: 'hidden', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', cursor: 'zoom-in' }}
                      onClick={() => setZoomedImage('https://placehold.co/1200x800/effaf2/0F7A4C?text=Salary+Slip')}
                    >
                       <img src="https://placehold.co/600x400/effaf2/0F7A4C?text=Salary+Slip" alt="Salary Slip" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Client Image</span>
                    <div 
                      style={{ width: '100%', height: '110px', borderRadius: '8px', border: '1px solid var(--color-border-light)', overflow: 'hidden', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', cursor: 'zoom-in' }}
                      onClick={() => setZoomedImage('https://placehold.co/1200x800/effaf2/0F7A4C?text=Client+Image')}
                    >
                       <img src="https://placehold.co/600x400/effaf2/0F7A4C?text=Client+Image" alt="Client Image" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                  </div>
                </>
              )}
  
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Other Document (Optional)</span>
                <div style={{ width: '100%', height: '110px', borderRadius: '8px', border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '12.5px', background: '#fafcfb' }}>
                  No additional document uploaded
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #edf2f7' }}>
              <Button variant="primary" onClick={() => setViewingDocsFor(null)}>
                Done
              </Button>
            </div>
          </Modal>
  
        {zoomedImage && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', backdropFilter: 'blur(4px)' }}
          onClick={() => setZoomedImage(null)}
        >
          <img 
            src={zoomedImage} 
            alt="Zoomed Document Preview" 
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', cursor: 'zoom-out' }} 
            onClick={(e) => e.stopPropagation()}
          />
          <button 
            onClick={() => setZoomedImage(null)}
            style={{ position: 'absolute', top: '24px', right: '32px', background: 'transparent', border: 'none', color: 'white', fontSize: '40px', cursor: 'pointer', padding: '10px', lineHeight: 1 }}
          >
            &times;
          </button>
        </div>
      )}
    </>
  );
}
