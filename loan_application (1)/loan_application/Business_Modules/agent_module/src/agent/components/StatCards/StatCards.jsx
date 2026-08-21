import { Users, ClipboardList, Send, Banknote } from 'lucide-react'
import './StatCards.css'

const stats = [
  {
    id: 'customers',
    title: "Today's Customers",
    value: '12',
    label: 'Customers added today',
    trend: '↑ 20% from yesterday',
    theme: 'green',
    icon: Users,
  },
  {
    id: 'pending-rm',
    title: 'Pending to RM',
    value: '4',
    label: 'Waiting for RM review',
    trend: '↑ 2 more than yesterday',
    theme: 'yellow',
    icon: ClipboardList,
  },
  {
    id: 'submitted',
    title: 'Total Submitted',
    value: '48',
    label: 'Total customers submitted',
    trend: '↑ 15% this month',
    theme: 'blue',
    icon: Send,
  },
  {
    id: 'pending-loans',
    title: 'Pending Loans',
    value: '30',
    label: 'Loans pending collection',
    trend: '> View Details',
    theme: 'red',
    icon: Banknote,
  },
]

function StatCards() {
  return (
    <div className="stat-cards">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <div key={stat.id} className={`stat-card stat-card--${stat.theme}`}>
            <div className="stat-card-header">
              <div className={`stat-card-icon-circle stat-card-icon-circle--${stat.theme}`}>
                <Icon size={20} strokeWidth={2} color="#FFFFFF" />
              </div>
              <div className="stat-card-header-info">
                <span className="stat-card-title">{stat.title}</span>
                <span className="stat-card-value">{stat.value}</span>
              </div>
            </div>
            <div className="stat-card-label">{stat.label}</div>
            <div className={`stat-card-trend stat-card-trend--${stat.theme}`}>
              {stat.trend}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default StatCards
