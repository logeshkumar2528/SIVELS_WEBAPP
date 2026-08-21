import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES, LEGACY_ROUTES } from './config/routeConfig';
import AuthLayout from './layouts/AuthLayout/AuthLayout';
import Login from './pages/Login/Login';
import VerifyOTP from './pages/VerifyOTP/VerifyOTP';
import PendingApproval from './pages/PendingApproval/PendingApproval';
import RegistrationLayout from './layouts/RegistrationLayout/RegistrationLayout';
import Register from './pages/Register/Register';
import CustomerLayout from './layouts/CustomerLayout/CustomerLayout';
import Dashboard from './pages/Dashboard/Dashboard';
import MyLoan from './pages/MyLoan/MyLoan';
import EMIHistory from './pages/EMIHistory/EMIHistory';
import Profile from './pages/Profile/Profile';
import './index.css';

function App() {
  return (
    <Routes>
      <Route path={ROUTES.HOME} element={<AuthLayout />}>
        <Route index element={<Login />} />
        <Route path={ROUTES.VERIFY_OTP} element={<VerifyOTP />} />
      </Route>

      <Route path={ROUTES.PENDING_APPROVAL} element={<CustomerLayout />}>
        <Route index element={<PendingApproval />} />
      </Route>

      <Route path={ROUTES.REGISTER} element={<RegistrationLayout />}>
        <Route index element={<Register />} />
      </Route>

      <Route path={ROUTES.DASHBOARD} element={<CustomerLayout />}>
        <Route index element={<Dashboard />} />
      </Route>

      <Route path={ROUTES.MY_LOAN} element={<CustomerLayout />}>
        <Route index element={<MyLoan />} />
      </Route>

      <Route path={ROUTES.EMI_HISTORY} element={<CustomerLayout />}>
        <Route index element={<EMIHistory />} />
      </Route>

      <Route path={ROUTES.PROFILE} element={<CustomerLayout />}>
        <Route index element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
    </Routes>
  );
}

export default App;
