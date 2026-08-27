/**
 * LoanDocuments.jsx
 * --------------------
 * Step 5: Loan Documents & Agreement page.
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
  LOAN_DOCUMENTS_LIST, DOCUMENT_CHECKLIST
} from './loanDocumentsData';
import './LoanDocuments.css';

const BREADCRUMB_ITEMS = [
  { label: 'Back Office Dashboard', path: ROUTES.DASHBOARD },
  { label: 'New Applications',      path: ROUTES.NEW_APPLICATIONS },
  { label: 'Loan Documents & Agreement' }
];

function LoanDocuments() {
  const [whatsapp, setWhatsapp] = useState('+91 98765 43210');
  const [email, setEmail] = useState('ramesh.kumar@gmail.com');
  const navigate = useNavigate();
  const { id } = useParams();

  const handleContinue = () => {
    navigate(ROUTES.FINAL_APPROVAL.replace(':id', id || 'APP123'));
  };

  const ArrowLeftIcon  = iconMap['ArrowLeft'];
  const SaveIcon       = iconMap['Save'];
  const ArrowRightIcon = iconMap['ArrowRight'];
  const CheckCircleIcon= iconMap['CheckCircle2'];
  const RefreshIcon    = iconMap['RefreshCw'];
  const EyeIcon        = iconMap['Eye'];
  const DownloadIcon   = iconMap['Download'];
  const ExpandIcon     = iconMap['Expand'];
  const InfoIcon       = iconMap['Info'];

  return (
    <MainLayout
      title="Loan Documents & Agreement"
      user={CURRENT_USER}
      badgeCounts={BADGE_COUNTS}
      notificationCount={12}
    >
      <Breadcrumb items={BREADCRUMB_ITEMS} />
      <InfoBar fields={INFO_BAR_FIELDS} />
      <StepProgress steps={VERIFICATION_STEPS} activeStep={5} />
      {/* ==================== MAIN GRID ==================== */}
      <div className="loan-docs-grid">

        {/* 1. Generate Loan Documents */}
        <div className="loan-card grid-area-generate">
          <div className="loan-card-header">
              <div>
                <h3 className="loan-card-title">Generate Loan Documents</h3>
                <p className="loan-card-subtitle">System has generated the following documents. Please review before sending to customer.</p>
              </div>
              <Button label="Regenerate Documents" variant="outline" size="sm" icon={RefreshIcon && <RefreshIcon size={14} className="text-success" />} onClick={() => {}} className="text-success border-success" />
            </div>

            <div className="doc-list-table-wrap">
              <table className="doc-list-table">
                <thead>
                  <tr>
                    <th>Document Name</th>
                    <th>Description</th>
                    <th className="text-center">Preview</th>
                    <th className="text-center">Download</th>
                    <th className="text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {LOAN_DOCUMENTS_LIST.map((doc) => {
                    const DocIcon = iconMap[doc.icon];
                    return (
                      <tr key={doc.id}>
                        <td>
                          <div className="doc-name-cell">
                            {DocIcon && <DocIcon size={16} className={`text-${doc.color}`} />}
                            {doc.name}
                          </div>
                        </td>
                        <td className="doc-desc-cell">{doc.description}</td>
                        <td className="text-center">
                          <Button label="Preview" variant="outline" size="sm" icon={EyeIcon && <EyeIcon size={12} />} onClick={() => {}} />
                        </td>
                        <td className="text-center">
                          <Button label="Download" variant="outline" size="sm" icon={DownloadIcon && <DownloadIcon size={12} />} onClick={() => {}} />
                        </td>
                        <td className="text-right">
                          <span className="doc-status-badge">
                            {CheckCircleIcon && <CheckCircleIcon size={12} className="text-success" />} {doc.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="doc-info-banner">
              {InfoIcon && <InfoIcon size={16} className="text-primary" />}
              Please review all documents carefully. Once customer e-signs, you can proceed to final approval.
            </div>
        </div>

        {/* 2. Document Preview (Middle Column, Top Row) */}
        <div className="loan-card preview-card grid-area-preview">
          <div className="preview-header mb-4">
              <h3 className="loan-card-title mb-0">Document Preview</h3>
              <button className="icon-btn">{ExpandIcon && <ExpandIcon size={16} />}</button>
            </div>
            <p className="preview-subtitle">Loan Agreement</p>
            
            <div className="preview-toolbar">
              <div className="pt-pages">
                <button className="pt-btn">-</button>
                <span className="pt-page-num">1 / 8</span>
                <button className="pt-btn">-</button>
              </div>
              <div className="pt-zoom">
                <span className="pt-zoom-text">100%</span>
                <button className="pt-btn">+</button>
              </div>
              <button className="pt-btn">{DownloadIcon && <DownloadIcon size={14} />}</button>
            </div>

            <div className="preview-document">
              <div className="doc-logo-placeholder">
                <span className="doc-logo-icon">S</span> <span className="doc-logo-text">SIVELS FINANCE</span>
              </div>
              <h4 className="doc-heading">LOAN AGREEMENT</h4>
              <p className="doc-para">This Loan Agreement is made on 05 Jun 2025 between Sivels Finance (hereinafter called "Lender") and Ramesh Kumar (hereinafter called "Borrower").</p>
              
              <div className="doc-details-grid">
                <span>Loan Amount</span><span>: ₹ 1,50,000 (Rupees One Lakh Fifty Thousand Only)</span>
                <span>Rate of Interest</span><span>: 12.00% p.a.</span>
                <span>Tenure</span><span>: 36 Months</span>
                <span>EMI Amount</span><span>: ₹ 4,980 (Monthly)</span>
                <span>Disbursement Date</span><span>: Subject to Final Approval</span>
              </div>

              <h5 className="doc-subheading">1. LOAN TERMS</h5>
              <p className="doc-para">The Lender agrees to lend the amount to the Borrower under the terms and conditions mentioned in this agreement.</p>
              
              <div className="doc-signature">
                <span className="sig-placeholder">Signature</span>
              </div>
            </div>
        </div>

        {/* 3. Right Column (Customer Summary + Document Checklist) */}
        <div className="grid-area-right">
          <CustomerSummary data={CS_DATA} />
          
          <div className="loan-right-panel loan-card">
            <h3 className="loan-card-title with-icon">
              {iconMap['CheckCircle'] && <iconMap.CheckCircle size={16} className="text-success" />}
              Document Checklist
            </h3>
            <div className="loan-checklist">
              {DOCUMENT_CHECKLIST.map((item, idx) => (
                <div key={idx} className="loan-checklist-row">
                  <span className="lcr-label">
                    {iconMap['CheckCircle2'] && <iconMap.CheckCircle2 size={14} className={item.isSuccess ? 'text-success' : 'text-muted'} />}
                    {item.label}
                  </span>
                  <span className={`lcr-badge ${item.isSuccess ? 'badge-success' : 'badge-warning'}`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Send Documents to Customer (Spans All Columns) */}
        <div className="loan-card grid-area-send">
          <h3 className="loan-card-title">Send Documents to Customer (WhatsApp / Email)</h3>
          <p className="loan-card-subtitle mb-4">Documents will be shared for review and e-sign.</p>
          <div className="send-docs-grid">
            <div className="send-box">
              <div className="send-box-header">
                {iconMap['MessageSquare'] && <iconMap.MessageSquare size={16} className="text-success" />}
                <span>Send via WhatsApp</span>
              </div>
              <div className="send-input-group">
                <input type="text" className="send-input" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
                <Button label="Send on WhatsApp" variant="primary" size="md" className="bg-success border-success" />
              </div>
            </div>
            <div className="send-box">
              <div className="send-box-header">
                {iconMap['User'] && <iconMap.User size={16} className="text-primary" />} 
                <span>Send via Email</span>
              </div>
              <div className="send-input-group">
                <input type="email" className="send-input" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Button label="Send Email" variant="primary" size="md" className="bg-success border-success" />
              </div>
            </div>
            <div className="send-info-box">
              <h4 className="sib-title">
                {iconMap['CheckCircle2'] && <iconMap.CheckCircle2 size={12} className="text-success" />}
                Customer will receive:
              </h4>
              <ul className="sib-list">
                <li><span className="text-muted">•</span> All documents in PDF</li>
                <li><span className="text-muted">•</span> e-Sign link for digital consent</li>
              </ul>
            </div>
          </div>
        </div>

      </div>

      {/* ========== BOTTOM ACTION BAR ========== */}
      <div className="loan-action-bar">
        <Button label="Return to Previous" variant="outline" size="md" icon={ArrowLeftIcon && <ArrowLeftIcon size={15} />} onClick={() => navigate(-1)} className="text-danger border-danger" />
        <div className="loan-action-right">
          <Button label="Save Progress" variant="outline" size="md" icon={SaveIcon && <SaveIcon size={15} />} onClick={() => {}} className="text-warning border-warning" />
          <Button label="Send to Customer for e-Sign" variant="primary" size="md" icon={ArrowRightIcon && <ArrowRightIcon size={15} />} onClick={handleContinue} />
        </div>
      </div>

    </MainLayout>
  );
}

export default LoanDocuments;
