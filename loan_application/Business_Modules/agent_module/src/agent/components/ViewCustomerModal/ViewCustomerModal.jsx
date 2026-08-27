import { useState, useEffect } from 'react'
import {
  X,
  User,
  CreditCard,
  FileText,
  Eye,
  IdCard,
  Landmark,
} from 'lucide-react'
import { agentCustomerService } from '../../../../../../Core/src/services/agentCustomerService'
import { masterService } from '../../../../../../Core/src/services/masterService'
import './ViewCustomerModal.css'

function ViewCustomerModal({ customer, onClose }) {
  const [modalImage, setModalImage] = useState(null)
  const [documents, setDocuments] = useState([])
  const [loadingDocs, setLoadingDocs] = useState(true)
  
  // Masters for name lookup if backend only returned IDs
  const [loanPurposes, setLoanPurposes] = useState([])
  const [employmentTypes, setEmploymentTypes] = useState([])
  const [documentTypes, setDocumentTypes] = useState([])

  useEffect(() => {
    const loadData = async () => {
      try {
        const [docsRes, purpRes, empRes, docTypeRes] = await Promise.all([
          agentCustomerService.getDocumentsByCustomerId(customer.agentCustomerId || customer.id).catch(() => []),
          masterService.getLoanPurposes().catch(() => []),
          masterService.getEmploymentTypes().catch(() => []),
          masterService.getDocumentTypes().catch(() => [])
        ])

        const extractArray = (res) => {
          if (Array.isArray(res)) return res
          if (res && typeof res === 'object') {
             if (Array.isArray(res.data)) return res.data
             if (Array.isArray(res.items)) return res.items
             if (Array.isArray(res.result)) return res.result
             if (Array.isArray(res.list)) return res.list
          }
          return []
        }

        setDocuments(extractArray(docsRes))
        setLoanPurposes(extractArray(purpRes))
        setEmploymentTypes(extractArray(empRes))
        setDocumentTypes(extractArray(docTypeRes))
      } catch (err) {
        console.error("Failed to load customer details", err)
      } finally {
        setLoadingDocs(false)
      }
    }
    
    if (customer) {
      loadData()
    }
  }, [customer])

  if (!customer) return null

  const customerName = customer.fullName || 'Unknown Customer'
  const initial = customerName.charAt(0).toUpperCase()
  const mobile = customer.mobileNumber || 'N/A'
  const email = customer.email || 'N/A'
  
  const formatDate = (dateString) => {
    if (!dateString) return '-'
    const d = new Date(dateString)
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true
    })
  }
  
  const submittedOn = formatDate(customer.createdAt)
  const status = customer.status || 'Draft'
  
  // Resolve Names
  let loanPurposeName = customer.loanPurposeName || customer.productName
  if (!loanPurposeName && customer.loanPurposeId) {
    const p = loanPurposes.find(x => Number(x.loanPurposeId || x.id) === Number(customer.loanPurposeId))
    if (p) loanPurposeName = p.productName || p.name
  }
  
  let employmentTypeName = customer.employmentTypeName
  if (!employmentTypeName && customer.employmentTypeId) {
    const e = employmentTypes.find(x => Number(x.employmentTypeId || x.id) === Number(customer.employmentTypeId))
    if (e) employmentTypeName = e.employmentTypeName || e.name
  }
  
  const loanAmount = customer.expectedLoanAmount 
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(customer.expectedLoanAmount)
    : 'N/A'
    
  const remarks = customer.remarks || 'No remarks provided.'

  const getDocumentIcon = (name) => {
    const n = (name || '').toLowerCase()
    if (n.includes('image') || n.includes('photo')) return User
    if (n.includes('pan') || n.includes('aadhaar') || n.includes('id')) return IdCard
    if (n.includes('bank') || n.includes('passbook')) return Landmark
    return FileText
  }

  const getDocumentName = (docTypeId, fallbackName) => {
    if (fallbackName) return fallbackName
    const type = documentTypes.find(t => Number(t.documentTypeId || t.id) === Number(docTypeId))
    return type ? (type.documentTypeName || type.name) : 'Document'
  }

  const handleViewDocument = async (doc) => {
    try {
      const blob = await agentCustomerService.downloadDocument(doc.agentCustomerDocumentId || doc.id)
      
      const fileName = doc.fileName || doc.documentName || ''
      let mimeType = 'application/octet-stream'
      if (/\.(jpg|jpeg)$/i.test(fileName)) mimeType = 'image/jpeg'
      else if (/\.png$/i.test(fileName)) mimeType = 'image/png'
      else if (/\.pdf$/i.test(fileName)) mimeType = 'application/pdf'
      else if (/\.gif$/i.test(fileName)) mimeType = 'image/gif'

      const typedBlob = new Blob([blob], { type: mimeType })
      const url = window.URL.createObjectURL(typedBlob)
      
      const isImage = mimeType.startsWith('image/')
      
      if (isImage) {
        setModalImage({
          src: url,
          title: getDocumentName(doc.documentTypeId, doc.documentName)
        })
      } else {
        window.open(url, '_blank')
        // Automatically revoke the URL after the new tab has had time to load it
        setTimeout(() => window.URL.revokeObjectURL(url), 10000)
      }
    } catch (err) {
      console.error("Failed to view document", err)
      if (!err.response) {
        alert("Unable to connect to document server.")
      } else if (err.response.status === 404) {
        alert("Document file not found.")
      } else if (err.response.status >= 500) {
        alert("Unable to retrieve document from server.")
      } else {
        alert("Unable to view document.")
      }
    }
  }

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
              <div className="drawer-avatar" style={{ backgroundColor: initial.match(/[A-M]/) ? '#f0fdf4' : '#fef2f2', color: initial.match(/[A-M]/) ? '#16a34a' : '#ef4444' }}>{initial}</div>
              <div className="drawer-title-text">
                <h2>{customerName}</h2>
                <span>ID: {customer.agentCustomerId || customer.id}</span>
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
                  <span className="detail-label">Employment Type</span>
                  <span className="detail-value">{employmentTypeName || 'N/A'}</span>
                </div>
                <div className="drawer-detail-item">
                  <span className="detail-label">Submitted Date & Time</span>
                  <span className="detail-value">{submittedOn}</span>
                </div>
                <div className="drawer-detail-item">
                  <span className="detail-label">Application Status</span>
                  <span className="detail-value" style={{ color: '#D97706', fontWeight: 500 }}>
                    {status}
                  </span>
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
                  <span className="detail-value">{loanPurposeName || 'N/A'}</span>
                </div>
                <div className="drawer-detail-item">
                  <span className="detail-label">Expected Loan Amount</span>
                  <span className="detail-value detail-value--amount">
                    {loanAmount}
                  </span>
                </div>
              </div>
              <div className="drawer-detail-item" style={{ marginTop: '12px' }}>
                <span className="detail-label">Remarks / Notes</span>
                <span className="detail-value">{remarks}</span>
              </div>
            </div>

            {/* Section 3: Uploaded Documents */}
            <div className="drawer-section-card">
              <div className="drawer-section-title">
                <FileText size={16} /> Uploaded Documents ({documents.length})
              </div>
              <div className="drawer-documents-list">
                {loadingDocs ? (
                  <div style={{ color: '#64748b', fontSize: '13px' }}>Loading documents...</div>
                ) : documents.length === 0 ? (
                  <div style={{ color: '#64748b', fontSize: '13px' }}>No documents uploaded.</div>
                ) : (
                  documents.map((doc, idx) => {
                    const docName = getDocumentName(doc.documentTypeId, doc.documentName)
                    const IconComp = getDocumentIcon(docName)
                    return (
                      <div className="drawer-doc-card" key={doc.agentCustomerDocumentId || doc.id || idx}>
                        <div className="drawer-doc-info">
                          <div className="drawer-doc-icon">
                            <IconComp size={18} />
                          </div>
                          <div>
                            <div className="drawer-doc-title">{docName}</div>
                            <div className="drawer-doc-status">{doc.fileName || 'Uploaded'}</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn-doc-view"
                          onClick={() => handleViewDocument(doc)}
                        >
                          <Eye size={14} /> View
                        </button>
                      </div>
                    )
                  })
                )}
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
        <div className="image-modal-backdrop" onClick={() => {
          URL.revokeObjectURL(modalImage.src)
          setModalImage(null)
        }}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="image-modal-header">
              <span className="image-modal-title">{modalImage.title}</span>
              <button
                type="button"
                className="image-modal-close"
                onClick={() => {
                  URL.revokeObjectURL(modalImage.src)
                  setModalImage(null)
                }}
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
