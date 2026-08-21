import React, { useState } from 'react';
import {
  LayoutDashboard,
  BarChart2,
  Users,
  Folder,
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  Bell,
  Layers,
  HelpCircle
} from 'lucide-react';
import './Sidebar.css';

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeItem, setActiveItem] = useState('dashboard');
  const [openSubmenu, setOpenSubmenu] = useState({ analytics: false, projects: false });

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleSubmenu = (menuKey) => {
    if (isCollapsed) setIsCollapsed(false);
    setOpenSubmenu((prev) => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  const handleNavClick = (id) => {
    setActiveItem(id);
  };

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="brand">
          <div className="brand-icon">
            <Layers size={22} />
          </div>
          <span className="brand-name">ApexDash</span>
        </div>
        <button
          className="toggle-btn"
          onClick={toggleSidebar}
          aria-label="Toggle Sidebar"
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="sidebar-nav">
        {/* Main Section */}
        <div>
          <div className="nav-group-title">Main Menu</div>
          <ul className="nav-list">
            {/* Dashboard */}
            <li
              className={`nav-item ${activeItem === 'dashboard' ? 'active' : ''}`}
              data-tooltip="Dashboard"
            >
              <button className="nav-link" onClick={() => handleNavClick('dashboard')}>
                <span className="nav-icon"><LayoutDashboard size={20} /></span>
                <span className="nav-text">Dashboard</span>
              </button>
            </li>

            {/* Analytics with Submenu */}
            <li className="nav-item" data-tooltip="Analytics">
              <button
                className="nav-link"
                onClick={() => toggleSubmenu('analytics')}
              >
                <span className="nav-icon"><BarChart2 size={20} /></span>
                <span className="nav-text">Analytics</span>
                <span className={`arrow-icon ${openSubmenu.analytics ? 'open' : ''}`}>
                  <ChevronDown size={16} />
                </span>
              </button>

              <ul className={`submenu ${openSubmenu.analytics ? 'open' : ''}`}>
                <li
                  className={`submenu-item ${activeItem === 'overview' ? 'active' : ''}`}
                >
                  <a
                    href="#overview"
                    className="submenu-link"
                    onClick={() => handleNavClick('overview')}
                  >
                    Overview
                  </a>
                </li>
                <li
                  className={`submenu-item ${activeItem === 'reports' ? 'active' : ''}`}
                >
                  <a
                    href="#reports"
                    className="submenu-link"
                    onClick={() => handleNavClick('reports')}
                  >
                    Reports
                  </a>
                </li>
                <li
                  className={`submenu-item ${activeItem === 'realtime' ? 'active' : ''}`}
                >
                  <a
                    href="#realtime"
                    className="submenu-link"
                    onClick={() => handleNavClick('realtime')}
                  >
                    Real-time
                  </a>
                </li>
              </ul>
            </li>

            {/* Users */}
            <li
              className={`nav-item ${activeItem === 'users' ? 'active' : ''}`}
              data-tooltip="Team Members"
            >
              <button className="nav-link" onClick={() => handleNavClick('users')}>
                <span className="nav-icon"><Users size={20} /></span>
                <span className="nav-text">Team Members</span>
              </button>
            </li>

            {/* Projects */}
            <li
              className={`nav-item ${activeItem === 'projects' ? 'active' : ''}`}
              data-tooltip="Projects"
            >
              <button className="nav-link" onClick={() => handleNavClick('projects')}>
                <span className="nav-icon"><Folder size={20} /></span>
                <span className="nav-text">Projects</span>
                <span className="nav-badge">12</span>
              </button>
            </li>

            {/* Messages */}
            <li
              className={`nav-item ${activeItem === 'messages' ? 'active' : ''}`}
              data-tooltip="Messages"
            >
              <button className="nav-link" onClick={() => handleNavClick('messages')}>
                <span className="nav-icon"><MessageSquare size={20} /></span>
                <span className="nav-text">Messages</span>
                <span className="nav-badge">5</span>
              </button>
            </li>
          </ul>
        </div>

        {/* System & Support Section */}
        <div>
          <div className="nav-group-title">Preferences</div>
          <ul className="nav-list">
            <li
              className={`nav-item ${activeItem === 'notifications' ? 'active' : ''}`}
              data-tooltip="Notifications"
            >
              <button className="nav-link" onClick={() => handleNavClick('notifications')}>
                <span className="nav-icon"><Bell size={20} /></span>
                <span className="nav-text">Notifications</span>
              </button>
            </li>

            <li
              className={`nav-item ${activeItem === 'settings' ? 'active' : ''}`}
              data-tooltip="Settings"
            >
              <button className="nav-link" onClick={() => handleNavClick('settings')}>
                <span className="nav-icon"><Settings size={20} /></span>
                <span className="nav-text">Settings</span>
              </button>
            </li>

            <li
              className={`nav-item ${activeItem === 'help' ? 'active' : ''}`}
              data-tooltip="Help & Support"
            >
              <button className="nav-link" onClick={() => handleNavClick('help')}>
                <span className="nav-icon"><HelpCircle size={20} /></span>
                <span className="nav-text">Help Center</span>
              </button>
            </li>
          </ul>
        </div>
      </nav>

      {/* User Profile Footer */}
      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="avatar-wrapper">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80"
              alt="User Avatar"
              className="user-avatar"
            />
            <span className="status-indicator"></span>
          </div>
          <div className="user-details">
            <span className="user-name">Alex Morgan</span>
            <span className="user-role">Product Lead</span>
          </div>
        </div>
        <button className="logout-btn" title="Logout" aria-label="Logout">
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}
