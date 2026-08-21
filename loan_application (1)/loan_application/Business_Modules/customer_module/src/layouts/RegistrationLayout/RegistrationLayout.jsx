import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import './RegistrationLayout.css';
import logo from '../../assets/Logo_img/Logo.png';

export default function RegistrationLayout() {
  const [currentStep, setCurrentStep] = useState(1);

  return (
    <div className="reg-layout">
      <header className="reg-header">
        <div className="reg-header-content">
          <div className="reg-brand">
            <img src={logo} alt="Sivels Finance Logo" className="reg-logo" />
            <div className="reg-brand-text">
              <h1 className="brand-name">Sivels Finance</h1>
              <span className="brand-tagline">— Empowering Prosperity —</span>
              <span className="brand-sub">A unit of Sivels Holding Pvt Ltd</span>
            </div>
          </div>
          
          <div className="reg-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={20} color="var(--color-primary)" />
            <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text-primary)' }}>Your data is secure with us</span>
          </div>
        </div>
      </header>
      
      <main className="reg-main-content">
        <Outlet context={{ currentStep, setCurrentStep }} />
      </main>
    </div>
  );
}
