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
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import { ROUTES } from '../../config/routeConfig';
import {
  INTEREST_TYPES,
  LOAN_PRODUCTS,
  LOAN_TRANSACTION_TYPES,
  LOAN_VARIATIONS,
  SOURCING_CHANNELS,
} from '../../config/onboardingFlow';
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

function getLoanProductLabel(code, variation = '') {
  const meta = LOAN_PRODUCTS.find((product) => product.value === code);
  if (!meta) {
    return '';
  }

  return variation ? `${meta.label} - ${variation}` : meta.label;
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

  useEffect(() => {
    ensureApplication(appId);
  }, [appId, ensureApplication]);

  const appData = getApplication(appId);
  const requiresVariation = appData.loanProduct === 'HL' || appData.loanProduct === 'LAP';
  const variationOptions = useMemo(() => LOAN_VARIATIONS[appData.loanProduct] || [], [appData.loanProduct]);
  const activeStep = useMemo(() => getWizardActiveStepByPath(location.pathname, APPLICATION_WIZARD_STEPS), [location.pathname]);

  const updateField = (field, rawValue) => {
    const nextValue = ['loanAmount', 'loanTenureMonths', 'coApplicantsCount', 'distanceFromBranchKm', 'roi'].includes(field)
      ? (rawValue === '' ? '' : Number(rawValue))
      : rawValue;

    const updates = { [field]: nextValue };

    if (field === 'loanProduct') {
      const selected = LOAN_PRODUCTS.find((product) => product.value === rawValue);
      if (!selected || !selected.requiresVariation) {
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

  const handleProceed = () => {
    const validationErrors = validateApplication(appData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    saveApplication(appId, { status: 'Pending Verification' });
    navigate(ROUTES.KYC_DOCUMENTS.replace(':applicationId', appId));
  };

  const handleBack = () => {
    navigate(ROUTES.NEW_APPLICATIONS);
  };

  const applicantName = appData.agentName || appData.customerName || 'Karthik Raja';
  const branchName = appData.branch || 'KK Nagar';
  const submittedTime = `${appData.createdDate || '05 Jun 2025'}, 10:25 AM`;
  const statusText = appData.status || 'Pending Verification';

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
                    <span className="compact-input-icon">
                      <UserCheck size={16} />
                    </span>
                    <select
                      className={`form-select compact-input compact-input--with-icon ${errors.sourcingChannel ? 'ad-input--invalid' : ''}`}
                      value={appData.sourcingChannel || ''}
                      onChange={(event) => updateField('sourcingChannel', event.target.value)}
                    >
                      <option value="">Select sourcing channel</option>
                      {SOURCING_CHANNELS.map((channel) => (
                        <option key={channel} value={channel}>{channel}</option>
                      ))}
                    </select>
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
                    <span className="compact-input-icon">
                      <Briefcase size={16} />
                    </span>
                    <select
                      className={`form-select compact-input compact-input--with-icon ${errors.loanProduct ? 'ad-input--invalid' : ''}`}
                      value={appData.loanProduct || ''}
                      onChange={(event) => updateField('loanProduct', event.target.value)}
                    >
                      <option value="">Select loan product</option>
                      {LOAN_PRODUCTS.map((product) => (
                        <option key={product.value} value={product.value}>{product.label}</option>
                      ))}
                    </select>
                  </div>
                  {errors.loanProduct && <span className="ad-field-error">{errors.loanProduct}</span>}
                </div>

                <div className="compact-field">
                  <label className="compact-label">Loan Transaction Type</label>
                  <div className="compact-input-wrapper">
                    <span className="compact-input-icon">
                      <RefreshCw size={16} />
                    </span>
                    <select
                      className={`form-select compact-input compact-input--with-icon ${errors.loanTransactionType ? 'ad-input--invalid' : ''}`}
                      value={appData.loanTransactionType || ''}
                      onChange={(event) => updateField('loanTransactionType', event.target.value)}
                    >
                      <option value="">Select transaction type</option>
                      {LOAN_TRANSACTION_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  {errors.loanTransactionType && <span className="ad-field-error">{errors.loanTransactionType}</span>}
                </div>

                <div className="compact-field">
                  <label className="compact-label">Purpose of Loan</label>
                  <div className="compact-input-wrapper">
                    <span className="compact-input-icon">
                      <Target size={16} />
                    </span>
                    <input
                      className={`form-input compact-input compact-input--with-icon ${errors.purposeOfLoan ? 'ad-input--invalid' : ''}`}
                      type="text"
                      value={appData.purposeOfLoan || ''}
                      onChange={(event) => updateField('purposeOfLoan', event.target.value)}
                      placeholder="Short purpose note"
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
                    <span className="compact-input-icon">
                      <TrendingUp size={16} />
                    </span>
                    <select
                      className={`form-select compact-input compact-input--with-icon ${errors.interestType ? 'ad-input--invalid' : ''}`}
                      value={appData.interestType || ''}
                      onChange={(event) => updateField('interestType', event.target.value)}
                    >
                      <option value="">Select interest type</option>
                      {INTEREST_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
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
                      <span className="compact-input-icon">
                        <GitBranch size={16} />
                      </span>
                      <select
                        className={`form-select compact-input compact-input--with-icon ${errors.loanVariation ? 'ad-input--invalid' : ''}`}
                        value={appData.loanVariation || ''}
                        onChange={(event) => updateField('loanVariation', event.target.value)}
                      >
                        <option value="">Select variation</option>
                        {variationOptions.map((variation) => (
                          <option key={variation} value={variation}>{variation}</option>
                        ))}
                      </select>
                    </div>
                    {errors.loanVariation && <span className="ad-field-error">{errors.loanVariation}</span>}
                  </div>
                )}
              </div>
            </div>

            <footer className="compact-action-bar" aria-label="Page actions">
              <Button
                variant="secondary"
                size="sm"
                icon={<ArrowLeft size={14} />}
                onClick={handleBack}
              >
                Back
              </Button>

              <Button
                variant="primary"
                size="sm"
                icon={<ArrowRight size={14} />}
                iconPosition="right"
                onClick={handleProceed}
              >
                Save & Continue
              </Button>
            </footer>
          </div>
        </section>
      </div>
    </div>
  );
}

