import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Home, UserCheck, MapPin, IndianRupee } from 'lucide-react';
import iconMap from '../../config/iconMap';
import Button from '../../components/Button/Button';
import Select from '../../components/Select/Select';
import { ROUTES } from '../../config/routeConfig';
import { APPLICATION_WIZARD_STEPS } from '../../config/applicationWizard';
import { useApplicationDraftStore } from '../../state/ApplicationDraftContext';
import WizardSectionLayout from '../../components/WizardSectionLayout/WizardSectionLayout';
import ErrorPopup from '../../components/ErrorPopup/ErrorPopup';
import { buildSectionUpdate, getSectionState } from '../applicationWizard/flowUtils';

function buildCollateralState(appData) {
  const saved = getSectionState(appData, 'collateral', {});
  
  const createProperty = (source = {}) => ({
    applicationCollateralDetailsId: source.applicationCollateralDetailsId || null,
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

function CollateralForm({ 
  title, 
  value, 
  onChange,
  propertyOptions = [],
  usageOptions = [],
  isLoadingMasters = false
}) {
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
                 placeholder={isLoadingMasters ? "Loading..." : "Select property type"}
                 options={propertyOptions}
                 disabled={isLoadingMasters}
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
                 placeholder={isLoadingMasters ? "Loading..." : "Select usage"}
                 options={usageOptions}
                 disabled={isLoadingMasters}
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
            <label className="form-label">Estimated Value</label>
            <div className="aw-input-wrapper">
              <IndianRupee className="aw-input-icon" size={14} />
              <input type="number" className="form-input aw-input aw-input--with-icon" value={value.estimatedValue} onChange={(e) => onChange('estimatedValue', e.target.value)} />
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
  const [errorPopup, setErrorPopup] = useState(null);
  const [isLoadingMasters, setIsLoadingMasters] = useState(false);
  const [propertyOptions, setPropertyOptions] = useState([]);
  const [usageOptions, setUsageOptions] = useState([]);

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
        fetchMaster('PropertyMaster', 'propertyId', 'propertyName', setPropertyOptions),
        fetchMaster('PropertyUsageMaster', 'propertyUsageId', 'propertyUsageName', setUsageOptions),
      ]);
      setIsLoadingMasters(false);
    }
    
    loadMasters();
  }, []);

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

  const handleContinue = async () => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';
    const prodId = appData.applicationProductDetailsId;

    if (!prodId) {
      console.warn('No Application Product Details ID found, skipping Collateral API save');
    } else {
      try {
        const properties = [
          { key: 'propertyOne', data: form.propertyOne },
          { key: 'propertyTwo', data: form.propertyTwo }
        ];

        for (const prop of properties) {
          if (!prop.data.typeOfProperty) continue; // Skip if no property type selected

          const isUpdate = !!prop.data.applicationCollateralDetailsId;
          const url = isUpdate
            ? `${baseUrl}/ApplicationCollateralDetails/${prop.data.applicationCollateralDetailsId}`
            : `${baseUrl}/ApplicationCollateralDetails`;

          const payload = {
            ApplicationProductDetailsId: Number(prodId),
            PropertyId: Number(prop.data.typeOfProperty),
            PropertyUsageId: Number(prop.data.usage) || 0,
            LocationAddress: prop.data.locationAddress || '',
            EstimatedValue: Number(prop.data.estimatedValue) || 0,
            CreatedBy: 1
          };

          if (isUpdate) {
            payload.ApplicationCollateralDetailsId = Number(prop.data.applicationCollateralDetailsId);
          }

          const response = await fetch(url, {
            method: isUpdate ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            throw new Error(`Failed to save ${prop.key}: ${response.statusText}`);
          }

          let savedData = null;
          if (response.status !== 204) {
            const text = await response.text();
            if (text) { try { savedData = JSON.parse(text); } catch (e) { /* ignore */ } }
          }
          
          const savedId = savedData?.applicationCollateralDetailsId || savedData?.ApplicationCollateralDetailsId;
          if (savedId) {
            form[prop.key].applicationCollateralDetailsId = savedId;
          }
        }
      } catch (err) {
        console.error('Error saving Collateral Details:', err);
        setErrorPopup({
          title: 'Connection error',
          message: 'Network error while saving collateral details. Please try again.',
          variant: 'error',
        });
        return; // Halt continuation on error
      }
    }

    saveApplication(appId, buildSectionUpdate(appData, 'collateral', form));
    navigate(ROUTES.REFERENCES.replace(':applicationId', appId));
  };

  const handleBack = () => {
    navigate(ROUTES.BANK_EXISTING_LOANS.replace(':applicationId', appId));
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
            <CollateralForm 
              title="Property 1 Details" 
              value={form.propertyOne} 
              onChange={(field, val) => updateField('propertyOne', field, val)} 
              propertyOptions={propertyOptions}
              usageOptions={usageOptions}
              isLoadingMasters={isLoadingMasters}
            />
            <CollateralForm 
              title="Property 2 Details" 
              value={form.propertyTwo} 
              onChange={(field, val) => updateField('propertyTwo', field, val)} 
              propertyOptions={propertyOptions}
              usageOptions={usageOptions}
              isLoadingMasters={isLoadingMasters}
            />
          </div>
        </>
      )}
    </WizardSectionLayout>
    </>
  );
}
