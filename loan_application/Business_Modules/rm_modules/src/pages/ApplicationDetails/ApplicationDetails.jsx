import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Calendar,
  FileText,
  GitBranch,
  IndianRupee,
  MapPin,
  Percent,
  RefreshCw,
  Target,
  TrendingUp,
  User,
  UserCheck,
  Users,
} from 'lucide-react';
import Button from '../../components/Button/Button';
import Select from '../../components/Select/Select';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import ErrorPopup from '../../components/ErrorPopup/ErrorPopup';
import { ROUTES } from '../../config/routeConfig';
import { APPLICATION_WIZARD_STEPS, getWizardActiveStepByPath } from '../../config/applicationWizard';
import { useApplicationDraftStore } from '../../state/ApplicationDraftContext';
import { formatDateTimeSeconds as formatDateTime } from '../../utils/dateHelper';
import { buildValidationPopup, parseApiErrorBody } from '../../utils/formatUserFacingError';
import { buildApplicationDisplayId, resolveApplicantName } from '../applicationWizard/flowUtils';
import { resolveApplicationOwnership } from '../../utils/ownershipHelper';
import { getCurrentRMContext } from '../../utils/rmContext';
import { formatIndianAmount, getRawAmount, parseAmountToNumber } from '../../../../../Core/src/utils/amountHelper';
import './ApplicationDetails.css';

function isEmptyValue(value) {
  return value === '' || value === null || value === undefined;
}

function formatRupeeValue(value) {
  if (value === '' || value === null || value === undefined) {
    return '';
  }

  const digits = String(value).replace(/[^\d]/g, '');
  if (!digits) {
    return String(value);
  }

  return formatIndianAmount(digits);
}

function getCustomerInitials(name = '') {
  return String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

function isFieldAgentChannel(option) {
  const raw = option?.raw || {};
  const code = String(
    raw.sourcingChannelCode || raw.SourcingChannelCode || ''
  ).trim().toLowerCase().replace(/[\s_-]/g, '');
  const name = String(option?.label || '').trim().toLowerCase();
  const normalizedName = name.replace(/[\s_-]/g, '');

  return code === 'fa' || code === 'fieldagent' ||
    name.includes('field agent') || normalizedName.includes('fieldagent');
}

function normalizeApplicationStatus(status, statusName = '') {
  const namedStatus = String(statusName || '').trim().toLowerCase();
  if (namedStatus.includes('approved') || namedStatus.includes('logged to ho')) return 'Logged to HO';
  if (namedStatus.includes('pending')) return 'Pending';
  if (namedStatus.includes('returned')) return 'Returned';
  if (namedStatus.includes('review')) return 'Under Review';

  const numericStatus = Number(status);
  if (numericStatus === 2) return 'Logged to HO';
  if (numericStatus === 1) return 'Pending';
  return 'New';
}

async function updateCustomerStatusToInProgress(baseUrl, customerId, record = {}) {
  if (!customerId) return;

  try {
    let baseRecord = record;
    const getRes = await fetch(`${baseUrl}/AgentAddCustomer/${customerId}`);
    if (getRes.ok) {
      const data = await getRes.json();
      const cust = Array.isArray(data) ? data[0] : (data?.value ? data.value[0] : data);
      if (cust) baseRecord = cust;
    }

    const currentStatus = Number(baseRecord.status ?? baseRecord.Status ?? 0);
    // Progression protection: only update if status is 0 (Draft / Newly Created)
    if (currentStatus >= 1) {
      return; // Already in progress (1) or approved (2)
    }

    const payload = {
      ...baseRecord,
      status: 1,
    };

    const putRes = await fetch(`${baseUrl}/AgentAddCustomer/${customerId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!putRes.ok && putRes.status !== 204) {
      console.warn(`[ApplicationDetails] Auto status progression to Pending returned ${putRes.status}`);
    }
  } catch (err) {
    console.warn('[ApplicationDetails] Failed to auto-update status to Pending:', err);
  }
}

function validateApplication(record = {}, requiresVariation = false, isRmSourced = false) {
  const errors = {};

  if (!isRmSourced && (record.sourcingChannel === '' || record.sourcingChannel === null || record.sourcingChannel === undefined)) {
    errors.sourcingChannel = 'Sourcing channel is required';
  }

  if (!record.loanProduct || String(record.loanProduct).trim() === '') {
    errors.loanProduct = 'Loan product is required';
  }

  if (!record.loanTransactionType || String(record.loanTransactionType).trim() === '') {
    errors.loanTransactionType = 'Loan transaction type is required';
  }

  if (!record.purposeOfLoan || String(record.purposeOfLoan).trim() === '') {
    errors.purposeOfLoan = 'Purpose of loan is required';
  }

  const parsedAmount = parseAmountToNumber(record.loanAmount);
  if (record.loanAmount === '' || record.loanAmount === null || record.loanAmount === undefined || isNaN(parsedAmount) || parsedAmount <= 0) {
    errors.loanAmount = 'Loan amount must be greater than 0';
  }

  if (record.loanTenureMonths === '' || record.loanTenureMonths === null || record.loanTenureMonths === undefined || Number(record.loanTenureMonths) <= 0) {
    errors.loanTenureMonths = 'Loan tenure is required';
  }

  if (!record.interestType || String(record.interestType).trim() === '') {
    errors.interestType = 'Rate of interest is required';
  }

  if (record.roi === '' || record.roi === null || record.roi === undefined) {
    errors.roi = 'ROI (%) is required';
  }

  if (record.coApplicantsCount === '' || record.coApplicantsCount === null || record.coApplicantsCount === undefined || Number(record.coApplicantsCount) < 0) {
    errors.coApplicantsCount = 'Number of co-applicants is required';
  }

  if (record.distanceFromBranchKm === '' || record.distanceFromBranchKm === null || record.distanceFromBranchKm === undefined || Number(record.distanceFromBranchKm) < 0) {
    errors.distanceFromBranchKm = 'Distance from branch is required';
  }

  if (requiresVariation && (!record.loanVariation || String(record.loanVariation).trim() === '')) {
    errors.loanVariation = 'HL / LAP variation is required';
  }

  return errors;
}

export default function ApplicationDetails() {
  const { applicationId: routeAppId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const appId = routeAppId || location.state?.applicationId || '';

  const {
    draft,
    getApplication,
    ensureApplication,
    saveApplication,
    loadApplicationFromBackend,
    hydratedFromBackend,
  } = useApplicationDraftStore();

  const [errors, setErrors] = useState({});
  const [isLoadingApplication, setIsLoadingApplication] = useState(false);
  const [errorPopup, setErrorPopup] = useState(null);
  const [displayRecord, setDisplayRecord] = useState(null);
  const [sourcingChannels, setSourcingChannels] = useState([]);
  const [sourcingChannel, setSourcingChannel] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [agentOptions, setAgentOptions] = useState([]);
  const [agentBranch, setAgentBranch] = useState('');
  const [agentInfo, setAgentInfo] = useState({ name: '', code: '' });
  const [sourcingInfo, setSourcingInfo] = useState({
    isRmSourced: false,
    channel: '',
    name: '',
    code: '',
    agentId: null,
    rmId: null,
    rmCustomerId: null,
  });

  const [loanProducts, setLoanProducts] = useState([]);
  const [loanVariations, setLoanVariations] = useState([]);
  const [rateOfInterests, setRateOfInterests] = useState([]);
  const [loanTenures, setLoanTenures] = useState([]);

  const [sourcingChannelOptions, setSourcingChannelOptions] = useState([]);
  const [loanProductOptions, setLoanProductOptions] = useState([]);
  const [loanTransactionTypeOptions, setLoanTransactionTypeOptions] = useState([]);
  const [interestTypeOptions, setInterestTypeOptions] = useState([]);
  const [loanPurposeOptions, setLoanPurposeOptions] = useState([]);
  const [loanVariationMaster, setLoanVariationMaster] = useState([]);
  const [rateOfInterestMaster, setRateOfInterestMaster] = useState([]);
  const [loanTenureOptions, setLoanTenureOptions] = useState([]);
  const [isLoadingTenures, setIsLoadingTenures] = useState(false);
  const [isLoadingMasters, setIsLoadingMasters] = useState(false);

  useEffect(() => {
    ensureApplication(appId);
  }, [appId, ensureApplication]);

  useEffect(() => {
    let active = true;

    async function loadApplicationFromApi() {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';
      setIsLoadingApplication(true);

      try {
        const fullApp = await loadApplicationFromBackend(appId, true);
        const record = fullApp || {};

        if (active && record) {
          setDisplayRecord(record);
          setAgentBranch('');
          const rawStatus = Number(record?.rawStatus ?? record?.status ?? record?.Status ?? 0);
          const currentStatus = normalizeApplicationStatus(record.status, record.statusName || record.StatusName);

          // Update status to 1 (In Progress) if newly created (status 0)
          if ((rawStatus === 0 || currentStatus === 'New' || record.status === 'Draft') && appId) {
            try {
              await updateCustomerStatusToInProgress(baseUrl, appId, record);
              saveApplication(appId, { status: 'Pending', rawStatus: 1 });
            } catch (statusError) {
              console.error('Failed to update status to 1 on Step 1 start:', statusError);
            }
          }

          const customer = record.raw?.customer || record.customer || record;
          const createdByRole = String(
            customer.createdByRole ??
            customer.CreatedByRole ??
            record.createdByRole ??
            record.CreatedByRole ??
            ''
          ).trim().toUpperCase();

          const isAgentOwned = createdByRole === 'AGENT';
          const isRmOwned = createdByRole === 'RM';

          const ownership = resolveApplicationOwnership(record);
          let agentId = isAgentOwned
            ? (customer.agentId ?? customer.AgentId ?? record.agentId ?? record.AgentId ?? customer.createdByUserId ?? null)
            : (isRmOwned ? null : ownership.agentId);
          if (agentId) agentId = Number(agentId);

          let rmId = isRmOwned
            ? (customer.rmId ?? customer.RmId ?? customer.RMId ?? record.rmId ?? record.RMId ?? null)
            : (isAgentOwned ? null : ownership.rmId);
          if (rmId) rmId = Number(rmId);

          let rmCustomerId = isRmOwned
            ? (customer.rmCustomerId ?? customer.RmCustomerId ?? customer.RMCustomerId ?? record.rmCustomerId ?? record.RmCustomerId ?? record.RMCustomerId ?? null)
            : null;
          if (rmCustomerId) rmCustomerId = Number(rmCustomerId);

          if (ownership.isAgentCreated && agentId) {
            // 1. Agent-sourced application
            try {
              const agentResponse = await fetch(`${baseUrl}/AgentMaster/${agentId}`);
              if (agentResponse.ok) {
                const agentData = await agentResponse.json();
                const agentRecord = Array.isArray(agentData)
                  ? agentData[0]
                  : (agentData?.value ? agentData.value[0] : agentData);
                const branch = agentRecord?.branch || agentRecord?.Branch || '';
                const name = agentRecord?.fullName || agentRecord?.FullName || agentRecord?.agentName || agentRecord?.AgentName || agentRecord?.name || agentRecord?.Name || record.agentName || record.AgentName || '';
                const code = agentRecord?.agentCode || agentRecord?.AgentCode || agentRecord?.agentId || agentRecord?.AgentId || record.agentCode || record.AgentCode || agentId;
                if (active) {
                  setAgentBranch(branch);
                  setAgentInfo({ name, code: String(code || '') });
                  setSourcingInfo({
                    isRmSourced: false,
                    channel: 'Agent',
                    name,
                    code: String(code || ''),
                    agentId,
                    rmId: null,
                    rmCustomerId: null,
                  });
                  saveApplication(appId, {
                    branch,
                    agentName: name,
                    agentCode: String(code || ''),
                    sourcingChannelDisplay: 'Agent',
                    isAgentSourced: true,
                    isRmSourced: false,
                    agentId,
                  });
                }
              } else if (active) {
                const name = record.agentName || record.AgentName || ownership.agentName || '';
                const code = record.agentCode || record.AgentCode || agentId;
                setAgentInfo({ name, code: String(code || '') });
                setSourcingInfo({
                  isRmSourced: false,
                  channel: 'Agent',
                  name,
                  code: String(code || ''),
                  agentId,
                  rmId: null,
                  rmCustomerId: null,
                });
                saveApplication(appId, {
                  agentName: name,
                  agentCode: String(code || ''),
                  sourcingChannelDisplay: 'Agent',
                  isAgentSourced: true,
                  isRmSourced: false,
                  agentId,
                });
              }
            } catch (agentError) {
              console.error('Failed to load agent details from AgentMaster:', agentError);
              if (active) {
                const name = record.agentName || record.AgentName || ownership.agentName || '';
                const code = record.agentCode || record.AgentCode || agentId;
                setAgentInfo({ name, code: String(code || '') });
                setSourcingInfo({
                  isRmSourced: false,
                  channel: 'Agent',
                  name,
                  code: String(code || ''),
                  agentId,
                  rmId: null,
                  rmCustomerId: null,
                });
              }
            }
          } else if (ownership.isDirectRm && rmId) {
            // 2. Direct RM-sourced application
            try {
              const rmResponse = await fetch(`${baseUrl}/RMMaster/${rmId}`);
              if (rmResponse.ok) {
                const rmData = await rmResponse.json();
                const rmRecord = Array.isArray(rmData)
                  ? rmData[0]
                  : (rmData?.value ? rmData.value[0] : rmData);
                const branch = rmRecord?.branch || rmRecord?.Branch || '';
                const name = rmRecord?.fullName || rmRecord?.FullName || rmRecord?.rmName || rmRecord?.RMName || '';
                const code = rmRecord?.rmCode || rmRecord?.RMCode || rmRecord?.rmId || rmId;
                if (active) {
                  setAgentBranch(branch);
                  setAgentInfo({ name, code: String(code || '') });
                  setSourcingInfo({
                    isRmSourced: true,
                    channel: 'Direct RM',
                    name,
                    code: String(code || ''),
                    agentId: null,
                    rmId,
                    rmCustomerId,
                  });
                  saveApplication(appId, {
                    branch,
                    agentName: name,
                    agentCode: String(code || ''),
                    sourcingChannelDisplay: 'Direct RM',
                    isAgentSourced: false,
                    isRmSourced: true,
                    agentId: null,
                    rmId,
                    rmCustomerId,
                  });
                }
              }
            } catch (rmError) {
              console.error('Failed to load RM details from RMMaster:', rmError);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load application in ApplicationDetails:', error);
        if (active) {
          setErrorPopup({ title: 'Application Load Error', message: 'Unable to load live application data. Please try again.' });
        }
      } finally {
        if (active) {
          setIsLoadingApplication(false);
        }
      }
    }

    loadApplicationFromApi();

    return () => {
      active = false;
    };
  }, [appId]);

  // Customers created by a field agent must always use the Field Agent
  // sourcing channel. Resolve the ID from the master table instead of
  // hard-coding a database identity.
  const appData = getApplication(appId);

  useEffect(() => {
    if (isLoadingApplication || !displayRecord) {
      return;
    }

    const ownership = resolveApplicationOwnership(displayRecord || appData);
    if (ownership.isDirectRm) {
      return;
    }

    const agentId = displayRecord?.agentId || displayRecord?.AgentId || appData.agentId;
    if (!agentId || sourcingChannelOptions.length === 0) {
      return;
    }

    const fieldAgentChannel = sourcingChannelOptions.find(isFieldAgentChannel);
    if (!fieldAgentChannel) {
      console.warn('Field Agent sourcing channel was not found in the master data.');
      return;
    }

    if (String(appData.sourcingChannel) !== String(fieldAgentChannel.value)) {
      saveApplication(appId, {
        sourcingChannel: fieldAgentChannel.value,
        sourcingChannelDisplay: fieldAgentChannel.label,
        isAgentSourced: true,
      });
    }
  }, [appId, appData.agentId, appData.rmId, appData.createdBy, appData.sourcingChannel, displayRecord, isLoadingApplication, saveApplication, sourcingChannelOptions, sourcingInfo.isRmSourced]);

  useEffect(() => {
    async function fetchMasterData(endpoint, idField, nameField, setOptionsState) {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';
        const response = await fetch(`${baseUrl}/${endpoint}`);
        if (response.ok) {
          const data = await response.json();
          const options = data.map(item => ({
            value: item[idField],
            label: item[nameField],
            raw: item
          }));
          setOptionsState(options);
        }
      } catch (error) {
        console.error(`Error fetching ${endpoint}:`, error);
      }
    }

    async function loadAllMasters() {
      setIsLoadingMasters(true);
      await Promise.allSettled([
        fetchMasterData('SourcingChannelMaster', 'sourcingChannelId', 'sourcingChannelName', setSourcingChannelOptions),
        fetchMasterData('LoanProductMaster', 'loanProductId', 'productName', setLoanProductOptions),
        fetchMasterData('LoanTransactionTypeMaster', 'loanTransactionTypeId', 'transactionTypeName', setLoanTransactionTypeOptions),
        fetchMasterData('InterestTypeMaster', 'interestTypeId', 'interestTypeName', setInterestTypeOptions),
        fetchMasterData('LoanPurposeMaster', 'loanPurposeId', 'purposeName', setLoanPurposeOptions),
        fetchMasterData('LoanProductVariationMaster', 'loanProductVariationId', 'variationName', setLoanVariationMaster),
        fetchMasterData('RateOfInterestMaster', 'rateOfInterestId', 'interestCode', setRateOfInterestMaster),
      ]);
      setIsLoadingMasters(false);
    }
    
    loadAllMasters();
  }, []);

  // Auto-resolve Loan Product from Loan Purpose Master relation
  useEffect(() => {
    if (loanPurposeOptions.length === 0 || !appData.purposeOfLoan) {
      return;
    }

    const matchedPurpose = loanPurposeOptions.find(
      (option) => String(option.value) === String(appData.purposeOfLoan)
    );

    const relatedLoanProductId =
      matchedPurpose?.raw?.loanProductId ??
      matchedPurpose?.raw?.LoanProductId;

    if (
      relatedLoanProductId &&
      !appData.loanProduct
    ) {
      saveApplication(appId, {
        loanProduct: relatedLoanProductId
      });
    }
  }, [appId, appData.purposeOfLoan, appData.loanProduct, loanPurposeOptions, saveApplication]);

  const filteredLoanPurposeOptions = useMemo(() => {
    if (!appData.loanProduct) {
      return [];
    }

    return loanPurposeOptions.filter((option) => {
      const raw = option.raw;

      if (!raw || raw.isActive === false) {
        return false;
      }

      const relatedProductId =
        raw.loanProductId ??
        raw.LoanProductId;

      return String(relatedProductId) === String(appData.loanProduct);
    });
  }, [loanPurposeOptions, appData.loanProduct]);

  const selectedProduct = loanProductOptions.find(p => p.value === appData.loanProduct || (appData.loanProduct !== '' && appData.loanProduct !== null && appData.loanProduct !== undefined && String(p.value) === String(appData.loanProduct)));
  const requiresVariation = selectedProduct?.raw?.productCode === 'HL' || selectedProduct?.raw?.productCode === 'LAP';
  const variationOptions = useMemo(
    () => loanVariationMaster.filter(opt => !opt.raw?.loanProductId || String(opt.raw?.loanProductId) === String(appData.loanProduct)),
    [loanVariationMaster, appData.loanProduct]
  );
  const roiOptions = useMemo(() => {
    if (!appData.loanProduct) return [];
    const options = rateOfInterestMaster
      .filter((opt) => {
        const raw = opt.raw;
        if (!raw || raw.isActive === false) return false;
        return String(raw.loanProductId) === String(appData.loanProduct);
      })
      .map((opt) => ({
        value: Number(opt.raw.interestRate),
        label: `${opt.raw.interestCode} (${Number(opt.raw.interestRate).toFixed(2)}%)`,
        raw: opt.raw,
      }));

    if (
      appData.roi !== null &&
      appData.roi !== undefined &&
      appData.roi !== '' &&
      !options.some((o) => Number(o.value) === Number(appData.roi))
    ) {
      options.unshift({
        value: Number(appData.roi),
        label: `${Number(appData.roi).toFixed(2)}%`,
        raw: { interestRate: Number(appData.roi) },
      });
    }

    return options;
  }, [rateOfInterestMaster, appData.loanProduct, appData.roi]);

  useEffect(() => {
    const productId = appData.loanProduct;
    if (!productId) {
      setLoanTenureOptions([]);
      setIsLoadingTenures(false);
      return;
    }

    let isMounted = true;
    async function fetchTenuresForProduct() {
      setIsLoadingTenures(true);
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';
        const response = await fetch(`${baseUrl}/masters/LoanProductTenureMaster/product/${encodeURIComponent(productId)}`);
        if (response.ok) {
          const data = await response.json();
          const records = Array.isArray(data) ? data : (data?.data || data?.value || data?.result || (data ? [data] : []));
          const activeTenures = records.filter(item => item.isActive !== false);
          const options = activeTenures.map(item => {
            const val = Number(item.tenureValue !== undefined && item.tenureValue !== null ? item.tenureValue : item.TenureValue);
            const unit = item.tenureUnit || item.TenureUnit || 'Months';
            return {
              value: val,
              label: `${val} ${unit}`,
              raw: item
            };
          });
          if (isMounted) {
            setLoanTenureOptions(options);
          }
        } else {
          if (isMounted) setLoanTenureOptions([]);
        }
      } catch (err) {
        console.error('Failed to fetch loan product tenures:', err);
        if (isMounted) setLoanTenureOptions([]);
      } finally {
        if (isMounted) setIsLoadingTenures(false);
      }
    }

    fetchTenuresForProduct();
    return () => { isMounted = false; };
  }, [appData.loanProduct]);

  const activeStep = useMemo(() => getWizardActiveStepByPath(location.pathname, APPLICATION_WIZARD_STEPS), [location.pathname]);

  const updateField = (field, rawValue) => {
    let nextValue = rawValue;
    if (field === 'loanAmount') {
      nextValue = formatIndianAmount(rawValue);
    } else if (['loanTenureMonths', 'coApplicantsCount', 'distanceFromBranchKm', 'roi'].includes(field)) {
      nextValue = rawValue === '' ? '' : Number(rawValue);
    }

    const updates = { [field]: nextValue };

    if (field === 'purposeOfLoan') {
      const matched = loanPurposeOptions.find((option) => String(option.value) === String(rawValue));
      const relatedLoanProductId = matched?.raw?.loanProductId ?? matched?.raw?.LoanProductId;
      if (relatedLoanProductId) {
        updates.loanProduct = relatedLoanProductId;
        const selectedProd = loanProductOptions.find((p) => String(p.value) === String(relatedLoanProductId));
        const isVariationRequired = selectedProd?.raw?.productCode === 'HL' || selectedProd?.raw?.productCode === 'LAP';
        if (!isVariationRequired) {
          updates.loanVariation = '';
        }
        updates.roi = '';
        updates.loanTenureMonths = '';
      }
    }

    if (field === 'loanProduct') {
      const selected = loanProductOptions.find((product) => product.value === rawValue);
      const isVariationRequired = selected?.raw?.productCode === 'HL' || selected?.raw?.productCode === 'LAP';
      if (!isVariationRequired) {
        updates.loanVariation = '';
      }
      updates.roi = '';
      updates.loanTenureMonths = '';

      if (appData.purposeOfLoan) {
        const currentPurpose = loanPurposeOptions.find(
          (option) =>
            String(option.value) ===
            String(appData.purposeOfLoan)
        );
        const currentPurposeProductId =
          currentPurpose?.raw?.loanProductId ??
          currentPurpose?.raw?.LoanProductId;

        if (!rawValue || String(currentPurposeProductId) !== String(rawValue)) {
          updates.purposeOfLoan = '';
        }
      }
    }

    saveApplication(appId, updates);
    setErrors((current) => {
      const nextErrors = { ...current };
      delete nextErrors[field];
      if (field === 'loanProduct' || (field === 'purposeOfLoan' && updates.loanProduct)) {
        delete nextErrors.loanProduct;
        delete nextErrors.loanVariation;
        delete nextErrors.roi;
        delete nextErrors.loanTenureMonths;
      }
      return nextErrors;
    });
  };

  const handleProceed = async () => {
    const isRmSourced = Boolean(sourcingInfo.isRmSourced || displayRecord?.isRmSourced || appData.isRmSourced);
    const validationErrors = validateApplication(appData, requiresVariation, isRmSourced);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setErrorPopup(buildValidationPopup(
        validationErrors,
        'The application cannot continue until the highlighted fields are corrected.'
      ));
      return;
    }

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';
      const isUpdate = !!appData.applicationProductDetailsId;
      const url = isUpdate 
        ? `${baseUrl}/ApplicationProductDetails/${appData.applicationProductDetailsId}` 
        : `${baseUrl}/ApplicationProductDetails`;
      
      const customerRecord = displayRecord?.raw?.customer || displayRecord?.customer || displayRecord || {};
      const createdByRole = String(
        customerRecord.createdByRole ??
        customerRecord.CreatedByRole ??
        displayRecord?.createdByRole ??
        displayRecord?.CreatedByRole ??
        ''
      ).trim().toUpperCase();

      const isAgentOwned = createdByRole === 'AGENT';
      const isRmOwned = createdByRole === 'RM';
      const ownership = resolveApplicationOwnership(displayRecord || appData);

      // 1. Validate required master selections
      const loanProductId = Number(appData.loanProduct);
      if (!loanProductId || loanProductId <= 0) {
        setErrors((current) => ({ ...current, loanProduct: 'Loan product is required' }));
        setErrorPopup({
          title: 'Validation Error',
          message: 'Please select a valid Loan Product.',
          variant: 'warning',
        });
        return;
      }

      const loanProductVariationId = appData.loanVariation ? Number(appData.loanVariation) : null;
      if (requiresVariation && (!loanProductVariationId || loanProductVariationId <= 0)) {
        setErrors((current) => ({ ...current, loanVariation: 'HL / LAP variation is required' }));
        setErrorPopup({
          title: 'Validation Error',
          message: 'Please select a valid Loan Product Variation.',
          variant: 'warning',
        });
        return;
      }

      const loanTransactionTypeId = Number(appData.loanTransactionType);
      if (!loanTransactionTypeId || loanTransactionTypeId <= 0) {
        setErrors((current) => ({ ...current, loanTransactionType: 'Loan transaction type is required' }));
        setErrorPopup({
          title: 'Validation Error',
          message: 'Please select a valid Loan Transaction Type.',
          variant: 'warning',
        });
        return;
      }

      const loanPurposeId = Number(appData.purposeOfLoan);
      if (!loanPurposeId || loanPurposeId <= 0) {
        setErrors((current) => ({ ...current, purposeOfLoan: 'Purpose of loan is required' }));
        setErrorPopup({
          title: 'Validation Error',
          message: 'Please select a valid Purpose of Loan.',
          variant: 'warning',
        });
        return;
      }

      const interestTypeId = Number(appData.interestType);
      if (!interestTypeId || interestTypeId <= 0) {
        setErrors((current) => ({ ...current, interestType: 'Rate of interest is required' }));
        setErrorPopup({
          title: 'Validation Error',
          message: 'Please select a valid Interest Type.',
          variant: 'warning',
        });
        return;
      }

      // 2. Resolve SourcingChannelId dynamically from selection / master options
      let candidateChannelId = null;
      if (appData.sourcingChannel !== '' && appData.sourcingChannel !== null && appData.sourcingChannel !== undefined && Number(appData.sourcingChannel) > 0) {
        candidateChannelId = Number(appData.sourcingChannel);
      } else if (displayRecord?.sourcingChannelId || displayRecord?.SourcingChannelId) {
        candidateChannelId = Number(displayRecord.sourcingChannelId || displayRecord.SourcingChannelId);
      } else if (sourcingInfo.sourcingChannelId) {
        candidateChannelId = Number(sourcingInfo.sourcingChannelId);
      }

      let resolvedSourcingChannelId = null;
      if (candidateChannelId && (sourcingChannelOptions.length === 0 || sourcingChannelOptions.some(opt => Number(opt.value) === candidateChannelId))) {
        resolvedSourcingChannelId = candidateChannelId;
      } else if (!candidateChannelId && sourcingChannelOptions.length > 0) {
        if (isRmOwned || (!isAgentOwned && ownership.isDirectRm)) {
          const directOpt = sourcingChannelOptions.find(opt => /rm|direct/i.test(opt.label || opt.raw?.sourcingChannelCode || opt.raw?.sourcingChannelName));
          if (directOpt) {
            resolvedSourcingChannelId = Number(directOpt.value);
          } else if (sourcingChannelOptions[0]?.value) {
            resolvedSourcingChannelId = Number(sourcingChannelOptions[0].value);
          }
        } else {
          const agentOpt = sourcingChannelOptions.find(isFieldAgentChannel);
          if (agentOpt) {
            resolvedSourcingChannelId = Number(agentOpt.value);
          }
        }
      }

      if (!resolvedSourcingChannelId || resolvedSourcingChannelId <= 0) {
        setErrors((current) => ({ ...current, sourcingChannel: 'Sourcing channel is required' }));
        setErrorPopup({
          title: 'Validation Error',
          message: 'Unable to resolve Sourcing Channel from master data. Please select a valid sourcing channel.',
          variant: 'warning',
        });
        return;
      }

      let payload;
      if (isRmOwned || (!isAgentOwned && ownership.isDirectRm)) {
        // RM-OWNED APPLICATION CONTRACT (Common Customer Model):
        // - AgentCustomerId: <real AgentAddCustomer.agentCustomerId>
        // - AgentId: null
        // - RmId: <real RMId from customer ownership>
        // - RmCustomerId: null
        const rawRmId =
          customerRecord.rmId ??
          customerRecord.RmId ??
          customerRecord.RMId ??
          displayRecord?.rmId ??
          displayRecord?.RmId ??
          displayRecord?.RMId ??
          null;
        const rmId = (rawRmId !== null && rawRmId !== undefined && rawRmId !== '') ? Number(rawRmId) : null;

        if (!rmId || rmId <= 0) {
          setErrorPopup({
            title: 'RM Identity Error',
            message: 'Unable to resolve authoritative RMId from customer record for this RM-owned application.',
            variant: 'error',
          });
          return;
        }

        // Resolve realCustomerAgentCustomerId ONLY from the actual loaded AgentAddCustomer record
        const rawAgentCustomerId =
          customerRecord.agentCustomerId ??
          customerRecord.AgentCustomerId ??
          displayRecord?.agentCustomerId ??
          displayRecord?.AgentCustomerId ??
          null;
        const agentCustomerId = (rawAgentCustomerId !== null && rawAgentCustomerId !== undefined && rawAgentCustomerId !== '')
          ? Number(rawAgentCustomerId)
          : (Number(appId) > 0 ? Number(appId) : null);

        if (!agentCustomerId || agentCustomerId <= 0) {
          setErrorPopup({
            title: 'Missing AgentCustomerId',
            message: 'Authoritative customer record does not contain "agentCustomerId" required for RM-owned applications.',
            variant: 'error',
          });
          return;
        }

        const createdByUserId =
          customerRecord.createdByUserId ??
          customerRecord.CreatedByUserId ??
          customerRecord.createdBy ??
          customerRecord.CreatedBy ??
          displayRecord?.createdByUserId ??
          displayRecord?.createdBy ??
          rmId;

        payload = {
          AgentCustomerId: agentCustomerId,
          AgentId: null,
          RmId: rmId,
          RmCustomerId: null,
          SourcingChannelId: resolvedSourcingChannelId,
          LoanProductId: loanProductId,
          LoanProductVariationId: loanProductVariationId,
          LoanTransactionTypeId: loanTransactionTypeId,
          LoanPurposeId: loanPurposeId,
          LoanAmount: parseAmountToNumber(appData.loanAmount),
          LoanTenure: Number(appData.loanTenureMonths),
          InterestTypeId: interestTypeId,
          ROI: appData.roi !== null && appData.roi !== '' ? Number(appData.roi) : null,
          DistanceFromBranch: appData.distanceFromBranchKm !== null && appData.distanceFromBranchKm !== '' ? Number(appData.distanceFromBranchKm) : null,
          NoOfCoApplicants: appData.coApplicantsCount !== null && appData.coApplicantsCount !== '' ? Number(appData.coApplicantsCount) : 0,
          CreatedBy: Number(createdByUserId || rmId)
        };

        if (isUpdate) {
          payload.ApplicationProductDetailsId = appData.applicationProductDetailsId;
        }
      } else if (isAgentOwned || (!isRmOwned && ownership.isAgentCreated)) {
        // AGENT-OWNED APPLICATION CONTRACT:
        // - resolve agentCustomerId only from customer.agentCustomerId / AgentCustomerId / authoritative customer PK field confirmed by API
        // - resolve agentId only from customer.agentId / AgentId / createdByUserId if backend record explicitly represents Agent ownership
        // - rmId = null
        // - rmCustomerId = null
        const rawAgentCustomerId =
          customerRecord.agentCustomerId ??
          customerRecord.AgentCustomerId ??
          displayRecord?.agentCustomerId ??
          displayRecord?.AgentCustomerId ??
          null;
        const agentCustomerId = (rawAgentCustomerId !== null && rawAgentCustomerId !== undefined && rawAgentCustomerId !== '') ? Number(rawAgentCustomerId) : null;

        if (!agentCustomerId || agentCustomerId <= 0) {
          setErrorPopup({
            title: 'Missing AgentCustomerId',
            message: 'Authoritative customer record does not contain "agentCustomerId" required for Agent-owned applications.',
            variant: 'error',
          });
          return;
        }

        const rawAgentId =
          customerRecord.agentId ??
          customerRecord.AgentId ??
          displayRecord?.agentId ??
          displayRecord?.AgentId ??
          (isAgentOwned ? (customerRecord.createdByUserId ?? customerRecord.CreatedByUserId ?? displayRecord?.createdByUserId ?? displayRecord?.CreatedByUserId) : ownership.agentId);
        const agentId = (rawAgentId !== null && rawAgentId !== undefined && rawAgentId !== '') ? Number(rawAgentId) : null;

        if (!agentId || agentId <= 0) {
          setErrorPopup({
            title: 'Missing AgentId',
            message: 'Authoritative customer record does not contain "agentId" required for Agent-owned applications.',
            variant: 'error',
          });
          return;
        }

        const createdByUserId =
          customerRecord.createdByUserId ??
          customerRecord.CreatedByUserId ??
          customerRecord.createdBy ??
          customerRecord.CreatedBy ??
          displayRecord?.createdByUserId ??
          displayRecord?.createdBy ??
          agentId;

        payload = {
          AgentCustomerId: agentCustomerId,
          AgentId: agentId,
          RmId: null,
          RmCustomerId: null,
          SourcingChannelId: resolvedSourcingChannelId,
          LoanProductId: loanProductId,
          LoanProductVariationId: loanProductVariationId,
          LoanTransactionTypeId: loanTransactionTypeId,
          LoanPurposeId: loanPurposeId,
          LoanAmount: parseAmountToNumber(appData.loanAmount),
          LoanTenure: Number(appData.loanTenureMonths),
          InterestTypeId: interestTypeId,
          ROI: appData.roi !== null && appData.roi !== '' ? Number(appData.roi) : null,
          DistanceFromBranch: appData.distanceFromBranchKm !== null && appData.distanceFromBranchKm !== '' ? Number(appData.distanceFromBranchKm) : null,
          NoOfCoApplicants: appData.coApplicantsCount !== null && appData.coApplicantsCount !== '' ? Number(appData.coApplicantsCount) : 0,
          CreatedBy: Number(createdByUserId || agentId)
        };

        if (isUpdate) {
          payload.ApplicationProductDetailsId = appData.applicationProductDetailsId;
        }
      } else {
        setErrorPopup({
          title: 'Application Ownership Resolution Error',
          message: 'Unable to resolve application ownership role from customer record. Neither Agent nor RM ownership could be verified.',
          variant: 'error',
        });
        return;
      }

      console.log('Sending payload to backend:', payload);

      const response = await fetch(url, {
        method: isUpdate ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to save to database:', errorData);
        const parsed = parseApiErrorBody(errorData, 'Unable to save application details. Please check the form and try again.');
        if (errorData?.errors && typeof errorData.errors === 'object') {
          const fieldMap = {};
          Object.entries(errorData.errors).forEach(([key, value]) => {
            const camelKey = key.charAt(0).toLowerCase() + key.slice(1);
            fieldMap[camelKey] = Array.isArray(value) ? value[0] : value;
          });
          setErrors((current) => ({ ...current, ...fieldMap }));
        }
        setErrorPopup({
          title: 'Could not save application',
          message: parsed.message,
          details: parsed.items,
          variant: parsed.variant,
        });
        return;
      }

      let savedData = {};
      if (response.status !== 204) {
        const text = await response.text();
        if (text) {
          try {
            savedData = JSON.parse(text);
          } catch (e) {
            console.error('Failed to parse successful response:', e);
          }
        }
      }

      saveApplication(appId, { 
        applicationProductDetailsId: savedData.applicationProductDetailsId || savedData.ApplicationProductDetailsId || appData.applicationProductDetailsId
      });
      navigate(ROUTES.KYC_DOCUMENTS.replace(':applicationId', appId));
    } catch (error) {
      console.error('Error saving application:', error);
      setErrorPopup({
        title: 'Connection error',
        message: 'Network error while saving application. Please try again.',
        variant: 'error',
      });
    }
  };

  const handleBack = () => {
    navigate(ROUTES.NEW_APPLICATIONS);
  };

  const applicantName = resolveApplicantName({
    ...appData,
    customerName: appData.customerName || displayRecord?.fullName || displayRecord?.customerName || '',
  });
  const branchName = agentBranch || appData.branch || displayRecord?.branch || 'Chennai Main Branch';
  const submittedTime = formatDateTime(appData.createdDate || displayRecord?.createdAt || displayRecord?.createdDate || '');
  const applicationDisplayId = buildApplicationDisplayId(displayRecord || appData, appId) || appId;
  const statusText = appData.status || displayRecord?.status || 'New';
  const ownership = resolveApplicationOwnership(displayRecord || appData);
  const isRmSourced = Boolean(ownership.isDirectRm);
  const sourcingDisplayName = isRmSourced
    ? (sourcingInfo.name || appData.agentName || displayRecord?.rmName || displayRecord?.RMName || ownership.rmName || '')
    : (sourcingInfo.name || agentInfo.name || appData.agentName || displayRecord?.agentName || displayRecord?.AgentName || ownership.agentName || '');
  const sourcingDisplayCode = isRmSourced
    ? (sourcingInfo.code || appData.agentCode || displayRecord?.rmCode || displayRecord?.RMCode || (ownership.rmId ? String(ownership.rmId) : '') || (appData.rmId ? String(appData.rmId) : ''))
    : (sourcingInfo.code || agentInfo.code || appData.agentCode || displayRecord?.agentCode || displayRecord?.AgentCode || (ownership.agentId ? String(ownership.agentId) : '') || (appData.agentId ? String(appData.agentId) : ''));

  return (
    <div className="page-container ad-page-root compact-mode">
      <div className="ad-shell compact">
        <ErrorPopup
          show={!!errorPopup}
          title={errorPopup?.title}
          message={errorPopup?.message}
          details={errorPopup?.details}
          variant={errorPopup?.variant}
          onClose={() => setErrorPopup(null)}
        />
        <header className="ad-premium-header">
          <div className="ad-premium-header-top">
            <div className="ad-title-group">
              <div className="ad-icon-wrapper">
                <FileText size={20} strokeWidth={2.5} />
              </div>
              <div>
                <div className="ad-title-row">
                  <h1 className="ad-page-title">Application & Product Details</h1>
                  <span className="ad-step-badge">Step 1 of 12</span>
                </div>
                <p className="ad-page-description">Fill in the primary loan details for verification</p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={<ArrowLeft size={14} />}
              onClick={handleBack}
              className="ad-back-button"
            >
              Back to Applications
            </Button>
          </div>

          <div className="ad-premium-header-bottom">
            <div className="ad-meta-item">
              <span className="ad-meta-label">Applicant</span>
              <div className="ad-meta-value-group highlight">
                <User size={14} />
                <span className="ad-meta-value">{isLoadingApplication && applicantName === 'Applicant' ? 'Loading...' : applicantName}</span>
              </div>
            </div>
            <div className="ad-meta-divider" />
            <div className="ad-meta-item">
              <span className="ad-meta-label">App ID</span>
              <div className="ad-meta-value-group">
                <FileText size={14} />
                <span className="ad-meta-value">{applicationDisplayId}</span>
              </div>
            </div>
            <div className="ad-meta-divider" />
            <div className="ad-meta-item">
              <span className="ad-meta-label">Branch</span>
              <div className="ad-meta-value-group">
                <MapPin size={14} />
                <span className="ad-meta-value">{branchName}</span>
              </div>
            </div>
            <div className="ad-meta-divider" />
            <div className="ad-meta-item">
              <span className="ad-meta-label">Submitted</span>
              <div className="ad-meta-value-group">
                <Calendar size={14} />
                <span className="ad-meta-value">{submittedTime || 'Not submitted'}</span>
              </div>
            </div>
            <div className="ad-meta-item status">
              <StatusBadge status={statusText} />
            </div>
          </div>
        </header>

        <section className="ad-workspace-compact" aria-label="Loan application workspace">
          <div className="panel ad-main-panel compact-panel">
            <div className="compact-panel-content">
              <div className="compact-section-title">Application Information</div>
              <div className="compact-form-row sourcing-details-row">
                <div className="compact-field sourcing-field">
                  <label className="compact-label">Sourcing Channel</label>
                  <div className="compact-input-wrapper">
                    {isRmSourced ? (
                      <input
                        className="compact-input"
                        value="Direct RM"
                        readOnly
                        aria-readonly="true"
                        style={{ fontWeight: 600, color: '#1A7A3C' }}
                      />
                    ) : (
                      <Select
                        error={!!errors.sourcingChannel}
                        value={appData.sourcingChannel || ''}
                        onChange={(val) => updateField('sourcingChannel', val)}
                        placeholder={isLoadingMasters ? "Loading..." : "Select sourcing channel"}
                        options={sourcingChannelOptions}
                        icon={<UserCheck size={16} />}
                        disabled={isLoadingMasters || Boolean(ownership.isAgentCreated || displayRecord?.agentId || displayRecord?.AgentId || appData.isAgentSourced)}
                      />
                    )}
                  </div>
                  {errors.sourcingChannel && <span className="ad-field-error">{errors.sourcingChannel}</span>}
                </div>
                <div className="compact-field sourcing-field">
                  <label className="compact-label">Sourcing Name</label>
                  <div className="compact-input-wrapper">
                    <input
                      className="compact-input"
                      value={sourcingDisplayName}
                      readOnly
                      aria-readonly="true"
                      placeholder={isRmSourced ? "RM name" : "Agent name"}
                    />
                  </div>
                </div>
                <div className="compact-field sourcing-field">
                  <label className="compact-label">Sourcing Code</label>
                  <div className="compact-input-wrapper">
                    <input
                      className="compact-input"
                      value={sourcingDisplayCode}
                      readOnly
                      aria-readonly="true"
                      placeholder={isRmSourced ? "RM code" : "Agent code"}
                    />
                  </div>
                </div>
              </div>

              <div className="compact-divider" />

              <div className="compact-section-title">Loan Information</div>
              <div className="compact-grid">
                <div className="compact-field">
                  <label className="compact-label">Loan Product</label>
                  <div className="compact-input-wrapper">
                    <Select
                      error={!!errors.loanProduct}
                      value={appData.loanProduct || ''}
                      onChange={(val) => updateField('loanProduct', val)}
                      placeholder={isLoadingMasters ? "Loading..." : "Select loan product"}
                      options={loanProductOptions}
                      icon={<Briefcase size={16} />}
                      disabled={isLoadingMasters}
                    />
                  </div>
                  {errors.loanProduct && <span className="ad-field-error">{errors.loanProduct}</span>}
                </div>

                <div className="compact-field">
                  <label className="compact-label">Loan Transaction Type</label>
                  <div className="compact-input-wrapper">
                    <Select
                      error={!!errors.loanTransactionType}
                      value={appData.loanTransactionType || ''}
                      onChange={(val) => updateField('loanTransactionType', val)}
                      placeholder={isLoadingMasters ? "Loading..." : "Select transaction type"}
                      options={loanTransactionTypeOptions}
                      icon={<RefreshCw size={16} />}
                      disabled={isLoadingMasters}
                    />
                  </div>
                  {errors.loanTransactionType && <span className="ad-field-error">{errors.loanTransactionType}</span>}
                </div>

                <div className="compact-field">
                  <label className="compact-label">Purpose of Loan</label>
                  <div className="compact-input-wrapper">
                    <Select
                      error={!!errors.purposeOfLoan}
                      value={appData.purposeOfLoan || ''}
                      onChange={(val) => updateField('purposeOfLoan', val)}
                      placeholder={
                        isLoadingMasters
                          ? "Loading..."
                          : !appData.loanProduct
                          ? "Select loan product first"
                          : filteredLoanPurposeOptions.length === 0
                          ? "No purpose configured for this loan product"
                          : "Select loan purpose"
                      }
                      options={filteredLoanPurposeOptions}
                      icon={<Target size={16} />}
                      disabled={isLoadingMasters || !appData.loanProduct || filteredLoanPurposeOptions.length === 0}
                    />
                  </div>
                  {errors.purposeOfLoan && <span className="ad-field-error">{errors.purposeOfLoan}</span>}
                </div>

                <div className="compact-field">
                  <label className="compact-label">Loan Amount (Rs.)</label>
                  <div className="compact-input-wrapper">
                    <span className="compact-input-icon">
                      <IndianRupee size={16} />
                    </span>
                    <input
                      className={`form-input compact-input compact-input--with-icon ${errors.loanAmount ? 'ad-input--invalid' : ''}`}
                      type="text"
                      inputMode="numeric"
                      value={formatIndianAmount(appData.loanAmount ?? '')}
                      onChange={(event) => updateField('loanAmount', event.target.value)}
                      placeholder="0"
                    />
                  </div>
                  {errors.loanAmount && <span className="ad-field-error">{errors.loanAmount}</span>}
                </div>

                <div className="compact-field">
                  <label className="compact-label">Loan Tenure (Months)</label>
                  <div className="compact-input-wrapper">
                    <Select
                      error={!!errors.loanTenureMonths}
                      value={appData.loanTenureMonths !== null && appData.loanTenureMonths !== undefined && appData.loanTenureMonths !== '' ? appData.loanTenureMonths : ''}
                      onChange={(val) => updateField('loanTenureMonths', val)}
                      placeholder={
                        !appData.loanProduct
                          ? "Select loan product first"
                          : isLoadingTenures
                          ? "Loading tenures..."
                          : loanTenureOptions.length === 0
                          ? "No tenure configured for this loan product"
                          : "Select loan tenure"
                      }
                      options={loanTenureOptions}
                      icon={<Calendar size={16} />}
                      disabled={isLoadingMasters || !appData.loanProduct || isLoadingTenures || loanTenureOptions.length === 0}
                    />
                  </div>
                  {errors.loanTenureMonths && <span className="ad-field-error">{errors.loanTenureMonths}</span>}
                </div>

                <div className="compact-field">
                  <label className="compact-label">Rate of Interest</label>
                  <div className="compact-input-wrapper">
                    <Select
                      error={!!errors.interestType}
                      value={appData.interestType || ''}
                      onChange={(val) => updateField('interestType', val)}
                      placeholder={isLoadingMasters ? "Loading..." : "Select interest type"}
                      options={interestTypeOptions}
                      icon={<TrendingUp size={16} />}
                      disabled={isLoadingMasters}
                    />
                  </div>
                  {errors.interestType && <span className="ad-field-error">{errors.interestType}</span>}
                </div>

                <div className="compact-field">
                  <label className="compact-label">ROI (%)</label>
                  <div className="compact-input-wrapper">
                    <Select
                      error={!!errors.roi}
                      value={appData.roi !== null && appData.roi !== undefined && appData.roi !== '' ? appData.roi : ''}
                      onChange={(val) => updateField('roi', val)}
                      placeholder={
                        !appData.loanProduct
                          ? "Select loan product first"
                          : roiOptions.length === 0
                          ? "No ROI configured for this loan product"
                          : "Select ROI"
                      }
                      options={roiOptions}
                      icon={<Percent size={16} />}
                      disabled={isLoadingMasters || !appData.loanProduct || roiOptions.length === 0}
                    />
                  </div>
                  {errors.roi && <span className="ad-field-error">{errors.roi}</span>}
                </div>

                <div className="compact-field">
                  <label className="compact-label">No. of Co-Applicants</label>
                  <div className="compact-input-wrapper">
                    <span className="compact-input-icon">
                      <Users size={16} />
                    </span>
                    <input
                      className={`form-input compact-input compact-input--with-icon ${errors.coApplicantsCount ? 'ad-input--invalid' : ''}`}
                      type="number"
                      min="0"
                      step="1"
                      inputMode="numeric"
                      value={appData.coApplicantsCount ?? 0}
                      onChange={(event) => updateField('coApplicantsCount', event.target.value)}
                      placeholder="0"
                    />
                  </div>
                  {errors.coApplicantsCount && <span className="ad-field-error">{errors.coApplicantsCount}</span>}
                </div>

                <div className="compact-field">
                  <label className="compact-label">Distance from Branch (Km)</label>
                  <div className="compact-input-wrapper">
                    <span className="compact-input-icon">
                      <MapPin size={16} />
                    </span>
                    <input
                      className={`form-input compact-input compact-input--with-icon ${errors.distanceFromBranchKm ? 'ad-input--invalid' : ''}`}
                      type="number"
                      min="0"
                      step="0.1"
                      inputMode="decimal"
                      value={appData.distanceFromBranchKm ?? ''}
                      onChange={(event) => updateField('distanceFromBranchKm', event.target.value)}
                      placeholder="0.0"
                    />
                  </div>
                  {errors.distanceFromBranchKm && <span className="ad-field-error">{errors.distanceFromBranchKm}</span>}
                </div>

                {requiresVariation && (
                  <div className="compact-field">
                    <label className="compact-label">HL / LAP Variation</label>
                    <div className="compact-input-wrapper">
                      <Select
                        error={!!errors.loanVariation}
                        value={appData.loanVariation || ''}
                        onChange={(val) => updateField('loanVariation', val)}
                        placeholder={isLoadingMasters ? "Loading..." : "Select variation"}
                        options={variationOptions}
                        icon={<GitBranch size={16} />}
                        disabled={isLoadingMasters}
                      />
                    </div>
                    {errors.loanVariation && <span className="ad-field-error">{errors.loanVariation}</span>}
                  </div>
                )}
              </div>
            </div>

            <footer className="compact-action-bar" aria-label="Page actions">
              <div className="compact-footer-left">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<ArrowLeft size={14} />}
                  onClick={handleBack}
                  style={{ backgroundColor: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0' }}
                >
                  Back
                </Button>
              </div>

              <div className="compact-footer-right">
                <Button
                  variant="primary"
                  size="sm"
                  icon={<ArrowRight size={14} />}
                  iconPosition="right"
                  onClick={handleProceed}
                >
                  Save & Continue
                </Button>
              </div>
            </footer>
          </div>
        </section>
      </div>
    </div>
  );
}
