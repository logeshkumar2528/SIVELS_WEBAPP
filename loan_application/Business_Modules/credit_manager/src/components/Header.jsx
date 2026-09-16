import React, { useMemo } from 'react';
import { Bell, Calendar, ChevronDown } from 'lucide-react';
import { getCreditManagerAuth } from '../auth/authStorage';
import './Header.css';

function getInitials(name) {
  if (!name) return 'CM';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const Header = ({ title = "Credit Manager Dashboard", subtitle = "Overview of applications received from Credit Back Office" }) => {
  const auth = useMemo(() => getCreditManagerAuth(), []);

  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, []);

  const userName = auth?.fullName || 'Credit Manager';
  const userCode = auth?.creditManagerCode || '';
  const userInitials = getInitials(userName);

  return (
    <div className="header">
      <div className="header-title">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      
      <div className="header-actions">
        <div className="date-picker">
          <Calendar size={16} />
          <span>{formattedDate}</span>
        </div>
        
        <div className="notification-bell">
          <Bell size={20} />
          <span className="notification-dot">3</span>
        </div>
        
        <div className="user-profile" title={userCode ? `Credit Manager ID: ${auth?.creditManagerId || ''} (${userCode})` : 'Credit Manager'}>
          <div className="avatar">{userInitials}</div>
          <div className="user-info">
            <span className="user-name">{userName}</span>
            <span className="user-role">{userCode ? `${userCode} • ` : ''}Credit Manager</span>
          </div>
          <ChevronDown size={16} />
        </div>
      </div>
    </div>
  );
};

export default Header;
