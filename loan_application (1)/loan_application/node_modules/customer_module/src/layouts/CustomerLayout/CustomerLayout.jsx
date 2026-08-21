import React from 'react';
import { Outlet } from 'react-router-dom';
import CustomerSidebar from './CustomerSidebar';
import CustomerHeader from './CustomerHeader';
import './CustomerLayout.css';

export default function CustomerLayout() {
  return (
    <div className="customer-layout-container">
      <CustomerSidebar />
      <div className="customer-main-area">
        <CustomerHeader />
        <div className="customer-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
