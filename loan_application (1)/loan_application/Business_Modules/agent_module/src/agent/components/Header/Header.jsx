import { useLocation } from 'react-router-dom'
import { Bell, ChevronDown } from 'lucide-react'
import './Header.css'

function Header() {
  const location = useLocation()

  const getPageTitle = () => {
    const path = location.pathname.toLowerCase()
    if (path === '/' || path === '/agent' || path === '/agent/' || path === '/agent/dashboard') {
      return 'Dashboard'
    }
    if (path.includes('/add-customer')) {
      return 'Add Customer'
    }
    if (path.includes('/submission-history')) {
      return 'Submission History'
    }
    if (path.includes('/profile')) {
      return 'Profile'
    }
    return 'Dashboard'
  }

  return (
    <header className="header">
      {/* Left Section */}
      <div className="header-left">
        <h2 className="header-page-title">{getPageTitle()}</h2>
      </div>

      {/* Right Section */}
      <div className="header-right">
        <button className="header-notification" aria-label="Notifications">
          <Bell size={18} strokeWidth={1.8} />
          <span className="header-notification-badge">3</span>
        </button>

        <div className="header-profile">
          <div className="header-avatar">T</div>
          <div className="header-user-info">
            <span className="header-user-name">Thiru</span>
            <span className="header-user-role">Agent ID : AGT00021</span>
          </div>
          <ChevronDown size={16} className="header-dropdown-icon" strokeWidth={1.8} />
        </div>
      </div>
    </header>
  )
}

export default Header
