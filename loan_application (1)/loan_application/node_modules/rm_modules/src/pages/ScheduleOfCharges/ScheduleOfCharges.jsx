import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import iconMap from '../../config/iconMap';
import Button from '../../components/Button/Button';
import { ROUTES } from '../../config/routeConfig';
import { APPLICATION_WIZARD_STEPS } from '../../config/applicationWizard';
import { useApplicationDraftStore } from '../../state/ApplicationDraftContext';
import WizardSectionLayout from '../../components/WizardSectionLayout/WizardSectionLayout';
import { buildSectionUpdate, getSectionState } from '../applicationWizard/flowUtils';

const CHARGE_ROWS = [
  'Admin Fee (Non-Refundable)',
  'Loan Processing Fee',
  'Penal Charges (per month)',
  'Charges for Default / Non-Compliance',
  'Conversion Charges (Floating to Fixed)',
];

const PRODUCT_COLUMNS = [
  'PL / ML (Unsecured)',
  'BL (Secured)',
  'HL & Variations',
  'LAP (Land / Bldg)',
];

function buildChargeState(appData) {
  const saved = getSectionState(appData, 'scheduleCharges', {});
  return {
    values: saved.values || {},
  };
}

export default function ScheduleOfCharges() {
  const navigate = useNavigate();
  const { applicationId } = useParams();
  const appId = applicationId;
  const { getApplication, ensureApplication, saveApplication } = useApplicationDraftStore();
  const appData = getApplication(appId);
  const ArrowLeftIcon = iconMap['ArrowLeft'];
  const InfoIcon = iconMap['Info'];

  useEffect(() => {
    ensureApplication(appId);
  }, [appId, ensureApplication]);

  const form = buildChargeState(appData);

  const handleContinue = () => {
    saveApplication(appId, buildSectionUpdate(appData, 'scheduleCharges', form));
    navigate(ROUTES.DOCUMENT_CHECKLIST.replace(':applicationId', appId));
  };

  const handleBack = () => {
    navigate(ROUTES.SOURCING.replace(':applicationId', appId));
  };

  return (
    <WizardSectionLayout
      appId={appId}
      appData={appData}
      steps={APPLICATION_WIZARD_STEPS}
      activeStep={10}
      title="Step 10: Schedule of Charges"
      subtitle="Read-only charge matrix aligned to the PDF structure."
      backLabel="Back to Sourcing"
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
          Back to Sourcing
        </Button>
      }
      showContinue
    >
      <div className="aw-mini-card">
        <div className="aw-mini-card__header">
          <div>
            <div className="aw-mini-card__title">Charge Matrix</div>
            <div className="aw-mini-card__subtitle">Applicable rates based on loan product</div>
          </div>
        </div>
        <div className="aw-mini-card__body" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="aw-table" style={{ margin: 0, border: 'none' }}>
            <thead>
              <tr>
                <th style={{ backgroundColor: '#effaf2', color: '#0F7A4C' }}>Particulars</th>
                {PRODUCT_COLUMNS.map((column) => <th key={column} style={{ backgroundColor: '#effaf2', color: '#0F7A4C' }}>{column}</th>)}
              </tr>
            </thead>
            <tbody>
              {CHARGE_ROWS.map((row) => (
                <tr key={row}>
                  <td className="aw-table__section" style={{ fontWeight: 600 }}>{row}</td>
                  {PRODUCT_COLUMNS.map((column) => (
                    <td key={`${row}-${column}`}>{form.values?.[row]?.[column] || 'N/A'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </WizardSectionLayout>
  );
}
