import React, { useState } from 'react';
import { LayoutDashboard, FileText, Clock, CheckCircle, XCircle, UserCircle, LogOut } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { clearCreditManagerAuth } from '../auth/authStorage';
import logoImg from '../../../../Core/Logo_img/Logo.png';
import './Sidebar.css';

const Sidebar = () => {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path ? 'sidebar-nav-item--active' : '';
  };

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    clearCreditManagerAuth();
  };

  return (
    <>
      <aside className="sidebar" aria-label="Main navigation">
        
        {/* ---- Logo ---- */}
        <div className="sidebar-logo" aria-label="Sivels Finance home">
          <img src={logoImg} alt="Sivels Finance Logo" className="sidebar-logo-img" />
          <div className="sidebar-logo-text">
            <span className="sidebar-logo-brand">SIVELS</span>
            <span className="sidebar-logo-sub">FINANCE</span>
          </div>
        </div>

        {/* ---- Scrollable navigation ---- */}
        <nav className="sidebar-nav" aria-label="Application navigation">
          
          <div className="sidebar-section">
            <p className="sidebar-section-title" aria-hidden="true">OVERVIEW</p>
            <ul className="sidebar-nav-list" role="list">
              <li>
                <Link to="/" className={`sidebar-nav-item ${isActive('/')}`}>
                  <span className="sidebar-nav-icon" aria-hidden="true"><LayoutDashboard size={17} strokeWidth={1.8} /></span>
                  <span className="sidebar-nav-label">Dashboard</span>
                </Link>
              </li>
            </ul>
          </div>

          <div className="sidebar-section">
            <p className="sidebar-section-title" aria-hidden="true">APPLICATIONS</p>
            <ul className="sidebar-nav-list" role="list">
              <li>
                <Link to="/received" className={`sidebar-nav-item ${isActive('/received')}`}>
                  <span className="sidebar-nav-icon" aria-hidden="true"><FileText size={17} strokeWidth={1.8} /></span>
                  <span className="sidebar-nav-label">Received Applications</span>
                  <span className="sidebar-badge sidebar-badge--approved" aria-label="18 items" role="status">18</span>
                </Link>
              </li>
              <li>
                <Link to="/pending" className={`sidebar-nav-item ${isActive('/pending')}`}>
                  <span className="sidebar-nav-icon" aria-hidden="true"><Clock size={17} strokeWidth={1.8} /></span>
                  <span className="sidebar-nav-label">Pending Review</span>
                  <span className="sidebar-badge sidebar-badge--review" aria-label="12 items" role="status">12</span>
                </Link>
              </li>
              <li>
                <Link to="/approved" className={`sidebar-nav-item ${isActive('/approved')}`}>
                  <span className="sidebar-nav-icon" aria-hidden="true"><CheckCircle size={17} strokeWidth={1.8} /></span>
                  <span className="sidebar-nav-label">Approved Applications</span>
                  <span className="sidebar-badge sidebar-badge--approved" aria-label="15 items" role="status">15</span>
                </Link>
              </li>
              <li>
                <Link to="/rejected" className={`sidebar-nav-item ${isActive('/rejected')}`}>
                  <span className="sidebar-nav-icon" aria-hidden="true"><XCircle size={17} strokeWidth={1.8} /></span>
                  <span className="sidebar-nav-label">Rejected Applications</span>
                  <span className="sidebar-badge sidebar-badge--return" aria-label="07 items" role="status">07</span>
                </Link>
              </li>
            </ul>
          </div>

          <div className="sidebar-section">
            <p className="sidebar-section-title" aria-hidden="true">REPORTS</p>
            <ul className="sidebar-nav-list" role="list">
              <li>
                <Link to="/reports" className={`sidebar-nav-item ${isActive('/reports')}`}>
                  <span className="sidebar-nav-icon" aria-hidden="true"><FileText size={17} strokeWidth={1.8} /></span>
                  <span className="sidebar-nav-label">Reports</span>
                </Link>
              </li>
            </ul>
          </div>
        </nav>

        {/* ---- Bottom-pinned area ---- */}
        <div className="sidebar-bottom">
          <ul className="sidebar-nav-list" role="list">
            <li>
              <Link to="/profile" className={`sidebar-nav-item ${isActive('/profile')}`}>
                <span className="sidebar-nav-icon" aria-hidden="true"><UserCircle size={17} strokeWidth={1.8} /></span>
                <span className="sidebar-nav-label">My Profile</span>
              </Link>
            </li>
            <li>
              <button
                type="button"
                className="sidebar-nav-item"
                style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', font: 'inherit' }}
                onClick={(e) => {
                  e.preventDefault();
                  setShowLogoutModal(true);
                }}
              >
                <span className="sidebar-nav-icon" aria-hidden="true"><LogOut size={17} strokeWidth={1.8} /></span>
                <span className="sidebar-nav-label">Logout</span>
              </button>
            </li>
          </ul>
        </div>

      </aside>

      {showLogoutModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(4px)',
            padding: '1rem',
          }}
          onClick={() => setShowLogoutModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              width: '100%',
              maxWidth: '420px',
              padding: '1.5rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: '#fef2f2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#dc2626',
                  flexShrink: 0,
                }}
              >
                <LogOut size={20} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: '#0f172a' }}>
                Confirm Logout
              </h3>
            </div>
            <p style={{ margin: '0 0 1.5rem 0', color: '#64748b', fontSize: '0.925rem', lineHeight: '1.5' }}>
              Are you sure you want to logout?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                onClick={handleConfirmLogout}
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
