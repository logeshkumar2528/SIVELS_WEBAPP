import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import { LoadingProvider } from '../../../../Core/src/context/LoadingContext';
import RequireAuth from '../../../../Core/src/auth/RequireAuth';
import './styles/variables.css';

const INVESTOR_ROLES = ['INVESTOR'];

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
