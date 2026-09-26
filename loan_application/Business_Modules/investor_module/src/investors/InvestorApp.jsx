import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import { LoadingProvider } from '../../../../Core/src/context/LoadingContext';
import './styles/variables.css';

export default function InvestorApp() {
  return (
    <LoadingProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </LoadingProvider>
  );
}