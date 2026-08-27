import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import iconMap from '../../config/iconMap';
import Breadcrumb from '../../components/Breadcrumb/Breadcrumb';
import { ROUTES } from '../../config/routeConfig';
import { LOAN_TYPES, HOW_IT_WORKS, BENEFITS, formatINR } from './newInvestmentData';
import './NewInvestment.css';

export default function NewInvestment() {
  const navigate = useNavigate();

  // Investment amount top input (default ₹ 10,00,000)
  const [totalInvestmentInput, setTotalInvestmentInput] = useState('1000000');

  // Allocation state per loan type
  const [allocations, setAllocations] = useState({
    personal: { amount: '300000', included: true },
    business: { amount: '200000', included: true },
    housing: { amount: '400000', included: true },
    property: { amount: '100000', included: true },
  });

  const InfoIcon = iconMap['Info'];
  const WalletIcon = iconMap['Wallet'];
  const CheckCircle2 = iconMap['CheckCircle2'];
  const RotateCcw = iconMap['RotateCcw'];
  const ArrowLeft = iconMap['ArrowLeft'];
  const ArrowRight = iconMap['ArrowRight'];
  const AlertTriangle = iconMap['AlertTriangle'] || iconMap['Info'];
  const UserIcon = iconMap['User'];
  const BriefcaseIcon = iconMap['Briefcase'];
  const HomeIcon = iconMap['Home'];
  const BuildingIcon = iconMap['Building2'];

  const getLoanIcon = (iconName) => {
    switch (iconName) {
      case 'User': return UserIcon;
      case 'Briefcase': return BriefcaseIcon;
      case 'Home': return HomeIcon;
      case 'Building2': return BuildingIcon;
      default: return UserIcon;
    }
  };

  const handleToggle = (key) => {
    setAllocations((prev) => ({
      ...prev,
      [key]: { ...prev[key], included: !prev[key].included },
    }));
  };

  const handleAmountChange = (key, value) => {
    setAllocations((prev) => ({
      ...prev,
      [key]: { ...prev[key], amount: value },
    }));
  };

  const handleReset = () => {
    setTotalInvestmentInput('1000000');
    setAllocations({
      personal: { amount: '300000', included: true },
      business: { amount: '200000', included: true },
      housing: { amount: '400000', included: true },
      property: { amount: '100000', included: true },
    });
  };

  const handleConfirm = () => {
    navigate(ROUTES.CUSTOMER_ALLOCATION);
  };

  const totalAllocatedAmount = useMemo(() => {
    return LOAN_TYPES.reduce((sum, loan) => {
      const val = parseFloat(allocations[loan.key].amount) || 0;
      return sum + (allocations[loan.key].included ? val : 0);
    }, 0);
  }, [allocations]);

  const breakdown = useMemo(() => {
    return LOAN_TYPES.map((loan) => {
      const amount = allocations[loan.key].included
        ? parseFloat(allocations[loan.key].amount) || 0
        : 0;
      const percent = totalAllocatedAmount > 0 ? (amount / totalAllocatedAmount) * 100 : 0;
      return {
        key: loan.key,
        label: loan.label,
        amount,
        percent,
        rate: loan.rate,
        tint: loan.tint,
      };
    });
  }, [allocations, totalAllocatedAmount]);

  const avgRate =
    totalAllocatedAmount > 0
      ? breakdown.reduce((sum, b) => sum + b.rate * (b.amount / totalAllocatedAmount), 0)
      : 0;
  const monthlyInterest = (totalAllocatedAmount * avgRate) / 100 / 12;

  const breadcrumbItems = [
    { label: 'Dashboard', route: ROUTES.DASHBOARD },
    { label: 'New Investment', route: '' },
  ];

  return (
    <div className="new-investment-container">
      <Breadcrumb items={breadcrumbItems} />

      {/* TOP ROW: Investment Amount Card & How It Works Card */}
      <div className="ni-top-row">
        {/* Investment Amount Card */}
        <div className="ni-card ni-investment-amount-card">
          <div className="ni-amount-left">
            <h3 className="ni-card-heading">Investment Amount</h3>
            <p className="ni-card-subheading">Enter the amount you want to invest</p>
            
            <div className="ni-currency-input-box">
              <span className="ni-currency-symbol">₹</span>
              <input
                type="text"
                className="ni-currency-input"
                value={
                  totalInvestmentInput
                    ? Number(totalInvestmentInput).toLocaleString('en-IN')
                    : ''
                }
                onChange={(e) => {
                  const raw = e.target.value.replace(/,/g, '').replace(/[^0-9]/g, '');
                  setTotalInvestmentInput(raw);
                }}
              />
            </div>
            <span className="ni-min-investment">Minimum Investment: ₹ 10,000</span>
          </div>

          <div className="ni-available-balance-box">
            <div className="ni-balance-icon-wrap">
              {WalletIcon && <WalletIcon size={22} color="#16a34a" />}
            </div>
            <div className="ni-balance-info">
              <span className="ni-balance-label">Available Balance</span>
              <span className="ni-balance-value">₹ 45,230</span>
              <a href="#add-funds" className="ni-add-funds-link">
                Add Funds →
              </a>
            </div>
          </div>
        </div>

        {/* How It Works Card */}
        <div className="ni-card ni-how-it-works-card">
          <div className="ni-how-header">
            {InfoIcon && <InfoIcon size={18} color="#0284c7" />}
            <h3 className="ni-card-heading">How it works?</h3>
          </div>
          <div className="ni-how-steps">
            {HOW_IT_WORKS.map((step, idx) => (
              <div key={idx} className="ni-step-item">
                <div className="ni-step-icon-bg">
                  {InfoIcon && <InfoIcon size={12} color="#0284c7" />}
                </div>
                <span className="ni-step-text">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN SECTION: Left Form Area & Right Preview Sidebar */}
      <div className="ni-main-grid">
        {/* Left Column */}
        <div className="ni-left-col">
          <div className="ni-section-header">
            <h2 className="ni-section-title">Choose Loan Types & Allocate Amount</h2>
            <p className="ni-section-subtitle">
              Select loan types and specify how much you want to invest in each
            </p>
          </div>

          {/* 4 Loan Category Cards */}
          <div className="ni-loan-cards-grid">
            {LOAN_TYPES.map((loan) => {
              const IconComponent = getLoanIcon(loan.icon);
              const item = allocations[loan.key];
              const bInfo = breakdown.find((b) => b.key === loan.key);
              const pct = bInfo ? bInfo.percent : 0;

              return (
                <div
                  key={loan.key}
                  className={`ni-loan-card ${
                    item.included ? 'ni-loan-card--active' : ''
                  }`}
                  style={{
                    borderColor: item.included ? loan.border : 'var(--color-border)',
                  }}
                >
                  <div className="ni-loan-card-top">
                    <div
                      className="ni-loan-icon-circle"
                      style={{ background: loan.bg }}
                    >
                      {IconComponent && (
                        <IconComponent size={20} color={loan.tint} />
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={item.included}
                      onChange={() => handleToggle(loan.key)}
                      className="ni-loan-checkbox"
                    />
                  </div>

                  <div className="ni-loan-title">{loan.label}</div>
                  <div className="ni-loan-subtitle">{loan.subtitle}</div>

                  <div className="ni-loan-input-group">
                    <label>Allocate Amount (₹)</label>
                    <input
                      type="text"
                      disabled={!item.included}
                      value={
                        item.amount
                          ? Number(item.amount).toLocaleString('en-IN')
                          : ''
                      }
                      onChange={(e) => {
                        const raw = e.target.value
                          .replace(/,/g, '')
                          .replace(/[^0-9]/g, '');
                        handleAmountChange(loan.key, raw);
                      }}
                      className="ni-loan-amount-input"
                    />
                  </div>

                  <div className="ni-loan-rate-row">
                    <span className="ni-rate-label">Interest Rate (p.a.)</span>
                    <span className="ni-rate-val" style={{ color: loan.tint }}>
                      {loan.rate.toFixed(2)}%
                    </span>
                  </div>

                  <div className="ni-loan-pill-wrap">
                    <span
                      className="ni-loan-pill"
                      style={{ background: loan.bg, color: loan.tint }}
                    >
                      {pct.toFixed(0)}% of total
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total Allocation Summary Bar */}
          <div className="ni-summary-bar">
            <span className="ni-summary-title">Total Allocation Summary</span>

            <div className="ni-summary-metrics">
              <div className="ni-metric">
                <span className="ni-metric-label">Total Amount</span>
                <span className="ni-metric-val val-green">
                  {formatINR(totalAllocatedAmount)}
                </span>
              </div>
              <div className="ni-metric">
                <span className="ni-metric-label">Total Percentage</span>
                <span className="ni-metric-val val-blue">
                  {totalAllocatedAmount > 0 ? '100%' : '0%'}
                </span>
              </div>
              <div className="ni-metric">
                <span className="ni-metric-label">Expected Avg. Interest Rate (p.a.)</span>
                <span className="ni-metric-val val-purple">
                  {avgRate.toFixed(2)}%
                </span>
              </div>
              <div className="ni-metric">
                <span className="ni-metric-label">Expected Monthly Interest</span>
                <span className="ni-metric-val val-orange">
                  {formatINR(monthlyInterest)}{' '}
                  <span className="ni-approx-tag">(Approx.)</span>
                </span>
              </div>
            </div>
          </div>

          {/* Important Note Box */}
          <div className="ni-note-box">
            <div className="ni-note-icon-wrap">
              {AlertTriangle && <AlertTriangle size={16} color="#d97706" />}
            </div>
            <div className="ni-note-content">
              <strong className="ni-note-title">Important Note</strong>
              <p className="ni-note-desc">
                Investment will be allocated to eligible loans based on your preferences and borrower availability.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column / Sidebar */}
        <div className="ni-right-col">
          {/* Investment Preview Card */}
          <div className="ni-card ni-preview-card">
            <h3 className="ni-card-heading mb-3">Investment Preview</h3>

            <div className="ni-preview-list">
              {breakdown.map((b) => (
                <div key={b.key} className="ni-preview-item">
                  <span className="ni-preview-label">{b.label}</span>
                  <span className="ni-preview-val" style={{ color: b.tint }}>
                    {formatINR(b.amount)} ({b.percent.toFixed(0)}%)
                  </span>
                </div>
              ))}
            </div>

            <div className="ni-preview-divider" />

            <div className="ni-preview-total-row">
              <span className="ni-total-label">Total Investment</span>
              <span className="ni-total-val">
                {formatINR(totalAllocatedAmount)}
              </span>
            </div>
          </div>

          {/* Benefits You Get Card */}
          <div className="ni-card ni-benefits-card">
            <h3 className="ni-card-heading mb-3">Benefits You Get</h3>

            <div className="ni-benefits-list">
              {BENEFITS.map((benefit, i) => (
                <div key={i} className="ni-benefit-item">
                  {CheckCircle2 && (
                    <CheckCircle2
                      size={18}
                      color="#16a34a"
                      className="ni-benefit-icon"
                    />
                  )}
                  <span className="ni-benefit-text">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* FULL-WIDTH BOTTOM ACTION CONTROLS */}
      <div className="ni-bottom-actions">
        <button
          type="button"
          className="ni-btn-back"
          onClick={() => navigate(ROUTES.DASHBOARD)}
        >
          {ArrowLeft && <ArrowLeft size={16} />} Back to Dashboard
        </button>

        <div className="ni-right-actions">
          <button
            type="button"
            className="ni-btn-reset"
            onClick={handleReset}
          >
            {RotateCcw && <RotateCcw size={16} />} Reset
          </button>

          <button
            type="button"
            className="ni-btn-confirm"
            onClick={handleConfirm}
          >
            Review & Confirm Investment {ArrowRight && <ArrowRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
