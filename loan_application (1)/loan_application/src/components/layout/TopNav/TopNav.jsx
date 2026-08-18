import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './TopNav.css';
import Logo from '../../common/Logo/Logo';
import { ChevronDown, Users, Shield, UserCog, LogOut } from 'lucide-react';
import userLogo from '../../../assets/user.png';
import HasPermission from '../../common/HasPermission/HasPermission';

const TopNav = ({ title, subtitle, headerContent, rightContent, hideProfile = false }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  return (
    <header className="topnav">
      <div className="topnav-brand">
        <Logo />
      </div>
      
      <div className="topnav-divider"></div>
      
      <div className="topnav-content">
        <div className="topnav-titles">
          <h1 className="topnav-title">{title}</h1>
          {subtitle && (
            <>
              <span className="topnav-subtitle-separator">|</span>
              <span className="topnav-subtitle">{subtitle}</span>
            </>
          )}
        </div>
        
        {headerContent && (
          <div className="topnav-header-content">
            {headerContent}
          </div>
        )}
      </div>
      
      <div className="topnav-right">
        {rightContent && (
          <div className="topnav-right-content">
            {rightContent}
          </div>
        )}
        {!hideProfile && (
          <div className="user-profile-container" ref={dropdownRef}>
            <div className="user-profile" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
              <img src={userLogo} alt="User" className="user-avatar" />
              <ChevronDown size={14} className="user-dropdown-icon" style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
            </div>
            
            {isDropdownOpen && (
              <div className="user-dropdown-menu">
                <HasPermission permission="Dashboard_View">
                  <div className="dropdown-item" onClick={() => { navigate('/dashboard'); setIsDropdownOpen(false); }}>
                    <Shield size={16} />
                    <span>Dashboard</span>
                  </div>
                </HasPermission>
                <HasPermission permission="Groups_View">
                  <div className="dropdown-item" onClick={() => { navigate('/groups'); setIsDropdownOpen(false); }}>
                    <Users size={16} />
                    <span>Groups</span>
                  </div>
                </HasPermission>
                <HasPermission permission="Users_View">
                  <div className="dropdown-item" onClick={() => { navigate('/users'); setIsDropdownOpen(false); }}>
                    <UserCog size={16} />
                    <span>Users</span>
                  </div>
                </HasPermission>
                <HasPermission permission="Roles_View">
                  <div className="dropdown-item" onClick={() => { navigate('/roles'); setIsDropdownOpen(false); }}>
                    <Shield size={16} />
                    <span>Roles</span>
                  </div>
                </HasPermission>
                <HasPermission permission="Customer_View">
                  <div className="dropdown-item" onClick={() => { navigate('/customer-registration'); setIsDropdownOpen(false); }}>
                    <Users size={16} />
                    <span>Customer</span>
                  </div>
                </HasPermission>
                <div className="dropdown-divider"></div>
                <div className="dropdown-item logout" onClick={() => { navigate('/signup'); setIsDropdownOpen(false); }}>
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default TopNav;
