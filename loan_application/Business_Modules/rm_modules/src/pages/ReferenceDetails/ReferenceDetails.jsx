import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User, Users, Phone, MapPin } from 'lucide-react';
import iconMap from '../../config/iconMap';
import Button from '../../components/Button/Button';
import Select from '../../components/Select/Select';
import { ROUTES } from '../../config/routeConfig';
import { APPLICATION_WIZARD_STEPS } from '../../config/applicationWizard';
import { useApplicationDraftStore } from '../../state/ApplicationDraftContext';
import WizardSectionLayout from '../../components/WizardSectionLayout/WizardSectionLayout';
import ErrorPopup from '../../components/ErrorPopup/ErrorPopup';
import { buildSectionUpdate, getSectionState } from '../applicationWizard/flowUtils';

function buildReferenceState(appData) {
  const saved = getSectionState(appData, 'references', {});
  const createReference = (source = {}) => ({
    applicationReferenceDetailsId: source.applicationReferenceDetailsId || null,
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

function ReferenceCard({ 
  title, 
  reference, 
  onChange,
  relationshipOptions = [],
  isLoadingMasters = false
}) {
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
            <label className="form-label">Name</label>
            <div className="aw-input-wrapper">
              <User className="aw-input-icon" size={14} />
              <input className="form-input aw-input aw-input--with-icon" value={reference.fullName} onChange={(e) => onChange('fullName', e.target.value)} />
            </div>
          </div>
          <div className="aw-field">
            <label className="form-label">Relationship</label>
            <div className="aw-input-wrapper">
              <Select
                value={reference.relationship}
                onChange={(val) => onChange('relationship', val)}
                placeholder={isLoadingMasters ? "Loading..." : "Select Relationship"}
                options={relationshipOptions}
                disabled={isLoadingMasters}
                icon={<Users size={14} />}
              />
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
  const [errorPopup, setErrorPopup] = useState(null);

  const [isLoadingMasters, setIsLoadingMasters] = useState(false);
  const [relationshipOptions, setRelationshipOptions] = useState([]);

  useEffect(() => {
    async function loadMasters() {
      setIsLoadingMasters(true);
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';
        const res = await fetch(`${baseUrl}/RelationshipMaster`);
        if (res.ok) {
          const data = await res.json();
          setRelationshipOptions(data.map(item => ({ value: item.relationshipId, label: item.relationshipName, raw: item })));
        }
      } catch (e) {
        console.error('Failed to fetch RelationshipMaster:', e);
      }
      setIsLoadingMasters(false);
    }
    loadMasters();
  }, []);

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

  const handleContinue = async () => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';
    const prodId = appData.applicationProductDetailsId;

    if (!prodId) {
      console.warn('No Application Product Details ID found, skipping Reference API save');
    } else {
      try {
        const references = [
          { key: 'reference1', data: form.reference1 },
          { key: 'reference2', data: form.reference2 }
        ];

        for (const ref of references) {
          if (!ref.data.fullName) continue; // Skip if no reference provided

          const isUpdate = !!ref.data.applicationReferenceDetailsId;
          const url = isUpdate
            ? `${baseUrl}/ApplicationReferenceDetails/${ref.data.applicationReferenceDetailsId}`
            : `${baseUrl}/ApplicationReferenceDetails`;

          const payload = {
            ApplicationProductDetailsId: Number(prodId),
            FullName: ref.data.fullName || '',
            RelationshipId: Number(ref.data.relationship) || 0,
            MobileNumber: ref.data.mobileNo || '',
            Address: ref.data.address || '',
            CreatedBy: 1
          };

          if (isUpdate) {
            payload.ApplicationReferenceDetailsId = Number(ref.data.applicationReferenceDetailsId);
          }

          const response = await fetch(url, {
            method: isUpdate ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            throw new Error(`Failed to save ${ref.key}: ${response.statusText}`);
          }

          let savedData = null;
          if (response.status !== 204) {
            const text = await response.text();
            if (text) { try { savedData = JSON.parse(text); } catch (e) { /* ignore */ } }
          }
          
          const savedId = savedData?.applicationReferenceDetailsId || savedData?.ApplicationReferenceDetailsId;
          if (savedId) {
            form[ref.key].applicationReferenceDetailsId = savedId;
          }
        }
      } catch (err) {
        console.error('Error saving Reference Details:', err);
        setErrorPopup({
          title: 'Connection error',
          message: 'Network error while saving reference details. Please try again.',
          variant: 'error',
        });
        return; // Halt continuation on error
      }
    }

    saveApplication(appId, buildSectionUpdate(appData, 'references', form));
    navigate(ROUTES.SOURCING.replace(':applicationId', appId));
  };

  const handleBack = () => {
    navigate(ROUTES.COLLATERAL.replace(':applicationId', appId));
  };

  return (
    <>
      <ErrorPopup
        show={!!errorPopup}
        title={errorPopup?.title}
        message={errorPopup?.message}
        details={errorPopup?.details}
        variant={errorPopup?.variant}
        onClose={() => setErrorPopup(null)}
      />
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
          relationshipOptions={relationshipOptions}
          isLoadingMasters={isLoadingMasters}
        />
        <ReferenceCard
          title="REFERENCE 2"
          reference={form.reference2}
          onChange={(field, value) => updateReference('reference2', field, value)}
          relationshipOptions={relationshipOptions}
          isLoadingMasters={isLoadingMasters}
        />
      </div>
    </WizardSectionLayout>
    </>
  );
}
