import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileText, IndianRupee, IdCard, Briefcase, Landmark, Home } from 'lucide-react';
import iconMap from '../../config/iconMap';
import Button from '../../components/Button/Button';
import { ROUTES } from '../../config/routeConfig';
import { APPLICATION_WIZARD_STEPS } from '../../config/applicationWizard';
import { useApplicationDraftStore } from '../../state/ApplicationDraftContext';
import WizardSectionLayout from '../../components/WizardSectionLayout/WizardSectionLayout';
import { buildSectionUpdate, getSectionState } from '../applicationWizard/flowUtils';

const CHECKLIST_ITEMS = [
  {
    name: 'Application Form',
    detail: 'Duly filled with photograph, signed by Applicant and Co-Applicant(s)',
    icon: FileText,
  },
  {
    name: 'Admin Fee',
    detail: "Paid via cheque in favour of 'Sivels Finance' or online",
    icon: IndianRupee,
  },
  {
    name: 'KYC Documents',
    detail: 'PAN card and one OVD (Aadhaar / Passport / Voter ID / Driving Licence)',
    icon: IdCard,
  },
  {
    name: 'Income Proof',
    detail: "Latest 3 months' salary slips (Salaried) or last 2 years' ITR & financials (Self-Employed)",
    icon: Briefcase,
  },
  {
    name: 'Bank Statements',
    detail: 'Last 6-12 months',
    icon: Landmark,
  },
  {
    name: 'Property Title Documents',
    detail: 'Property / collateral title documents for BL, HL & LAP applications',
    icon: Home,
  },
];

function buildChecklistState(appData) {
  const saved = getSectionState(appData, 'documentChecklist', {});
  const savedItems = Array.isArray(saved.items) ? saved.items : [];
  return {
    items: CHECKLIST_ITEMS.map((item, index) => ({
      ...item,
      status: savedItems[index]?.status === true || savedItems[index]?.status === 'true',
    })),
  };
}

function ChecklistItem({ item, onChange }) {
  const IconComponent = item.icon;
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', borderBottom: '1px solid var(--color-border-light)' }}>
      <input 
        type="checkbox" 
        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#0F7A4C', flexShrink: 0 }}
        checked={item.status} 
        onChange={(e) => onChange('status', e.target.checked)} 
      />
      {IconComponent && (
        <div style={{ flexShrink: 0, color: '#7A9485', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', backgroundColor: '#effaf2', borderRadius: '8px' }}>
          <IconComponent size={16} strokeWidth={2.5} />
        </div>
      )}
      <div>
        <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{item.name}</div>
        <div style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>{item.detail}</div>
      </div>
    </div>
  );
}

export default function DocumentChecklist() {
  const navigate = useNavigate();
  const { applicationId } = useParams();
  const appId = applicationId;
  const { getApplication, ensureApplication, saveApplication } = useApplicationDraftStore();
  const [form, setForm] = useState(() => buildChecklistState(getApplication(appId)));

  useEffect(() => {
    ensureApplication(appId);
  }, [appId, ensureApplication]);

  const appData = getApplication(appId);
  const ArrowLeftIcon = iconMap['ArrowLeft'];

  useEffect(() => {
    setForm(buildChecklistState(getApplication(appId)));
  }, [appId, getApplication]);

  const persist = (nextForm) => {
    setForm(nextForm);
    saveApplication(appId, buildSectionUpdate(appData, 'documentChecklist', nextForm));
  };

  const updateItem = (index, field, value) => {
    const nextItems = form.items.map((item, currentIndex) => (
      currentIndex === index ? { ...item, [field]: value } : item
    ));
    persist({ items: nextItems });
  };

  const handleContinue = () => {
    saveApplication(appId, buildSectionUpdate(appData, 'documentChecklist', form));
    navigate(ROUTES.DECLARATION.replace(':applicationId', appId));
  };

  const handleBack = () => {
    navigate(ROUTES.SCHEDULE_CHARGES.replace(':applicationId', appId));
  };

  return (
    <WizardSectionLayout
      appId={appId}
      appData={appData}
      steps={APPLICATION_WIZARD_STEPS}
      activeStep={11}
      title="Step 11: Document Checklist"
      subtitle="Verify that all required documents have been collected."
      backLabel="Back to Schedule of Charges"
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
          Back to Schedule of Charges
        </Button>
      }
    >
      <div className="aw-mini-card">
        <div className="aw-mini-card__header">
          <div>
            <div className="aw-mini-card__title">Checklist</div>
            <div className="aw-mini-card__subtitle">Mark documents as verified</div>
          </div>
        </div>
        <div className="aw-mini-card__body" style={{ padding: 0, display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          {form.items.map((item, index) => (
            <div key={item.name} style={{ borderRight: index % 2 === 0 ? '1px solid var(--color-border-light)' : 'none' }}>
              <ChecklistItem
                item={item}
                onChange={(field, value) => updateItem(index, field, value)}
              />
            </div>
          ))}
        </div>
      </div>
    </WizardSectionLayout>
  );
}
