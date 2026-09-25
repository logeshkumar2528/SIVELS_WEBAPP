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

function getLoggedInRMFromStorage() {
  try {
    const rmDataRaw = localStorage.getItem('rmData');
    if (rmDataRaw) {
      const parsed = JSON.parse(rmDataRaw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
    const raw = localStorage.getItem('sivels_currentUser');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {
    // ignore
  }
  return {};
}

function isNumericId(val) {
  if (val === undefined || val === null || val === '') return false;
  return /^\d+$/.test(String(val).trim());
}

function isObsoleteMock(val) {
  if (!val) return true;
  const s = String(val).trim().toLowerCase();
  return (
    s === 'anil kumar' ||
    s === 'karthik raja' ||
    s === 'rajesh kumar' ||
    s === 'muthu a' ||
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
    s === 'dinesh kumar' ||
    s === 'sivashanmugam m'
  );
}

async function fetchLiveRMNameFromApi() {
  const currentRmObj = getLoggedInRMFromStorage();
  const fallbackName = currentRmObj.fullName || currentRmObj.name || '';

  try {
    const res = await fetch(`${API_BASE}/RMMaster`);
    if (res.ok) {
      const data = await res.json();
      const rows = Array.isArray(data) ? data : (Array.isArray(data?.value) ? data.value : []);

      const currentRmId = Number(
        currentRmObj?.rmId ||
        currentRmObj?.RMId ||
        currentRmObj?.id ||
        currentRmObj?.userId ||
        localStorage.getItem('rmId') ||
        0
      );
      const currentMobile = String(
        currentRmObj?.mobileNumber ||
        currentRmObj?.phone ||
        ''
      ).replace(/\D/g, '');
      const currentEmail = String(
        currentRmObj?.emailAddress ||
        currentRmObj?.email ||
        ''
      ).trim().toLowerCase();
      const currentName = String(
        currentRmObj?.fullName ||
        currentRmObj?.name ||
        ''
      ).trim().toLowerCase();

      const match =
        (currentRmId > 0 && rows.find((r) => Number(r.rmId || r.RMId || r.id) === currentRmId)) ||
        (currentMobile && rows.find((r) => String(r.mobileNumber || '').replace(/\D/g, '') === currentMobile)) ||
        (currentEmail && rows.find((r) => String(r.emailAddress || '').trim().toLowerCase() === currentEmail)) ||
        (currentName && rows.find((r) => String(r.fullName || r.name || '').trim().toLowerCase() === currentName)) ||
        null;

      if (match?.fullName || match?.name) {
        return match.fullName || match.name;
      }
    }
  } catch (err) {
    console.error('Error fetching RM name from RMMaster:', err);
  }

  return fallbackName || '';
}

function buildDeclarationState(appData) {
  const saved = getSectionState(appData, 'declaration', {});
  const resolvedName = resolveApplicantName(appData);
  const applicantName = resolvedName !== 'Applicant' ? resolvedName : '';
  const coApplicantCount = getApplicantCount(appData);
  const savedCoApplicants = Array.isArray(saved.coApplicants) ? saved.coApplicants : [];
  const today = getTodayDate();

  const rawProductCandidate =
    (!isNumericId(appData.loanProductDisplay) ? appData.loanProductDisplay : '') ||
    (!isNumericId(appData.loanPurposeName) ? appData.loanPurposeName : '') ||
    (!isNumericId(appData.loanProductName) ? appData.loanProductName : '') ||
    (!isNumericId(appData.loanType) ? appData.loanType : '') ||
    (!isNumericId(appData.purposeOfLoan) ? appData.purposeOfLoan : '') ||
    'Personal Loan';

  const currentRmObj = getLoggedInRMFromStorage();
  const fallbackRmName = currentRmObj.fullName || currentRmObj.name || '';

  const rawSig = saved.applicantSignature;
  const rawAppDate = saved.applicantDate;
  const rawAckName = saved.ackApplicantName;
  const rawAckProduct = saved.ackProduct;
  const rawAckReceivedBy = saved.ackReceivedBy;
  const rawAckDate = saved.ackDate;

  const isInvalidAckProduct =
    !rawAckProduct ||
    isNumericId(rawAckProduct) ||
    isObsoleteMock(rawAckProduct);

  return {
    applicantSignature: isObsoleteMock(rawSig) ? '' : (rawSig || ''),
    applicantDate: isObsoleteMock(rawAppDate) ? today : rawAppDate,
    coApplicants: createArray(coApplicantCount, (index) => ({
      signature: isObsoleteMock(savedCoApplicants[index]?.signature)
        ? ''
        : savedCoApplicants[index]?.signature || '',
      date: isObsoleteMock(savedCoApplicants[index]?.date)
        ? today
        : savedCoApplicants[index]?.date || today,
    })),
    coApplicantSignature: isObsoleteMock(saved.coApplicantSignature) ? '' : (saved.coApplicantSignature || ''),
    coApplicantDate: saved.coApplicantDate || today,
    ackApplicantName: isObsoleteMock(rawAckName) ? (applicantName || '') : rawAckName,
    ackProduct: isInvalidAckProduct ? rawProductCandidate : rawAckProduct,
    ackReceivedBy: isObsoleteRmName(rawAckReceivedBy) || !rawAckReceivedBy ? fallbackRmName : rawAckReceivedBy,
    ackDate: isObsoleteMock(rawAckDate) ? today : rawAckDate,
  };
}

export function buildVerificationList(appData = {}) {
  const list = [];
  if (!appData) return list;

  // 1. Primary Applicant (Sequence 0)
  const resolvedName = resolveApplicantName(appData);
  const primaryName =
    resolvedName && resolvedName !== 'Applicant'
      ? resolvedName
      : (appData.customerName || appData.fullName || appData.applicantName || 'Primary Applicant');

  const primaryMobile =
    appData.registration?.personalInformation?.applicant?.mobileNo ||
    appData.registration?.personalInformation?.applicant?.mobileNumber ||
    appData.personalInformation?.applicant?.mobileNo ||
    appData.personalInformation?.applicant?.mobileNumber ||
    appData.sections?.personalInformation?.applicant?.mobileNo ||
    appData.sections?.personalInformation?.applicant?.mobileNumber ||
    appData.applicant?.mobileNo ||
    appData.applicant?.mobileNumber ||
    appData.mobileNo ||
    appData.mobileNumber ||
    appData.mobile ||
    '';

  list.push({
    id: 'applicant_0',
    sequenceNo: 0,
    role: 'Primary Applicant',
    name: primaryName,
    mobile: String(primaryMobile || '').trim(),
    otpSent: false,
    otp: '',
    isVerified: false,
  });

  // 2. Co-Applicants (Sequence 1..N)
  const coApplicantCount = getApplicantCount(appData);
  const coApplicants =
    appData.registration?.personalInformation?.coApplicants ||
    appData.personalInformation?.coApplicants ||
    appData.sections?.personalInformation?.coApplicants ||
    appData.coApplicants ||
    [];

  for (let i = 0; i < coApplicantCount; i++) {
    const co = (Array.isArray(coApplicants) && coApplicants[i]) || {};
    const nameParts = [co.firstName, co.middleName, co.lastName]
      .map((part) => String(part || '').trim())
      .filter(Boolean);
    const coName = nameParts.length > 0 ? nameParts.join(' ') : `Co-Applicant ${i + 1}`;
    const coMobile = co.mobileNo || co.mobileNumber || co.mobile || '';

    list.push({
      id: `coApplicant_${i + 1}`,
      sequenceNo: i + 1,
      role: `Co-Applicant ${i + 1}`,
      name: coName,
      mobile: String(coMobile || '').trim(),
      otpSent: false,
      otp: '',
      isVerified: false,
    });
  }

  return list;
}

export default function Declaration() {
  const navigate = useNavigate();
  const { applicationId } = useParams();
  const appId = applicationId;
  const { getApplication, ensureApplication, saveApplication } = useApplicationDraftStore();
  const [form, setForm] = useState(() => buildDeclarationState(getApplication(appId)));
  const [errors, setErrors] = useState({});
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [otpStep, setOtpStep] = useState('initial');
  const [verificationList, setVerificationList] = useState([]);
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
        const prodName =
          (!isNumericId(customerRecord?.loanPurposeName) ? customerRecord?.loanPurposeName : '') ||
          (!isNumericId(customerRecord?.loanProductName) ? customerRecord?.loanProductName : '') ||
          (!isNumericId(customerRecord?.loanType) ? customerRecord?.loanType : '') ||
          (!isNumericId(appData?.loanProductDisplay) ? appData?.loanProductDisplay : '') ||
          (!isNumericId(appData?.loanType) ? appData?.loanType : '') ||
          'Personal Loan';

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
          const shouldOverwriteAck = isObsoleteMock(form.ackApplicantName) || !form.ackApplicantName || form.ackApplicantName === 'Muthu A';
          const shouldOverwriteRm = isObsoleteRmName(form.ackReceivedBy) || !form.ackReceivedBy;
          const shouldOverwriteProduct = !form.ackProduct || isNumericId(form.ackProduct) || isObsoleteMock(form.ackProduct);

          const next = {
            ...form,
            applicantSignature: isObsoleteMock(form.applicantSignature) ? '' : (form.applicantSignature || ''),
            applicantDate: isObsoleteMock(form.applicantDate) ? today : (form.applicantDate || today),
            ackApplicantName: shouldOverwriteAck ? (custName || form.ackApplicantName) : form.ackApplicantName,
            ackProduct: shouldOverwriteProduct ? prodName : (form.ackProduct || prodName),
            ackReceivedBy: shouldOverwriteRm ? (resolvedRmName || form.ackReceivedBy) : (form.ackReceivedBy || resolvedRmName),
            ackDate: isObsoleteMock(form.ackDate) ? today : (form.ackDate || today),
          };

          setForm(next);
          saveApplication(appId, buildSectionUpdate(getApplication(appId), 'declaration', next));
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

  const validateDeclaration = () => {
    const nextErrors = {};

    if (!String(form.applicantSignature || '').trim()) {
      nextErrors.applicantSignature = 'Applicant signature is required';
    }

    if (!form.applicantDate) {
      nextErrors.applicantDate = 'Applicant signature date is required';
    }

    for (let i = 0; i < coApplicantCount; i++) {
      const coApp = form.coApplicants[i];
      if (!coApp || !String(coApp.signature || '').trim()) {
        nextErrors[`coApplicants.${i}.signature`] = `Co-Applicant ${i + 1} signature is required`;
      }
      if (!coApp || !coApp.date) {
        nextErrors[`coApplicants.${i}.date`] = `Co-Applicant ${i + 1} date is required`;
      }
    }

    return nextErrors;
  };

  const handleSendOtpForPerson = (personId) => {
    setVerificationList((prev) =>
      prev.map((item) => (item.id === personId ? { ...item, otpSent: true } : item))
    );
  };

  const handleOtpChangeForPerson = (personId, value) => {
    const numericOnly = String(value || '').replace(/\D/g, '');
    setVerificationList((prev) =>
      prev.map((item) => (item.id === personId ? { ...item, otp: numericOnly } : item))
    );
  };

  const handleVerifyPerson = (personId) => {
    setVerificationList((prev) => {
      const nextList = prev.map((item) => {
        if (item.id === personId) {
          if (item.otp && item.otp.trim().length > 0) {
            return { ...item, isVerified: true };
          }
        }
        return item;
      });

      const allVerified = nextList.length > 0 && nextList.every((item) => item.isVerified);
      if (allVerified) {
        setOtpStep('success');
      }

      return nextList;
    });
  };

  const handleSubmit = () => {
    const validationErrors = validateDeclaration();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setErrorPopup({
        title: 'Signatures Required',
        message: 'Applicant and all Co-Applicant signatures and dates are required before submitting.',
        variant: 'validation',
      });
      return;
    }

    saveApplication(appId, buildSectionUpdate(appData, 'declaration', form));
    setOtpStep('confirm_creation');
    const latestData = getApplication(appId) || appData;
    setVerificationList(buildVerificationList(latestData));
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
      const rawAgentId = customerRecord.agentId !== undefined ? customerRecord.agentId : customerRecord.AgentId;
      const resolvedAgentId = (rawAgentId === null || rawAgentId === undefined || rawAgentId === '')
        ? null
        : Number(rawAgentId);

      const payload = {
        agentCustomerId: Number(customerRecord.agentCustomerId || customerRecord.AgentCustomerId || appId),
        agentId: resolvedAgentId,
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
      activeStep={11}
      title="Step 11: Declaration"
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
                    className={`form-input aw-input aw-input--with-icon ${errors.applicantSignature ? 'aw-input--invalid' : ''}`}
                    value={form.applicantSignature}
                    onChange={(e) => {
                      persist({ ...form, applicantSignature: e.target.value });
                      if (errors.applicantSignature) {
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.applicantSignature;
                          return next;
                        });
                      }
                    }}
                    placeholder="Enter applicant signature"
                  />
                </div>
                {errors.applicantSignature && <span className="aw-field-error">{errors.applicantSignature}</span>}
              </div>
              <div className="aw-field">
                <label className="form-label">Date</label>
                <div className="aw-input-wrapper">
                  <Calendar className="aw-input-icon" size={14} />
                  <input
                    type="date"
                    className={`form-input aw-input aw-input--with-icon ${errors.applicantDate ? 'aw-input--invalid' : ''}`}
                    value={form.applicantDate}
                    onChange={(e) => {
                      persist({ ...form, applicantDate: e.target.value });
                      if (errors.applicantDate) {
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.applicantDate;
                          return next;
                        });
                      }
                    }}
                  />
                </div>
                {errors.applicantDate && <span className="aw-field-error">{errors.applicantDate}</span>}
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
                      className={`form-input aw-input aw-input--with-icon ${errors.applicantSignature ? 'aw-input--invalid' : ''}`}
                      value={form.applicantSignature}
                      onChange={(e) => {
                        persist({ ...form, applicantSignature: e.target.value });
                        if (errors.applicantSignature) {
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.applicantSignature;
                            return next;
                          });
                        }
                      }}
                      placeholder="Enter applicant signature"
                    />
                  </div>
                  {errors.applicantSignature && <span className="aw-field-error">{errors.applicantSignature}</span>}
                </div>
                <div className="aw-field">
                  <label className="form-label">Date</label>
                  <div className="aw-input-wrapper">
                    <Calendar className="aw-input-icon" size={14} />
                    <input
                      type="date"
                      className={`form-input aw-input aw-input--with-icon ${errors.applicantDate ? 'aw-input--invalid' : ''}`}
                      value={form.applicantDate}
                      onChange={(e) => {
                        persist({ ...form, applicantDate: e.target.value });
                        if (errors.applicantDate) {
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.applicantDate;
                            return next;
                          });
                        }
                      }}
                    />
                  </div>
                  {errors.applicantDate && <span className="aw-field-error">{errors.applicantDate}</span>}
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
                        className={`form-input aw-input aw-input--with-icon ${errors[`coApplicants.${index}.signature`] ? 'aw-input--invalid' : ''}`}
                        value={coApp.signature}
                        onChange={(e) => {
                          const updated = [...form.coApplicants];
                          updated[index] = { ...updated[index], signature: e.target.value };
                          persist({
                            ...form,
                            coApplicants: updated,
                            coApplicantSignature: updated[0]?.signature || '',
                          });
                          if (errors[`coApplicants.${index}.signature`]) {
                            setErrors((prev) => {
                              const next = { ...prev };
                              delete next[`coApplicants.${index}.signature`];
                              return next;
                            });
                          }
                        }}
                        placeholder="Enter co-applicant signature"
                      />
                    </div>
                    {errors[`coApplicants.${index}.signature`] && (
                      <span className="aw-field-error">{errors[`coApplicants.${index}.signature`]}</span>
                    )}
                  </div>
                  <div className="aw-field">
                    <label className="form-label">Date</label>
                    <div className="aw-input-wrapper">
                      <Calendar className="aw-input-icon" size={14} />
                      <input
                        type="date"
                        className={`form-input aw-input aw-input--with-icon ${errors[`coApplicants.${index}.date`] ? 'aw-input--invalid' : ''}`}
                        value={coApp.date}
                        onChange={(e) => {
                          const updated = [...form.coApplicants];
                          updated[index] = { ...updated[index], date: e.target.value };
                          persist({
                            ...form,
                            coApplicants: updated,
                            coApplicantDate: updated[0]?.date || '',
                          });
                          if (errors[`coApplicants.${index}.date`]) {
                            setErrors((prev) => {
                              const next = { ...prev };
                              delete next[`coApplicants.${index}.date`];
                              return next;
                            });
                          }
                        }}
                      />
                    </div>
                    {errors[`coApplicants.${index}.date`] && (
                      <span className="aw-field-error">{errors[`coApplicants.${index}.date`]}</span>
                    )}
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
        title={
          otpStep === 'confirm_creation'
            ? 'Confirm Account Creation'
            : otpStep === 'success'
            ? 'Application Submitted'
            : 'Verify Mobile Number'
        }
        size={otpStep === 'confirm_creation' || otpStep === 'success' ? 'sm' : 'md'}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                {verificationList.filter((p) => p.isVerified).length} of {verificationList.length} verified
              </span>
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
              minHeight: '140px',
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
              minHeight: '120px',
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
          <div style={{ padding: '4px 0' }}>
            <p
              style={{
                color: '#475569',
                fontSize: '13px',
                marginBottom: '16px',
                lineHeight: '1.5',
                textAlign: 'center',
              }}
            >
              Please verify mobile number for all applicants before final submission.
            </p>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                maxHeight: '360px',
                overflowY: 'auto',
                paddingRight: '4px',
              }}
            >
              {verificationList.map((person) => {
                const isPrimary = person.sequenceNo === 0;
                return (
                  <div
                    key={person.id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: person.isVerified ? '1px solid #86efac' : '1px solid #e2e8f0',
                      backgroundColor: person.isVerified ? '#f0fdf4' : '#f8fafc',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: isPrimary ? '#e0f2fe' : '#f1f5f9',
                            color: isPrimary ? '#0369a1' : '#475569',
                            textTransform: 'uppercase',
                            letterSpacing: '0.3px',
                          }}
                        >
                          {person.role}
                        </span>
                        <strong style={{ fontSize: '13px', color: '#1e293b' }}>{person.name}</strong>
                      </div>
                      {person.isVerified ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#16a34a',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                        >
                          <CheckCircle size={14} /> Verified
                        </span>
                      ) : !person.mobile ? (
                        <span style={{ color: '#ef4444', fontSize: '11px', fontStyle: 'italic' }}>
                          No mobile number
                        </span>
                      ) : (
                        <span
                          style={{
                            color: '#64748b',
                            fontSize: '12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Phone size={12} /> {person.mobile}
                        </span>
                      )}
                    </div>

                    {person.isVerified ? (
                      <div style={{ fontSize: '12px', color: '#15803d', marginTop: '4px' }}>
                        Mobile verification completed
                      </div>
                    ) : !person.mobile ? (
                      <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>
                        Mobile number unavailable in application data.
                      </div>
                    ) : !person.otpSent ? (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: '8px',
                          gap: '8px',
                        }}
                      >
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                          Click Send OTP to receive verification code
                        </span>
                        <button
                          type="button"
                          onClick={() => handleSendOtpForPerson(person.id)}
                          style={{
                            padding: '5px 12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            background: '#0F7A4C',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                        >
                          Send OTP
                        </button>
                      </div>
                    ) : (
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <div style={{ position: 'relative', flex: 1 }}>
                            <input
                              type="text"
                              className="form-input aw-input"
                              style={{
                                height: '34px',
                                fontSize: '12.5px',
                                padding: '0 10px',
                                width: '100%',
                              }}
                              placeholder="Enter OTP (e.g. 1234)"
                              value={person.otp}
                              onChange={(e) => handleOtpChangeForPerson(person.id, e.target.value)}
                              maxLength={6}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleVerifyPerson(person.id)}
                            disabled={!person.otp || person.otp.trim().length === 0}
                            style={{
                              padding: '5px 14px',
                              fontSize: '12px',
                              fontWeight: 600,
                              background: '#0F7A4C',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor:
                                !person.otp || person.otp.trim().length === 0
                                  ? 'not-allowed'
                                  : 'pointer',
                              opacity: !person.otp || person.otp.trim().length === 0 ? 0.5 : 1,
                              height: '34px',
                              flexShrink: 0,
                            }}
                          >
                            Verify
                          </button>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: '4px',
                          }}
                        >
                          <span style={{ fontSize: '11px', color: '#64748b' }}>
                            OTP sent to {person.mobile}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSendOtpForPerson(person.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#0F7A4C',
                              fontSize: '11px',
                              fontWeight: 500,
                              cursor: 'pointer',
                              textDecoration: 'underline',
                              padding: 0,
                            }}
                          >
                            Resend OTP
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal>
    </WizardSectionLayout>
    </>
  );
}
