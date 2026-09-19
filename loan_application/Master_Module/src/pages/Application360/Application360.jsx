import { useState, useEffect, useMemo } from 'react';
import { 
  FileText, Users, ShieldCheck, DollarSign, Activity, Calculator,
  Search, AlertCircle, RefreshCw, Layers
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { searchApplicationFullDetailsByPan } from '../../api/application360Api';
import { buildApplicationDisplayId } from '../../../../Business_Modules/rm_modules/src/pages/applicationWizard/flowUtils';

// Master API imports for accurate label resolution
import { getLoanProducts } from '../../api/masters/loanProductApi';
import { getLoanPurposes } from '../../api/masters/loanPurposeApi';
import { getGenders } from '../../api/masters/genderApi';
import { getMaritalStatuses } from '../../api/masters/maritalStatusApi';
import { getEmploymentTypes } from '../../api/masters/employmentTypeApi';
import { getRelationships } from '../../api/masters/relationshipApi';
import { getBanks } from '../../api/masters/bankApi';
import { getBankBranches } from '../../api/masters/bankBranchApi';
import { getTitles } from '../../api/masters/titleApi';
import { getCastes } from '../../api/masters/casteApi';
import { getReligions } from '../../api/masters/religionApi';
import { getEducations } from '../../api/masters/educationApi';
import { getStates } from '../../api/masters/stateApi';
import { getCities } from '../../api/masters/cityApi';
import { getProperties } from '../../api/masters/propertyApi';
import { getPropertyUsages } from '../../api/masters/propertyUsageApi';
import { getAssessmentMethods } from '../../api/masters/assessmentMethodApi';
import { getDocumentTypes } from '../../api/masters/documentTypeApi';
import { getVerifications } from '../../api/masters/verificationApi';

// Subcomponents
import { ApplicationSearch } from './components/ApplicationSearch';
import { ApplicationSummaryHeader } from './components/ApplicationSummaryHeader';
import { OverviewTab } from './components/OverviewTab';
import { ApplicantsTab } from './components/ApplicantsTab';
import { KycDocumentsTab } from './components/KycDocumentsTab';
import { FinancialTab } from './components/FinancialTab';
import { VerificationTab } from './components/VerificationTab';
import { EligibilityTab } from './components/EligibilityTab';

import './Application360.css';

const TABS = [
  { id: 'overview', label: 'Overview', icon: Layers },
  { id: 'applicants', label: 'Applicants', icon: Users },
  { id: 'kyc', label: 'KYC & Documents', icon: ShieldCheck },
  { id: 'financial', label: 'Financials & Collateral', icon: DollarSign },
  { id: 'verification', label: 'Verifications & Checks', icon: Activity },
  { id: 'eligibility', label: 'Eligibility & Underwriting', icon: Calculator },
];

export function Application360() {
  const [currentPan, setCurrentPan] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [applicationData, setApplicationData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [masterLookups, setMasterLookups] = useState({
    loanProducts: {},
    loanPurposes: {},
    genders: {},
    maritalStatuses: {},
    employmentTypes: {},
    relationships: {},
    banks: {},
    bankBranches: {},
    titles: {},
    castes: {},
    religions: {},
    educations: {},
    states: {},
    cities: {},
    properties: {},
    propertyUsages: {},
    assessmentMethods: {},
    documentTypes: {},
    verifications: {},
  });

  // Pre-fetch all supporting masters in parallel
  useEffect(() => {
    let isMounted = true;

    async function loadMasterLookups() {
      try {
        const results = await Promise.allSettled([
          getLoanProducts(),
          getLoanPurposes(),
          getGenders(),
          getMaritalStatuses(),
          getEmploymentTypes(),
          getRelationships(),
          getBanks(),
          getBankBranches(),
          getTitles(),
          getCastes(),
          getReligions(),
          getEducations(),
          getStates(),
          getCities(),
          getProperties(),
          getPropertyUsages(),
          getAssessmentMethods(),
          getDocumentTypes(),
          getVerifications()
        ]);

        if (!isMounted) return;

        const toMap = (res, idKey, nameKey) => {
          if (res.status !== 'fulfilled' || !res.value) return {};
          const items = Array.isArray(res.value) ? res.value : (res.value.data || res.value.value || []);
          const map = {};
          items.forEach(item => {
            const id = item[idKey] || item.id;
            const name = item[nameKey] || item.name || item.title || item.label || item.verificationName || item.typeName;
            if (id !== undefined && name !== undefined) {
              map[id] = name;
            }
          });
          return map;
        };

        setMasterLookups({
          loanProducts: toMap(results[0], 'loanProductId', 'loanProductName'),
          loanPurposes: toMap(results[1], 'loanPurposeId', 'loanPurposeName'),
          genders: toMap(results[2], 'genderId', 'genderName'),
          maritalStatuses: toMap(results[3], 'maritalStatusId', 'maritalStatusName'),
          employmentTypes: toMap(results[4], 'employmentTypeId', 'employmentTypeName'),
          relationships: toMap(results[5], 'relationshipId', 'relationshipName'),
          banks: toMap(results[6], 'bankId', 'bankName'),
          bankBranches: toMap(results[7], 'bankBranchId', 'branchName'),
          titles: toMap(results[8], 'titleId', 'titleName'),
          castes: toMap(results[9], 'casteId', 'casteName'),
          religions: toMap(results[10], 'religionId', 'religionName'),
          educations: toMap(results[11], 'educationId', 'educationName'),
          states: toMap(results[12], 'stateId', 'stateName'),
          cities: toMap(results[13], 'cityId', 'cityName'),
          properties: toMap(results[14], 'propertyId', 'propertyName'),
          propertyUsages: toMap(results[15], 'propertyUsageId', 'propertyUsageName'),
          assessmentMethods: toMap(results[16], 'assessmentMethodMasterId', 'assessmentMethodName'),
          documentTypes: toMap(results[17], 'documentTypeId', 'documentTypeName'),
          verifications: toMap(results[18], 'verificationId', 'verificationName')
        });
      } catch {
        // Non-blocking lookup initialization
      }
    }

    loadMasterLookups();
    return () => { isMounted = false; };
  }, []);

  // Canonical Applicant Normalizer
  const normalizedData = useMemo(() => {
    if (!applicationData) return null;

    const rawPersonal = applicationData.personalInformation;
    let personalList = Array.isArray(rawPersonal) ? rawPersonal : (rawPersonal ? [rawPersonal] : []);
    
    // If personalInformation is empty, fallback to synthesize primary person from customer
    if (personalList.length === 0 && (applicationData.customer || applicationData.firstName)) {
      personalList = [{
        firstName: applicationData.customer?.firstName || applicationData.firstName,
        lastName: applicationData.customer?.lastName || applicationData.lastName,
        fullName: applicationData.customer?.fullName || applicationData.fullName,
        mobileNumber: applicationData.customer?.mobileNumber || applicationData.mobileNumber,
        emailId: applicationData.customer?.email || applicationData.email,
        dateOfBirth: applicationData.customer?.dateOfBirth,
        genderId: applicationData.customer?.genderId,
        maritalStatusId: applicationData.customer?.maritalStatusId,
      }];
    }

    const addressList = Array.isArray(applicationData.addressDetails) ? applicationData.addressDetails : [];
    const empList = Array.isArray(applicationData.employmentIncome) ? applicationData.employmentIncome : [];
    const bankList = Array.isArray(applicationData.bankExistingLoans) ? applicationData.bankExistingLoans : [];
    const kycList = Array.isArray(applicationData.kycDocuments) ? applicationData.kycDocuments : [];

    // Map each personalInformation record to its relational tree
    const normalizedApplicants = personalList.map((person, index) => {
      const isPrimary = index === 0;
      const personalId = person.personalInformationId;
      const kycDocId = person.applicationKYCDocumentId;

      // 1. Relational Address Resolution
      const addresses = addressList.filter(a => {
        if (personalId && a.personalInformationId === personalId) return true;
        if (isPrimary && (!a.personalInformationId || a.personalInformationId === 0)) return true;
        return false;
      });
      const addressIds = new Set(addresses.map(a => a.addressDetailsId || a.applicationAddressDetailsId).filter(Boolean));

      // 2. Relational Employment Resolution
      const employments = empList.filter(e => {
        if (e.applicationAddressDetailsId && addressIds.has(e.applicationAddressDetailsId)) return true;
        if (personalId && e.personalInformationId === personalId) return true;
        if (isPrimary && !e.applicationAddressDetailsId && !e.personalInformationId) return true;
        return false;
      });
      const empIds = new Set(employments.map(e => e.employmentIncomeId || e.applicationEmploymentIncomeDetailsId).filter(Boolean));

      // 3. Relational Bank Resolution
      const banks = bankList.filter(b => {
        if (b.applicationEmploymentIncomeDetailsId && empIds.has(b.applicationEmploymentIncomeDetailsId)) return true;
        if (personalId && b.personalInformationId === personalId) return true;
        if (isPrimary && !b.applicationEmploymentIncomeDetailsId && !b.personalInformationId) return true;
        return false;
      });

      // 4. Relational Identity KYC vs Supplemental KYC Resolution
      let identityKyc = null;
      if (kycDocId) {
        identityKyc = kycList.find(k => k.applicationKYCDocumentId === kycDocId);
      }
      if (!identityKyc && isPrimary) {
        identityKyc = kycList.find(k => (k.applicantSequence === 0 || k.applicantSequence === '0' || k.applicantSequence === null || k.applicantSequence === undefined) && (k.panCardPath || k.aadharDocumentPath || k.profileImagePath || k.panCardNo));
      }

      // Supplemental KYC documents attached to this applicant sequence
      const supplementalKyc = kycList.filter(k => {
        if (identityKyc && k.applicationKYCDocumentId === identityKyc.applicationKYCDocumentId) return false;
        if (k.applicantSequence !== undefined && k.applicantSequence !== null && Number(k.applicantSequence) === index) return true;
        return false;
      });

      return {
        sequence: index,
        label: isPrimary ? 'Primary Applicant' : `Co-Applicant ${index}`,
        person,
        identityKyc,
        supplementalKyc,
        addresses,
        employments,
        banks,
      };
    });

    // 5. PAN Resolution Logic
    let resolvedPan = '—';
    const cleanSearched = (currentPan || '').trim().toUpperCase();

    const matchingKyc = kycList.find(k => k.panCardNo && k.panCardNo.trim().toUpperCase() === cleanSearched);
    const matchingPerson = personalList.find(p => (p.panNumber || p.panCardNo || '').trim().toUpperCase() === cleanSearched);

    if (matchingKyc) {
      resolvedPan = matchingKyc.panCardNo.trim().toUpperCase();
    } else if (matchingPerson) {
      resolvedPan = (matchingPerson.panNumber || matchingPerson.panCardNo).trim().toUpperCase();
    } else if (normalizedApplicants[0]?.identityKyc?.panCardNo) {
      resolvedPan = normalizedApplicants[0].identityKyc.panCardNo.trim().toUpperCase();
    } else if (normalizedApplicants[0]?.person?.panNumber || normalizedApplicants[0]?.person?.panCardNo) {
      resolvedPan = (normalizedApplicants[0].person.panNumber || normalizedApplicants[0].person.panCardNo).trim().toUpperCase();
    }

    // 6. Application Display ID Resolution
    const primaryPerson = normalizedApplicants[0]?.person || {};
    const rawAppId = applicationData.agentCustomerId || applicationData.customer?.agentCustomerId || applicationData.applicationProductDetailsId || '';
    const recordForDisplayId = {
      ...applicationData.customer,
      ...applicationData,
      applicant: primaryPerson,
      firstName: primaryPerson.firstName || applicationData.customer?.firstName || applicationData.customer?.fullName || applicationData.firstName || '',
      mobileNumber: primaryPerson.mobileNumber || applicationData.customer?.mobileNumber || applicationData.mobileNumber || '',
      applicationDate: applicationData.customer?.createdAt || applicationData.createdAt || applicationData.customer?.createdDate || '',
      createdAt: applicationData.customer?.createdAt || applicationData.createdAt || '',
    };
    const displayApplicationId = buildApplicationDisplayId(recordForDisplayId, `APP-${rawAppId}`);

    return {
      normalizedApplicants,
      resolvedPan,
      displayApplicationId,
      rawApplicationId: rawAppId ? `APP-${rawAppId}` : '',
    };
  }, [applicationData, currentPan]);

  const handleSearch = async (pan) => {
    setCurrentPan(pan);
    setIsLoading(true);
    setError('');

    try {
      const data = await searchApplicationFullDetailsByPan(pan);
      if (!data || (!data.customer && !data.agentCustomerId && !data.personalInformation)) {
        setApplicationData(null);
        setError(`No active application found matching PAN "${pan}".`);
        toast.error(`No application found for PAN ${pan}`);
      } else {
        setApplicationData(data);
        setError('');
        toast.success(`Application loaded for PAN ${pan}`);
      }
    } catch (err) {
      setApplicationData(null);
      const statusCode = err.response?.status;
      if (statusCode === 404) {
        setError(`No application found matching PAN "${pan}".`);
      } else {
        const errorMsg = err.response?.data?.message || err.message || 'Failed to fetch application details.';
        setError(errorMsg);
      }
      toast.error(`Search failed: ${err.response?.data?.message || 'Application not found'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setCurrentPan('');
    setApplicationData(null);
    setError('');
  };

  return (
    <div className="app360-container">
      {/* Top Header */}
      <div className="app360-header">
        <div className="app360-header-left">
          <span className="eyebrow">ADMINISTRATIVE INTELLIGENCE</span>
          <h1 className="app360-title">Application 360</h1>
          <p className="app360-description">
            Comprehensive single-pane lookup for end-to-end customer, underwriting, document, and ownership details.
          </p>
        </div>
      </div>

      {/* PAN Search Bar */}
      <ApplicationSearch
        onSearch={handleSearch}
        onClear={handleClear}
        isLoading={isLoading}
        currentPan={currentPan}
      />

      {/* Error Message */}
      {error && !isLoading && (
        <div className="app360-error-banner">
          <AlertCircle size={18} className="app360-error-icon" />
          <div className="app360-error-text">
            <strong>Application Lookup Notice</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Data Loaded Display */}
      {applicationData && normalizedData && !isLoading && (
        <div className="app360-content-wrap">
          {/* Top Summary Header */}
          <ApplicationSummaryHeader
            data={applicationData}
            displayApplicationId={normalizedData.displayApplicationId}
            rawApplicationId={normalizedData.rawApplicationId}
            resolvedPan={normalizedData.resolvedPan}
            primaryApplicant={normalizedData.normalizedApplicants[0]}
          />

          {/* Tab Navigation */}
          <div className="app360-tabs-nav">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`app360-tab-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="app360-tab-content">
            {activeTab === 'overview' && (
              <OverviewTab
                data={applicationData}
                displayApplicationId={normalizedData.displayApplicationId}
                rawApplicationId={normalizedData.rawApplicationId}
                resolvedPan={normalizedData.resolvedPan}
                masterLookups={masterLookups}
              />
            )}
            {activeTab === 'applicants' && (
              <ApplicantsTab
                applicants={normalizedData.normalizedApplicants}
                masterLookups={masterLookups}
              />
            )}
            {activeTab === 'kyc' && (
              <KycDocumentsTab
                applicants={normalizedData.normalizedApplicants}
                documents={applicationData.documents || []}
                masterLookups={masterLookups}
              />
            )}
            {activeTab === 'financial' && (
              <FinancialTab
                data={applicationData}
                masterLookups={masterLookups}
              />
            )}
            {activeTab === 'verification' && (
              <VerificationTab
                data={applicationData}
                masterLookups={masterLookups}
              />
            )}
            {activeTab === 'eligibility' && (
              <EligibilityTab
                data={applicationData}
                masterLookups={masterLookups}
              />
            )}
          </div>
        </div>
      )}

      {/* Initial Empty State when no search has occurred */}
      {!applicationData && !error && !isLoading && (
        <div className="app360-empty-placeholder">
          <div className="app360-placeholder-icon">
            <Search size={36} />
          </div>
          <h3>Enter a PAN to View Application 360</h3>
          <p>
            Lookup full applicant profiles, co-applicants, verified documents, collateral, field investigations, and underwriting calculations.
          </p>
          <div className="app360-sample-hints">
            <span>Format: 5 letters, 4 digits, 1 letter</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default Application360;
