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
import {
  buildSectionUpdate,
  createAddressTemplate,
  createArray,
  getApplicantCount,
  getSectionState,
} from '../applicationWizard/flowUtils';

const STATE_OPTIONS = [
  'Andhra Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Gujarat', 'Haryana', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Odisha', 'Punjab', 'Rajasthan',
  'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'West Bengal',
];

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

function AddressCard({ title, address, onChange, errors }) {
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
              <Building2 className="aw-input-icon" size={14} />
              <input
                className={`form-input aw-input aw-input--with-icon ${errors.city ? 'aw-input--invalid' : ''}`}
                value={address.city}
                onChange={(e) => onChange('city', e.target.value)}
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
                placeholder="Select state"
                options={STATE_OPTIONS.map((state) => ({ value: state, label: state }))}
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

  useEffect(() => {
    ensureApplication(appId);
  }, [appId, ensureApplication]);

  const appData = getApplication(appId);
  const activeCount = useMemo(() => getApplicantCount(appData), [appData]);
  const ArrowLeftIcon = iconMap['ArrowLeft'];
  const InfoIcon = iconMap['Info'];

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

  const handleContinue = () => {
    const validationErrors = validateForm();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    saveApplication(appId, buildSectionUpdate(appData, 'addressDetails', form));
    navigate(ROUTES.EMPLOYMENT_INCOME.replace(':applicationId', appId));
  };

  const handleBack = () => {
    navigate(ROUTES.PERSONAL_INFORMATION.replace(':applicationId', appId));
  };

  return (
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
    </WizardSectionLayout>
  );
}
