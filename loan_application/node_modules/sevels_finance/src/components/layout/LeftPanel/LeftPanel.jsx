import { ShieldCheck, LineChart, Building2 } from 'lucide-react';
import './LeftPanel.css';

const LeftPanel = () => {
  return (
    <div className="left-panel">
      <div className="left-panel-content">
        <div className="welcome-section">
          <span className="welcome-badge">Premium Banking Experience</span>
          <h1 className="welcome-title">Empowering Your<br/>Financial Growth</h1>
          <p className="welcome-subtitle">
            Next-generation loan origination and management system built for speed, security, and scale.
          </p>
        </div>

        <div className="premium-illustration">
          {/* Abstract geometric banking/finance illustration */}
          <svg viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg" className="illustration-svg">
            <rect x="50" y="80" width="220" height="140" rx="12" fill="url(#paint0_linear)" fillOpacity="0.2"/>
            <rect x="80" y="120" width="220" height="140" rx="12" fill="url(#paint1_linear)" fillOpacity="0.3"/>
            <path d="M120 180 L160 140 L200 160 L260 100" stroke="#60A5FA" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="260" cy="100" r="6" fill="#3B82F6"/>
            
            <circle cx="90" cy="70" r="40" fill="url(#paint2_linear)" fillOpacity="0.1"/>
            <circle cx="320" cy="220" r="60" fill="url(#paint3_linear)" fillOpacity="0.1"/>
            
            <defs>
              <linearGradient id="paint0_linear" x1="50" y1="80" x2="270" y2="220" gradientUnits="userSpaceOnUse">
                <stop stopColor="white"/>
                <stop offset="1" stopColor="white" stopOpacity="0"/>
              </linearGradient>
              <linearGradient id="paint1_linear" x1="80" y1="120" x2="300" y2="260" gradientUnits="userSpaceOnUse">
                <stop stopColor="#60A5FA"/>
                <stop offset="1" stopColor="#3B82F6" stopOpacity="0"/>
              </linearGradient>
              <linearGradient id="paint2_linear" x1="50" y1="30" x2="130" y2="110" gradientUnits="userSpaceOnUse">
                <stop stopColor="white"/>
                <stop offset="1" stopColor="white" stopOpacity="0"/>
              </linearGradient>
              <linearGradient id="paint3_linear" x1="260" y1="160" x2="380" y2="280" gradientUnits="userSpaceOnUse">
                <stop stopColor="#60A5FA"/>
                <stop offset="1" stopColor="#3B82F6" stopOpacity="0"/>
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="premium-features-row">
          <div className="premium-feature">
            <Building2 size={24} className="pf-icon" />
            <span>Enterprise Grade</span>
          </div>
          <div className="premium-feature">
            <ShieldCheck size={24} className="pf-icon" />
            <span>Bank-Level Security</span>
          </div>
          <div className="premium-feature">
            <LineChart size={24} className="pf-icon" />
            <span>Data-Driven Growth</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeftPanel;
