import { useState } from 'react'
import {
  X,
  User,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  FileText,
  Eye,
  IdCard,
  Landmark,
  CheckCircle2,
} from 'lucide-react'
import './ViewCustomerModal.css'

function ViewCustomerModal({ customer, onClose }) {
  const [modalImage, setModalImage] = useState(null)

  if (!customer) return null

  const customerName = customer.customerName || customer.name || 'Ramesh Kumar'
  const initial = customer.initial || customerName.charAt(0).toUpperCase()
  const mobile = customer.mobileNumber || customer.mobile || '98765 43210'
  const email = customer.email || `${customerName.toLowerCase().replace(/\s+/g, '.')}@example.com`
  const refId = customer.referenceId || customer.id || 'REF2506051045'
  const submittedOn = customer.submittedOn || customer.dueDate || '05 Jun 2025, 10:45 AM'
  const status = customer.status || 'Pending RM Review'
  const loanPurpose = customer.loanPurpose || 'Personal Loan'
  const loanAmount = customer.loanAmount || customer.expectedAmount || '₹ 2,00,000'
  const remarks = customer.remarks || 'Customer requested urgent loan processing for business/personal requirement.'

  return (
    <>
      <div className="customer-modal-backdrop" onClick={onClose}>
        <div
          className="customer-modal-drawer"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {/* Header Bar */}
          <div className="drawer-header">
            <div className="drawer-header-info">
              <div className="drawer-avatar">{initial}</div>
              <div className="drawer-title-text">
                <h2>{customerName}</h2>
                <span>Ref ID: {refId}</span>
              </div>
            </div>
            <button
              type="button"
              className="drawer-close-btn"
              onClick={onClose}
              aria-label="Close details"
            >
              <X size={18} />
            </button>
          </div>

          {/* Drawer Scrollable Content Body */}
          <div className="drawer-body">
            {/* Section 1: Basic Details */}
            <div className="drawer-section-card">
              <div className="drawer-section-title">
                <User size={16} /> Basic Information
              </div>
              <div className="drawer-grid-2">
                <div className="drawer-detail-item">
                  <span className="detail-label">Full Name</span>
                  <span className="detail-value">{customerName}</span>
                </div>
                <div className="drawer-detail-item">
                  <span className="detail-label">Mobile Number</span>
                  <span className="detail-value">{mobile}</span>
                </div>
                <div className="drawer-detail-item">
                  <span className="detail-label">Email Address</span>
                  <span className="detail-value">{email}</span>
                </div>
                <div className="drawer-detail-item">
                  <span className="detail-label">Submitted Date & Time</span>
                  <span className="detail-value">{submittedOn}</span>
                </div>
                <div className="drawer-detail-item">
                  <span className="detail-label">Application Status</span>
                  <span className="detail-value" style={{ color: '#D97706' }}>
                    {status}
                  </span>
                </div>
                <div className="drawer-detail-item">
                  <span className="detail-label">Reference ID</span>
                  <span className="detail-value">{refId}</span>
                </div>
              </div>
            </div>

            {/* Section 2: Loan Requirements */}
            <div className="drawer-section-card">
              <div className="drawer-section-title">
                <CreditCard size={16} /> Loan Requirement
              </div>
              <div className="drawer-grid-2">
                <div className="drawer-detail-item">
                  <span className="detail-label">Loan Purpose</span>
                  <span className="detail-value">{loanPurpose}</span>
                </div>
                <div className="drawer-detail-item">
                  <span className="detail-label">Expected Loan Amount</span>
                  <span className="detail-value detail-value--amount">
                    {loanAmount.startsWith('₹') ? loanAmount : `₹ ${loanAmount}`}
                  </span>
                </div>
              </div>
              <div className="drawer-detail-item" style={{ marginTop: '4px' }}>
                <span className="detail-label">Remarks / Notes</span>
                <span className="detail-value">{remarks}</span>
              </div>
            </div>

            {/* Section 3: Uploaded Documents */}
            <div className="drawer-section-card">
              <div className="drawer-section-title">
                <FileText size={16} /> Uploaded Documents (3)
              </div>
              <div className="drawer-documents-list">
                {/* Document 1: PAN Card */}
                <div className="drawer-doc-card">
                  <div className="drawer-doc-info">
                    <div className="drawer-doc-icon">
                      <IdCard size={18} />
                    </div>
                    <div>
                      <div className="drawer-doc-title">PAN Card</div>
                      <div className="drawer-doc-status">Verified Document • JPG</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-doc-view"
                    onClick={() =>
                      setModalImage({
                        src: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop',
                        title: `${customerName} - PAN Card`,
                      })
                    }
                  >
                    <Eye size={14} /> View
                  </button>
                </div>

                {/* Document 2: Aadhaar Card */}
                <div className="drawer-doc-card">
                  <div className="drawer-doc-info">
                    <div className="drawer-doc-icon">
                      <User size={18} />
                    </div>
                    <div>
                      <div className="drawer-doc-title">Aadhaar Card</div>
                      <div className="drawer-doc-status">Verified Document • PNG</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-doc-view"
                    onClick={() =>
                      setModalImage({
                        src: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=600&auto=format&fit=crop',
                        title: `${customerName} - Aadhaar Card`,
                      })
                    }
                  >
                    <Eye size={14} /> View
                  </button>
                </div>

                {/* Document 3: Bank Passbook */}
                <div className="drawer-doc-card">
                  <div className="drawer-doc-info">
                    <div className="drawer-doc-icon">
                      <Landmark size={18} />
                    </div>
                    <div>
                      <div className="drawer-doc-title">Bank Passbook</div>
                      <div className="drawer-doc-status">Uploaded Document • PDF</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-doc-view"
                    onClick={() =>
                      setModalImage({
                        src: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop',
                        title: `${customerName} - Bank Passbook`,
                      })
                    }
                  >
                    <Eye size={14} /> View
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="drawer-footer">
            <button type="button" className="btn-close-drawer" onClick={onClose}>
              Close Details
            </button>
          </div>
        </div>
      </div>

      {/* FULL DOCUMENT IMAGE MODAL PREVIEW */}
      {modalImage && (
        <div className="image-modal-backdrop" onClick={() => setModalImage(null)}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="image-modal-header">
              <span className="image-modal-title">{modalImage.title}</span>
              <button
                type="button"
                className="image-modal-close"
                onClick={() => setModalImage(null)}
              >
                <X size={18} />
              </button>
            </div>
            <img src={modalImage.src} alt="Document Preview" className="image-modal-img" />
          </div>
        </div>
      )}
    </>
  )
}

export default ViewCustomerModal
