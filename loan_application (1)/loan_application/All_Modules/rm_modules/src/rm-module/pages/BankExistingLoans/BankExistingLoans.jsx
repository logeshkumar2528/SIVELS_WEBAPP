import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Building2, MapPin, Hash, List, CreditCard, Files } from 'lucide-react';
import iconMap from '../../config/iconMap';
import Button from '../../components/Button/Button';
import { ROUTES } from '../../config/routeConfig';
import { APPLICATION_WIZARD_STEPS } from '../../config/applicationWizard';
import { useApplicationDraftStore } from '../../state/ApplicationDraftContext';
import WizardSectionLayout from '../../components/WizardSectionLayout/WizardSectionLayout';
import {
  buildSectionUpdate,
  getApplicantCount,
  getSectionState,
} from '../applicationWizard/flowUtils';

const ACCOUNT_TYPES = ['Savings', 'Current'];

function buildBankState(appData) {
  const saved = getSectionState(appData, 'bankExistingLoans', {});

  const createBank = (source = {}) => ({
    bankName: source.bankName || '',
    branch: source.branch || '',
    ifscCode: source.ifscCode || '',
    accountType: source.accountType || '',
    accountNumber: source.accountNumber || '',
    noOfActiveLoans: source.noOfActiveLoans || '',
    noOfActiveCreditCards: source.noOfActiveCreditCards || '',
  });

  return {
    primaryBank: createBank(saved.primaryBank),
    otherBank: createBank(saved.otherBank),
  };
}

function BankCard({ title, bank, onChange }) {
  return (
    <div className="aw-mini-card">
      <div className="aw-mini-card__header">
        <div>
          <div className="aw-mini-card__title">{title}</div>
          <div className="aw-mini-card__subtitle">Bank details from PDF Section 6</div>
        </div>
      </div>
      <div className="aw-mini-card__body">
        <div className="aw-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <div className="aw-field">
            <label className="form-label">Bank Name</label>
            <div className="aw-input-wrapper">
              <Building2 className="aw-input-icon" size={14} />
              <input className="form-input aw-input aw-input--with-icon" value={bank.bankName} onChange={(e) => onChange('bankName', e.target.value)} />
            </div>
          </div>
          <div className="aw-field">
            <label className="form-label">Branch</label>
            <div className="aw-input-wrapper">
              <MapPin className="aw-input-icon" size={14} />
              <input className="form-input aw-input aw-input--with-icon" value={bank.branch} onChange={(e) => onChange('branch', e.target.value)} />
            </div>
          </div>
          <div className="aw-field">
            <label className="form-label">IFSC Code</label>
            <div className="aw-input-wrapper">
              <Hash className="aw-input-icon" size={14} />
              <input className="form-input aw-input aw-input--with-icon" value={bank.ifscCode} onChange={(e) => onChange('ifscCode', e.target.value.toUpperCase())} />
            </div>
          </div>
          <div className="aw-field">
            <label className="form-label">A/C Type</label>
            <div className="aw-input-wrapper">
              <List className="aw-input-icon" size={14} />
              <select className="form-select aw-input aw-input--with-icon" value={bank.accountType} onChange={(e) => onChange('accountType', e.target.value)}>
                <option value="">Select account type</option>
                {ACCOUNT_TYPES.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
          </div>
          <div className="aw-field">
            <label className="form-label">A/C Number</label>
            <div className="aw-input-wrapper">
              <CreditCard className="aw-input-icon" size={14} />
              <input className="form-input aw-input aw-input--with-icon" value={bank.accountNumber} onChange={(e) => onChange('accountNumber', e.target.value)} />
            </div>
          </div>
          <div className="aw-field">
            <label className="form-label">No. of Active Loans</label>
            <div className="aw-input-wrapper">
              <Files className="aw-input-icon" size={14} />
              <input className="form-input aw-input aw-input--with-icon" type="number" min="0" step="1" value={bank.noOfActiveLoans} onChange={(e) => onChange('noOfActiveLoans', e.target.value)} />
            </div>
          </div>
          <div className="aw-field">
            <label className="form-label">No. of Active Credit Cards</label>
            <div className="aw-input-wrapper">
              <CreditCard className="aw-input-icon" size={14} />
              <input className="form-input aw-input aw-input--with-icon" type="number" min="0" step="1" value={bank.noOfActiveCreditCards} onChange={(e) => onChange('noOfActiveCreditCards', e.target.value)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BankExistingLoans() {
  const navigate = useNavigate();
  const { applicationId } = useParams();
  const appId = applicationId;
  const { getApplication, ensureApplication, saveApplication } = useApplicationDraftStore();
  const [form, setForm] = useState(() => buildBankState(getApplication(appId)));

  useEffect(() => {
    ensureApplication(appId);
  }, [appId, ensureApplication]);

  const appData = getApplication(appId);
  const activeCount = useMemo(() => getApplicantCount(appData), [appData]);
  const ArrowLeftIcon = iconMap['ArrowLeft'];
  const InfoIcon = iconMap['Info'];

  useEffect(() => {
    setForm(buildBankState(getApplication(appId)));
  }, [appId, getApplication]);

  const persist = (nextForm) => {
    setForm(nextForm);
    saveApplication(appId, buildSectionUpdate(appData, 'bankExistingLoans', nextForm));
  };

  const updateBank = (scope, field, value) => {
    const nextForm = {
      ...form,
      [scope]: {
        ...form[scope],
        [field]: value,
      },
    };
    persist(nextForm);
  };

  const handleContinue = () => {
    saveApplication(appId, buildSectionUpdate(appData, 'bankExistingLoans', form));
    navigate(ROUTES.COLLATERAL.replace(':applicationId', appId));
  };

  const handleBack = () => {
    navigate(ROUTES.EMPLOYMENT_INCOME.replace(':applicationId', appId));
  };

  return (
    <WizardSectionLayout
      appId={appId}
      appData={appData}
      steps={APPLICATION_WIZARD_STEPS}
      activeStep={6}
      title="Step 6: Bank / Existing Loan Details"
      subtitle="Capture the applicant's primary bank and any other bank details used in the loan application."
      backLabel="Back to Employment & Income"
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
          Back to Employment & Income
        </Button>
      }
      footerHint={`Bank information is stored for the same application ID. ${activeCount > 1 ? `${activeCount} applicant records are linked.` : 'Only the applicant record is linked.'}`}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
        <BankCard
          title="Primary Bank"
          bank={form.primaryBank}
          onChange={(field, value) => updateBank('primaryBank', field, value)}
        />
        <BankCard
          title="Other Bank"
          bank={form.otherBank}
          onChange={(field, value) => updateBank('otherBank', field, value)}
        />
      </div>
    </WizardSectionLayout>
  );
}
