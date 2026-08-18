import { useState } from 'react'
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
} from 'lucide-react'
import './Profile.css'

function Profile() {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)

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
              <div>
                <div className="profile-pill-label">Total Commission</div>
                <div className="profile-pill-value">₹45,200</div>
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
    </div>
  )
}

export default Profile
