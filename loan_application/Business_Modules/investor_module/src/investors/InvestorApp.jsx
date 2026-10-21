import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import { LoadingProvider } from '../../../../Core/src/context/LoadingContext';
import RequireAuth from '../../../../Core/src/auth/RequireAuth';
import './styles/variables.css';

// No backend role serves the investor module yet, so every signed-in user is sent to their own landing page.
const INVESTOR_ROLES = [];

export default function InvestorApp() {
  return (
    <LoadingProvider>
      <BrowserRouter>
        <RequireAuth allowedRoles={INVESTOR_ROLES}>
          <AppRoutes />
        </RequireAuth>
      </BrowserRouter>
    </LoadingProvider>
  );
}