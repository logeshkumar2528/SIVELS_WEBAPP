import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Building2, MapPin, Hash, List, CreditCard, Files } from 'lucide-react';
import iconMap from '../../config/iconMap';
import Button from '../../components/Button/Button';
import Select from '../../components/Select/Select';
import { ROUTES } from '../../config/routeConfig';
import { APPLICATION_WIZARD_STEPS } from '../../config/applicationWizard';
import { useApplicationDraftStore } from '../../state/ApplicationDraftContext';
import WizardSectionLayout from '../../components/WizardSectionLayout/WizardSectionLayout';
import Modal from '../../components/Modal/Modal';
import {
  buildSectionUpdate,
  getApplicantCount,
  getSectionState,
} from '../applicationWizard/flowUtils';

const ACCOUNT_TYPES = ['Savings', 'Current'];

function buildBankState(appData) {
  const saved = getSectionState(appData, 'bankExistingLoans', {});
  const count = getApplicantCount(appData);
  const savedCoApplicants = Array.isArray(saved.coApplicants) ? saved.coApplicants : [];

  const createBank = (source = {}) => ({
    bankName: source.bankName || '',
    branch: source.branch || '',
    ifscCode: source.ifscCode || '',
    accountType: source.accountType || '',
    accountNumber: source.accountNumber || '',
    noOfActiveLoans: source.noOfActiveLoans || '',
    noOfActiveCreditCards: source.noOfActiveCreditCards || '',
    activeLoansDetails: Array.isArray(source.activeLoansDetails) ? source.activeLoansDetails : [],
  });

  return {
    applicant: {
      primaryBank: createBank(saved.applicant?.primaryBank || saved.primaryBank),
      otherBank: createBank(saved.applicant?.otherBank || saved.otherBank),
    },
    coApplicants: Array.from({ length: Math.max(0, count) }, (_, index) => ({
      primaryBank: createBank(savedCoApplicants[index]?.primaryBank),
      otherBank: createBank(savedCoApplicants[index]?.otherBank),
    })),
  };
}

function BankCard({ title, bank, onChange, onViewLoans }) {
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
            <label className="form-label">Account Number</label>
            <div className="aw-input-wrapper">
              <CreditCard className="aw-input-icon" size={14} />
              <input className="form-input aw-input aw-input--with-icon" value={bank.accountNumber} onChange={(e) => onChange('accountNumber', e.target.value)} />
            </div>
          </div>
          <div className="aw-field">
            <label className="form-label">No. of Active Loans</label>
            <div className="aw-input-wrapper" style={{ position: 'relative' }}>
              <Files className="aw-input-icon" size={14} />
              <input className="form-input aw-input aw-input--with-icon" type="number" min="0" step="1" value={bank.noOfActiveLoans} onChange={(e) => onChange('noOfActiveLoans', e.target.value)} style={{ paddingRight: parseInt(bank.noOfActiveLoans) > 0 ? '55px' : '32px' }} />
              {parseInt(bank.noOfActiveLoans) > 0 && (
                <button type="button" onClick={onViewLoans} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                  View
                </button>
              )}
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
  const [viewingLoansFor, setViewingLoansFor] = useState(null);
  const [transientLoans, setTransientLoans] = useState({});

  useEffect(() => {
    ensureApplication(appId);
  }, [appId, ensureApplication]);

  const appData = getApplication(appId);
  const activeCount = useMemo(() => getApplicantCount(appData), [appData]);
  const ArrowLeftIcon = iconMap['ArrowLeft'];

  useEffect(() => {
    setForm(buildBankState(getApplication(appId)));
  }, [appId, getApplication]);

  const persist = (nextForm) => {
    setForm(nextForm);
    saveApplication(appId, buildSectionUpdate(appData, 'bankExistingLoans', nextForm));
  };

  const updateApplicantBank = (scope, field, value) => {
    const nextForm = {
      ...form,
      applicant: {
        ...form.applicant,
        [scope]: {
          ...form.applicant[scope],
          [field]: value,
        },
      },
    };
    persist(nextForm);
  };

  const updateCoApplicantBank = (index, scope, field, value) => {
    const nextForm = {
      ...form,
      coApplicants: form.coApplicants.map((ca, i) => i === index ? {
        ...ca,
        [scope]: {
          ...ca[scope],
          [field]: value,
        },
      } : ca),
    };
    persist(nextForm);
  };

  const updateLoanDetail = (loanIndex, field, value) => {
    if (!viewingLoansFor) return;

    const key = viewingLoansFor.type === 'applicant' 
      ? `applicant-${viewingLoansFor.scope}`
      : `coApplicant-${viewingLoansFor.index}-${viewingLoansFor.scope}`;
      
    setTransientLoans(prev => {
      const currentLoans = prev[key] ? [...prev[key]] : [];
      if (!currentLoans[loanIndex]) {
        currentLoans[loanIndex] = { purpose: '', totalAmount: '', pending: '', status: '' };
      }
      currentLoans[loanIndex] = { ...currentLoans[loanIndex], [field]: value };
      return { ...prev, [key]: currentLoans };
    });
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
      footerHint={`Bank information is stored for the same application ID. ${activeCount > 0 ? `${activeCount + 1} applicant records are linked.` : 'Only the applicant record is linked.'}`}
    >
      <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', marginBottom: '16px' }}>Applicant Banking Details</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start', marginBottom: '32px' }}>
        <BankCard
          title="Primary Bank"
          bank={form.applicant.primaryBank}
          onChange={(field, value) => updateApplicantBank('primaryBank', field, value)}
          onViewLoans={() => setViewingLoansFor({ type: 'applicant', scope: 'primaryBank' })}
        />
        <BankCard
          title="Other Bank"
          bank={form.applicant.otherBank}
          onChange={(field, value) => updateApplicantBank('otherBank', field, value)}
          onViewLoans={() => setViewingLoansFor({ type: 'applicant', scope: 'otherBank' })}
        />
      </div>

      {form.coApplicants.map((coApp, index) => (
        <div key={`coapp-bank-${index}`}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', marginBottom: '16px', paddingTop: '16px', borderTop: '1px solid #edf2f7' }}>
            Co-Applicant {index + 1} Banking Details
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start', marginBottom: '32px' }}>
            <BankCard
              title="Primary Bank"
              bank={coApp.primaryBank}
              onChange={(field, value) => updateCoApplicantBank(index, 'primaryBank', field, value)}
              onViewLoans={() => setViewingLoansFor({ type: 'coApplicant', index, scope: 'primaryBank' })}
            />
            <BankCard
              title="Other Bank"
              bank={coApp.otherBank}
              onChange={(field, value) => updateCoApplicantBank(index, 'otherBank', field, value)}
              onViewLoans={() => setViewingLoansFor({ type: 'coApplicant', index, scope: 'otherBank' })}
            />
          </div>
        </div>
      ))}

      <Modal show={viewingLoansFor !== null} onHide={() => setViewingLoansFor(null)} title={`${viewingLoansFor?.scope === 'primaryBank' ? 'Primary Bank' : 'Other Bank'} - Active Loans Details`} size="lg">
        {viewingLoansFor && (() => {
          const bank = viewingLoansFor.type === 'applicant' 
            ? form.applicant[viewingLoansFor.scope] 
            : form.coApplicants[viewingLoansFor.index][viewingLoansFor.scope];
          const loansCount = parseInt(bank.noOfActiveLoans) || 0;
          const key = viewingLoansFor.type === 'applicant' 
            ? `applicant-${viewingLoansFor.scope}`
            : `coApplicant-${viewingLoansFor.index}-${viewingLoansFor.scope}`;
          const activeLoansDetails = transientLoans[key] || [];

          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {Array.from({ length: loansCount }).map((_, i) => {
                const loan = activeLoansDetails[i] || {};
                return (
                <div key={i} style={{ padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>Loan {i + 1}</div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500, textTransform: 'uppercase' }}>Purpose</span>
                    <input 
                      type="text"
                      className="form-input compact-input"
                      style={{ background: '#fff' }}
                      placeholder="e.g. Personal / Business Loan"
                      value={loan.purpose || ''}
                      onChange={(e) => updateLoanDetail(i, 'purpose', e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500, textTransform: 'uppercase' }}>Total Amount</span>
                      <input 
                        type="text"
                        className="form-input compact-input"
                        style={{ background: '#fff' }}
                        placeholder="₹"
                        value={loan.totalAmount || ''}
                        onChange={(e) => updateLoanDetail(i, 'totalAmount', e.target.value.replace(/\D/g, ''))}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500, textTransform: 'uppercase' }}>Pending</span>
                      <input 
                        type="text"
                        className="form-input compact-input"
                        style={{ background: '#fff' }}
                        placeholder="₹"
                        value={loan.pending || ''}
                        onChange={(e) => updateLoanDetail(i, 'pending', e.target.value.replace(/\D/g, ''))}
                      />
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500, textTransform: 'uppercase' }}>Status</span>
                    <Select
                      value={loan.status || ''}
                      onChange={(val) => updateLoanDetail(i, 'status', val)}
                      options={[{value: 'Active', label: 'Active'}, {value: 'Closed', label: 'Closed'}]}
                      placeholder="Select Status"
                    />
                  </div>
                </div>
                );
              })}
            </div>
          );
        })()}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #edf2f7' }}>
          <Button variant="primary" onClick={() => setViewingLoansFor(null)}>
            Done
          </Button>
        </div>
      </Modal>
    </WizardSectionLayout>
  );
}
