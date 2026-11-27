import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import ErrorBoundary from '../../../back_office/src/back-office/components/ErrorBoundary/ErrorBoundary';
import { getStoredLandingPath, getStoredRoleCode } from '../../../../Core/src/auth/session';
import OperationsDashboard from '../components/OperationsDashboard';
import OperationsGuard from '../auth/OperationsGuard';
import NewApplications from '../pages/Maker/NewApplications/NewApplications';
import PendingApplications from '../pages/Maker/PendingApplications/PendingApplications';
import LoanBasicDetails from '../pages/Maker/LoanBasicDetails/LoanBasicDetails';
import RepaymentSchedule from '../pages/Maker/RepaymentSchedule/RepaymentSchedule';
import Fees from '../pages/Maker/Fees/Fees';
import Covenants from '../pages/Maker/Covenants/Covenants';
import MandateDetails from '../pages/Maker/MandateDetails/MandateDetails';
import ChequeDetails from '../pages/Maker/ChequeDetails/ChequeDetails';
import Profile from '../pages/Profile/Profile';
import { ROUTES } from '../config/routeConfig';
import { OperationsApplicationProvider } from '../context/OperationsApplicationContext';
import OperationsApplicationGate from '../components/OperationsApplicationGate';

function OperationsRoot() {
  const roleCode = getStoredRoleCode(['MAKER', 'CHECKER']);
  if (roleCode === 'MAKER') return <Navigate to={ROUTES.MAKER_DASHBOARD} replace />;
  if (roleCode === 'CHECKER') {
    const landingPath = getStoredLandingPath(['CHECKER']);
    return <Navigate to={landingPath === '/login' ? '/login' : landingPath} replace />;
  }
  return <Navigate to="/login" replace />;
}

function CheckerLanding() {
  const location = useLocation();
  const landingPath = getStoredLandingPath(['CHECKER']);
  if (landingPath === location.pathname) return <OperationsDashboard roleCode="CHECKER" />;
  return <Navigate to={landingPath === '/login' ? '/login' : landingPath} replace />;
}

export default function AppRoutes() {
  return (
    <ErrorBoundary>
      <OperationsApplicationProvider>
        <Routes>
        <Route
          path={ROUTES.ROOT}
          element={
            <OperationsGuard allowedRoles={['MAKER', 'CHECKER']}>
              <OperationsRoot />
            </OperationsGuard>
          }
        />
        <Route
          path={ROUTES.MAKER_DASHBOARD}
          element={
            <OperationsGuard allowedRoles={['MAKER']}>
              <OperationsDashboard roleCode="MAKER" />
            </OperationsGuard>
          }
        />
        <Route
          path={ROUTES.PROFILE}
          element={
            <OperationsGuard allowedRoles={['MAKER', 'CHECKER']}>
              <Profile />
            </OperationsGuard>
          }
        />
        <Route
          path={ROUTES.MAKER_NEW_APPLICATIONS}
          element={
            <OperationsGuard allowedRoles={['MAKER']}>
              <NewApplications />
            </OperationsGuard>
          }
        />
        <Route
          path={ROUTES.MAKER_PENDING_APPLICATIONS}
          element={
            <OperationsGuard allowedRoles={['MAKER']}>
              <PendingApplications />
            </OperationsGuard>
          }
        />
        <Route
          path={ROUTES.MAKER_LOAN_BASIC_DETAILS}
          element={
            <OperationsGuard allowedRoles={['MAKER']}>
              <OperationsApplicationGate title="Loan Basic Details">
                <LoanBasicDetails />
              </OperationsApplicationGate>
            </OperationsGuard>
          }
        />
        <Route
          path={ROUTES.MAKER_FEES}
          element={
            <OperationsGuard allowedRoles={['MAKER']}>
              <OperationsApplicationGate title="Fees">
                <Fees />
              </OperationsApplicationGate>
            </OperationsGuard>
          }
        />
        <Route
          path={ROUTES.MAKER_REPAYMENT_SCHEDULE}
          element={
            <OperationsGuard allowedRoles={['MAKER']}>
              <OperationsApplicationGate title="Repayment Schedule">
                <RepaymentSchedule />
              </OperationsApplicationGate>
            </OperationsGuard>
          }
        />
        <Route
          path={ROUTES.MAKER_COVENANTS}
          element={
            <OperationsGuard allowedRoles={['MAKER']}>
              <OperationsApplicationGate title="Covenants">
                <Covenants />
              </OperationsApplicationGate>
            </OperationsGuard>
          }
        />
        <Route
          path={ROUTES.MAKER_MANDATE_DETAILS}
          element={
            <OperationsGuard allowedRoles={['MAKER']}>
              <OperationsApplicationGate title="Mandate Details">
                <MandateDetails />
              </OperationsApplicationGate>
            </OperationsGuard>
          }
        />
        <Route
          path={ROUTES.MAKER_CHEQUE_DETAILS}
          element={
            <OperationsGuard allowedRoles={['MAKER']}>
              <OperationsApplicationGate title="Cheque Details">
                <ChequeDetails />
              </OperationsApplicationGate>
            </OperationsGuard>
          }
        />
        <Route
          path="/operations/*"
          element={
            <OperationsGuard allowedRoles={['CHECKER']}>
              <CheckerLanding />
            </OperationsGuard>
          }
        />
        <Route path="*" element={<Navigate to={ROUTES.ROOT} replace />} />
        </Routes>
      </OperationsApplicationProvider>
    </ErrorBoundary>
  );
}
