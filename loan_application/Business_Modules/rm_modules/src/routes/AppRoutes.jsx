import { useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import ErrorBoundary from '../components/ErrorBoundary/ErrorBoundary';
import MainLayout from '../layouts/MainLayout/MainLayout';
import { ROUTES } from '../config/routeConfig';

import RmLogin from '../pages/RmLogin/RmLogin';
import Dashboard from '../pages/Dashboard/Dashboard';
import NewApplications from '../pages/NewApplications/NewApplications';
import ApplicationDetails from '../pages/ApplicationDetails/ApplicationDetails';
import CustomerRegistration from '../pages/CustomerRegistration/CustomerRegistration';
import AddressDetails from '../pages/AddressDetails/AddressDetails';
import KycDocuments from '../pages/KycDocuments/KycDocuments';
import EmploymentIncome from '../pages/EmploymentIncome/EmploymentIncome';
import BankExistingLoans from '../pages/BankExistingLoans/BankExistingLoans';
import CollateralDetails from '../pages/CollateralDetails/CollateralDetails';
import ReferenceDetails from '../pages/ReferenceDetails/ReferenceDetails';
import SourcingDetails from '../pages/SourcingDetails/SourcingDetails';
import ScheduleOfCharges from '../pages/ScheduleOfCharges/ScheduleOfCharges';
import DocumentChecklist from '../pages/DocumentChecklist/DocumentChecklist';
import Declaration from '../pages/Declaration/Declaration';
import AddAgent from '../pages/AddAgent/AddAgent';
import MyAgents from '../pages/MyAgents/MyAgents';
import RmProfile from '../pages/RmProfile/RmProfile';
import SubmissionHistory from '../pages/SubmissionHistory/SubmissionHistory';
import PdfView from '../pages/PdfView/PdfView';
import FieldVerification from '../pages/FieldVerification/FieldVerification';
import FieldVerificationStep2 from '../pages/FieldVerification/FieldVerificationStep2';
import { ApplicationDraftProvider } from '../state/ApplicationDraftContext';

function LayoutWrapper({ children, title, subtitle }) {
  const navigate = useNavigate();
  return (
    <MainLayout
      title={title}
      subtitle={subtitle}
      onUserMenuClick={() => navigate(ROUTES.PROFILE)}
      onNotificationsClick={() => alert('Notifications clicked')}
    >
      {children}
    </MainLayout>
  );
}

export default function AppRoutes() {
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const location = useLocation();

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  if (!isAuthenticated && location.pathname !== ROUTES.LOGIN) {
    return <RmLogin onLogin={handleLogin} />;
  }

  return (
    <ApplicationDraftProvider>
      <ErrorBoundary>
        <Routes>
        <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
        <Route path={ROUTES.LOGIN} element={<RmLogin onLogin={handleLogin} />} />

        <Route
          path={ROUTES.DASHBOARD}
          element={
            <LayoutWrapper title="RM Dashboard" subtitle="Overview & Operations">
              <Dashboard />
            </LayoutWrapper>
          }
        />

        <Route
          path={ROUTES.NEW_APPLICATIONS}
          element={
            <LayoutWrapper title="New Applications" subtitle="Application Drafts and RM Intake">
              <NewApplications initialFilter="New" />
            </LayoutWrapper>
          }
        />

        <Route
          path={ROUTES.PENDING_APPLICATIONS}
          element={
            <LayoutWrapper title="Pending Applications" subtitle="Applications pending verification">
              <NewApplications initialFilter="Pending" />
            </LayoutWrapper>
          }
        />

        <Route
          path={ROUTES.APPROVED_APPLICATIONS}
          element={
            <LayoutWrapper title="Approved Applications" subtitle="Fully processed and approved applications">
              <NewApplications initialFilter="Approved" />
            </LayoutWrapper>
          }
        />

        <Route
          path={ROUTES.RETURNED_APPLICATIONS}
          element={
            <LayoutWrapper title="Returned Applications" subtitle="Applications returned for correction">
              <NewApplications initialFilter="Returned" />
            </LayoutWrapper>
          }
        />

        <Route
          path={ROUTES.SUBMISSION_HISTORY}
          element={
            <LayoutWrapper title="Submission History" subtitle="View all your submitted applications">
              <SubmissionHistory />
            </LayoutWrapper>
          }
        />

        <Route
          path={ROUTES.APPLICATION_PDF_VIEW}
          element={
            <LayoutWrapper title="Application PDF View" subtitle="View and download application PDF">
              <PdfView />
            </LayoutWrapper>
          }
        />

        <Route
          path={ROUTES.FIELD_VERIFICATION}
          element={
            <LayoutWrapper title="Field Verification" subtitle="Step 1 of 2">
              <FieldVerification />
            </LayoutWrapper>
          }
        />

        <Route
          path={ROUTES.FIELD_VERIFICATION_STEP2}
          element={
            <LayoutWrapper title="Collateral Verification" subtitle="Step 2 of 2">
              <FieldVerificationStep2 />
            </LayoutWrapper>
          }
        />

        <Route
          path={ROUTES.APPLICATION_DETAILS}
          element={
            <LayoutWrapper title="New Application Wizard" subtitle="">
              <ApplicationDetails />
            </LayoutWrapper>
          }
        />

        <Route
          path={ROUTES.PERSONAL_INFORMATION}
          element={
            <LayoutWrapper title="Personal Information" subtitle="Step 2 of 12">
              <CustomerRegistration />
            </LayoutWrapper>
          }
        />

        <Route
          path={ROUTES.ADDRESS_DETAILS}
          element={
            <LayoutWrapper title="Address Details" subtitle="Step 3 of 12">
              <AddressDetails />
            </LayoutWrapper>
          }
        />

        <Route
          path={ROUTES.KYC_DOCUMENTS}
          element={
            <LayoutWrapper title="KYC Documents" subtitle="Step 4 of 12">
              <KycDocuments />
            </LayoutWrapper>
          }
        />

        <Route
          path={ROUTES.EMPLOYMENT_INCOME}
          element={
            <LayoutWrapper title="Employment & Income Details" subtitle="Step 5 of 12">
              <EmploymentIncome />
            </LayoutWrapper>
          }
        />

        <Route
          path={ROUTES.BANK_EXISTING_LOANS}
          element={
            <LayoutWrapper title="Bank / Existing Loan Details" subtitle="Step 6 of 12">
              <BankExistingLoans />
            </LayoutWrapper>
          }
        />

        <Route
          path={ROUTES.COLLATERAL}
          element={
            <LayoutWrapper title="Collateral Details" subtitle="Step 7 of 12">
              <CollateralDetails />
            </LayoutWrapper>
          }
        />

        <Route
          path={ROUTES.REFERENCES}
          element={
            <LayoutWrapper title="Reference Details" subtitle="Step 8 of 12">
              <ReferenceDetails />
            </LayoutWrapper>
          }
        />

        <Route
          path={ROUTES.SOURCING}
          element={
            <LayoutWrapper title="Sourcing Details" subtitle="Step 9 of 12">
              <SourcingDetails />
            </LayoutWrapper>
          }
        />

        <Route
          path={ROUTES.SCHEDULE_CHARGES}
          element={
            <LayoutWrapper title="Schedule of Charges" subtitle="Step 10 of 12">
              <ScheduleOfCharges />
            </LayoutWrapper>
          }
        />

        <Route
          path={ROUTES.DOCUMENT_CHECKLIST}
          element={
            <LayoutWrapper title="Document Checklist" subtitle="Step 11 of 12">
              <DocumentChecklist />
            </LayoutWrapper>
          }
        />

        <Route
          path={ROUTES.DECLARATION}
          element={
            <LayoutWrapper title="Declaration" subtitle="Step 12 of 12">
              <Declaration />
            </LayoutWrapper>
          }
        />

        <Route
          path={ROUTES.ADD_AGENT}
          element={
            <LayoutWrapper title="Agent Creation" subtitle="Create a new field agent profile.">
              <AddAgent />
            </LayoutWrapper>
          }
        />

        <Route
          path={ROUTES.MY_AGENTS}
          element={
            <LayoutWrapper title="My Field Agents" subtitle="Agent Performance & Assignment">
              <MyAgents />
            </LayoutWrapper>
          }
        />

        <Route
          path={ROUTES.PROFILE}
          element={
            <LayoutWrapper title="My RM Profile" subtitle="Branch Info & Targets">
              <RmProfile />
            </LayoutWrapper>
          }
        />

        <Route
          path={ROUTES.LOGOUT}
          element={
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <h2>Logged Out</h2>
              <p>You have been safely logged out.</p>
              <button
                onClick={handleLogin}
                style={{
                  padding: '10px 20px',
                  background: 'var(--color-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Log Back In
              </button>
            </div>
          }
        />

        <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
        </Routes>
      </ErrorBoundary>
    </ApplicationDraftProvider>
  );
}
