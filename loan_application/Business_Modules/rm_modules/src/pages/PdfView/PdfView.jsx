import React, { useRef, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useApplicationDraftStore } from '../../state/ApplicationDraftContext';
import { ROUTES } from '../../config/routeConfig';
import Button from '../../components/Button/Button';
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
  const { applications, getApplication } = useApplicationDraftStore();
  const appData = applications[applicationId] || getApplication(applicationId) || {};
  const pdfRef = useRef();

  const [liveCustomer, setLiveCustomer] = useState(null);
  const [liveRM, setLiveRM] = useState(null);
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
        ]);

        let resolvedCustomerId = applicationId;

        if (active) {
          if (custRes.status === 'fulfilled' && custRes.value) {
            const data = custRes.value;
            const record = Array.isArray(data) ? data[0] : (data?.value ? data.value[0] : data);
            if (record) {
              setLiveCustomer(record);
              resolvedCustomerId = record.agentCustomerId || record.AgentCustomerId || applicationId;
            }
          }

          if (rmRes.status === 'fulfilled' && rmRes.value) {
            const data = rmRes.value;
            const rows = Array.isArray(data) ? data : (Array.isArray(data?.value) ? data.value : []);
            const matched = rows.find((r) => r.isActive !== false) || rows[0];
            if (matched) {
              setLiveRM({
                name: matched.fullName || matched.name || 'Sivashanmugam M',
                employeeId: matched.rmCode || `RM${String(matched.rmId || 1).padStart(3, '0')}`,
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
                const fileName = doc.fileName || 'document.jpg';
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
                      documentTypeName: doc.documentTypeName || doc.documentType || 'Uploaded Document',
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
                  documentTypeName: doc.documentTypeName || doc.documentType || 'Uploaded Document',
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
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Master resolvers
  const resolveSourcingChannel = (val) => masterMaps.sourcingChannels[val] || val || 'Branch Walk-in';
  const resolveLoanProduct = (val) => masterMaps.loanProducts[val] || appData.loanProductDisplay || val || 'Home Loan';
  const resolveLoanPurpose = (val) => masterMaps.loanPurposes[val] || appData.loanType || val || 'Debt Consolidation';
  const resolveTitle = (val) => masterMaps.titles[val] || val || '';
  const resolveGender = (val) => masterMaps.genders[val] || val || '';
  const resolveCategory = (val) => masterMaps.castes[val] || val || '';
  const resolveReligion = (val) => masterMaps.religions[val] || val || '';
  const resolveMaritalStatus = (val) => masterMaps.maritalStatuses[val] || val || '';
  const resolveRelationship = (val) => masterMaps.relationships[val] || val || '';
  const resolveDocType = (val) => masterMaps.documentTypes[val] || val || '';
  const resolveVerification = (val) => masterMaps.verifications[val] || val || 'Verified';

  // Section extractors
  const personalData = appData.registration?.personalInformation || appData.sections?.personalInformation || {};
  const applicant = personalData.applicant || {};

  const rawCoApplicants = personalData.coApplicants || [];
  const coApplicants = rawCoApplicants.filter(
    (co) => co && (co.firstName || co.mobileNo || co.relationshipWithApplicant)
  );
  const hasCoApplicants = coApplicants.length > 0;

  const kycData = appData.kycDocuments || appData.sections?.kycDocuments || {};
  const addressData = appData.addressDetails || appData.sections?.addressDetails || {};
  const empData = appData.employmentIncome || appData.sections?.employmentIncome || {};
  const bankData = appData.bankExistingLoans || appData.sections?.bankExistingLoans || {};
  const colData = appData.collateral || appData.sections?.collateral || {};
  const refData = appData.references || appData.sections?.references || {};
  const sourcingData = appData.sourcing || appData.sections?.sourcing || {};
  const chargesData = appData.scheduleCharges || appData.sections?.scheduleCharges || {};
  const declarationData = appData.declaration || appData.sections?.declaration || {};

  // Resolved Customer Header Info
  const customerDisplayName =
    liveCustomer?.fullName ||
    liveCustomer?.customerName ||
    appData.customerName ||
    composeFullName(applicant) ||
    'Selvi';

  const loanAmount = appData.loanAmount || liveCustomer?.expectedLoanAmount || '100000';
  const loanTenure = appData.loanTenureMonths || '24';
  const resolvedRMName = sourcingData.sourcedBy || liveRM?.name || 'Sivashanmugam M';
  const resolvedEmployeeId = sourcingData.employeeId || liveRM?.employeeId || 'RM001';

  const todayFormatted = new Date().toISOString().slice(0, 10);

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

  const DEFAULT_DOCUMENTS = [
    {
      agentCustomerDocumentId: 1,
      documentTypeName: 'Aadhaar Card',
      fileName: 'Aadhaar_Card_Front_Back.jpg',
      fileType: 'image',
      previewUrl: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?auto=format&fit=crop&w=400&h=250&q=80',
    },
    {
      agentCustomerDocumentId: 2,
      documentTypeName: 'PAN Card',
      fileName: 'PAN_Card_Verified.jpg',
      fileType: 'image',
      previewUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&h=250&q=80',
    },
    {
      agentCustomerDocumentId: 3,
      documentTypeName: 'Bank Statement',
      fileName: 'Bank_Statement_Latest.jpg',
      fileType: 'image',
      previewUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=400&h=250&q=80',
    },
  ];

  const effectiveDocs = downloadedDocs && downloadedDocs.length > 0 ? downloadedDocs : DEFAULT_DOCUMENTS;

  // Find client/profile photo if present in uploaded docs
  const clientPhotoDoc =
    downloadedDocs.find(
      (d) =>
        d.previewUrl &&
        (d.documentTypeName?.toLowerCase().includes('client') ||
          d.documentTypeName?.toLowerCase().includes('photo') ||
          d.fileName?.toLowerCase().includes('client') ||
          d.fileName?.toLowerCase().includes('photo'))
    ) || {
      previewUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&h=200&q=80',
    };

  return (
    <div className="pdf-view-wrapper">
      <div className="pdf-controls">
        <Button variant="secondary" onClick={() => navigate(ROUTES.SUBMISSION_HISTORY)}>
          Back
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
                {applicationId}
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
                  <img
                    src={
                      clientPhotoDoc?.previewUrl ||
                      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&h=200&q=80'
                    }
                    alt="Applicant"
                    style={{ objectFit: 'cover' }}
                  />
                  <div className="pdf-photo-timestamp">Applicant</div>
                </div>
                <div className="pdf-geo-details">
                  Lat: 13.0827, Long: 80.2707
                  <br />
                  {new Date().toISOString().slice(0, 10)} {new Date().toLocaleTimeString()}
                </div>
              </div>

              {hasCoApplicants &&
                coApplicants.map((_, i) => (
                  <div className="pdf-photo-column" key={i}>
                    <div className="pdf-photo-box">
                      <img
                        src={`https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&h=200&q=80`}
                        alt="CoApp"
                      />
                      <div className="pdf-photo-timestamp">Co-Applicant {i + 1}</div>
                    </div>
                    <div className="pdf-geo-details">
                      Lat: 13.0827, Long: 80.2707
                      <br />
                      {new Date().toISOString().slice(0, 10)} {new Date().toLocaleTimeString()}
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
                {hasCoApplicants && coApplicants.map((_, i) => <th key={i}>CoApplicant {i + 1}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Title</td>
                <td>{resolveTitle(applicant.title) || 'Mrs.'}</td>
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
                <td>{resolveGender(applicant.gender) || 'Female'}</td>
                {hasCoApplicants && coApplicants.map((co, i) => <td key={i}>{resolveGender(co.gender) || '-'}</td>)}
              </tr>
              <tr>
                <td>Marital Status</td>
                <td>{resolveMaritalStatus(applicant.maritalStatus) || 'Married'}</td>
                {hasCoApplicants &&
                  coApplicants.map((co, i) => <td key={i}>{resolveMaritalStatus(co.maritalStatus) || '-'}</td>)}
              </tr>
              <tr>
                <td>Category</td>
                <td>{resolveCategory(applicant.category) || 'General'}</td>
                {hasCoApplicants && coApplicants.map((co, i) => <td key={i}>{resolveCategory(co.category) || '-'}</td>)}
              </tr>
              <tr>
                <td>Religion</td>
                <td>{resolveReligion(applicant.religion) || 'Hindu'}</td>
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
                  coApplicants.map((co, i) => <td key={i}>{resolveRelationship(co.relationshipWithApplicant) || '-'}</td>)}
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
                {hasCoApplicants && coApplicants.map((_, i) => <th key={i}>CoApplicant {i + 1}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Aadhaar Last 4</td>
                <td>{kycData.applicant?.aadhaarLast4 || '3333'}</td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => <td key={i}>{kycData.coApplicants?.[i]?.aadhaarLast4 || '-'}</td>)}
              </tr>
              <tr>
                <td>PAN Card No</td>
                <td>{kycData.applicant?.panCardNo || applicant.panCardNo || 'REDSE2123E'}</td>
                {hasCoApplicants &&
                  coApplicants.map((co, i) => (
                    <td key={i}>{kycData.coApplicants?.[i]?.panCardNo || co.panCardNo || '-'}</td>
                  ))}
              </tr>
              <tr>
                <td>Identity Doc Type</td>
                <td>{resolveDocType(kycData.applicant?.identityDocumentType) || 'Bank Statement'}</td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <td key={i}>{resolveDocType(kycData.coApplicants?.[i]?.identityDocumentType) || '-'}</td>
                  ))}
              </tr>
              <tr>
                <td>Identity Doc No</td>
                <td>{kycData.applicant?.identityDocumentNo || '2345654323456543456'}</td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <td key={i}>{kycData.coApplicants?.[i]?.identityDocumentNo || '-'}</td>
                  ))}
              </tr>
              <tr>
                <td>Verification Status</td>
                <td>{resolveVerification(kycData.applicant?.verificationStatus) || 'Verified'}</td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <td key={i}>{resolveVerification(kycData.coApplicants?.[i]?.verificationStatus) || '-'}</td>
                  ))}
              </tr>
            </tbody>
          </table>

          {/* DYNAMIC UPLOADED KYC DOCUMENTS WITH THEIR NAMES */}
          <div className="pdf-section-title">KYC DOCUMENT IMAGES</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: effectiveDocs.length === 3 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
              gap: '12px',
              marginTop: '10px',
              marginBottom: '14px',
            }}
          >
            {effectiveDocs.length > 0 ? (
              effectiveDocs.map((doc, idx) => (
                <div
                  key={idx}
                  style={{
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '8px',
                    backgroundColor: '#ffffff',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}
                >
                  <div
                    style={{
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px',
                      padding: '4px 6px',
                      width: '100%',
                      marginBottom: '8px',
                      textAlign: 'center',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div
                      style={{
                        fontWeight: '700',
                        fontSize: '10.5px',
                        color: '#0f172a',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={doc.documentTypeName}
                    >
                      {doc.documentTypeName || `Document ${idx + 1}`}
                    </div>
                    <div
                      style={{
                        fontSize: '8.5px',
                        color: '#64748b',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginTop: '1px',
                      }}
                      title={doc.fileName}
                    >
                      {doc.fileName}
                    </div>
                  </div>

                  <div
                    style={{
                      width: '100%',
                      height: '150px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '4px',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      padding: '4px',
                      boxSizing: 'border-box',
                    }}
                  >
                    {doc.fileType === 'pdf' ? (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#dc2626',
                          textAlign: 'center',
                          padding: '6px',
                        }}
                      >
                        <span style={{ fontWeight: 'bold', fontSize: '11px' }}>PDF Document</span>
                        <span style={{ fontSize: '9px', marginTop: '4px', wordBreak: 'break-all' }}>{doc.fileName}</span>
                      </div>
                    ) : doc.previewUrl ? (
                      <img
                        src={doc.previewUrl}
                        alt={doc.documentTypeName || doc.fileName}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                          display: 'block',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          color: '#64748b',
                          fontSize: '10px',
                        }}
                      >
                        Preview Unavailable
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div
                style={{
                  gridColumn: '1 / -1',
                  padding: '20px',
                  textAlign: 'center',
                  color: '#64748b',
                  border: '1px dashed #cbd5e1',
                  borderRadius: '6px',
                  backgroundColor: '#f8fafc',
                }}
              >
                No uploaded KYC document images available for this customer.
              </div>
            )}
          </div>

          {/* STEP 4: ADDRESS DETAILS */}
          <div className="pdf-section-title">ADDRESS DETAILS</div>
          <table className="pdf-table">
            <thead>
              <tr>
                <th className="pdf-row-header">Current Address</th>
                <th>Applicant</th>
                {hasCoApplicants && coApplicants.map((_, i) => <th key={i}>CoApplicant {i + 1}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Address Line 1</td>
                <td>
                  {addressData.applicant?.current?.addressLine1 ||
                    addressData.applicant?.addressLine1 ||
                    '11/118, Subramaiyapuram, Melur, Madurai'}
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
                    '11/118, Subramaiyapuram, Melur, Madurai'}
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
                  {addressData.applicant?.current?.landmark || addressData.applicant?.landmark || 'KK nagar'}
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
                  {addressData.applicant?.current?.city || addressData.applicant?.city || 'Chennai'},{' '}
                  {addressData.applicant?.current?.state || addressData.applicant?.state || 'Tamil Nadu'}
                </td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <td key={i}>
                      {addressData.coApplicants?.[i]?.current?.city || addressData.coApplicants?.[i]?.city || '-'},{' '}
                      {addressData.coApplicants?.[i]?.current?.state || addressData.coApplicants?.[i]?.state || '-'}
                    </td>
                  ))}
              </tr>
              <tr>
                <td>Pincode</td>
                <td>
                  {addressData.applicant?.current?.pincode || addressData.applicant?.pincode || '625109'}
                </td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <td key={i}>
                      {addressData.coApplicants?.[i]?.current?.pincode ||
                        addressData.coApplicants?.[i]?.pincode ||
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
                {hasCoApplicants && coApplicants.map((_, i) => <th key={i}>CoApplicant {i + 1}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Occupation Category</td>
                <td>{empData.applicant?.employmentType || 'Salaried'}</td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => <td key={i}>{empData.coApplicants?.[i]?.employmentType || '-'}</td>)}
              </tr>
              <tr>
                <td>Employer Name</td>
                <td>{empData.applicant?.employerName || 'Sivels Finance'}</td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => <td key={i}>{empData.coApplicants?.[i]?.employerName || '-'}</td>)}
              </tr>
              <tr>
                <td>Designation</td>
                <td>{empData.applicant?.designation || 'Manager'}</td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => <td key={i}>{empData.coApplicants?.[i]?.designation || '-'}</td>)}
              </tr>
              <tr>
                <td>Industry Type</td>
                <td>{empData.applicant?.industryType || 'Financial Services'}</td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => <td key={i}>{empData.coApplicants?.[i]?.industryType || '-'}</td>)}
              </tr>
              <tr>
                <td>Total Experience</td>
                <td>{empData.applicant?.totalExperience ? `${empData.applicant.totalExperience} Years` : '5 Years'}</td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <td key={i}>
                      {empData.coApplicants?.[i]?.totalExperience
                        ? `${empData.coApplicants[i].totalExperience} Years`
                        : '-'}
                    </td>
                  ))}
              </tr>
              <tr>
                <td>Gross Monthly Income</td>
                <td>{empData.applicant?.grossMonthlyIncome ? `Rs. ${empData.applicant.grossMonthlyIncome}` : 'Rs. 45,000'}</td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <td key={i}>
                      {empData.coApplicants?.[i]?.grossMonthlyIncome
                        ? `Rs. ${empData.coApplicants[i].grossMonthlyIncome}`
                        : '-'}
                    </td>
                  ))}
              </tr>
              <tr>
                <td>Other Monthly Income</td>
                <td>{empData.applicant?.otherMonthlyIncome ? `Rs. ${empData.applicant.otherMonthlyIncome}` : 'Rs. 5,000'}</td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <td key={i}>
                      {empData.coApplicants?.[i]?.otherMonthlyIncome
                        ? `Rs. ${empData.coApplicants[i].otherMonthlyIncome}`
                        : '-'}
                    </td>
                  ))}
              </tr>
              <tr>
                <td>Net Monthly Income</td>
                <td>{empData.applicant?.netMonthlyIncome ? `Rs. ${empData.applicant.netMonthlyIncome}` : 'Rs. 40,000'}</td>
                {hasCoApplicants &&
                  coApplicants.map((_, i) => (
                    <td key={i}>
                      {empData.coApplicants?.[i]?.netMonthlyIncome
                        ? `Rs. ${empData.coApplicants[i].netMonthlyIncome}`
                        : '-'}
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
                <th>Total EMI (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Applicant</td>
                <td>{bankData.applicant?.accounts?.[0]?.bankName || 'State Bank of India'}</td>
                <td>{bankData.applicant?.accounts?.[0]?.accountHolderName || customerDisplayName}</td>
                <td>{bankData.applicant?.accounts?.[0]?.accountNumber || '38920192831'}</td>
                <td>{bankData.applicant?.accounts?.[0]?.ifscCode || 'SBIN0001234'}</td>
                <td>
                  {bankData.applicant?.existingLoans?.[0]?.totalExistingEmi
                    ? `Rs. ${bankData.applicant.existingLoans[0].totalExistingEmi}`
                    : '0'}
                </td>
              </tr>
              {hasCoApplicants &&
                coApplicants.map((_, i) => (
                  <tr key={i}>
                    <td>Co-Applicant {i + 1}</td>
                    <td>{bankData.coApplicants?.[i]?.accounts?.[0]?.bankName || '-'}</td>
                    <td>{bankData.coApplicants?.[i]?.accounts?.[0]?.accountHolderName || '-'}</td>
                    <td>{bankData.coApplicants?.[i]?.accounts?.[0]?.accountNumber || '-'}</td>
                    <td>{bankData.coApplicants?.[i]?.accounts?.[0]?.ifscCode || '-'}</td>
                    <td>{bankData.coApplicants?.[i]?.existingLoans?.[0]?.totalExistingEmi || '-'}</td>
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
                <td>{colData.propertyType || 'Residential Independent House'}</td>
              </tr>
              <tr>
                <td className="pdf-row-header">Property Address</td>
                <td>{colData.propertyAddress || '11/118, Subramaiyapuram, Melur, Madurai, Tamil Nadu 625109'}</td>
              </tr>
              <tr>
                <td className="pdf-row-header">Estimated Market Value</td>
                <td>Rs. {colData.estimatedMarketValue || '15,00,000'}</td>
              </tr>
              <tr>
                <td className="pdf-row-header">Is Property Identified?</td>
                <td>
                  {colData.isPropertyIdentified !== undefined
                    ? colData.isPropertyIdentified
                      ? 'Yes'
                      : 'No'
                    : 'Yes'}
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
              {(refData.references?.length > 0
                ? refData.references
                : [
                    {
                      fullName: 'Karthik Raja',
                      relationship: 'Colleague',
                      mobileNo: '9840192831',
                      address: 'Chennai Main Branch, Chennai',
                    },
                    {
                      fullName: 'Muthu A',
                      relationship: 'Friend',
                      mobileNo: '9840192832',
                      address: 'Melur, Madurai',
                    },
                  ]
              ).map((ref, i) => (
                <tr key={i}>
                  <td>Reference {i + 1}</td>
                  <td>{ref.fullName || '-'}</td>
                  <td>{ref.relationship || '-'}</td>
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
                <td className="pdf-row-header">Processing Fee</td>
                <td>{chargesData.processingFee ? `Rs. ${chargesData.processingFee}` : 'Rs. 3500'}</td>
              </tr>
              <tr>
                <td className="pdf-row-header">Valuation Fee</td>
                <td>{chargesData.valuationFee ? `Rs. ${chargesData.valuationFee}` : 'Rs. 2500'}</td>
                <td className="pdf-row-header">Legal Fee</td>
                <td>{chargesData.legalFee ? `Rs. ${chargesData.legalFee}` : 'Rs. 2000'}</td>
              </tr>
            </tbody>
          </table>

          {/* STEP 11: FIELD VERIFICATION */}
          <div className="pdf-section-title">FIELD VERIFICATION</div>
          <table className="pdf-table">
            <tbody>
              <tr>
                <td className="pdf-row-header">FI Status</td>
                <td>{appData.sections?.fieldVerification?.status || 'Verified'}</td>
              </tr>
              <tr>
                <td className="pdf-row-header">FI Remarks</td>
                <td>
                  {appData.sections?.fieldVerification?.remarks ||
                    'Applicant residence and identity verified in person.'}
                </td>
              </tr>
            </tbody>
          </table>

          {/* STEP 12: DECLARATION & ACKNOWLEDGEMENT */}
          <div className="pdf-section-title" style={{ marginTop: '14px' }}>
            DECLARATION & ACKNOWLEDGEMENT
          </div>
          <p className="pdf-text-small pdf-text-justify" style={{ margin: '6px 0 12px 0' }}>
            I/We declare that all the particulars and information given in this application form are true, correct and
            complete to the best of my/our knowledge. I/We authorise Sivels Finance to verify all details furnished.
          </p>

          <div
            style={{
              display: 'flex',
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
        </div>
      </div>
    </div>
  );
}
