/**
 * BankVerification.jsx
 * --------------------
 * Step 4: Bank Verification page.
 */

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MainLayout     from '../../layouts/MainLayout/MainLayout';
import Breadcrumb     from '../../components/Breadcrumb/Breadcrumb';
import StepProgress   from '../../components/StepProgress/StepProgress';
import CustomerSummary from '../../components/CustomerSummary/CustomerSummary';
import Button         from '../../components/Button/Button';
import iconMap        from '../../config/iconMap';
import { ROUTES }     from '../../config/routeConfig';
import {
  CURRENT_USER, BADGE_COUNTS, VERIFICATION_STEPS, CUSTOMER_SUMMARY as CS_DATA,
  BANK_DETAILS, PENNY_STEPS, STATEMENT_PREVIEW, VERIFICATION_CHECKLIST, EMI_CALCULATION, INVESTOR_DETAILS
} from './bankVerificationData';
import './BankVerification.css';

const BREADCRUMB_ITEMS = [
  { label: 'Back Office Dashboard', path: ROUTES.DASHBOARD },
  { label: 'New Applications',      path: ROUTES.NEW_APPLICATIONS },
  { label: 'Bank Verification' }
];

function BankVerification() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [showPennyModal, setShowPennyModal] = useState(false);

  const handleContinueClick = () => {
    setShowPennyModal(true);
  };

  const proceedToNextPage = () => {
    navigate(ROUTES.LOAN_DOCUMENTS.replace(':id', id || 'APP123'));
  };

  const ArrowLeftIcon  = iconMap['ArrowLeft'];
  const SaveIcon       = iconMap['Save'];
  const ArrowRightIcon = iconMap['ArrowRight'];
  const CheckCircleIcon= iconMap['CheckCircle2'];
  const DownloadIcon   = iconMap['Download'];
  const ExternalLinkIcon = iconMap['ArrowUpRight'];
  const ShieldCheckIcon= iconMap['ShieldCheck'];

  return (
    <MainLayout
      title="Bank Verification"
      user={CURRENT_USER}
      badgeCounts={BADGE_COUNTS}
      notificationCount={12}
    >
      <Breadcrumb items={BREADCRUMB_ITEMS} />
      <StepProgress steps={VERIFICATION_STEPS} activeStep={4} />

      <div className="bank-grid">
        
        {/* ========== LEFT ========== */}
        <div className="bank-col-left">
          <CustomerSummary data={CS_DATA} />
        </div>

        {/* ========== MIDDLE ========== */}
        <div className="bank-col-middle">
          
          {/* Bank Details */}
          <section className="bank-card bank-details-section">
            {/* Left Side: Bank Details */}
            <div className="bank-details-content" style={{ paddingRight: 'var(--spacing-4)', borderRight: '1px solid var(--color-border-light)' }}>
              <h3 className="bank-card-title">Bank Account Details (Provided by Customer)</h3>
              <div className="bank-details-list">
                <div className="bank-detail-row"><span className="bd-label">Account Holder Name</span><span className="bd-value font-bold">{BANK_DETAILS.accountHolder}</span></div>
                <div className="bank-detail-row"><span className="bd-label">Account Number</span><span className="bd-value font-bold">{BANK_DETAILS.accountNumber}</span></div>
                <div className="bank-detail-row"><span className="bd-label">IFSC Code</span><span className="bd-value font-bold">{BANK_DETAILS.ifsc}</span></div>
                <div className="bank-detail-row"><span className="bd-label">Bank Name</span><span className="bd-value font-bold">{BANK_DETAILS.bankName}</span></div>
                <div className="bank-detail-row"><span className="bd-label">Branch</span><span className="bd-value font-bold">{BANK_DETAILS.branch}</span></div>
                <div className="bank-detail-row"><span className="bd-label">Account Type</span><span className="bd-value font-bold">{BANK_DETAILS.accountType}</span></div>
              </div>
            </div>

            {/* Right Side: Investor Details */}
            <div className="investor-details-content" style={{ display: 'flex', flexDirection: 'column', paddingLeft: 'var(--spacing-4)' }}>
              <h3 className="bank-card-title with-icon">
                {iconMap['Users'] ? <iconMap.Users size={16} className="text-primary" /> : (iconMap['UserCircle'] && <iconMap.UserCircle size={16} className="text-primary" />)}
                Investor Funding Allocation
              </h3>
              <div className="bank-details-list" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)', marginTop: 'var(--spacing-2)' }}>
                {/* Headers */}
                <div className="bank-detail-row" style={{ borderBottom: '1px solid var(--color-border-light)', paddingBottom: 'var(--spacing-2)' }}>
                  <span className="bd-label" style={{ width: '30%', color: 'var(--color-text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Investor ID</span>
                  <span className="bd-label" style={{ width: '40%', color: 'var(--color-text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Investor Name</span>
                  <span className="bd-label" style={{ width: '30%', textAlign: 'right', color: 'var(--color-text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Amount</span>
                </div>
                {/* Data Rows */}
                {INVESTOR_DETAILS.map(inv => (
                  <div key={inv.id} className="bank-detail-row" style={{ borderBottom: 'none', padding: '4px 0' }}>
                    <span className="bd-value font-semibold text-primary" style={{ width: '30%', textAlign: 'left' }}>{inv.id}</span>
                    <span className="bd-value font-semibold" style={{ width: '40%', textAlign: 'left' }}>{inv.name}</span>
                    <span className="bd-value font-semibold text-success" style={{ width: '30%', textAlign: 'right' }}>{inv.amount}</span>
                  </div>
                ))}
                {/* Total Footer */}
                <div className="bank-detail-row" style={{ marginTop: 'var(--spacing-4)', borderTop: '1px dashed var(--color-border)', paddingTop: 'var(--spacing-3)' }}>
                  <span className="bd-label font-bold" style={{ width: '70%', color: 'var(--color-text-primary)' }}>Total Funded Amount</span>
                  <span className="bd-value font-bold text-primary" style={{ width: '30%', textAlign: 'right', fontSize: 'var(--font-size-base)' }}>₹ 1,50,000</span>
                </div>
              </div>
            </div>
          </section>

          {/* Penny Verification has been moved to modal */}

        </div>

        {/* ========== RIGHT ========== */}
        <div className="bank-col-right">
          
          {/* EMI Details */}
          <div className="bank-right-panel" style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
            <div>
              <h3 className="bank-card-title with-icon">
                {iconMap['Calculator'] ? <iconMap.Calculator size={16} className="text-primary" /> : (iconMap['BadgeIndianRupee'] && <iconMap.BadgeIndianRupee size={16} className="text-primary" />)}
                Approved EMI Plan
              </h3>
              <div className="bank-details-list" style={{ marginTop: 'var(--spacing-2)', gap: '4px' }}>
                <div className="bank-detail-row">
                  <span className="bd-label">Eligible Loan Amount</span>
                  <span className="bd-value font-bold text-success">{EMI_CALCULATION.loanAmount}</span>
                </div>
                <div className="bank-detail-row">
                  <span className="bd-label">Tenure</span>
                  <span className="bd-value font-bold">{EMI_CALCULATION.tenure}</span>
                </div>
                <div className="bank-detail-row">
                  <span className="bd-label">Interest Rate</span>
                  <span className="bd-value font-bold">{EMI_CALCULATION.interestRate}</span>
                </div>
                <div className="bank-detail-row">
                  <span className="bd-label">Processing Fee</span>
                  <span className="bd-value font-bold">{EMI_CALCULATION.processingFee}</span>
                </div>
                <div className="bank-detail-row">
                  <span className="bd-label">Net Disbursal</span>
                  <span className="bd-value font-bold text-primary">{EMI_CALCULATION.netDisbursal}</span>
                </div>
                <div className="bank-detail-row">
                  <span className="bd-label">First EMI Date</span>
                  <span className="bd-value font-bold">{EMI_CALCULATION.firstEmiDate}</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 'auto' }}>
              <div className="bank-detail-row" style={{ borderTop: '1px dashed var(--color-border)', paddingTop: 'var(--spacing-3)', marginBottom: 'var(--spacing-3)' }}>
                <span className="bd-label font-semibold">Monthly EMI</span>
                <span className="bd-value font-bold text-primary" style={{ fontSize: 'var(--font-size-lg)' }}>{EMI_CALCULATION.emiAmount}</span>
              </div>
              <div className="penny-banner" style={{ fontSize: '11px', padding: 'var(--spacing-2)', textAlign: 'center' }}>
                Final terms subject to signing of loan agreement.
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ========== BOTTOM ACTION BAR ========== */}
      <div className="bv-action-bar">
        <Button label="Back" variant="outline" size="md" icon={ArrowLeftIcon && <ArrowLeftIcon size={15} />} onClick={() => navigate(-1)} />
        <div className="bv-action-right">
          <Button label="Save Progress" variant="outline" size="md" icon={SaveIcon && <SaveIcon size={15} />} onClick={() => {}} className="text-warning border-warning" />
          <Button label="Continue to Loan Documents" variant="primary" size="md" icon={ArrowRightIcon && <ArrowRightIcon size={15} />} onClick={handleContinueClick} />
        </div>
      </div>

      {showPennyModal && (
        <div className="penny-modal-overlay">
          <div className="penny-modal-content">
            <h3 className="bank-card-title">Penny Verification</h3>
            <p className="bank-card-desc">Penny (₹1.00) credited to customer account to verify ownership.</p>
            
            <div className="penny-flow">
              {PENNY_STEPS.map((step, idx) => {
                const Icon = iconMap[step.icon];
                return (
                  <div key={idx} className="penny-step">
                    <div className="penny-icon-circle">
                      {Icon && <Icon size={20} className="text-primary" />}
                    </div>
                    <p className="penny-step-label">
                      {CheckCircleIcon && <CheckCircleIcon size={14} className="text-success" />} {step.label}
                    </p>
                    <p className="penny-step-date">{step.date}</p>
                    {idx < PENNY_STEPS.length - 1 && <div className="penny-arrow">{iconMap['ArrowRight'] && <iconMap.ArrowRight size={16} className="text-muted" />}</div>}
                  </div>
                );
              })}
            </div>
            
            <div className="penny-banner mb-4">
              Customer has confirmed the credit of ₹ 1.00 in account ending with 7890.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-3)' }}>
              <Button label="Cancel" variant="outline" size="md" onClick={() => setShowPennyModal(false)} />
              <Button label="Confirm & Proceed" variant="primary" size="md" onClick={proceedToNextPage} />
            </div>
          </div>
        </div>
      )}

    </MainLayout>
  );
}

export default BankVerification;
