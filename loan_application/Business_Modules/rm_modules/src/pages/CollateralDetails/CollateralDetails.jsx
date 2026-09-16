import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Home, UserCheck, MapPin, IndianRupee, AlertCircle, RefreshCw } from 'lucide-react';
import iconMap from '../../config/iconMap';
import Button from '../../components/Button/Button';
import Select from '../../components/Select/Select';
import { ROUTES } from '../../config/routeConfig';
import { APPLICATION_WIZARD_STEPS } from '../../config/applicationWizard';
import { useApplicationDraftStore } from '../../state/ApplicationDraftContext';
import WizardSectionLayout from '../../components/WizardSectionLayout/WizardSectionLayout';
import ErrorPopup from '../../components/ErrorPopup/ErrorPopup';
import { buildSectionUpdate, getSectionState } from '../applicationWizard/flowUtils';
import { formatIndianAmount, getRawAmount, parseAmountToNumber } from '../../../../../Core/src/utils/amountHelper';

function buildCollateralState(appData) {
  if (!appData) {
    return {
      propertyOne: { applicationCollateralDetailsId: null, typeOfProperty: '', usage: '', locationAddress: '', estimatedValue: '' },
      propertyTwo: { applicationCollateralDetailsId: null, typeOfProperty: '', usage: '', locationAddress: '', estimatedValue: '' },
    };
  }

  const saved = getSectionState(appData, 'collateral', {});
  const rawColList = Array.isArray(appData.collateral || appData.Collateral || appData.collateralDetails || appData.CollateralDetails)
    ? (appData.collateral || appData.Collateral || appData.collateralDetails || appData.CollateralDetails)
    : [];

  const rawP1 =
    saved.propertyOne ||
    (Array.isArray(saved) ? saved[0] : null) ||
    (Array.isArray(saved.properties) ? saved.properties[0] : null) ||
    rawColList[0] ||
    (saved.typeOfProperty || saved.propertyId || saved.locationAddress || saved.propertyAddress || saved.estimatedValue ? saved : {});

  const rawP2 =
    saved.propertyTwo ||
    (Array.isArray(saved) ? saved[1] : null) ||
    (Array.isArray(saved.properties) ? saved.properties[1] : null) ||
    rawColList[1] ||
    {};

  const createProperty = (source = {}) => ({
    applicationCollateralDetailsId: source.applicationCollateralDetailsId ?? source.ApplicationCollateralDetailsId ?? null,
    typeOfProperty: source.typeOfProperty ?? source.propertyId ?? source.PropertyId ?? source.propertyType ?? source.PropertyType ?? '',
    usage: source.usage ?? source.propertyUsageId ?? source.PropertyUsageId ?? source.propertyUsage ?? source.PropertyUsage ?? '',
    locationAddress: source.locationAddress || source.LocationAddress || source.propertyAddress || source.PropertyAddress || '',
    estimatedValue: source.estimatedValue !== undefined && source.estimatedValue !== null && source.estimatedValue !== ''
      ? source.estimatedValue
      : (source.EstimatedValue !== undefined && source.EstimatedValue !== null && source.EstimatedValue !== ''
      ? source.EstimatedValue
      : (source.estimatedMarketValue ?? source.EstimatedMarketValue ?? '')),
  });

  return {
    propertyOne: createProperty(rawP1),
    propertyTwo: createProperty(rawP2),
  };
}

function isItemActive(item) {
  if (!item || typeof item !== 'object') return false;
  const val = item.isActive ?? item.IsActive ?? item.status ?? item.Status;
  if (val === undefined || val === null) return true;
  return val === true || val === 1 || val === '1' || val === 'true' || val === 'Active';
}

function CollateralForm({ 
  title, 
  value = {}, 
  onChange,
  propertyOptions = [],
  usageOptions = [],
  isLoadingMasters = false,
}) {
  const propertyPlaceholder = isLoadingMasters
    ? 'Loading property types...'
    : propertyOptions.length === 0
    ? 'No active property types available'
    : 'Select property type';

  const usagePlaceholder = isLoadingMasters
    ? 'Loading property usages...'
    : usageOptions.length === 0
    ? 'No active property usages available'
    : 'Select usage';

  return (
    <div className="aw-mini-card">
      <div className="aw-mini-card__header">
        <div>
          <div className="aw-mini-card__title">{title}</div>
          <div className="aw-mini-card__subtitle">Enter property details for collateral verification</div>
        </div>
      </div>
      <div className="aw-mini-card__body">
        <div className="aw-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <div className="aw-field">
            <label className="form-label">Type of Property</label>
            <div className="aw-input-wrapper">
              <Select 
                 value={value?.typeOfProperty ?? ''} 
                 onChange={(val) => onChange('typeOfProperty', val)}
                 placeholder={propertyPlaceholder}
                 options={propertyOptions}
                 disabled={isLoadingMasters || propertyOptions.length === 0}
                 icon={<Home size={14} />}
              />
            </div>
          </div>
          <div className="aw-field">
            <label className="form-label">Usage</label>
            <div className="aw-input-wrapper">
              <Select 
                 value={value?.usage ?? ''} 
                 onChange={(val) => onChange('usage', val)}
                 placeholder={usagePlaceholder}
                 options={usageOptions}
                 disabled={isLoadingMasters || usageOptions.length === 0}
                 icon={<UserCheck size={14} />}
              />
            </div>
          </div>
          <div className="aw-field">
            <label className="form-label">Location / Address</label>
            <div className="aw-input-wrapper">
              <MapPin className="aw-input-icon" size={14} />
              <input 
                className="form-input aw-input aw-input--with-icon" 
                value={value?.locationAddress ?? ''} 
                onChange={(e) => onChange('locationAddress', e.target.value)} 
                placeholder="Enter property address"
              />
            </div>
          </div>
          <div className="aw-field">
            <label className="form-label">Estimated Value</label>
            <div className="aw-input-wrapper">
              <IndianRupee className="aw-input-icon" size={14} />
              <input 
                type="text" 
                inputMode="numeric"
                className="form-input aw-input aw-input--with-icon" 
                value={formatIndianAmount(value?.estimatedValue ?? '')} 
                onChange={(e) => onChange('estimatedValue', formatIndianAmount(e.target.value))} 
                placeholder="0"
              />
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
  const { getApplication, ensureApplication, saveApplication, loadApplicationFromBackend } = useApplicationDraftStore();
  const [form, setForm] = useState(() => buildCollateralState(getApplication(appId)));
  const [errorPopup, setErrorPopup] = useState(null);
  const [isLoadingMasters, setIsLoadingMasters] = useState(true);
  const [isLoadingCollateralData, setIsLoadingCollateralData] = useState(false);
  const [mastersError, setMastersError] = useState(null);
  const [propertyOptions, setPropertyOptions] = useState([]);
  const [usageOptions, setUsageOptions] = useState([]);
  const [collateralMasterList, setCollateralMasterList] = useState([]);

  const loadMasters = useCallback(async () => {
    setIsLoadingMasters(true);
    setMastersError(null);

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';

    try {
      const [propRes, usageRes, collateralRes] = await Promise.allSettled([
        fetch(`${baseUrl}/PropertyMaster`),
        fetch(`${baseUrl}/PropertyUsageMaster`),
        fetch(`${baseUrl}/LoanProductCollateralMaster`),
      ]);

      let hasMasterError = false;

      // 1. Process PropertyMaster (Active records only)
      if (propRes.status === 'fulfilled' && propRes.value.ok) {
        const data = await propRes.value.json();
        const list = Array.isArray(data) ? data : (data?.value ?? data?.data ?? data?.result ?? []);
        const activeProps = list.filter(isItemActive);
        setPropertyOptions(
          activeProps.map((item) => ({
            value: item.propertyId ?? item.PropertyId,
            label: item.propertyName ?? item.PropertyName,
            raw: item,
          }))
        );
      } else {
        console.error('Failed to load PropertyMaster:', propRes);
        hasMasterError = true;
      }

      // 2. Process PropertyUsageMaster (Active records only)
      if (usageRes.status === 'fulfilled' && usageRes.value.ok) {
        const data = await usageRes.value.json();
        const list = Array.isArray(data) ? data : (data?.value ?? data?.data ?? data?.result ?? []);
        const activeUsages = list.filter(isItemActive);
        setUsageOptions(
          activeUsages.map((item) => ({
            value: item.propertyUsageId ?? item.PropertyUsageId,
            label: item.propertyUsageName ?? item.PropertyUsageName,
            raw: item,
          }))
        );
      } else {
        console.error('Failed to load PropertyUsageMaster:', usageRes);
        hasMasterError = true;
      }

      // 3. Process LoanProductCollateralMaster
      if (collateralRes.status === 'fulfilled' && collateralRes.value.ok) {
        const data = await collateralRes.value.json();
        const list = Array.isArray(data) ? data : (data?.value ?? data?.data ?? data?.result ?? []);
        setCollateralMasterList(list);
      } else {
        console.error('Failed to load LoanProductCollateralMaster:', collateralRes);
        hasMasterError = true;
      }

      if (hasMasterError) {
        setMastersError('Could not load some master configurations. Click Retry to reload.');
      }
    } catch (err) {
      console.error('Failed to fetch master configurations:', err);
      setMastersError('Network error while connecting to Master APIs. Please check connection and click Retry.');
    } finally {
      setIsLoadingMasters(false);
    }
  }, []);

  useEffect(() => {
    loadMasters();
  }, [loadMasters]);

  const hydratedAppIdRef = useRef(null);

  useEffect(() => {
    ensureApplication(appId);
  }, [appId, ensureApplication]);

  useEffect(() => {
    if (hydratedAppIdRef.current === appId) return;
    let active = true;

    async function loadApplicationCollateralData() {
      if (!appId) return;
      setIsLoadingCollateralData(true);

      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';

      try {
        // 1. First trigger backend hydration from draft store
        const hydratedApp = await loadApplicationFromBackend(appId);

        // 2. Fetch direct collateral details & product details from backend
        let fetchedCollaterals = [];
        try {
          const [colRes, prodRes] = await Promise.allSettled([
            fetch(`${baseUrl}/ApplicationCollateralDetails`),
            fetch(`${baseUrl}/ApplicationProductDetails`),
          ]);

          if (colRes.status === 'fulfilled' && colRes.value.ok) {
            const rawCol = await colRes.value.json();
            const colList = Array.isArray(rawCol) ? rawCol : (rawCol?.value ?? rawCol?.data ?? []);

            const prodList = prodRes.status === 'fulfilled' && prodRes.value.ok
              ? await prodRes.value.json().then((p) => (Array.isArray(p) ? p : (p?.value ?? p?.data ?? [])))
              : [];

            const matchedProduct = prodList.find(
              (p) =>
                String(p.agentCustomerId ?? p.AgentCustomerId) === String(appId) ||
                String(p.agentCustomerId ?? p.AgentCustomerId) === String(hydratedApp?.agentCustomerId)
            );
            const targetProdId =
              matchedProduct?.applicationProductDetailsId ??
              matchedProduct?.ApplicationProductDetailsId ??
              hydratedApp?.applicationProductDetailsId;

            if (targetProdId) {
              fetchedCollaterals = colList.filter(
                (c) => String(c.applicationProductDetailsId ?? c.ApplicationProductDetailsId) === String(targetProdId)
              );
            }
            if (fetchedCollaterals.length === 0 && hydratedApp?.applicationCollateralDetailsId) {
              fetchedCollaterals = colList.filter(
                (c) => String(c.applicationCollateralDetailsId ?? c.ApplicationCollateralDetailsId) === String(hydratedApp.applicationCollateralDetailsId)
              );
            }
          }
        } catch (apiErr) {
          console.warn('Direct collateral fetch fallback in CollateralDetails:', apiErr);
        }

        if (!active) return;
        hydratedAppIdRef.current = appId;

        // 3. Map into state
        if (fetchedCollaterals.length > 0) {
          const prop1 = fetchedCollaterals[0] || {};
          const prop2 = fetchedCollaterals[1] || {};

          const nextForm = {
            propertyOne: {
              applicationCollateralDetailsId: prop1.applicationCollateralDetailsId ?? prop1.ApplicationCollateralDetailsId ?? null,
              typeOfProperty: prop1.propertyId ?? prop1.PropertyId ?? prop1.typeOfProperty ?? prop1.propertyType ?? '',
              usage: prop1.propertyUsageId ?? prop1.PropertyUsageId ?? prop1.usage ?? prop1.propertyUsage ?? '',
              locationAddress: prop1.locationAddress || prop1.LocationAddress || prop1.propertyAddress || prop1.PropertyAddress || '',
              estimatedValue: prop1.estimatedValue ?? prop1.EstimatedValue ?? '',
            },
            propertyTwo: {
              applicationCollateralDetailsId: prop2.applicationCollateralDetailsId ?? prop2.ApplicationCollateralDetailsId ?? null,
              typeOfProperty: prop2.typeOfProperty ?? prop2.propertyId ?? prop2.PropertyId ?? prop2.propertyType ?? '',
              usage: prop2.usage ?? prop2.propertyUsageId ?? prop2.PropertyUsageId ?? prop2.propertyUsage ?? '',
              locationAddress: prop2.locationAddress || prop2.LocationAddress || prop2.propertyAddress || prop2.PropertyAddress || '',
              estimatedValue: prop2.estimatedValue ?? prop2.EstimatedValue ?? '',
            },
          };

          setForm(nextForm);
          saveApplication(appId, buildSectionUpdate(hydratedApp || getApplication(appId), 'collateral', nextForm));
        } else if (hydratedApp) {
          const nextForm = buildCollateralState(hydratedApp);
          setForm(nextForm);
        }
      } catch (err) {
        console.error('Error hydrating application collateral:', err);
      } finally {
        if (active) {
          setIsLoadingCollateralData(false);
        }
      }
    }

    loadApplicationCollateralData();

    return () => {
      active = false;
    };
  }, [appId, getApplication, loadApplicationFromBackend, saveApplication]);

  const appData = useMemo(() => getApplication(appId), [getApplication, appId]);
  const ArrowLeftIcon = iconMap['ArrowLeft'];
  const InfoIcon = iconMap['Info'];

  // Dynamically resolve selected loan product ID from Step 1 application data
  const selectedProductId = appData?.loanProduct ?? appData?.loanProductId ?? appData?.LoanProductId ?? '';

  // Match selected loan product with LoanProductCollateralMaster configuration
  const matchedCollateral = useMemo(() => {
    if (!selectedProductId || !collateralMasterList.length) return null;
    return collateralMasterList.find((item) => {
      const pId = item.loanProductId ?? item.LoanProductId;
      if (pId != null && String(pId) === String(selectedProductId)) {
        return true;
      }
      // Fallback matching by product name if loanProduct was stored as name/code
      const pName = String(item.productName || item.ProductName || '').trim().toLowerCase();
      if (typeof selectedProductId === 'string' && selectedProductId.trim()) {
        const target = selectedProductId.trim().toLowerCase();
        if (pName === target) return true;
      }
      return false;
    });
  }, [selectedProductId, collateralMasterList]);

  // Determine if collateral is required for this product
  const collateralRequired = useMemo(() => {
    if (!matchedCollateral) return false;
    const val =
      matchedCollateral.isCollateralRequired ??
      matchedCollateral.IsCollateralRequired ??
      matchedCollateral.collateralRequired ??
      matchedCollateral.CollateralRequired;
    return val === true || val === 'true' || val === 1;
  }, [matchedCollateral]);

  const updateField = (scope, field, value) => {
    setForm((prevForm) => {
      const nextForm = {
        ...prevForm,
        [scope]: {
          ...(prevForm[scope] || {}),
          [field]: value,
        },
      };
      const currentAppData = getApplication(appId);
      saveApplication(appId, buildSectionUpdate(currentAppData, 'collateral', nextForm));
      return nextForm;
    });
  };

  const handleContinue = async () => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';
    const prodId = appData.applicationProductDetailsId;

    if (collateralRequired && prodId) {
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
            EstimatedValue: parseAmountToNumber(prop.data.estimatedValue),
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
      {mastersError && (
        <div className="aw-inline-alert aw-inline-alert--red" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{mastersError}</span>
          </div>
          <button
            type="button"
            onClick={loadMasters}
            style={{
              background: 'transparent',
              border: '1px solid currentColor',
              borderRadius: '4px',
              padding: '2px 10px',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              color: 'inherit',
            }}
          >
            <RefreshCw size={12} className={isLoadingMasters ? 'master-spin' : ''} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {isLoadingMasters && !mastersError ? (
        <div className="aw-inline-alert aw-inline-alert--blue" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {InfoIcon && <InfoIcon size={14} />}
          <span>Loading collateral requirements and active master records...</span>
        </div>
      ) : !collateralRequired ? (
        <div className="aw-inline-alert aw-inline-alert--amber">
          {InfoIcon && <InfoIcon size={14} />}
          <span>Collateral details are not applicable for this loan product.</span>
        </div>
      ) : (
        <>
          <div className="aw-inline-alert aw-inline-alert--green">
            {InfoIcon && <InfoIcon size={14} />}
            <span>
              Collateral details are required for this loan product{matchedCollateral?.productName ? ` (${matchedCollateral.productName})` : ''}.
            </span>
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
