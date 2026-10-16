import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserCheck, MapPin, Calendar, Clock } from 'lucide-react'
import StatCards from '../../components/StatCards/StatCards'
import PendingLoans from '../../components/PendingLoans/PendingLoans'
import SubmittedCustomers from '../../components/SubmittedCustomers/SubmittedCustomers'
import { useAgentIdentity } from '../../hooks/useAgentIdentity'
import { useAuth } from '../../../../../../Core/src/context/AuthContext'
import './Dashboard.css'

function Dashboard() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { agentId, agentData, loadingAgent } = useAgentIdentity()
  const [activeSection, setActiveSection] = useState('pending-loans')

  if (loadingAgent) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        Loading dashboard...
      </div>
    )
  }

  if (!agentId) {
    const isOtherRole = currentUser?.role && String(currentUser.role).toLowerCase() !== 'agent'
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
        <h3 style={{ color: '#0f172a', marginBottom: '8px', fontSize: '18px', fontWeight: 600 }}>
          {isOtherRole ? 'Unauthorized Access' : 'Agent Identity Not Found'}
        </h3>
        <p style={{ margin: '0 auto 16px', maxWidth: '420px', fontSize: '14px', lineHeight: 1.5 }}>
          {isOtherRole
            ? `You are currently logged in with a non-Agent account (${currentUser.role}). Please log in with an Agent account to access the Agent dashboard.`
            : 'Unable to establish your Agent identity. Please log in again to access the dashboard.'}
        </p>
        <button
          type="button"
          className="std-btn std-btn-primary"
          onClick={() => navigate('/login')}
          style={{ padding: '8px 18px', borderRadius: '6px', cursor: 'pointer' }}
        >
          Go to Login
        </button>
      </div>
    )
  }

  const resolvedAgentCode =
    agentData?.agentCode ||
    agentData?.AgentCode ||
    agentData?.code ||
    currentUser?.agentCode ||
    agentId ||
    'N/A'

  const resolvedBranch =
    agentData?.branch ||
    agentData?.Branch ||
    agentData?.branchName ||
    agentData?.BranchName ||
    currentUser?.branch ||
    'N/A'

  const agentInfo = [
    { icon: UserCheck, label: 'Agent ID', value: resolvedAgentCode },
    { icon: MapPin, label: 'Branch', value: resolvedBranch },
    { icon: Calendar, label: "Today's Date", value: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) },
    { icon: Clock, label: 'Last Login', value: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
  ]

  return (
    <div className="dashboard">
      {/* Agent Info Metadata Cards */}
      <div className="dashboard-agent-info">
        {agentInfo.map((info) => {
          const Icon = info.icon
          return (
            <div key={info.label} className="agent-info-card">
              <div className="agent-info-icon-box">
                <Icon size={18} strokeWidth={1.8} />
              </div>
              <div>
                <div className="agent-info-label">{info.label}</div>
                <div className="agent-info-value">{info.value}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 4 Stat Cards */}
      <StatCards
        activeSection={activeSection}
        onTotalSubmittedClick={() => setActiveSection('submitted')}
      />

      {/* Conditional Table Rendering */}
      {activeSection === 'submitted' ? (
        <SubmittedCustomers />
      ) : (
        <PendingLoans />
      )}
    </div>
  )
}

export default Dashboard
