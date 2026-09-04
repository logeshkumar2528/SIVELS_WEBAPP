import { useEffect, useMemo, useState } from 'react';
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
import {
  buildSectionUpdate,
  createAddressTemplate,
  createArray,
  getApplicantCount,
  getSectionState,
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

function validateAddress(address) { return {}; }

function AddressCard({ 
  title, 
  address, 
  onChange, 
  errors,
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
                className="form-input aw-input aw-input--with-icon"
                value={address.landmark}
                onChange={(e) => onChange('landmark', e.target.value)}
              />
            </div>
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
  const { getApplication, ensureApplication, saveApplication } = useApplicationDraftStore();
  const [form, setForm] = useState(() => buildAddressState(getApplication(appId)));
  const [errors, setErrors] = useState({});

  const [isLoadingMasters, setIsLoadingMasters] = useState(false);
  const [stateOptions, setStateOptions] = useState([]);
  const [cityOptions, setCityOptions] = useState([]);

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

  const [showDocsModal, setShowDocsModal] = useState(false);
  const [fullViewImage, setFullViewImage] = useState(null);
  const aadhaarFrontUrl = appData.sections?.kycDocuments?.applicant?.aadhaarFront?.preview || 'https://via.placeholder.com/400x250?text=Aadhaar+Front+Not+Uploaded';
  const aadhaarBackUrl = appData.sections?.kycDocuments?.applicant?.aadhaarBack?.preview || 'https://via.placeholder.com/400x250?text=Aadhaar+Back+Not+Uploaded';

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
      return;
    }

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';
    const allPersons = [
      { ...form.applicant, isPrimary: true },
      ...form.coApplicants.map((co, i) => ({ ...co, index: i, isPrimary: false }))
    ];

    try {
      for (const person of allPersons) {
        const personalInfoId = person.isPrimary
          ? appData.registration?.personalInformation?.applicant?.personalInformationId ||
            appData.sections?.personalInformation?.applicant?.personalInformationId ||
            appData.personalInformation?.applicant?.personalInformationId
          : appData.registration?.personalInformation?.coApplicants?.[person.index]?.personalInformationId ||
            appData.sections?.personalInformation?.coApplicants?.[person.index]?.personalInformationId ||
            appData.personalInformation?.coApplicants?.[person.index]?.personalInformationId;

        if (!personalInfoId) {
          console.warn('No Personal Information ID found, skipping Address Details API save');
          continue;
        }

        const isUpdate = !!person.addressDetailsId;
        const url = isUpdate
          ? `${baseUrl}/ApplicationAddressDetails/${person.addressDetailsId}`
          : `${baseUrl}/ApplicationAddressDetails`;

        const payload = {
          PersonalInformationId: Number(personalInfoId),
          AddressLine1: person.addressLine1 || '',
          AddressLine2: person.addressLine2 || null,
          Landmark: person.landmark || null,
          CityId: person.city ? Number(person.city) : 1, // Defaulting if not set properly
          StateId: person.state ? Number(person.state) : 1,
          Pincode: person.pincode || person.postalCode || person.Pincode || '',
          MailingAsCurrent: person.mailingSameAsCurrent === 'Yes',
          CreatedBy: 1
        };

        if (isUpdate) {
          payload.ApplicationAddressDetailsId = Number(person.addressDetailsId);
        }

        const response = await fetch(url, {
          method: isUpdate ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Failed to save: ${response.statusText}`);
        }

        let savedData = null;
        if (response.status !== 204) {
          const text = await response.text();
          if (text) { try { savedData = JSON.parse(text); } catch (e) { /* ignore */ } }
        }
        
        const savedId = savedData?.applicationAddressDetailsId || savedData?.ApplicationAddressDetailsId;
        if (savedId) {
          person.addressDetailsId = savedId;
        }
      }

      const finalForm = {
        ...form,
        applicant: { ...form.applicant, addressDetailsId: allPersons[0].addressDetailsId },
        coApplicants: form.coApplicants.map((co, i) => ({
          ...co,
          addressDetailsId: allPersons[i + 1]?.addressDetailsId || co.addressDetailsId
        }))
      };

      saveApplication(appId, buildSectionUpdate(appData, 'addressDetails', finalForm));
      navigate(ROUTES.EMPLOYMENT_INCOME.replace(':applicationId', appId));
    } catch (err) {
      console.error('Error saving Address Details:', err);
      alert('Network error while saving address details.');
    }
  };

  const handleBack = () => {
    navigate(ROUTES.PERSONAL_INFORMATION.replace(':applicationId', appId));
  };

  return (
    <>
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
        title="Applicant Aadhaar Document View"
        size="lg"
      >
        <div style={{ display: 'flex', flexDirection: 'row', gap: '16px', padding: '0 8px' }}>
          <div style={{ flex: 1 }}>
            <h4 style={{ marginBottom: '8px', fontSize: '14px', color: '#1e293b' }}>Aadhaar Front</h4>
            <div 
              style={{ width: '100%', height: '250px', backgroundColor: '#f1f5f9', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', cursor: 'pointer' }}
              onClick={() => setFullViewImage(aadhaarFrontUrl)}
              title="Click to view full size"
            >
              <img src={aadhaarFrontUrl} alt="Aadhaar Front" style={{ width: '100%', height: '100%', objectFit: 'contain', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'} />
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ marginBottom: '8px', fontSize: '14px', color: '#1e293b' }}>Aadhaar Back</h4>
            <div 
              style={{ width: '100%', height: '250px', backgroundColor: '#f1f5f9', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', cursor: 'pointer' }}
              onClick={() => setFullViewImage(aadhaarBackUrl)}
              title="Click to view full size"
            >
              <img src={aadhaarBackUrl} alt="Aadhaar Back" style={{ width: '100%', height: '100%', objectFit: 'contain', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'} />
            </div>
          </div>
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
