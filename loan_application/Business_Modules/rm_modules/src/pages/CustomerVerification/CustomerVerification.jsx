import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import iconMap from '../../config/iconMap';
import InfoBar from '../../components/InfoBar/InfoBar';
import StepProgress from '../../components/StepProgress/StepProgress';
import CustomerSummary from '../../components/CustomerSummary/CustomerSummary';
import Button from '../../components/Button/Button';
import Modal from '../../components/Modal/Modal';
import { ROUTES } from '../../config/routeConfig';
import { useApplicationDraftStore } from '../../state/ApplicationDraftContext';
import { formatDateTime } from '../../utils/dateHelper';
import './CustomerVerification.css';

export default function CustomerVerification() {
  const navigate = useNavigate();
  const { applicationId } = useParams();
  const appId = applicationId;
  const { getApplication, ensureApplication } = useApplicationDraftStore();

  useEffect(() => {
    ensureApplication(appId);
  }, [appId, ensureApplication]);

  const appData = getApplication(appId);

  const customerData = {
    appId: appData.id,
    name: appData.customerName,
    status: appData.status || 'Pending Verification',
    mobile: appData.mobile,
    age: appData.age || '32 Years',
    gender: appData.gender || 'Male',
    loanType: appData.loanProductDisplay || appData.loanType || 'Business Loan',
    occupation: appData.occupation || 'Business',
    income: appData.income || 'Rs. 35,000 - Rs. 50,000',
    loanAmount: appData.loanAmountDisplay || appData.amount || 'Rs. 1,50,000',
    loanPurpose: appData.purposeOfLoan || appData.loanType || 'Business Expansion',
    address: appData.address || 'KK Nagar, Chennai - 600078',
    aadhaarNo: appData.aadhaarNo ? `XXXX XXXX ${appData.aadhaarNo.slice(-4)}` : 'XXXX XXXX 3210',
    agentName: appData.agentName || 'Karthik Raja',
    createdDate: appData.createdDate || appData.createdAt || '',
    agentRemarks: appData.agentRemarks || 'Customer interested in business loan.',
  };

  const [checklist, setChecklist] = useState({
    q1: '',
    q2: '',
    q3: '',
    q4: '',
    q5: '',
    q6: '',
  });
  const [notes, setNotes] = useState('');
  const [showDocModal, setShowDocModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState('');

  const EyeIcon = iconMap['Eye'];
  const ArrowRightIcon = iconMap['ArrowRight'];
  const ArrowLeftIcon = iconMap['ArrowLeft'];
  const XCircleIcon = iconMap['XCircle'];
  const InfoIcon = iconMap['Info'];
  const FileTextIcon = iconMap['FileText'];
  const LandmarkIcon = iconMap['Landmark'];

  const steps = [
    { id: '1', label: 'Application Details' },
    { id: '2', label: 'Customer Verification' },
    { id: '3', label: 'Aadhaar eKYC' },
    { id: '4', label: 'Customer Registration' },
    { id: '5', label: 'Create Login' },
    { id: '6', label: 'Review & Submit' },
  ];

  const handleRadioChange = (question, val) => {
    setChecklist((prev) => ({ ...prev, [question]: val }));
  };

  const handleProceed = () => {
    navigate(ROUTES.AADHAAR_EKYC.replace(':applicationId', appId));
  };

  const handleBack = () => {
    navigate(ROUTES.APPLICATION_DETAILS.replace(':applicationId', appId));
  };

  const openDocument = (docName) => {
    setSelectedDoc(docName);
    setShowDocModal(true);
  };

  return (
    <div className="page-container--no-scroll" style={{ gap: '10px' }}>
      <div className="cv-top-bar-row">
        <div className="cv-infobar-flex">
          <InfoBar
            appId={customerData.appId}
            agentName={`${customerData.agentName} (AGT0001)`}
            branch={customerData.address ? customerData.address.split(',')[0] : 'KK Nagar'}
            submittedTime={formatDateTime(customerData.createdDate || customerData.createdAt, 'Not submitted')}
            status={customerData.status}
          />
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={ArrowLeftIcon ? <ArrowLeftIcon size={14} /> : null}
          onClick={handleBack}
        >
          Back to Application Details
        </Button>
      </div>

      <div className="cv-main-grid">
        <div className="cv-left-col">
          <CustomerSummary customer={customerData} />
        </div>

        <div className="cv-center-col">
          <StepProgress steps={steps} activeStep={2} />

          <div className="panel cv-form-panel">
            <h3 className="cv-section-title">Step 2: Customer Verification</h3>

            <div className="alert-banner alert-banner--green">
              {InfoIcon && <InfoIcon size={14} />}
              <span>Please call the customer and verify the basic details before proceeding.</span>
            </div>

            <h4 className="cv-sub-title">Verification Checklist</h4>

            <div className="checklist-container">
              {[
                { id: 'q1', num: 1, label: 'Did you apply for loan with Sivels Finance?' },
                { id: 'q2', num: 2, label: 'Are you the correct person?' },
                { id: 'q3', num: 3, label: 'Purpose of loan verified?' },
                { id: 'q4', num: 4, label: 'Employment / Business verified?' },
                { id: 'q5', num: 5, label: 'Expected loan amount confirmed?' },
                { id: 'q6', num: 6, label: 'Customer agrees to proceed?' },
              ].map((item) => (
                <div key={item.id} className="checklist-row">
                  <div className="checklist-left flex-align-center gap-2">
                    <div className="checklist-icon-box">
                      {FileTextIcon && <FileTextIcon size={13} className="text-success" />}
                    </div>
                    <span className="checklist-text">{item.num}. {item.label}</span>
                  </div>
                  <div className="checklist-radios">
                    <label className="radio-label">
                      <input
                        type="radio"
                        name={item.id}
                        checked={checklist[item.id] === 'yes'}
                        onChange={() => handleRadioChange(item.id, 'yes')}
                      />
                      <span>Yes</span>
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name={item.id}
                        checked={checklist[item.id] === 'no'}
                        onChange={() => handleRadioChange(item.id, 'no')}
                      />
                      <span>No</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div className="form-group-notes">
              <div className="notes-label-row">
                <label className="notes-label">Verification Notes (Optional)</label>
                <span className="notes-counter">{notes.length} / 500</span>
              </div>
              <textarea
                className="cv-textarea"
                rows={3}
                placeholder="Enter notes about the customer verification call..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
              />
            </div>

            <div className="cv-action-footer flex-align-center justify-between">
              <Button
                variant="secondary"
                size="sm"
                icon={XCircleIcon ? <XCircleIcon size={15} /> : null}
                onClick={() => navigate(ROUTES.NEW_APPLICATIONS)}
              >
                Mark as Invalid
              </Button>

              <Button
                variant="primary"
                size="sm"
                icon={ArrowRightIcon ? <ArrowRightIcon size={15} /> : null}
                iconPosition="right"
                onClick={handleProceed}
              >
                Proceed to Aadhaar eKYC
              </Button>
            </div>
          </div>
        </div>

        <div className="cv-right-col">
          <div className="panel cv-docs-panel">
            <h3 className="cv-section-title">Documents Submitted by Agent</h3>

            <div className="doc-card-box">
              <div className="doc-card-top">
                <div className="flex-align-center gap-2">
                  {FileTextIcon && <FileTextIcon size={14} className="text-success" />}
                  <span className="font-bold" style={{ fontSize: '11px' }}>Aadhaar Card</span>
                </div>
                <span className="badge-available">Available</span>
              </div>

              <div className="doc-graphic-card aadhaar-graphic">
                <div className="aadhaar-head-row">
                  <div className="aadhaar-emblem">Rs. Rs. | GOVERNMENT OF INDIA</div>
                </div>
                <div className="aadhaar-body-row">
                  <div className="aadhaar-photo-box">
                    <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="Aadhaar Photo" />
                  </div>
                  <div className="aadhaar-details">
                    <div className="a-name">Ramesh Kumar</div>
                    <div className="a-sub">DOB: 12/05/1993</div>
                    <div className="a-no font-bold">XXXX XXXX 3210</div>
                  </div>
                </div>
              </div>

              <div className="doc-card-foot">
                <Button
                  size="sm"
                  variant="secondary"
                  fullWidth
                  icon={EyeIcon ? <EyeIcon size={13} /> : null}
                  onClick={() => openDocument('Aadhaar Card')}
                >
                  View Aadhaar
                </Button>
              </div>
            </div>

            <div className="doc-card-box">
              <div className="doc-card-top">
                <div className="flex-align-center gap-2">
                  {FileTextIcon && <FileTextIcon size={14} className="text-success" />}
                  <span className="font-bold" style={{ fontSize: '11px' }}>PAN Card</span>
                </div>
                <span className="badge-available">Available</span>
              </div>

              <div className="doc-graphic-card pan-graphic">
                <div className="pan-head-row">
                  <div>INCOME TAX DEPARTMENT</div>
                  <div>GOVT. OF INDIA</div>
                </div>
                <div className="pan-body-row">
                  <div className="pan-details">
                    <div className="p-lbl">Name: RAMESH KUMAR</div>
                    <div className="p-val font-bold">PAN: ABCDE1234F</div>
                  </div>
                </div>
              </div>

              <div className="doc-card-foot">
                <Button
                  size="sm"
                  variant="secondary"
                  fullWidth
                  icon={EyeIcon ? <EyeIcon size={13} /> : null}
                  onClick={() => openDocument('PAN Card')}
                >
                  View PAN
                </Button>
              </div>
            </div>

            <div className="doc-card-box">
              <div className="doc-card-top">
                <div className="flex-align-center gap-2">
                  {LandmarkIcon && <LandmarkIcon size={14} className="text-success" />}
                  <span className="font-bold" style={{ fontSize: '11px' }}>Bank Passbook</span>
                </div>
                <span className="badge-available">Available</span>
              </div>

              <div className="doc-graphic-card bank-graphic">
                <div className="bank-head-row">
                  <div className="bank-title-name font-bold">STATE BANK OF INDIA</div>
                  <div className="bank-branch-name">KK Nagar</div>
                </div>
                <div className="bank-body-row">
                  <div className="bank-details">
                    <div className="b-lbl">A/C: XXXX XXXX 5678</div>
                    <div className="b-val">IFSC: SBIN0001234</div>
                  </div>
                </div>
              </div>

              <div className="doc-card-foot">
                <Button
                  size="sm"
                  variant="secondary"
                  fullWidth
                  icon={EyeIcon ? <EyeIcon size={13} /> : null}
                  onClick={() => openDocument('Bank Passbook')}
                >
                  View Bank Passbook
                </Button>
              </div>
            </div>

            <div className="alert-banner alert-banner--blue cv-blue-alert-footer">
              {InfoIcon && <InfoIcon size={14} />}
              <span>Original documents will be verified during eKYC process.</span>
            </div>
          </div>
        </div>
      </div>

      <Modal show={showDocModal} onHide={() => setShowDocModal(false)} title={`Document Viewer: ${selectedDoc}`} size="lg">
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <div className="doc-modal-display">
            {selectedDoc === 'Aadhaar Card' ? 'Rs. Official Aadhaar Card Original' :
             selectedDoc === 'PAN Card' ? 'Rs. Official PAN Card Original' :
             'Rs. Official State Bank of India Passbook & 6 Months Statement'}
          </div>
          <p className="text-muted" style={{ marginTop: '12px' }}>Uploaded by agent Thiru (AGT0001) during field visit.</p>
        </div>
      </Modal>
    </div>
  );
}
