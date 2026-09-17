import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  UserPlus,
  History,
  UserCircle,
  LogOut,
  Headphones,
} from 'lucide-react'
import { useAuth } from '../../../../../../Core/src/context/AuthContext'
import logo from '../../../../../../Core/Logo_img/Logo.png'
import './Sidebar.css'

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, route: '/Agent/dashboard' },
  { id: 'add-customer', label: 'Add Customer', icon: UserPlus, route: '/Agent/add-customer' },
  { id: 'submission-history', label: 'Submission History', icon: History, route: '/Agent/submission-history' },
]

const bottomItems = [
  { id: 'profile', label: 'Profile', icon: UserCircle, route: '/Agent/profile' },
  { id: 'logout', label: 'Logout', icon: LogOut, route: '/login' },
]

function Sidebar({ isOpen = false, onClose }) {
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()

  const isActive = (route) => {
    if (route === '/Agent/dashboard') {
      return (
        location.pathname === '/' ||
        location.pathname === '/Agent' ||
        location.pathname === '/Agent/' ||
        location.pathname === '/Agent/dashboard'
      )
    }
    return location.pathname === route
  }

  const handleConfirmLogout = () => {
    setShowLogoutModal(false)
    try {
      if (logout) logout()
    } catch (err) {
      console.error('Logout error:', err)
    }
    localStorage.removeItem('sivels_currentUser')
    localStorage.removeItem('sivels_permissions')
    localStorage.removeItem('sivels_roles')
    window.location.href = '/login'
  }

  const handleNavigate = (item) => {
    if (item.id === 'logout') {
      setShowLogoutModal(true)
      return
    }
    navigate(item.route)
    if (onClose) onClose()
  }

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <img src={logo} alt="Sivels Finance Logo" className="sidebar-logo-img" />
          <div className="sidebar-logo-text">
            <span className="sidebar-logo-brand">SIVELS</span>
            <span className="sidebar-logo-sub">FINANCE</span>
          </div>
        </div>

        {/* Scrollable Navigation */}
        <nav className="sidebar-nav">
          <ul className="sidebar-nav-list" role="list">
            {menuItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.route)

              return (
                <li key={item.id}>
                  <button
                    className={`sidebar-nav-item ${active ? 'sidebar-nav-item--active' : ''}`}
                    onClick={() => handleNavigate(item)}
                  >
                    <span className="sidebar-nav-icon">
                      <Icon size={17} strokeWidth={1.8} />
                    </span>
                    <span className="sidebar-nav-label">{item.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Bottom Pinned Area matching Back Office */}
        <div className="sidebar-bottom">
          <ul className="sidebar-nav-list" role="list">
            {bottomItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.route)

              return (
                <li key={item.id}>
                  <button
                    className={`sidebar-nav-item ${active ? 'sidebar-nav-item--active' : ''}`}
                    onClick={() => handleNavigate(item)}
                  >
                    <span className="sidebar-nav-icon">
                      <Icon size={17} strokeWidth={1.8} />
                    </span>
                    <span className="sidebar-nav-label">{item.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>

          {/* Support Widget matching Back Office */}
          <div className="sidebar-support">
            <div className="sidebar-support-icon">
              <Headphones size={18} strokeWidth={1.8} />
            </div>
            <div className="sidebar-support-text">
              <span className="sidebar-support-label">Need Help?</span>
              <a
                href="mailto:support@sivelsfinance.com"
                className="sidebar-support-link"
              >
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </aside>

      {showLogoutModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(4px)',
            padding: '1rem',
          }}
          onClick={() => setShowLogoutModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              width: '100%',
              maxWidth: '420px',
              padding: '1.5rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: '#fef2f2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#dc2626',
                  flexShrink: 0,
                }}
              >
                <LogOut size={20} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: '#0f172a' }}>
                Confirm Logout
              </h3>
            </div>
            <p style={{ margin: '0 0 1.5rem 0', color: '#64748b', fontSize: '0.925rem', lineHeight: '1.5' }}>
              Are you sure you want to logout?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                onClick={handleConfirmLogout}
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Sidebar
