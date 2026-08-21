import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import './styles/variables.css';

export default function InvestorApp() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}