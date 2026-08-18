/**
 * Disbursement.jsx
 * --------------------
 * Step 7: Disbursement & Loan Release page.
 */

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MainLayout     from '../../layouts/MainLayout/MainLayout';
import Breadcrumb     from '../../components/Breadcrumb/Breadcrumb';
import InfoBar        from '../../components/InfoBar/InfoBar';
import StepProgress   from '../../components/StepProgress/StepProgress';
import CustomerSummary from '../../components/CustomerSummary/CustomerSummary';
import Button         from '../../components/Button/Button';
import iconMap        from '../../config/iconMap';
import { ROUTES }     from '../../config/routeConfig';
import {
  CURRENT_USER, BADGE_COUNTS, INFO_BAR_FIELDS, VERIFICATION_STEPS, CUSTOMER_SUMMARY as CS_DATA,
  DISBURSEMENT_ACCOUNT_DETAILS, DISBURSEMENT_INFO, EMI_SCHEDULE_SUMMARY, EMI_SCHEDULE_ROWS,
  DISBURSEMENT_CHECKLIST, DISBURSEMENT_STATUS_STEPS
} from './disbursementData';
import './Disbursement.css';

const BREADCRUMB_ITEMS = [
  { label: 'Back Office Dashboard', path: ROUTES.DASHBOARD },
  { label: 'New Applications',      path: ROUTES.NEW_APPLICATIONS },
  { label: 'Disbursement & Loan Release' }
];

function Disbursement() {
  const [whatsapp, setWhatsapp] = useState('+91 98765 43210');
  const [email, setEmail] = useState('ramesh.kumar@gmail.com');
  const [disbursed, setDisbursed] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();

  const handleDisburse = () => {
    setDisbursed(true);
    // After disburse, navigate to Disbursement History or Dashboard
    setTimeout(() => {
      navigate(ROUTES.DISBURSEMENT_HISTORY);
    }, 1500);
  };

  const ArrowLeftIcon   = iconMap['ArrowLeft'];
  const SaveIcon        = iconMap['Save'];
  const ArrowRightIcon  = iconMap['ArrowRight'];
  const CheckCircleIcon = iconMap['CheckCircle2'];
  const ShieldCheckIcon = iconMap['ShieldCheck'];
  const FileTextIcon    = iconMap['FileText'];
  const InfoIcon        = iconMap['Info'];
  const ExternalLinkIcon= iconMap['ExternalLink'];
  const SendIcon        = iconMap['Send'];
  const MessageIcon     = iconMap['MessageSquare'];
  const UserIcon        = iconMap['User'];

  return (
    <MainLayout
      title="Disbursement & Loan Release"
      user={CURRENT_USER}
      badgeCounts={BADGE_COUNTS}
      notificationCount={12}
    >
      <Breadcrumb items={BREADCRUMB_ITEMS} />
      <InfoBar fields={INFO_BAR_FIELDS} />
      <StepProgress steps={VERIFICATION_STEPS} activeStep={7} />

      <div className="disb-grid">
        
        {/* ========== LEFT (Customer Summary & Sanction Box) ========== */}
        <div className="disb-col-left">
          <CustomerSummary data={CS_DATA} />

          <div className="sanction-amount-box mt-4">
            {ShieldCheckIcon && <ShieldCheckIcon size={24} className="text-success sa-icon" />}
            <span className="sa-label">Sanctioned Amount</span>
            <span className="sa-value text-success">₹ 1,50,000</span>
            <span className="sa-words">(One Lakh Fifty Thousand Only)</span>
            
            <div className="sa-badge">
              <div className="sa-badge-inner">APPROVED</div>
            </div>
          </div>
        </div>

        {/* ========== MIDDLE (Disbursement Details & EMI Schedule) ========== */}
        <div className="disb-col-middle">
          
          {/* Disbursement Details Card */}
          <section className="disb-card">
            <h3 className="disb-card-title">Disbursement Details</h3>

            <div className="disb-details-grid">
              {/* Account Details */}
              <div className="disb-subcard">
                <h4 className="disb-subcard-title">Disbursement Account Details</h4>
                <div className="bank-account-box">
                  <div className="bank-logo">HDFC</div>
                  <span className="bank-name">{DISBURSEMENT_ACCOUNT_DETAILS.bankName}</span>
                </div>
                <div className="subcard-list">
                  <div className="subcard-row">
                    <span className="sr-label">Account Holder Name</span>
                    <span className="sr-value">{DISBURSEMENT_ACCOUNT_DETAILS.accountHolder}</span>
                  </div>
                  <div className="subcard-row">
                    <span className="sr-label">Account Number</span>
                    <span className="sr-value">{DISBURSEMENT_ACCOUNT_DETAILS.accountNumber}</span>
                  </div>
                  <div className="subcard-row">
                    <span className="sr-label">IFSC Code</span>
                    <span className="sr-value">{DISBURSEMENT_ACCOUNT_DETAILS.ifscCode}</span>
                  </div>
                  <div className="subcard-row">
                    <span className="sr-label">Account Type</span>
                    <span className="sr-value">{DISBURSEMENT_ACCOUNT_DETAILS.accountType}</span>
                  </div>
                  <div className="subcard-row">
                    <span className="sr-label">Branch</span>
                    <span className="sr-value">{DISBURSEMENT_ACCOUNT_DETAILS.branch}</span>
                  </div>
                </div>
              </div>

              {/* Disbursement Information */}
              <div className="disb-subcard">
                <h4 className="disb-subcard-title">Disbursement Information</h4>
                <div className="subcard-list">
                  <div className="subcard-row">
                    <span className="sr-label">Sanctioned Amount</span>
                    <span className="sr-value">{DISBURSEMENT_INFO.sanctionedAmount}</span>
                  </div>
                  <div className="subcard-row">
                    <span className="sr-label">Processing Fee</span>
                    <span className="sr-value text-danger">{DISBURSEMENT_INFO.processingFee}</span>
                  </div>
                  <div className="subcard-row">
                    <span className="sr-label">Stamp Duty</span>
                    <span className="sr-value text-danger">{DISBURSEMENT_INFO.stampDuty}</span>
                  </div>
                  <div className="subcard-row">
                    <span className="sr-label">Other Charges</span>
                    <span className="sr-value">{DISBURSEMENT_INFO.otherCharges}</span>
                  </div>
                </div>

                <div className="subcard-row mt-4 font-semibold">
                  <span className="sr-label font-semibold text-primary">Net Disbursement Amount</span>
                  <span className="sr-value text-success font-bold" style={{ fontSize: '15px' }}>{DISBURSEMENT_INFO.netDisbursementAmount}</span>
                </div>

                <div className="net-disb-box">
                  <p className="nd-label">Amount in Words</p>
                  <p className="nd-words">{DISBURSEMENT_INFO.amountInWords}</p>
                </div>
              </div>
            </div>
          </section>

          {/* EMI Schedule Preview */}
          <section className="disb-card">
            <div className="disb-card-header">
              <h3 className="disb-card-title mb-0">EMI Schedule Preview</h3>
              <button className="view-full-btn">
                View Full Schedule {ExternalLinkIcon && <ExternalLinkIcon size={12} />}
              </button>
            </div>

            <div className="emi-summary-bar">
              <div className="esb-item">
                <span className="esb-label">Tenure</span>
                <span className="esb-value">{EMI_SCHEDULE_SUMMARY.tenure}</span>
              </div>
              <div className="esb-item">
                <span className="esb-label">Interest Rate (ROI)</span>
                <span className="esb-value">{EMI_SCHEDULE_SUMMARY.roi}</span>
              </div>
              <div className="esb-item">
                <span className="esb-label">Monthly EMI</span>
                <span className="esb-value">{EMI_SCHEDULE_SUMMARY.monthlyEmi}</span>
              </div>
              <div className="esb-item">
                <span className="esb-label">First EMI Date</span>
                <span className="esb-value">{EMI_SCHEDULE_SUMMARY.firstEmiDate}</span>
              </div>
            </div>

            <div className="emi-table-wrap">
              <table className="emi-table">
                <thead>
                  <tr>
                    <th>EMI No.</th>
                    <th>Due Date</th>
                    <th>Principal (₹)</th>
                    <th>Interest (₹)</th>
                    <th>EMI (₹)</th>
                    <th>Outstanding (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {EMI_SCHEDULE_ROWS.map((row, idx) => (
                    <tr key={idx}>
                      <td>{row.emiNo}</td>
                      <td>{row.dueDate}</td>
                      <td>{row.principal}</td>
                      <td>{row.interest}</td>
                      <td>{row.emi}</td>
                      <td>{row.outstanding}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="emi-info-callout">
              {InfoIcon && <InfoIcon size={14} className="text-primary" />}
              EMI will be auto-debited from customer's bank account on due date.
            </div>
          </section>

        </div>

        {/* ========== RIGHT (Checklist, Status Stepper, Notification) ========== */}
        <div className="disb-col-right">
          
          {/* Disbursement Checklist */}
          <section className="disb-card">
            <h3 className="disb-card-title with-icon">
              {FileTextIcon && <FileTextIcon size={16} className="text-success" />}
              Disbursement Checklist
            </h3>
            <div className="disb-checklist-list">
              {DISBURSEMENT_CHECKLIST.map((item, idx) => (
                <div key={idx} className="dcl-row">
                  <span className="dcl-label">
                    {CheckCircleIcon && <CheckCircleIcon size={14} className={item.isCompleted ? 'text-success' : 'text-primary'} />}
                    {item.label}
                  </span>
                  <span className={item.isCompleted ? 'badge-completed' : 'badge-in-progress'}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Disbursement Status */}
          <section className="disb-card">
            <h3 className="disb-card-title with-icon">
              {FileTextIcon && <FileTextIcon size={16} className="text-primary" />}
              Disbursement Status
            </h3>

            <div className="timeline-stepper">
              {DISBURSEMENT_STATUS_STEPS.map(step => (
                <div key={step.id} className={`ts-step ${step.status}`}>
                  <div className="ts-icon-wrap">
                    {step.status === 'completed' && CheckCircleIcon && <CheckCircleIcon size={16} />}
                    {step.status === 'in-progress' && FileTextIcon && <FileTextIcon size={16} />}
                    {step.status === 'pending' && <span style={{ fontSize: '10px' }}>⏳</span>}
                  </div>
                  <span className="ts-title">{step.title}</span>
                  <span className="ts-date">{step.date}</span>
                </div>
              ))}
            </div>

            <div className="status-info-callout">
              {InfoIcon && <InfoIcon size={14} className="text-primary" />}
              Loan amount is being transferred to customer's bank account. This may take a few minutes.
            </div>
          </section>

          {/* Send Disbursement Notification */}
          <section className="disb-card">
            <h3 className="disb-card-title">Send Disbursement Notification</h3>
            
            <div className="send-notif-grid">
              <div className="sn-row">
                <div className="sn-icon-title">
                  {MessageIcon && <MessageIcon size={14} className="text-success" />}
                  <span>Send via WhatsApp</span>
                </div>
                <div className="sn-input-wrap">
                  <input type="text" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="sn-input" />
                  <Button label="Send" variant="primary" size="sm" className="bg-success border-success" />
                </div>
              </div>

              <div className="sn-row">
                <div className="sn-icon-title">
                  {UserIcon && <UserIcon size={14} className="text-primary" />}
                  <span>Send via Email</span>
                </div>
                <div className="sn-input-wrap">
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="sn-input" />
                  <Button label="Send" variant="primary" size="sm" className="bg-success border-success" />
                </div>
              </div>
            </div>
          </section>

        </div>

      </div>

      {/* ========== BOTTOM ACTION BAR ========== */}
      <div className="disb-action-bar">
        <Button label="Return to Final Approval" variant="outline" size="md" icon={ArrowLeftIcon && <ArrowLeftIcon size={15} />} onClick={() => navigate(-1)} className="text-danger border-danger" />
        <div className="disb-action-right">
          <Button label="Save Progress" variant="outline" size="md" icon={SaveIcon && <SaveIcon size={15} />} onClick={() => {}} className="text-warning border-warning" />
          <Button 
            label={disbursed ? "Loan Amount Disbursed!" : "Disburse Now"} 
            variant="primary" 
            size="md" 
            icon={ArrowRightIcon && <ArrowRightIcon size={15} />} 
            onClick={handleDisburse} 
            className="bg-success border-success btn-large" 
          />
        </div>
      </div>

    </MainLayout>
  );
}

export default Disbursement;
