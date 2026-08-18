import React from 'react';
import { Bell, Calendar, ChevronDown } from 'lucide-react';
import './Header.css';

const Header = ({ title = "Credit Manager Dashboard", subtitle = "Overview of applications received from Credit Back Office" }) => {
  return (
    <div className="header">
      <div className="header-title">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      
      <div className="header-actions">
        <div className="date-picker">
          <Calendar size={16} />
          <span>12 Aug 2026</span>
        </div>
        
        <div className="notification-bell">
          <Bell size={20} />
          <span className="notification-dot">3</span>
        </div>
        
        <div className="user-profile">
          <div className="avatar">CM</div>
          <div className="user-info">
            <span className="user-name">Credit Manager</span>
            <span className="user-role">Credit Manager</span>
          </div>
          <ChevronDown size={16} />
        </div>
      </div>
    </div>
  );
};

export default Header;
