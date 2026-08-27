import {
  Shield,
  Building2,
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Briefcase,
  FileText,
  CreditCard,
  Landmark,
  HandCoins,
  ClipboardList,
  UserCheck,
  FileSignature,
  Banknote,
  ShieldCheck,
  ScanFace,
  Scale,
  MonitorSmartphone,
  ChevronRight,
  PhoneCall,
  MailOpen,
  MessageSquareWarning,
  CircleDollarSign,
  BadgeCheck,
  Hash,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import logoImg from '../../../../Core/Logo_img/Logo.png'
import './CompanyInfo.css'

function CompanyInfo() {
  const navigate = useNavigate()

  return (
    <div className="ci-page">
      {/* ========== TOP NAVBAR ========== */}
      <nav className="ci-navbar">
        <div className="ci-navbar-brand">
          <div className="ci-navbar-logo">
            <img src={logoImg} alt="Sivels Logo" className="ci-logo-img" />
          </div>
          <div className="ci-navbar-title">
            SIVELS
            <span>FINANCE</span>
          </div>
        </div>
        <button className="ci-back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={14} />
          Back to Application
        </button>
      </nav>

      {/* ========== MAIN CONTENT ========== */}
      <div className="ci-content">
        {/* Page Header */}
        <div className="ci-page-header">
          <h1>Company Details</h1>
          <p>Learn more about SIVELS FINANCE – your trusted financial partner.</p>
        </div>

        {/* ---- About Banner ---- */}
        <div className="ci-about-banner">
          <div className="ci-about-left">
            <div className="ci-about-logo">
              <div className="ci-about-logo-inner">
                <img src={logoImg} alt="Sivels Logo" className="ci-logo-img" />
              </div>
            </div>
            <div className="ci-about-text">
              <h2>SIVELS FINANCE</h2>
              <p>Your Trusted Financial Partner</p>
              <div className="ci-about-badge">
                <CheckCircle2 size={14} />
                Registered Financial Services Company
              </div>
            </div>
          </div>
          <div className="ci-about-right">
            <h3>About SIVELS FINANCE</h3>
            <p>
              SIVELS FINANCE provides digital lending and financial services
              through a secure and convenient online loan application platform.
            </p>
          </div>
        </div>

        {/* ---- Company Information + Our Services ---- */}
        <div className="ci-grid-2">
          {/* Company Information Card */}
          <div className="ci-card">
            <div className="ci-card-title">
              <Building2 size={16} className="ci-card-title-icon" />
              Company Information
            </div>
            <div className="ci-info-grid">
              {/* Left Column */}
              <div>
                <div className="ci-info-row">
                  <MapPin size={14} className="ci-info-icon" />
                  <span className="ci-info-label">Company Name</span>
                  <span className="ci-info-value">SIVELS FINANCE</span>
                </div>
                <div className="ci-info-row">
                  <FileText size={14} className="ci-info-icon" />
                  <span className="ci-info-label">Legal Name</span>
                  <span className="ci-info-value">SIVELS FINANCE PRIVATE LIMITED</span>
                </div>
                <div className="ci-info-row">
                  <Briefcase size={14} className="ci-info-icon" />
                  <span className="ci-info-label">Company Type</span>
                  <span className="ci-info-value">Private Limited</span>
                </div>
                <div className="ci-info-row">
                  <Hash size={14} className="ci-info-icon" />
                  <span className="ci-info-label">CIN</span>
                  <span className="ci-info-value">U65990TN2024PTC000000</span>
                </div>
                <div className="ci-info-row">
                  <MapPin size={14} className="ci-info-icon" />
                  <span className="ci-info-label">Registered Office</span>
                  <span className="ci-info-value">Chennai, Tamil Nadu, India</span>
                </div>
              </div>
              {/* Right Column */}
              <div>
                <div className="ci-info-row">
                  <Building2 size={14} className="ci-info-icon" />
                  <span className="ci-info-label">Corporate Office</span>
                  <span className="ci-info-value">Chennai, Tamil Nadu, India</span>
                </div>
                <div className="ci-info-row">
                  <Phone size={14} className="ci-info-icon" />
                  <span className="ci-info-label">Customer Support</span>
                  <span className="ci-info-value">+91 XXXXX XXXXX</span>
                </div>
                <div className="ci-info-row">
                  <Mail size={14} className="ci-info-icon" />
                  <span className="ci-info-label">Email</span>
                  <span className="ci-info-value">support@sivelsfinance.com</span>
                </div>
                <div className="ci-info-row">
                  <Globe size={14} className="ci-info-icon" />
                  <span className="ci-info-label">Website</span>
                  <span className="ci-info-value">www.sivelsfinance.com</span>
                </div>
              </div>
            </div>
          </div>

          {/* Our Services Card */}
          <div className="ci-card">
            <div className="ci-card-title">
              <Landmark size={16} className="ci-card-title-icon" />
              Our Services
            </div>
            <div className="ci-services-grid">
              <div className="ci-service-item">
                <div className="ci-service-icon">
                  <CircleDollarSign size={22} />
                </div>
                <span className="ci-service-label">Personal Loans</span>
              </div>
              <div className="ci-service-item">
                <div className="ci-service-icon">
                  <Briefcase size={22} />
                </div>
                <span className="ci-service-label">Business Loans</span>
              </div>
              <div className="ci-service-item">
                <div className="ci-service-icon">
                  <MonitorSmartphone size={22} />
                </div>
                <span className="ci-service-label">Digital Loan Services</span>
              </div>
              <div className="ci-service-item">
                <div className="ci-service-icon">
                  <HandCoins size={22} />
                </div>
                <span className="ci-service-label">Flexible Repayment Options</span>
              </div>
            </div>
          </div>
        </div>

        {/* ---- Our Loan Process + Trust & Security ---- */}
        <div className="ci-grid-2-wide">
          {/* Our Loan Process Card */}
          <div className="ci-card">
            <div className="ci-card-title">
              <ClipboardList size={16} className="ci-card-title-icon" />
              Our Loan Process
            </div>
            <div className="ci-process-steps">
              <div className="ci-step">
                <div className="ci-step-number">1</div>
                <span className="ci-step-label">Apply for Loan</span>
              </div>
              <div className="ci-step">
                <div className="ci-step-number">2</div>
                <span className="ci-step-label">Complete KYC</span>
              </div>
              <div className="ci-step">
                <div className="ci-step-number">3</div>
                <span className="ci-step-label">Credit Assessment</span>
              </div>
              <div className="ci-step">
                <div className="ci-step-number">4</div>
                <span className="ci-step-label">Loan Approval</span>
              </div>
              <div className="ci-step">
                <div className="ci-step-number">5</div>
                <span className="ci-step-label">Agreement & e-Sign</span>
              </div>
              <div className="ci-step">
                <div className="ci-step-number">6</div>
                <span className="ci-step-label">Disbursement</span>
              </div>
            </div>
          </div>

          {/* Trust & Security Card */}
          <div className="ci-card">
            <div className="ci-card-title">
              <ShieldCheck size={16} className="ci-card-title-icon" />
              Trust & Security
            </div>
            <div className="ci-trust-grid">
              <div className="ci-trust-item">
                <div className="ci-trust-icon">
                  <ShieldCheck size={22} />
                </div>
                <span className="ci-trust-label">Secure Data Protection</span>
              </div>
              <div className="ci-trust-item">
                <div className="ci-trust-icon">
                  <ScanFace size={22} />
                </div>
                <span className="ci-trust-label">KYC & Identity Verification</span>
              </div>
              <div className="ci-trust-item">
                <div className="ci-trust-icon">
                  <Scale size={22} />
                </div>
                <span className="ci-trust-label">Transparent Loan Terms</span>
              </div>
              <div className="ci-trust-item">
                <div className="ci-trust-icon">
                  <MonitorSmartphone size={22} />
                </div>
                <span className="ci-trust-label">Secure Digital Process</span>
              </div>
            </div>
          </div>
        </div>

        {/* ---- Important Documents + Need Help ---- */}
        <div className="ci-grid-2-equal">
          {/* Important Documents Card */}
          <div className="ci-card">
            <div className="ci-card-title">
              <FileText size={16} className="ci-card-title-icon" />
              Important Documents
            </div>
            <div className="ci-docs-grid">
              <div className="ci-doc-row">
                <FileText size={14} className="ci-doc-icon" />
                <span className="ci-doc-label">Terms & Conditions</span>
                <ChevronRight size={14} className="ci-doc-arrow" />
              </div>
              <div className="ci-doc-row">
                <FileText size={14} className="ci-doc-icon" />
                <span className="ci-doc-label">Grievance Redressal Policy</span>
                <ChevronRight size={14} className="ci-doc-arrow" />
              </div>
              <div className="ci-doc-row">
                <FileText size={14} className="ci-doc-icon" />
                <span className="ci-doc-label">Privacy Policy</span>
                <ChevronRight size={14} className="ci-doc-arrow" />
              </div>
              <div className="ci-doc-row">
                <FileText size={14} className="ci-doc-icon" />
                <span className="ci-doc-label">Loan Agreement</span>
                <ChevronRight size={14} className="ci-doc-arrow" />
              </div>
              <div className="ci-doc-row">
                <FileText size={14} className="ci-doc-icon" />
                <span className="ci-doc-label">Fair Practice Code</span>
                <ChevronRight size={14} className="ci-doc-arrow" />
              </div>
            </div>
          </div>

          {/* Need Help Card */}
          <div className="ci-card">
            <div className="ci-card-title">
              <PhoneCall size={16} className="ci-card-title-icon" />
              Need Help?
            </div>
            <div className="ci-help-grid">
              <div className="ci-help-item">
                <div className="ci-help-icon">
                  <PhoneCall size={18} />
                </div>
                <div className="ci-help-text">
                  <div className="ci-help-title">Call Customer Support</div>
                  <div className="ci-help-sub">+91 XXXXX XXXXX</div>
                </div>
                <ChevronRight size={16} className="ci-help-arrow" />
              </div>
              <div className="ci-help-item">
                <div className="ci-help-icon">
                  <MailOpen size={18} />
                </div>
                <div className="ci-help-text">
                  <div className="ci-help-title">Email Support</div>
                  <div className="ci-help-sub">support@sivelsfinance.com</div>
                </div>
                <ChevronRight size={16} className="ci-help-arrow" />
              </div>
              <div className="ci-help-item">
                <div className="ci-help-icon">
                  <MessageSquareWarning size={18} />
                </div>
                <div className="ci-help-text">
                  <div className="ci-help-title">Raise a Complaint</div>
                  <div className="ci-help-sub">We are here to help you</div>
                </div>
                <ChevronRight size={16} className="ci-help-arrow" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========== FOOTER ========== */}
      <footer className="ci-footer">
        
        <p>© 2026 SIVELS FINANCE. All Rights Reserved.</p>
      </footer>
    </div>
  )
}

export default CompanyInfo
