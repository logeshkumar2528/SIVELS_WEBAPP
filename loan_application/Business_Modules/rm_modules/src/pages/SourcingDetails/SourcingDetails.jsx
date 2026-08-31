import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User, Hash } from 'lucide-react';
import iconMap from '../../config/iconMap';
import Button from '../../components/Button/Button';
import { ROUTES } from '../../config/routeConfig';
import { APPLICATION_WIZARD_STEPS } from '../../config/applicationWizard';
import { useApplicationDraftStore } from '../../state/ApplicationDraftContext';
import WizardSectionLayout from '../../components/WizardSectionLayout/WizardSectionLayout';
import { buildSectionUpdate, getSectionState } from '../applicationWizard/flowUtils';

function buildSourcingState(appData) {
  const saved = getSectionState(appData, 'sourcing', {});
  return {
    sourcedBy: saved.sourcedBy || '',
    employeeId: saved.employeeId || '',
  };
}

export default function SourcingDetails() {
  const navigate = useNavigate();
  const { applicationId } = useParams();
  const appId = applicationId;
  const { getApplication, ensureApplication, saveApplication } = useApplicationDraftStore();
  const [form, setForm] = useState(() => buildSourcingState(getApplication(appId)));
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchRM() {
      setIsLoading(true);
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';
        const res = await fetch(`${baseUrl}/RMMaster`);
        if (res.ok) {
          const data = await res.json();
          // Find the first active RM or just the first one
          const rm = data.find(r => r.isActive) || data[0];
          if (rm) {
            const updates = { sourcedBy: rm.fullName || '', employeeId: rm.rmCode || '' };
            setForm(prev => ({ ...prev, ...updates }));
            // Also save this derived state to draft so it's persisted
            saveApplication(appId, buildSectionUpdate(getApplication(appId), 'sourcing', updates));
          }
        }
      } catch (err) {
        console.error('Failed to fetch RM Details:', err);
      }
      setIsLoading(false);
    }
    
    // Only fetch if we don't already have it
    if (!form.sourcedBy && !form.employeeId) {
      fetchRM();
    }
  }, []);

  useEffect(() => {
    ensureApplication(appId);
  }, [appId, ensureApplication]);

  const appData = getApplication(appId);
  const ArrowLeftIcon = iconMap['ArrowLeft'];

  const persist = (nextForm) => {
    setForm(nextForm);
    saveApplication(appId, buildSectionUpdate(appData, 'sourcing', nextForm));
  };

  const handleContinue = () => {
    saveApplication(appId, buildSectionUpdate(appData, 'sourcing', form));
    navigate(ROUTES.SCHEDULE_CHARGES.replace(':applicationId', appId));
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
                  disabled
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
                  disabled
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </WizardSectionLayout>
  );
}
