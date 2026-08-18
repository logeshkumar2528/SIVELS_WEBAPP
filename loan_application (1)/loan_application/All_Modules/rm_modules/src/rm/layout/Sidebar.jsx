import React, { useState } from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  ShieldCheck,
  Users,
  LogOut,
  User,
  Headphones
} from 'lucide-react';
import './Sidebar.css';

const NavItem = ({ icon: Icon, label, isActive, onClick, badge }) => {
  return (
    <li>
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          onClick();
        }}
        className={['sidebar-nav-item', isActive ? 'sidebar-nav-item--active' : ''].join(' ').trim()}
      >
        <span className="sidebar-nav-icon">
          <Icon size={17} strokeWidth={1.8} />
        </span>
        <span className="sidebar-nav-label">{label}</span>
        {badge && (
          <span className="sidebar-badge sidebar-badge--new">
            {badge}
          </span>
        )}
      </a>
    </li>
  );
};

export default function Sidebar({ activeKey, onNavigate }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <>
      {isMobileOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={['sidebar', isMobileOpen ? 'sidebar--open' : ''].join(' ').trim()}>
        
        {/* ---- Logo ---- */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">S</div>
          <div className="sidebar-logo-text">
            <span className="sidebar-logo-brand">SIVELS</span>
            <span className="sidebar-logo-sub">FINANCE</span>
          </div>
        </div>

        {/* ---- Scrollable navigation ---- */}
        <nav className="sidebar-nav">
          <div className="sidebar-section">
            <p className="sidebar-section-title">Main Menu</p>
            <ul className="sidebar-nav-list">
              <NavItem
                label="Dashboard"
                icon={LayoutDashboard}
                isActive={activeKey === 'dashboard'}
                onClick={() => onNavigate('dashboard')}
              />
              <NavItem
                label="New Applications"
                icon={ClipboardList}
                isActive={activeKey === 'new-apps'}
                onClick={() => onNavigate('new-apps')}
                badge="24"
              />
              <NavItem
                label="Verified Applications"
                icon={ShieldCheck}
                isActive={activeKey === 'verification'}
                onClick={() => onNavigate('verification')}
              />
              <NavItem
                label="My Agents"
                icon={Users}
                isActive={activeKey === 'my-agents'}
                onClick={() => onNavigate('my-agents')}
              />
            </ul>
          </div>
        </nav>

        {/* ---- Bottom-pinned area ---- */}
        <div className="sidebar-bottom">
          <ul className="sidebar-nav-list">
            <NavItem
              label="Profile (Ramesh Kumar)"
              icon={User}
              isActive={activeKey === 'profile'}
              onClick={() => onNavigate('profile')}
            />
            <NavItem
              label="Logout"
              icon={LogOut}
              isActive={false}
              onClick={() => console.log('Logout')}
            />
          </ul>

          <div className="sidebar-support">
            <div className="sidebar-support-icon">
              <Headphones size={18} strokeWidth={1.8} />
            </div>
            <div className="sidebar-support-text">
              <span className="sidebar-support-label">Need Help?</span>
              <a href="mailto:support@sivelsfinance.com" className="sidebar-support-link">
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
