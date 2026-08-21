import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User, Users, Phone, MapPin } from 'lucide-react';
import iconMap from '../../config/iconMap';
import Button from '../../components/Button/Button';
import { ROUTES } from '../../config/routeConfig';
import { APPLICATION_WIZARD_STEPS } from '../../config/applicationWizard';
import { useApplicationDraftStore } from '../../state/ApplicationDraftContext';
import WizardSectionLayout from '../../components/WizardSectionLayout/WizardSectionLayout';
import { buildSectionUpdate, getSectionState } from '../applicationWizard/flowUtils';

function buildReferenceState(appData) {
  const saved = getSectionState(appData, 'references', {});
  const createReference = (source = {}) => ({
    fullName: source.fullName || '',
    relationship: source.relationship || '',
    address: source.address || '',
    mobileNo: source.mobileNo || '',
  });

  return {
    reference1: createReference(saved.reference1),
    reference2: createReference(saved.reference2),
  };
}

function ReferenceCard({ title, reference, onChange }) {
  return (
    <div className="aw-mini-card">
      <div className="aw-mini-card__header">
        <div>
          <div className="aw-mini-card__title">{title}</div>
          <div className="aw-mini-card__subtitle">Reference Details</div>
        </div>
      </div>
      <div className="aw-mini-card__body">
        <div className="aw-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <div className="aw-field">
            <label className="form-label">Full Name</label>
            <div className="aw-input-wrapper">
              <User className="aw-input-icon" size={14} />
              <input className="form-input aw-input aw-input--with-icon" value={reference.fullName} onChange={(e) => onChange('fullName', e.target.value)} />
            </div>
          </div>
          <div className="aw-field">
            <label className="form-label">Relationship</label>
            <div className="aw-input-wrapper">
              <Users className="aw-input-icon" size={14} />
              <input className="form-input aw-input aw-input--with-icon" value={reference.relationship} onChange={(e) => onChange('relationship', e.target.value)} />
            </div>
          </div>
          <div className="aw-field">
            <label className="form-label">Mobile No.</label>
            <div className="aw-input-wrapper">
              <Phone className="aw-input-icon" size={14} />
              <input className="form-input aw-input aw-input--with-icon" value={reference.mobileNo} onChange={(e) => onChange('mobileNo', e.target.value)} />
            </div>
          </div>
          <div className="aw-field">
            <label className="form-label">Address</label>
            <div className="aw-input-wrapper">
              <MapPin className="aw-input-icon" size={14} />
              <input className="form-input aw-input aw-input--with-icon" value={reference.address} onChange={(e) => onChange('address', e.target.value)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReferenceDetails() {
  const navigate = useNavigate();
  const { applicationId } = useParams();
  const appId = applicationId;
  const { getApplication, ensureApplication, saveApplication } = useApplicationDraftStore();
  const [form, setForm] = useState(() => buildReferenceState(getApplication(appId)));

  useEffect(() => {
    ensureApplication(appId);
  }, [appId, ensureApplication]);

  const appData = getApplication(appId);
  const ArrowLeftIcon = iconMap['ArrowLeft'];

  useEffect(() => {
    setForm(buildReferenceState(getApplication(appId)));
  }, [appId, getApplication]);

  const persist = (nextForm) => {
    setForm(nextForm);
    saveApplication(appId, buildSectionUpdate(appData, 'references', nextForm));
  };

  const updateReference = (scope, field, value) => {
    persist({
      ...form,
      [scope]: {
        ...form[scope],
        [field]: value,
      },
    });
  };

  const handleContinue = () => {
    saveApplication(appId, buildSectionUpdate(appData, 'references', form));
    navigate(ROUTES.SOURCING.replace(':applicationId', appId));
  };

  const handleBack = () => {
    navigate(ROUTES.COLLATERAL.replace(':applicationId', appId));
  };

  return (
    <WizardSectionLayout
      appId={appId}
      appData={appData}
      steps={APPLICATION_WIZARD_STEPS}
      activeStep={8}
      title="Step 8: Reference Details"
      subtitle="Capture two reference contacts exactly as required in the PDF."
      backLabel="Back to Collateral"
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
          Back to Collateral
        </Button>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
        <ReferenceCard
          title="REFERENCE 1"
          reference={form.reference1}
          onChange={(field, value) => updateReference('reference1', field, value)}
        />
        <ReferenceCard
          title="REFERENCE 2"
          reference={form.reference2}
          onChange={(field, value) => updateReference('reference2', field, value)}
        />
      </div>
    </WizardSectionLayout>
  );
}
