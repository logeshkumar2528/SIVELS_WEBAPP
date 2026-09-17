import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { ROUTES } from '../../config/routeConfig';
import { LayoutDashboard, CreditCard, History, User, LogOut, HeadphonesIcon } from 'lucide-react';
import logoImg from '../../../../../Core/Logo_img/Logo.png';

export default function CustomerSidebar() {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isPendingApproval = location.pathname === ROUTES.PENDING_APPROVAL;

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    localStorage.removeItem('customerData');
    localStorage.removeItem('customerId');
    localStorage.removeItem('sivels_currentUser');
    window.location.href = '/login';
  };

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: ROUTES.DASHBOARD },
    { name: 'My Loan', icon: CreditCard, path: ROUTES.MY_LOAN },
    { name: 'EMI History', icon: History, path: ROUTES.EMI_HISTORY },
    { name: 'Profile', icon: User, path: ROUTES.PROFILE },
  ];

  return (
    <>
      <aside className="customer-sidebar">
        <div className="customer-sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src={logoImg} alt="Sivels Finance Logo" style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: '4px', flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
              <span style={{ color: 'var(--color-sidebar-logo-text)', fontSize: '14px', fontWeight: '700', letterSpacing: '0.06em' }}>SIVELS</span>
              <span style={{ color: 'var(--color-sidebar-text)', fontSize: '11px', fontWeight: '500', letterSpacing: '0.08em' }}>FINANCE</span>
            </div>
          </div>
        </div>

        <nav className="customer-sidebar-nav">
          <ul>
            {!isPendingApproval && navItems.map((item) => (
              <li key={item.name}>
                <NavLink 
                  to={item.path} 
                  className={({ isActive }) => `customer-nav-item ${isActive ? 'active' : ''}`}
                >
                  <item.icon size={18} className="customer-nav-icon" />
                  {item.name}
                </NavLink>
              </li>
            ))}
            <li className="customer-sidebar-logout">
              <button className="customer-nav-item" onClick={() => setShowLogoutModal(true)} style={{ width: '100%', textAlign: 'left', color: '#EF4444' }}>
                <LogOut size={18} color="#EF4444" className="customer-nav-icon" />
                Logout
              </button>
            </li>
          </ul>
        </nav>

        <div className="customer-sidebar-footer">
          <div className="customer-support-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <HeadphonesIcon size={16} color="var(--color-sidebar-icon)" />
              <h4>Need Help?</h4>
            </div>
            <p>We're here to help you</p>
            <button className="customer-support-btn">Contact Support</button>
          </div>
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
}
