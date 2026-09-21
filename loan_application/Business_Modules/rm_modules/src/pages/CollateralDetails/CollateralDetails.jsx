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

export function createCleanCollateralState() {
  return {
    propertyOne: {
      applicationCollateralDetailsId: null,
      typeOfProperty: '',
      usage: '',
      locationAddress: '',
      estimatedValue: '',
    },
    propertyTwo: {
      applicationCollateralDetailsId: null,
      typeOfProperty: '',
      usage: '',
      locationAddress: '',
      estimatedValue: '',
    },
  };
}

function buildCollateralState(appData) {
  if (!appData) {
    return createCleanCollateralState();
  }

  const expectedProdId = appData.applicationProductDetailsId ?? appData.ApplicationProductDetailsId;

  const saved = getSectionState(appData, 'collateral', {});
  const rawColList = Array.isArray(appData.collateral || appData.Collateral || appData.collateralDetails || appData.CollateralDetails)
    ? (appData.collateral || appData.Collateral || appData.collateralDetails || appData.CollateralDetails)
    : [];

  const validColList = expectedProdId
    ? rawColList.filter((c) => Number(c.applicationProductDetailsId ?? c.ApplicationProductDetailsId) === Number(expectedProdId))
    : [];

  const rawP1 =
    saved.propertyOne ||
    (Array.isArray(saved) ? saved[0] : null) ||
    (Array.isArray(saved.properties) ? saved.properties[0] : null) ||
    validColList[0] ||
    (saved.typeOfProperty || saved.propertyId || saved.locationAddress || saved.propertyAddress || saved.estimatedValue ? saved : {});

  const rawP2 =
    saved.propertyTwo ||
    (Array.isArray(saved) ? saved[1] : null) ||
    (Array.isArray(saved.properties) ? saved.properties[1] : null) ||
    validColList[1] ||
    {};

  const createProperty = (source = {}) => {
    const srcProdId = source.applicationProductDetailsId ?? source.ApplicationProductDetailsId;
    if (srcProdId && expectedProdId && Number(srcProdId) !== Number(expectedProdId)) {
      return {
        applicationCollateralDetailsId: null,
        typeOfProperty: '',
        usage: '',
        locationAddress: '',
        estimatedValue: '',
      };
    }
    if (!expectedProdId && (source.applicationCollateralDetailsId || source.ApplicationCollateralDetailsId)) {
      return {
        applicationCollateralDetailsId: null,
        typeOfProperty: '',
        usage: '',
        locationAddress: '',
        estimatedValue: '',
      };
    }

    return {
      applicationCollateralDetailsId: source.applicationCollateralDetailsId ?? source.ApplicationCollateralDetailsId ?? null,
      typeOfProperty: source.typeOfProperty ?? source.propertyId ?? source.PropertyId ?? source.propertyType ?? source.PropertyType ?? '',
      usage: source.usage ?? source.propertyUsageId ?? source.PropertyUsageId ?? source.propertyUsage ?? source.PropertyUsage ?? '',
      locationAddress: source.locationAddress || source.LocationAddress || source.propertyAddress || source.PropertyAddress || '',
      estimatedValue: source.estimatedValue !== undefined && source.estimatedValue !== null && source.estimatedValue !== ''
        ? source.estimatedValue
        : (source.EstimatedValue !== undefined && source.EstimatedValue !== null && source.EstimatedValue !== ''
        ? source.EstimatedValue
        : (source.estimatedMarketValue ?? source.EstimatedMarketValue ?? '')),
    };
  };

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

export function hasMeaningfulPropertyData(property) {
  if (!property || typeof property !== 'object') return false;
  const estVal = parseAmountToNumber(property.estimatedValue);
  return Boolean(
    (property.typeOfProperty && String(property.typeOfProperty).trim() !== '') ||
    (property.usage && String(property.usage).trim() !== '') ||
    String(property.locationAddress || '').trim() !== '' ||
    (!isNaN(estVal) && estVal > 0) ||
    (Number(property.estimatedValue) > 0)
  );
}

function validateProperty(prop = {}, isProperty1 = false) {
  const errors = {};

  if (!isProperty1 && !hasMeaningfulPropertyData(prop)) {
    return errors;
  }

  if (!prop.typeOfProperty || String(prop.typeOfProperty).trim() === '') {
    errors.typeOfProperty = 'Type of property is required';
  }

  if (!prop.usage || String(prop.usage).trim() === '') {
    errors.usage = 'Usage is required';
  }

  if (!String(prop.locationAddress || '').trim()) {
    errors.locationAddress = 'Location / Address is required';
  }

  const estVal = parseAmountToNumber(prop.estimatedValue);
  if (prop.estimatedValue === '' || prop.estimatedValue === null || prop.estimatedValue === undefined || isNaN(estVal) || estVal <= 0) {
    errors.estimatedValue = 'Estimated value must be greater than 0';
  }

  return errors;
}

function CollateralForm({ 
  title, 
  value = {}, 
  onChange,
  errors = {},
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
                 error={!!errors.typeOfProperty}
                 value={value?.typeOfProperty ?? ''} 
                 onChange={(val) => onChange('typeOfProperty', val)}
                 placeholder={propertyPlaceholder}
                 options={propertyOptions}
                 disabled={isLoadingMasters || propertyOptions.length === 0}
                 icon={<Home size={14} />}
              />
            </div>
            {errors.typeOfProperty && <span className="aw-field-error">{errors.typeOfProperty}</span>}
          </div>
          <div className="aw-field">
            <label className="form-label">Usage</label>
            <div className="aw-input-wrapper">
              <Select 
                 error={!!errors.usage}
                 value={value?.usage ?? ''} 
                 onChange={(val) => onChange('usage', val)}
                 placeholder={usagePlaceholder}
                 options={usageOptions}
                 disabled={isLoadingMasters || usageOptions.length === 0}
                 icon={<UserCheck size={14} />}
              />
            </div>
            {errors.usage && <span className="aw-field-error">{errors.usage}</span>}
          </div>
          <div className="aw-field">
            <label className="form-label">Location / Address</label>
            <div className="aw-input-wrapper">
              <MapPin className="aw-input-icon" size={14} />
              <input 
                className={`form-input aw-input aw-input--with-icon ${errors.locationAddress ? 'aw-input--invalid' : ''}`}
                value={value?.locationAddress ?? ''} 
                onChange={(e) => onChange('locationAddress', e.target.value)} 
                placeholder="Enter property address"
              />
            </div>
            {errors.locationAddress && <span className="aw-field-error">{errors.locationAddress}</span>}
          </div>
          <div className="aw-field">
            <label className="form-label">Estimated Value</label>
            <div className="aw-input-wrapper">
              <IndianRupee className="aw-input-icon" size={14} />
              <input 
                type="text" 
                inputMode="numeric"
                className={`form-input aw-input aw-input--with-icon ${errors.estimatedValue ? 'aw-input--invalid' : ''}`}
                value={formatIndianAmount(value?.estimatedValue ?? '')} 
                onChange={(e) => onChange('estimatedValue', e.target.value)} 
                placeholder="0"
              />
            </div>
            {errors.estimatedValue && <span className="aw-field-error">{errors.estimatedValue}</span>}
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
  const [form, setForm] = useState(() => {
    const app = getApplication(appId);
    if (!app || !app._isHydrated) return createCleanCollateralState();
    return buildCollateralState(app);
  });
  const [errors, setErrors] = useState({});
  const [errorPopup, setErrorPopup] = useState(null);
  const [isLoadingMasters, setIsLoadingMasters] = useState(true);
  const [isLoadingCollateralData, setIsLoadingCollateralData] = useState(false);
  const [mastersError, setMastersError] = useState(null);
  const [propertyOptions, setPropertyOptions] = useState([]);
  const [usageOptions, setUsageOptions] = useState([]);
  const [collateralMasterList, setCollateralMasterList] = useState([]);

  const lastAppIdRef = useRef(appId);

  useEffect(() => {
    if (lastAppIdRef.current !== appId) {
      lastAppIdRef.current = appId;
      hydratedAppIdRef.current = null;
      setForm(createCleanCollateralState());
      setErrors({});
      setErrorPopup(null);
    }
  }, [appId]);

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
                (c) => Number(c.applicationProductDetailsId ?? c.ApplicationProductDetailsId) === Number(targetProdId)
              );
            } else {
              fetchedCollaterals = [];
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
          const prop2 = fetchedCollaterals[1] || null;

          const nextForm = {
            propertyOne: {
              applicationCollateralDetailsId: prop1.applicationCollateralDetailsId ?? prop1.ApplicationCollateralDetailsId ?? null,
              typeOfProperty: prop1.propertyId ?? prop1.PropertyId ?? prop1.typeOfProperty ?? prop1.propertyType ?? '',
              usage: prop1.propertyUsageId ?? prop1.PropertyUsageId ?? prop1.usage ?? prop1.propertyUsage ?? '',
              locationAddress: prop1.locationAddress || prop1.LocationAddress || prop1.propertyAddress || prop1.PropertyAddress || '',
              estimatedValue: prop1.estimatedValue ?? prop1.EstimatedValue ?? '',
            },
            propertyTwo: prop2 ? {
              applicationCollateralDetailsId: prop2.applicationCollateralDetailsId ?? prop2.ApplicationCollateralDetailsId ?? null,
              typeOfProperty: prop2.typeOfProperty ?? prop2.propertyId ?? prop2.PropertyId ?? prop2.propertyType ?? '',
              usage: prop2.usage ?? prop2.propertyUsageId ?? prop2.PropertyUsageId ?? prop2.propertyUsage ?? '',
              locationAddress: prop2.locationAddress || prop2.LocationAddress || prop2.propertyAddress || prop2.PropertyAddress || '',
              estimatedValue: prop2.estimatedValue ?? prop2.EstimatedValue ?? '',
            } : {
              applicationCollateralDetailsId: null,
              typeOfProperty: '',
              usage: '',
              locationAddress: '',
              estimatedValue: '',
            },
          };

          setForm(nextForm);
          saveApplication(appId, buildSectionUpdate(hydratedApp || getApplication(appId), 'collateral', nextForm));
        } else {
          // Authoritative empty collateral state for this application
          const cleanState = createCleanCollateralState();
          setForm(cleanState);
          saveApplication(appId, buildSectionUpdate(hydratedApp || getApplication(appId), 'collateral', cleanState));
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
    const nextForm = {
      ...form,
      [scope]: {
        ...(form[scope] || {}),
        [field]: value,
      },
    };

    setForm(nextForm);

    const currentAppData = getApplication(appId);

    saveApplication(
      appId,
      buildSectionUpdate(
        currentAppData,
        'collateral',
        nextForm
      )
    );

    setErrors((prev) => {
      const next = { ...prev };
      delete next[`${scope}.${field}`];
      return next;
    });
  };

  const handleContinue = async () => {
    if (collateralRequired) {
      const nextErrors = {};
      const p1Errors = validateProperty(form.propertyOne, true);
      Object.entries(p1Errors).forEach(([k, v]) => {
        nextErrors[`propertyOne.${k}`] = v;
      });

      const p2Errors = validateProperty(form.propertyTwo, false);
      Object.entries(p2Errors).forEach(([k, v]) => {
        nextErrors[`propertyTwo.${k}`] = v;
      });

      setErrors(nextErrors);

      if (Object.keys(nextErrors).length > 0) {
        setErrorPopup({
          title: 'Validation Error',
          message: 'Please fill all required collateral details before continuing.',
          variant: 'validation',
        });
        return;
      }
    }

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';
    const prodId = appData.applicationProductDetailsId;
    const token = localStorage.getItem('authToken');
    const authHeaders = { 'Content-Type': 'application/json' };
    if (token) authHeaders['Authorization'] = `Bearer ${token}`;

    // ── 1. Handle Optional Property 2 Deletion (Case D) ──
    // Backend ID exists + user cleared all fields -> DELETE
    const p2Id = form.propertyTwo?.applicationCollateralDetailsId;
    const hasP2Data = hasMeaningfulPropertyData(form.propertyTwo);

    if (p2Id && !hasP2Data) {
      try {
        const deleteUrl = `${baseUrl}/ApplicationCollateralDetails/${p2Id}`;
        const deleteRes = await fetch(deleteUrl, {
          method: 'DELETE',
          headers: authHeaders,
        });

        // 204: No Content, 200: OK (Success), 404: Not Found (already removed on server)
        if (deleteRes.status !== 204 && deleteRes.status !== 200 && deleteRes.status !== 404) {
          const errText = await deleteRes.text().catch(() => '');
          throw new Error(`Failed to remove Property 2 (HTTP ${deleteRes.status}): ${errText || deleteRes.statusText}`);
        }

        // Reset Property 2 completely in local state
        const resetP2 = {
          applicationCollateralDetailsId: null,
          typeOfProperty: '',
          usage: '',
          locationAddress: '',
          estimatedValue: '',
        };
        form.propertyTwo = resetP2;
        setForm((prev) => ({
          ...prev,
          propertyTwo: resetP2,
        }));
      } catch (delErr) {
        console.error('Error deleting Property 2:', delErr);
        setErrorPopup({
          title: 'Error Removing Property',
          message: delErr.message || 'Failed to remove optional Property 2 from server. Please try again.',
          variant: 'error',
        });
        return; // Halt continuation on error
      }
    }

    // ── 2. Handle Save / Update for Property 1 and Property 2 ──
    if (collateralRequired && prodId) {
      try {
        const propertiesToSave = [];

        // Property 1: always save if typeOfProperty is present
        if (form.propertyOne?.typeOfProperty) {
          propertiesToSave.push({ key: 'propertyOne', data: form.propertyOne });
        }

        // Property 2: save only if user entered meaningful data
        if (hasMeaningfulPropertyData(form.propertyTwo) && form.propertyTwo?.typeOfProperty) {
          propertiesToSave.push({ key: 'propertyTwo', data: form.propertyTwo });
        }

        for (const prop of propertiesToSave) {
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
            CreatedBy: 1,
          };

          if (isUpdate) {
            payload.ApplicationCollateralDetailsId = Number(prop.data.applicationCollateralDetailsId);
          }

          const response = await fetch(url, {
            method: isUpdate ? 'PUT' : 'POST',
            headers: authHeaders,
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            throw new Error(`Failed to save ${prop.key}: ${response.statusText}`);
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

    const currentAppData = getApplication(appId) || appData;
    saveApplication(appId, buildSectionUpdate(currentAppData, 'collateral', form));
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
              errors={Object.fromEntries(
                Object.entries(errors)
                  .filter(([k]) => k.startsWith('propertyOne.'))
                  .map(([k, v]) => [k.replace('propertyOne.', ''), v])
              )}
              propertyOptions={propertyOptions}
              usageOptions={usageOptions}
              isLoadingMasters={isLoadingMasters}
            />
            <CollateralForm 
              title="Property 2 Details" 
              value={form.propertyTwo} 
              onChange={(field, val) => updateField('propertyTwo', field, val)} 
              errors={Object.fromEntries(
                Object.entries(errors)
                  .filter(([k]) => k.startsWith('propertyTwo.'))
                  .map(([k, v]) => [k.replace('propertyTwo.', ''), v])
              )}
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
