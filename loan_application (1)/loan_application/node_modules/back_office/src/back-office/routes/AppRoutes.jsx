/**
 * AppRoutes.jsx
 * --------------------
 * Purpose:
 *   Centralised route declarations for the Back Office module.
 *
 * Responsibilities:
 *   - Map every path constant to its page component.
 *   - Wrap all authenticated routes inside MainLayout via the page components.
 *   - Redirect the root path to the dashboard.
 *
 * Rules:
 *   - All paths imported from routeConfig.js — never hardcoded here.
 *   - New pages require only: import page + add a <Route> entry.
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from '../components/ErrorBoundary/ErrorBoundary';
import { ROUTES } from '../config/routeConfig';
import Dashboard from '../pages/Dashboard/Dashboard';
import NewApplicationsList from '../pages/NewApplicationsList/NewApplicationsList';
import DocumentVerification from '../pages/DocumentVerification/DocumentVerification';
import PanVerification from '../pages/PanVerification/PanVerification';
import BankVerification from '../pages/BankVerification/BankVerification';
import LoanDocuments from '../pages/LoanDocuments/LoanDocuments';
import FinalApproval from '../pages/FinalApproval/FinalApproval';
import Disbursement from '../pages/Disbursement/Disbursement';
import DisbursementHistory from '../pages/DisbursementHistory/DisbursementHistory';
import ReportsAnalytics from '../pages/ReportsAnalytics/ReportsAnalytics';
import Profile from '../pages/Profile/Profile';
import ReturnedApplications from '../pages/ReturnedApplications/ReturnedApplications';
import PendingApplications from '../pages/PendingApplications/PendingApplications';
import RejectApplication from '../pages/RejectApplication/RejectApplication';
import RejectedApplications from '../pages/RejectedApplications/RejectedApplications';
import ApprovedApplications from '../pages/ApprovedApplications/ApprovedApplications';

/* ==========================================
   PLACEHOLDER
   Temporary stand-in rendered for routes not
   yet implemented. Replaced as pages are built.
========================================== */
function Placeholder({ title }) {
  return (
    <div style={{ padding: '24px', fontFamily: 'var(--font-family-base)' }}>
      <h2 style={{ color: 'var(--color-text-primary)' }}>{title}</h2>
      <p style={{ color: 'var(--color-text-muted)' }}>
        This page is not yet implemented.
      </p>
    </div>
  );
}

function AppRoutes() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* ---- Root redirect ---- */}
        <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />

        {/* ---- Dashboard ---- */}
        <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />

        {/* ---- Applications ---- */}
        <Route path={ROUTES.NEW_APPLICATIONS}      element={<NewApplicationsList />} />
        <Route path={ROUTES.DOCUMENT_VERIFICATION} element={<DocumentVerification />} />
        <Route path={ROUTES.IN_REVIEW}             element={<PendingApplications />} />
        <Route path={ROUTES.RETURNED}              element={<ReturnedApplications />} />
        <Route path={ROUTES.PENDING_APPLICATIONS}  element={<PendingApplications />} />
        <Route path={ROUTES.REJECTED_APPLICATIONS} element={<RejectedApplications />} />
        <Route path={ROUTES.APPROVED}              element={<ApprovedApplications />} />
        <Route path={ROUTES.DISBURSED}             element={<Placeholder title="Disbursed" />} />
        <Route path={ROUTES.REJECT_APPLICATION}    element={<RejectApplication />} />

        {/* ---- Loan Process ---- */}
        <Route path={ROUTES.PAN_VERIFICATION}     element={<PanVerification />} />
        <Route path={ROUTES.CIBIL_ELIGIBILITY}    element={<Placeholder title="CIBIL & Eligibility" />} />
        <Route path={ROUTES.BANK_VERIFICATION}    element={<BankVerification />} />
        <Route path={ROUTES.LOAN_DOCUMENTS}       element={<LoanDocuments />} />
        <Route path={ROUTES.FINAL_APPROVAL}       element={<FinalApproval />} />
        <Route path={ROUTES.DISBURSEMENT}         element={<Disbursement />} />
        <Route path={ROUTES.DISBURSEMENT_HISTORY} element={<DisbursementHistory />} />

        {/* ---- Reports ---- */}
        <Route path={ROUTES.REPORTS_ANALYTICS} element={<ReportsAnalytics />} />
        <Route path={ROUTES.AUDIT_TRAIL}       element={<Placeholder title="Audit Trail" />} />

        {/* ---- Account ---- */}
        <Route path={ROUTES.PROFILE} element={<Profile />} />
        <Route path={ROUTES.LOGOUT}  element={<Navigate to={ROUTES.DASHBOARD} replace />} />

        {/* ---- 404 ---- */}
        <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default AppRoutes;
