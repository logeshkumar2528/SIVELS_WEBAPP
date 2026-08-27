import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Check,
  User,
  Phone,
  Calendar,
  FileText,
  Clock,
  Info,
  List,
  Plus,
} from 'lucide-react'
import './CustomerSubmitted.css'

function CustomerSubmitted({
  customerName = 'Ramesh Kumar',
  mobileNumber = '98765 43210',
  submissionDate = '05 Jun 2025, 10:45 AM',
  referenceId = 'REF2506051045',
  onAddAnother,
  onGoToHistory,
  autoCloseSeconds = 5,
}) {
  const navigate = useNavigate()
  const [timeLeft, setTimeLeft] = useState(autoCloseSeconds)

  // 5-second auto countdown
  useEffect(() => {
    if (timeLeft <= 0) {
      if (onGoToHistory) {
        onGoToHistory()
      } else {
        navigate('/Agent/submission-history')
      }
      return
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, navigate, onGoToHistory])

  const handleAddAnotherClick = () => {
    if (onAddAnother) {
      onAddAnother()
    } else {
      navigate('/Agent/add-customer')
    }
  }

  const handleHistoryClick = () => {
    if (onGoToHistory) {
      onGoToHistory()
    } else {
      navigate('/Agent/submission-history')
    }
  }

  const progressPercent = (timeLeft / autoCloseSeconds) * 100

  return (
    <div className="customer-submitted-overlay">
      <div className="customer-submitted-card" role="dialog" aria-modal="true">
        {/* Success Banner Area */}
        <div className="success-banner-area">
          <div className="confetti-decorations">
            <span className="confetti-dot dot-1" />
            <span className="confetti-dot dot-2" />
            <span className="confetti-dot dot-3" />
            <span className="confetti-dot dot-4" />
            <span className="confetti-dot dot-5" />
            <div className="success-check-circle">
              <Check size={38} strokeWidth={3} />
            </div>
          </div>
          <h2 className="success-title">Customer Submitted Successfully!</h2>
          <p className="success-subtitle">
            The customer details and documents have been submitted to RM.
          </p>
        </div>

        {/* Submission Details Card */}
        <div className="details-box">
          <div className="details-row-top">
            <div className="details-item">
              <div className="details-item-icon details-item-icon--user">
                <User size={18} strokeWidth={2} />
              </div>
              <div className="details-item-content">
                <span className="details-label">Customer Name</span>
                <span className="details-value">{customerName}</span>
              </div>
            </div>

            <div className="details-item">
              <div className="details-item-icon details-item-icon--phone">
                <Phone size={18} strokeWidth={2} />
              </div>
              <div className="details-item-content">
                <span className="details-label">Mobile Number</span>
                <span className="details-value">{mobileNumber}</span>
              </div>
            </div>

            <div className="details-item">
              <div className="details-item-icon details-item-icon--date">
                <Calendar size={18} strokeWidth={2} />
              </div>
              <div className="details-item-content">
                <span className="details-label">Submission Date & Time</span>
                <span className="details-value">{submissionDate}</span>
              </div>
            </div>
          </div>

          <div className="details-row-bottom">
            <div className="reference-id-col">
              <div className="ref-icon-badge">
                <FileText size={22} strokeWidth={2} />
              </div>
              <div>
                <div className="details-label">Reference ID</div>
                <div className="reference-id-value">{referenceId}</div>
              </div>
            </div>

            <div className="status-col">
              <div className="status-icon-badge">
                <Clock size={20} strokeWidth={2} />
              </div>
              <div>
                <div className="details-label">Status</div>
                <div className="status-text-value">Pending RM Review</div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Alert Box */}
        <div className="info-alert-banner">
          <Info size={18} className="info-alert-icon" />
          <div className="info-alert-text">
            Your application has been sent to RM. You will be notified once RM reviews the application. You can track the status in{' '}
            <Link to="/Agent/submission-history">Submission History</Link>.
          </div>
        </div>

        {/* 5-Second Countdown Timer Bar */}
        <div className="countdown-timer-bar">
          <span className="timer-text">
            Auto-navigating to Submission History in {timeLeft}s...
          </span>
          <div className="timer-progress-track">
            <div
              className="timer-progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="submitted-actions">
          <button
            type="button"
            className="btn-history"
            onClick={handleHistoryClick}
          >
            <List size={16} strokeWidth={2} /> Go to Submission History
          </button>
          <button
            type="button"
            className="btn-new-customer"
            onClick={handleAddAnotherClick}
          >
            <Plus size={16} strokeWidth={2.2} /> Add New Customer
          </button>
        </div>
      </div>
    </div>
  )
}

export default CustomerSubmitted
