import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Building2, MapPin, Hash, List, CreditCard, Files, AlertCircle, RefreshCw } from 'lucide-react';
import iconMap from '../../config/iconMap';
import Button from '../../components/Button/Button';
import Select from '../../components/Select/Select';
import { ROUTES } from '../../config/routeConfig';
import { APPLICATION_WIZARD_STEPS } from '../../config/applicationWizard';
import { useApplicationDraftStore } from '../../state/ApplicationDraftContext';
import WizardSectionLayout from '../../components/WizardSectionLayout/WizardSectionLayout';
import Modal from '../../components/Modal/Modal';
import ErrorPopup from '../../components/ErrorPopup/ErrorPopup';
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
    applicationBankExistingLoanDetailsId: source.applicationBankExistingLoanDetailsId || source.ApplicationBankExistingLoanDetailsId || source.applicationBankDetailsId || source.ApplicationBankDetailsId || null,
    bankName: source.bankName || '',
    branch: source.branch || '',
    ifscCode: source.ifscCode || '',
    accountType: source.accountType || '',
    accountNumber: source.accountNumber || '',
    noOfActiveLoans: source.noOfActiveLoans || '',
    noOfActiveCreditCards: source.noOfActiveCreditCards || '',
    activeLoansDetails: Array.isArray(source.activeLoansDetails) ? source.activeLoansDetails : [],
    activeCreditCardsDetails: Array.isArray(source.activeCreditCardsDetails) ? source.activeCreditCardsDetails : [],
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

function BankCard({ 
  title, 
  bank, 
  onChange, 
  onViewLoans,
  onViewCreditCards,
  bankOptions = [],
  branchOptions = [],
  isLoadingMasters = false 
}) {
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
              <Select
                value={bank.bankName}
                onChange={(val) => {
                  onChange({ bankName: val, branch: '' });
                }}
                placeholder={isLoadingMasters ? "Loading..." : "Select Bank"}
                options={bankOptions}
                disabled={isLoadingMasters}
                icon={<Building2 size={14} />}
              />
            </div>
          </div>
          <div className="aw-field">
            <label className="form-label">Branch</label>
            <div className="aw-input-wrapper">
              <Select
                value={bank.branch}
                onChange={(val) => onChange('branch', val)}
                placeholder={isLoadingMasters ? "Loading..." : "Select Branch"}
                options={branchOptions.filter(b => !bank.bankName || b.raw.bankId === Number(bank.bankName))}
                disabled={isLoadingMasters || !bank.bankName}
                icon={<MapPin size={14} />}
              />
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
            <div className="aw-input-wrapper" style={{ position: 'relative' }}>
              <CreditCard className="aw-input-icon" size={14} />
              <input className="form-input aw-input aw-input--with-icon" type="number" min="0" step="1" value={bank.noOfActiveCreditCards} onChange={(e) => onChange('noOfActiveCreditCards', e.target.value)} style={{ paddingRight: parseInt(bank.noOfActiveCreditCards) > 0 ? '55px' : '32px' }} />
              {parseInt(bank.noOfActiveCreditCards) > 0 && <button type="button" onClick={onViewCreditCards} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>View</button>}
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
  const { getApplication, ensureApplication, saveApplication, loadApplicationFromBackend } = useApplicationDraftStore();
  const [form, setForm] = useState(() => buildBankState(getApplication(appId)));
  const [errorPopup, setErrorPopup] = useState(null);
  const [viewingLoansFor, setViewingLoansFor] = useState(null);
  const [activeLoansList, setActiveLoansList] = useState([]);
  const [isLoadingActiveLoans, setIsLoadingActiveLoans] = useState(false);
  const [activeLoansError, setActiveLoansError] = useState(null);
  const [viewingCardsFor, setViewingCardsFor] = useState(null);
  const [transientCards, setTransientCards] = useState({});
  const [isLoadingMasters, setIsLoadingMasters] = useState(false);
  const [bankOptions, setBankOptions] = useState([]);
  const [branchOptions, setBranchOptions] = useState([]);

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
        fetchMaster('masters/bank/active', 'bankId', 'bankName', setBankOptions),
        fetchMaster('BankBranch', 'bankBranchId', 'branchName', setBranchOptions),
      ]);
      setIsLoadingMasters(false);
    }
    
    loadMasters();
  }, []);

  const hydratedAppIdRef = useRef(null);

  useEffect(() => {
    ensureApplication(appId);
  }, [appId, ensureApplication]);

  useEffect(() => {
    if (hydratedAppIdRef.current === appId) return;
    let active = true;

    async function hydrateBankData() {
      if (!appId) return;
      try {
        const hydratedApp = await loadApplicationFromBackend(appId);
        if (!active) return;
        hydratedAppIdRef.current = appId;
        if (hydratedApp) {
          setForm(buildBankState(hydratedApp));
        }
      } catch (err) {
        console.error('Error hydrating bank data:', err);
      }
    }

    hydrateBankData();

    return () => {
      active = false;
    };
  }, [appId, loadApplicationFromBackend]);

  const appData = useMemo(() => getApplication(appId), [getApplication, appId]);
  const activeCount = useMemo(() => getApplicantCount(appData), [appData]);
  const ArrowLeftIcon = iconMap['ArrowLeft'];

  const persist = (nextForm) => {
    setForm(nextForm);
    const currentAppData = getApplication(appId);
    saveApplication(appId, buildSectionUpdate(currentAppData, 'bankExistingLoans', nextForm));
  };

  const updateApplicantBank = (scope, fieldOrObj, value) => {
    const updates = typeof fieldOrObj === 'object' ? fieldOrObj : { [fieldOrObj]: value };
    const nextForm = {
      ...form,
      applicant: {
        ...form.applicant,
        [scope]: {
          ...form.applicant[scope],
          ...updates,
        },
      },
    };
    persist(nextForm);
  };

  const updateCoApplicantBank = (index, scope, fieldOrObj, value) => {
    const updates = typeof fieldOrObj === 'object' ? fieldOrObj : { [fieldOrObj]: value };
    const nextForm = {
      ...form,
      coApplicants: form.coApplicants.map((ca, i) =>
        i === index
          ? {
              ...ca,
              [scope]: {
                ...ca[scope],
                ...updates,
              },
            }
          : ca
      ),
    };
    persist(nextForm);
  };

  const fetchActiveLoansForBank = async (bankDetailsId) => {
    setIsLoadingActiveLoans(true);
    setActiveLoansError(null);
    setActiveLoansList([]);
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';

    try {
      const res = await fetch(`${baseUrl}/ApplicationBankActiveLoanDetails`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data?.value ?? data?.data ?? data?.result ?? []);
        
        let matched = [];
        if (bankDetailsId) {
          matched = list.filter((item) => {
            const itemBankId =
              item.applicationBankDetailsId ??
              item.ApplicationBankDetailsId ??
              item.applicationBankExistingLoanDetailsId ??
              item.ApplicationBankExistingLoanDetailsId ??
              item.bankDetailsId ??
              item.BankDetailsId;
            return String(itemBankId) === String(bankDetailsId);
          });
        }
        setActiveLoansList(matched);
      } else {
        console.warn('Failed to fetch ApplicationBankActiveLoanDetails:', res.status);
        setActiveLoansError('Unable to load active loan details from server.');
      }
    } catch (err) {
      console.error('Error fetching active loans from server:', err);
      setActiveLoansError('Network error while connecting to Active Loans API.');
    } finally {
      setIsLoadingActiveLoans(false);
    }
  };

  const handleOpenLoansModal = (target) => {
    setViewingLoansFor(target);
    const currentApp = getApplication(appId);
    const bankState = target.type === 'applicant'
      ? form.applicant[target.scope]
      : form.coApplicants[target.index]?.[target.scope];
    
    const appDataBankState = target.type === 'applicant'
      ? currentApp?.bankExistingLoans?.applicant?.[target.scope] || currentApp?.sections?.bankExistingLoans?.applicant?.[target.scope]
      : currentApp?.bankExistingLoans?.coApplicants?.[target.index]?.[target.scope] || currentApp?.sections?.bankExistingLoans?.coApplicants?.[target.index]?.[target.scope];
    
    const bankId =
      bankState?.applicationBankDetailsId ||
      bankState?.ApplicationBankDetailsId ||
      bankState?.applicationBankExistingLoanDetailsId ||
      bankState?.ApplicationBankExistingLoanDetailsId ||
      appDataBankState?.applicationBankDetailsId ||
      appDataBankState?.ApplicationBankDetailsId ||
      appDataBankState?.applicationBankExistingLoanDetailsId ||
      appDataBankState?.ApplicationBankExistingLoanDetailsId;

    fetchActiveLoansForBank(bankId);
  };

  const updateCardDetail = (cardIndex, field, value) => {
    if (!viewingCardsFor) return;
    const key = viewingCardsFor.type === 'applicant'
      ? `applicant-${viewingCardsFor.scope}`
      : `coApplicant-${viewingCardsFor.index}-${viewingCardsFor.scope}`;
    setTransientCards((prev) => {
      const cards = prev[key] ? [...prev[key]] : [];
      cards[cardIndex] = { ...(cards[cardIndex] || {}), [field]: value };
      return { ...prev, [key]: cards };
    });
  };

  const saveCardDetails = () => {
    if (!viewingCardsFor) return;
    const key = viewingCardsFor.type === 'applicant'
      ? `applicant-${viewingCardsFor.scope}`
      : `coApplicant-${viewingCardsFor.index}-${viewingCardsFor.scope}`;
    const cards = transientCards[key] || [];
    if (viewingCardsFor.type === 'applicant') updateApplicantBank(viewingCardsFor.scope, 'activeCreditCardsDetails', cards);
    else updateCoApplicantBank(viewingCardsFor.index, viewingCardsFor.scope, 'activeCreditCardsDetails', cards);
    setViewingCardsFor(null);
  };

  const handleContinue = async () => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';
    const allPersons = [
      { banks: form.applicant, isPrimary: true },
      ...form.coApplicants.map((co, i) => ({ banks: co, index: i, isPrimary: false }))
    ];

    try {
      for (const person of allPersons) {
        const empId = person.isPrimary
          ? appData.sections?.employmentIncome?.applicant?.employmentIncomeDetailsId || appData.employmentIncome?.applicant?.employmentIncomeDetailsId
          : appData.sections?.employmentIncome?.coApplicants?.[person.index]?.employmentIncomeDetailsId || appData.employmentIncome?.coApplicants?.[person.index]?.employmentIncomeDetailsId;

        if (!empId) {
          console.warn('No Employment Income Details ID found, skipping Bank API save for this applicant');
          continue;
        }

        const banksToSave = [
          { data: person.banks.primaryBank, type: 'primary' },
          { data: person.banks.otherBank, type: 'other' }
        ];

        for (const bank of banksToSave) {
          if (!bank.data.bankName) continue; // Skip if no bank is selected

          const isUpdate = !!bank.data.applicationBankExistingLoanDetailsId;
          const url = isUpdate
            ? `${baseUrl}/ApplicationBankExistingLoanDetails/${bank.data.applicationBankExistingLoanDetailsId}`
            : `${baseUrl}/ApplicationBankExistingLoanDetails`;

          const payload = {
            ApplicationEmploymentIncomeDetailsId: Number(empId),
            BankId: Number(bank.data.bankName),
            BankBranchId: Number(bank.data.branch) || 0,
            AccountNumber: bank.data.accountNumber || '',
            NoOfActiveLoans: Number(bank.data.noOfActiveLoans) || 0,
            NoOfActiveCreditCards: Number(bank.data.noOfActiveCreditCards) || 0,
            IsPrimaryBank: bank.type === 'primary',
            CreatedBy: 1
          };

          if (isUpdate) {
            payload.ApplicationBankExistingLoanDetailsId = Number(bank.data.applicationBankExistingLoanDetailsId);
          }

          const response = await fetch(url, {
            method: isUpdate ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            throw new Error(`Failed to save ${bank.type} bank: ${response.statusText}`);
          }

          let savedData = null;
          if (response.status !== 204) {
            const text = await response.text();
            if (text) { try { savedData = JSON.parse(text); } catch (e) { /* ignore */ } }
          }
          
          const savedId = savedData?.applicationBankExistingLoanDetailsId || savedData?.ApplicationBankExistingLoanDetailsId;
          if (savedId) {
            bank.data.applicationBankExistingLoanDetailsId = savedId;
          }
        }
      }

      saveApplication(appId, buildSectionUpdate(appData, 'bankExistingLoans', form));
      navigate(ROUTES.COLLATERAL.replace(':applicationId', appId));
    } catch (err) {
      console.error('Error saving Bank Details:', err);
      setErrorPopup({
        title: 'Connection error',
        message: 'Network error while saving bank details. Please try again.',
        variant: 'error',
      });
    }
  };

  const handleBack = () => {
    navigate(ROUTES.EMPLOYMENT_INCOME.replace(':applicationId', appId));
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
          onViewLoans={() => handleOpenLoansModal({ type: 'applicant', scope: 'primaryBank' })}
          onViewCreditCards={() => setViewingCardsFor({ type: 'applicant', scope: 'primaryBank' })}
          bankOptions={bankOptions}
          branchOptions={branchOptions}
          isLoadingMasters={isLoadingMasters}
        />
        <BankCard
          title="Other Bank"
          bank={form.applicant.otherBank}
          onChange={(field, value) => updateApplicantBank('otherBank', field, value)}
          onViewLoans={() => handleOpenLoansModal({ type: 'applicant', scope: 'otherBank' })}
          onViewCreditCards={() => setViewingCardsFor({ type: 'applicant', scope: 'otherBank' })}
          bankOptions={bankOptions}
          branchOptions={branchOptions}
          isLoadingMasters={isLoadingMasters}
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
              onViewLoans={() => handleOpenLoansModal({ type: 'coApplicant', index, scope: 'primaryBank' })}
              onViewCreditCards={() => setViewingCardsFor({ type: 'coApplicant', index, scope: 'primaryBank' })}
              bankOptions={bankOptions}
              branchOptions={branchOptions}
              isLoadingMasters={isLoadingMasters}
            />
            <BankCard
              title="Other Bank"
              bank={coApp.otherBank}
              onChange={(field, value) => updateCoApplicantBank(index, 'otherBank', field, value)}
              onViewLoans={() => handleOpenLoansModal({ type: 'coApplicant', index, scope: 'otherBank' })}
              onViewCreditCards={() => setViewingCardsFor({ type: 'coApplicant', index, scope: 'otherBank' })}
              bankOptions={bankOptions}
              branchOptions={branchOptions}
              isLoadingMasters={isLoadingMasters}
            />
          </div>
        </div>
      ))}

      <Modal show={viewingCardsFor !== null} onHide={() => setViewingCardsFor(null)} title={`${viewingCardsFor?.scope === 'primaryBank' ? 'Primary Bank' : 'Other Bank'} - Active Credit Card Details`} size="lg">
        {viewingCardsFor && (() => {
          const bank = viewingCardsFor.type === 'applicant' ? form.applicant[viewingCardsFor.scope] : form.coApplicants[viewingCardsFor.index][viewingCardsFor.scope];
          const count = parseInt(bank.noOfActiveCreditCards) || 0;
          const key = viewingCardsFor.type === 'applicant' ? `applicant-${viewingCardsFor.scope}` : `coApplicant-${viewingCardsFor.index}-${viewingCardsFor.scope}`;
          const cards = transientCards[key] || bank.activeCreditCardsDetails || [];
          return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {Array.from({ length: count }).map((_, i) => {
              const card = cards[i] || {};
              return <div key={i} style={{ padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a' }}>Credit Card {i + 1}</div>
                <input className="form-input compact-input" placeholder="Card Name" value={card.cardName || ''} onChange={(e) => updateCardDetail(i, 'cardName', e.target.value)} />
                <input className="form-input compact-input" placeholder="Card Number" inputMode="numeric" value={card.cardNumber || ''} onChange={(e) => updateCardDetail(i, 'cardNumber', e.target.value.replace(/\D/g, '').slice(0, 19))} />
              </div>;
            })}
          </div>;
        })()}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #edf2f7' }}><Button variant="primary" onClick={saveCardDetails}>Done</Button></div>
      </Modal>

      <Modal 
        show={viewingLoansFor !== null} 
        onHide={() => {
          setViewingLoansFor(null);
          setActiveLoansList([]);
          setActiveLoansError(null);
        }} 
        title={`${viewingLoansFor?.type === 'coApplicant' ? `Co-Applicant ${(viewingLoansFor?.index || 0) + 1}` : 'Applicant'} - ${viewingLoansFor?.scope === 'primaryBank' ? 'Primary Bank' : 'Other Bank'} Active Loans`} 
        size="lg"
      >
        {isLoadingActiveLoans ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: '12px', color: '#64748b' }}>
            <RefreshCw className="master-spin" size={24} style={{ color: '#0284c7' }} />
            <span style={{ fontSize: '13px', fontWeight: 500 }}>Fetching active loan details from server...</span>
          </div>
        ) : activeLoansError ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#b91c1c', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
            <AlertCircle size={24} style={{ margin: '0 auto 8px' }} />
            <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>Error Loading Active Loans</div>
            <div style={{ fontSize: '12px' }}>{activeLoansError}</div>
          </div>
        ) : activeLoansList.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
            <Files size={32} style={{ margin: '0 auto 8px', color: '#94a3b8' }} />
            <div style={{ fontWeight: 600, color: '#334155', fontSize: '14px', marginBottom: '4px' }}>No Active Loan Records Found</div>
            <div style={{ fontSize: '12px', maxWidth: '400px', margin: '0 auto' }}>
              There are no active loan records linked with this bank account in the system.
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {activeLoansList.map((loan, i) => {
              const loanType = loan.loanType ?? loan.LoanType ?? loan.typeOfLoan ?? loan.TypeOfLoan ?? '-';
              const totalAmount = loan.totalLoanAmount ?? loan.TotalLoanAmount ?? loan.loanAmount ?? loan.LoanAmount;
              const outstanding = loan.totalOutstanding ?? loan.TotalOutstanding ?? loan.outstandingAmount ?? loan.OutstandingAmount;
              const emi = loan.emiAmount ?? loan.EmiAmount ?? loan.emi ?? loan.Emi;
              const status = loan.status ?? loan.Status ?? 'Active';
              const isStatusActive = String(status).trim().toLowerCase() === 'active';

              return (
                <div 
                  key={loan.applicationBankActiveLoanDetailsId ?? loan.ApplicationBankActiveLoanDetailsId ?? i} 
                  style={{ 
                    padding: '16px', 
                    borderRadius: '8px', 
                    border: '1px solid #e2e8f0', 
                    background: '#f8fafc', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '14px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
                      Loan #{i + 1}
                    </span>
                    <span 
                      style={{ 
                        fontSize: '11px', 
                        fontWeight: 600, 
                        padding: '2px 10px', 
                        borderRadius: '9999px',
                        background: isStatusActive ? '#dcfce7' : '#f1f5f9',
                        color: isStatusActive ? '#15803d' : '#475569',
                        border: `1px solid ${isStatusActive ? '#bbf7d0' : '#e2e8f0'}`
                      }}
                    >
                      {status}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Loan Type
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                        {loanType}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        EMI Amount
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f766e' }}>
                        {emi !== undefined && emi !== null && emi !== '' 
                          ? `₹ ${Number(emi).toLocaleString('en-IN')}` 
                          : '-'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Total Loan Amount
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                        {totalAmount !== undefined && totalAmount !== null && totalAmount !== '' 
                          ? `₹ ${Number(totalAmount).toLocaleString('en-IN')}` 
                          : '-'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Total Outstanding
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#b91c1c' }}>
                        {outstanding !== undefined && outstanding !== null && outstanding !== '' 
                          ? `₹ ${Number(outstanding).toLocaleString('en-IN')}` 
                          : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #edf2f7' }}>
          <Button variant="primary" onClick={() => { setViewingLoansFor(null); setActiveLoansList([]); }}>
            Close
          </Button>
        </div>
      </Modal>
    </WizardSectionLayout>
    </>
  );
}
