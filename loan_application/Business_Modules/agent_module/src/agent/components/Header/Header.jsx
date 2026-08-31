import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useAgentIdentity } from '../../hooks/useAgentIdentity'
import './Header.css'

const getBackendBaseUrl = () => {
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api/'
  return apiBase.replace(/\/api\/?$/, '')
}

const resolveImageUrl = (path) => {
  if (!path || typeof path !== 'string' || !path.trim()) return null
  const trimmed = path.trim()
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed
  }
  const backendBase = getBackendBaseUrl()
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return `${backendBase}${cleanPath}`
}

function Header() {
  const [imageError, setImageError] = useState(false)
  const location = useLocation()
  const { agentData, loadingAgent } = useAgentIdentity()

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/Agent/dashboard':
        return 'Agent Dashboard'
      case '/Agent/add-customer':
        return 'Add Customer'
      case '/Agent/submission-history':
        return 'Submission History'
      case '/Agent/profile':
        return 'My Profile'
      default:
        return 'Agent Portal'
    }
  }

  const agentName = agentData?.fullName || 'Agent'
  const agentInitial = agentName.charAt(0).toUpperCase()
  const agentCode = agentData?.agentCode || 'N/A'
  const rawImagePath = agentData?.profileImagePath || agentData?.ProfileImagePath || null
  const profileImage = !imageError && rawImagePath ? resolveImageUrl(rawImagePath) : null

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
                src={profileImage} 
                alt={agentName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={() => setImageError(true)}
              />
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                {agentInitial}
              </span>
            )}
          </div>
          <div className="header-user-info">
            <span className="header-user-name">{loadingAgent ? 'Loading...' : agentName}</span>
            <span className="header-user-role">Agent ID : {loadingAgent ? '...' : agentCode}</span>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
