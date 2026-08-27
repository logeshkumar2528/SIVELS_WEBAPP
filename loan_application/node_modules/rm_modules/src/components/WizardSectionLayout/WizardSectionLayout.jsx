import Button from '../Button/Button';
import InfoBar from '../InfoBar/InfoBar';
import WizardProgress from '../WizardProgress/WizardProgress';
import iconMap from '../../config/iconMap';
import { useLocation, matchPath } from 'react-router-dom';
import { useMemo } from 'react';
import './WizardSectionLayout.css';

function getPrimaryBranch(appData) {
  if (appData?.branch) return appData.branch;
  if (appData?.addressDetails?.applicant?.city) return appData.addressDetails.applicant.city;
  return 'Pending Branch';
}

export default function WizardSectionLayout({
  appId,
  appData,
  steps,
  activeStep,
  title,
  subtitle,
  chip = 'Draft saved automatically',
  backLabel = 'Back',
  continueLabel = 'Save & Continue',
  onBack,
  onContinue,
  onStepClick,
  children,
  metaAction,
  footerNote = 'Draft changes are stored automatically in the browser.',
  footerHint,
  continueIcon = true,
  backIcon = true,
  showContinue = true,
  extraActions = null,
  headerAction = null,
}) {
  const ArrowRightIcon = iconMap['ArrowRight'];
  const ArrowLeftIcon = iconMap['ArrowLeft'];
  const ClockIcon = iconMap['Clock'];
  const location = useLocation();

  const resolvedActiveStep = useMemo(() => {
    const matchedIndex = steps.findIndex((step) => matchPath({ path: step.route, end: true }, location.pathname));
    return matchedIndex >= 0 ? matchedIndex + 1 : (activeStep || 1);
  }, [activeStep, location.pathname, steps]);

  return (
    <div className="page-container aw-page-root compact-mode">
      <div className="aw-shell compact">
        <header className="ad-premium-header">
          <div className="ad-premium-header-top">
            <div className="ad-title-group">
              <div className="ad-icon-wrapper">
                {iconMap['FileText'] && (() => { const FileText = iconMap['FileText']; return <FileText size={20} strokeWidth={2.5} />; })()}
              </div>
              <div>
                <div className="ad-title-row">
                  <h1 className="ad-page-title">{title}</h1>
                  <span className="ad-step-badge">Step {resolvedActiveStep} of {steps.length}</span>
                </div>
                <p className="ad-page-description">{subtitle}</p>
              </div>
            </div>
            {headerAction}
          </div>

          <div className="ad-premium-header-bottom">
            <div className="ad-meta-item">
              <span className="ad-meta-label">Applicant</span>
              <div className="ad-meta-value-group highlight">
                {iconMap['User'] && (() => { const User = iconMap['User']; return <User size={14} />; })()}
                <span className="ad-meta-value">{appData.agentName || appData.customerName || 'Karthik Raja'}</span>
              </div>
            </div>
            <div className="ad-meta-divider" />
            <div className="ad-meta-item">
              <span className="ad-meta-label">App ID</span>
              <div className="ad-meta-value-group">
                {iconMap['FileText'] && (() => { const FileText = iconMap['FileText']; return <FileText size={14} />; })()}
                <span className="ad-meta-value">{appData.applicationNumber || appId}</span>
              </div>
            </div>
            <div className="ad-meta-divider" />
            <div className="ad-meta-item">
              <span className="ad-meta-label">Branch</span>
              <div className="ad-meta-value-group">
                {iconMap['MapPin'] && (() => { const MapPin = iconMap['MapPin']; return <MapPin size={14} />; })()}
                <span className="ad-meta-value">{getPrimaryBranch(appData)}</span>
              </div>
            </div>
            <div className="ad-meta-divider" />
            <div className="ad-meta-item">
              <span className="ad-meta-label">Submitted</span>
              <div className="ad-meta-value-group">
                {iconMap['Calendar'] && (() => { const Calendar = iconMap['Calendar']; return <Calendar size={14} />; })()}
                <span className="ad-meta-value">{`${appData.createdDate || 'Today'}, 10:25 AM`}</span>
              </div>
            </div>
            {metaAction && (
              <>
                <div className="ad-meta-divider" />
                <div className="ad-meta-item" style={{ marginLeft: 'auto', paddingLeft: '16px' }}>
                  {metaAction}
                </div>
              </>
            )}
          </div>
        </header>

        <div className="panel aw-form-card">
          <div className="aw-form-body">
            {children}
          </div>

        <div className="aw-form-footer">
          <div className="aw-footer-left">
            {onBack && (
              <Button
                variant="secondary"
                size="sm"
                icon={backIcon && ArrowLeftIcon ? <ArrowLeftIcon size={14} /> : null}
                onClick={onBack}
                style={{ backgroundColor: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0' }}
              >
                {backLabel}
              </Button>
            )}
          </div>

          <div className="aw-footer-actions">
            {extraActions}
            {showContinue && onContinue && (
              <Button
                variant="primary"
                size="sm"
                icon={continueIcon && ArrowRightIcon ? <ArrowRightIcon size={14} /> : null}
                iconPosition="right"
                onClick={onContinue}
              >
                {continueLabel}
              </Button>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
