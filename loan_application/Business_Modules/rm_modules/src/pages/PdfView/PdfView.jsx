import React, { useRef, useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useApplicationDraftStore } from '../../state/ApplicationDraftContext';
import { ROUTES } from '../../config/routeConfig';
import { getApplicantCount } from '../applicationWizard/flowUtils';
import Button from '../../components/Button/Button';
import ErrorPopup from '../../components/ErrorPopup/ErrorPopup';
import { formatDateTime, toIstDateInput } from '../../utils/dateHelper';
import { buildApplicationDisplayId } from '../applicationWizard/flowUtils';
import './PdfView.css';
import LogoImage from '../../assets/logo/Navbar_logo/Logo.jpg';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';

function composeFullName(person = {}) {
  return [person.firstName, person.middleName, person.lastName]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' ');
}

function isObsoleteMock(val) {
  if (!val) return true;
  const s = String(val).trim().toLowerCase();
  return (
    s === 'anil kumar' ||
    s === 'karthik raja' ||
    s === 'rajesh kumar' ||
    s === 'dineshkumar' ||
    s === 'dinesh kumar' ||
    s === '2025-06-06' ||
    s === '06-06-2025'
  );
}

export default function PdfView() {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { applications, getApplication, loadApplicationFromBackend } = useApplicationDraftStore();
  const appData = applications[applicationId] || getApplication(applicationId) || {};
  const applicationDisplayId = buildApplicationDisplayId(appData, applicationId);
  const pdfRef = useRef();

  const [liveCustomer, setLiveCustomer] = useState(null);
  const [liveRM, setLiveRM] = useState(null);
  const [liveEmployment, setLiveEmployment] = useState(null);
  const [downloadedDocs, setDownloadedDocs] = useState([]);
  const [masterMaps, setMasterMaps] = useState({
    sourcingChannels: {},
    loanProducts: {},
    loanPurposes: {},
    titles: {},
    genders: {},
    castes: {},
    religions: {},
    maritalStatuses: {},
    relationships: {},
    documentTypes: {},
    verifications: {},
    banks: {},
    properties: {},
    propertyUsages: {},
    employmentTypes: {},
    educations: {},
    cities: {},
    states: {},
  });

  const blobUrlsRef = useRef([]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      });
      blobUrlsRef.current = [];
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadAllData() {
      try {
        // Hydrate full application data into draft context first
        try {
          await loadApplicationFromBackend(applicationId);
        } catch (hErr) {
          console.warn('Hydration in PdfView:', hErr);
        }

        const fetchMaster = async (endpoint, idField, nameField) => {
          try {
            const res = await fetch(`${API_BASE}/${endpoint}`);
            if (res.ok) {
              const data = await res.json();
              const rows = Array.isArray(data) ? data : (Array.isArray(data?.value) ? data.value : []);
              const map = {};
              rows.forEach((r) => {
                const id = r[idField];
                const name = r[nameField];
                if (id !== undefined) map[id] = name;
              });
              return map;
            }
          } catch {
            return {};
          }
          return {};
        };

        const [
          custRes,
          rmRes,
          sourcingMap,
          prodMap,
          purposeMap,
          titleMap,
          casteMap,
          genderMap,
          maritalMap,
          relMap,
          religionMap,
          docTypeMap,
          verifMap,
          bankMap,
          propertyMap,
          propertyUsageMap,
          empTypeMap,
          eduMap,
          cityMap,
          stateMap,
          empDetailsRes,
          addrDetailsRes,
          persInfoRes,
        ] = await Promise.allSettled([
          fetch(`${API_BASE}/AgentAddCustomer/${applicationId}`).then((r) => (r.ok ? r.json() : null)),
          fetch(`${API_BASE}/RMMaster`).then((r) => (r.ok ? r.json() : null)),
          fetchMaster('SourcingChannelMaster', 'sourcingChannelId', 'sourcingChannelName'),
          fetchMaster('LoanProductMaster', 'loanProductId', 'productName'),
          fetchMaster('LoanPurposeMaster', 'loanPurposeId', 'purposeName'),
          fetchMaster('TitleMaster', 'titleID', 'titleName'),
          fetchMaster('masters/CasteMaster', 'casteId', 'casteName'),
          fetchMaster('gender', 'genderId', 'genderName'),
          fetchMaster('marital-status', 'maritalStatusId', 'maritalStatusName'),
          fetchMaster('RelationshipMaster', 'relationshipId', 'relationshipName'),
          fetchMaster('masters/ReligionMaster', 'religionId', 'religionName'),
          fetchMaster('DocumentTypeMaster', 'documentTypeId', 'documentTypeName'),
          fetchMaster('VerificationMaster', 'verificationId', 'verificationName'),
          fetchMaster('masters/bank/active', 'bankId', 'bankName'),
          fetchMaster('PropertyMaster', 'propertyId', 'propertyName'),
          fetchMaster('PropertyUsageMaster', 'propertyUsageId', 'propertyUsageName'),
          fetchMaster('EmploymentType', 'employmentTypeId', 'employmentTypeName'),
          fetchMaster('EducationMaster', 'educationId', 'educationName'),
          fetchMaster('City', 'cityId', 'cityName'),
          fetchMaster('State', 'stateId', 'stateName'),
          fetch(`${API_BASE}/ApplicationEmploymentIncomeDetails`).then((r) => (r.ok ? r.json() : null)),
          fetch(`${API_BASE}/ApplicationAddressDetails`).then((r) => (r.ok ? r.json() : null)),
          fetch(`${API_BASE}/ApplicationPersonalInformation`).then((r) => (r.ok ? r.json() : null)),
        ]);

        let resolvedCustomerId = applicationId;

        if (active) {
          let currentCust = null;
          if (custRes.status === 'fulfilled' && custRes.value) {
            const data = custRes.value;
            const record = Array.isArray(data) ? data[0] : (data?.value ? data.value[0] : data);
            if (record) {
              setLiveCustomer(record);
              currentCust = record;
              resolvedCustomerId = record.agentCustomerId || record.AgentCustomerId || applicationId;
            }
          }

          if (empDetailsRes.status === 'fulfilled' && empDetailsRes.value) {
            console.log('RAW Employment & Income API Response:', empDetailsRes.value);
            const empList = Array.isArray(empDetailsRes.value) ? empDetailsRes.value : [];
            const addrList = addrDetailsRes.status === 'fulfilled' && Array.isArray(addrDetailsRes.value) ? addrDetailsRes.value : [];
            const persList = persInfoRes.status === 'fulfilled' && Array.isArray(persInfoRes.value) ? persInfoRes.value : [];

            const custName = (currentCust?.fullName || currentCust?.customerName || appData?.customerName || '').toLowerCase();
            const custMobile = currentCust?.mobileNumber || currentCust?.mobile || appData?.mobile || '';

            const matchedPers = persList.find((p) =>
              (custMobile && p.mobileNumber === custMobile) ||
              (custName && (p.firstName?.toLowerCase() === custName || p.lastName?.toLowerCase() === custName))
            );

            let matchedAddrId = null;
            if (matchedPers) {
              const matchedAddr = addrList.find((a) => a.personalInformationId === matchedPers.personalInformationId);
              if (matchedAddr) matchedAddrId = matchedAddr.applicationAddressDetailsId;
            }

            const matchedEmp = (matchedAddrId && empList.find((e) => e.applicationAddressDetailsId === matchedAddrId)) ||
              (appData.employmentIncome?.applicant?.employmentIncomeDetailsId && empList.find(e => e.applicationEmploymentIncomeDetailsId === appData.employmentIncome.applicant.employmentIncomeDetailsId)) ||
              empList[empList.length - 1];

            if (matchedEmp) {
              const liveEmpObj = {
                applicant: {
                  employerBusinessName: matchedEmp.employerBusinessName || '',
                  employerName: matchedEmp.employerBusinessName || '',
                  designationNatureOfBusiness: matchedEmp.designationNatureOfBusiness || '',
                  designation: matchedEmp.designationNatureOfBusiness || '',
                  employmentNature: matchedEmp.employmentTypeId,
                  employmentType: matchedEmp.employmentTypeId,
                  employmentTypeId: matchedEmp.employmentTypeId,
                  qualification: matchedEmp.educationId,
                  educationId: matchedEmp.educationId,
                  industryType: matchedEmp.industryType || '',
                  totalExperienceYears: matchedEmp.totalExperience,
                  totalExperience: matchedEmp.totalExperience,
                  grossMonthlyIncome: matchedEmp.grossMonthlyIncome,
                  otherIncomeMonthly: matchedEmp.otherMonthlyIncome,
                  otherMonthlyIncome: matchedEmp.otherMonthlyIncome,
                  netMonthlyIncome: matchedEmp.netMonthlyIncome,
                  grossAnnualIncome: matchedEmp.grossAnnualIncome,
                }
              };
              setLiveEmployment(liveEmpObj);
              console.log('TRANSFORMED liveEmployment object:', liveEmpObj);
            }
          }

          if (rmRes.status === 'fulfilled' && rmRes.value) {
            const data = rmRes.value;
            const rows = Array.isArray(data) ? data : (Array.isArray(data?.value) ? data.value : []);
            const matched = rows.find((r) => r.isActive !== false) || rows[0];
            if (matched) {
              setLiveRM({
                name: matched.fullName || matched.name || '',
                employeeId: matched.rmCode || (matched.rmId ? `RM${String(matched.rmId).padStart(3, '0')}` : ''),
              });
            }
          }

          setMasterMaps({
            sourcingChannels: sourcingMap.status === 'fulfilled' ? sourcingMap.value : {},
            loanProducts: prodMap.status === 'fulfilled' ? prodMap.value : {},
            loanPurposes: purposeMap.status === 'fulfilled' ? purposeMap.value : {},
            titles: titleMap.status === 'fulfilled' ? titleMap.value : {},
            genders: genderMap.status === 'fulfilled' ? genderMap.value : {},
            castes: casteMap.status === 'fulfilled' ? casteMap.value : {},
            religions: religionMap.status === 'fulfilled' ? religionMap.value : {},
            maritalStatuses: maritalMap.status === 'fulfilled' ? maritalMap.value : {},
            relationships: relMap.status === 'fulfilled' ? relMap.value : {},
            documentTypes: docTypeMap.status === 'fulfilled' ? docTypeMap.value : {},
            verifications: verifMap.status === 'fulfilled' ? verifMap.value : {},
            banks: bankMap.status === 'fulfilled' ? bankMap.value : {},
            properties: propertyMap.status === 'fulfilled' ? propertyMap.value : {},
            propertyUsages: propertyUsageMap.status === 'fulfilled' ? propertyUsageMap.value : {},
            employmentTypes: empTypeMap.status === 'fulfilled' ? empTypeMap.value : {},
            educations: eduMap.status === 'fulfilled' ? eduMap.value : {},
            cities: cityMap.status === 'fulfilled' ? cityMap.value : {},
            states: stateMap.status === 'fulfilled' ? stateMap.value : {},
          });
        }

        // Fetch and download actual uploaded customer documents
        try {
          const headers = {};
          const token = localStorage.getItem('authToken');
          if (token) headers['Authorization'] = `Bearer ${token}`;

          const candidateIds = [resolvedCustomerId, applicationId, appData.agentCustomerId, 8].filter(Boolean);
          const uniqueCandidateIds = [...new Set(candidateIds)];

          let activeDocs = [];

          for (const candId of uniqueCandidateIds) {
            try {
              const res = await fetch(`${API_BASE}/AgentCustomerDocument/bycustomer/${candId}`, { headers });
              if (res.ok) {
                const docData = await res.json();
                const docList = Array.isArray(docData) ? docData : (docData?.data || docData?.value || docData?.items || []);
                const filtered = docList.filter((d) => d.isActive !== false);
                if (filtered.length > 0) {
                  activeDocs = filtered;
                  break;
                }
              }
            } catch {
              // try next
            }
          }

          if (activeDocs.length > 0) {
            const loaded = await Promise.all(
              activeDocs.map(async (doc) => {
                const docId = doc.agentCustomerDocumentId || doc.id;
                const fileName = doc.fileName || '';
                const ext = fileName.split('.').pop()?.toLowerCase();
                const isPdf = ext === 'pdf';

                try {
                  const dlRes = await fetch(`${API_BASE}/AgentCustomerDocument/download/${docId}`, { headers });
                  if (dlRes.ok) {
                    const rawBlob = await dlRes.blob();
                    let mimeType = 'application/octet-stream';
                    if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
                    else if (ext === 'png') mimeType = 'image/png';
                    else if (ext === 'pdf') mimeType = 'application/pdf';
                    else if (ext === 'webp') mimeType = 'image/webp';
                    else if (rawBlob.type && rawBlob.type !== 'application/octet-stream') mimeType = rawBlob.type;

                    const typedBlob = new Blob([rawBlob], { type: mimeType });
                    const previewUrl = URL.createObjectURL(typedBlob);
                    blobUrlsRef.current.push(previewUrl);

                    return {
                      agentCustomerDocumentId: docId,
                      documentTypeName: doc.documentTypeName || doc.documentType || '',
                      fileName,
                      fileType: isPdf ? 'pdf' : 'image',
                      previewUrl,
                    };
                  }
                } catch (dlErr) {
                  console.error('Error downloading document for PDF View:', dlErr);
                }

                return {
                  agentCustomerDocumentId: docId,
                  documentTypeName: doc.documentTypeName || doc.documentType || '',
                  fileName,
                  fileType: isPdf ? 'pdf' : 'image',
                  previewUrl: null,
                };
              })
            );

            if (active && loaded.length > 0) {
              setDownloadedDocs(loaded);
            }
          }
        } catch (docErr) {
          console.error('Failed to load customer documents for PDF View:', docErr);
        }
      } catch (err) {
        console.error('Error fetching PDF preview data:', err);
      }
    }

    loadAllData();

    return () => {
      active = false;
    };
  }, [applicationId]);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [errorPopup, setErrorPopup] = useState(null);

  // Generate continuous single long page PDF
  const handleDownloadPdf = async () => {
    if (!pdfRef.current || isGeneratingPdf) return;
    setIsGeneratingPdf(true);

    try {
      const element = pdfRef.current;

      // Ensure images are fully loaded before rendering canvas
      const imgElements = element.querySelectorAll('img');
      await Promise.all(
        Array.from(imgElements).map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        })
      );

      const fullHeight = element.scrollHeight || element.offsetHeight || 3000;
      const fullWidth = element.scrollWidth || element.offsetWidth || 820;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: fullWidth,
        height: fullHeight,
        windowWidth: fullWidth,
        windowHeight: fullHeight,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc) => {
          const clonedContainer = clonedDoc.querySelector('.pdf-container');
          if (clonedContainer) {
            clonedContainer.style.height = 'auto';
            clonedContainer.style.maxHeight = 'none';
            clonedContainer.style.overflow = 'visible';
            clonedContainer.style.position = 'static';
            clonedContainer.style.display = 'block';
          }
          const clonedPage = clonedDoc.querySelector('.pdf-page-continuous');
          if (clonedPage) {
            clonedPage.style.height = 'auto';
            clonedPage.style.maxHeight = 'none';
            clonedPage.style.overflow = 'visible';
            clonedPage.style.position = 'static';
            clonedPage.style.display = 'block';
          }
        },
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);

      const pdfWidth = 210; // 210mm
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pdfWidth, pdfHeight],
        compress: true,
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      pdf.save(`Loan_Application_${applicationId}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setErrorPopup({
        title: 'PDF generation failed',
        message: 'Failed to generate PDF. Please try again.',
        variant: 'error',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Master resolvers
  const resolveSourcingChannel = (val) => masterMaps.sourcingChannels[val] || val || '';
  const resolveLoanProduct = (val) => masterMaps.loanProducts[val] || appData.loanProductDisplay || val || '';
  const resolveLoanPurpose = (val) => masterMaps.loanPurposes[val] || appData.loanType || val || '';
  const resolveTitle = (val) => masterMaps.titles[val] || val || '';
  const resolveGender = (val) => masterMaps.genders[val] || val || '';
  const resolveCategory = (val) => masterMaps.castes[val] || val || '';
  const resolveReligion = (val) => masterMaps.religions[val] || val || '';
  const resolveMaritalStatus = (val) => masterMaps.maritalStatuses[val] || val || '';
  const resolveRelationship = (val) => masterMaps.relationships[val] || val || '';
  const resolveDocType = (val) => masterMaps.documentTypes[val] || val || '';
  const resolveVerification = (val) => masterMaps.verifications[val] || val || 'Verified';
  const resolveBank = (val) => (masterMaps.banks && masterMaps.banks[val]) || val || '';
  const resolveProperty = (val) => (masterMaps.properties && masterMaps.properties[val]) || val || '';
  const resolvePropertyUsage = (val) => (masterMaps.propertyUsages && masterMaps.propertyUsages[val]) || val || '';
  const resolveEmploymentType = (val) => (masterMaps.employmentTypes && masterMaps.employmentTypes[val]) || val || '';
  const resolveEducation = (val) => (masterMaps.educations && masterMaps.educations[val]) || val || '';
  const resolveCity = (val) => (masterMaps.cities && masterMaps.cities[val]) || val || '';
  const resolveState = (val) => (masterMaps.states && masterMaps.states[val]) || val || '';

  const formatCurrencyOrDash = (val) => {
    if (val === null || val === undefined || val === '') return '-';
    const num = Number(val);
    if (isNaN(num)) return val;
    return `Rs. ${num.toLocaleString('en-IN')}`;
  };

  const formatExperience = (exp) => {
    if (exp === null || exp === undefined || exp === '') return '-';
    const num = Number(exp);
    return !isNaN(num) ? `${num} Years` : `${exp} Years`;
  };

  // Dynamic Co-Applicants Resolution using standard helper
  const applicantCount = getApplicantCount(appData);
  const personalData = appData.registration?.personalInformation || appData.sections?.personalInformation || {};
  const applicant = personalData.applicant || {};

  const rawCoApplicants = Array.isArray(personalData.coApplicants) ? personalData.coApplicants : [];
  const coApplicants = Array.from({ length: applicantCount }, (_, i) => rawCoApplicants[i] || {});
  const hasCoApplicants = applicantCount > 0;

  const kycData = appData.kycDocuments || appData.sections?.kycDocuments || {};
  const addressData = appData.addressDetails || appData.sections?.addressDetails || {};
  
  const rawEmp = appData.employmentIncome || appData.sections?.employmentIncome || {};
  const rawApplicant = rawEmp.applicant || {};
  const liveApplicant = liveEmployment?.applicant || {};

  const mergedApplicant = { ...liveApplicant };
  Object.entries(rawApplicant).forEach(([k, v]) => {
    if (v !== '' && v !== null && v !== undefined) {
      mergedApplicant[k] = v;
    }
  });

  const empData = {
    applicant: mergedApplicant,
    coApplicants: Array.isArray(rawEmp.coApplicants) && rawEmp.coApplicants.length > 0
      ? rawEmp.coApplicants
      : (liveEmployment?.coApplicants || []),
  };

  const bankData = appData.bankExistingLoans || appData.sections?.bankExistingLoans || {};
  const colData = appData.collateral || appData.sections?.collateral || appData.collateralDetails || {};
  const refData = appData.references || appData.sections?.references || {};
  const sourcingData = appData.sourcing || appData.sections?.sourcing || {};
  const chargesData = appData.scheduleCharges || appData.sections?.scheduleCharges || {};
  const declarationData = appData.declaration || appData.sections?.declaration || {};

  // Resolved Customer Header Info
  const customerDisplayName =
    composeFullName(applicant) ||
    liveCustomer?.fullName ||
    liveCustomer?.customerName ||
    appData.customerName ||
    '';

  const loanAmount = appData.loanAmount || liveCustomer?.expectedLoanAmount || '';
  const loanTenure = appData.loanTenureMonths || '';
  const resolvedRMName = sourcingData.sourcedBy || liveRM?.name || '';
  const resolvedEmployeeId = sourcingData.employeeId || liveRM?.employeeId || '';

  const todayFormatted = toIstDateInput();

  // Resolved Applicant Signature & Date
  const resolvedApplicantSignature =
    !isObsoleteMock(declarationData.applicantSignature)
      ? declarationData.applicantSignature
      : customerDisplayName;

  const resolvedApplicantDate =
    !isObsoleteMock(declarationData.applicantDate)
      ? declarationData.applicantDate
      : todayFormatted;

  // Resolved RM Signature & Date
  const resolvedRMSignature =
    !isObsoleteMock(declarationData.ackReceivedBy)
      ? declarationData.ackReceivedBy
      : (liveRM?.name || resolvedRMName);

  const resolvedRMDate =
    !isObsoleteMock(declarationData.ackDate)
      ? declarationData.ackDate
      : todayFormatted;

  const effectiveDocs = downloadedDocs;

  const getCollectedDocumentNames = (person = {}, documents = []) => {
    const names = [];
    const addName = (name) => {
      const normalized = String(name || '').trim();
      if (normalized && !names.some((existing) => existing.toLowerCase() === normalized.toLowerCase())) {
        names.push(normalized);
      }
    };

    if (person.aadhaarLast4 || person.aadhaarNo) addName('Aadhaar');
    if (person.panCardNo || person.panNumber) addName('PAN Card');

    const identityDocumentType = resolveDocType(person.identityDocumentType);
    if (identityDocumentType) addName(identityDocumentType);

    if (!identityDocumentType && Array.isArray(person.identityDocumentFiles)) {
      person.identityDocumentFiles.forEach((file) => {
        addName(typeof file === 'string' ? file : file?.name || file?.fileName);
      });
    }

    documents.forEach((document) => {
      addName(document.documentTypeName || document.fileName);
    });

    return names;
  };

  const documentPeople = [
    { label: 'Applicant', kyc: kycData.applicant || {}, documents: effectiveDocs },
    ...(hasCoApplicants
      ? coApplicants.map((_, index) => ({
          label: `Co-Applicant ${index + 1}`,
          kyc: kycData.coApplicants?.[index] || {},
          documents: [],
        }))
      : []),
  ];

  // Find client/profile photo if present in uploaded docs
  const clientPhotoDoc =
    downloadedDocs.find(
      (d) =>
        d.previewUrl &&
        (d.documentTypeName?.toLowerCase().includes('client') ||
          d.documentTypeName?.toLowerCase().includes('photo') ||
          d.fileName?.toLowerCase().includes('client') ||
          d.fileName?.toLowerCase().includes('photo'))
    ) || {};

  return (
    <div className="pdf-view-wrapper">
      <ErrorPopup
        show={!!errorPopup}
        title={errorPopup?.title}
        message={errorPopup?.message}
        details={errorPopup?.details}
        variant={errorPopup?.variant}
        onClose={() => setErrorPopup(null)}
      />
      <div className="pdf-controls">
        <Button variant="secondary" onClick={() => navigate(location.state?.closeTo || ROUTES.SUBMISSION_HISTORY)}>
          {location.state?.closeTo ? 'Close PDF' : 'Back'}
        </Button>
        <Button onClick={handleDownloadPdf} disabled={isGeneratingPdf}>
          {isGeneratingPdf ? 'Generating PDF...' : 'Download PDF'}
        </Button>
      </div>

      <div className="pdf-container" ref={pdfRef}>
        {/* ===================================================================
            CONTINUOUS SINGLE LONG PAGE LOAN APPLICATION FORM
        ==================================================================== */}
        <div className="pdf-page-continuous">
          {/* HEADER */}
          <div className="pdf-header">
            <div className="pdf-title-box">
              <h1>
                LOAN APPLICATION FORM :-
                <br />
                {applicationDisplayId}
              </h1>
              <p>(Please Read the Guidelines on the last page)</p>
            </div>
            <div className="pdf-logo">
              <img src={LogoImage} alt="Logo" />
            </div>
          </div>

          {/* STEP 1: OFFICE USE & APPLICATION DETAILS */}
          <div className="pdf-section-title">OFFICE USE & APPLICATION DETAILS</div>
          <div className="pdf-office-use">
            <div className="pdf-office-left">
              <div className="pdf-office-row">
                <span className="pdf-office-label">Sourcing Channel:</span>
                <div className="pdf-office-value">
                  {resolveSourcingChannel(appData.sourcingChannel || sourcingData.sourcingChannel)}
                </div>
              </div>
              <div className="pdf-office-row">
                <span className="pdf-office-label">Loan Product:</span>
                <div className="pdf-office-value">
                  {resolveLoanProduct(appData.loanProduct)}{' '}
                  {appData.loanVariation ? `- ${appData.loanVariation}` : ''}
                </div>
              </div>
              <div className="pdf-office-row">
                <span className="pdf-office-label">Purpose of Loan:</span>
                <div className="pdf-office-value">
                  {resolveLoanPurpose(appData.purposeOfLoan || appData.loanType || liveCustomer?.loanPurposeName)}
                </div>
              </div>
              <div className="pdf-office-row">
                <span className="pdf-office-label">Loan Amount & Tenure:</span>
                <div className="pdf-office-value">
                  Rs. {loanAmount} for {loanTenure} months
                </div>
              </div>
            </div>

            <div className="pdf-office-photos">
              <div className="pdf-photo-column">
                <div className="pdf-photo-box">
                  {clientPhotoDoc?.previewUrl ? (
                    <img src={clientPhotoDoc.previewUrl} alt="Applicant" style={{ objectFit: 'cover' }} />
                  ) : (
                    <div style={{ color: '#64748b', fontSize: '10px', padding: '6px', textAlign: 'center' }}>
                      No Photo
                    </div>
                  )}
                  <div className="pdf-photo-timestamp">Applicant</div>
                </div>
                <div className="pdf-geo-details">
                  Lat: 13.0827, Long: 80.2707
                  <br />
                  {formatDateTime(new Date())}
                </div>
              </div>

              {hasCoApplicants &&
                coApplicants.map((_, i) => (
                  <div className="pdf-photo-column" key={i}>
                    <div className="pdf-photo-box">
                      <div style={{ color: '#64748b', fontSize: '10px', padding: '6px', textAlign: 'center' }}>
                        No Photo
                      </div>
                      <div className="pdf-photo-timestamp">Co-Applicant {i + 1}</div>
                    </div>
                    <div className="pdf-geo-details">
                      Lat: 13.0827, Long: 80.2707
                      <br />
                      {formatDateTime(new Date())}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* STEP 3: PERSONAL INFORMATION */}
          <div className="pdf-section-title">PERSONAL INFORMATION</div>
          <table className="pdf-table">
            <thead>
              <tr>
                <th className="pdf-row-header">Field</th>
                <th>Applicant</th>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <th key={i}>Co-Applicant {i + 1}</th>
                  ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Title</td>
                <td>{resolveTitle(applicant.title) || '-'}</td>
                {hasCoApplicants && coApplicants.map((co, i) => <td key={i}>{resolveTitle(co.title) || '-'}</td>)}
              </tr>
              <tr>
                <td>First Name</td>
                <td>{applicant.firstName || customerDisplayName}</td>
                {hasCoApplicants && coApplicants.map((co, i) => <td key={i}>{co.firstName || '-'}</td>)}
              </tr>
              <tr>
                <td>Middle Name</td>
                <td>{applicant.middleName || '-'}</td>
                {hasCoApplicants && coApplicants.map((co, i) => <td key={i}>{co.middleName || '-'}</td>)}
              </tr>
              <tr>
                <td>Last Name</td>
                <td>{applicant.lastName || '-'}</td>
                {hasCoApplicants && coApplicants.map((co, i) => <td key={i}>{co.lastName || '-'}</td>)}
              </tr>
              <tr>
                <td>Father/Spouse Name</td>
                <td>{applicant.fatherOrSpouseName || '-'}</td>
                {hasCoApplicants && coApplicants.map((co, i) => <td key={i}>{co.fatherOrSpouseName || '-'}</td>)}
              </tr>
              <tr>
                <td>Mother's Maiden Name</td>
                <td>{applicant.mothersMaidenName || '-'}</td>
                {hasCoApplicants && coApplicants.map((co, i) => <td key={i}>{co.mothersMaidenName || '-'}</td>)}
              </tr>
              <tr>
                <td>Date of Birth</td>
                <td>{applicant.dateOfBirth || '-'}</td>
                {hasCoApplicants && coApplicants.map((co, i) => <td key={i}>{co.dateOfBirth || '-'}</td>)}
              </tr>
              <tr>
                <td>Gender</td>
                <td>{resolveGender(applicant.gender) || '-'}</td>
                {hasCoApplicants && coApplicants.map((co, i) => <td key={i}>{resolveGender(co.gender) || '-'}</td>)}
              </tr>
              <tr>
                <td>Marital Status</td>
                <td>{resolveMaritalStatus(applicant.maritalStatus) || '-'}</td>
                {hasCoApplicants &&
                  coApplicants.map((co, i) => <td key={i}>{resolveMaritalStatus(co.maritalStatus) || '-'}</td>)}
              </tr>
              <tr>
                <td>Category</td>
                <td>{resolveCategory(applicant.category) || '-'}</td>
                {hasCoApplicants && coApplicants.map((co, i) => <td key={i}>{resolveCategory(co.category) || '-'}</td>)}
              </tr>
              <tr>
                <td>Religion</td>
                <td>{resolveReligion(applicant.religion) || '-'}</td>
                {hasCoApplicants && coApplicants.map((co, i) => <td key={i}>{resolveReligion(co.religion) || '-'}</td>)}
              </tr>
              <tr>
                <td>Mobile No</td>
                <td>{applicant.mobileNo || liveCustomer?.mobileNumber || appData.mobile || '-'}</td>
                {hasCoApplicants && coApplicants.map((co, i) => <td key={i}>{co.mobileNo || '-'}</td>)}
              </tr>
              <tr>
                <td>Email ID</td>
                <td>{applicant.emailId || appData.email || '-'}</td>
                {hasCoApplicants && coApplicants.map((co, i) => <td key={i}>{co.emailId || '-'}</td>)}
              </tr>
              <tr>
                <td>Relationship with Applicant</td>
                <td>SELF</td>
                {hasCoApplicants &&
                  coApplicants.map((co, i) => (
                    <td key={i}>{resolveRelationship(co.relationshipWithApplicant) || '-'}</td>
                  ))}
              </tr>
            </tbody>
          </table>

          {/* STEP 2: KYC DOCUMENTS & VERIFICATION */}
          <div className="pdf-section-title">KYC DOCUMENTS & VERIFICATION</div>
          <table className="pdf-table">
            <thead>
              <tr>
                <th className="pdf-row-header">Document</th>
                <th>Applicant</th>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <th key={i}>Co-Applicant {i + 1}</th>
                  ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Aadhaar Last 4</td>
                <td>{kycData.applicant?.aadhaarLast4 || '-'}</td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => <td key={i}>{kycData.coApplicants?.[i]?.aadhaarLast4 || '-'}</td>)}
              </tr>
              <tr>
                <td>PAN Card No</td>
                <td>{kycData.applicant?.panCardNo || applicant.panCardNo || '-'}</td>
                {hasCoApplicants &&
                  coApplicants.map((co, i) => (
                    <td key={i}>{kycData.coApplicants?.[i]?.panCardNo || co.panCardNo || '-'}</td>
                  ))}
              </tr>
              <tr>
                <td>Identity Doc Type</td>
                <td>{resolveDocType(kycData.applicant?.identityDocumentType) || '-'}</td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <td key={i}>{resolveDocType(kycData.coApplicants?.[i]?.identityDocumentType) || '-'}</td>
                  ))}
              </tr>
              <tr>
                <td>Identity Doc No</td>
                <td>{kycData.applicant?.identityDocumentNo || '-'}</td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <td key={i}>{kycData.coApplicants?.[i]?.identityDocumentNo || '-'}</td>
                  ))}
              </tr>
              <tr>
                <td>Verification Status</td>
                <td>{resolveVerification(kycData.applicant?.verificationStatus) || '-'}</td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <td key={i}>{resolveVerification(kycData.coApplicants?.[i]?.verificationStatus) || 'Pending'}</td>
                  ))}
              </tr>
            </tbody>
          </table>

          {/* DYNAMIC UPLOADED KYC DOCUMENT NAMES */}
          <div className="pdf-section-title">KYC DOCUMENTS</div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              marginTop: '10px',
              marginBottom: '14px',
            }}
          >
            {documentPeople.map((person) => {
              const documentNames = getCollectedDocumentNames(person.kyc, person.documents);

              return (
                <div
                  key={person.label}
                  style={{
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '9px 12px',
                    backgroundColor: '#f8fafc',
                  }}
                >
                  <div style={{ fontWeight: '700', fontSize: '11px', color: '#0f172a', marginBottom: '6px' }}>
                    {person.label}
                  </div>
                  {documentNames.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
                      {documentNames.map((name) => (
                        <span key={name} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '10.5px', color: '#334155' }}>
                          <span aria-hidden="true" style={{ color: '#0F7A4C', fontWeight: '700', fontSize: '13px', lineHeight: 1 }}>✓</span>
                          {name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: '10px', color: '#64748b' }}>No KYC documents collected</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* STEP 4: ADDRESS DETAILS */}
          <div className="pdf-section-title">ADDRESS DETAILS</div>
          <table className="pdf-table">
            <thead>
              <tr>
                <th className="pdf-row-header">Current Address</th>
                <th>Applicant</th>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <th key={i}>Co-Applicant {i + 1}</th>
                  ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Address Line 1</td>
                <td>
                  {addressData.applicant?.current?.addressLine1 ||
                    addressData.applicant?.addressLine1 ||
                    '-'}
                </td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <td key={i}>
                      {addressData.coApplicants?.[i]?.current?.addressLine1 ||
                        addressData.coApplicants?.[i]?.addressLine1 ||
                        '-'}
                    </td>
                  ))}
              </tr>
              <tr>
                <td>Address Line 2</td>
                <td>
                  {addressData.applicant?.current?.addressLine2 ||
                    addressData.applicant?.addressLine2 ||
                    '-'}
                </td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <td key={i}>
                      {addressData.coApplicants?.[i]?.current?.addressLine2 ||
                        addressData.coApplicants?.[i]?.addressLine2 ||
                        '-'}
                    </td>
                  ))}
              </tr>
              <tr>
                <td>Landmark</td>
                <td>
                  {addressData.applicant?.current?.landmark || addressData.applicant?.landmark || '-'}
                </td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <td key={i}>
                      {addressData.coApplicants?.[i]?.current?.landmark ||
                        addressData.coApplicants?.[i]?.landmark ||
                        '-'}
                    </td>
                  ))}
              </tr>
              <tr>
                <td>City & State</td>
                <td>
                  {[
                    resolveCity(addressData.applicant?.current?.city || addressData.applicant?.city),
                    resolveState(addressData.applicant?.current?.state || addressData.applicant?.state),
                  ]
                    .filter(Boolean)
                    .join(', ') || '-'}
                </td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <td key={i}>
                      {[
                        resolveCity(addressData.coApplicants?.[i]?.current?.city || addressData.coApplicants?.[i]?.city),
                        resolveState(addressData.coApplicants?.[i]?.current?.state || addressData.coApplicants?.[i]?.state),
                      ]
                        .filter(Boolean)
                        .join(', ') || '-'}
                    </td>
                  ))}
              </tr>
              <tr>
                <td>Pincode</td>
                <td>
                  {addressData.applicant?.current?.pincode ||
                    addressData.applicant?.pincode ||
                    addressData.applicant?.current?.postalCode ||
                    addressData.applicant?.postalCode ||
                    addressData.applicant?.current?.Pincode ||
                    addressData.applicant?.Pincode ||
                    '-'}
                </td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <td key={i}>
                      {addressData.coApplicants?.[i]?.current?.pincode ||
                        addressData.coApplicants?.[i]?.pincode ||
                        addressData.coApplicants?.[i]?.current?.postalCode ||
                        addressData.coApplicants?.[i]?.postalCode ||
                        addressData.coApplicants?.[i]?.current?.Pincode ||
                        addressData.coApplicants?.[i]?.Pincode ||
                        '-'}
                    </td>
                  ))}
              </tr>
            </tbody>
          </table>

          {/* STEP 5: EMPLOYMENT & INCOME DETAILS */}
          <div className="pdf-section-title">EMPLOYMENT & INCOME DETAILS</div>
          <table className="pdf-table">
            <thead>
              <tr>
                <th className="pdf-row-header">Employment Info</th>
                <th>Applicant</th>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <th key={i}>Co-Applicant {i + 1}</th>
                  ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Occupation Category</td>
                <td>
                  {resolveEmploymentType(empData.applicant?.employmentNature || empData.applicant?.employmentType || empData.applicant?.employmentTypeId) || empData.applicant?.employmentNature || empData.applicant?.employmentType || '-'}
                </td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <td key={i}>
                      {resolveEmploymentType(empData.coApplicants?.[i]?.employmentNature || empData.coApplicants?.[i]?.employmentType || empData.coApplicants?.[i]?.employmentTypeId) || empData.coApplicants?.[i]?.employmentNature || empData.coApplicants?.[i]?.employmentType || '-'}
                    </td>
                  ))}
              </tr>
              <tr>
                <td>Employer Name</td>
                <td>{empData.applicant?.employerBusinessName || empData.applicant?.employerName || '-'}</td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <td key={i}>{empData.coApplicants?.[i]?.employerBusinessName || empData.coApplicants?.[i]?.employerName || '-'}</td>
                  ))}
              </tr>
              <tr>
                <td>Designation</td>
                <td>{empData.applicant?.designationNatureOfBusiness || empData.applicant?.designation || '-'}</td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <td key={i}>{empData.coApplicants?.[i]?.designationNatureOfBusiness || empData.coApplicants?.[i]?.designation || '-'}</td>
                  ))}
              </tr>
              <tr>
                <td>Qualification</td>
                <td>
                  {resolveEducation(empData.applicant?.qualification || empData.applicant?.educationId) || empData.applicant?.qualification || '-'}
                </td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <td key={i}>
                      {resolveEducation(empData.coApplicants?.[i]?.qualification || empData.coApplicants?.[i]?.educationId) || empData.coApplicants?.[i]?.qualification || '-'}
                    </td>
                  ))}
              </tr>
              <tr>
                <td>Industry Type</td>
                <td>{empData.applicant?.industryType || '-'}</td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => <td key={i}>{empData.coApplicants?.[i]?.industryType || '-'}</td>)}
              </tr>
              <tr>
                <td>Total Experience</td>
                <td>{formatExperience(empData.applicant?.totalExperienceYears ?? empData.applicant?.totalExperience)}</td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <td key={i}>
                      {formatExperience(empData.coApplicants?.[i]?.totalExperienceYears ?? empData.coApplicants?.[i]?.totalExperience)}
                    </td>
                  ))}
              </tr>
              <tr>
                <td>Gross Monthly Income</td>
                <td>{formatCurrencyOrDash(empData.applicant?.grossMonthlyIncome)}</td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <td key={i}>
                      {formatCurrencyOrDash(empData.coApplicants?.[i]?.grossMonthlyIncome)}
                    </td>
                  ))}
              </tr>
              <tr>
                <td>Other Monthly Income</td>
                <td>{formatCurrencyOrDash(empData.applicant?.otherIncomeMonthly ?? empData.applicant?.otherMonthlyIncome)}</td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <td key={i}>
                      {formatCurrencyOrDash(empData.coApplicants?.[i]?.otherIncomeMonthly ?? empData.coApplicants?.[i]?.otherMonthlyIncome)}
                    </td>
                  ))}
              </tr>
              <tr>
                <td>Net Monthly Income</td>
                <td>{formatCurrencyOrDash(empData.applicant?.netMonthlyIncome)}</td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <td key={i}>
                      {formatCurrencyOrDash(empData.coApplicants?.[i]?.netMonthlyIncome)}
                    </td>
                  ))}
              </tr>
              <tr>
                <td>Gross Annual Income</td>
                <td>{formatCurrencyOrDash(empData.applicant?.grossAnnualIncome)}</td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <td key={i}>
                      {formatCurrencyOrDash(empData.coApplicants?.[i]?.grossAnnualIncome)}
                    </td>
                  ))}
              </tr>
            </tbody>
          </table>

          {/* STEP 6: BANK & EXISTING LOAN DETAILS */}
          <div className="pdf-section-title">BANK & EXISTING LOAN DETAILS</div>
          <table className="pdf-table">
            <thead>
              <tr>
                <th>Applicant Type</th>
                <th>Bank Name</th>
                <th>Account Holder</th>
                <th>Account No</th>
                <th>IFSC Code</th>
                <th>Active Loans</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Applicant</td>
                <td>
                  {resolveBank(bankData.applicant?.primaryBank?.bankName || bankData.primaryBank?.bankName) ||
                    bankData.applicant?.primaryBank?.bankName ||
                    bankData.primaryBank?.bankName ||
                    '-'}
                </td>
                <td>{bankData.applicant?.primaryBank?.accountHolderName || customerDisplayName || '-'}</td>
                <td>
                  {bankData.applicant?.primaryBank?.accountNumber ||
                    bankData.primaryBank?.accountNumber ||
                    '-'}
                </td>
                <td>
                  {bankData.applicant?.primaryBank?.ifscCode ||
                    bankData.primaryBank?.ifscCode ||
                    '-'}
                </td>
                <td>
                  {bankData.applicant?.primaryBank?.noOfActiveLoans !== undefined && bankData.applicant?.primaryBank?.noOfActiveLoans !== ''
                    ? String(bankData.applicant.primaryBank.noOfActiveLoans)
                    : bankData.applicant?.existingLoans?.[0]?.totalExistingEmi
                    ? String(bankData.applicant.existingLoans[0].totalExistingEmi)
                    : '0'}
                </td>
              </tr>
              {hasCoApplicants &&
                coApplicants.map((co, i) => (
                  <tr key={i}>
                    <td>Co-Applicant {i + 1}</td>
                    <td>
                      {resolveBank(bankData.coApplicants?.[i]?.primaryBank?.bankName) ||
                        bankData.coApplicants?.[i]?.primaryBank?.bankName ||
                        '-'}
                    </td>
                    <td>
                      {bankData.coApplicants?.[i]?.primaryBank?.accountHolderName ||
                        composeFullName(co) ||
                        '-'}
                    </td>
                    <td>
                      {bankData.coApplicants?.[i]?.primaryBank?.accountNumber ||
                        '-'}
                    </td>
                    <td>
                      {bankData.coApplicants?.[i]?.primaryBank?.ifscCode ||
                        '-'}
                    </td>
                    <td>
                      {bankData.coApplicants?.[i]?.primaryBank?.noOfActiveLoans !== undefined && bankData.coApplicants?.[i]?.primaryBank?.noOfActiveLoans !== ''
                        ? String(bankData.coApplicants[i].primaryBank.noOfActiveLoans)
                        : bankData.coApplicants?.[i]?.existingLoans?.[0]?.totalExistingEmi
                        ? String(bankData.coApplicants[i].existingLoans[0].totalExistingEmi)
                        : '-'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          {/* STEP 7: COLLATERAL DETAILS */}
          <div className="pdf-section-title">COLLATERAL DETAILS</div>
          <table className="pdf-table">
            <tbody>
              <tr>
                <td className="pdf-row-header">Property Type</td>
                <td>
                  {resolveProperty(colData.propertyOne?.typeOfProperty) ||
                    colData.propertyOne?.typeOfProperty ||
                    resolveProperty(colData.propertyType) ||
                    colData.propertyType ||
                    '-'}
                </td>
              </tr>
              <tr>
                <td className="pdf-row-header">Property Address</td>
                <td>{colData.propertyOne?.locationAddress || colData.propertyAddress || '-'}</td>
              </tr>
              <tr>
                <td className="pdf-row-header">Estimated Market Value</td>
                <td>
                  {colData.propertyOne?.estimatedValue
                    ? `Rs. ${Number(colData.propertyOne.estimatedValue).toLocaleString('en-IN')}`
                    : colData.estimatedMarketValue
                    ? `Rs. ${Number(colData.estimatedMarketValue).toLocaleString('en-IN')}`
                    : '-'}
                </td>
              </tr>
              <tr>
                <td className="pdf-row-header">Property Usage</td>
                <td>
                  {resolvePropertyUsage(colData.propertyOne?.usage) ||
                    resolvePropertyUsage(colData.usage) ||
                    colData.propertyOne?.usage ||
                    colData.usage ||
                    '-'}
                </td>
              </tr>
            </tbody>
          </table>

          {/* STEP 8: REFERENCE DETAILS */}
          <div className="pdf-section-title">REFERENCE DETAILS</div>
          <table className="pdf-table">
            <thead>
              <tr>
                <th>Reference #</th>
                <th>Full Name</th>
                <th>Relationship</th>
                <th>Mobile No</th>
                <th>Address</th>
              </tr>
            </thead>
            <tbody>
              {[
                refData.reference1 || (Array.isArray(refData.references) ? refData.references[0] : null),
                refData.reference2 || (Array.isArray(refData.references) ? refData.references[1] : null),
              ]
                .filter(Boolean)
                .map((ref, i) => (
                  <tr key={i}>
                    <td>Reference {i + 1}</td>
                    <td>{ref.fullName || '-'}</td>
                    <td>{resolveRelationship(ref.relationship) || ref.relationship || '-'}</td>
                    <td>{ref.mobileNo || '-'}</td>
                    <td>{ref.address || '-'}</td>
                  </tr>
                ))}
            </tbody>
          </table>

          {/* STEP 9 & 10: SOURCING & CHARGES */}
          <div className="pdf-section-title">SOURCING & CHARGES</div>
          <table className="pdf-table">
            <tbody>
              <tr>
                <td className="pdf-row-header">Sourcing Channel</td>
                <td>{resolveSourcingChannel(appData.sourcingChannel || sourcingData.sourcingChannel)}</td>
                <td className="pdf-row-header">Sourced By (RM Name)</td>
                <td>{resolvedRMName}</td>
              </tr>
              <tr>
                <td className="pdf-row-header">Employee ID</td>
                <td>{resolvedEmployeeId}</td>
                <td className="pdf-row-header">Admin Fee Status</td>
                <td>{chargesData.adminFeePaid ? 'Paid' : 'Pending / Not Applicable'}</td>
              </tr>
            </tbody>
          </table>

          {/* STEP 11: FIELD VERIFICATION */}
          <div className="pdf-section-title">FIELD VERIFICATION</div>
          <table className="pdf-table">
            <tbody>
              <tr>
                <td className="pdf-row-header">FI Status</td>
                <td>{appData.sections?.fieldVerification?.status || '-'}</td>
              </tr>
              <tr>
                <td className="pdf-row-header">FI Remarks</td>
                <td>
                  {appData.sections?.fieldVerification?.remarks || '-'}
                </td>
              </tr>
            </tbody>
          </table>

          {/* STEP 12: DECLARATION */}
          <div className="pdf-section-title" style={{ marginTop: '14px' }}>
            12. DECLARATION
          </div>
          <p className="pdf-text-small pdf-text-justify" style={{ margin: '6px 0 12px 0' }}>
            I/We declare that the information given in this application is true, correct and complete to the best of
            my/our knowledge. I/We authorise Sivels Finance (a unit of Sivels Holding Pvt Ltd) and its representatives
            to verify the details furnished, obtain credit bureau reports, and process my/our personal data for
            evaluation, sanction and servicing of this loan, in accordance with applicable law. I/We understand that
            the Admin Fee is non-refundable, and that submission of this form does not guarantee sanction of the loan
            applied for.
          </p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '16px',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginTop: '12px',
              marginBottom: '10px',
              padding: '12px 18px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              backgroundColor: '#f8fafc',
            }}
          >
            <div>
              <div style={{ fontWeight: '700', marginBottom: '4px', fontSize: '11px' }}>Applicant Signature:</div>
              <div style={{ fontSize: '13px', color: '#0F7A4C', fontWeight: '700' }}>
                {resolvedApplicantSignature}
              </div>
              <div style={{ fontSize: '9.5px', color: '#64748b', marginTop: '3px' }}>
                Date: {resolvedApplicantDate}
              </div>
            </div>

            {hasCoApplicants &&
              coApplicants.map((co, i) => {
                const coSig =
                  declarationData.coApplicants?.[i]?.signature ||
                  (i === 0 ? declarationData.coApplicantSignature : '') ||
                  composeFullName(co) ||
                  `Co-Applicant ${i + 1}`;
                const coDate =
                  declarationData.coApplicants?.[i]?.date ||
                  (i === 0 ? declarationData.coApplicantDate : '') ||
                  todayFormatted;
                return (
                  <div key={i}>
                    <div style={{ fontWeight: '700', marginBottom: '4px', fontSize: '11px' }}>
                      Co-Applicant {i + 1} Signature:
                    </div>
                    <div style={{ fontSize: '13px', color: '#0F7A4C', fontWeight: '700' }}>
                      {coSig}
                    </div>
                    <div style={{ fontSize: '9.5px', color: '#64748b', marginTop: '3px' }}>
                      Date: {coDate}
                    </div>
                  </div>
                );
              })}

            <div>
              <div style={{ fontWeight: '700', marginBottom: '4px', fontSize: '11px' }}>Received By (RM Sign):</div>
              <div style={{ fontSize: '13px', color: '#0F7A4C', fontWeight: '700' }}>
                {resolvedRMSignature}
              </div>
              <div style={{ fontSize: '9.5px', color: '#64748b', marginTop: '3px' }}>
                Date: {resolvedRMDate}
              </div>
            </div>
          </div>

          {/* CUSTOMER SUPPORT */}
          <div className="pdf-section-title" style={{ marginTop: '14px' }}>
            CUSTOMER SUPPORT
          </div>
          <div
            style={{
              padding: '10px 14px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              backgroundColor: '#f8fafc',
              textAlign: 'center',
            }}
          >
            <div style={{ fontWeight: '700', fontSize: '11px', color: '#1e293b' }}>
              For assistance, please contact Customer Support
            </div>
            <div style={{ marginTop: '4px', fontSize: '13px', color: '#0F7A4C', fontWeight: '700' }}>
              1800-123-4567
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
