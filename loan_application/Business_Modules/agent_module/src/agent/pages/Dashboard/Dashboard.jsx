import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserCheck, MapPin, Calendar, Clock } from 'lucide-react'
import StatCards from '../../components/StatCards/StatCards'
import PendingLoans from '../../components/PendingLoans/PendingLoans'
import SubmittedCustomers from '../../components/SubmittedCustomers/SubmittedCustomers'
import { useAgentIdentity } from '../../hooks/useAgentIdentity'
import './Dashboard.css'

function Dashboard() {
  const navigate = useNavigate()
  const { agentData, loadingAgent } = useAgentIdentity()
  const [showSubmittedCustomers, setShowSubmittedCustomers] = useState(false)

  if (loadingAgent) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        Loading dashboard...
      </div>
    )
  }

  const agentInfo = [
    { icon: UserCheck, label: 'Agent ID', value: agentData?.agentCode || 'N/A' },
    { icon: MapPin, label: 'Branch', value: agentData?.branch || 'N/A' },
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
      <StatCards onTotalSubmittedClick={() => setShowSubmittedCustomers((isOpen) => !isOpen)} />

      {showSubmittedCustomers && <SubmittedCustomers />}

      {/* Pending Loans Table */}
      <PendingLoans />
    </div>
  )
}

export default Dashboard
