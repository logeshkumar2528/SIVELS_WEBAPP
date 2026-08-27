import React from 'react';
import { LayoutDashboard, FileText, Clock, CheckCircle, XCircle, UserCircle, LogOut } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import logoImg from '../../../../Core/Logo_img/Logo.png';
import './Sidebar.css';

const Sidebar = () => {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path ? 'sidebar-nav-item--active' : '';
  };

  return (
    <aside className="sidebar" aria-label="Main navigation">
      
      {/* ---- Logo ---- */}
      <div className="sidebar-logo" aria-label="Sivels Finance home">
        <img src={logoImg} alt="Sivels Finance Logo" className="sidebar-logo-img" />
        <div className="sidebar-logo-text">
          <span className="sidebar-logo-brand">SIVELS</span>
          <span className="sidebar-logo-sub">FINANCE</span>
        </div>
      </div>

      {/* ---- Scrollable navigation ---- */}
      <nav className="sidebar-nav" aria-label="Application navigation">
        
        <div className="sidebar-section">
          <p className="sidebar-section-title" aria-hidden="true">OVERVIEW</p>
          <ul className="sidebar-nav-list" role="list">
            <li>
              <Link to="/" className={`sidebar-nav-item ${isActive('/')}`}>
                <span className="sidebar-nav-icon" aria-hidden="true"><LayoutDashboard size={17} strokeWidth={1.8} /></span>
                <span className="sidebar-nav-label">Dashboard</span>
              </Link>
            </li>
          </ul>
        </div>

        <div className="sidebar-section">
          <p className="sidebar-section-title" aria-hidden="true">APPLICATIONS</p>
          <ul className="sidebar-nav-list" role="list">
            <li>
              <Link to="/received" className={`sidebar-nav-item ${isActive('/received')}`}>
                <span className="sidebar-nav-icon" aria-hidden="true"><FileText size={17} strokeWidth={1.8} /></span>
                <span className="sidebar-nav-label">Received Applications</span>
                <span className="sidebar-badge sidebar-badge--approved" aria-label="18 items" role="status">18</span>
              </Link>
            </li>
            <li>
              <Link to="/pending" className={`sidebar-nav-item ${isActive('/pending')}`}>
                <span className="sidebar-nav-icon" aria-hidden="true"><Clock size={17} strokeWidth={1.8} /></span>
                <span className="sidebar-nav-label">Pending Review</span>
                <span className="sidebar-badge sidebar-badge--review" aria-label="12 items" role="status">12</span>
              </Link>
            </li>
            <li>
              <Link to="/approved" className={`sidebar-nav-item ${isActive('/approved')}`}>
                <span className="sidebar-nav-icon" aria-hidden="true"><CheckCircle size={17} strokeWidth={1.8} /></span>
                <span className="sidebar-nav-label">Approved Applications</span>
                <span className="sidebar-badge sidebar-badge--approved" aria-label="15 items" role="status">15</span>
              </Link>
            </li>
            <li>
              <Link to="/rejected" className={`sidebar-nav-item ${isActive('/rejected')}`}>
                <span className="sidebar-nav-icon" aria-hidden="true"><XCircle size={17} strokeWidth={1.8} /></span>
                <span className="sidebar-nav-label">Rejected Applications</span>
                <span className="sidebar-badge sidebar-badge--return" aria-label="07 items" role="status">07</span>
              </Link>
            </li>
          </ul>
        </div>

        <div className="sidebar-section">
          <p className="sidebar-section-title" aria-hidden="true">REPORTS</p>
          <ul className="sidebar-nav-list" role="list">
            <li>
              <Link to="/reports" className={`sidebar-nav-item ${isActive('/reports')}`}>
                <span className="sidebar-nav-icon" aria-hidden="true"><FileText size={17} strokeWidth={1.8} /></span>
                <span className="sidebar-nav-label">Reports</span>
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* ---- Bottom-pinned area ---- */}
      <div className="sidebar-bottom">
        <ul className="sidebar-nav-list" role="list">
          <li>
            <Link to="/profile" className={`sidebar-nav-item ${isActive('/profile')}`}>
              <span className="sidebar-nav-icon" aria-hidden="true"><UserCircle size={17} strokeWidth={1.8} /></span>
              <span className="sidebar-nav-label">My Profile</span>
            </Link>
          </li>
          <li>
            <Link to="/logout" className={`sidebar-nav-item ${isActive('/logout')}`}>
              <span className="sidebar-nav-icon" aria-hidden="true"><LogOut size={17} strokeWidth={1.8} /></span>
              <span className="sidebar-nav-label">Logout</span>
            </Link>
          </li>
        </ul>
      </div>

    </aside>
  );
};

export default Sidebar;
