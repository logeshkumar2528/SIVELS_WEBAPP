import React from 'react';
import { ChevronDown } from 'lucide-react';
import './Sidebar.css';

const SidebarProfile = ({ name, customerId, onProfileClick }) => {
  // Extract initials for the avatar placeholder
  const getInitials = (name) => {
    if (!name) return 'CU';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div 
      className="sidebar-profile" 
      onClick={onProfileClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onProfileClick?.();
        }
      }}
      aria-label="User profile"
    >
      <div className="profile-avatar">
        {getInitials(name)}
      </div>
      <div className="profile-info">
        <span className="profile-name">{name || 'Customer User'}</span>
        {customerId && <span className="profile-id">ID: {customerId}</span>}
      </div>
      <ChevronDown size={16} color="#94a3b8" style={{ flexShrink: 0 }} />
    </div>
  );
};

export default SidebarProfile;
