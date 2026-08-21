import React, { useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import html2pdf from 'html2pdf.js';
import { useApplicationDraftStore } from '../../state/ApplicationDraftContext';
import { ROUTES } from '../../config/routeConfig';
import Button from '../../components/Button/Button';
import './PdfView.css';
import LogoImage from '../../assets/logo/Navbar_logo/Logo.jpg';

export default function PdfView() {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const { applications } = useApplicationDraftStore();
  const appData = applications[applicationId] || {};
  const pdfRef = useRef();

  const handleDownloadPdf = () => {
    const element = pdfRef.current;
    const opt = {
      margin:       0,
      filename:     `Application_${applicationId}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  // Safe data extractors
  const getPersonalData = () => appData.sections?.personalInformation || appData.registration?.personalInformation || {};
  const getApplicant = () => getPersonalData().applicant || {};
  
  // Co-applicants list (fallback to empty array, but we'll show at least 1 co-applicant dummy if none exist just for the form preview)
  const actualCoApplicants = getPersonalData().coApplicants || [];
  const coApplicants = actualCoApplicants.length > 0 ? actualCoApplicants : [{}]; // Force 1 co-applicant for dummy display
  
  const getAddressData = () => appData.sections?.addressDetails || {};
  const getEmpData = () => appData.sections?.employmentIncome || {};
  const getBankData = () => appData.sections?.bankExistingLoans || {};
  const getColData = () => appData.sections?.collateral || {};
  const getRefData = () => appData.sections?.references || {};
  const getSourcingData = () => appData.sections?.sourcing || {};
  const getChargesData = () => appData.sections?.scheduleCharges || {};
  const getKycData = () => appData.sections?.kycDocuments || {};

  // Dummy Fallbacks
  const dummyApp = {
    title: 'Mr.', firstName: 'PRADEEP', middleName: 'KUMAR', lastName: 'S', father: 'MR RAJESH', mother: 'MRS SUNITA',
    dob: '1990-05-15', gender: 'Male', marital: 'Married', category: 'General', religion: 'Hindu',
    mobile: '9840155555', email: 'pradeep@example.com', rel: 'SELF',
    aadhaar: '4444', pan: 'DAWPP6298C', docType: 'Passport', docNo: 'A1234567', kycStatus: 'Verified'
  };
  
  const dummyCoApp = {
    title: 'Mrs.', firstName: 'JEMIMA', middleName: 'ELIZABETH', lastName: 'S', father: 'MR PRADEEP', mother: 'MRS SARAH',
    dob: '1991-09-25', gender: 'Female', marital: 'Married', category: 'General', religion: 'Christian',
    mobile: '9940301649', email: 'jemima@example.com', rel: 'Spouse',
    aadhaar: '2714', pan: 'AKMPJ9839N', docType: 'Voter ID', docNo: 'VOT987654', kycStatus: 'Verified'
  };

  const dummyAddress = {
    line1: '3/1 R T ARASU STREET ANJUGAM NAGAR', line2: 'ERUKKANCHERRY KODUNGAIYUR', landmark: 'Near Post Office',
    city: 'CHENNAI', state: 'TAMIL NADU', pin: '600118'
  };

  const dummyEmp = {
    type: 'Salaried', employer: 'BUDDY PIXEL STUDIO', desig: 'Senior Developer', industry: 'IT / Software',
    exp: '15 Years', gross: '90000', other: '10000', net: '80000'
  };

  const dummyBank = {
    bank: 'KOTAK MAHINDRA BANK', holder: 'PRADEEP KUMAR', acct: '3345305779', ifsc: 'KKBK0008486', emi: '15000'
  };

  return (
    <div className="pdf-view-wrapper">
      <div className="pdf-controls">
        <Button variant="secondary" onClick={() => navigate(ROUTES.SUBMISSION_HISTORY)}>Back</Button>
        <Button onClick={handleDownloadPdf}>Download PDF</Button>
      </div>

      <div className="pdf-container" ref={pdfRef}>
        
        {/* PAGE 1: OFFICE USE & APPLICATION DETAILS & PERSONAL INFO */}
        <div className="pdf-page">
          <div className="pdf-header">
            <div className="pdf-title-box">
              <h1>LOAN APPLICATION FORM :-<br/>{applicationId}</h1>
              <p>(Please Read the Guidelines on the last page)</p>
            </div>
            <div className="pdf-logo">
              <img src={LogoImage} alt="Logo" />
            </div>
          </div>

          <div className="pdf-section-title">OFFICE USE & APPLICATION DETAILS</div>
          <div className="pdf-office-use">
            <div className="pdf-office-left">
              <div className="pdf-office-row">
                <span className="pdf-office-label">Sourcing Channel:</span>
                <div className="pdf-office-value">{appData.sourcingChannel || 'Field Agent'}</div>
              </div>
              <div className="pdf-office-row">
                <span className="pdf-office-label">Loan Product:</span>
                <div className="pdf-office-value">{appData.loanProduct || 'PL'} {appData.loanVariation ? `- ${appData.loanVariation}` : ''}</div>
              </div>
              <div className="pdf-office-row">
                <span className="pdf-office-label">Purpose of Loan:</span>
                <div className="pdf-office-value">{appData.purposeOfLoan || 'Personal Expenses'}</div>
              </div>
              <div className="pdf-office-row">
                <span className="pdf-office-label">Loan Amount & Tenure:</span>
                <div className="pdf-office-value">Rs. {appData.loanAmount || '50000'} for {appData.loanTenureMonths || '12'} months</div>
              </div>
            </div>
            <div className="pdf-office-photos">
            <div className="pdf-photo-column">
              <div className="pdf-photo-box">
                <img src="https://randomuser.me/api/portraits/men/32.jpg" alt="App"/>
                <div className="pdf-photo-timestamp">Applicant</div>
              </div>
              <div className="pdf-geo-details">
                Lat: 13.0827, Long: 80.2707<br/>
                {new Date().toISOString().slice(0,10)} {new Date().toLocaleTimeString()}
              </div>
            </div>
            {coApplicants.map((_, i) => (
              <div className="pdf-photo-column" key={i}>
                <div className="pdf-photo-box">
                  <img src={`https://randomuser.me/api/portraits/women/${44 + i}.jpg`} alt="CoApp"/>
                  <div className="pdf-photo-timestamp">Co-Applicant {i + 1}</div>
                </div>
                <div className="pdf-geo-details">
                  Lat: 13.0827, Long: 80.2707<br/>
                  {new Date().toISOString().slice(0,10)} {new Date().toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
          </div>

          <div className="pdf-section-title">PERSONAL INFORMATION</div>
          <table className="pdf-table">
            <thead>
              <tr>
                <th className="pdf-row-header">Field</th>
                <th>Applicant</th>
                {coApplicants.map((_, i) => <th key={i}>CoApplicant {i + 1}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Title</td>
                <td>{getApplicant().title || dummyApp.title}</td>
                {coApplicants.map((co, i) => <td key={i}>{co.title || dummyCoApp.title}</td>)}
              </tr>
              <tr>
                <td>First Name</td>
                <td>{getApplicant().firstName || dummyApp.firstName}</td>
                {coApplicants.map((co, i) => <td key={i}>{co.firstName || dummyCoApp.firstName}</td>)}
              </tr>
              <tr>
                <td>Middle Name</td>
                <td>{getApplicant().middleName || dummyApp.middleName}</td>
                {coApplicants.map((co, i) => <td key={i}>{co.middleName || dummyCoApp.middleName}</td>)}
              </tr>
              <tr>
                <td>Last Name</td>
                <td>{getApplicant().lastName || dummyApp.lastName}</td>
                {coApplicants.map((co, i) => <td key={i}>{co.lastName || dummyCoApp.lastName}</td>)}
              </tr>
              <tr>
                <td>Father/Spouse Name</td>
                <td>{getApplicant().fatherOrSpouseName || dummyApp.father}</td>
                {coApplicants.map((co, i) => <td key={i}>{co.fatherOrSpouseName || dummyCoApp.father}</td>)}
              </tr>
              <tr>
                <td>Mother's Maiden Name</td>
                <td>{getApplicant().mothersMaidenName || dummyApp.mother}</td>
                {coApplicants.map((co, i) => <td key={i}>{co.mothersMaidenName || dummyCoApp.mother}</td>)}
              </tr>
              <tr>
                <td>Date of Birth</td>
                <td>{getApplicant().dateOfBirth || dummyApp.dob}</td>
                {coApplicants.map((co, i) => <td key={i}>{co.dateOfBirth || dummyCoApp.dob}</td>)}
              </tr>
              <tr>
                <td>Gender</td>
                <td>{getApplicant().gender || dummyApp.gender}</td>
                {coApplicants.map((co, i) => <td key={i}>{co.gender || dummyCoApp.gender}</td>)}
              </tr>
              <tr>
                <td>Marital Status</td>
                <td>{getApplicant().maritalStatus || dummyApp.marital}</td>
                {coApplicants.map((co, i) => <td key={i}>{co.maritalStatus || dummyCoApp.marital}</td>)}
              </tr>
              <tr>
                <td>Category</td>
                <td>{getApplicant().category || dummyApp.category}</td>
                {coApplicants.map((co, i) => <td key={i}>{co.category || dummyCoApp.category}</td>)}
              </tr>
              <tr>
                <td>Religion</td>
                <td>{getApplicant().religion || dummyApp.religion}</td>
                {coApplicants.map((co, i) => <td key={i}>{co.religion || dummyCoApp.religion}</td>)}
              </tr>
              <tr>
                <td>Mobile No</td>
                <td>{getApplicant().mobileNo || dummyApp.mobile}</td>
                {coApplicants.map((co, i) => <td key={i}>{co.mobileNo || dummyCoApp.mobile}</td>)}
              </tr>
              <tr>
                <td>Email ID</td>
                <td>{getApplicant().emailId || dummyApp.email}</td>
                {coApplicants.map((co, i) => <td key={i}>{co.emailId || dummyCoApp.email}</td>)}
              </tr>
              <tr>
                <td>Relationship with Applicant</td>
                <td>SELF</td>
                {coApplicants.map((co, i) => <td key={i}>{co.relationshipWithApplicant || dummyCoApp.rel}</td>)}
              </tr>
            </tbody>
          </table>
          
          <div className="pdf-section-title">KYC DOCUMENTS & VERIFICATION</div>
          <table className="pdf-table">
            <thead>
              <tr>
                <th className="pdf-row-header">Document</th>
                <th>Applicant</th>
                {coApplicants.map((_, i) => <th key={i}>CoApplicant {i + 1}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Aadhaar Last 4</td>
                <td>{getKycData().applicant?.aadhaarLast4 || dummyApp.aadhaar}</td>
                {coApplicants.map((_, i) => <td key={i}>{getKycData().coApplicants?.[i]?.aadhaarLast4 || dummyCoApp.aadhaar}</td>)}
              </tr>
              <tr>
                <td>PAN Card No</td>
                <td>{getKycData().applicant?.panCardNo || getApplicant().panCardNo || dummyApp.pan}</td>
                {coApplicants.map((co, i) => <td key={i}>{getKycData().coApplicants?.[i]?.panCardNo || co.panCardNo || dummyCoApp.pan}</td>)}
              </tr>
              <tr>
                <td>Identity Doc Type</td>
                <td>{getKycData().applicant?.identityDocumentType || dummyApp.docType}</td>
                {coApplicants.map((_, i) => <td key={i}>{getKycData().coApplicants?.[i]?.identityDocumentType || dummyCoApp.docType}</td>)}
              </tr>
              <tr>
                <td>Identity Doc No</td>
                <td>{getKycData().applicant?.identityDocumentNo || dummyApp.docNo}</td>
                {coApplicants.map((_, i) => <td key={i}>{getKycData().coApplicants?.[i]?.identityDocumentNo || dummyCoApp.docNo}</td>)}
              </tr>
              <tr>
                <td>Verification Status</td>
                <td>{getKycData().applicant?.verificationStatus || dummyApp.kycStatus}</td>
                {coApplicants.map((_, i) => <td key={i}>{getKycData().coApplicants?.[i]?.verificationStatus || dummyCoApp.kycStatus}</td>)}
              </tr>
            </tbody>
          </table>
        </div>

        {/* PAGE 2: ADDRESS, EMPLOYMENT, DOCUMENTS */}
        <div className="pdf-page">
          <div className="pdf-section-title">ADDRESS DETAILS</div>
          <table className="pdf-table">
            <thead>
              <tr>
                <th className="pdf-row-header">Current Address</th>
                <th>Applicant</th>
                {coApplicants.map((_, i) => <th key={i}>CoApplicant {i + 1}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Address Line 1</td>
                <td>{getAddressData().applicant?.current?.addressLine1 || dummyAddress.line1}</td>
                {coApplicants.map((_, i) => <td key={i}>{getAddressData().coApplicants?.[i]?.current?.addressLine1 || dummyAddress.line1}</td>)}
              </tr>
              <tr>
                <td>Address Line 2</td>
                <td>{getAddressData().applicant?.current?.addressLine2 || dummyAddress.line2}</td>
                {coApplicants.map((_, i) => <td key={i}>{getAddressData().coApplicants?.[i]?.current?.addressLine2 || dummyAddress.line2}</td>)}
              </tr>
              <tr>
                <td>Landmark</td>
                <td>{getAddressData().applicant?.current?.landmark || dummyAddress.landmark}</td>
                {coApplicants.map((_, i) => <td key={i}>{getAddressData().coApplicants?.[i]?.current?.landmark || dummyAddress.landmark}</td>)}
              </tr>
              <tr>
                <td>City & State</td>
                <td>{getAddressData().applicant?.current?.city || dummyAddress.city}, {getAddressData().applicant?.current?.state || dummyAddress.state}</td>
                {coApplicants.map((_, i) => <td key={i}>{getAddressData().coApplicants?.[i]?.current?.city || dummyAddress.city}, {getAddressData().coApplicants?.[i]?.current?.state || dummyAddress.state}</td>)}
              </tr>
              <tr>
                <td>Pincode</td>
                <td>{getAddressData().applicant?.current?.pincode || dummyAddress.pin}</td>
                {coApplicants.map((_, i) => <td key={i}>{getAddressData().coApplicants?.[i]?.current?.pincode || dummyAddress.pin}</td>)}
              </tr>
            </tbody>
          </table>

          <div className="pdf-section-title">EMPLOYMENT & INCOME DETAILS</div>
          <table className="pdf-table">
            <thead>
              <tr>
                <th className="pdf-row-header">Employment Info</th>
                <th>Applicant</th>
                {coApplicants.map((_, i) => <th key={i}>CoApplicant {i + 1}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Occupation Category</td>
                <td>{getEmpData().applicant?.employmentType || dummyEmp.type}</td>
                {coApplicants.map((_, i) => <td key={i}>{getEmpData().coApplicants?.[i]?.employmentType || dummyEmp.type}</td>)}
              </tr>
              <tr>
                <td>Employer Name</td>
                <td>{getEmpData().applicant?.employerName || dummyEmp.employer}</td>
                {coApplicants.map((_, i) => <td key={i}>{getEmpData().coApplicants?.[i]?.employerName || dummyEmp.employer}</td>)}
              </tr>
              <tr>
                <td>Designation</td>
                <td>{getEmpData().applicant?.designation || dummyEmp.desig}</td>
                {coApplicants.map((_, i) => <td key={i}>{getEmpData().coApplicants?.[i]?.designation || dummyEmp.desig}</td>)}
              </tr>
              <tr>
                <td>Industry Type</td>
                <td>{getEmpData().applicant?.industryType || dummyEmp.industry}</td>
                {coApplicants.map((_, i) => <td key={i}>{getEmpData().coApplicants?.[i]?.industryType || dummyEmp.industry}</td>)}
              </tr>
              <tr>
                <td>Total Experience (Years)</td>
                <td>{getEmpData().applicant?.totalExperience || dummyEmp.exp}</td>
                {coApplicants.map((_, i) => <td key={i}>{getEmpData().coApplicants?.[i]?.totalExperience || dummyEmp.exp}</td>)}
              </tr>
              <tr>
                <td>Gross Monthly Income</td>
                <td>{getEmpData().applicant?.grossMonthlyIncome || dummyEmp.gross}</td>
                {coApplicants.map((_, i) => <td key={i}>{getEmpData().coApplicants?.[i]?.grossMonthlyIncome || dummyEmp.gross}</td>)}
              </tr>
              <tr>
                <td>Other Monthly Income</td>
                <td>{getEmpData().applicant?.otherMonthlyIncome || dummyEmp.other}</td>
                {coApplicants.map((_, i) => <td key={i}>{getEmpData().coApplicants?.[i]?.otherMonthlyIncome || dummyEmp.other}</td>)}
              </tr>
              <tr>
                <td>Net Monthly Income</td>
                <td>{getEmpData().applicant?.netMonthlyIncome || dummyEmp.net}</td>
                {coApplicants.map((_, i) => <td key={i}>{getEmpData().coApplicants?.[i]?.netMonthlyIncome || dummyEmp.net}</td>)}
              </tr>
            </tbody>
          </table>

          <div className="pdf-section-title">KYC DOCUMENT IMAGES</div>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '10px' }}>
            <div style={{ width: '48%', border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>Applicant PAN Card</div>
              <img src="https://placehold.co/400x200/e2e8f0/475569?text=PAN+Card+Image" alt="PAN" style={{ width: '100%', height: '120px', objectFit: 'cover' }} />
            </div>
            <div style={{ width: '48%', border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>Applicant Aadhaar (Front & Back)</div>
              <img src="https://placehold.co/400x200/e2e8f0/475569?text=Aadhaar+Image" alt="Aadhaar" style={{ width: '100%', height: '120px', objectFit: 'cover' }} />
            </div>
            {coApplicants.map((_, i) => (
              <React.Fragment key={i}>
                <div style={{ width: '48%', border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>Co-Applicant {i + 1} PAN Card</div>
                  <img src="https://placehold.co/400x200/e2e8f0/475569?text=PAN+Card+Image" alt="PAN" style={{ width: '100%', height: '120px', objectFit: 'cover' }} />
                </div>
                <div style={{ width: '48%', border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>Co-Applicant {i + 1} Aadhaar</div>
                  <img src="https://placehold.co/400x200/e2e8f0/475569?text=Aadhaar+Image" alt="Aadhaar" style={{ width: '100%', height: '120px', objectFit: 'cover' }} />
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* PAGE 3: BANKING, COLLATERAL, REFERENCES */}
        <div className="pdf-page">
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
                <td>{getBankData().applicant?.accounts?.[0]?.bankName || dummyBank.bank}</td>
                <td>{getBankData().applicant?.accounts?.[0]?.accountHolderName || dummyBank.holder}</td>
                <td>{getBankData().applicant?.accounts?.[0]?.accountNumber || dummyBank.acct}</td>
                <td>{getBankData().applicant?.accounts?.[0]?.ifscCode || dummyBank.ifsc}</td>
                <td>{getBankData().applicant?.existingLoans?.[0]?.totalExistingEmi || dummyBank.emi}</td>
              </tr>
              {coApplicants.map((_, i) => (
                <tr key={i}>
                  <td>Co-Applicant {i + 1}</td>
                  <td>{getBankData().coApplicants?.[i]?.accounts?.[0]?.bankName || dummyBank.bank}</td>
                  <td>{getBankData().coApplicants?.[i]?.accounts?.[0]?.accountHolderName || dummyBank.holder}</td>
                  <td>{getBankData().coApplicants?.[i]?.accounts?.[0]?.accountNumber || dummyBank.acct}</td>
                  <td>{getBankData().coApplicants?.[i]?.accounts?.[0]?.ifscCode || dummyBank.ifsc}</td>
                  <td>{getBankData().coApplicants?.[i]?.existingLoans?.[0]?.totalExistingEmi || dummyBank.emi}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pdf-section-title">COLLATERAL DETAILS</div>
          <table className="pdf-table">
            <tbody>
              <tr>
                <td className="pdf-row-header">Property Type</td>
                <td>{getColData().propertyType || 'Independent House'}</td>
              </tr>
              <tr>
                <td className="pdf-row-header">Property Address</td>
                <td>{getColData().propertyAddress || '123 Main St, Anna Nagar, Chennai'}</td>
              </tr>
              <tr>
                <td className="pdf-row-header">Estimated Market Value</td>
                <td>Rs. {getColData().estimatedMarketValue || '5000000'}</td>
              </tr>
              <tr>
                <td className="pdf-row-header">Is Property Identified?</td>
                <td>{getColData().isPropertyIdentified !== undefined ? (getColData().isPropertyIdentified ? 'Yes' : 'No') : 'Yes'}</td>
              </tr>
            </tbody>
          </table>

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
              {((getRefData().references?.length > 0) ? getRefData().references : [
                { fullName: 'John Doe', relationship: 'Friend', mobileNo: '9876543210', address: 'Anna Nagar, Chennai' },
                { fullName: 'Jane Smith', relationship: 'Colleague', mobileNo: '9876543211', address: 'T Nagar, Chennai' }
              ]).map((ref, i) => (
                <tr key={i}>
                  <td>Reference {i + 1}</td>
                  <td>{ref.fullName || ''}</td>
                  <td>{ref.relationship || ''}</td>
                  <td>{ref.mobileNo || ''}</td>
                  <td>{ref.address || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PAGE 4: SOURCING, CHARGES, CHECKLIST, VERIFICATION */}
        <div className="pdf-page">
          <div className="pdf-section-title">SOURCING DETAILS</div>
          <table className="pdf-table">
            <tbody>
              <tr>
                <td className="pdf-row-header">Sourcing Channel</td>
                <td>{getSourcingData().sourcingChannel || 'DSA'}</td>
                <td className="pdf-row-header">DSA / Connector Name</td>
                <td>{getSourcingData().dsaName || getSourcingData().connectorName || 'ABC Financial Services'}</td>
              </tr>
              <tr>
                <td className="pdf-row-header">Lead ID</td>
                <td>{getSourcingData().leadId || 'LD-2026-991'}</td>
                <td className="pdf-row-header">Login RM ID</td>
                <td>{getSourcingData().loginRmId || 'RM-06013268'}</td>
              </tr>
            </tbody>
          </table>

          <div className="pdf-section-title">SCHEDULE OF CHARGES</div>
          <table className="pdf-table">
            <thead>
              <tr>
                <th>Charge Type</th>
                <th>Amount (Rs.)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Processing Fee</td>
                <td>{getChargesData().processingFee || '3500'}</td>
                <td>{getChargesData().status || 'Pending'}</td>
              </tr>
              <tr>
                <td>Valuation Fee</td>
                <td>{getChargesData().valuationFee || '2500'}</td>
                <td>{getChargesData().status || 'Pending'}</td>
              </tr>
              <tr>
                <td>Legal Fee</td>
                <td>{getChargesData().legalFee || '2000'}</td>
                <td>{getChargesData().status || 'Pending'}</td>
              </tr>
            </tbody>
          </table>

          <div className="pdf-section-title">FIELD VERIFICATION (STEP 1 & 2)</div>
          <table className="pdf-table">
            <tbody>
              <tr>
                <td className="pdf-row-header">FI Status (Step 1)</td>
                <td>{appData.sections?.fieldVerification?.status || 'Verified'}</td>
              </tr>
              <tr>
                <td className="pdf-row-header">FI Remarks (Step 1)</td>
                <td>{appData.sections?.fieldVerification?.remarks || 'Applicant verified at residence.'}</td>
              </tr>
              <tr>
                <td className="pdf-row-header">Property Verification (Step 2)</td>
                <td>{appData.sections?.fieldVerificationStep2?.status || 'Verified'}</td>
              </tr>
              <tr>
                <td className="pdf-row-header">Property Remarks (Step 2)</td>
                <td>{appData.sections?.fieldVerificationStep2?.remarks || 'Property boundaries matched with docs.'}</td>
              </tr>
            </tbody>
          </table>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '10px' }}>
            <div style={{ width: '48%', border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>Residence/Office Photo</div>
              <img src="https://placehold.co/400x200/e2e8f0/475569?text=Residence+Photo" alt="FI" style={{ width: '100%', height: '120px', objectFit: 'cover' }} />
            </div>
            <div style={{ width: '48%', border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>Property/Collateral Photo</div>
              <img src="https://placehold.co/400x200/e2e8f0/475569?text=Property+Photo" alt="Collateral" style={{ width: '100%', height: '120px', objectFit: 'cover' }} />
            </div>
          </div>

          <div className="pdf-section-title" style={{marginTop: '20px'}}>DECLARATION</div>
          <p className="pdf-text-small pdf-text-justify">
            I/We declare that all the particulars and information given in this application form are true, correct and complete...
          </p>
          <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '40px'}}>
            <div>Applicant Signature: __________________</div>
            {coApplicants.map((_, i) => (
              <div key={i}>Co-Applicant {i + 1}: __________________</div>
            ))}
          </div>

        </div>

      </div>
    </div>
  );
}
