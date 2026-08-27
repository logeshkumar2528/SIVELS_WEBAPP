import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Hexagon } from 'lucide-react';
import SidebarItem from './SidebarItem';
import SidebarProfile from './SidebarProfile';
import './Sidebar.css';

const Sidebar = ({ items, profile, onLogout }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  const handleNavClick = (path) => {
    navigate(path);
  };

  // Separate regular nav items and logout
  const navItems = items.filter(item => item.id !== 'logout');
  const logoutItem = items.find(item => item.id === 'logout');

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`sidebar-overlay ${isMobileOpen ? 'visible' : ''}`} 
        onClick={() => setIsMobileOpen(false)}
        aria-hidden="true"
      />

      {/* 
        Note: The container uses CSS media queries for tablet/mobile states. 
        isMobileOpen is triggered by some external hamburger menu if present. 
      */}
      <aside className={`premium-sidebar-container ${isMobileOpen ? 'mobile-open' : ''}`}>
        
        {/* Navigation Menu */}
        <nav className="sidebar-nav-menu" aria-label="Main Navigation">
          {navItems.map((item) => {
            const isActive = location.pathname.includes(item.path);
            return (
              <SidebarItem
                key={item.id}
                label={item.label}
                icon={item.icon}
                isActive={isActive}
                onClick={() => handleNavClick(item.path)}
              />
            );
          })}
        </nav>

        {/* Profile Card */}
        {profile && (
          <SidebarProfile 
            name={profile.name} 
            customerId={profile.customerId}
            onProfileClick={() => handleNavClick('/customer/profile')}
          />
        )}

        {/* Logout Button (Separate at Bottom) */}
        {logoutItem && (
          <SidebarItem
            label={logoutItem.label}
            icon={logoutItem.icon}
            isLogout={true}
            onClick={() => onLogout ? onLogout() : handleNavClick(logoutItem.path)}
          />
        )}
      </aside>
    </>
  );
};

export default Sidebar;
