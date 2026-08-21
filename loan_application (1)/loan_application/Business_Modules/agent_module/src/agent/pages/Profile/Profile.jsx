import { useState, Fragment } from 'react'
import {
  Camera,
  Phone,
  Mail,
  Calendar,
  Shield,
  User,
  Lock,
  Clock,
  Monitor,
  Edit2,
  ChevronRight,
  CheckCircle2,
  IdCard,
  Building2,
  Users,
  Coins,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import './Profile.css'

function Profile() {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [showCommissionModal, setShowCommissionModal] = useState(false)
  const [expandedRowId, setExpandedRowId] = useState(null)
  const [selectedEmiCustomer, setSelectedEmiCustomer] = useState(null)

  // Dummy data for commission breakdown
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

  const toggleRow = (id) => {
    setExpandedRowId(expandedRowId === id ? null : id)
  }

  return (
    <div className="profile-page">
      {/* TOP CARD: PROFILE OVERVIEW */}
      <div className="profile-card profile-overview-card">
        {/* Left: Avatar & Change Photo */}
        <div className="profile-avatar-col">
          <div className="profile-avatar-img">
            <User size={64} style={{ color: '#059669' }} />
          </div>
          <button type="button" className="btn-change-photo">
            <Camera size={14} /> Change Photo
          </button>
        </div>

        {/* Middle: Name, Role, ID & Branch Pills */}
        <div className="profile-main-info">
          <div className="profile-name-block">
            <h1>Thiru</h1>
            <p>Sales Agent</p>
          </div>

          <div className="profile-pills-row">
            <div className="profile-pill">
              <div className="profile-pill-icon">
                <IdCard size={18} />
              </div>
              <div>
                <div className="profile-pill-label">Agent ID</div>
                <div className="profile-pill-value">AGT00021</div>
              </div>
            </div>

            <div className="profile-pill profile-pill--blue">
              <div className="profile-pill-icon">
                <Building2 size={18} />
              </div>
              <div>
                <div className="profile-pill-label">Branch</div>
                <div className="profile-pill-value">Chennai</div>
              </div>
            </div>

            <div className="profile-pill profile-pill--purple">
              <div className="profile-pill-icon">
                <Users size={18} />
              </div>
              <div>
                <div className="profile-pill-label">Total Customers</div>
                <div className="profile-pill-value">124</div>
              </div>
            </div>

            <div className="profile-pill profile-pill--orange">
              <div className="profile-pill-icon">
                <Coins size={18} />
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div className="profile-pill-label">Total Commission</div>
                  <div className="profile-pill-value">₹45,200</div>
                </div>
                <button 
                  onClick={() => setShowCommissionModal(true)}
                  style={{
                    background: '#fff',
                    color: '#ea580c',
                    border: '1px solid #ea580c',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '10px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    whiteSpace: 'nowrap',
                    marginLeft: '8px',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#ea580c';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = '#fff';
                    e.currentTarget.style.color = '#ea580c';
                  }}
                >
                  View Payout Detail
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Meta List */}
        <div className="profile-meta-list">
          <div className="profile-meta-item">
            <Phone size={16} className="meta-icon" />
            <div className="meta-text">
              <span className="meta-label">Mobile Number</span>
              <span className="meta-value">98765 43210</span>
            </div>
          </div>

          <div className="profile-meta-item">
            <Mail size={16} className="meta-icon" />
            <div className="meta-text">
              <span className="meta-label">Email Address</span>
              <span className="meta-value">thiru.agent@sivelsfinance.com</span>
            </div>
          </div>

          <div className="profile-meta-item">
            <Calendar size={16} className="meta-icon" />
            <div className="meta-text">
              <span className="meta-label">Date Joined</span>
              <span className="meta-value">12 Feb 2024</span>
            </div>
          </div>

          <div className="profile-meta-item">
            <Shield size={16} className="meta-icon" />
            <div className="meta-text">
              <span className="meta-label">Role</span>
              <span className="meta-value">Sales Agent</span>
            </div>
          </div>
        </div>
      </div>

      {/* MIDDLE ROW: 2 EQUAL CARDS */}
      <div className="profile-middle-row">
        {/* Card 1: Personal Information */}
        <div className="profile-card">
          <div className="section-card-header">
            <div className="section-card-title">
              <div className="section-card-title-icon">
                <User size={16} />
              </div>
              Personal Information
            </div>
            <button type="button" className="btn-edit-info">
              <Edit2 size={13} /> Edit
            </button>
          </div>

          <div className="info-list-table">
            <div className="info-row">
              <span className="info-row-key">Full Name</span>
              <span className="info-row-value">Thiru</span>
            </div>
            <div className="info-row">
              <span className="info-row-key">Date of Birth</span>
              <span className="info-row-value">15 Aug 1995</span>
            </div>
            <div className="info-row">
              <span className="info-row-key">Gender</span>
              <span className="info-row-value">Male</span>
            </div>
            <div className="info-row">
              <span className="info-row-key">Address</span>
              <span className="info-row-value">
                No. 45, 3rd Cross Street, Vadapalani, Chennai - 600026
              </span>
            </div>
            <div className="info-row">
              <span className="info-row-key">State</span>
              <span className="info-row-value">Tamil Nadu</span>
            </div>
            <div className="info-row">
              <span className="info-row-key">Pincode</span>
              <span className="info-row-value">600026</span>
            </div>
          </div>
        </div>

        {/* Card 2: Account & Security */}
        <div className="profile-card">
          <div className="section-card-header">
            <div className="section-card-title">
              <div className="section-card-title-icon">
                <Lock size={16} />
              </div>
              Account & Security
            </div>
          </div>

          <div className="security-menu-list">
            {/* Item 1: Change Password */}
            <div className="security-menu-item">
              <div className="security-item-left">
                <Lock size={18} className="security-item-icon" />
                <div className="security-item-text">
                  <span className="security-item-title">Change Password</span>
                  <span className="security-item-subtitle">
                    Update your account password
                  </span>
                </div>
              </div>
              <ChevronRight size={18} className="security-chevron" />
            </div>

            {/* Item 2: Login History */}
            <div className="security-menu-item">
              <div className="security-item-left">
                <Clock size={18} className="security-item-icon" />
                <div className="security-item-text">
                  <span className="security-item-title">Login History</span>
                  <span className="security-item-subtitle">
                    View your recent login activity
                  </span>
                </div>
              </div>
              <ChevronRight size={18} className="security-chevron" />
            </div>

            {/* Item 3: Devices */}
            <div className="security-menu-item">
              <div className="security-item-left">
                <Monitor size={18} className="security-item-icon" />
                <div className="security-item-text">
                  <span className="security-item-title">Devices</span>
                  <span className="security-item-subtitle">
                    Manage devices where you are logged in
                  </span>
                </div>
              </div>
              <ChevronRight size={18} className="security-chevron" />
            </div>

            {/* Item 4: Two Factor Authentication */}
            <div className="security-menu-item">
              <div className="security-item-left">
                <Shield size={18} className="security-item-icon" />
                <div className="security-item-text">
                  <span className="security-item-title">
                    Two Factor Authentication
                  </span>
                  <span className="security-item-subtitle">
                    Add extra security to your account
                  </span>
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={twoFactorEnabled}
                  onChange={(e) => setTwoFactorEnabled(e.target.checked)}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM BANNER: ACCOUNT IS SECURE */}
      <div className="security-banner">
        <div className="security-banner-left">
          <div className="banner-check-badge">
            <CheckCircle2 size={20} strokeWidth={2.2} />
          </div>
          <div className="banner-text">
            <h4>Your Account is Secure</h4>
            <p>We use industry standard security to protect your data and account.</p>
          </div>
        </div>
        <Shield size={48} className="banner-watermark-shield" />
      </div>

      {/* COMMISSION MODAL */}
      {showCommissionModal && (
        <div className="commission-modal-overlay" onClick={() => setShowCommissionModal(false)}>
          <div className="commission-modal-content" onClick={(e) => e.stopPropagation()}>

            {/* Modal Header */}
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

            {/* Modal Body */}
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

            {/* Modal Footer */}
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
