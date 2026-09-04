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
import { resolveApplicantName } from '../applicationWizard/flowUtils';
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

  return `₹${Number(digits).toLocaleString('en-IN')}`;
}

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
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

function buildApplicationDisplayId(record = {}, fallbackId = '') {
  const initials = getCustomerInitials(record.fullName || record.customerName || '');
  const mobile = String(record.mobileNumber || record.mobile || '').replace(/\D/g, '');
  const mobileTail = mobile.slice(-2).padStart(2, '0');
  const serial = String(record.agentCustomerId || record.customerId || fallbackId || '').replace(/\D/g, '');
  const serialTail = serial ? serial : String(fallbackId || '').replace(/\D/g, '');

  const prefix = initials ? `${initials}${mobileTail}` : `APP${mobileTail}`;
  return serialTail ? `${prefix}-${serialTail}` : prefix;
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
  if (namedStatus.includes('approved')) return 'Approved';
  if (namedStatus.includes('pending')) return 'Pending';
  if (namedStatus.includes('returned')) return 'Returned';
  if (namedStatus.includes('review')) return 'Under Review';

  const numericStatus = Number(status);
  if (numericStatus === 2) return 'Approved';
  if (numericStatus === 1) return 'Pending';
  return 'New';
}

async function updateCustomerStatusToInProgress(baseUrl, customerId, record) {
  const currentStatus = Number(record.status ?? record.Status ?? 0);
  // Progression protection: only update if status is 0 (Draft / Newly Created)
  if (currentStatus >= 1) {
    return; // Already in progress (1) or approved (2)
  }

  const payload = {
    agentCustomerId: Number(record.agentCustomerId || record.AgentCustomerId || customerId),
    agentId: Number(record.agentId ?? record.AgentId ?? 1),
    fullName: record.fullName || record.FullName || record.customerName || '',
    mobileNumber: record.mobileNumber || record.MobileNumber || record.mobile || '',
    email: record.email || record.Email || record.emailAddress || '',
    employmentTypeId: Number(record.employmentTypeId ?? record.EmploymentTypeId ?? 1),
    loanPurposeId: Number(record.loanPurposeId ?? record.LoanPurposeId ?? 1),
    expectedLoanAmount: Number(record.expectedLoanAmount ?? record.ExpectedLoanAmount ?? 0),
    remarks: record.remarks || record.Remarks || '',
    status: 1,
    isActive: record.isActive !== undefined ? record.isActive : (record.IsActive !== undefined ? record.IsActive : true),
  };

  const response = await fetch(`${baseUrl}/AgentAddCustomer/${customerId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    console.error(`Failed to update customer status to in-progress (${response.status})`);
  }
}

function validateApplication(record) {
  return {};
}

export default function ApplicationDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const { applicationId } = useParams();
  const appId = applicationId;

  const { getApplication, ensureApplication, saveApplication, loadApplicationFromBackend } = useApplicationDraftStore();
  const [errors, setErrors] = useState({});
  const [isLoadingApplication, setIsLoadingApplication] = useState(false);
  const [errorPopup, setErrorPopup] = useState(null);
  const [displayRecord, setDisplayRecord] = useState(null);
  const [agentBranch, setAgentBranch] = useState('');
  const [agentInfo, setAgentInfo] = useState({ name: '', code: '' });

  const [sourcingChannelOptions, setSourcingChannelOptions] = useState([]);
  const [loanProductOptions, setLoanProductOptions] = useState([]);
  const [loanTransactionTypeOptions, setLoanTransactionTypeOptions] = useState([]);
  const [interestTypeOptions, setInterestTypeOptions] = useState([]);
  const [loanPurposeOptions, setLoanPurposeOptions] = useState([]);
  const [loanVariationMaster, setLoanVariationMaster] = useState([]);
  const [rateOfInterestMaster, setRateOfInterestMaster] = useState([]);
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
        const fullApp = await loadApplicationFromBackend(appId);
        const record = fullApp || {};

        if (active && record) {
          setDisplayRecord(record);
          setAgentBranch('');
          const rawStatus = Number(record?.status ?? record?.Status ?? 0);
          const currentStatus = normalizeApplicationStatus(record.status, record.statusName || record.StatusName);

          // Update status to 1 (In Progress) if newly created (status 0)
          if (rawStatus === 0 && appId) {
            try {
              await updateCustomerStatusToInProgress(baseUrl, appId, record);
            } catch (statusError) {
              console.error('Failed to update status to 1 on Step 1 start:', statusError);
            }
          }

          const agentId = record.agentId || record.AgentId;
          if (agentId) {
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
                  saveApplication(appId, { branch, agentName: name, agentCode: String(code || '') });
                }
              }
            } catch (agentError) {
              console.error('Failed to load branch from AgentMaster:', agentError);
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
  }, [appId, loadApplicationFromBackend, saveApplication]);

  // Customers created by a field agent must always use the Field Agent
  // sourcing channel. Resolve the ID from the master table instead of
  // hard-coding a database identity.
  const appData = getApplication(appId);

  useEffect(() => {
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
  }, [appId, appData.agentId, appData.sourcingChannel, displayRecord, saveApplication, sourcingChannelOptions]);

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
  const activeStep = useMemo(() => getWizardActiveStepByPath(location.pathname, APPLICATION_WIZARD_STEPS), [location.pathname]);

  const updateField = (field, rawValue) => {
    const nextValue = ['loanAmount', 'loanTenureMonths', 'coApplicantsCount', 'distanceFromBranchKm', 'roi'].includes(field)
      ? (rawValue === '' ? '' : Number(rawValue))
      : rawValue;

    const updates = { [field]: nextValue };

    if (field === 'loanProduct') {
      const selected = loanProductOptions.find((product) => product.value === rawValue);
      const isVariationRequired = selected?.raw?.productCode === 'HL' || selected?.raw?.productCode === 'LAP';
      if (!isVariationRequired) {
        updates.loanVariation = '';
      }
      updates.roi = '';
    }

    saveApplication(appId, updates);
    setErrors((current) => {
      const nextErrors = { ...current };
      delete nextErrors[field];
      if (field === 'loanProduct') {
        delete nextErrors.loanVariation;
        delete nextErrors.roi;
      }
      return nextErrors;
    });
  };

  const handleProceed = async () => {
    const validationErrors = validateApplication(appData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setErrorPopup({
        title: 'Please complete the application',
        message: 'The application cannot continue until the highlighted fields are corrected.',
        details: validationErrors,
      });
      return;
    }

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';
      const isUpdate = !!appData.applicationProductDetailsId;
      const url = isUpdate 
        ? `${baseUrl}/ApplicationProductDetails/${appData.applicationProductDetailsId}` 
        : `${baseUrl}/ApplicationProductDetails`;
      
      let agentId = appData.agentId;
      if (!agentId) {
        try {
          const agentRes = await fetch(`${baseUrl}/AgentMaster`);
          if (agentRes.ok) {
            const agents = await agentRes.json();
            if (agents && agents.length > 0) {
              agentId = agents[0].agentId || agents[0].AgentId;
            }
          }
        } catch (e) {
          console.error("Failed to fetch default agent:", e);
        }
      }
      agentId = agentId || 1;

      const payload = {
        AgentCustomerId: Number(appId),
        AgentId: agentId,
        SourcingChannelId: Number(appData.sourcingChannel) || 0,
        LoanProductId: Number(appData.loanProduct) || 0,
        LoanProductVariationId: appData.loanVariation ? Number(appData.loanVariation) : null,
        LoanTransactionTypeId: Number(appData.loanTransactionType) || 0,
        LoanPurposeId: Number(appData.purposeOfLoan) || 0,
        LoanAmount: Number(appData.loanAmount) || 0,
        LoanTenure: Number(appData.loanTenureMonths) || 0,
        InterestTypeId: Number(appData.interestType) || 0,
        ROI: appData.roi !== null && appData.roi !== '' ? Number(appData.roi) : null,
        DistanceFromBranch: appData.distanceFromBranchKm !== null && appData.distanceFromBranchKm !== '' ? Number(appData.distanceFromBranchKm) : null,
        NoOfCoApplicants: appData.coApplicantsCount !== null && appData.coApplicantsCount !== '' ? Number(appData.coApplicantsCount) : null,
        CreatedBy: 1
      };

      if (isUpdate) {
        payload.ApplicationProductDetailsId = appData.applicationProductDetailsId;
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
        let errorMsg = errorData.Message || errorData.title || 'Unknown error';
        if (errorData.errors) {
            errorMsg += '\n' + JSON.stringify(errorData.errors, null, 2);
        }
        setErrorPopup({ title: 'Application Save Failed', message: errorMsg, details: errorData });
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
      setErrorPopup({ title: 'Network Error', message: 'Network error while saving application. Please try again.', details: error.message });
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
  const applicationDisplayId = appData.applicationNumber || buildApplicationDisplayId(displayRecord || appData, appId) || appId;
  const statusText = appData.status || displayRecord?.status || 'New';
  const sourcingAgentName = agentInfo.name || appData.agentName || displayRecord?.agentName || displayRecord?.AgentName || '';
  const sourcingAgentCode = agentInfo.code || appData.agentCode || displayRecord?.agentCode || displayRecord?.AgentCode || displayRecord?.agentId || displayRecord?.AgentId || '';

  return (
    <div className="page-container ad-page-root compact-mode">
      <div className="ad-shell compact">
        <ErrorPopup
          show={!!errorPopup}
          title={errorPopup?.title}
          message={errorPopup?.message}
          details={errorPopup?.details}
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
                    <Select
                      error={!!errors.sourcingChannel}
                      value={appData.sourcingChannel || ''}
                      onChange={(val) => updateField('sourcingChannel', val)}
                      placeholder={isLoadingMasters ? "Loading..." : "Select sourcing channel"}
                      options={sourcingChannelOptions}
                      icon={<UserCheck size={16} />}
                      disabled={isLoadingMasters || Boolean(displayRecord?.agentId || displayRecord?.AgentId || appData.isAgentSourced)}
                    />
                  </div>
                  {errors.sourcingChannel && <span className="ad-field-error">{errors.sourcingChannel}</span>}
                </div>
                <div className="compact-field sourcing-field">
                  <label className="compact-label">Sourcing Name</label>
                  <div className="compact-input-wrapper">
                    <input
                      className="compact-input"
                      value={sourcingAgentName}
                      readOnly
                      aria-readonly="true"
                      placeholder="Agent name"
                    />
                  </div>
                </div>
                <div className="compact-field sourcing-field">
                  <label className="compact-label">Sourcing Code</label>
                  <div className="compact-input-wrapper">
                    <input
                      className="compact-input"
                      value={sourcingAgentCode}
                      readOnly
                      aria-readonly="true"
                      placeholder="Agent code"
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
                      placeholder={isLoadingMasters ? "Loading..." : "Select loan purpose"}
                      options={loanPurposeOptions}
                      icon={<Target size={16} />}
                      disabled={isLoadingMasters}
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
                      type="number"
                      min="1"
                      step="1"
                      inputMode="numeric"
                      value={appData.loanAmount ?? ''}
                      onChange={(event) => updateField('loanAmount', event.target.value)}
                      placeholder="0"
                    />
                  </div>
                  {errors.loanAmount && <span className="ad-field-error">{errors.loanAmount}</span>}
                </div>

                <div className="compact-field">
                  <label className="compact-label">Loan Tenure (Months)</label>
                  <div className="compact-input-wrapper">
                    <span className="compact-input-icon">
                      <Calendar size={16} />
                    </span>
                    <input
                      className={`form-input compact-input compact-input--with-icon ${errors.loanTenureMonths ? 'ad-input--invalid' : ''}`}
                      type="number"
                      min="1"
                      step="1"
                      inputMode="numeric"
                      value={appData.loanTenureMonths ?? ''}
                      onChange={(event) => updateField('loanTenureMonths', event.target.value)}
                      placeholder="0"
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

