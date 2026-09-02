import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { MapPin, Map, Building2, Hash, HelpCircle, Upload, Image as ImageIcon } from 'lucide-react';
import iconMap from '../../config/iconMap';
import Button from '../../components/Button/Button';
import Select from '../../components/Select/Select';
import { ROUTES } from '../../config/routeConfig';
import { FIELD_VERIFICATION_STEPS } from '../../config/fieldVerificationWizard';
import { useApplicationDraftStore } from '../../state/ApplicationDraftContext';
import WizardSectionLayout from '../../components/WizardSectionLayout/WizardSectionLayout';
import { findFirstApplication, loadApplicationHeader } from '../../services/applicationApi';
import Modal from '../../components/Modal/Modal';
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
  const saved = getSectionState(appData, 'fieldVerification', {});
  const applicantSaved = saved.applicant || {};
  const documentsSaved = saved.documents || {};

  return {
    applicant: createAddressTemplate({
      ...applicantSaved,
      mailingSameAsCurrent: applicantSaved.mailingSameAsCurrent || 'No',
    }),
    documents: documentsSaved,
  };
}

function validateAddress(address) { return {}; }

function AddressCard({ title, address, onChange, errors, documents, onDocumentChange, onViewGeo, isFetchingGeo, onFetchGeo }) {
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

          <div className="aw-field">
            <label className="form-label">Geo-tagged Location</label>
            {!documents?.geoTagData ? (
              <div className="aw-input-wrapper" style={{ display: 'flex', alignItems: 'center' }}>
                <MapPin className="aw-input-icon" size={14} />
                <button
                  type="button"
                  disabled={isFetchingGeo}
                  className="form-input aw-input aw-input--with-icon"
                  style={{ textAlign: 'left', cursor: isFetchingGeo ? 'not-allowed' : 'pointer', background: '#f9fafb', opacity: isFetchingGeo ? 0.7 : 1 }}
                  onClick={onFetchGeo}
                >
                  {isFetchingGeo ? 'Fetching location...' : 'Fetch Current Location'}
                </button>
              </div>
            ) : (
              <div className="aw-input-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', fontWeight: '500', fontSize: '13px' }}>
                    <MapPin size={14} />
                    Location Captured
                  </div>
                  <button
                    type="button"
                    onClick={() => onViewGeo && onViewGeo(documents.geoTagData)}
                    style={{ background: 'transparent', border: '1px solid #166534', color: '#166534', borderRadius: '4px', fontSize: '11px', padding: '2px 8px', cursor: 'pointer', marginLeft: 'auto' }}
                  >
                    View
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="aw-field">
            <label className="form-label">Additional Images (ZIP/Image)</label>
            <div className="aw-input-wrapper" style={{ display: 'flex', alignItems: 'center' }}>
              <Upload className="aw-input-icon" size={14} />
              <input
                type="file"
                accept="image/*,.zip,application/zip"
                className="form-input aw-input aw-input--with-icon"
                style={{ paddingTop: '8px' }}
                onChange={(e) => onDocumentChange('verificationImagesZip', e.target.files[0]?.name || '')}
              />
            </div>
            {documents?.verificationImagesZip && (
              <div style={{ marginTop: '4px', fontSize: '12px', color: '#666' }}>
                Selected: {documents.verificationImagesZip}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FieldVerification() {
  const navigate = useNavigate();
  const location = useLocation();
  const { applicationId } = useParams();
  const queryApplicationId = new URLSearchParams(location.search).get('applicationId');
  const requestedApplicationId = applicationId || queryApplicationId || location.state?.applicationId || '';
  const [resolvedApplicationId, setResolvedApplicationId] = useState(requestedApplicationId);
  const appId = resolvedApplicationId || '__field-verification-loading__';
  const { getApplication, ensureApplication, saveApplication } = useApplicationDraftStore();
  const [form, setForm] = useState(() => buildAddressState(getApplication(appId)));
  const [errors, setErrors] = useState({});
  const [geoModalData, setGeoModalData] = useState(null);
  const [localGeoTagData, setLocalGeoTagData] = useState(null);
  const [isFetchingGeo, setIsFetchingGeo] = useState(false);
  const [isLoadingApplication, setIsLoadingApplication] = useState(true);
  const [applicationError, setApplicationError] = useState('');

  useEffect(() => {
    let active = true;
    async function loadHeader() {
      try {
        const id = requestedApplicationId || await findFirstApplication();
        const header = await loadApplicationHeader(id);
        if (!active) return;
        setResolvedApplicationId(String(id));
        ensureApplication(String(id), header);
        saveApplication(String(id), header);
        setApplicationError('');
      } catch (error) {
        if (active) setApplicationError(error.message || 'Unable to load application data');
      } finally {
        if (active) setIsLoadingApplication(false);
      }
    }
    loadHeader();
    return () => { active = false; };
  }, [requestedApplicationId, ensureApplication, saveApplication]);

  const handleFetchGeo = () => {
    setIsFetchingGeo(true);
    setTimeout(() => {
      setLocalGeoTagData({
        latitude: '13.0827',
        longitude: '80.2707',
        accuracy: 'Within 4.5 meters',
        timestamp: new Date().toLocaleString()
      });
      setIsFetchingGeo(false);
    }, 3000);
  };

  useEffect(() => {
    ensureApplication(appId);
  }, [appId, ensureApplication]);

  const appData = getApplication(appId);
  const ArrowLeftIcon = iconMap['ArrowLeft'];
  const InfoIcon = iconMap['Info'];

  useEffect(() => {
    setForm(buildAddressState(getApplication(appId)));
    setErrors({});
  }, [appId, getApplication]);

  const persist = (nextForm) => {
    setForm(nextForm);
    saveApplication(appId, buildSectionUpdate(appData, 'fieldVerification', nextForm));
  };

  const updateAddress = (scope, field, value) => {
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
    }
  };

  const updateDocuments = (field, value) => {
    const nextForm = {
      ...form,
      documents: {
        ...form.documents,
        [field]: value,
      },
    };
    persist(nextForm);
  };

  const validateForm = () => {
    const nextErrors = {};
    const applicantErrors = validateAddress(form.applicant);
    Object.entries(applicantErrors).forEach(([field, message]) => {
      nextErrors[`applicant.${field}`] = message;
    });

    return nextErrors;
  };

  const handleContinue = () => {
    const validationErrors = validateForm();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    saveApplication(appId, buildSectionUpdate(appData, 'fieldVerification', form));
    navigate(ROUTES.FIELD_VERIFICATION_STEP2_FOR_APPLICATION.replace(':applicationId', encodeURIComponent(appId)));
  };

  const handleBack = () => {
    navigate(ROUTES.DASHBOARD);
  };

  return (
    <WizardSectionLayout
      appId={appId}
      appData={appData}
      steps={FIELD_VERIFICATION_STEPS}
      activeStep={1}
      title="Field Verification"
      subtitle="Capture field verification details for the applicant address."
      backLabel="Back to Dashboard"
      continueLabel="Save & Continue"
      onBack={handleBack}
      onContinue={handleContinue}
      onStepClick={(step) => navigate(
        step.id === 'collateral-verification'
          ? ROUTES.FIELD_VERIFICATION_STEP2_FOR_APPLICATION.replace(':applicationId', encodeURIComponent(appId))
          : ROUTES.FIELD_VERIFICATION_FOR_APPLICATION.replace(':applicationId', encodeURIComponent(appId)),
      )}
      headerAction={
        <Button
          variant="secondary"
          size="sm"
          icon={ArrowLeftIcon ? <ArrowLeftIcon size={14} /> : null}
          onClick={handleBack}
        >
          Back to Dashboard
        </Button>
      }
      footerHint="Address details are stored against the same application ID."
    >
      {isLoadingApplication && <div className="aw-inline-alert aw-inline-alert--amber">Loading applicant details from the API...</div>}
      {applicationError && <div className="aw-inline-alert aw-inline-alert--red">{applicationError}</div>}

      <AddressCard
        title="Applicant Address"
        address={form.applicant}
        onChange={(field, value) => updateAddress('applicant', field, value)}
        errors={Object.fromEntries(
          Object.entries(errors)
            .filter(([key]) => key.startsWith('applicant.'))
            .map(([key, value]) => [key.split('.').slice(1).join('.'), value]),
        )}
        documents={{ ...form.documents, geoTagData: localGeoTagData }}
        onDocumentChange={(field, value) => {
          if (field === 'geoTagData') {
            setLocalGeoTagData(value);
          } else {
            updateDocuments(field, value);
          }
        }}
        onViewGeo={setGeoModalData}
        isFetchingGeo={isFetchingGeo}
        onFetchGeo={handleFetchGeo}
      />

      <Modal show={!!geoModalData} onHide={() => setGeoModalData(null)} title="Geo-tagged Location Details">
        {geoModalData && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '14px' }}>
            <div><strong>Latitude:</strong> {geoModalData.latitude}</div>
            <div><strong>Longitude:</strong> {geoModalData.longitude}</div>
            <div><strong>Accuracy:</strong> {geoModalData.accuracy}</div>
            <div><strong>Time:</strong> {geoModalData.timestamp}</div>
          </div>
        )}
      </Modal>
    </WizardSectionLayout>
  );
}
