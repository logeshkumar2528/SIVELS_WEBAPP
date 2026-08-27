import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Home, UserCheck, MapPin, IndianRupee, Upload, Image as ImageIcon, CheckCircle } from 'lucide-react';
import iconMap from '../../config/iconMap';
import Button from '../../components/Button/Button';
import Select from '../../components/Select/Select';
import { ROUTES } from '../../config/routeConfig';
import { FIELD_VERIFICATION_STEPS } from '../../config/fieldVerificationWizard';
import { useApplicationDraftStore } from '../../state/ApplicationDraftContext';
import WizardSectionLayout from '../../components/WizardSectionLayout/WizardSectionLayout';
import Modal from '../../components/Modal/Modal';
import { buildSectionUpdate, getSectionState } from '../applicationWizard/flowUtils';

const PROPERTY_TYPES = ['Residential', 'Commercial', 'Industrial'];
const USAGE_TYPES = ['Self-Occupied', 'Vacant', 'Rented'];

function buildCollateralState(appData) {
  const saved = getSectionState(appData, 'fieldVerificationCollateral', {});
  
  const createProperty = (source = {}) => ({
    typeOfProperty: source.typeOfProperty || '',
    usage: source.usage || '',
    locationAddress: source.locationAddress || '',
    estimatedValue: source.estimatedValue || '',
    geoTagImage: source.geoTagImage || '',
    verificationImagesZip: source.verificationImagesZip || '',
  });

  return {
    propertyCount: saved.propertyCount !== undefined ? saved.propertyCount : 0,
    properties: Array.isArray(saved.properties) ? saved.properties.map(createProperty) : [],
  };
}

function CollateralForm({ title, value, onChange, onViewGeo, isFetchingGeo, onFetchGeo }) {
  return (
    <div className="aw-mini-card">
      <div className="aw-mini-card__header">
        <div>
          <div className="aw-mini-card__title">{title}</div>
          <div className="aw-mini-card__subtitle">Applicable for BL, HL and LAP only</div>
        </div>
      </div>
      <div className="aw-mini-card__body">
        <div className="aw-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <div className="aw-field">
            <label className="form-label">Type of Property</label>
            <div className="aw-input-wrapper">
              <Select 
                 value={value.typeOfProperty} 
                 onChange={(val) => onChange('typeOfProperty', val)}
                 placeholder="Select property type"
                 options={PROPERTY_TYPES.map((option) => ({value: option, label: option}))}
                 icon={<Home size={14} />}
              />
            </div>
          </div>
          <div className="aw-field">
            <label className="form-label">Usage</label>
            <div className="aw-input-wrapper">
              <Select 
                 value={value.usage} 
                 onChange={(val) => onChange('usage', val)}
                 placeholder="Select usage"
                 options={USAGE_TYPES.map((option) => ({value: option, label: option}))}
                 icon={<UserCheck size={14} />}
              />
            </div>
          </div>
          <div className="aw-field">
            <label className="form-label">Location / Address</label>
            <div className="aw-input-wrapper">
              <MapPin className="aw-input-icon" size={14} />
              <input className="form-input aw-input aw-input--with-icon" value={value.locationAddress} onChange={(e) => onChange('locationAddress', e.target.value)} />
            </div>
          </div>
          <div className="aw-field">
            <label className="form-label">Estimated Value (Rs.)</label>
            <div className="aw-input-wrapper">
              <IndianRupee className="aw-input-icon" size={14} />
              <input className="form-input aw-input aw-input--with-icon" type="number" min="0" step="1" value={value.estimatedValue} onChange={(e) => onChange('estimatedValue', e.target.value)} />
            </div>
          </div>

          <div className="aw-field">
            <label className="form-label">Geo-tagged Location</label>
            {!value.geoTagData ? (
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
                    onClick={() => onViewGeo && onViewGeo(value.geoTagData)}
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
                onChange={(e) => onChange('verificationImagesZip', e.target.files[0]?.name || '')}
              />
            </div>
            {value.verificationImagesZip && (
              <div style={{ marginTop: '4px', fontSize: '12px', color: '#666' }}>
                Selected: {value.verificationImagesZip}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FieldVerificationStep2() {
  const navigate = useNavigate();
  const { applicationId } = useParams();
  const appId = applicationId || 'APP-2024-001';
  const { getApplication, ensureApplication, saveApplication } = useApplicationDraftStore();
  const [form, setForm] = useState(() => buildCollateralState(getApplication(appId)));
  const [geoModalData, setGeoModalData] = useState(null);
  const [localGeoTagDataMap, setLocalGeoTagDataMap] = useState({});
  const [isFetchingGeoMap, setIsFetchingGeoMap] = useState({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleFetchGeo = (idx) => {
    setIsFetchingGeoMap(prev => ({ ...prev, [idx]: true }));
    setTimeout(() => {
      setLocalGeoTagDataMap(prev => ({
        ...prev,
        [idx]: {
          latitude: '13.0827',
          longitude: '80.2707',
          accuracy: 'Within 4.5 meters',
          timestamp: new Date().toLocaleString()
        }
      }));
      setIsFetchingGeoMap(prev => ({ ...prev, [idx]: false }));
    }, 3000);
  };

  useEffect(() => {
    ensureApplication(appId);
  }, [appId, ensureApplication]);

  const appData = getApplication(appId);
  const ArrowLeftIcon = iconMap['ArrowLeft'];
  const InfoIcon = iconMap['Info'];
  const productCode = appData.loanProduct || appData.loanType || '';
  const collateralApplicable = ['BL', 'HL', 'LAP'].includes(productCode);
  const applicantName = appData?.sections?.customerRegistration?.applicant?.firstName || appData?.customerName || 'Venkatesh S';

  useEffect(() => {
    setForm(buildCollateralState(getApplication(appId)));
  }, [appId, getApplication]);

  const persist = (nextForm) => {
    setForm(nextForm);
    saveApplication(appId, buildSectionUpdate(appData, 'fieldVerificationCollateral', nextForm));
  };

  const handlePropertyCountChange = (value) => {
    // Treat empty string as 0 to allow the user to clear the input
    const count = value === '' ? 0 : (parseInt(value, 10) || 0);
    const currentProperties = [...form.properties];
    
    if (count > currentProperties.length) {
      for (let i = currentProperties.length; i < count; i++) {
        currentProperties.push({
          typeOfProperty: '',
          usage: '',
          locationAddress: '',
          estimatedValue: '',
          geoTagImage: '',
          verificationImagesZip: '',
        });
      }
    } else if (count < currentProperties.length && count >= 0) {
      currentProperties.length = count;
    }

    persist({ ...form, propertyCount: value === '' ? '' : count, properties: currentProperties });
  };

  const updateField = (index, field, value) => {
    const newProperties = [...form.properties];
    newProperties[index] = { ...newProperties[index], [field]: value };
    persist({ ...form, properties: newProperties });
  };

  const handleContinue = () => {
    saveApplication(appId, buildSectionUpdate(appData, 'fieldVerificationCollateral', form));
    setShowSuccessModal(true);
  };

  const handleBack = () => {
    navigate(ROUTES.FIELD_VERIFICATION);
  };

  return (
    <WizardSectionLayout
      appId={appId}
      appData={appData}
      steps={FIELD_VERIFICATION_STEPS}
      activeStep={2}
      title="Step 2: Collateral Verification"
      subtitle="Capture property details only when the selected loan product requires collateral."
      backLabel="Back"
      continueLabel="Finish Verification"
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
          Back
        </Button>
      }
    >
      {!collateralApplicable ? (
        <div className="aw-inline-alert aw-inline-alert--amber">
          {InfoIcon && <InfoIcon size={14} />}
          <span>Collateral details are not applicable for this loan product.</span>
        </div>
      ) : (
        <>
          <div className="aw-inline-alert aw-inline-alert--green">
            {InfoIcon && <InfoIcon size={14} />}
            <span>Collateral fields apply only to BL, HL and LAP loan products.</span>
          </div>
          
          <div className="aw-field" style={{ marginBottom: '24px', maxWidth: '300px' }}>
            <label className="form-label">Total Number of Properties</label>
            <div className="aw-input-wrapper">
              <Home className="aw-input-icon" size={14} />
              <input 
                className="form-input aw-input aw-input--with-icon" 
                type="number" 
                min="0" 
                max="10" 
                value={form.propertyCount} 
                onChange={(e) => handlePropertyCountChange(e.target.value)} 
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
            {form.properties.map((prop, idx) => (
                <CollateralForm 
                  key={idx}
                  title={`Property ${idx + 1} Details`} 
                  value={{ ...prop, geoTagData: localGeoTagDataMap[idx] || prop.geoTagData }} 
                  onChange={(field, val) => {
                    if (field === 'geoTagData') {
                      setLocalGeoTagDataMap(prev => ({ ...prev, [idx]: val }));
                    } else {
                      updateField(idx, field, val);
                    }
                  }}
                  onViewGeo={setGeoModalData}
                  isFetchingGeo={isFetchingGeoMap[idx]}
                  onFetchGeo={() => handleFetchGeo(idx)}
                />
            ))}
          </div>
        </>
      )}

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

      <Modal show={showSuccessModal} onHide={() => {}} title="" size="sm">
        <div style={{ textAlign: 'center', padding: '8px 4px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', marginBottom: '16px' }}>
            <CheckCircle size={24} />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>Application Created</h2>
          <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>Application submitted successfully to back office.</p>
          
          <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'left', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#64748b', fontSize: '12px' }}>Applicant Name</span>
              <span style={{ color: '#0f172a', fontSize: '13px', fontWeight: '500' }}>{applicantName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b', fontSize: '12px' }}>Application ID</span>
              <span style={{ color: '#0f172a', fontSize: '13px', fontWeight: '500' }}>{appId}</span>
            </div>
          </div>
          
          <Button variant="primary" style={{ width: '100%', background: '#059669', borderColor: '#059669', padding: '8px 0' }} onClick={() => navigate('/rm/applications/submission-history')}>
            Continue
          </Button>
        </div>
      </Modal>
    </WizardSectionLayout>
  );
}
