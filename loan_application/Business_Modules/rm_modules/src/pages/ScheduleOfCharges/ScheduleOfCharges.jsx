import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle, CreditCard } from 'lucide-react';
import iconMap from '../../config/iconMap';
import Button from '../../components/Button/Button';
import Modal from '../../components/Modal/Modal';
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
    adminFeePaid: Boolean(saved.adminFeePaid),
    adminFeePaidAt: saved.adminFeePaidAt || null,
  };
}

export default function ScheduleOfCharges() {
  const navigate = useNavigate();
  const { applicationId } = useParams();
  const appId = applicationId;
  const { getApplication, ensureApplication, saveApplication } = useApplicationDraftStore();
  const appData = getApplication(appId);
  const ArrowLeftIcon = iconMap['ArrowLeft'];

  const form = buildChargeState(appData);
  const [isPaid, setIsPaid] = useState(() => Boolean(form.adminFeePaid));
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentState, setPaymentState] = useState('idle'); // 'idle' | 'processing' | 'completed'
  const timerRef = useRef(null);

  useEffect(() => {
    ensureApplication(appId);
  }, [appId, ensureApplication]);

  useEffect(() => {
    setIsPaid(Boolean(form.adminFeePaid));
  }, [form.adminFeePaid]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handlePayClick = () => {
    setShowPaymentModal(true);
    setPaymentState('processing');

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      setPaymentState('completed');
      setIsPaid(true);
      const nextForm = {
        ...form,
        adminFeePaid: true,
        adminFeePaidAt: new Date().toISOString(),
      };
      saveApplication(appId, buildSectionUpdate(appData, 'scheduleCharges', nextForm));
    }, 3000);
  };

  const handleCloseModal = () => {
    if (paymentState === 'processing') return;
    setShowPaymentModal(false);
    setPaymentState('idle');
  };

  const handleContinue = () => {
    saveApplication(appId, buildSectionUpdate(appData, 'scheduleCharges', {
      ...form,
      adminFeePaid: isPaid,
    }));
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
      <style>{`
        @keyframes socSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

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
                {PRODUCT_COLUMNS.map((column) => (
                  <th key={column} style={{ backgroundColor: '#effaf2', color: '#0F7A4C' }}>
                    {column}
                  </th>
                ))}
                <th style={{ backgroundColor: '#effaf2', color: '#0F7A4C', textAlign: 'center', width: '130px' }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {CHARGE_ROWS.map((row) => {
                const isAdminFee = row === 'Admin Fee (Non-Refundable)';
                return (
                  <tr key={row}>
                    <td className="aw-table__section" style={{ fontWeight: 600 }}>{row}</td>
                    {PRODUCT_COLUMNS.map((column) => (
                      <td key={`${row}-${column}`}>{form.values?.[row]?.[column] || 'N/A'}</td>
                    ))}
                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                      {isAdminFee ? (
                        isPaid ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '4px 12px',
                              backgroundColor: '#dcfce7',
                              color: '#15803d',
                              borderRadius: '999px',
                              fontSize: '11px',
                              fontWeight: 700,
                              border: '1px solid #bbf7d0',
                            }}
                          >
                            <CheckCircle size={13} />
                            Completed
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={handlePayClick}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              padding: '6px 16px',
                              backgroundColor: '#0F7A4C',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              boxShadow: '0 1px 3px rgba(15, 122, 76, 0.2)',
                              transition: 'background-color 0.2s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0b5e3a')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0F7A4C')}
                          >
                            <CreditCard size={13} />
                            Pay
                          </button>
                        )
                      ) : (
                        <span style={{ color: '#94a3b8' }}>-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        show={showPaymentModal}
        onHide={handleCloseModal}
        title={paymentState === 'completed' ? 'Payment Status' : 'Payment Processing'}
        size="sm"
      >
        {paymentState === 'processing' ? (
          <div style={{ textAlign: 'center', padding: '24px 16px' }}>
            <div
              style={{
                width: '50px',
                height: '50px',
                margin: '0 auto 16px',
                borderRadius: '50%',
                border: '4px solid #dcfce7',
                borderTopColor: '#0F7A4C',
                animation: 'socSpin 1s linear infinite',
              }}
            />
            <h4 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
              Processing Payment...
            </h4>
            <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b', lineHeight: 1.5 }}>
              Please wait while the admission fee payment is being processed.
            </p>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 16px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                margin: '0 auto 16px',
                borderRadius: '50%',
                backgroundColor: '#dcfce7',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle size={32} />
            </div>
            <h4 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
              Completed
            </h4>
            <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
              Admission fee payment has been completed.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCloseModal}
              style={{ minWidth: '100px', margin: '0 auto' }}
            >
              Close
            </Button>
          </div>
        )}
      </Modal>
    </WizardSectionLayout>
  );
}
