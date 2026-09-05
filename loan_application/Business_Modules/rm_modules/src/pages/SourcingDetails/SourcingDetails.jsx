import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User, Hash } from 'lucide-react';
import iconMap from '../../config/iconMap';
import Button from '../../components/Button/Button';
import { ROUTES } from '../../config/routeConfig';
import { APPLICATION_WIZARD_STEPS } from '../../config/applicationWizard';
import { useApplicationDraftStore } from '../../state/ApplicationDraftContext';
import WizardSectionLayout from '../../components/WizardSectionLayout/WizardSectionLayout';
import { buildSectionUpdate, getSectionState } from '../applicationWizard/flowUtils';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';

function isObsoleteMock(val) {
  if (!val) return true;
  const s = String(val).trim().toLowerCase();
  return (
    s === 'karthik raja' ||
    s === 'anil kumar' ||
    s === '# emp1001' ||
    s === 'emp1001' ||
    s === 'rm0001'
  );
}

function buildSourcingState(appData) {
  const saved = getSectionState(appData, 'sourcing', {});
  const rawSourcedBy = saved.sourcedBy;
  const rawEmployeeId = saved.employeeId;

  return {
    sourcedBy: isObsoleteMock(rawSourcedBy) ? 'Sivashanmugam M' : rawSourcedBy,
    employeeId: isObsoleteMock(rawEmployeeId) ? 'RM001' : rawEmployeeId,
  };
}

export default function SourcingDetails() {
  const navigate = useNavigate();
  const { applicationId } = useParams();
  const appId = applicationId;
  const { getApplication, ensureApplication, saveApplication } = useApplicationDraftStore();
  const [form, setForm] = useState(() => buildSourcingState(getApplication(appId)));
  const [isLoading, setIsLoading] = useState(false);
  const isFetchedRef = useRef(false);

  useEffect(() => {
    ensureApplication(appId);
  }, [appId]);

  // Fetch live RM profile once on mount / appId change
  useEffect(() => {
    let active = true;

    async function fetchRM() {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_BASE}/RMMaster`);
        if (res.ok) {
          const data = await res.json();
          const rows = Array.isArray(data) ? data : (Array.isArray(data?.value) ? data.value : []);

          let currentUser = {};
          try {
            const raw = localStorage.getItem('sivels_currentUser');
            if (raw) currentUser = JSON.parse(raw);
          } catch {
            // ignore
          }

          const currentMobile = String(currentUser?.mobileNumber || currentUser?.phone || '').replace(/\D/g, '');
          const currentRmId = Number(currentUser?.rmId || currentUser?.RMId || 0);

          const rm =
            rows.find((row) => Number(row.rmId || row.RMId) === currentRmId && currentRmId > 0) ||
            rows.find((row) => currentMobile && String(row.mobileNumber || '').replace(/\D/g, '') === currentMobile) ||
            rows.find((row) => row.isActive !== false) ||
            rows[0];

          if (active && rm) {
            const updates = {
              sourcedBy: rm.fullName || 'Sivashanmugam M',
              employeeId: rm.rmCode || `RM${String(rm.rmId || 1).padStart(3, '0')}`,
            };
            setForm(updates);
            saveApplication(appId, { sourcing: updates });
          }
        }
      } catch (err) {
        console.error('Failed to fetch RM Details from RMMaster:', err);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    fetchRM();

    return () => {
      active = false;
    };
  }, [appId]);

  const appData = getApplication(appId);
  const ArrowLeftIcon = iconMap['ArrowLeft'];

  const persist = (nextForm) => {
    setForm(nextForm);
    saveApplication(appId, buildSectionUpdate(appData, 'sourcing', nextForm));
  };

  const handleContinue = () => {
    saveApplication(appId, buildSectionUpdate(appData, 'sourcing', form));
    navigate(ROUTES.APPLICATION_PDF_VIEW.replace(':applicationId', appId), {
      state: { closeTo: ROUTES.SCHEDULE_CHARGES.replace(':applicationId', appId) },
    });
  };

  const handleBack = () => {
    navigate(ROUTES.REFERENCES.replace(':applicationId', appId));
  };

  return (
    <WizardSectionLayout
      appId={appId}
      appData={appData}
      steps={APPLICATION_WIZARD_STEPS}
      activeStep={9}
      title="Step 9: Sourcing Details"
      subtitle="Office use only. Capture the RM name and employee ID that sourced the application."
      backLabel="Back to References"
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
          Back to References
        </Button>
      }
    >
      <div className="aw-mini-card">
        <div className="aw-mini-card__header">
          <div>
            <div className="aw-mini-card__title">Sourcing Details</div>
            <div className="aw-mini-card__subtitle">FOR OFFICE USE ONLY</div>
          </div>
        </div>
        <div className="aw-mini-card__body">
          <div className="aw-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div className="aw-field">
              <label className="form-label">Sourced By (RM Name)</label>
              <div className="aw-input-wrapper">
                <User className="aw-input-icon" size={14} />
                <input
                  className="form-input aw-input aw-input--with-icon"
                  value={isLoading ? 'Loading...' : form.sourcedBy}
                  readOnly
                  placeholder="Enter RM Name"
                />
              </div>
            </div>
            <div className="aw-field">
              <label className="form-label">Employee ID</label>
              <div className="aw-input-wrapper">
                <Hash className="aw-input-icon" size={14} />
                <input
                  className="form-input aw-input aw-input--with-icon"
                  value={isLoading ? 'Loading...' : form.employeeId}
                  readOnly
                  placeholder="Enter Employee ID (e.g. RM001)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </WizardSectionLayout>
  );
}
