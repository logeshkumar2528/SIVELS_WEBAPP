import React from 'react';
import './Sidebar.css';

const SidebarItem = ({ icon: Icon, label, isActive, isLogout, onClick }) => {
  return (
    <div
      className={`sidebar-item ${isActive ? 'active' : ''} ${isLogout ? 'logout' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
    >
      <div className="sidebar-item-icon">
        <Icon size={22} />
      </div>
      <span className="sidebar-item-label">{label}</span>
    </div>
  );
};

export default SidebarItem;
