import { useNavigate } from 'react-router-dom'
import { Plus, UserCheck, MapPin, Calendar, Clock } from 'lucide-react'
import StatCards from '../../components/StatCards/StatCards'
import PendingLoans from '../../components/PendingLoans/PendingLoans'
import './Dashboard.css'

const agentInfo = [
  { icon: UserCheck, label: 'Agent ID', value: 'AGT00021' },
  { icon: MapPin, label: 'Branch', value: 'Chennai' },
  { icon: Calendar, label: "Today's Date", value: '05 Jun 2025' },
  { icon: Clock, label: 'Last Login', value: 'Today, 09:10 AM' },
]

function Dashboard() {
  const navigate = useNavigate()

  return (
    <div className="dashboard">
      {/* Top Greeting Header */}
      <div className="dashboard-greeting">
        <div className="dashboard-greeting-text">
          <h1>Good Morning, Thiru! 👋</h1>
          <p>Here's what's happening with your work today.</p>
        </div>
        <button
          type="button"
          className="dashboard-add-btn"
          onClick={() => navigate('/Agent/add-customer')}
        >
          <Plus size={18} strokeWidth={2.2} /> Add New Customer
        </button>
      </div>

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
      <StatCards />

      {/* Pending Loans Table */}
      <PendingLoans />
    </div>
  )
}

export default Dashboard
