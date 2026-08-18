import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AuthLayout />}>
          <Route index element={<Login />} />
          <Route path="verify" element={<VerifyOTP />} />
        </Route>
        <Route path="/pending-approval" element={<CustomerLayout />}>
          <Route index element={<PendingApproval />} />
        </Route>
        <Route path="/register" element={<RegistrationLayout />}>
          <Route index element={<Register />} />
        </Route>
        <Route path="/dashboard" element={<CustomerLayout />}>
          <Route index element={<Dashboard />} />
        </Route>
        <Route path="/my-loan" element={<CustomerLayout />}>
          <Route index element={<MyLoan />} />
        </Route>
        <Route path="/emi-history" element={<CustomerLayout />}>
          <Route index element={<EMIHistory />} />
        </Route>
        <Route path="/profile" element={<CustomerLayout />}>
          <Route index element={<Profile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
