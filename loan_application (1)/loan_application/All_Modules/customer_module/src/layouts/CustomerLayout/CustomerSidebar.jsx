import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, CreditCard, History, User, LogOut, HeadphonesIcon } from 'lucide-react';

export default function CustomerSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isPendingApproval = location.pathname === '/pending-approval';

  const handleLogout = () => {
    navigate('/');
  };

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'My Loan', icon: CreditCard, path: '/my-loan' },
    { name: 'EMI History', icon: History, path: '/emi-history' },
    { name: 'Profile', icon: User, path: '/profile' },
  ];

  return (
    <aside className="customer-sidebar">
      <div className="customer-sidebar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/logo.png" alt="Sivels Finance Logo" style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: '4px', flexShrink: 0 }} />
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
