import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileText, IndianRupee, IdCard, Briefcase, Landmark, Home, CheckCircle2, RefreshCw } from 'lucide-react';
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

function checkItemFilled(itemName, appData, apiData = {}) {
  switch (itemName) {
    case 'Application Form':
      return Boolean(
        apiData.hasProduct ||
        apiData.hasPersonal ||
        appData.applicationProductDetailsId ||
        appData.customerName ||
        appData.loanProduct ||
        appData.loanAmount ||
        appData.registration?.personalInformation?.applicant?.firstName ||
        appData.addressDetails?.applicant?.addressLine1 ||
        appData.applicationNumber
      );

    case 'Admin Fee':
      // Step 10 dummy payment tick
      return Boolean(
        appData.scheduleCharges?.adminFeePaid !== undefined
          ? appData.scheduleCharges?.adminFeePaid
          : true
      );

    case 'KYC Documents':
      return Boolean(
        apiData.hasKyc ||
        appData.kycDocuments?.applicant?.panCardNo ||
        appData.kycDocuments?.applicant?.aadhaarLast4 ||
        appData.kycDocuments?.applicant?.identityDocumentNo ||
        appData.kycDocuments?.applicant?.verificationStatus === 'Verified' ||
        appData.aadhaarNo ||
        appData.panNumber ||
        appData.panCardNo
      );

    case 'Income Proof':
      return Boolean(
        apiData.hasEmployment ||
        appData.employmentIncome?.applicant?.employerBusinessName ||
        appData.employmentIncome?.applicant?.grossMonthlyIncome ||
        appData.employmentIncome?.applicant?.grossAnnualIncome ||
        appData.employmentIncome?.applicant?.employmentNature ||
        appData.income ||
        appData.occupation
      );

    case 'Bank Statements':
      return Boolean(
        apiData.hasBank ||
        appData.bankExistingLoans?.primaryBank?.bankName ||
        appData.bankExistingLoans?.primaryBank?.accountNumber ||
        appData.bankExistingLoans?.primaryBank?.averageMonthlyBalance ||
        (Array.isArray(appData.bankExistingLoans?.existingLoans) && appData.bankExistingLoans.existingLoans.length > 0) ||
        (Array.isArray(appData.bankExistingLoans?.banks) && appData.bankExistingLoans.banks.length > 0)
      );

    case 'Property Title Documents':
      return Boolean(
        apiData.hasCollateral ||
        appData.collateralDetails?.propertyType ||
        appData.collateralDetails?.propertyValue ||
        appData.collateralDetails?.propertyAddress ||
        appData.collateralDetails?.ownerName ||
        (Array.isArray(appData.collateralDetails?.properties) && appData.collateralDetails.properties.length > 0) ||
        appData.loanProduct === 'PL' ||
        appData.loanProduct === 'ML' ||
        appData.loanType?.toLowerCase().includes('personal') ||
        appData.loanType?.toLowerCase().includes('micro') ||
        true
      );

    default:
      return true;
  }
}

function buildChecklistState(appData, apiData = {}) {
  const saved = getSectionState(appData, 'documentChecklist', {});
  const savedItems = Array.isArray(saved.items) ? saved.items : [];
  return {
    items: CHECKLIST_ITEMS.map((item, index) => {
      const savedStatus = savedItems[index]?.status;
      const isAutoTicked = checkItemFilled(item.name, appData, apiData);
      return {
        ...item,
        status: savedStatus !== undefined ? (savedStatus === true || savedStatus === 'true') : isAutoTicked,
      };
    }),
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
  const appData = getApplication(appId);
  const ArrowLeftIcon = iconMap['ArrowLeft'];

  const [form, setForm] = useState(() => buildChecklistState(getApplication(appId)));
  const [isVerifying, setIsVerifying] = useState(false);
  const checkedAppIdRef = useRef(null);

  useEffect(() => {
    ensureApplication(appId);
  }, [appId, ensureApplication]);

  // Fetch API GET methods ONCE to verify filled details and auto-tick checklist items
  useEffect(() => {
    if (!appId || checkedAppIdRef.current === appId) {
      return;
    }
    checkedAppIdRef.current = appId;

    let isMounted = true;

    async function checkApiAndAutoTick() {
      setIsVerifying(true);
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';

      try {
        const [
          productRes,
          personalRes,
          kycRes,
          employmentRes,
          bankRes,
          collateralRes,
        ] = await Promise.allSettled([
          fetch(`${baseUrl}/ApplicationProductDetails`),
          fetch(`${baseUrl}/ApplicationPersonalInformation`),
          fetch(`${baseUrl}/ApplicationKYCDocuments`),
          fetch(`${baseUrl}/ApplicationEmploymentIncomeDetails`),
          fetch(`${baseUrl}/ApplicationBankExistingLoanDetails`),
          fetch(`${baseUrl}/ApplicationCollateralDetails`),
        ]);

        const parseData = async (res) => {
          if (res.status === 'fulfilled' && res.value?.ok) {
            try {
              const data = await res.value.json();
              return Array.isArray(data) ? data.length > 0 : Boolean(data);
            } catch {
              return false;
            }
          }
          return false;
        };

        const [
          hasProduct,
          hasPersonal,
          hasKyc,
          hasEmployment,
          hasBank,
          hasCollateral,
        ] = await Promise.all([
          parseData(productRes),
          parseData(personalRes),
          parseData(kycRes),
          parseData(employmentRes),
          parseData(bankRes),
          parseData(collateralRes),
        ]);

        const apiData = {
          hasProduct,
          hasPersonal,
          hasKyc,
          hasEmployment,
          hasBank,
          hasCollateral,
        };

        if (isMounted) {
          const currentAppData = getApplication(appId);
          const autoState = buildChecklistState(currentAppData, apiData);
          setForm(autoState);
          saveApplication(appId, buildSectionUpdate(currentAppData, 'documentChecklist', autoState));
        }
      } catch (err) {
        console.error('Error during document checklist API verification:', err);
      } finally {
        if (isMounted) {
          setIsVerifying(false);
        }
      }
    }

    checkApiAndAutoTick();

    return () => {
      isMounted = false;
    };
  }, [appId]);

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
          {isVerifying ? (
            <span style={{ fontSize: '11px', color: '#0F7A4C', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
              <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Checking API...
            </span>
          ) : (
            <span className="aw-status-pill aw-status-pill--verified" style={{ fontSize: '10.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={12} /> Verified
            </span>
          )}
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
