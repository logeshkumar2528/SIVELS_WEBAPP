/**
 * RejectApplication.jsx
 * --------------------
 * Page for rejecting an application with reasons, remarks, and document uploads.
 */

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MainLayout   from '../../layouts/MainLayout/MainLayout';
import Breadcrumb   from '../../components/Breadcrumb/Breadcrumb';
import Button       from '../../components/Button/Button';
import iconMap      from '../../config/iconMap';
import { ROUTES }   from '../../config/routeConfig';
import {
  CURRENT_USER, BADGE_COUNTS, REJECT_APPLICATION_DETAILS,
  REJECTION_REASONS, APPLICATION_HISTORY
} from './rejectApplicationData';
import './RejectApplication.css';

const BREADCRUMB_ITEMS = [
  { label: 'Back Office Dashboard', path: ROUTES.DASHBOARD },
  { label: 'Applications',          path: ROUTES.NEW_APPLICATIONS },
  { label: 'Reject Application' }
];

function RejectApplication() {
  const [selectedReason, setSelectedReason] = useState('');
  const [subReason, setSubReason] = useState('');
  const [remarks, setRemarks] = useState('');
  const navigate = useNavigate();
  const { id } = useParams();

  const details = { ...REJECT_APPLICATION_DETAILS, id: id || REJECT_APPLICATION_DETAILS.id };

  const FileTextIcon   = iconMap['FileText'];
  const AlertIcon      = iconMap['AlertTriangle'];
  const UploadIcon     = iconMap['Download'];
  const CheckIcon      = iconMap['CheckCircle2'];
  const InfoIcon       = iconMap['Info'];
  const SaveIcon       = iconMap['Save'];
  const XIcon          = iconMap['X'];
  const EyeIcon        = iconMap['Eye'];
  const ClockIcon      = iconMap['Clock'];

  const handleReject = () => {
    navigate(ROUTES.RETURNED);
  };

  return (
    <MainLayout
      title="Reject Application"
      user={CURRENT_USER}
      badgeCounts={BADGE_COUNTS}
      notificationCount={12}
    >
      <Breadcrumb items={BREADCRUMB_ITEMS} />

      <div className="rej-grid">
        
        {/* Column 1: Application Details */}
        <div className="rej-card">
          <h3 className="rej-card-title text-primary">
            {FileTextIcon && <FileTextIcon size={18} />}
            Application Details
          </h3>

          <div className="rej-details-list">
            <div className="rej-dl-row">
              <span className="rej-dl-label">Application ID</span>
              <span className="rej-dl-val text-primary">: {details.id}</span>
            </div>
            <div className="rej-dl-row">
              <span className="rej-dl-label">Customer Name</span>
              <span className="rej-dl-val">: {details.customerName}</span>
            </div>
            <div className="rej-dl-row">
              <span className="rej-dl-label">Loan Type</span>
              <span className="rej-dl-val">: {details.loanType}</span>
            </div>
            <div className="rej-dl-row">
              <span className="rej-dl-label">Loan Amount</span>
              <span className="rej-dl-val">: {details.loanAmount}</span>
            </div>
            <div className="rej-dl-row">
              <span className="rej-dl-label">Applied On</span>
              <span className="rej-dl-val">: {details.appliedOn}</span>
            </div>
            <div className="rej-dl-row">
              <span className="rej-dl-label">RM Name</span>
              <span className="rej-dl-val">: {details.rmName}</span>
            </div>
            <div className="rej-dl-row">
              <span className="rej-dl-label">Current Stage</span>
              <span className="badge-priority-medium">: {details.currentStage}</span>
            </div>
            <div className="rej-dl-row">
              <span className="rej-dl-label">Assigned To</span>
              <span className="rej-dl-val">: {details.assignedTo}</span>
            </div>
          </div>

          <Button
            label="View Full Application"
            variant="outline"
            size="md"
            icon={EyeIcon && <EyeIcon size={14} />}
            onClick={() => navigate(ROUTES.DOCUMENT_VERIFICATION.replace(':id', details.id))}
            className="text-primary border-primary w-full mt-5"
          />
        </div>

        {/* Column 2: Reject Form */}
        <div className="rej-card">
          <h3 className="rej-card-title text-danger">
            {AlertIcon && <AlertIcon size={18} className="text-danger" />}
            Reject Application
          </h3>

          <form className="rej-form" onSubmit={(e) => e.preventDefault()}>
            <div className="rej-field">
              <label className="rej-label">Reason for Rejection <span className="req">*</span></label>
              <select className="rej-select" value={selectedReason} onChange={(e) => setSelectedReason(e.target.value)}>
                <option value="">Select Reason</option>
                {REJECTION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div className="rej-field">
              <label className="rej-label">Sub Reason (if any)</label>
              <select className="rej-select" value={subReason} onChange={(e) => setSubReason(e.target.value)}>
                <option value="">Select Sub Reason</option>
                <option value="Doc Missing">Document Missing</option>
                <option value="Blurry Photo">Blurry Photo</option>
              </select>
            </div>

            <div className="rej-field">
              <label className="rej-label">Rejection Remarks <span className="req">*</span></label>
              <textarea
                className="rej-textarea"
                placeholder="Enter detailed remarks for rejection..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                maxLength={500}
              />
              <span className="text-right text-muted" style={{ fontSize: '10px' }}>{remarks.length}/500</span>
            </div>

            <div className="rej-field">
              <label className="rej-label">Upload Supporting Document (Optional)</label>
              <div className="rej-upload-box">
                {UploadIcon && <UploadIcon size={20} className="text-primary" />}
                <span className="font-semibold text-primary">Drag and drop file here or</span>
                <Button label="Browse File" variant="outline" size="sm" />
                <span className="text-muted" style={{ fontSize: '10px' }}>PDF, JPG, PNG, up to 5MB</span>
              </div>
            </div>
          </form>
        </div>

        {/* Column 3: Common Reasons & History */}
        <div className="rej-right-stack">
          
          {/* Common Rejection Reasons Card */}
          <div className="rej-card">
            <h3 className="rej-card-title text-danger mb-3">
              {AlertIcon && <AlertIcon size={16} className="text-danger" />} Common Rejection Reasons
            </h3>
            <div className="rej-reasons-list">
              {REJECTION_REASONS.map(r => (
                <label key={r} className="rej-radio-label">
                  <input type="radio" name="commonReason" value={r} checked={selectedReason === r} onChange={() => setSelectedReason(r)} />
                  <span>{r}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Important Notes */}
          <div className="rej-important-box">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', marginBottom: '4px' }}>
              {InfoIcon && <InfoIcon size={14} />} Important Notes
            </div>
            Please ensure the rejection reason is clearly mentioned. The application will be returned to RM for further action.
          </div>

          {/* Application History */}
          <div className="rej-card">
            <h3 className="rej-card-title mb-3">
              {ClockIcon && <ClockIcon size={16} className="text-primary" />} Application History
            </h3>
            <div className="rej-history-stepper">
              {APPLICATION_HISTORY.map((h, idx) => (
                <div key={idx} className={`rej-hs-item ${h.status}`}>
                  <div className="rej-hs-dot" />
                  <span className="rej-hs-title">{h.step}</span>
                  <span className="rej-hs-date">{h.date}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* ========== BOTTOM ACTION BAR ========== */}
      <div className="rej-action-bar">
        <Button label="Cancel" variant="outline" size="md" onClick={() => navigate(-1)} />
        <div className="rej-action-right">
          <Button label="Save as Draft" variant="outline" size="md" icon={SaveIcon && <SaveIcon size={15} />} onClick={() => {}} className="text-warning border-warning" />
          <Button label="Reject Application" variant="primary" size="md" icon={XIcon && <XIcon size={15} />} onClick={handleReject} className="bg-danger border-danger" />
        </div>
      </div>

    </MainLayout>
  );
}

export default RejectApplication;
