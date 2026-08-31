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
import { ROUTES } from '../../config/routeConfig';
import { APPLICATION_WIZARD_STEPS, getWizardActiveStepByPath } from '../../config/applicationWizard';
import { useApplicationDraftStore } from '../../state/ApplicationDraftContext';
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

function validateApplication(record) {
  return {};
}

export default function ApplicationDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const { applicationId } = useParams();
  const appId = applicationId;

  const { getApplication, ensureApplication, saveApplication } = useApplicationDraftStore();
  const [errors, setErrors] = useState({});

  const [sourcingChannelOptions, setSourcingChannelOptions] = useState([]);
  const [loanProductOptions, setLoanProductOptions] = useState([]);
  const [loanTransactionTypeOptions, setLoanTransactionTypeOptions] = useState([]);
  const [interestTypeOptions, setInterestTypeOptions] = useState([]);
  const [loanPurposeOptions, setLoanPurposeOptions] = useState([]);
  const [loanVariationMaster, setLoanVariationMaster] = useState([]);
  const [isLoadingMasters, setIsLoadingMasters] = useState(false);

  useEffect(() => {
    ensureApplication(appId);
  }, [appId, ensureApplication]);

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
      ]);
      setIsLoadingMasters(false);
    }
    
    loadAllMasters();
  }, []);

  const appData = getApplication(appId);
  const selectedProduct = loanProductOptions.find(p => p.value === appData.loanProduct);
  const requiresVariation = selectedProduct?.raw?.productCode === 'HL' || selectedProduct?.raw?.productCode === 'LAP';
  const variationOptions = useMemo(
    () => loanVariationMaster.filter(opt => !opt.raw?.loanProductId || opt.raw?.loanProductId === appData.loanProduct),
    [loanVariationMaster, appData.loanProduct]
  );
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
    }

    saveApplication(appId, updates);
    setErrors((current) => {
      const nextErrors = { ...current };
      delete nextErrors[field];
      if (field === 'loanProduct') {
        delete nextErrors.loanVariation;
      }
      return nextErrors;
    });
  };

  const handleProceed = async () => {
    const validationErrors = validateApplication(appData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
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
        alert(`Failed to save application:\n${errorMsg}`);
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
        status: 'Pending Verification',
        applicationProductDetailsId: savedData.applicationProductDetailsId || savedData.ApplicationProductDetailsId || appData.applicationProductDetailsId
      });
      navigate(ROUTES.KYC_DOCUMENTS.replace(':applicationId', appId));
    } catch (error) {
      console.error('Error saving application:', error);
      alert('Network error while saving application.');
    }
  };

  const handleBack = () => {
    navigate(ROUTES.NEW_APPLICATIONS);
  };

  const applicantName = appData.agentName || appData.customerName || '';
  const branchName = appData.branch || '';
  const submittedTime = appData.createdDate || '';
  const statusText = appData.status || '';

  return (
    <div className="page-container ad-page-root compact-mode">
      <div className="ad-shell compact">
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
                <span className="ad-meta-value">{applicantName}</span>
              </div>
            </div>
            <div className="ad-meta-divider" />
            <div className="ad-meta-item">
              <span className="ad-meta-label">App ID</span>
              <div className="ad-meta-value-group">
                <FileText size={14} />
                <span className="ad-meta-value">{appData.applicationNumber || appId}</span>
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
                <span className="ad-meta-value">{submittedTime}</span>
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
              <div className="compact-form-row">
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
                      disabled={isLoadingMasters}
                    />
                  </div>
                  {errors.sourcingChannel && <span className="ad-field-error">{errors.sourcingChannel}</span>}
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
                    <span className="compact-input-icon">
                      <Percent size={16} />
                    </span>
                    <input
                      className={`form-input compact-input compact-input--with-icon ${errors.roi ? 'ad-input--invalid' : ''}`}
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      inputMode="decimal"
                      value={appData.roi ?? ''}
                      onChange={(event) => updateField('roi', event.target.value)}
                      placeholder="0.00"
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

