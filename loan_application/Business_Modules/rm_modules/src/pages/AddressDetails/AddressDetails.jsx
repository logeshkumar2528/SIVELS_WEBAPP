import { apiFetch } from '../../../../../Core/src/api/apiFetch';
import { API_BASE_URL } from '../../../../../Core/src/api/apiConfig';
import { getAccessToken } from '../../../../../Core/src/auth/tokenStore';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { MapPin, Map, Hash, HelpCircle } from 'lucide-react';
import iconMap from '../../config/iconMap';
import Button from '../../components/Button/Button';
import Select from '../../components/Select/Select';
import { ROUTES } from '../../config/routeConfig';
import { APPLICATION_WIZARD_STEPS } from '../../config/applicationWizard';
import { useApplicationDraftStore } from '../../state/ApplicationDraftContext';
import WizardSectionLayout from '../../components/WizardSectionLayout/WizardSectionLayout';
import Modal from '../../components/Modal/Modal';
import CustomerProofButton from '../../components/CustomerProofViewer/CustomerProofButton';
import ErrorPopup from '../../components/ErrorPopup/ErrorPopup';
import rmCustomerService from '../../services/rmCustomerService';
import { parseApiErrorBody } from '../../utils/formatUserFacingError';
import {
  buildSectionUpdate,
  createAddressTemplate,
  createArray,
  getApplicantCount,
  getSectionState,
  resolveLatestApplicantAadhaar,
  resolveLatestCoApplicantAadhaar,
  loadApplicantAadhaarUrl,
  loadCoApplicantAadhaarUrl,
} from '../applicationWizard/flowUtils';

function buildAddressState(appData) {
  const saved = getSectionState(appData, 'addressDetails', {});
  const count = getApplicantCount(appData);
  const applicantSaved = saved.applicant || {};
  const coSaved = Array.isArray(saved.coApplicants) ? saved.coApplicants : [];

  return {
    applicant: createAddressTemplate({
      ...applicantSaved,
      mailingSameAsCurrent: applicantSaved.mailingSameAsCurrent || 'No',
    }),
    coApplicants: createArray(count, (index) => createAddressTemplate({
      ...(coSaved[index] || {}),
      mailingSameAsCurrent: coSaved[index]?.mailingSameAsCurrent || 'No',
    })),
  };
}

function validateAddress(address = {}) {
  const errors = {};

  if (!String(address.addressLine1 || '').trim()) {
    errors.addressLine1 = 'Address Line 1 is required';
  }

  // addressLine2 is OPTIONAL

  if (!String(address.landmark || '').trim()) {
    errors.landmark = 'Landmark is required';
  }

  if (!address.city || String(address.city).trim() === '') {
    errors.city = 'City is required';
  }

  if (!address.state || String(address.state).trim() === '') {
    errors.state = 'State is required';
  }

  const pinClean = String(address.pincode || '').replace(/\D/g, '');
  if (!pinClean) {
    errors.pincode = 'Pincode is required';
  } else if (pinClean.length !== 6) {
    errors.pincode = 'Pincode must be 6 digits';
  }

  return errors;
}

function AddressCard({ 
  title, 
  address, 
  onChange, 
  errors = {},
}) {
  return (
    <div className="aw-mini-card">
      <div className="aw-mini-card__header">
        <div>
          <div className="aw-mini-card__title">{title}</div>
          <div className="aw-mini-card__subtitle">Current and mailing address details</div>
        </div>
      </div>

      <div className="aw-mini-card__body">
        <div className="aw-grid">
          <div className="aw-field">
            <label className="form-label">Address Line 1</label>
            <div className="aw-input-wrapper">
              <MapPin className="aw-input-icon" size={14} />
              <input
                className={`form-input aw-input aw-input--with-icon ${errors.addressLine1 ? 'aw-input--invalid' : ''}`}
                value={address.addressLine1}
                onChange={(e) => onChange('addressLine1', e.target.value)}
              />
            </div>
            {errors.addressLine1 && <span className="aw-field-error">{errors.addressLine1}</span>}
          </div>

          <div className="aw-field">
            <label className="form-label">Address Line 2</label>
            <div className="aw-input-wrapper">
              <MapPin className="aw-input-icon" size={14} />
              <input
                className="form-input aw-input aw-input--with-icon"
                value={address.addressLine2}
                onChange={(e) => onChange('addressLine2', e.target.value)}
              />
            </div>
          </div>

          <div className="aw-field">
            <label className="form-label">Landmark</label>
            <div className="aw-input-wrapper">
              <Map className="aw-input-icon" size={14} />
              <input
                className={`form-input aw-input aw-input--with-icon ${errors.landmark ? 'aw-input--invalid' : ''}`}
                value={address.landmark}
                onChange={(e) => onChange('landmark', e.target.value)}
              />
            </div>
            {errors.landmark && <span className="aw-field-error">{errors.landmark}</span>}
          </div>

          <div className="aw-field">
            <label className="form-label">City</label>
            <div className="aw-input-wrapper">
              <MapPin className="aw-input-icon" size={14} />
              <input
                className={`form-input aw-input aw-input--with-icon ${errors.city ? 'aw-input--invalid' : ''}`}
                value={address.city || ''}
                onChange={(e) => onChange('city', e.target.value)}
              />
            </div>
            {errors.city && <span className="aw-field-error">{errors.city}</span>}
          </div>

          <div className="aw-field">
            <label className="form-label">State</label>
            <div className="aw-input-wrapper">
              <Map className="aw-input-icon" size={14} />
              <input
                className={`form-input aw-input aw-input--with-icon ${errors.state ? 'aw-input--invalid' : ''}`}
                value={address.state || ''}
                onChange={(e) => onChange('state', e.target.value)}
              />
            </div>
            {errors.state && <span className="aw-field-error">{errors.state}</span>}
          </div>

          <div className="aw-field">
            <label className="form-label">Pincode</label>
            <div className="aw-input-wrapper">
              <Hash className="aw-input-icon" size={14} />
              <input
                className={`form-input aw-input aw-input--with-icon ${errors.pincode ? 'aw-input--invalid' : ''}`}
                value={address.pincode}
                inputMode="numeric"
                maxLength={6}
                onChange={(e) => onChange('pincode', e.target.value)}
              />
            </div>
            {errors.pincode && <span className="aw-field-error">{errors.pincode}</span>}
          </div>

          <div className="aw-field">
            <label className="form-label">Mailing Same as Current?</label>
            <div className="aw-input-wrapper">
              <Select
                value={address.mailingSameAsCurrent}
                onChange={(val) => onChange('mailingSameAsCurrent', val)}
                placeholder="Select yes/no"
                options={[
                  { value: 'Yes', label: 'Yes' },
                  { value: 'No', label: 'No' },
                ]}
                icon={<HelpCircle size={14} />}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AddressDetails() {
  const navigate = useNavigate();
  const { applicationId } = useParams();
  const [searchParams] = useSearchParams();
  const isViewMode = searchParams.get('mode') === 'view';
  const appId = applicationId;
  const { applications, getApplication, ensureApplication, saveApplication, loadApplicationFromBackend } = useApplicationDraftStore();
  const hydratedAt = applications?.[appId]?._hydratedAt || 0;
  const [form, setForm] = useState(() => buildAddressState(getApplication(appId)));
  const formRef = useRef(form);
  formRef.current = form;
  const [errors, setErrors] = useState({});
  const [errorPopup, setErrorPopup] = useState(null);


  useEffect(() => {
    if (appId && loadApplicationFromBackend) {
      loadApplicationFromBackend(appId);
    }
  }, [appId, loadApplicationFromBackend]);

  useEffect(() => {
    ensureApplication(appId);
  }, [appId, ensureApplication]);

  const appData = getApplication(appId);
  const activeCount = useMemo(() => getApplicantCount(appData), [appData]);
  const ArrowLeftIcon = iconMap['ArrowLeft'];
  const InfoIcon = iconMap['Info'];

  const resolvedApplicationProductDetailsId = useMemo(() => {
    const rawId =
      appData?.applicationProductDetailsId ??
      appData?.ApplicationProductDetailsId ??
      appData?.sections?.productDetails?.applicationProductDetailsId ??
      appData?.productDetails?.applicationProductDetailsId;
    return rawId !== null && rawId !== undefined && !isNaN(Number(rawId)) && Number(rawId) > 0
      ? Number(rawId)
      : null;
  }, [appData]);

  const [showDocsModal, setShowDocsModal] = useState(false);
  const [fullViewDoc, setFullViewDoc] = useState(null);
  const [aadhaarPreviews, setAadhaarPreviews] = useState({});
  const aadhaarPrefillLoadedRef = useRef('');
  const blobUrlsRef = useRef([]);

  const coApplicantCount = activeCount;
  const applicantKycId = appData.sections?.kycDocuments?.applicant?.kycDocumentId || appData.kycDocuments?.applicant?.kycDocumentId;
  const coApplicantKycIdsKey = (appData.sections?.kycDocuments?.coApplicants || appData.kycDocuments?.coApplicants || [])
    .map((c) => c?.kycDocumentId || '')
    .join('-');

  useEffect(() => {
    const kyc = appData?.sections?.kycDocuments?.applicant || appData?.kycDocuments?.applicant || {};
    const kycDocumentId = kyc.kycDocumentId || kyc.applicationKYCDocumentId || kyc.ApplicationKYCDocumentId;
    // The KYC row ID is the source of truth for this prefill endpoint. Some
    // hydrated application records do not carry the verification-status field,
    // even though Aadhaar verification has already completed.
    if (!kycDocumentId || aadhaarPrefillLoadedRef.current === String(kycDocumentId)) return;

    let active = true;
    (async () => {
      try {
        const response = await rmCustomerService.getAadhaarAddressPrefill(kycDocumentId);
        const data = response?.data?.data || response?.data?.value || response?.data || response?.value || response;
        const address = Array.isArray(data) ? data[0] : data;
        if (!active || !address) return;
        aadhaarPrefillLoadedRef.current = String(kycDocumentId);
        const next = {
          ...formRef.current,
          applicant: {
            ...formRef.current.applicant,
            addressLine1: formRef.current.applicant.addressLine1 || address.addressLine1 || address.AddressLine1 || '',
            addressLine2: formRef.current.applicant.addressLine2 || address.addressLine2 || address.AddressLine2 || '',
            landmark: formRef.current.applicant.landmark || address.landmark || address.Landmark || '',
            pincode: formRef.current.applicant.pincode || address.pincode || address.Pincode || '',
            state: formRef.current.applicant.state || address.state || address.State || address.stateName || address.StateName || '',
            city: formRef.current.applicant.city || address.cityOrDistrict || address.CityOrDistrict || address.city || address.City || address.cityName || address.CityName || '',
          },
        };
        setForm(next);
        saveApplication(appId, buildSectionUpdate(appData, 'addressDetails', next));
      } catch (error) {
        console.error('Unable to load Aadhaar address prefill:', error);
      }
    })();
    return () => { active = false; };
  }, [appData, appId, saveApplication, coApplicantKycIdsKey]);

  // Load Aadhaar address data for each co-applicant using that person's KYC
  // document ID.  The primary-applicant prefill above must not be reused for
  // co-applicant address cards.
  useEffect(() => {
    const kycApplicants = appData?.sections?.kycDocuments?.coApplicants || appData?.kycDocuments?.coApplicants || [];
    if (!Array.isArray(kycApplicants) || kycApplicants.length === 0) return undefined;

    let active = true;
    (async () => {
      const prefills = await Promise.all(kycApplicants.map(async (kyc, index) => {
        const kycDocumentId = kyc?.kycDocumentId || kyc?.applicationKYCDocumentId || kyc?.ApplicationKYCDocumentId;
        if (!kycDocumentId || aadhaarPrefillLoadedRef.current === `co:${index}:${kycDocumentId}`) return null;
        try {
          const response = await rmCustomerService.getAadhaarAddressPrefill(kycDocumentId);
          const data = response?.data?.data || response?.data?.value || response?.data || response?.value || response;
          const address = Array.isArray(data) ? data[0] : data;
          return address ? { index, kycDocumentId, address } : null;
        } catch (error) {
          console.error(`Unable to load Aadhaar address prefill for co-applicant ${index + 1}:`, error);
          return null;
        }
      }));

      if (!active) return;
      const validPrefills = prefills.filter(Boolean);
      if (validPrefills.length === 0) return;

      const next = {
        ...formRef.current,
        coApplicants: formRef.current.coApplicants.map((coApplicant, index) => {
          const match = validPrefills.find((item) => item.index === index);
          if (!match) return coApplicant;
          const address = match.address;
          aadhaarPrefillLoadedRef.current = `co:${index}:${match.kycDocumentId}`;
          return {
            ...coApplicant,
            addressLine1: coApplicant.addressLine1 || address.addressLine1 || address.AddressLine1 || '',
            addressLine2: coApplicant.addressLine2 || address.addressLine2 || address.AddressLine2 || '',
            landmark: coApplicant.landmark || address.landmark || address.Landmark || '',
            pincode: coApplicant.pincode || address.pincode || address.Pincode || '',
            state: coApplicant.state || address.state || address.State || address.stateName || address.StateName || '',
            city: coApplicant.city || address.cityOrDistrict || address.CityOrDistrict || address.city || address.City || address.cityName || address.CityName || '',
          };
        }),
      };
      setForm(next);
      saveApplication(appId, buildSectionUpdate(appData, 'addressDetails', next));
    })();

    return () => { active = false; };
  }, [appData, appId, saveApplication, coApplicantKycIdsKey]);

  useEffect(() => {
    let isMounted = true;
    const token = getAccessToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const baseUrl = API_BASE_URL;
    const kycDocs = appData.sections?.kycDocuments || appData.kycDocuments || {};

    // 1. Load Applicant Aadhaar (Latest updated with original Agent-uploaded fallback)
    resolveLatestApplicantAadhaar({
      appData,
      appId,
      applicationProductDetailsId: resolvedApplicationProductDetailsId,
      baseUrl,
      headers,
    }).then((doc) => {
      if (isMounted && doc) {
        if (doc.url) blobUrlsRef.current.push(doc.url);
        setAadhaarPreviews((prev) => ({ ...prev, applicant: doc }));
      }
    });

    // 2. Load Co-Applicants Aadhaar (Latest updated with original RM-uploaded fallback)
    for (let idx = 0; idx < coApplicantCount; idx++) {
      const coKyc = kycDocs.coApplicants?.[idx] || {};
      const coPerson = form.coApplicants?.[idx] || {};
      resolveLatestCoApplicantAadhaar({
        coKyc,
        coPersonalInfo: coPerson,
        coIndex: idx,
        appData,
        appId,
        applicationProductDetailsId: resolvedApplicationProductDetailsId,
        baseUrl,
        headers,
      }).then((doc) => {
        if (isMounted && doc) {
          if (doc.url) blobUrlsRef.current.push(doc.url);
          setAadhaarPreviews((prev) => ({ ...prev, [`co_${idx}`]: doc }));
        }
      });
    }

    return () => {
      isMounted = false;
      blobUrlsRef.current.forEach((url) => {
        try { URL.revokeObjectURL(url); } catch {}
      });
      blobUrlsRef.current = [];
    };
  }, [appId, resolvedApplicationProductDetailsId, coApplicantCount, applicantKycId, coApplicantKycIdsKey]);

  const aadhaarDocumentPeople = [
    {
      label: 'Applicant',
      previewUrl: aadhaarPreviews['applicant']?.url || null,
      isPdf: aadhaarPreviews['applicant']?.isPdf || false,
    },
    ...form.coApplicants.map((_, index) => ({
      label: `Co-Applicant ${index + 1}`,
      previewUrl: aadhaarPreviews[`co_${index}`]?.url || null,
      isPdf: aadhaarPreviews[`co_${index}`]?.isPdf || false,
    })),
  ];

  useEffect(() => {
    setForm(buildAddressState(getApplication(appId)));
    setErrors({});
  }, [appId, getApplication, hydratedAt]);

  const persist = (nextForm) => {
    setForm(nextForm);
    saveApplication(appId, buildSectionUpdate(appData, 'addressDetails', nextForm));
  };

  const updateAddress = (scope, field, value, index = null) => {
    if (scope === 'applicant') {
      const nextForm = {
        ...form,
        applicant: {
          ...form.applicant,
          [field]: value,
        },
      };
      persist(nextForm);
      setErrors((current) => {
        const next = { ...current };
        delete next[`applicant.${field}`];
        return next;
      });
      return;
    }

    const nextCoApplicants = form.coApplicants.map((address, currentIndex) => (
      currentIndex === index ? { ...address, [field]: value } : address
    ));
    const nextForm = { ...form, coApplicants: nextCoApplicants };
    persist(nextForm);
    setErrors((current) => {
      const next = { ...current };
      delete next[`coApplicants.${index}.${field}`];
      return next;
    });
  };

  const validateForm = () => {
    const nextErrors = {};
    const applicantErrors = validateAddress(form.applicant);
    Object.entries(applicantErrors).forEach(([field, message]) => {
      nextErrors[`applicant.${field}`] = message;
    });

    form.coApplicants.forEach((address, index) => {
      const addressErrors = validateAddress(address);
      Object.entries(addressErrors).forEach(([field, message]) => {
        nextErrors[`coApplicants.${index}.${field}`] = message;
      });
    });

    return nextErrors;
  };

  const handleContinue = async () => {
    if (isViewMode) {
      navigate(`${ROUTES.EMPLOYMENT_INCOME.replace(':applicationId', appId)}?mode=view`);
      return;
    }
    const validationErrors = validateForm();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setErrorPopup({
        title: 'Validation Error',
        message: 'Please fill all required address fields before continuing.',
        variant: 'validation',
      });
      return;
    }

    const baseUrl = API_BASE_URL;
    const allPersons = [
      { ...form.applicant, isPrimary: true },
      ...form.coApplicants.map((co, i) => ({ ...co, index: i, isPrimary: false }))
    ];

    try {
      const token = getAccessToken();
      const authHeaders = {
        'Content-Type': 'application/json',
      };
      if (token) {
        authHeaders['Authorization'] = `Bearer ${token}`;
      }

      const currentApp = getApplication(appId) || appData;

      const coApplicantPersonalInfoIds = new Set(
        (
          currentApp.registration?.personalInformation?.coApplicants ||
          currentApp.sections?.personalInformation?.coApplicants ||
          currentApp.personalInformation?.coApplicants ||
          []
        )
          .map((c) => c?.personalInformationId ?? c?.PersonalInformationId)
          .filter((id) => id !== null && id !== undefined && id !== '' && !isNaN(Number(id)))
          .map(Number)
      );

      const rawApplicantPersonalInfoId =
        currentApp.registration?.personalInformation?.applicant?.personalInformationId ||
        currentApp.registration?.primaryApplicant?.personalInformationId ||
        currentApp.sections?.personalInformation?.applicant?.personalInformationId ||
        currentApp.personalInformation?.applicant?.personalInformationId;

      const applicantPersonalInfoId =
        rawApplicantPersonalInfoId &&
        !isNaN(Number(rawApplicantPersonalInfoId)) &&
        Number(rawApplicantPersonalInfoId) > 0 &&
        !coApplicantPersonalInfoIds.has(Number(rawApplicantPersonalInfoId))
          ? Number(rawApplicantPersonalInfoId)
          : null;

      const usedPersonalInformationIds = new Set();
      const claimedAddressDetailsIds = new Set();

      for (const person of allPersons) {
        const rawCoPersonalInfoId =
          currentApp.registration?.personalInformation?.coApplicants?.[person.index]?.personalInformationId ||
          currentApp.sections?.personalInformation?.coApplicants?.[person.index]?.personalInformationId ||
          currentApp.personalInformation?.coApplicants?.[person.index]?.personalInformationId;

        const coPersonalInfoId =
          rawCoPersonalInfoId !== null &&
          rawCoPersonalInfoId !== undefined &&
          !isNaN(Number(rawCoPersonalInfoId)) &&
          Number(rawCoPersonalInfoId) > 0
            ? Number(rawCoPersonalInfoId)
            : null;

        const validPersonalInfoId = person.isPrimary ? applicantPersonalInfoId : coPersonalInfoId;

        if (!validPersonalInfoId) {
          setErrorPopup({
            title: 'Missing Personal Information',
            message: person.isPrimary
              ? 'Personal information must be saved for Applicant before address details.'
              : `Personal information must be saved for Co-Applicant ${person.index + 1} before address details.`,
            variant: 'validation',
          });
          return;
        }

        if (usedPersonalInformationIds.has(validPersonalInfoId)) {
          setErrorPopup({
            title: 'Duplicate Personal Information',
            message: 'Applicant and Co-Applicant cannot share the same personal information record.',
            variant: 'validation',
          });
          return;
        }
        usedPersonalInformationIds.add(validPersonalInfoId);

        let validAddressId =
          person.addressDetailsId !== null &&
          person.addressDetailsId !== undefined &&
          !isNaN(Number(person.addressDetailsId)) &&
          Number(person.addressDetailsId) > 0
            ? Number(person.addressDetailsId)
            : null;

        // Prevent address ID collision across persons: if addressDetailsId is already claimed, clear it to force POST
        if (validAddressId && claimedAddressDetailsIds.has(validAddressId)) {
          validAddressId = null;
          person.addressDetailsId = null;
        }

        // Verify that existingAddressId belongs to this person's personalInformationId if known
        if (validAddressId && person.personalInformationId && Number(person.personalInformationId) !== validPersonalInfoId) {
          validAddressId = null;
          person.addressDetailsId = null;
        }

        const isUpdate = Boolean(validAddressId);
        const url = isUpdate
          ? `${baseUrl}/ApplicationAddressDetails/${validAddressId}`
          : `${baseUrl}/ApplicationAddressDetails`;

        const payload = {
          personalInformationId: validPersonalInfoId,
          addressLine1: person.addressLine1 || '',
          addressLine2: person.addressLine2 || null,
          landmark: person.landmark || null,
          city: person.city || '',
          state: person.state || '',
          pincode: person.pincode || person.postalCode || person.Pincode || '',
          mailingAsCurrent: person.mailingSameAsCurrent === 'Yes',
        };

        // The update API requires the address record ID in both the URL and
        // payload. Keep this out of POST requests, but include it for PUT so
        // the backend can validate that both IDs refer to the same record.
        if (isUpdate) {
          payload.ApplicationAddressDetailsId = validAddressId;
        }

        console.log(`Saving Address [${isUpdate ? 'PUT' : 'POST'}]:`, payload);

        const response = await apiFetch(url, {
          method: isUpdate ? 'PUT' : 'POST',
          headers: authHeaders,
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const parsed = parseApiErrorBody(
            errData,
            `Unable to save address details (${response.statusText || response.status}). Please check the form and try again.`
          );
          setErrorPopup({
            title: 'Could not save address',
            message: parsed.message,
            details: parsed.items,
            variant: parsed.variant,
          });
          return;
        }

        let savedData = null;
        if (response.status !== 204) {
          const text = await response.text();
          if (text) {
            try {
              savedData = JSON.parse(text);
            } catch (e) {
              /* ignore */
            }
          }
        }

        const savedId =
          savedData?.applicationAddressDetailsId ??
          savedData?.ApplicationAddressDetailsId ??
          savedData?.addressDetailsId ??
          savedData?.AddressDetailsId ??
          savedData?.id ??
          savedData?.Id ??
          (typeof savedData === 'number' ? savedData : null);

        if (savedId !== null && savedId !== undefined && !isNaN(Number(savedId)) && Number(savedId) > 0) {
          person.addressDetailsId = Number(savedId);
          claimedAddressDetailsIds.add(Number(savedId));
        } else if (validAddressId) {
          claimedAddressDetailsIds.add(validAddressId);
        }
      }

      const finalApplicantAddressId = allPersons[0]?.addressDetailsId || form.applicant?.addressDetailsId || null;
      const finalCoApplicants = form.coApplicants.map((co, i) => {
        let coAddressId = allPersons[i + 1]?.addressDetailsId || co.addressDetailsId || null;
        if (coAddressId && coAddressId === finalApplicantAddressId) {
          coAddressId = null;
        }
        return {
          ...co,
          addressDetailsId: coAddressId,
        };
      });

      const finalForm = {
        ...form,
        applicant: {
          ...form.applicant,
          addressDetailsId: finalApplicantAddressId,
        },
        coApplicants: finalCoApplicants,
      };

      setForm(finalForm);
      saveApplication(appId, buildSectionUpdate(appData, 'addressDetails', finalForm));
      navigate(ROUTES.EMPLOYMENT_INCOME.replace(':applicationId', appId));
    } catch (err) {
      console.error('Error saving Address Details:', err);
      setErrorPopup({
        title: 'Connection error',
        message: err.message || 'Network error while saving address details. Please try again.',
        variant: 'error',
      });
    }
  };

  const handleBack = () => {
    navigate(isViewMode ? `${ROUTES.PERSONAL_INFORMATION.replace(':applicationId', appId)}?mode=view` : ROUTES.PERSONAL_INFORMATION.replace(':applicationId', appId));
  };

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
      activeStep={4}
      title="Step 4: Address Details"
      subtitle="Capture the applicant and co-applicant address information exactly as shown in the loan application form."
      backLabel="Back to Personal Information"
      continueLabel={isViewMode ? 'Next' : 'Save & Continue'}
      onBack={handleBack}
      onContinue={handleContinue}
      onStepClick={(step) => navigate(isViewMode ? `${step.route.replace(':applicationId', appId)}?mode=view` : step.route.replace(':applicationId', appId))}
      headerAction={
        <Button
          variant="secondary"
          size="sm"
          icon={ArrowLeftIcon ? <ArrowLeftIcon size={14} /> : null}
          onClick={handleBack}
        >
          Back to Personal Information
        </Button>
      }
      metaAction={
        <>
          <CustomerProofButton appId={appId} appData={appData} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDocsModal(true)}
          >
            View Aadhaar
          </Button>
        </>
      }
      footerHint={`Address details are stored against the same application ID. ${activeCount > 1 ? `${activeCount} applicant records are linked.` : 'Only the applicant record is linked.'}`}
    >
      <fieldset disabled={isViewMode} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      <AddressCard
        title="Applicant Address"
        address={form.applicant}
        onChange={(field, value) => updateAddress('applicant', field, value)}
        errors={Object.fromEntries(
          Object.entries(errors)
            .filter(([key]) => key.startsWith('applicant.'))
            .map(([key, value]) => [key.split('.').slice(1).join('.'), value]),
        )}
      />

      {activeCount > 0 && form.coApplicants.map((address, index) => (
        <AddressCard
          key={`co-address-${index}`}
          title={`Co-Applicant ${index + 1} Address`}
          address={address}
          onChange={(field, value) => updateAddress('coApplicants', field, value, index)}
          errors={Object.fromEntries(
            Object.entries(errors)
              .filter(([key]) => key.startsWith(`coApplicants.${index}.`))
              .map(([key, value]) => [key.split('.').slice(2).join('.'), value]),
          )}
        />
      ))}
      </fieldset>
    </WizardSectionLayout>

      <Modal 
        show={showDocsModal} 
        onHide={() => setShowDocsModal(false)} 
        title="Aadhaar Document View"
        size="lg"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '0 8px' }}>
          {aadhaarDocumentPeople.map((person) => (
            <div key={person.label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{person.label}</h4>
              {person.previewUrl ? (
                person.isPdf ? (
                  <div
                    style={{
                      width: '100%',
                      height: '350px',
                      backgroundColor: '#ffffff',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <iframe
                      src={person.previewUrl}
                      title={`${person.label} Aadhaar`}
                      style={{ width: '100%', height: '100%', border: 'none' }}
                    />
                  </div>
                ) : (
                  <div 
                    style={{
                      width: '100%',
                      height: '240px',
                      backgroundColor: '#ffffff',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      border: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onClick={() => setFullViewDoc({ url: person.previewUrl, isPdf: false })}
                    title="Click to view full size"
                  >
                    <img
                      src={person.previewUrl}
                      alt={`${person.label} Aadhaar`}
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', transition: 'transform 0.2s' }}
                      onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'}
                      onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                    />
                  </div>
                )
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100px',
                    backgroundColor: '#ffffff',
                    borderRadius: '6px',
                    border: '1px dashed #cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b',
                    fontSize: '13px'
                  }}
                >
                  Aadhaar document not available
                </div>
              )}
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        show={Boolean(fullViewDoc)}
        onHide={() => setFullViewDoc(null)}
        title="Full View"
        size="lg"
      >
        <div style={{ width: '100%', height: '70vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
          {fullViewDoc && (
            fullViewDoc.isPdf ? (
              <iframe
                src={fullViewDoc.url}
                title="Full View PDF"
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            ) : (
              <img src={fullViewDoc.url} alt="Full View" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            )
          )}
        </div>
      </Modal>
    </>
  );
}
