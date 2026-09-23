import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Building2, MapPin, Hash, List, CreditCard, Files, AlertCircle, RefreshCw, Trash2, Plus } from 'lucide-react';
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
import { formatIndianAmount, getRawAmount, parseAmountToNumber } from '../../../../../Core/src/utils/amountHelper';

const ACCOUNT_TYPES = ['Savings', 'Current'];

function hasMeaningfulBankData(bank) {
  if (!bank) return false;
  const hasBankName = Boolean(bank.bankName && String(bank.bankName).trim() !== '');
  const hasBranch = Boolean(bank.branch && String(bank.branch).trim() !== '');
  const hasAccount = Boolean(String(bank.accountNumber || '').trim());
  return hasBankName || hasBranch || hasAccount;
}

function hasMeaningfulOtherBankData(bank) {
  if (!bank) return false;
  const hasBankName = Boolean(bank.bankName && String(bank.bankName).trim() !== '');
  const hasBranch = Boolean(bank.branch && String(bank.branch).trim() !== '');
  const hasAccount = Boolean(String(bank.accountNumber || '').trim());
  const hasLoans = Boolean(bank.noOfActiveLoans !== '' && bank.noOfActiveLoans !== null && Number(bank.noOfActiveLoans) > 0);
  const hasCards = Boolean(bank.noOfActiveCreditCards !== '' && bank.noOfActiveCreditCards !== null && Number(bank.noOfActiveCreditCards) > 0);
  return hasBankName || hasBranch || hasAccount || hasLoans || hasCards;
}

function createBankRecord(source = {}, isPrimary = false) {
  return {
    applicationBankExistingLoanDetailsId:
      source.applicationBankExistingLoanDetailsId ||
      source.ApplicationBankExistingLoanDetailsId ||
      source.applicationBankDetailsId ||
      source.ApplicationBankDetailsId ||
      null,
    employmentIncomeDetailsId:
      source.applicationEmploymentIncomeDetailsId ||
      source.ApplicationEmploymentIncomeDetailsId ||
      source.employmentIncomeDetailsId ||
      source.EmploymentIncomeDetailsId ||
      null,
    bankName: source.bankName || source.bankId || '',
    bankId: source.bankId || source.bankName || '',
    branch: source.branch || source.bankBranchId || '',
    bankBranchId: source.bankBranchId || source.branch || '',
    ifscCode: source.ifscCode || '',
    accountType: source.accountType || 'Savings',
    accountNumber: source.accountNumber || '',
    accountHolderName: source.accountHolderName || '',
    noOfActiveLoans: source.noOfActiveLoans !== undefined && source.noOfActiveLoans !== null ? String(source.noOfActiveLoans) : '',
    noOfActiveCreditCards: source.noOfActiveCreditCards !== undefined && source.noOfActiveCreditCards !== null ? String(source.noOfActiveCreditCards) : '',
    activeLoansDetails: Array.isArray(source.activeLoansDetails) ? source.activeLoansDetails : [],
    activeCreditCardsDetails: Array.isArray(source.activeCreditCardsDetails) ? source.activeCreditCardsDetails : [],
    isPrimaryBank: isPrimary,
  };
}

function buildBankState(appData) {
  const saved = getSectionState(appData, 'bankExistingLoans', {});
  const count = getApplicantCount(appData);
  const savedCoApplicants = Array.isArray(saved.coApplicants) ? saved.coApplicants : [];

  const extractBanks = (personData = {}) => {
    if (Array.isArray(personData.banks) && personData.banks.length > 0) {
      return personData.banks.map((b, idx) => createBankRecord(b, idx === 0));
    }
    const primary = createBankRecord(personData.primaryBank || personData, true);
    const banks = [primary];
    if (personData.otherBank && (hasMeaningfulOtherBankData(personData.otherBank) || personData.otherBank.applicationBankExistingLoanDetailsId)) {
      banks.push(createBankRecord(personData.otherBank, false));
    }
    return banks;
  };

  return {
    applicant: {
      banks: extractBanks(saved.applicant || saved),
    },
    coApplicants: Array.from({ length: Math.max(0, count) }, (_, index) => ({
      banks: extractBanks(savedCoApplicants[index] || {}),
    })),
  };
}

function validateBankRow(bank = {}, isPrimary = false) {
  const errors = {};

  if (!isPrimary) {
    if (!bank.bankName || String(bank.bankName).trim() === '') {
      errors.bankName = 'Bank name is required';
    }
    if (!bank.branch || String(bank.branch).trim() === '') {
      errors.branch = 'Branch is required';
    }
    if (!String(bank.accountNumber || '').trim()) {
      errors.accountNumber = 'Account number is required';
    }
    return errors;
  }

  // Primary bank validations
  if (!bank.bankName || String(bank.bankName).trim() === '') {
    errors.bankName = 'Bank name is required';
  }

  if (!bank.branch || String(bank.branch).trim() === '') {
    errors.branch = 'Branch is required';
  }

  if (!String(bank.accountNumber || '').trim()) {
    errors.accountNumber = 'Account number is required';
  }

  if (bank.noOfActiveLoans === '' || bank.noOfActiveLoans === null || bank.noOfActiveLoans === undefined || isNaN(Number(bank.noOfActiveLoans)) || Number(bank.noOfActiveLoans) < 0) {
    errors.noOfActiveLoans = 'Number of active loans is required';
  }

  if (bank.noOfActiveCreditCards === '' || bank.noOfActiveCreditCards === null || bank.noOfActiveCreditCards === undefined || isNaN(Number(bank.noOfActiveCreditCards)) || Number(bank.noOfActiveCreditCards) < 0) {
    errors.noOfActiveCreditCards = 'Number of active credit cards is required';
  }

  return errors;
}

function PersonBankingSection({
  title,
  personType,
  personIndex = null,
  banks = [],
  onUpdateBank,
  onAddBank,
  onRemoveBank,
  onViewLoans,
  onViewCreditCards,
  errors = {},
  bankOptions = [],
  branchOptions = [],
  isLoadingMasters = false,
}) {
  const primaryBank = banks[0] || {};
  const activeLoansCount = parseInt(primaryBank.noOfActiveLoans, 10) || 0;
  const activeCardsCount = parseInt(primaryBank.noOfActiveCreditCards, 10) || 0;

  return (
    <div style={{ marginBottom: '20px' }}>
      <h3 style={{ fontSize: '14.5px', fontWeight: 600, color: '#0f172a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Building2 size={16} style={{ color: '#0284c7' }} />
        {title}
      </h3>

      {/* 1. BANK ACCOUNTS SECTION */}
      <div className="aw-mini-card" style={{ marginBottom: '14px' }}>
        <div className="aw-mini-card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
          <div>
            <div className="aw-mini-card__title" style={{ fontSize: '13.5px', fontWeight: 600 }}>Bank Accounts</div>
            <div className="aw-mini-card__subtitle" style={{ fontSize: '11.5px', color: '#64748b', marginTop: '1px' }}>Capture primary bank and all additional bank accounts</div>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onAddBank}
            icon={<Plus size={13} />}
            style={{ padding: '4px 10px', fontSize: '12px', height: '30px' }}
          >
            Add Bank
          </Button>
        </div>
        <div className="aw-mini-card__body" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px 16px' }}>
          {banks.map((bank, bIdx) => {
            const isPrimary = bIdx === 0;
            const bankErrPrefix = personType === 'applicant'
              ? `applicant.banks.${bIdx}.`
              : `coApplicants.${personIndex}.banks.${bIdx}.`;

            const bErrors = Object.fromEntries(
              Object.entries(errors)
                .filter(([k]) => k.startsWith(bankErrPrefix))
                .map(([k, v]) => [k.replace(bankErrPrefix, ''), v])
            );

            return (
              <div 
                key={`bank-row-${bIdx}`}
                style={{ 
                  padding: '10px 14px', 
                  borderRadius: '8px', 
                  border: isPrimary ? '1px solid #bae6fd' : '1px solid #e2e8f0', 
                  background: isPrimary ? '#f0f9ff' : '#f8fafc',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: isPrimary ? '#0369a1' : '#334155' }}>
                    {isPrimary ? 'Bank 1 (Primary Bank)' : `Bank ${bIdx + 1}`}
                  </span>
                  {!isPrimary && (
                    <button
                      type="button"
                      onClick={() => onRemoveBank(bIdx)}
                      style={{ 
                        background: 'transparent', 
                        border: 'none', 
                        color: '#ef4444', 
                        cursor: 'pointer', 
                        fontSize: '11.5px', 
                        fontWeight: 600, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '3px',
                        padding: '0',
                        lineHeight: 1
                      }}
                      title="Remove Bank"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', alignItems: 'start' }}>
                  {/* Bank Name */}
                  <div className="aw-field" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '11.5px', fontWeight: 600, marginBottom: '4px' }}>Bank Name</label>
                    <div className="aw-input-wrapper">
                      <Select
                        error={!!bErrors.bankName}
                        value={bank.bankName}
                        onChange={(val) => {
                          onUpdateBank(bIdx, { bankName: val, branch: '' });
                        }}
                        placeholder={isLoadingMasters ? "Loading..." : "Select Bank"}
                        options={bankOptions}
                        disabled={isLoadingMasters}
                        icon={<Building2 size={13} />}
                      />
                    </div>
                    {bErrors.bankName && <span className="aw-field-error" style={{ fontSize: '11px', marginTop: '2px' }}>{bErrors.bankName}</span>}
                  </div>

                  {/* Branch */}
                  <div className="aw-field" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '11.5px', fontWeight: 600, marginBottom: '4px' }}>Branch</label>
                    <div className="aw-input-wrapper">
                      <Select
                        error={!!bErrors.branch}
                        value={bank.branch}
                        onChange={(val) => onUpdateBank(bIdx, 'branch', val)}
                        placeholder={isLoadingMasters ? "Loading..." : "Select Branch"}
                        options={branchOptions.filter(b => !bank.bankName || b.raw.bankId === Number(bank.bankName))}
                        disabled={isLoadingMasters || !bank.bankName}
                        icon={<MapPin size={13} />}
                      />
                    </div>
                    {bErrors.branch && <span className="aw-field-error" style={{ fontSize: '11px', marginTop: '2px' }}>{bErrors.branch}</span>}
                  </div>

                  {/* Account Number */}
                  <div className="aw-field" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '11.5px', fontWeight: 600, marginBottom: '4px' }}>Account Number</label>
                    <div className="aw-input-wrapper">
                      <CreditCard className="aw-input-icon" size={13} />
                      <input
                        className={`form-input aw-input aw-input--with-icon ${bErrors.accountNumber ? 'aw-input--invalid' : ''}`}
                        placeholder="Enter Account Number"
                        value={bank.accountNumber}
                        onChange={(e) => onUpdateBank(bIdx, 'accountNumber', e.target.value)}
                      />
                    </div>
                    {bErrors.accountNumber && <span className="aw-field-error" style={{ fontSize: '11px', marginTop: '2px' }}>{bErrors.accountNumber}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. EXISTING LOAN / CREDIT CARD SECTION (Person-Level, Tied to Primary Bank) */}
      <div className="aw-mini-card">
        <div className="aw-mini-card__header" style={{ padding: '12px 16px' }}>
          <div>
            <div className="aw-mini-card__title" style={{ fontSize: '13.5px', fontWeight: 600 }}>Existing Loan / Credit Card Details</div>
            <div className="aw-mini-card__subtitle" style={{ fontSize: '11.5px', color: '#64748b', marginTop: '1px' }}>Active loans and credit card liabilities associated with this applicant</div>
          </div>
        </div>
        <div className="aw-mini-card__body" style={{ padding: '12px 16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', alignItems: 'start' }}>
            {/* No. of Active Loans */}
            <div className="aw-field" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '11.5px', fontWeight: 600, marginBottom: '4px' }}>No. of Active Loans</label>
              <div className="aw-input-wrapper" style={{ position: 'relative' }}>
                <Files className="aw-input-icon" size={13} />
                <input
                  className={`form-input aw-input aw-input--with-icon ${
                    errors[`${personType === 'applicant' ? 'applicant.banks.0' : `coApplicants.${personIndex}.banks.0`}.noOfActiveLoans`]
                      ? 'aw-input--invalid'
                      : ''
                  }`}
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={primaryBank.noOfActiveLoans}
                  onChange={(e) => onUpdateBank(0, 'noOfActiveLoans', e.target.value)}
                  style={{ paddingRight: activeLoansCount > 0 ? '55px' : '32px' }}
                />
                {activeLoansCount > 0 && (
                  <button
                    type="button"
                    onClick={onViewLoans}
                    style={{
                      position: 'absolute',
                      right: '6px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: '#e0f2fe',
                      color: '#0369a1',
                      border: '1px solid #7dd3fc',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    View
                  </button>
                )}
              </div>
              {errors[`${personType === 'applicant' ? 'applicant.banks.0' : `coApplicants.${personIndex}.banks.0`}.noOfActiveLoans`] && (
                <span className="aw-field-error" style={{ fontSize: '11px', marginTop: '2px' }}>
                  {errors[`${personType === 'applicant' ? 'applicant.banks.0' : `coApplicants.${personIndex}.banks.0`}.noOfActiveLoans`]}
                </span>
              )}
            </div>

            {/* No. of Active Credit Cards */}
            <div className="aw-field" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '11.5px', fontWeight: 600, marginBottom: '4px' }}>No. of Active Credit Cards</label>
              <div className="aw-input-wrapper" style={{ position: 'relative' }}>
                <CreditCard className="aw-input-icon" size={13} />
                <input
                  className={`form-input aw-input aw-input--with-icon ${
                    errors[`${personType === 'applicant' ? 'applicant.banks.0' : `coApplicants.${personIndex}.banks.0`}.noOfActiveCreditCards`]
                      ? 'aw-input--invalid'
                      : ''
                  }`}
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={primaryBank.noOfActiveCreditCards}
                  onChange={(e) => onUpdateBank(0, 'noOfActiveCreditCards', e.target.value)}
                  style={{ paddingRight: activeCardsCount > 0 ? '55px' : '32px' }}
                />
                {activeCardsCount > 0 && (
                  <button
                    type="button"
                    onClick={onViewCreditCards}
                    style={{
                      position: 'absolute',
                      right: '6px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: '#e0f2fe',
                      color: '#0369a1',
                      border: '1px solid #7dd3fc',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    View
                  </button>
                )}
              </div>
              {errors[`${personType === 'applicant' ? 'applicant.banks.0' : `coApplicants.${personIndex}.banks.0`}.noOfActiveCreditCards`] && (
                <span className="aw-field-error" style={{ fontSize: '11px', marginTop: '2px' }}>
                  {errors[`${personType === 'applicant' ? 'applicant.banks.0' : `coApplicants.${personIndex}.banks.0`}.noOfActiveCreditCards`]}
                </span>
              )}
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
    const totalLoanAmount = loan.totalLoanAmount !== '' && loan.totalLoanAmount !== null && loan.totalLoanAmount !== undefined ? parseAmountToNumber(loan.totalLoanAmount) : null;
    const totalOutstanding = loan.totalOutstanding !== '' && loan.totalOutstanding !== null && loan.totalOutstanding !== undefined ? parseAmountToNumber(loan.totalOutstanding) : null;
    const emiAmount = loan.emiAmount !== '' && loan.emiAmount !== null && loan.emiAmount !== undefined ? parseAmountToNumber(loan.emiAmount) : null;

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
  const [errors, setErrors] = useState({});
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

          const fetchBankFullDetails = async (bank, isPrimary = false) => {
            const bankId = bank?.applicationBankExistingLoanDetailsId;
            if (!bankId) return bank;

            let updatedBank = { ...bank };

            // 1. Credit Cards Hydration (only for primary or if has ID)
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
                if (mapped.length > 0 || isPrimary) {
                  updatedBank = {
                    ...updatedBank,
                    noOfActiveCreditCards: mapped.length > 0 ? String(mapped.length) : (bank.noOfActiveCreditCards || ''),
                    activeCreditCardsDetails: mapped,
                  };
                }
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

            if (matchedLoans.length > 0 || isPrimary) {
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
                noOfActiveLoans: mappedLoans.length > 0 ? String(mappedLoans.length) : (bank.noOfActiveLoans || ''),
                activeLoansDetails: mappedLoans,
              };
            }

            return updatedBank;
          };

          const applicantBanks = await Promise.all(
            initialBankState.applicant.banks.map((b, idx) => fetchBankFullDetails(b, idx === 0))
          );

          const coApplicants = await Promise.all(
            initialBankState.coApplicants.map(async (co) => {
              const coBanks = await Promise.all(
                co.banks.map((b, idx) => fetchBankFullDetails(b, idx === 0))
              );
              return { banks: coBanks };
            })
          );

          if (!active) return;
          const updatedForm = {
            applicant: {
              banks: applicantBanks,
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
    const safeForm = {
      ...nextForm,
      applicant: {
        ...nextForm.applicant,
        primaryBank: nextForm.applicant?.banks?.[0] || null,
        otherBank: nextForm.applicant?.banks?.[1] || null,
      },
      primaryBank: nextForm.applicant?.banks?.[0] || null,
      otherBank: nextForm.applicant?.banks?.[1] || null,
      coApplicants: nextForm.coApplicants.map((co) => ({
        ...co,
        primaryBank: co.banks?.[0] || null,
        otherBank: co.banks?.[1] || null,
      })),
    };
    saveApplication(appId, buildSectionUpdate(currentAppData, 'bankExistingLoans', safeForm));
  };

  const handleAddBank = (personType, coAppIndex = null) => {
    const currentEmpId = personType === 'applicant'
      ? (appData.sections?.employmentIncome?.applicant?.employmentIncomeDetailsId || appData.employmentIncome?.applicant?.employmentIncomeDetailsId || null)
      : (appData.sections?.employmentIncome?.coApplicants?.[coAppIndex]?.employmentIncomeDetailsId || appData.employmentIncome?.coApplicants?.[coAppIndex]?.employmentIncomeDetailsId || null);

    const emptyBank = {
      applicationBankExistingLoanDetailsId: null,
      employmentIncomeDetailsId: currentEmpId,
      bankName: '',
      bankId: '',
      branch: '',
      bankBranchId: '',
      ifscCode: '',
      accountType: 'Savings',
      accountNumber: '',
      accountHolderName: '',
      noOfActiveLoans: '',
      noOfActiveCreditCards: '',
      activeLoansDetails: [],
      activeCreditCardsDetails: [],
      isPrimaryBank: false,
    };

    if (personType === 'applicant') {
      const nextForm = {
        ...form,
        applicant: {
          ...form.applicant,
          banks: [...form.applicant.banks, emptyBank],
        },
      };
      persist(nextForm);
    } else {
      const nextForm = {
        ...form,
        coApplicants: form.coApplicants.map((ca, idx) =>
          idx === coAppIndex
            ? { ...ca, banks: [...ca.banks, emptyBank] }
            : ca
        ),
      };
      persist(nextForm);
    }
  };

  const handleRemoveBank = (personType, coAppIndex = null, bankIndex) => {
    if (bankIndex === 0) return; // Do not allow removal of Primary Bank

    if (personType === 'applicant') {
      const updatedBanks = form.applicant.banks.filter((_, idx) => idx !== bankIndex);
      const nextForm = {
        ...form,
        applicant: {
          ...form.applicant,
          banks: updatedBanks,
        },
      };
      persist(nextForm);
      setErrors((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => {
          if (k.startsWith(`applicant.banks.${bankIndex}.`)) delete next[k];
        });
        return next;
      });
    } else {
      const updatedBanks = form.coApplicants[coAppIndex].banks.filter((_, idx) => idx !== bankIndex);
      const nextForm = {
        ...form,
        coApplicants: form.coApplicants.map((ca, idx) =>
          idx === coAppIndex
            ? { ...ca, banks: updatedBanks }
            : ca
        ),
      };
      persist(nextForm);
      setErrors((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => {
          if (k.startsWith(`coApplicants.${coAppIndex}.banks.${bankIndex}.`)) delete next[k];
        });
        return next;
      });
    }
  };

  const updateApplicantBank = (bankIndex, fieldOrObj, value) => {
    const updates = typeof fieldOrObj === 'object' ? fieldOrObj : { [fieldOrObj]: value };
    const nextBanks = form.applicant.banks.map((b, idx) =>
      idx === bankIndex ? { ...b, ...updates } : b
    );
    const nextForm = {
      ...form,
      applicant: {
        ...form.applicant,
        banks: nextBanks,
      },
    };
    persist(nextForm);
    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(updates).forEach((f) => {
        delete next[`applicant.banks.${bankIndex}.${f}`];
      });
      return next;
    });
  };

  const updateCoApplicantBank = (coAppIndex, bankIndex, fieldOrObj, value) => {
    const updates = typeof fieldOrObj === 'object' ? fieldOrObj : { [fieldOrObj]: value };
    const nextForm = {
      ...form,
      coApplicants: form.coApplicants.map((ca, cIdx) => {
        if (cIdx !== coAppIndex) return ca;
        const nextBanks = ca.banks.map((b, bIdx) =>
          bIdx === bankIndex ? { ...b, ...updates } : b
        );
        return { ...ca, banks: nextBanks };
      }),
    };
    persist(nextForm);
    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(updates).forEach((f) => {
        delete next[`coApplicants.${coAppIndex}.banks.${bankIndex}.${f}`];
      });
      return next;
    });
  };

  const validateForm = () => {
    const nextErrors = {};

    form.applicant.banks.forEach((bank, bIdx) => {
      const isPrimary = bIdx === 0;
      const bErrs = validateBankRow(bank, isPrimary);
      Object.entries(bErrs).forEach(([field, msg]) => {
        nextErrors[`applicant.banks.${bIdx}.${field}`] = msg;
      });
    });

    form.coApplicants.forEach((co, cIdx) => {
      co.banks.forEach((bank, bIdx) => {
        const isPrimary = bIdx === 0;
        const bErrs = validateBankRow(bank, isPrimary);
        Object.entries(bErrs).forEach(([field, msg]) => {
          nextErrors[`coApplicants.${cIdx}.banks.${bIdx}.${field}`] = msg;
        });
      });
    });

    return nextErrors;
  };

  const getTargetKey = (target) => {
    if (!target) return '';
    return target.type === 'applicant'
      ? `applicant-primary`
      : `coApplicant-${target.index}-primary`;
  };

  const getBankByTarget = (target) => {
    if (!target) return null;
    return target.type === 'applicant'
      ? form.applicant.banks[0]
      : form.coApplicants[target.index]?.banks[0];
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
      ? currentApp?.bankExistingLoans?.applicant?.banks?.[0] || currentApp?.bankExistingLoans?.applicant?.primaryBank || currentApp?.sections?.bankExistingLoans?.applicant?.primaryBank
      : currentApp?.bankExistingLoans?.coApplicants?.[target.index]?.banks?.[0] || currentApp?.bankExistingLoans?.coApplicants?.[target.index]?.primaryBank || currentApp?.sections?.bankExistingLoans?.coApplicants?.[target.index]?.primaryBank;

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
          totalLoanAmount: item.totalLoanAmount !== undefined && item.totalLoanAmount !== null ? formatIndianAmount(item.totalLoanAmount) : (item.TotalLoanAmount !== undefined && item.TotalLoanAmount !== null ? formatIndianAmount(item.TotalLoanAmount) : ''),
          totalOutstanding: item.totalOutstanding !== undefined && item.totalOutstanding !== null ? formatIndianAmount(item.totalOutstanding) : (item.TotalOutstanding !== undefined && item.TotalOutstanding !== null ? formatIndianAmount(item.TotalOutstanding) : ''),
          emiAmount: item.emiAmount !== undefined && item.emiAmount !== null ? formatIndianAmount(item.emiAmount) : (item.EmiAmount !== undefined && item.EmiAmount !== null ? formatIndianAmount(item.EmiAmount) : ''),
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

  const updateLoanDetail = (loanIndex, field, rawValue) => {
    if (!viewingLoansFor) return;
    const key = getTargetKey(viewingLoansFor);
    const value = ['totalLoanAmount', 'totalOutstanding', 'emiAmount'].includes(field)
      ? formatIndianAmount(rawValue)
      : rawValue;
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
          updateApplicantBank(0, 'activeLoansDetails', resultLoans);
        } else {
          updateCoApplicantBank(target.index, 0, 'activeLoansDetails', resultLoans);
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
        updateApplicantBank(0, 'activeLoansDetails', finalLoans);
      } else {
        updateCoApplicantBank(target.index, 0, 'activeLoansDetails', finalLoans);
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
      updateApplicantBank(0, 'activeCreditCardsDetails', finalCards);
    } else {
      updateCoApplicantBank(target.index, 0, 'activeCreditCardsDetails', finalCards);
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
            updateApplicantBank(0, 'activeCreditCardsDetails', synced);
          } else {
            updateCoApplicantBank(target.index, 0, 'activeCreditCardsDetails', synced);
          }
          setTransientCards((prev) => ({ ...prev, [key]: synced }));
        }
      } catch (e) {
        console.warn('Background sync of credit cards failed:', e);
      }
    }
  };

  const handleContinue = async () => {
    const validationErrors = validateForm();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setErrorPopup({
        title: 'Validation Error',
        message: 'Please fill all required banking details before continuing.',
        variant: 'validation',
      });
      return;
    }

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';
    const allPersons = [
      { banks: form.applicant.banks, isApplicant: true, index: null },
      ...form.coApplicants.map((co, i) => ({ banks: co.banks, isApplicant: false, index: i }))
    ];

    try {
      const claimedBankRecordIds = new Set();

      for (const person of allPersons) {
        const empId = person.isApplicant
          ? appData.sections?.employmentIncome?.applicant?.employmentIncomeDetailsId || appData.employmentIncome?.applicant?.employmentIncomeDetailsId
          : appData.sections?.employmentIncome?.coApplicants?.[person.index]?.employmentIncomeDetailsId || appData.employmentIncome?.coApplicants?.[person.index]?.employmentIncomeDetailsId;

        if (!empId) {
          console.warn(`No Employment Income Details ID found for ${person.isApplicant ? 'Applicant' : `Co-Applicant ${person.index + 1}`}, skipping Bank API save`);
          continue;
        }

        for (let bIdx = 0; bIdx < person.banks.length; bIdx++) {
          const bank = person.banks[bIdx];
          const isPrimary = bIdx === 0;
          const hasData = isPrimary ? Boolean(bank.bankName) : hasMeaningfulBankData(bank);

          if (!isPrimary && !hasData) {
            const existingId = bank.applicationBankExistingLoanDetailsId;
            if (existingId) {
              try {
                const delRes = await fetch(`${baseUrl}/ApplicationBankExistingLoanDetails/${existingId}`, {
                  method: 'DELETE',
                });
                if (delRes.ok || delRes.status === 404) {
                  bank.applicationBankExistingLoanDetailsId = null;
                  bank.activeLoansDetails = [];
                  bank.activeCreditCardsDetails = [];
                }
              } catch (delErr) {
                console.warn(`Failed to delete cleared Bank row ${existingId}:`, delErr);
              }
            }
            continue;
          }

          if (!hasData) continue;

          let currentBankId = bank.applicationBankExistingLoanDetailsId ? Number(bank.applicationBankExistingLoanDetailsId) : null;

          // Prevent shared bank record ID across persons: if already claimed, clear it to force POST
          if (currentBankId && claimedBankRecordIds.has(currentBankId)) {
            currentBankId = null;
            bank.applicationBankExistingLoanDetailsId = null;
          }

          // Foreign parent ID check
          if (currentBankId && bank.employmentIncomeDetailsId && Number(bank.employmentIncomeDetailsId) !== Number(empId)) {
            currentBankId = null;
            bank.applicationBankExistingLoanDetailsId = null;
          }

          const isUpdate = Boolean(currentBankId);
          const url = isUpdate
            ? `${baseUrl}/ApplicationBankExistingLoanDetails/${currentBankId}`
            : `${baseUrl}/ApplicationBankExistingLoanDetails`;

          const payload = {
            ApplicationEmploymentIncomeDetailsId: Number(empId),
            BankId: Number(bank.bankName),
            BankBranchId: Number(bank.branch) || 0,
            AccountNumber: bank.accountNumber || '',
            NoOfActiveLoans: isPrimary ? (Number(bank.noOfActiveLoans) || 0) : 0,
            NoOfActiveCreditCards: isPrimary ? (Number(bank.noOfActiveCreditCards) || 0) : 0,
            IsPrimaryBank: isPrimary,
            CreatedBy: 1
          };

          if (isUpdate) {
            payload.ApplicationBankExistingLoanDetailsId = Number(currentBankId);
          }

          const response = await fetch(url, {
            method: isUpdate ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            throw new Error(`Failed to save ${isPrimary ? 'primary' : 'additional'} bank: ${response.statusText}`);
          }

          let savedData = null;
          if (response.status !== 204) {
            const text = await response.text();
            if (text) { try { savedData = JSON.parse(text); } catch (e) { /* ignore */ } }
          }
          
          const savedId = savedData?.applicationBankExistingLoanDetailsId || savedData?.ApplicationBankExistingLoanDetailsId || bank.applicationBankExistingLoanDetailsId;
          if (savedId) {
            bank.applicationBankExistingLoanDetailsId = Number(savedId);
            claimedBankRecordIds.add(Number(savedId));
          } else if (currentBankId) {
            claimedBankRecordIds.add(currentBankId);
          }

          // Save Active Loan & Credit Card details ONLY FOR PRIMARY BANK (banks[0])
          if (isPrimary && savedId) {
            const loansKey = person.isApplicant ? 'applicant-primary' : `coApplicant-${person.index}-primary`;
            const loansToSave = transientLoans[loansKey] || bank.activeLoansDetails || [];
            const loansCount = Number(bank.noOfActiveLoans) || 0;

            try {
              const currentUser = JSON.parse(localStorage.getItem('sivels_currentUser') || '{}');
              const currentUserId = currentUser?.rmId || currentUser?.userId || currentUser?.id || 1;
              const syncedLoans = await syncActiveLoansForBank(savedId, loansToSave, loansCount, baseUrl, currentUserId);
              if (syncedLoans && syncedLoans.length > 0) {
                bank.activeLoansDetails = syncedLoans;
              }
            } catch (loanErr) {
              console.warn('Failed to save active loan items:', loanErr);
            }

            const cardsKey = person.isApplicant ? 'applicant-primary' : `coApplicant-${person.index}-primary`;
            const cardsToSave = transientCards[cardsKey] || bank.activeCreditCardsDetails || [];
            const cardsCount = Number(bank.noOfActiveCreditCards) || 0;

            try {
              const currentUser = JSON.parse(localStorage.getItem('sivels_currentUser') || '{}');
              const currentUserId = currentUser?.rmId || currentUser?.userId || currentUser?.id || 1;
              const syncedCards = await syncCreditCardsForBank(savedId, cardsToSave, cardsCount, baseUrl, currentUserId);
              if (syncedCards && syncedCards.length > 0) {
                bank.activeCreditCardsDetails = syncedCards;
              }
            } catch (cardErr) {
              console.warn('Failed to save credit card items:', cardErr);
            }
          }
        }
      }

      const applicantBankIds = new Set(
        (form.applicant?.banks || []).map((b) => b.applicationBankExistingLoanDetailsId).filter(Boolean)
      );

      const cleanCoApplicants = form.coApplicants.map((co) => {
        const cleanBanks = (co.banks || []).map((b) => {
          const cleanB = { ...b };
          if (cleanB.applicationBankExistingLoanDetailsId && applicantBankIds.has(cleanB.applicationBankExistingLoanDetailsId)) {
            cleanB.applicationBankExistingLoanDetailsId = null;
          }
          return cleanB;
        });
        return {
          ...co,
          banks: cleanBanks,
          primaryBank: cleanBanks[0] || null,
          otherBank: cleanBanks[1] || null,
        };
      });

      const finalForm = {
        ...form,
        applicant: {
          ...form.applicant,
          banks: form.applicant.banks,
          primaryBank: form.applicant.banks[0] || null,
          otherBank: form.applicant.banks[1] || null,
        },
        primaryBank: form.applicant.banks[0] || null,
        otherBank: form.applicant.banks[1] || null,
        coApplicants: cleanCoApplicants,
      };

      saveApplication(appId, buildSectionUpdate(appData, 'bankExistingLoans', finalForm));
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
        subtitle="Capture the applicant's primary bank, additional bank accounts, and existing liability details."
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
        <PersonBankingSection
          title="Applicant Banking Details"
          personType="applicant"
          banks={form.applicant.banks}
          onUpdateBank={(bIdx, field, val) => updateApplicantBank(bIdx, field, val)}
          onAddBank={() => handleAddBank('applicant')}
          onRemoveBank={(bIdx) => handleRemoveBank('applicant', null, bIdx)}
          onViewLoans={() => handleOpenLoansModal({ type: 'applicant', bankIndex: 0 })}
          onViewCreditCards={() => handleOpenCardsModal({ type: 'applicant', bankIndex: 0 })}
          errors={errors}
          bankOptions={bankOptions}
          branchOptions={branchOptions}
          isLoadingMasters={isLoadingMasters}
        />

        {form.coApplicants.map((coApp, index) => (
          <div key={`coapp-bank-container-${index}`} style={{ borderTop: '1px solid #edf2f7', paddingTop: '16px', marginTop: '16px' }}>
            <PersonBankingSection
              title={`Co-Applicant ${index + 1} Banking Details`}
              personType="coApplicant"
              personIndex={index}
              banks={coApp.banks}
              onUpdateBank={(bIdx, field, val) => updateCoApplicantBank(index, bIdx, field, val)}
              onAddBank={() => handleAddBank('coApplicant', index)}
              onRemoveBank={(bIdx) => handleRemoveBank('coApplicant', index, bIdx)}
              onViewLoans={() => handleOpenLoansModal({ type: 'coApplicant', index, bankIndex: 0 })}
              onViewCreditCards={() => handleOpenCardsModal({ type: 'coApplicant', index, bankIndex: 0 })}
              errors={errors}
              bankOptions={bankOptions}
              branchOptions={branchOptions}
              isLoadingMasters={isLoadingMasters}
            />
          </div>
        ))}

        <Modal 
          show={viewingCardsFor !== null} 
          onHide={() => setViewingCardsFor(null)} 
          title={`${viewingCardsFor?.type === 'coApplicant' ? `Co-Applicant ${(viewingCardsFor?.index || 0) + 1}` : 'Applicant'} - Active Credit Card Details`} 
          size="lg"
        >
          {isLoadingCards ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: '12px', color: '#64748b' }}>
              <RefreshCw className="master-spin" size={24} style={{ color: '#0284c7' }} />
              <span style={{ fontSize: '13px', fontWeight: 500 }}>Fetching credit card details from server...</span>
            </div>
          ) : (
            viewingCardsFor && (() => {
              const bank = getBankByTarget(viewingCardsFor);
              const count = parseInt(bank?.noOfActiveCreditCards, 10) || 0;
              const key = getTargetKey(viewingCardsFor);
              const cards = transientCards[key] || bank?.activeCreditCardsDetails || [];

              if (count === 0) {
                return (
                  <div style={{ padding: '32px 16px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                    <CreditCard size={32} style={{ margin: '0 auto 8px', color: '#94a3b8' }} />
                    <div style={{ fontWeight: 600, color: '#334155', fontSize: '14px', marginBottom: '4px' }}>No Active Credit Cards</div>
                    <div style={{ fontSize: '12px', maxWidth: '400px', margin: '0 auto' }}>
                      Enter the number of active credit cards in the form field to configure card details.
                    </div>
                  </div>
                );
              }

              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', maxHeight: '65vh', overflowY: 'auto', paddingRight: '4px' }}>
                  {Array.from({ length: count }).map((_, i) => {
                    const card = cards[i] || {};
                    return (
                      <div key={i} style={{ padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a' }}>Credit Card {i + 1}</div>
                        <input className="form-input compact-input" placeholder="Card Name (e.g. HDFC Regalia)" value={card.cardName || ''} onChange={(e) => updateCardDetail(i, 'cardName', e.target.value)} />
                        <input className="form-input compact-input" placeholder="Card Number (Last 4 digits or Full)" value={card.cardNumber || ''} onChange={(e) => updateCardDetail(i, 'cardNumber', e.target.value)} />
                      </div>
                    );
                  })}
                </div>
              );
            })()
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #edf2f7' }}>
            <Button variant="primary" onClick={saveCardDetails}>Done</Button>
          </div>
        </Modal>

        <Modal 
          show={viewingLoansFor !== null} 
          onHide={() => setViewingLoansFor(null)} 
          title={`${viewingLoansFor?.type === 'coApplicant' ? `Co-Applicant ${(viewingLoansFor?.index || 0) + 1}` : 'Applicant'} - Active Loan Details`} 
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
                              value={formatIndianAmount(loan.totalLoanAmount || '')} 
                              onChange={(e) => updateLoanDetail(i, 'totalLoanAmount', e.target.value)} 
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
                              value={formatIndianAmount(loan.totalOutstanding || '')} 
                              onChange={(e) => updateLoanDetail(i, 'totalOutstanding', e.target.value)} 
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
                              value={formatIndianAmount(loan.emiAmount || '')} 
                              onChange={(e) => updateLoanDetail(i, 'emiAmount', e.target.value)} 
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

