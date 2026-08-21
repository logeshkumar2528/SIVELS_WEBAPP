/**
 * NewApplications — Document Verification Page
 * --------------------
 * Purpose:
 *   Step 1 of the application review workflow — Document Verification.
 *   Accessed by clicking "Review" on a New application.
 *
 * Responsibilities:
 *   - Render the application info bar, step progress, and 3-panel layout.
 *   - Manage BO Remarks textarea state (the only UI state on this page).
 *   - Pass all static data to reusable components as props.
 *
 * Rules:
 *   - Under 250 lines.
 *   - No business logic — only UI rendering and local textarea state.
 *   - Reuses: MainLayout, Breadcrumb, StepProgress, StatusBadge, Button.
 */

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MainLayout    from '../../layouts/MainLayout/MainLayout';
import Breadcrumb    from '../../components/Breadcrumb/Breadcrumb';
import InfoBar       from '../../components/InfoBar/InfoBar';
import StepProgress  from '../../components/StepProgress/StepProgress';
import StatusBadge   from '../../components/StatusBadge/StatusBadge';
import Button        from '../../components/Button/Button';
import iconMap       from '../../config/iconMap';
import { ROUTES }    from '../../config/routeConfig';
import {
  CURRENT_USER, BADGE_COUNTS, INFO_BAR_FIELDS, CUSTOMER_SUMMARY,
  VERIFICATION_STEPS, AADHAAR_TAGS, PAN_TAGS,
  VERIFICATION_CHECKLIST, DOCUMENT_QUALITY,
} from './documentVerificationData';
import './DocumentVerification.css';

/* ==========================================
   CONSTANTS
========================================== */

const BREADCRUMB_ITEMS = [
  { label: 'Back Office Dashboard', path: ROUTES.DASHBOARD         },
  { label: 'New Applications',      path: ROUTES.NEW_APPLICATIONS  },
  { label: 'Document Verification'                                  },
];

/* ==========================================
   INTERNAL HELPERS
   Small sub-components scoped to this page.
========================================== */

/** Verification tag chip — green checkmark + label */
function VerificationTag({ label }) {
  const CheckCircleIcon = iconMap['CheckCircle'];
  return (
    <span className="doc-vtag">
      {CheckCircleIcon && <CheckCircleIcon size={13} strokeWidth={2} className="doc-vtag-icon" />}
      {label}
    </span>
  );
}

function InfoRow({ label, value, isStatus }) {
  return (
    <div className="cs-row">
      <span className="cs-row-label">{label}</span>
      {isStatus
        ? <StatusBadge status={value} />
        : <span className="cs-row-value">{value}</span>
      }
    </div>
  );
}

/** Document Card with zoom, expand, and download actions */
function DocumentCard({ title, imageUrl }) {
  const [zoom, setZoom] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false);

  const ZoomInIcon = iconMap['ZoomIn'];
  const ZoomOutIcon = iconMap['ZoomOut'];
  const DownloadIcon = iconMap['Download'];
  const ExpandIcon = iconMap['Expand'];

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.5, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.5, 1));
  const toggleExpand = () => setIsExpanded(!isExpanded);

  return (
    <>
      <div className="doc-card">
        <div className="doc-card-header">
          <span className="doc-card-subtitle">{title}</span>
          <div className="doc-card-actions">
            {ZoomOutIcon && zoom > 1 && (
              <button type="button" className="doc-icon-btn" onClick={handleZoomOut} aria-label="Zoom Out">
                <ZoomOutIcon size={14} strokeWidth={1.8} />
              </button>
            )}
            {ZoomInIcon && (
              <button type="button" className="doc-icon-btn" onClick={handleZoomIn} aria-label="Zoom In">
                <ZoomInIcon size={14} strokeWidth={1.8} />
              </button>
            )}
            {DownloadIcon && (
              <a href={imageUrl} download className="doc-icon-btn" aria-label="Download" style={{ display: 'inline-flex', alignItems: 'center' }}>
                <DownloadIcon size={14} strokeWidth={1.8} />
              </a>
            )}
            {ExpandIcon && (
              <button type="button" className="doc-icon-btn" onClick={toggleExpand} aria-label="Expand">
                <ExpandIcon size={14} strokeWidth={1.8} />
              </button>
            )}
          </div>
        </div>
        <div className="doc-image-wrap" aria-label={`${title} image`} role="img">
          <img src={imageUrl} alt={title} style={{ transform: `scale(${zoom})` }} />
        </div>
      </div>

      {isExpanded && (
        <div className="doc-modal-overlay" onClick={toggleExpand}>
          <div className="doc-modal-content" onClick={e => e.stopPropagation()}>
            <img src={imageUrl} alt={title} className="doc-modal-img" />
            <button className="doc-modal-close" onClick={toggleExpand}>Close</button>
          </div>
        </div>
      )}
    </>
  );
}

/* ==========================================
   DOCUMENT VERIFICATION PAGE
========================================== */
function DocumentVerification() {
  const navigate = useNavigate();
  const { id } = useParams();

  const handleContinue = () => {
    navigate(ROUTES.PAN_VERIFICATION.replace(':id', id || 'APP123'));
  };

  /* Icon refs — resolved once per render cycle */
  const ArrowLeftIcon   = iconMap['ArrowLeft'];
  const SaveIcon        = iconMap['Save'];
  const ArrowRightIcon  = iconMap['ArrowRight'];
  const UserIcon        = iconMap['User'];
  const ShieldCheckIcon = iconMap[DOCUMENT_QUALITY.icon];

  return (
    <MainLayout
      title="Document Verification"
      user={CURRENT_USER}
      badgeCounts={BADGE_COUNTS}
      notificationCount={12}
    >
      {/* ---- Breadcrumb ---- */}
      <Breadcrumb items={BREADCRUMB_ITEMS} />

      {/* ==================== APPLICATION INFO BAR ==================== */}
      <InfoBar fields={INFO_BAR_FIELDS} />

      {/* ==================== STEP PROGRESS ==================== */}
      <StepProgress steps={VERIFICATION_STEPS} activeStep={1} />

      {/* ==================== 3-COLUMN GRID ==================== */}
      <div className="doc-grid">

        {/* ========== LEFT — Customer Summary ========== */}
        <aside className="doc-panel doc-panel--left" aria-label="Customer summary">
          <h3 className="doc-panel-title">
            {UserIcon && <UserIcon size={16} strokeWidth={1.8} aria-hidden="true" />}
            Customer Summary
          </h3>

          <div className="cs-avatar-wrap">
            <div className="cs-avatar" aria-hidden="true">
              {CUSTOMER_SUMMARY.name.charAt(0)}
            </div>
            <p className="cs-name">{CUSTOMER_SUMMARY.name}</p>
            <p className="cs-phone">{CUSTOMER_SUMMARY.phone}</p>
          </div>

          <div className="cs-fields">
            {CUSTOMER_SUMMARY.fields.map((field) => (
              <InfoRow
                key={field.label}
                label={field.label}
                value={field.value}
                isStatus={field.isStatus}
              />
            ))}
          </div>
        </aside>

        {/* ========== MIDDLE — Documents ========== */}
        <section className="doc-panel doc-panel--middle" aria-label="Application documents">

          {/* --- Aadhaar Card --- */}
          <div className="doc-section">
            <h3 className="doc-section-title">Aadhaar Card</h3>

            <div className="doc-cards-row">
              <DocumentCard title="Aadhaar Front" imageUrl="/images/aadhaar_front.jpg" />
              <DocumentCard title="Aadhaar Back" imageUrl="/images/aadhaar_back.jpg" />
            </div>

            <div className="doc-tags-row" role="list" aria-label="Aadhaar verification tags">
              {AADHAAR_TAGS.map((tag) => (
                <VerificationTag key={tag.id} label={tag.label} />
              ))}
            </div>
          </div>

          {/* --- PAN Card --- */}
          <div className="doc-section">
            <h3 className="doc-section-title">PAN Card</h3>
            <div className="doc-card--wide">
              <DocumentCard title="PAN Card" imageUrl="/images/pan_card.jpg" />
            </div>
            <div className="doc-tags-row" role="list" aria-label="PAN verification tags">
              {PAN_TAGS.map((tag) => (
                <VerificationTag key={tag.id} label={tag.label} />
              ))}
            </div>
          </div>

        </section>

        {/* ========== RIGHT — Verification Panel ========== */}
        <aside className="doc-panel doc-panel--right" aria-label="Verification panel">

          {/* Checklist */}
          <div className="doc-right-section">
            <h3 className="doc-panel-title">Verification Checklist</h3>
            <ul className="doc-checklist" role="list">
              {VERIFICATION_CHECKLIST.map((item) => (
                <li key={item.id} className="doc-checklist-item">
                  <span className="doc-checklist-label">{item.label}</span>
                  <span className={`doc-checklist-status doc-checklist-status--${item.status}`}>
                    {item.status === 'verified' ? 'Verified' : 'Pending'}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Document Quality */}
          <div className="doc-right-section">
            <h3 className="doc-panel-title">Document Quality</h3>
            <div className="doc-quality">
              <div className="doc-quality-content">
                <p className="doc-quality-label">{DOCUMENT_QUALITY.label}</p>
                <p className="doc-quality-message">{DOCUMENT_QUALITY.message}</p>
              </div>
              <div className="doc-quality-icon" aria-hidden="true">
                {ShieldCheckIcon && <ShieldCheckIcon size={28} strokeWidth={1.5} />}
              </div>
            </div>
          </div>

        </aside>
      </div>

      {/* ==================== BOTTOM ACTION BAR ==================== */}
      <div className="doc-action-bar" role="region" aria-label="Page actions">
        <Button
          label="Back"
          variant="outline"
          size="md"
          icon={ArrowLeftIcon && <ArrowLeftIcon size={15} strokeWidth={2} />}
          onClick={() => navigate(-1)}
        />
        <div className="doc-action-bar-right">
          <Button
            label="Save Progress"
            variant="outline"
            size="md"
            icon={SaveIcon && <SaveIcon size={15} strokeWidth={2} />}
            onClick={() => {}}
          />
          <Button
            label="Verify Documents & Continue"
            variant="primary"
            size="md"
            icon={ArrowRightIcon && <ArrowRightIcon size={15} strokeWidth={2} />}
            onClick={handleContinue}
          />
        </div>
      </div>

    </MainLayout>
  );
}

export default DocumentVerification;
