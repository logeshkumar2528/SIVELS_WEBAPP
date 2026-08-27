import { useLocation } from 'react-router-dom'
import { Bell, ChevronDown } from 'lucide-react'
import { useAgentIdentity } from '../../hooks/useAgentIdentity'
import './Header.css'

function Header() {
  const location = useLocation()
  const { agentData, loadingAgent } = useAgentIdentity()

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

  const agentName = agentData?.fullName || 'Agent'
  const agentInitial = agentName.charAt(0).toUpperCase()
  const agentCode = agentData?.agentCode || 'N/A'
  const profileImage = agentData?.profileImagePath || null

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
          <div className="header-avatar" style={{ overflow: 'hidden' }}>
            {loadingAgent ? '' : profileImage ? (
              <img 
                src={profileImage.startsWith('http') ? profileImage : `http://localhost:5118${profileImage}`} 
                alt={agentName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <span style={{ display: profileImage ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
              {agentInitial}
            </span>
          </div>
          <div className="header-user-info">
            <span className="header-user-name">{loadingAgent ? 'Loading...' : agentName}</span>
            <span className="header-user-role">Agent ID : {loadingAgent ? '...' : agentCode}</span>
          </div>
          <ChevronDown size={16} className="header-dropdown-icon" strokeWidth={1.8} />
        </div>
      </div>
    </header>
  )
}

export default Header
