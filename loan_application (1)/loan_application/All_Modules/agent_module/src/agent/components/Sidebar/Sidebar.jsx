import { useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  UserPlus,
  History,
  UserCircle,
  LogOut,
  Headphones,
} from 'lucide-react'
const logo = '/logo.png'
import './Sidebar.css'

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, route: '/Agent/dashboard' },
  { id: 'add-customer', label: 'Add Customer', icon: UserPlus, route: '/Agent/add-customer' },
  { id: 'submission-history', label: 'Submission History', icon: History, route: '/Agent/submission-history' },
]

const bottomItems = [
  { id: 'profile', label: 'Profile', icon: UserCircle, route: '/Agent/profile' },
  { id: 'logout', label: 'Logout', icon: LogOut, route: '/logout' },
]

function Sidebar({ isOpen = false, onClose }) {
  const location = useLocation()
  const navigate = useNavigate()

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

  const handleNavigate = (route) => {
    navigate(route)
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
                    onClick={() => handleNavigate(item.route)}
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
                    onClick={() => handleNavigate(item.route)}
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
    </>
  )
}

export default Sidebar
