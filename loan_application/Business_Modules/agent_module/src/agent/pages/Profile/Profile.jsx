import { useState, useEffect } from 'react'
import { agentCustomerService } from '../../../../../../Core/src/services/agentCustomerService'
import {
  Phone,
  Mail,
  Calendar,
  Shield,
  User,
  CheckCircle2,
  IdCard,
  Building2,
  Users,
  Coins,
  MapPin,
  X,
  ChevronRight
} from 'lucide-react'
import { useAgentIdentity } from '../../hooks/useAgentIdentity'
import './Profile.css'

const getBackendBaseUrl = () => {
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5118/api'
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

function Profile() {
  const [imageError, setImageError] = useState(false)
  const [showCommissionModal, setShowCommissionModal] = useState(false)
  const [selectedEmiCustomer, setSelectedEmiCustomer] = useState(null)

  const [customersCount, setCustomersCount] = useState('...')

  const { agentData, loadingAgent, agentId } = useAgentIdentity()

  useEffect(() => {
    if (loadingAgent || !agentId) return
    agentCustomerService.getAllCustomers().then(data => {
      const allCustomers = (Array.isArray(data) ? data : data?.data || data?.items || data?.result || data?.list || [])
      const myCustomers = allCustomers.filter(c => Number(c.agentId) === Number(agentId))
      setCustomersCount(myCustomers.length.toString())
    }).catch(err => {
      console.error("Failed to load customers count", err)
      setCustomersCount('0')
    })
  }, [agentId, loadingAgent])

  // Payout / commission breakdown data
  const commissionBreakdown = [
    { 
      id: 1, name: 'Rajesh Kumar', loanAmount: '₹5,00,000', commission: '₹15,000', date: '12 Aug 2026',
      monthlyData: [
        { month: 'Sep 2026', status: 'Paid', amount: '₹1,500' },
        { month: 'Oct 2026', status: 'Paid', amount: '₹1,500' },
        { month: 'Nov 2026', status: 'Pending', amount: '₹1,500' },
      ]
    },
    { 
      id: 2, name: 'Priya Sharma', loanAmount: '₹3,50,000', commission: '₹10,500', date: '10 Aug 2026',
      monthlyData: [
        { month: 'Sep 2026', status: 'Paid', amount: '₹1,050' },
        { month: 'Oct 2026', status: 'Pending', amount: '₹1,050' },
      ]
    },
    { 
      id: 3, name: 'Vikram Singh', loanAmount: '₹2,00,000', commission: '₹6,000', date: '05 Aug 2026',
      monthlyData: [
        { month: 'Sep 2026', status: 'Paid', amount: '₹600' },
        { month: 'Oct 2026', status: 'Paid', amount: '₹600' },
        { month: 'Nov 2026', status: 'Paid', amount: '₹600' },
        { month: 'Dec 2026', status: 'Pending', amount: '₹600' },
      ]
    },
    { 
      id: 4, name: 'Anita Desai', loanAmount: '₹4,50,000', commission: '₹13,700', date: '01 Aug 2026',
      monthlyData: [
        { month: 'Sep 2026', status: 'Paid', amount: '₹1,370' },
        { month: 'Oct 2026', status: 'Pending', amount: '₹1,370' },
      ]
    },
  ]

  if (loadingAgent) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        Loading profile...
      </div>
    )
  }

  const agentName = agentData?.fullName || 'Agent'
  const agentRole = agentData?.role || 'Field Agent'
  const agentCode = agentData?.agentCode || 'N/A'
  const agentBranch = agentData?.branch || 'N/A'
  const agentMobile = agentData?.mobileNumber || 'N/A'
  const agentEmail = agentData?.emailAddress || 'N/A'
  
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    const date = new Date(dateStr)
    return isNaN(date) ? 'N/A' : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const agentDateJoined = formatDate(agentData?.dateJoined)
  const agentDob = formatDate(agentData?.dateOfBirth)
  const agentGender = agentData?.genderName || (agentData?.genderId === 6 ? 'Male' : agentData?.genderId === 7 ? 'Female' : 'N/A')
  const agentAddress = agentData?.address || 'N/A'
  const agentState = agentData?.state || 'N/A'
  const agentPincode = agentData?.pincode || 'N/A'
  const rawImagePath = agentData?.profileImagePath || agentData?.ProfileImagePath || null
  const profileImageUrl = !imageError && rawImagePath ? resolveImageUrl(rawImagePath) : null

  return (
    <div className="profile-page">
      {/* 1. TOP CARD: PROFILE OVERVIEW (UNCHANGED) */}
      <div className="profile-card profile-overview-card">
        {/* Left Section: Avatar + Identity + Metric Tiles */}
        <div className="profile-overview-left">
          {/* Identity: Avatar + Name & Role */}
          <div className="profile-identity-row">
            <div className="profile-avatar-img">
              {profileImageUrl ? (
                <img 
                  src={profileImageUrl} 
                  alt={agentName} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={() => setImageError(true)}
                />
              ) : (
                <User size={38} strokeWidth={2} style={{ color: '#1A7A3C' }} />
              )}
            </div>

            <div className="profile-name-block">
              <h1>{agentName}</h1>
              <div className="profile-role-row">
                <span className="profile-role-text">{agentRole}</span>
                <CheckCircle2 size={15} className="profile-verified-badge" />
              </div>
            </div>
          </div>

          {/* Metric Tiles Row */}
          <div className="profile-pills-row">
            {/* 1. Agent ID */}
            <div className="profile-pill profile-pill--green">
              <div className="profile-pill-icon">
                <IdCard size={16} />
              </div>
              <div className="profile-pill-content">
                <div className="profile-pill-label">Agent ID</div>
                <div className="profile-pill-value">{agentCode}</div>
              </div>
            </div>

            {/* 2. Branch */}
            <div className="profile-pill profile-pill--blue">
              <div className="profile-pill-icon">
                <Building2 size={16} />
              </div>
              <div className="profile-pill-content">
                <div className="profile-pill-label">Branch</div>
                <div className="profile-pill-value">{agentBranch}</div>
              </div>
            </div>

            {/* 3. Total Customers */}
            <div className="profile-pill profile-pill--purple">
              <div className="profile-pill-icon">
                <Users size={16} />
              </div>
              <div className="profile-pill-content">
                <div className="profile-pill-label">Total Customers</div>
                <div className="profile-pill-value">{customersCount}</div>
              </div>
            </div>

            {/* 4. Total Commission */}
            <div className="profile-pill profile-pill--orange">
              <div className="profile-pill-icon">
                <Coins size={16} />
              </div>
              <div className="profile-pill-content profile-pill-commission">
                <div>
                  <div className="profile-pill-label">Total Commission</div>
                  <div className="profile-pill-value">₹45,200</div>
                </div>
                <button 
                  type="button"
                  className="btn-payout-detail"
                  onClick={() => setShowCommissionModal(true)}
                >
                  View Payout Detail
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section: Contact & Metadata */}
        <div className="profile-meta-list">
          <div className="profile-meta-item">
            <div className="profile-meta-icon-wrapper">
              <Phone size={14} />
            </div>
            <div className="meta-text">
              <span className="meta-label">Mobile Number</span>
              <span className="meta-value">{agentMobile}</span>
            </div>
          </div>

          <div className="profile-meta-item">
            <div className="profile-meta-icon-wrapper">
              <Mail size={14} />
            </div>
            <div className="meta-text">
              <span className="meta-label">Email Address</span>
              <span className="meta-value">{agentEmail}</span>
            </div>
          </div>

          <div className="profile-meta-item">
            <div className="profile-meta-icon-wrapper">
              <Calendar size={14} />
            </div>
            <div className="meta-text">
              <span className="meta-label">Date Joined</span>
              <span className="meta-value">{agentDateJoined}</span>
            </div>
          </div>

          <div className="profile-meta-item">
            <div className="profile-meta-icon-wrapper">
              <Shield size={14} />
            </div>
            <div className="meta-text">
              <span className="meta-label">Role</span>
              <span className="meta-value">{agentRole}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MIDDLE CARD: PERSONAL INFORMATION (HORIZONTAL 6-COLUMNS) */}
      <div className="profile-card profile-personal-horizontal-card">
        <div className="section-card-header">
          <div className="section-card-title">
            <div className="section-card-title-icon">
              <User size={15} />
            </div>
            <span>Personal Information</span>
          </div>
        </div>

        <div className="personal-info-horizontal-grid">
          {/* 1. Full Name */}
          <div className="personal-info-col">
            <div className="personal-info-col-header">
              <div className="personal-info-icon-box">
                <User size={13} />
              </div>
              <span className="personal-info-label">Full Name</span>
            </div>
            <div className="personal-info-value">{agentName}</div>
          </div>

          {/* 2. Date of Birth */}
          <div className="personal-info-col">
            <div className="personal-info-col-header">
              <div className="personal-info-icon-box">
                <Calendar size={13} />
              </div>
              <span className="personal-info-label">Date of Birth</span>
            </div>
            <div className="personal-info-value">{agentDob}</div>
          </div>

          {/* 3. Gender */}
          <div className="personal-info-col">
            <div className="personal-info-col-header">
              <div className="personal-info-icon-box">
                <User size={13} />
              </div>
              <span className="personal-info-label">Gender</span>
            </div>
            <div className="personal-info-value">{agentGender}</div>
          </div>

          {/* 4. Address */}
          <div className="personal-info-col">
            <div className="personal-info-col-header">
              <div className="personal-info-icon-box">
                <MapPin size={13} />
              </div>
              <span className="personal-info-label">Address</span>
            </div>
            <div className="personal-info-value personal-info-value--address">{agentAddress}</div>
          </div>

          {/* 5. State */}
          <div className="personal-info-col">
            <div className="personal-info-col-header">
              <div className="personal-info-icon-box">
                <Building2 size={13} />
              </div>
              <span className="personal-info-label">State</span>
            </div>
            <div className="personal-info-value">{agentState}</div>
          </div>

          {/* 6. Pincode */}
          <div className="personal-info-col personal-info-col--last">
            <div className="personal-info-col-header">
              <div className="personal-info-icon-box">
                <MapPin size={13} />
              </div>
              <span className="personal-info-label">Pincode</span>
            </div>
            <div className="personal-info-value">{agentPincode}</div>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM CARD: PAYOUT BREAKDOWN (FULL WIDTH) */}
      <div className="profile-card profile-payout-full-card">
        <div className="section-card-header">
          <div className="section-card-title">
            <div className="section-card-title-icon">
              <Coins size={15} />
            </div>
            <span>Payout Breakdown</span>
          </div>
        </div>

        <div className="payout-table-wrapper">
          <table className="payout-card-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Loan Amount</th>
                <th>Date</th>
                <th style={{ textAlign: 'center' }}>Total Payout</th>
                <th style={{ textAlign: 'center' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {commissionBreakdown.map((item) => (
                <tr key={item.id}>
                  <td className="customer-name-cell">{item.name}</td>
                  <td>{item.loanAmount}</td>
                  <td className="payout-date-cell">{item.date}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="payout-badge">{item.commission}</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button 
                      type="button"
                      onClick={() => setSelectedEmiCustomer(item)}
                      className="btn-emi-wise"
                    >
                      EMI Wise <ChevronRight size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="payout-card-footer">
          <div className="payout-footer-left">
            <CheckCircle2 size={15} className="payout-check-icon" />
            <span>Total Commission Earned</span>
          </div>
          <div className="payout-footer-amount">₹45,200</div>
        </div>
      </div>

      {/* COMMISSION MODAL (triggered from Top Card "View Payout Detail") */}
      {showCommissionModal && (
        <div className="commission-modal-overlay" onClick={() => setShowCommissionModal(false)}>
          <div className="commission-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="commission-modal-header">
              <div className="commission-modal-header-left">
                <div className="commission-modal-header-icon">
                  <Coins size={20} />
                </div>
                <div>
                  <h3>Payout Breakdown</h3>
                  <p>Per customer monthly payout details</p>
                </div>
              </div>
              <button className="close-modal-btn" onClick={() => setShowCommissionModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="commission-modal-body">
              <table className="commission-table">
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Loan Amount</th>
                    <th>Date</th>
                    <th style={{ textAlign: 'right' }}>Total Payout</th>
                    <th style={{ textAlign: 'center' }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {commissionBreakdown.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 600 }}>{item.name}</td>
                      <td>{item.loanAmount}</td>
                      <td style={{ color: '#64748b' }}>{item.date}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="commission-row-badge">{item.commission}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          onClick={() => setSelectedEmiCustomer(item)}
                          style={{
                            background: '#F0FDF4',
                            color: '#15803D',
                            border: '1px solid #bbf7d0',
                            borderRadius: '6px',
                            padding: '6px 14px',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            whiteSpace: 'nowrap',
                            minWidth: '95px',
                            transition: 'all 0.2s'
                          }}
                        >
                          EMI Wise <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="commission-modal-footer">
              <span className="commission-modal-footer-label">
                <CheckCircle2 size={16} />
                Total Commission Earned
              </span>
              <span className="commission-modal-footer-amount">₹45,200</span>
            </div>
          </div>
        </div>
      )}

      {/* MONTHLY EMI BREAKDOWN POPUP */}
      {selectedEmiCustomer && (
        <div className="commission-modal-overlay" style={{ zIndex: 1010 }} onClick={() => setSelectedEmiCustomer(null)}>
          <div className="commission-modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="commission-modal-header">
              <div className="commission-modal-header-left">
                <div className="commission-modal-header-icon">
                  <Calendar size={20} />
                </div>
                <div>
                  <h3>Monthly EMI Payouts</h3>
                  <p>{selectedEmiCustomer.name} - {selectedEmiCustomer.loanAmount}</p>
                </div>
              </div>
              <button className="close-modal-btn" onClick={() => setSelectedEmiCustomer(null)}>
                <X size={18} />
              </button>
            </div>
            
            <div className="commission-modal-body" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {selectedEmiCustomer.monthlyData.filter(m => m.status === 'Paid').length > 0 ? (
                  selectedEmiCustomer.monthlyData.filter(m => m.status === 'Paid').map((monthItem, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 16px',
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '6px',
                          backgroundColor: '#f1f5f9',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>
                            {monthItem.month.split(' ')[0]}
                          </span>
                          <span style={{ fontSize: '12px', color: '#0f172a', fontWeight: '700' }}>
                            {monthItem.month.split(' ')[1]}
                          </span>
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                            {monthItem.amount} <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>Earned</span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                            EMI Status: <span style={{ color: '#059669', fontWeight: '600' }}>Cleared On Time</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '12px', fontWeight: '700' }}>
                          <CheckCircle2 size={16} /> Paid to Agent
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '30px 20px', textAlign: 'center', color: '#64748b', fontSize: '13px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                    No commission earned yet. Customer has not paid any EMI on time.
                  </div>
                )}
              </div>
            </div>
            
            <div className="commission-modal-footer" style={{ justifyContent: 'center', padding: '16px 20px' }}>
              <button 
                onClick={() => setSelectedEmiCustomer(null)}
                style={{
                  background: '#fff',
                  color: '#059669',
                  border: '1px solid #059669',
                  borderRadius: '6px',
                  padding: '8px 24px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  width: '100%',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#f0fdf4';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#fff';
                }}
              >
                Back to Payout Breakdown
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Profile
