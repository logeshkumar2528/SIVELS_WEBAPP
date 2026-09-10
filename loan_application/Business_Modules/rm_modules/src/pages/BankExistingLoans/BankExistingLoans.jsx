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

async function syncActiveLoansForBank(bankId, loansToSave, activeCount, baseUrl, currentUserId = 1) {
  if (!bankId) return loansToSave;

  // 1. Fetch existing active loans from backend for this bank
  let existingLoans = [];
  try {
    const res = await fetch(`${baseUrl}/ApplicationBankActiveLoanDetails`);
    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data?.value ?? data?.data ?? []);
      existingLoans = list.filter((item) => {
        const itemBankId =
          item.applicationBankExistingLoanDetailsId ??
          item.ApplicationBankExistingLoanDetailsId ??
          item.applicationBankDetailsId ??
          item.ApplicationBankDetailsId;
        return itemBankId && Number(itemBankId) === Number(bankId);
      });
    } else {
      throw new Error(`Failed to fetch active loans list (HTTP ${res.status})`);
    }
  } catch (err) {
    console.error(`Failed to fetch existing active loans for bank ${bankId}:`, err);
    throw err;
  }

  const existingMap = new Map();
  existingLoans.forEach((l) => {
    const lid = l.applicationBankActiveLoanDetailsId ?? l.ApplicationBankActiveLoanDetailsId ?? l.id;
    if (lid) existingMap.set(String(lid), l);
  });

  const updatedLoansList = [];

  // 2. Save/Update loans within activeCount
  for (let i = 0; i < activeCount; i++) {
    const loan = loansToSave[i] || {};
    const loanType = loan.loanType || '';
    const totalLoanAmount = loan.totalLoanAmount !== '' && loan.totalLoanAmount !== null && loan.totalLoanAmount !== undefined ? Number(loan.totalLoanAmount) : null;
    const totalOutstanding = loan.totalOutstanding !== '' && loan.totalOutstanding !== null && loan.totalOutstanding !== undefined ? Number(loan.totalOutstanding) : null;
    const emiAmount = loan.emiAmount !== '' && loan.emiAmount !== null && loan.emiAmount !== undefined ? Number(loan.emiAmount) : null;

    if (loanType || totalLoanAmount !== null || totalOutstanding !== null || emiAmount !== null) {
      const loanId = loan.applicationBankActiveLoanDetailsId || loan.ApplicationBankActiveLoanDetailsId;

      if (loanId && existingMap.has(String(loanId))) {
        // PUT update
        const putPayload = {
          applicationBankActiveLoanDetailsId: Number(loanId),
          applicationBankExistingLoanDetailsId: Number(bankId),
          loanType: loanType,
          totalLoanAmount: totalLoanAmount || 0,
          totalOutstanding: totalOutstanding || 0,
          emiAmount: emiAmount || 0,
          status: loan.status || 'Active',
          modifiedBy: Number(currentUserId) || 1,
        };

        const putRes = await fetch(`${baseUrl}/ApplicationBankActiveLoanDetails/${loanId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(putPayload),
        });

        if (!putRes.ok) {
          throw new Error(`Failed to update active loan ${loanId} (HTTP ${putRes.status})`);
        }

        updatedLoansList.push({
          ...loan,
          applicationBankActiveLoanDetailsId: Number(loanId),
          applicationBankExistingLoanDetailsId: Number(bankId),
          loanType,
          totalLoanAmount: totalLoanAmount !== null ? String(totalLoanAmount) : '',
          totalOutstanding: totalOutstanding !== null ? String(totalOutstanding) : '',
          emiAmount: emiAmount !== null ? String(emiAmount) : '',
          status: loan.status || 'Active',
        });
      } else {
        // POST new loan
        const postPayload = {
          applicationBankExistingLoanDetailsId: Number(bankId),
          loanType: loanType,
          totalLoanAmount: totalLoanAmount || 0,
          totalOutstanding: totalOutstanding || 0,
          emiAmount: emiAmount || 0,
          status: loan.status || 'Active',
          createdBy: Number(currentUserId) || 1,
        };

        const postRes = await fetch(`${baseUrl}/ApplicationBankActiveLoanDetails`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postPayload),
        });

        if (!postRes.ok) {
          throw new Error(`Failed to create active loan (HTTP ${postRes.status})`);
        }

        let newId = null;
        if (postRes.status !== 204) {
          const resText = await postRes.text();
          if (resText) {
            try {
              const resJson = JSON.parse(resText);
              newId = resJson?.applicationBankActiveLoanDetailsId || resJson?.ApplicationBankActiveLoanDetailsId || resJson?.id;
            } catch (e) {}
          }
        }

        updatedLoansList.push({
          ...loan,
          applicationBankActiveLoanDetailsId: newId || loan.applicationBankActiveLoanDetailsId || null,
          applicationBankExistingLoanDetailsId: Number(bankId),
          loanType,
          totalLoanAmount: totalLoanAmount !== null ? String(totalLoanAmount) : '',
          totalOutstanding: totalOutstanding !== null ? String(totalOutstanding) : '',
          emiAmount: emiAmount !== null ? String(emiAmount) : '',
          status: loan.status || 'Active',
        });
      }
    } else {
      updatedLoansList.push(loan);
    }
  }

  return updatedLoansList;
}

async function syncCreditCardsForBank(bankId, cardsToSave, activeCount, baseUrl, currentUserId = 1) {
  if (!bankId) return [];

  // 1. Fetch existing credit cards from backend for this bank
  let existingCards = [];
  try {
    const res = await fetch(`${baseUrl}/ApplicationBankCreditCardDetails/by-bank/${bankId}`);
    if (res.ok) {
      const data = await res.json();
      existingCards = Array.isArray(data) ? data : (data?.value ?? data?.data ?? []);
    }
  } catch (err) {
    console.warn(`Failed to fetch existing credit cards for bank ${bankId}:`, err);
  }

  const existingMap = new Map();
  existingCards.forEach((c) => {
    const cid = c.applicationBankCreditCardDetailsId ?? c.ApplicationBankCreditCardDetailsId ?? c.id;
    if (cid) existingMap.set(String(cid), c);
  });

  const updatedCardsList = [];
  const processedCardIds = new Set();

  // 2. Save/Update cards within activeCount
  for (let i = 0; i < activeCount; i++) {
    const card = cardsToSave[i] || {};
    const cardName = card.cardName || '';
    const cardNumber = card.cardNumber || '';

    if (cardName || cardNumber) {
      const cardId = card.applicationBankCreditCardDetailsId || card.ApplicationBankCreditCardDetailsId;

      if (cardId && existingMap.has(String(cardId))) {
        // PUT update
        processedCardIds.add(String(cardId));
        const putPayload = {
          applicationBankCreditCardDetailsId: Number(cardId),
          applicationBankExistingLoanDetailsId: Number(bankId),
          cardName: cardName,
          cardNumber: cardNumber,
          status: card.status || 'Active',
          modifiedBy: Number(currentUserId) || 1,
        };

        try {
          const putRes = await fetch(`${baseUrl}/ApplicationBankCreditCardDetails/${cardId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(putPayload),
          });
          if (putRes.ok) {
            updatedCardsList.push({
              ...card,
              applicationBankCreditCardDetailsId: Number(cardId),
              applicationBankExistingLoanDetailsId: Number(bankId),
            });
          } else {
            updatedCardsList.push(card);
          }
        } catch (e) {
          console.warn(`Failed to update credit card ${cardId}:`, e);
          updatedCardsList.push(card);
        }
      } else {
        // POST new card
        const postPayload = {
          applicationBankExistingLoanDetailsId: Number(bankId),
          cardName: cardName,
          cardNumber: cardNumber,
          status: card.status || 'Active',
          createdBy: Number(currentUserId) || 1,
        };

        try {
          const postRes = await fetch(`${baseUrl}/ApplicationBankCreditCardDetails`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(postPayload),
          });
          if (postRes.ok) {
            let newId = null;
            if (postRes.status !== 204) {
              const resText = await postRes.text();
              if (resText) {
                try {
                  const resJson = JSON.parse(resText);
                  newId = resJson?.applicationBankCreditCardDetailsId || resJson?.ApplicationBankCreditCardDetailsId || resJson?.id;
                } catch (e) {}
              }
            }
            if (newId) processedCardIds.add(String(newId));
            updatedCardsList.push({
              ...card,
              applicationBankCreditCardDetailsId: newId || card.applicationBankCreditCardDetailsId || null,
              applicationBankExistingLoanDetailsId: Number(bankId),
            });
          } else {
            updatedCardsList.push(card);
          }
        } catch (e) {
          console.warn('Failed to create credit card:', e);
          updatedCardsList.push(card);
        }
      }
    }
  }

  // 3. Delete any previously existing cards from backend that are no longer active/present
  for (const existingCard of existingCards) {
    const cid = existingCard.applicationBankCreditCardDetailsId ?? existingCard.ApplicationBankCreditCardDetailsId ?? existingCard.id;
    if (cid && !processedCardIds.has(String(cid))) {
      try {
        await fetch(`${baseUrl}/ApplicationBankCreditCardDetails/${cid}`, {
          method: 'DELETE',
        });
      } catch (delErr) {
        console.warn(`Failed to delete removed credit card ${cid}:`, delErr);
      }
    }
  }

  return updatedCardsList;
}

export default function BankExistingLoans() {
  const navigate = useNavigate();
  const { applicationId } = useParams();
  const appId = applicationId;
  const { getApplication, ensureApplication, saveApplication, loadApplicationFromBackend } = useApplicationDraftStore();
  const [form, setForm] = useState(() => buildBankState(getApplication(appId)));
  const [errorPopup, setErrorPopup] = useState(null);
  const [viewingLoansFor, setViewingLoansFor] = useState(null);
  const [isLoadingActiveLoans, setIsLoadingActiveLoans] = useState(false);
  const [isSavingLoans, setIsSavingLoans] = useState(false);
  const [activeLoansError, setActiveLoansError] = useState(null);
  const [transientLoans, setTransientLoans] = useState({});
  const [viewingCardsFor, setViewingCardsFor] = useState(null);
  const [isLoadingCards, setIsLoadingCards] = useState(false);
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
          const initialBankState = buildBankState(hydratedApp);
          const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';

          // Fetch all active loans from backend for hydration
          let allActiveLoans = [];
          try {
            const loanRes = await fetch(`${baseUrl}/ApplicationBankActiveLoanDetails`);
            if (loanRes.ok) {
              const data = await loanRes.json();
              allActiveLoans = Array.isArray(data) ? data : (data?.value ?? data?.data ?? []);
            }
          } catch (loanErr) {
            console.warn('Failed to fetch ApplicationBankActiveLoanDetails on load:', loanErr);
          }

          const fetchBankFullDetails = async (bank) => {
            const bankId = bank?.applicationBankExistingLoanDetailsId;
            if (!bankId) return bank;

            let updatedBank = { ...bank };

            // 1. Credit Cards Hydration
            try {
              const res = await fetch(`${baseUrl}/ApplicationBankCreditCardDetails/by-bank/${bankId}`);
              if (res.ok) {
                const data = await res.json();
                const list = Array.isArray(data) ? data : (data?.value ?? data?.data ?? []);
                const mapped = list.map((item) => ({
                  applicationBankCreditCardDetailsId: item.applicationBankCreditCardDetailsId ?? item.ApplicationBankCreditCardDetailsId ?? item.id ?? null,
                  applicationBankExistingLoanDetailsId: bankId,
                  cardName: item.cardName ?? item.CardName ?? '',
                  cardNumber: item.cardNumber ?? item.CardNumber ?? '',
                  status: item.status ?? item.Status ?? 'Active',
                }));
                updatedBank = {
                  ...updatedBank,
                  noOfActiveCreditCards: mapped.length > 0 ? String(mapped.length) : (bank.noOfActiveCreditCards || ''),
                  activeCreditCardsDetails: mapped,
                };
              }
            } catch (e) {
              console.warn(`Failed to fetch credit cards for bank ${bankId}:`, e);
            }

            // 2. Active Loans Hydration
            const matchedLoans = allActiveLoans.filter((item) => {
              const itemBankId =
                item.applicationBankExistingLoanDetailsId ??
                item.ApplicationBankExistingLoanDetailsId ??
                item.applicationBankDetailsId ??
                item.ApplicationBankDetailsId;
              return itemBankId && Number(itemBankId) === Number(bankId);
            });

            if (matchedLoans.length > 0) {
              const mappedLoans = matchedLoans.map((item) => ({
                applicationBankActiveLoanDetailsId:
                  item.applicationBankActiveLoanDetailsId ??
                  item.ApplicationBankActiveLoanDetailsId ??
                  item.id ??
                  null,
                applicationBankExistingLoanDetailsId: Number(bankId),
                loanType: item.loanType ?? item.LoanType ?? '',
                totalLoanAmount:
                  item.totalLoanAmount !== undefined && item.totalLoanAmount !== null
                    ? String(item.totalLoanAmount)
                    : (item.TotalLoanAmount !== undefined && item.TotalLoanAmount !== null
                    ? String(item.TotalLoanAmount)
                    : ''),
                totalOutstanding:
                  item.totalOutstanding !== undefined && item.totalOutstanding !== null
                    ? String(item.totalOutstanding)
                    : (item.TotalOutstanding !== undefined && item.TotalOutstanding !== null
                    ? String(item.TotalOutstanding)
                    : ''),
                emiAmount:
                  item.emiAmount !== undefined && item.emiAmount !== null
                    ? String(item.emiAmount)
                    : (item.EmiAmount !== undefined && item.EmiAmount !== null
                    ? String(item.EmiAmount)
                    : ''),
                status: item.status ?? item.Status ?? 'Active',
              }));

              updatedBank = {
                ...updatedBank,
                noOfActiveLoans: String(mappedLoans.length),
                activeLoansDetails: mappedLoans,
              };
            }

            return updatedBank;
          };

          const [applicantPrimary, applicantOther] = await Promise.all([
            fetchBankFullDetails(initialBankState.applicant.primaryBank),
            fetchBankFullDetails(initialBankState.applicant.otherBank),
          ]);

          const coApplicants = await Promise.all(
            initialBankState.coApplicants.map(async (co) => {
              const [coPrimary, coOther] = await Promise.all([
                fetchBankFullDetails(co.primaryBank),
                fetchBankFullDetails(co.otherBank),
              ]);
              return { primaryBank: coPrimary, otherBank: coOther };
            })
          );

          if (!active) return;
          const updatedForm = {
            applicant: {
              primaryBank: applicantPrimary,
              otherBank: applicantOther,
            },
            coApplicants,
          };
          setForm(updatedForm);
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

  const getTargetKey = (target) => {
    if (!target) return '';
    return target.type === 'applicant'
      ? `applicant-${target.scope}`
      : `coApplicant-${target.index}-${target.scope}`;
  };

  const getBankByTarget = (target) => {
    if (!target) return null;
    return target.type === 'applicant'
      ? form.applicant[target.scope]
      : form.coApplicants[target.index]?.[target.scope];
  };

  const handleOpenLoansModal = async (target) => {
    setViewingLoansFor(target);
    const key = getTargetKey(target);
    const bank = getBankByTarget(target);
    const count = parseInt(bank?.noOfActiveLoans, 10) || 0;

    // If already initialized in transientLoans for this session and count matches, keep existing edits
    if (transientLoans[key] && transientLoans[key].length === count) {
      return;
    }

    // If local bank state already has activeLoansDetails saved
    if (bank?.activeLoansDetails && bank.activeLoansDetails.length > 0) {
      const existing = bank.activeLoansDetails;
      const loansArray = Array.from({ length: count }, (_, i) => existing[i] ? { ...existing[i] } : {
        loanType: '',
        totalLoanAmount: '',
        totalOutstanding: '',
        emiAmount: '',
        status: 'Active',
      });
      setTransientLoans((prev) => ({ ...prev, [key]: loansArray }));
      return;
    }

    const currentApp = getApplication(appId);
    const appDataBankState = target.type === 'applicant'
      ? currentApp?.bankExistingLoans?.applicant?.[target.scope] || currentApp?.sections?.bankExistingLoans?.applicant?.[target.scope]
      : currentApp?.bankExistingLoans?.coApplicants?.[target.index]?.[target.scope] || currentApp?.sections?.bankExistingLoans?.coApplicants?.[target.index]?.[target.scope];

    const bankId =
      bank?.applicationBankExistingLoanDetailsId ||
      bank?.ApplicationBankExistingLoanDetailsId ||
      appDataBankState?.applicationBankExistingLoanDetailsId ||
      appDataBankState?.ApplicationBankExistingLoanDetailsId ||
      bank?.applicationBankDetailsId ||
      bank?.ApplicationBankDetailsId;

    // For a NEW application (no existing bank ID in backend), do NOT call backend API
    if (!bankId) {
      const loansArray = Array.from({ length: count }, () => ({
        loanType: '',
        totalLoanAmount: '',
        totalOutstanding: '',
        emiAmount: '',
        status: 'Active',
      }));
      setTransientLoans((prev) => ({ ...prev, [key]: loansArray }));
      return;
    }

    // Existing bank in edit mode: fetch active loan records from API
    setIsLoadingActiveLoans(true);
    setActiveLoansError(null);
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';

    try {
      const res = await fetch(`${baseUrl}/ApplicationBankActiveLoanDetails`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data?.value ?? data?.data ?? data?.result ?? []);
        
        const matched = list.filter((item) => {
          const itemBankId =
            item.applicationBankExistingLoanDetailsId ??
            item.ApplicationBankExistingLoanDetailsId ??
            item.applicationBankDetailsId ??
            item.ApplicationBankDetailsId;
          return itemBankId && String(itemBankId) === String(bankId);
        });

        const mappedLoans = matched.map((item) => ({
          applicationBankActiveLoanDetailsId: item.applicationBankActiveLoanDetailsId ?? item.ApplicationBankActiveLoanDetailsId ?? null,
          applicationBankExistingLoanDetailsId: Number(bankId),
          loanType: item.loanType ?? item.LoanType ?? '',
          totalLoanAmount: item.totalLoanAmount !== undefined && item.totalLoanAmount !== null ? String(item.totalLoanAmount) : (item.TotalLoanAmount !== undefined && item.TotalLoanAmount !== null ? String(item.TotalLoanAmount) : ''),
          totalOutstanding: item.totalOutstanding !== undefined && item.totalOutstanding !== null ? String(item.totalOutstanding) : (item.TotalOutstanding !== undefined && item.TotalOutstanding !== null ? String(item.TotalOutstanding) : ''),
          emiAmount: item.emiAmount !== undefined && item.emiAmount !== null ? String(item.emiAmount) : (item.EmiAmount !== undefined && item.EmiAmount !== null ? String(item.EmiAmount) : ''),
          status: item.status ?? item.Status ?? 'Active',
        }));

        const loansArray = Array.from({ length: count }, (_, i) => mappedLoans[i] || {
          loanType: '',
          totalLoanAmount: '',
          totalOutstanding: '',
          emiAmount: '',
          status: 'Active',
        });

        setTransientLoans((prev) => ({ ...prev, [key]: loansArray }));
      } else {
        console.warn('Failed to fetch ApplicationBankActiveLoanDetails:', res.status);
        const loansArray = Array.from({ length: count }, () => ({
          loanType: '',
          totalLoanAmount: '',
          totalOutstanding: '',
          emiAmount: '',
          status: 'Active',
        }));
        setTransientLoans((prev) => ({ ...prev, [key]: loansArray }));
      }
    } catch (err) {
      console.error('Error fetching active loans from server:', err);
      const loansArray = Array.from({ length: count }, () => ({
        loanType: '',
        totalLoanAmount: '',
        totalOutstanding: '',
        emiAmount: '',
        status: 'Active',
      }));
      setTransientLoans((prev) => ({ ...prev, [key]: loansArray }));
    } finally {
      setIsLoadingActiveLoans(false);
    }
  };

  const updateLoanDetail = (loanIndex, field, value) => {
    if (!viewingLoansFor) return;
    const key = getTargetKey(viewingLoansFor);
    setTransientLoans((prev) => {
      const bank = getBankByTarget(viewingLoansFor);
      const count = parseInt(bank?.noOfActiveLoans, 10) || 0;
      const currentList = prev[key] || bank?.activeLoansDetails || [];
      const loans = Array.from({ length: count }, (_, i) => ({
        loanType: '',
        totalLoanAmount: '',
        totalOutstanding: '',
        emiAmount: '',
        status: 'Active',
        ...(currentList[i] || {}),
      }));
      loans[loanIndex] = { ...loans[loanIndex], [field]: value };
      return { ...prev, [key]: loans };
    });
  };

  const saveLoanDetails = async () => {
    if (!viewingLoansFor) return;
    const target = viewingLoansFor;
    const key = getTargetKey(target);
    const bank = getBankByTarget(target);
    const count = parseInt(bank?.noOfActiveLoans, 10) || 0;
    const currentList = transientLoans[key] || bank?.activeLoansDetails || [];
    const finalLoans = Array.from({ length: count }, (_, i) => ({
      loanType: '',
      totalLoanAmount: '',
      totalOutstanding: '',
      emiAmount: '',
      status: 'Active',
      applicationBankExistingLoanDetailsId: bank?.applicationBankExistingLoanDetailsId || null,
      ...(currentList[i] || {}),
    }));

    // Validate required fields: If count > 0, make sure every configured loan has a Loan Type
    for (let i = 0; i < count; i++) {
      const loan = finalLoans[i];
      if (!loan.loanType?.trim()) {
        setErrorPopup({
          title: 'Validation Error',
          message: `Please enter the Loan Type for Loan #${i + 1}.`,
          variant: 'validation',
        });
        return;
      }
    }

    const bankId =
      bank?.applicationBankExistingLoanDetailsId ||
      bank?.ApplicationBankExistingLoanDetailsId;

    if (bankId) {
      setIsSavingLoans(true);
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';
      const currentUser = JSON.parse(localStorage.getItem('sivels_currentUser') || '{}');
      const currentUserId = currentUser?.rmId || currentUser?.userId || currentUser?.id || 1;

      try {
        const synced = await syncActiveLoansForBank(bankId, finalLoans, count, baseUrl, currentUserId);
        const resultLoans = synced.length > 0 ? synced : finalLoans;
        if (target.type === 'applicant') {
          updateApplicantBank(target.scope, 'activeLoansDetails', resultLoans);
        } else {
          updateCoApplicantBank(target.index, target.scope, 'activeLoansDetails', resultLoans);
        }
        setTransientLoans((prev) => ({ ...prev, [key]: resultLoans }));
        setViewingLoansFor(null);
      } catch (e) {
        console.error('Failed to save active loans to server:', e);
        setErrorPopup({
          title: 'Could not save Active Loans',
          message: e.message || 'Failed to save active loan details to server. Please try again.',
          variant: 'error',
        });
      } finally {
        setIsSavingLoans(false);
      }
    } else {
      if (target.type === 'applicant') {
        updateApplicantBank(target.scope, 'activeLoansDetails', finalLoans);
      } else {
        updateCoApplicantBank(target.index, target.scope, 'activeLoansDetails', finalLoans);
      }
      setViewingLoansFor(null);
    }
  };

  const handleOpenCardsModal = async (target) => {
    setViewingCardsFor(target);
    const key = getTargetKey(target);
    const bank = getBankByTarget(target);
    const count = parseInt(bank?.noOfActiveCreditCards, 10) || 0;
    const bankId =
      bank?.applicationBankExistingLoanDetailsId ||
      bank?.ApplicationBankExistingLoanDetailsId ||
      bank?.applicationBankDetailsId ||
      bank?.ApplicationBankDetailsId;

    if (!bankId) {
      const existing = transientCards[key] || bank?.activeCreditCardsDetails || [];
      const cardsArray = Array.from({ length: count }, (_, i) => existing[i] || {
        cardName: '',
        cardNumber: '',
        status: 'Active',
        applicationBankExistingLoanDetailsId: null,
      });
      setTransientCards((prev) => ({ ...prev, [key]: cardsArray }));
      return;
    }

    setIsLoadingCards(true);
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';

    try {
      const res = await fetch(`${baseUrl}/ApplicationBankCreditCardDetails/by-bank/${bankId}`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data?.value ?? data?.data ?? []);
        const mappedCards = list.map((item) => ({
          applicationBankCreditCardDetailsId: item.applicationBankCreditCardDetailsId ?? item.ApplicationBankCreditCardDetailsId ?? item.id ?? item.Id ?? null,
          applicationBankExistingLoanDetailsId: bankId,
          cardName: item.cardName ?? item.CardName ?? '',
          cardNumber: item.cardNumber ?? item.CardNumber ?? '',
          status: item.status ?? item.Status ?? 'Active',
        }));

        const cardsArray = Array.from({ length: count }, (_, i) => mappedCards[i] || {
          cardName: '',
          cardNumber: '',
          status: 'Active',
          applicationBankExistingLoanDetailsId: bankId,
        });

        setTransientCards((prev) => ({ ...prev, [key]: cardsArray }));
      } else {
        const existing = transientCards[key] || bank?.activeCreditCardsDetails || [];
        const cardsArray = Array.from({ length: count }, (_, i) => existing[i] || {
          cardName: '',
          cardNumber: '',
          status: 'Active',
          applicationBankExistingLoanDetailsId: bankId,
        });
        setTransientCards((prev) => ({ ...prev, [key]: cardsArray }));
      }
    } catch (err) {
      console.error('Error fetching credit cards from server:', err);
      const existing = transientCards[key] || bank?.activeCreditCardsDetails || [];
      const cardsArray = Array.from({ length: count }, (_, i) => existing[i] || {
        cardName: '',
        cardNumber: '',
        status: 'Active',
        applicationBankExistingLoanDetailsId: bankId,
      });
      setTransientCards((prev) => ({ ...prev, [key]: cardsArray }));
    } finally {
      setIsLoadingCards(false);
    }
  };

  const updateCardDetail = (cardIndex, field, value) => {
    if (!viewingCardsFor) return;
    const key = getTargetKey(viewingCardsFor);
    setTransientCards((prev) => {
      const bank = getBankByTarget(viewingCardsFor);
      const count = parseInt(bank?.noOfActiveCreditCards, 10) || 0;
      const currentList = prev[key] || bank?.activeCreditCardsDetails || [];
      const cards = Array.from({ length: count }, (_, i) => ({
        cardName: '',
        cardNumber: '',
        status: 'Active',
        applicationBankExistingLoanDetailsId: bank?.applicationBankExistingLoanDetailsId || null,
        ...(currentList[i] || {}),
      }));
      cards[cardIndex] = { ...cards[cardIndex], [field]: value };
      return { ...prev, [key]: cards };
    });
  };

  const saveCardDetails = async () => {
    if (!viewingCardsFor) return;
    const target = viewingCardsFor;
    const key = getTargetKey(target);
    const bank = getBankByTarget(target);
    const count = parseInt(bank?.noOfActiveCreditCards, 10) || 0;
    const cards = transientCards[key] || bank?.activeCreditCardsDetails || [];
    const finalCards = Array.from({ length: count }, (_, i) => ({
      cardName: '',
      cardNumber: '',
      status: 'Active',
      applicationBankExistingLoanDetailsId: bank?.applicationBankExistingLoanDetailsId || null,
      ...(cards[i] || {}),
    }));

    if (target.type === 'applicant') {
      updateApplicantBank(target.scope, 'activeCreditCardsDetails', finalCards);
    } else {
      updateCoApplicantBank(target.index, target.scope, 'activeCreditCardsDetails', finalCards);
    }
    setViewingCardsFor(null);

    const bankId =
      bank?.applicationBankExistingLoanDetailsId ||
      bank?.ApplicationBankExistingLoanDetailsId ||
      bank?.applicationBankDetailsId ||
      bank?.ApplicationBankDetailsId;

    if (bankId) {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';
      const currentUser = JSON.parse(localStorage.getItem('sivels_currentUser') || '{}');
      const currentUserId = currentUser?.rmId || currentUser?.userId || currentUser?.id || 1;
      try {
        const synced = await syncCreditCardsForBank(bankId, finalCards, count, baseUrl, currentUserId);
        if (synced && synced.length > 0) {
          if (target.type === 'applicant') {
            updateApplicantBank(target.scope, 'activeCreditCardsDetails', synced);
          } else {
            updateCoApplicantBank(target.index, target.scope, 'activeCreditCardsDetails', synced);
          }
          setTransientCards((prev) => ({ ...prev, [key]: synced }));
        }
      } catch (e) {
        console.warn('Background sync of credit cards failed:', e);
      }
    }
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
          { data: person.banks.primaryBank, type: 'primary', scope: 'primaryBank' },
          { data: person.banks.otherBank, type: 'other', scope: 'otherBank' }
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
          
          const savedId = savedData?.applicationBankExistingLoanDetailsId || savedData?.ApplicationBankExistingLoanDetailsId || bank.data.applicationBankExistingLoanDetailsId;
          if (savedId) {
            bank.data.applicationBankExistingLoanDetailsId = savedId;
          }

          // Save Active Loan Details if any
          const key = person.isPrimary
            ? `applicant-${bank.scope}`
            : `coApplicant-${person.index}-${bank.scope}`;
          const loansToSave = transientLoans[key] || bank.data.activeLoansDetails || [];
          const loansCount = Number(bank.data.noOfActiveLoans) || 0;

          if (savedId) {
            try {
              const currentUser = JSON.parse(localStorage.getItem('sivels_currentUser') || '{}');
              const currentUserId = currentUser?.rmId || currentUser?.userId || currentUser?.id || 1;
              const syncedLoans = await syncActiveLoansForBank(savedId, loansToSave, loansCount, baseUrl, currentUserId);
              if (syncedLoans && syncedLoans.length > 0) {
                bank.data.activeLoansDetails = syncedLoans;
              }
            } catch (loanErr) {
              console.warn('Failed to save active loan items:', loanErr);
            }
          }

          // Save Credit Card Details if any
          const cardsKey = person.isPrimary
            ? `applicant-${bank.scope}`
            : `coApplicant-${person.index}-${bank.scope}`;
          const cardsToSave = transientCards[cardsKey] || bank.data.activeCreditCardsDetails || [];
          const cardsCount = Number(bank.data.noOfActiveCreditCards) || 0;

          if (savedId) {
            try {
              const currentUser = JSON.parse(localStorage.getItem('sivels_currentUser') || '{}');
              const currentUserId = currentUser?.rmId || currentUser?.userId || currentUser?.id || 1;
              const syncedCards = await syncCreditCardsForBank(savedId, cardsToSave, cardsCount, baseUrl, currentUserId);
              if (syncedCards && syncedCards.length > 0) {
                bank.data.activeCreditCardsDetails = syncedCards;
              }
            } catch (cardErr) {
              console.warn('Failed to save credit card items:', cardErr);
            }
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
          onViewCreditCards={() => handleOpenCardsModal({ type: 'applicant', scope: 'primaryBank' })}
          bankOptions={bankOptions}
          branchOptions={branchOptions}
          isLoadingMasters={isLoadingMasters}
        />
        <BankCard
          title="Other Bank"
          bank={form.applicant.otherBank}
          onChange={(field, value) => updateApplicantBank('otherBank', field, value)}
          onViewLoans={() => handleOpenLoansModal({ type: 'applicant', scope: 'otherBank' })}
          onViewCreditCards={() => handleOpenCardsModal({ type: 'applicant', scope: 'otherBank' })}
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
              onViewCreditCards={() => handleOpenCardsModal({ type: 'coApplicant', index, scope: 'primaryBank' })}
              bankOptions={bankOptions}
              branchOptions={branchOptions}
              isLoadingMasters={isLoadingMasters}
            />
            <BankCard
              title="Other Bank"
              bank={coApp.otherBank}
              onChange={(field, value) => updateCoApplicantBank(index, 'otherBank', field, value)}
              onViewLoans={() => handleOpenLoansModal({ type: 'coApplicant', index, scope: 'otherBank' })}
              onViewCreditCards={() => handleOpenCardsModal({ type: 'coApplicant', index, scope: 'otherBank' })}
              bankOptions={bankOptions}
              branchOptions={branchOptions}
              isLoadingMasters={isLoadingMasters}
            />
          </div>
        </div>
      ))}

      <Modal show={viewingCardsFor !== null} onHide={() => setViewingCardsFor(null)} title={`${viewingCardsFor?.scope === 'primaryBank' ? 'Primary Bank' : 'Other Bank'} - Active Credit Card Details`} size="lg">
        {isLoadingCards ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: '12px', color: '#64748b' }}>
            <RefreshCw className="master-spin" size={24} style={{ color: '#0284c7' }} />
            <span style={{ fontSize: '13px', fontWeight: 500 }}>Fetching credit card details from server...</span>
          </div>
        ) : (
          viewingCardsFor && (() => {
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
                  <input className="form-input compact-input" placeholder="Card Number" value={card.cardNumber || ''} onChange={(e) => updateCardDetail(i, 'cardNumber', e.target.value)} />
                </div>;
              })}
            </div>;
          })()
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #edf2f7' }}><Button variant="primary" onClick={saveCardDetails}>Done</Button></div>
      </Modal>

      <Modal 
        show={viewingLoansFor !== null} 
        onHide={() => setViewingLoansFor(null)} 
        title={`${viewingLoansFor?.type === 'coApplicant' ? `Co-Applicant ${(viewingLoansFor?.index || 0) + 1}` : 'Applicant'} - ${viewingLoansFor?.scope === 'primaryBank' ? 'Primary Bank' : 'Other Bank'} Active Loan Details`} 
        size="lg"
      >
        {isLoadingActiveLoans ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: '12px', color: '#64748b' }}>
            <RefreshCw className="master-spin" size={24} style={{ color: '#0284c7' }} />
            <span style={{ fontSize: '13px', fontWeight: 500 }}>Fetching active loan details from server...</span>
          </div>
        ) : (
          (() => {
            const bank = viewingLoansFor ? getBankByTarget(viewingLoansFor) : null;
            const count = parseInt(bank?.noOfActiveLoans, 10) || 0;
            const key = viewingLoansFor ? getTargetKey(viewingLoansFor) : '';
            const loans = transientLoans[key] || bank?.activeLoansDetails || [];

            if (count === 0) {
              return (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                  <Files size={32} style={{ margin: '0 auto 8px', color: '#94a3b8' }} />
                  <div style={{ fontWeight: 600, color: '#334155', fontSize: '14px', marginBottom: '4px' }}>No Active Loans</div>
                  <div style={{ fontSize: '12px', maxWidth: '400px', margin: '0 auto' }}>
                    Enter the number of active loans in the form field to configure loan details.
                  </div>
                </div>
              );
            }

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '65vh', overflowY: 'auto', paddingRight: '4px' }}>
                {Array.from({ length: count }).map((_, i) => {
                  const loan = loans[i] || { loanType: '', totalLoanAmount: '', totalOutstanding: '', emiAmount: '', status: 'Active' };
                  return (
                    <div 
                      key={i} 
                      style={{ 
                        padding: '16px 20px', 
                        borderRadius: '8px', 
                        border: '1px solid #e2e8f0', 
                        background: '#f8fafc', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '14px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
                          Loan #{i + 1}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                        <div className="aw-field">
                          <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>
                            Loan Type
                          </label>
                          <input 
                            type="text" 
                            className="form-input compact-input" 
                            placeholder="e.g. Home Loan, Personal Loan" 
                            value={loan.loanType || ''} 
                            onChange={(e) => updateLoanDetail(i, 'loanType', e.target.value)} 
                          />
                        </div>

                        <div className="aw-field">
                          <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>
                            Total Loan Amount (₹)
                          </label>
                          <input 
                            type="text" 
                            inputMode="numeric" 
                            className="form-input compact-input" 
                            placeholder="₹ Total Amount" 
                            value={loan.totalLoanAmount || ''} 
                            onChange={(e) => updateLoanDetail(i, 'totalLoanAmount', e.target.value.replace(/\D/g, ''))} 
                          />
                        </div>

                        <div className="aw-field">
                          <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>
                            Total Outstanding (₹)
                          </label>
                          <input 
                            type="text" 
                            inputMode="numeric" 
                            className="form-input compact-input" 
                            placeholder="₹ Outstanding" 
                            value={loan.totalOutstanding || ''} 
                            onChange={(e) => updateLoanDetail(i, 'totalOutstanding', e.target.value.replace(/\D/g, ''))} 
                          />
                        </div>

                        <div className="aw-field">
                          <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>
                            EMI Amount (₹)
                          </label>
                          <input 
                            type="text" 
                            inputMode="numeric" 
                            className="form-input compact-input" 
                            placeholder="₹ EMI" 
                            value={loan.emiAmount || ''} 
                            onChange={(e) => updateLoanDetail(i, 'emiAmount', e.target.value.replace(/\D/g, ''))} 
                          />
                        </div>

                        <div className="aw-field">
                          <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>
                            Status
                          </label>
                          <Select 
                            value={loan.status || 'Active'} 
                            onChange={(val) => updateLoanDetail(i, 'status', val)} 
                            placeholder="Select Status" 
                            options={[
                              { value: 'Active', label: 'Active' },
                              { value: 'Closed', label: 'Closed' }
                            ]} 
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #edf2f7' }}>
          <Button variant="secondary" onClick={() => setViewingLoansFor(null)} disabled={isSavingLoans}>
            Cancel
          </Button>
          <Button variant="primary" onClick={saveLoanDetails} disabled={isSavingLoans}>
            {isSavingLoans ? 'Saving...' : 'Save Details'}
          </Button>
        </div>
      </Modal>
    </WizardSectionLayout>
    </>
  );
}
