import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from './config/routeConfig';
import PendingApproval from './pages/PendingApproval/PendingApproval';
import CustomerLayout from './layouts/CustomerLayout/CustomerLayout';
import Dashboard from './pages/Dashboard/Dashboard';
import MyLoan from './pages/MyLoan/MyLoan';
import EMIHistory from './pages/EMIHistory/EMIHistory';
import Profile from './pages/Profile/Profile';
import './index.css';

function App() {
  return (
    <Routes>
      <Route path={ROUTES.HOME} element={<Navigate to="/login" replace />} />

      <Route path={ROUTES.PENDING_APPROVAL} element={<CustomerLayout />}>
        <Route index element={<PendingApproval />} />
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
