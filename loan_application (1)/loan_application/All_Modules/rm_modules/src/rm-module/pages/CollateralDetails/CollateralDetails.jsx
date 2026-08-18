import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Home, UserCheck, MapPin, IndianRupee } from 'lucide-react';
import iconMap from '../../config/iconMap';
import Button from '../../components/Button/Button';
import { ROUTES } from '../../config/routeConfig';
import { APPLICATION_WIZARD_STEPS } from '../../config/applicationWizard';
import { useApplicationDraftStore } from '../../state/ApplicationDraftContext';
import WizardSectionLayout from '../../components/WizardSectionLayout/WizardSectionLayout';
import { buildSectionUpdate, getSectionState } from '../applicationWizard/flowUtils';

const PROPERTY_TYPES = ['Residential', 'Commercial', 'Industrial'];
const USAGE_TYPES = ['Self-Occupied', 'Vacant', 'Rented'];

function buildCollateralState(appData) {
  const saved = getSectionState(appData, 'collateral', {});
  
  const createProperty = (source = {}) => ({
    typeOfProperty: source.typeOfProperty || '',
    usage: source.usage || '',
    locationAddress: source.locationAddress || '',
    estimatedValue: source.estimatedValue || '',
  });

  return {
    propertyOne: createProperty(saved.propertyOne),
    propertyTwo: createProperty(saved.propertyTwo),
  };
}

function CollateralForm({ title, value, onChange }) {
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
              <Home className="aw-input-icon" size={14} />
              <select className="form-select aw-input aw-input--with-icon" value={value.typeOfProperty} onChange={(e) => onChange('typeOfProperty', e.target.value)}>
                <option value="">Select property type</option>
                {PROPERTY_TYPES.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
          </div>
          <div className="aw-field">
            <label className="form-label">Usage</label>
            <div className="aw-input-wrapper">
              <UserCheck className="aw-input-icon" size={14} />
              <select className="form-select aw-input aw-input--with-icon" value={value.usage} onChange={(e) => onChange('usage', e.target.value)}>
                <option value="">Select usage</option>
                {USAGE_TYPES.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
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
        </div>
      </div>
    </div>
  );
}

export default function CollateralDetails() {
  const navigate = useNavigate();
  const { applicationId } = useParams();
  const appId = applicationId;
  const { getApplication, ensureApplication, saveApplication } = useApplicationDraftStore();
  const [form, setForm] = useState(() => buildCollateralState(getApplication(appId)));

  useEffect(() => {
    ensureApplication(appId);
  }, [appId, ensureApplication]);

  const appData = getApplication(appId);
  const ArrowLeftIcon = iconMap['ArrowLeft'];
  const InfoIcon = iconMap['Info'];
  const productCode = appData.loanProduct || appData.loanType || '';
  const collateralApplicable = ['BL', 'HL', 'LAP'].includes(productCode);

  useEffect(() => {
    setForm(buildCollateralState(getApplication(appId)));
  }, [appId, getApplication]);

  const persist = (nextForm) => {
    setForm(nextForm);
    saveApplication(appId, buildSectionUpdate(appData, 'collateral', nextForm));
  };

  const updateField = (scope, field, value) => {
    persist({ ...form, [scope]: { ...form[scope], [field]: value } });
  };

  const handleContinue = () => {
    saveApplication(appId, buildSectionUpdate(appData, 'collateral', form));
    navigate(ROUTES.REFERENCES.replace(':applicationId', appId));
  };

  const handleBack = () => {
    navigate(ROUTES.BANK_EXISTING_LOANS.replace(':applicationId', appId));
  };

  return (
    <WizardSectionLayout
      appId={appId}
      appData={appData}
      steps={APPLICATION_WIZARD_STEPS}
      activeStep={7}
      title="Step 7: Collateral Details"
      subtitle="Capture property details only when the selected loan product requires collateral."
      backLabel="Back to Banking"
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
          Back to Banking
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
            <CollateralForm title="Property 1 Details" value={form.propertyOne} onChange={(field, val) => updateField('propertyOne', field, val)} />
            <CollateralForm title="Property 2 Details" value={form.propertyTwo} onChange={(field, val) => updateField('propertyTwo', field, val)} />
          </div>
        </>
      )}
    </WizardSectionLayout>
  );
}
