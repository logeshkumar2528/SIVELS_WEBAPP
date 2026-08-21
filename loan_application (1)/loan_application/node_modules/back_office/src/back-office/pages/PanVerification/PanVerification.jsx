/**
 * PanVerification.jsx
 * --------------------
 * Step 2: PAN Verification & CIBIL Score page.
 */

import { useState, useEffect } from 'react';
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
  CIBIL_DATA, ELIGIBILITY_FACTORS, LOAN_OFFER, DECISION_SUMMARY, ACTION_HISTORY
} from './panVerificationData';
import './PanVerification.css';

const BREADCRUMB_ITEMS = [
  { label: 'Back Office Dashboard', path: ROUTES.DASHBOARD },
  { label: 'New Applications',      path: ROUTES.NEW_APPLICATIONS },
  { label: 'PAN Verification & CIBIL Score' }
];

function PanVerification() {
  const [panInput, setPanInput] = useState('');
  const [isPanVerified, setIsPanVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(300);
  const [arcDegrees, setArcDegrees] = useState(0);
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    if (isPanVerified) {
      let startTimestamp = null;
      const startValue = 300;
      const endValue = CIBIL_DATA.score;
      const duration = 2000; // 2 seconds animation
      let animationFrameId;

      const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        // easeOutCubic
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentScore = Math.floor(startValue + (endValue - startValue) * easeOut);
        const currentDeg = Math.floor(easeOut * 180);
        
        setAnimatedScore(currentScore);
        setArcDegrees(currentDeg);
        
        if (progress < 1) {
          animationFrameId = requestAnimationFrame(step);
        } else {
          setAnimatedScore(endValue);
          setArcDegrees(180);
        }
      };

      animationFrameId = requestAnimationFrame(step);
      return () => cancelAnimationFrame(animationFrameId);
    } else {
      setAnimatedScore(300);
      setArcDegrees(0);
    }
  }, [isPanVerified]);

  const getConicGradient = (deg) => {
    if (deg === 0) return 'conic-gradient(from 180deg at 50% 100%, var(--color-border) 0deg, var(--color-border) 180deg)';
    
    const stops = [];
    const greenEnd = Math.min(deg, 120);
    stops.push(`#10b981 0deg`, `#10b981 ${greenEnd}deg`);
    
    if (deg > 120) {
      const yellowEnd = Math.min(deg, 160);
      stops.push(`#f59e0b 120deg`, `#f59e0b ${yellowEnd}deg`);
      
      if (deg > 160) {
        stops.push(`#ef4444 160deg`, `#ef4444 ${deg}deg`);
      }
    }
    
    stops.push(`var(--color-border-light) ${deg}deg`, `var(--color-border-light) 180deg`);
    return `conic-gradient(from 180deg at 50% 100%, ${stops.join(', ')})`;
  };

  const handleContinue = () => {
    navigate(ROUTES.BANK_VERIFICATION.replace(':id', id || 'APP123'));
  };

  const isValidPan = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(panInput);

  const handleVerifyPan = () => {
    if (isValidPan) {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        setIsPanVerified(true);
      }, 2000);
    }
  };

  const displayValue = (val, width = '60px') => {
    if (isPanVerified) return val;
    if (isLoading) return <span className="skeleton-text" style={{ width }}></span>;
    return '-';
  };

  const ArrowLeftIcon  = iconMap['ArrowLeft'];
  const SaveIcon       = iconMap['Save'];
  const ArrowRightIcon = iconMap['ArrowRight'];
  const CheckCircleIcon= iconMap['CheckCircle2'];
  const SearchIcon     = iconMap['Search'];
  const ShieldCheckIcon= iconMap['ShieldCheck'];
  const ExternalLinkIcon = iconMap['ArrowUpRight'];
  const LoaderIcon     = iconMap['Loader2'] || iconMap['Loader'] || iconMap['RefreshCw'];

  return (
    <MainLayout
      title="PAN Verification & CIBIL Score"
      user={CURRENT_USER}
      badgeCounts={BADGE_COUNTS}
      notificationCount={12}
    >
      <Breadcrumb items={BREADCRUMB_ITEMS} />
      <StepProgress steps={VERIFICATION_STEPS} activeStep={2} />

      <div className="pan-grid">
        
        {/* ========== LEFT ========== */}
        <div className="pan-col-left">
          <CustomerSummary data={CS_DATA} />
        </div>

        {/* ========== MIDDLE ========== */}
        <div className="pan-col-middle">
          
          {/* PAN Section */}
          <section className="pan-card">
            <h3 className="pan-card-title">PAN Verification</h3>
            <div className="pan-verify-row">
              <div className="pan-input-group">
                <span className="pan-input-label">Enter PAN Number</span>
                <div className="pan-input-wrap">
                  <input 
                    type="text" 
                    value={panInput} 
                    onChange={(e) => {
                      setPanInput(e.target.value.toUpperCase());
                      if (isPanVerified) setIsPanVerified(false);
                    }} 
                    className="pan-input" 
                    placeholder="e.g. ABCDE1234F"
                    maxLength={10}
                    disabled={isLoading}
                  />
                  {isValidPan && CheckCircleIcon && <CheckCircleIcon size={16} className="pan-input-icon text-success" />}
                </div>
              </div>
              <Button 
                label={isLoading ? "Verifying..." : "Verify PAN"} 
                variant="primary" 
                size="md" 
                icon={isLoading ? (LoaderIcon && <LoaderIcon size={14} className="spin" />) : (SearchIcon && <SearchIcon size={14} />)} 
                onClick={handleVerifyPan}
                disabled={!isValidPan || isPanVerified || isLoading}
              />
              
              {isPanVerified && (
                <div className="pan-status-msg">
                  {ShieldCheckIcon && <ShieldCheckIcon size={18} className="text-success" />}
                  <div>
                    <p className="pan-status-title text-success" style={{marginBottom: 0}}>PAN Verified Successfully</p>
                    <p className="pan-status-desc">RAMESH KUMAR (12/05/1993)</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* CIBIL Section */}
          <section className="pan-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="pan-card-header-row">
              <h3 className="pan-card-title">CIBIL Score & Report</h3>
              <span className="cibil-logo">Powered by <strong className="text-primary">CIBIL</strong></span>
            </div>
            
            <div className="cibil-grid" style={{ margin: 'auto 0' }}>
              {/* Gauge Placeholder */}
              <div className="cibil-gauge-box">
                <div 
                  className={`cibil-gauge-arc ${isLoading ? 'skeleton-pulse' : ''}`} 
                  style={{ 
                    opacity: isPanVerified ? 1 : 0.2,
                    background: isPanVerified ? getConicGradient(arcDegrees) : undefined
                  }}
                ></div>
                <div className="cibil-gauge-content">
                  <span className="cibil-score">{displayValue(animatedScore, '80px')}</span>
                  <span className="cibil-status text-success">
                    {isPanVerified ? CIBIL_DATA.status : (isLoading ? <span className="skeleton-text" style={{width:'50px'}}></span> : '')}
                  </span>
                </div>
                <div className="cibil-gauge-labels">
                  <span>300</span>
                  <span>900</span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="cibil-stats-grid">
                {CIBIL_DATA.stats.map(stat => (
                  <div key={stat.label} className="cibil-stat-item">
                    <span className="cibil-stat-label">{stat.label}</span>
                    <span className={`cibil-stat-value ${isPanVerified && stat.isSuccess ? 'text-success' : ''}`}>{displayValue(stat.value)}</span>
                  </div>
                ))}
              </div>

              {/* Summary List */}
              <div className="cibil-summary-list">
                <h4 className="cibil-sub-title">CIBIL Report Summary</h4>
                <ul className="cibil-ul">
                  {isPanVerified ? (
                    CIBIL_DATA.summaryList.map((item, idx) => (
                      <li key={idx}>
                        {CheckCircleIcon && <CheckCircleIcon size={14} className="text-success" />} {item}
                      </li>
                    ))
                  ) : (
                    <li className="text-muted" style={{fontSize: 12}}>
                      {isLoading ? <span className="skeleton-text" style={{width: '200px'}}></span> : 'Pending verification...'}
                    </li>
                  )}
                </ul>
                {isPanVerified && (
                  <a href="#" className="cibil-link">
                    View Full CIBIL Report {ExternalLinkIcon && <ExternalLinkIcon size={12} />}
                  </a>
                )}
              </div>
            </div>
          </section>

        </div>

        {/* ========== RIGHT ========== */}
        <div className="pan-col-right">
          
          {/* Decision Summary */}
          <div className="pan-right-panel">
            <h3 className="pan-card-title with-icon">
              {iconMap['CheckCircle'] && <iconMap.CheckCircle size={16} className="text-success" />}
              Decision Summary
            </h3>
            <div className="decision-list">
              <div className="decision-row">
                <span className="decision-label">Eligible Amount</span>
                <span className="decision-value">
                  {isPanVerified ? '₹ 1,50,000' : (isLoading ? <span className="skeleton-text" style={{width: '80px'}}></span> : '-')}
                </span>
              </div>
              <div className="decision-row">
                <span className="decision-label">Status</span>
                <span className={`decision-badge ${isPanVerified ? 'badge-success' : ''}`}>{displayValue('Eligible')}</span>
              </div>
            </div>
          </div>

          {/* Action History */}
          <div className="pan-right-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h3 className="pan-card-title with-icon">
              {iconMap['History'] && <iconMap.History size={16} className="text-muted" />}
              Action History
            </h3>
            <div className="history-timeline" style={{ margin: 'auto 0' }}>
              {isPanVerified ? (
                ACTION_HISTORY.map((item, idx) => (
                  <div key={idx} className="history-item">
                    <div className="history-dot"></div>
                    <div className="history-content">
                      <p className="history-action">{item.action}</p>
                      <p className="history-date">{item.date}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted" style={{fontSize: 12}}>
                  {isLoading ? (
                    <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                      <span className="skeleton-text" style={{width:'100%'}}></span>
                      <span className="skeleton-text" style={{width:'80%'}}></span>
                    </div>
                  ) : 'Pending verification...'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========== BOTTOM ACTION BAR ========== */}
      <div className="pan-action-bar">
        <Button label="Back" variant="outline" size="md" icon={ArrowLeftIcon && <ArrowLeftIcon size={15} />} onClick={() => navigate(-1)} />
        <div className="pan-action-right">
          <Button label="Save Progress" variant="outline" size="md" icon={SaveIcon && <SaveIcon size={15} />} onClick={() => {}} className="text-warning border-warning" />
          <Button label="Continue to Bank Verification" variant="primary" size="md" icon={ArrowRightIcon && <ArrowRightIcon size={15} />} onClick={handleContinue} disabled={!isPanVerified} />
        </div>
      </div>

    </MainLayout>
  );
}

export default PanVerification;
