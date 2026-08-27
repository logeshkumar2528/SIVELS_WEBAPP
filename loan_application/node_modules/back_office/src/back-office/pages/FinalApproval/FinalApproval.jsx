/**
 * FinalApproval.jsx
 * --------------------
 * Step 6: Final Approval & Sanction page.
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
  LOAN_SUMMARY, APPROVAL_CHECKLIST, SANCTION_DETAILS, APPROVAL_HISTORY
} from './finalApprovalData';
import './FinalApproval.css';

const BREADCRUMB_ITEMS = [
  { label: 'Back Office Dashboard', path: ROUTES.DASHBOARD },
  { label: 'New Applications',      path: ROUTES.NEW_APPLICATIONS },
  { label: 'Final Approval & Sanction' }
];

function FinalApproval() {
  const [approvalAction, setApprovalAction] = useState('approve');
  const navigate = useNavigate();
  const { id } = useParams();

  const handleContinue = () => {
    navigate(ROUTES.DISBURSEMENT.replace(':id', id || 'APP123'));
  };

  const ArrowLeftIcon  = iconMap['ArrowLeft'];
  const SaveIcon       = iconMap['Save'];
  const ArrowRightIcon = iconMap['ArrowRight'];
  const CheckCircleIcon= iconMap['CheckCircle2'];
  const ShieldCheckIcon= iconMap['ShieldCheck'];
  const FileTextIcon   = iconMap['FileText'];
  const InfoIcon       = iconMap['Info'];
  const AlertIcon      = iconMap['AlertTriangle'];

  return (
    <MainLayout
      title="Final Approval & Sanction"
      user={CURRENT_USER}
      badgeCounts={BADGE_COUNTS}
      notificationCount={12}
    >
      <Breadcrumb items={BREADCRUMB_ITEMS} />
      <InfoBar fields={INFO_BAR_FIELDS} />
      <StepProgress steps={VERIFICATION_STEPS} activeStep={6} />

      <div className="final-grid">
        
        {/* ========== LEFT (Loan Summary) ========== */}
        <div className="final-col-left">
          <section className="final-card h-full">
            <h3 className="final-card-title with-icon">
              {FileTextIcon && <FileTextIcon size={16} className="text-success" />}
              Loan Summary for Approval
            </h3>
            <div className="final-summary-list">
              {LOAN_SUMMARY.map(item => (
                <div key={item.label} className="final-summary-row">
                  <span className="fsr-label">{item.label}</span>
                  <span className={`fsr-value ${item.highlight ? 'text-success font-bold' : ''}`}>{item.value}</span>
                </div>
              ))}
            </div>

            <div className="sanction-amount-box mt-5">
              {ShieldCheckIcon && <ShieldCheckIcon size={24} className="text-success sa-icon" />}
              <span className="sa-label">Sanctioned Amount</span>
              <span className="sa-value text-success">₹ 1,50,000</span>
              <span className="sa-words">One Lakh Fifty Thousand Only</span>
              
              <div className="sa-badge">
                <div className="sa-badge-inner">RECOMMENDED</div>
              </div>
              <p className="sa-subtext text-success text-right mt-2 font-semibold">Eligible & Recommended<br/>Based on credit evaluation</p>
            </div>
          </section>
        </div>

        {/* ========== MIDDLE (Checklist & Action) ========== */}
        <div className="final-col-middle">
          
          {/* Approval Checklist */}
          <section className="final-card">
            <h3 className="final-card-title with-icon">
              {ShieldCheckIcon && <ShieldCheckIcon size={16} className="text-success" />}
              Approval Checklist
            </h3>
            <div className="approval-checklist">
              {APPROVAL_CHECKLIST.map(item => (
                <div key={item.label} className="ac-row">
                  <div className="ac-icon">
                    {CheckCircleIcon && <CheckCircleIcon size={16} className="text-success" />}
                  </div>
                  <div className="ac-content">
                    <span className="ac-label">{item.label}</span>
                    <span className="ac-desc">{item.desc}</span>
                  </div>
                  <div className="ac-status">
                    <span className="decision-badge badge-success">{item.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Select Action */}
          <section className="final-card">
            <h3 className="final-card-title">Select Approval Action</h3>
            <div className="action-radio-group">
              <label className={`action-radio-label ${approvalAction === 'approve' ? 'selected' : ''}`}>
                <input type="radio" name="approvalAction" value="approve" checked={approvalAction === 'approve'} onChange={(e) => setApprovalAction(e.target.value)} />
                <div className="ar-text">
                  <span className="ar-title text-success font-semibold">Approve & Sanction Loan</span>
                  <span className="ar-desc">Proceed to disbursement after approval</span>
                </div>
              </label>
              
              <label className={`action-radio-label ${approvalAction === 'modify' ? 'selected' : ''}`}>
                <input type="radio" name="approvalAction" value="modify" checked={approvalAction === 'modify'} onChange={(e) => setApprovalAction(e.target.value)} />
                <div className="ar-text">
                  <span className="ar-title">Approve with Modified Amount</span>
                  <span className="ar-desc">Approve with changes in amount / tenure / interest</span>
                </div>
              </label>

              <label className={`action-radio-label ${approvalAction === 'reject' ? 'selected' : ''}`}>
                <input type="radio" name="approvalAction" value="reject" checked={approvalAction === 'reject'} onChange={(e) => setApprovalAction(e.target.value)} />
                <div className="ar-text">
                  <span className="ar-title text-danger">Reject Application</span>
                  <span className="ar-desc">Reject application and return to RM</span>
                </div>
              </label>
            </div>
          </section>

        </div>

        {/* ========== RIGHT (Sanction Details & Right Panel) ========== */}
        <div className="final-col-right-split">
          {/* Sanction Details */}
          <section className="final-card h-full">
            <h3 className="final-card-title with-icon">
              {iconMap['FileText'] && <iconMap.FileText size={16} className="text-success" />}
              Sanction Details
            </h3>
            <div className="final-summary-list">
              {SANCTION_DETAILS.map(item => (
                <div key={item.label} className="final-summary-row">
                  <span className="fsr-label">{item.label}</span>
                  <span className={`fsr-value ${item.highlight ? 'text-success font-bold' : ''}`}>{item.value}</span>
                </div>
              ))}
            </div>

            <div className="next-steps-info mt-4">
              <h4 className="nsi-title">{InfoIcon && <InfoIcon size={14} className="text-primary" />} Next Steps After Approval</h4>
              <ul className="nsi-list">
                <li>Loan will be disbursed to customer's bank account.</li>
                <li>Customer will receive confirmation via SMS / Email / WhatsApp.</li>
                <li>EMI schedule will be generated automatically.</li>
                <li>Repayment tracking will be enabled.</li>
              </ul>
            </div>
          </section>
        </div>

        {/* ========== FAR RIGHT (Customer, Remarks, Alert) ========== */}
        <div className="final-col-far-right">
          <CustomerSummary data={CS_DATA} />

          <div className="important-note-box mt-4">
            <h4 className="inb-title">{AlertIcon && <AlertIcon size={16} className="text-warning" />} Important Note</h4>
            <p className="inb-text">After approval, loan amount will be disbursed and customer will be notified immediately.</p>
            <p className="inb-text">Please ensure all details are correct before sanctioning the loan.</p>
          </div>
        </div>
      </div>

      {/* ========== BOTTOM (Approval History) ========== */}
      <section className="final-card mb-5">
        <h3 className="final-card-title text-primary">Approval History</h3>
        <div className="history-table-wrap">
          <table className="history-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>By</th>
                <th>Role</th>
                <th>Remarks</th>
                <th>Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {APPROVAL_HISTORY.map((row, idx) => (
                <tr key={idx} className={row.isCurrent ? 'history-row-current' : ''}>
                  <td className={row.isCurrent ? 'text-success font-semibold' : ''}>{row.action}</td>
                  <td className={row.isCurrent ? 'text-success font-semibold' : ''}>{row.by}</td>
                  <td className={row.isCurrent ? 'text-success font-semibold' : ''}>{row.role}</td>
                  <td className={row.isCurrent ? 'text-success font-semibold' : ''}>{row.remarks}</td>
                  <td className={row.isCurrent ? 'text-success font-semibold' : ''}>{row.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ========== BOTTOM ACTION BAR ========== */}
      <div className="final-action-bar">
        <Button label="Return to Previous" variant="outline" size="md" icon={ArrowLeftIcon && <ArrowLeftIcon size={15} />} onClick={() => navigate(-1)} className="text-danger border-danger" />
        <div className="final-action-right">
          <Button label="Save Progress" variant="outline" size="md" icon={SaveIcon && <SaveIcon size={15} />} onClick={() => {}} className="text-warning border-warning" />
          <Button label="Approve & Sanction Loan" variant="primary" size="md" icon={ArrowRightIcon && <ArrowRightIcon size={15} />} onClick={handleContinue} className="bg-success border-success btn-large" />
        </div>
      </div>

    </MainLayout>
  );
}

export default FinalApproval;
