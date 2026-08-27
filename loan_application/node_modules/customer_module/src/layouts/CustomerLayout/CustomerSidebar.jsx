import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { ROUTES } from '../../config/routeConfig';
import { LayoutDashboard, CreditCard, History, User, LogOut, HeadphonesIcon } from 'lucide-react';
import logoImg from '../../../../../Core/Logo_img/Logo.png';

export default function CustomerSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isPendingApproval = location.pathname === ROUTES.PENDING_APPROVAL;

  const handleLogout = () => {
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
            <button className="customer-nav-item" onClick={handleLogout} style={{ width: '100%', textAlign: 'left', color: '#EF4444' }}>
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
  );
}
