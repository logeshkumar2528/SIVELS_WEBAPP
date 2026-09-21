import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapPin, Map, Building2, Hash, HelpCircle } from 'lucide-react';
import iconMap from '../../config/iconMap';
import Button from '../../components/Button/Button';
import Select from '../../components/Select/Select';
import { ROUTES } from '../../config/routeConfig';
import { APPLICATION_WIZARD_STEPS } from '../../config/applicationWizard';
import { useApplicationDraftStore } from '../../state/ApplicationDraftContext';
import WizardSectionLayout from '../../components/WizardSectionLayout/WizardSectionLayout';
import Modal from '../../components/Modal/Modal';
import ErrorPopup from '../../components/ErrorPopup/ErrorPopup';
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

function resolveMasterId(value, options = []) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  if (Number.isFinite(num) && num > 0) return num;

  const str = String(value).trim().toLowerCase();
  const matched = options.find((opt) =>
    String(opt.label ?? opt.name ?? opt.raw?.stateName ?? opt.raw?.cityName ?? '')
      .trim()
      .toLowerCase() === str
  );
  const matchedId = Number(matched?.value ?? matched?.id ?? matched?.raw?.stateId ?? matched?.raw?.cityId);
  return Number.isFinite(matchedId) && matchedId > 0 ? matchedId : null;
}



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
  cityOptions = [],
  stateOptions = [],
  isLoadingMasters = false
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
              <Select
                error={!!errors.city}
                value={address.city}
                onChange={(val) => onChange('city', val)}
                placeholder={isLoadingMasters ? "Loading..." : "Select city"}
                options={cityOptions}
                disabled={isLoadingMasters}
                icon={<Building2 size={14} />}
              />
            </div>
            {errors.city && <span className="aw-field-error">{errors.city}</span>}
          </div>

          <div className="aw-field">
            <label className="form-label">State</label>
            <div className="aw-input-wrapper">
              <Select
                error={!!errors.state}
                value={address.state}
                onChange={(val) => onChange('state', val)}
                placeholder={isLoadingMasters ? "Loading..." : "Select state"}
                options={stateOptions}
                disabled={isLoadingMasters}
                icon={<Map size={14} />}
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
  const appId = applicationId;
  const { getApplication, ensureApplication, saveApplication, loadApplicationFromBackend } = useApplicationDraftStore();
  const [form, setForm] = useState(() => buildAddressState(getApplication(appId)));
  const [errors, setErrors] = useState({});
  const [errorPopup, setErrorPopup] = useState(null);

  const [isLoadingMasters, setIsLoadingMasters] = useState(false);
  const [stateOptions, setStateOptions] = useState([]);
  const [cityOptions, setCityOptions] = useState([]);

  useEffect(() => {
    if (appId && loadApplicationFromBackend) {
      loadApplicationFromBackend(appId);
    }
  }, [appId, loadApplicationFromBackend]);

  useEffect(() => {
    async function fetchMaster(endpoint, idField, nameField, setStateFunc) {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';
        const res = await fetch(`${baseUrl}/${endpoint}`);
        if (res.ok) {
          const data = await res.json();
          setStateFunc(data.map(item => ({ value: item[idField], label: item[nameField], raw: item })));
        }
      } catch (e) {
        console.error(`Failed to fetch ${endpoint}:`, e);
      }
    }

    async function loadMasters() {
      setIsLoadingMasters(true);
      await Promise.allSettled([
        fetchMaster('State', 'stateId', 'stateName', setStateOptions),
        fetchMaster('City', 'cityId', 'cityName', setCityOptions),
      ]);
      setIsLoadingMasters(false);
    }
    
    loadMasters();
  }, []);

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
  const [fullViewImage, setFullViewImage] = useState(null);
  const [aadhaarPreviews, setAadhaarPreviews] = useState({});
  const blobUrlsRef = useRef([]);

  const coApplicantCount = activeCount > 0 ? activeCount - 1 : (form.coApplicants?.length || 0);
  const applicantKycId = appData.sections?.kycDocuments?.applicant?.kycDocumentId || appData.kycDocuments?.applicant?.kycDocumentId;
  const coApplicantKycIdsKey = (appData.sections?.kycDocuments?.coApplicants || appData.kycDocuments?.coApplicants || [])
    .map((c) => c?.kycDocumentId || '')
    .join('-');

  useEffect(() => {
    let isMounted = true;
    const token = localStorage.getItem('authToken');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';
    const kycDocs = appData.sections?.kycDocuments || appData.kycDocuments || {};

    // 1. Load Applicant Aadhaar (Latest updated with original Agent-uploaded fallback)
    resolveLatestApplicantAadhaar({
      appData,
      appId,
      applicationProductDetailsId: resolvedApplicationProductDetailsId,
      baseUrl,
      headers,
    }).then((url) => {
      if (isMounted && url) {
        blobUrlsRef.current.push(url);
        setAadhaarPreviews((prev) => (prev.applicant === url ? prev : { ...prev, applicant: url }));
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
      }).then((url) => {
        if (isMounted && url) {
          blobUrlsRef.current.push(url);
          setAadhaarPreviews((prev) => (prev[`co_${idx}`] === url ? prev : { ...prev, [`co_${idx}`]: url }));
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
      previewUrl: aadhaarPreviews['applicant'] || null,
    },
    ...form.coApplicants.map((_, index) => ({
      label: `Co-Applicant ${index + 1}`,
      previewUrl: aadhaarPreviews[`co_${index}`] || null,
    })),
  ];

  useEffect(() => {
    setForm(buildAddressState(getApplication(appId)));
    setErrors({});
  }, [appId, getApplication]);

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

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';
    const allPersons = [
      { ...form.applicant, isPrimary: true },
      ...form.coApplicants.map((co, i) => ({ ...co, index: i, isPrimary: false }))
    ];

    try {
      const token = localStorage.getItem('authToken');
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

        const resolvedStateId = resolveMasterId(person.state, stateOptions);
        if (!resolvedStateId) {
          setErrorPopup({
            title: 'Invalid State',
            message: `Please select a valid State for ${person.isPrimary ? 'Applicant' : `Co-Applicant ${person.index + 1}`}.`,
            variant: 'validation',
          });
          return;
        }

        const resolvedCityId = resolveMasterId(person.city, cityOptions);
        if (!resolvedCityId) {
          setErrorPopup({
            title: 'Invalid City',
            message: `Please select a valid City for ${person.isPrimary ? 'Applicant' : `Co-Applicant ${person.index + 1}`}.`,
            variant: 'validation',
          });
          return;
        }

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
          PersonalInformationId: validPersonalInfoId,
          AddressLine1: person.addressLine1 || '',
          AddressLine2: person.addressLine2 || null,
          Landmark: person.landmark || null,
          CityId: resolvedCityId,
          StateId: resolvedStateId,
          Pincode: person.pincode || person.postalCode || person.Pincode || '',
          MailingAsCurrent: person.mailingSameAsCurrent === 'Yes',
          CreatedBy: 1,
        };

        if (isUpdate) {
          payload.ApplicationAddressDetailsId = validAddressId;
        }

        console.log(`Saving Address [${isUpdate ? 'PUT' : 'POST'}]:`, payload);

        const response = await fetch(url, {
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
    navigate(ROUTES.PERSONAL_INFORMATION.replace(':applicationId', appId));
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
          Back to Personal Information
        </Button>
      }
      metaAction={
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDocsModal(true)}
        >
          View Aadhaar
        </Button>
      }
      footerHint={`Address details are stored against the same application ID. ${activeCount > 1 ? `${activeCount} applicant records are linked.` : 'Only the applicant record is linked.'}`}
    >

      <AddressCard
        title="Applicant Address"
        address={form.applicant}
        onChange={(field, value) => updateAddress('applicant', field, value)}
        errors={Object.fromEntries(
          Object.entries(errors)
            .filter(([key]) => key.startsWith('applicant.'))
            .map(([key, value]) => [key.split('.').slice(1).join('.'), value]),
        )}
        cityOptions={cityOptions}
        stateOptions={stateOptions}
        isLoadingMasters={isLoadingMasters}
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
          cityOptions={cityOptions}
          stateOptions={stateOptions}
          isLoadingMasters={isLoadingMasters}
        />
      ))}
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
                  onClick={() => setFullViewImage(person.previewUrl)}
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
        show={!!fullViewImage}
        onHide={() => setFullViewImage(null)}
        title="Full View"
        size="lg"
      >
        <div style={{ width: '100%', height: '70vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
          {fullViewImage && <img src={fullViewImage} alt="Full View" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />}
        </div>
      </Modal>
    </>
  );
}
