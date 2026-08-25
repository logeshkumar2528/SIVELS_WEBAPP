import { Navigate, Route, Routes } from 'react-router-dom';
import CustomerLayout from '../components/layout/CustomerLayout/CustomerLayout';
import AdminDashboard from '../pages/Dashboard/AdminDashboard/AdminDashboard';
import AgentDashboard from '../pages/Dashboard/AgentDashboard/AgentDashboard';
import CreateUser from '../pages/Users/CreateUser';
import CustomerDashboard from '../pages/Dashboard/CustomerDashboard/CustomerDashboard';
import CustomerLoanOffer from '../pages/CustomerLoanOffer/CustomerLoanOffer';
import CustomerProfile from '../pages/CustomerProfile/CustomerProfile';
import CustomerRegistration from '../pages/CustomerRegistration/CustomerRegistration';
import CustomerVerification from '../pages/CustomerVerification/CustomerVerification';
import DashboardWelcome from '../pages/Dashboard/DashboardWelcome/DashboardWelcome';
import EditGroup from '../pages/Groups/EditGroup';
import GroupPermissions from '../pages/Groups/GroupPermissions';
import Groups from '../pages/Groups/Groups';
import InvestorDashboard from '../pages/Dashboard/InvestorDashboard/InvestorDashboard';
import OTPVerification from '../pages/OTPVerification/OTPVerification';
import RoleForm from '../pages/Roles/RoleForm';
import Roles from '../pages/Roles/Roles';
import RmDashboard from '../pages/Dashboard/RmDashboard/RmDashboard';
import SignUp from '../pages/SignUp/SignUp';
import UserEffectivePermissions from '../pages/Users/UserEffectivePermissions';
import UserGroupAssignments from '../pages/Users/UserGroupAssignments';
import Users from '../pages/Users/Users';
import AgentApp from '../../../Business_Modules/agent_module/src/App';
import InvestorApp from '../roles/investors/InvestorApp';
import CustomerApp from '../../../Business_Modules/customer_module/src/App';
import EmploymentTypeDocumentMapping from '../pages/EmploymentTypeDocumentMapping/EmploymentTypeDocumentMapping';

const PlaceholderPage = ({ title }) => (
  <div className="flex items-center justify-center p-12 text-slate-500 bg-white rounded-lg border border-slate-200">
    <p>This module ({title}) will be implemented later.</p>
  </div>
);

const adminRoutes = [
  { path: '/dashboard', element: <DashboardWelcome /> },
  { path: '/admin', element: <AdminDashboard /> },
  { path: '/agent', element: <AgentDashboard /> },
  { path: '/rm', element: <RmDashboard /> },
  { path: '/investor', element: <InvestorDashboard /> },        // old — untouched
  { path: '/investor-new', element: <InvestorApp /> },          // new — our build
];



const managementRoutes = [
  { path: '/customer-registration', element: <CustomerRegistration /> },
  { path: '/groups', element: <Groups /> },
  { path: '/groups/create', element: <EditGroup /> },
  { path: '/groups/edit/:id', element: <EditGroup /> },
  { path: '/groups/permissions/:id', element: <GroupPermissions /> },
  { path: '/users', element: <Users /> },
  { path: '/users/create', element: <CreateUser /> },
  { path: '/users/groups/:id', element: <UserGroupAssignments /> },
  { path: '/users/permissions/:id', element: <UserEffectivePermissions /> },
  { path: '/roles', element: <Roles /> },
  { path: '/roles/create', element: <RoleForm /> },
  { path: '/roles/edit/:id', element: <RoleForm /> },
  { path: '/employment-type-document-mapping', element: <EmploymentTypeDocumentMapping /> },
];

const customerRoutes = [
  { index: true, element: <Navigate to="profile" replace /> },
  { path: 'dashboard', element: <CustomerDashboard /> },
  { path: 'profile', element: <CustomerProfile /> },
  { path: 'verification', element: <CustomerVerification /> },
  { path: 'loan-offer', element: <CustomerLoanOffer /> },
  { path: 'apply-loan', element: <PlaceholderPage title="Apply Loan" /> },
  { path: 'applications', element: <PlaceholderPage title="My Applications" /> },
];

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/signup" replace />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/otp" element={<OTPVerification />} />
      
      <Route path="/dashboard" element={<DashboardWelcome />} />
      <Route path="/Agent" element={<AgentApp />} />
      <Route path="/Agent/*" element={<AgentApp />} />
      <Route path="/customer" element={<CustomerLayout />}>
        {customerRoutes.map((route) =>
          route.index ? (
            <Route key="customer-index" index element={route.element} />
          ) : (
            <Route key={route.path} path={route.path} element={route.element} />
          ),
        )}
      </Route>
      <Route path="/customer-profile" element={<Navigate to="/customer/profile" replace />} />
      {adminRoutes.map((route) => (
        <Route key={route.path} path={route.path} element={route.element} />
      ))}
      {managementRoutes.map((route) => (
        <Route key={route.path} path={route.path} element={route.element} />
      ))}
      {/* Integrated Business Modules */}
      <Route path="/client/*" element={<CustomerApp />} />
      <Route path="/customer/*" element={<Navigate to="/client" replace />} />
    </Routes>
  );
};

export default AppRoutes;
