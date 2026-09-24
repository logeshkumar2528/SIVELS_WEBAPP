import { useState, useEffect, useMemo } from 'react'
import {
  X,
  User,
  CreditCard,
  FileText,
  Eye,
  IdCard,
  Landmark,
  Clock,
} from 'lucide-react'
import { agentCustomerService } from '../../../../../../Core/src/services/agentCustomerService'
import { masterService } from '../../../../../../Core/src/services/masterService'
import { resolveDocumentTypeId } from '../../../../../../Core/src/utils/documentTypeHelper'
import './ViewCustomerModal.css'

function ViewCustomerModal({ customer, onClose }) {
  const [modalImage, setModalImage] = useState(null)
  const [documents, setDocuments] = useState([])
  const [activeDocTab, setActiveDocTab] = useState('original')
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [viewError, setViewError] = useState('')
  
  // Masters for name lookup if backend only returned IDs
  const [employmentTypes, setEmploymentTypes] = useState([])
  const [documentTypes, setDocumentTypes] = useState([])

  // Group and sort documents chronologically into Original (V1) and Updated (V2+)
  const { originalDocs, updatedDocs } = useMemo(() => {
    const active = documents.filter((d) => d && d.isActive !== false)

    const grouped = {}
    active.forEach((doc) => {
      const key = doc.documentTypeId
        ? String(doc.documentTypeId)
        : String(doc.documentTypeName || doc.documentName || 'other').trim().toLowerCase()
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(doc)
    })

    const original = []
    const updated = []

    Object.keys(grouped).forEach((key) => {
      const list = grouped[key]
      list.sort((a, b) => {
        // Original docs first, then by time
        if (a.isRejectionDoc && !b.isRejectionDoc) return 1;
        if (!a.isRejectionDoc && b.isRejectionDoc) return -1;
        const timeA = new Date(a.createdAt || 0).getTime()
        const timeB = new Date(b.createdAt || 0).getTime()
        if (timeA !== timeB) return timeA - timeB
        return (Number(a.agentCustomerDocumentId || a.id) || 0) - (Number(b.agentCustomerDocumentId || b.id) || 0)
      })

      list.forEach((doc, index) => {
        const isOrig = doc.isOriginal !== false && !doc.isRejectionDoc && index === 0
        const isLat = index === list.length - 1
        const versionLabel = isOrig ? 'Original Document' : (isLat ? 'Latest Updated' : 'Updated Document')
        const item = {
          ...doc,
          isOriginal: isOrig,
          isLatest: isLat,
          versionLabel,
          versionDisplay: versionLabel,
        }

        if (isOrig) {
          original.push(item)
        } else {
          updated.push(item)
        }
      })
    })

    return { originalDocs: original, updatedDocs: updated }
  }, [documents])

  useEffect(() => {
    const loadData = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';
        const targetCustId = customer.agentCustomerId || customer.id;
        const appProdId = customer.applicationProductDetailsId || customer.ApplicationProductDetailsId || null;

        const token = localStorage.getItem('authToken');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const [docsRes, empRes, docTypeRes, rejectionsRes] = await Promise.all([
          agentCustomerService.getDocumentsByCustomerId(targetCustId).catch(() => []),
          masterService.getEmploymentTypes().catch(() => []),
          masterService.getDocumentTypes().catch(() => []),
          fetch(`${API_BASE}/BackOfficeDocumentRejection`, { headers }).then(r => r.ok ? r.json() : []).catch(() => [])
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

        const rawDocs = extractArray(docsRes);
        const allRejections = extractArray(rejectionsRes);
        const docTypeList = extractArray(docTypeRes);

        // Resolve a rejection record onto a numeric DocumentTypeId from the active
        // DocumentTypeMaster. BackOfficeDocumentRejection identifies the document by
        // `rejectedDocumentType` code and usually carries no documentTypeId; without
        // this, a replacement groups separately from its original and is mis-versioned.
        const resolveRejectionDocTypeId = (rej) => {
          const explicit = Number(rej?.documentTypeId ?? rej?.DocumentTypeId);
          if (Number.isFinite(explicit) && explicit > 0) return explicit;

          const rejType = String(rej?.rejectedDocumentType ?? rej?.RejectedDocumentType ?? '').trim();
          if (!rejType) return null;

          return (
            resolveDocumentTypeId(docTypeList, rejType) ||
            resolveDocumentTypeId(docTypeList, rejType.replace(/^(CO_?APPLICANT|APPLICANT)_/i, '')) ||
            null
          );
        };

        // Filter rejections for this customer / application.
        // This drawer shows the Main Applicant only, so replacement history is
        // restricted to applicantSequence 0. Co-Applicant sequences (1, 2, ...) and
        // CO_APPLICANT_* document codes must not leak into this list.
        const matchingRejections = allRejections.filter((r) => {
          if (!r || r.isActive === false || r.IsActive === false) return false;

          const matchCust = targetCustId && String(r.agentCustomerId ?? r.AgentCustomerId ?? '') === String(targetCustId);
          const matchApp = appProdId && String(r.applicationProductDetailsId ?? r.ApplicationProductDetailsId ?? '') === String(appProdId);
          if (!(matchCust || matchApp)) return false;

          const rawSeq = r.applicantSequence ?? r.ApplicantSequence;
          const rSeq = rawSeq !== undefined && rawSeq !== null ? Number(rawSeq) : null;
          if (rSeq !== null && rSeq !== 0) return false;

          const rType = String(r.rejectedDocumentType ?? r.RejectedDocumentType ?? '').toUpperCase();
          if (rType.startsWith('CO_APPLICANT') || rType.startsWith('COAPPLICANT')) return false;

          const cleanCurr = String(r.currentDocumentPath ?? r.CurrentDocumentPath ?? '').trim();
          const cleanOrig = String(r.originalDocumentPath ?? r.OriginalDocumentPath ?? '').trim();
          return Boolean(cleanCurr && cleanCurr.toLowerCase() !== cleanOrig.toLowerCase());
        });

        // Reconstruct updated rejection documents.
        // Ordered oldest-first so successive replacements of the same document receive
        // ascending version numbers (V2, V3, ...) during grouping.
        const seenRejKeys = new Set();
        const updatedRejDocs = [];

        const orderedRejections = [...matchingRejections].sort((a, b) => {
          const timeA = new Date(a.resubmittedAt ?? a.ResubmittedAt ?? a.rejectedAt ?? a.RejectedAt ?? a.createdAt ?? a.CreatedAt ?? 0).getTime();
          const timeB = new Date(b.resubmittedAt ?? b.ResubmittedAt ?? b.rejectedAt ?? b.RejectedAt ?? b.createdAt ?? b.CreatedAt ?? 0).getTime();
          if (timeA !== timeB) return timeA - timeB;
          return (
            (Number(a.backOfficeDocumentRejectionId ?? a.BackOfficeDocumentRejectionId) || 0) -
            (Number(b.backOfficeDocumentRejectionId ?? b.BackOfficeDocumentRejectionId) || 0)
          );
        });

        orderedRejections.forEach((rej) => {
          const cleanCurr = String(rej.currentDocumentPath ?? rej.CurrentDocumentPath ?? '').trim().replace(/\\/g, '/').replace(/^\/+/, '');
          const cleanOrig = String(rej.originalDocumentPath ?? rej.OriginalDocumentPath ?? '').trim().replace(/\\/g, '/').replace(/^\/+/, '');
          if (!cleanCurr || (cleanOrig && cleanCurr.toLowerCase() === cleanOrig.toLowerCase())) return;

          // Resolve onto the same DocumentTypeMaster row as the original so both share
          // a grouping key and the replacement is classified and versioned correctly.
          const resolvedRejTypeId = resolveRejectionDocTypeId(rej);
          const rejDocType = rej.rejectedDocumentType ?? rej.RejectedDocumentType ?? '';

          // Dedupe on stable backend fields: application + sequence + document type + stored path.
          const dedupeKey = `${appProdId || targetCustId}:0:${
            resolvedRejTypeId || rejDocType
          }:${cleanCurr.toLowerCase()}`;
          if (seenRejKeys.has(dedupeKey)) return;
          seenRejKeys.add(dedupeKey);

          const fileName = cleanCurr.split('/').pop() || rejDocType || 'Updated_Document';
          const ext = fileName.split('.').pop()?.toLowerCase();
          const isPdf = ext === 'pdf';
          const stableId = `rej_${rej.backOfficeDocumentRejectionId ?? rej.BackOfficeDocumentRejectionId ?? cleanCurr}`;

          // If currentDocumentPath points to an AgentCustomer document, resolve matching agentCustomerDocumentId from rawDocs
          let matchedAgentDocId = null;
          const isAgentPath = cleanCurr.startsWith('UploadedFiles/AgentCustomers/') || cleanCurr.startsWith('AgentCustomers/');
          if (isAgentPath) {
            const cleanCurrLower = cleanCurr.toLowerCase();
            const matchedDoc = rawDocs.find((d) => {
              const p = String(d.filePath || d.documentPath || d.path || '').trim().replace(/\\/g, '/').replace(/^\/+/, '').toLowerCase();
              return p === cleanCurrLower;
            });
            const rawId = matchedDoc?.agentCustomerDocumentId ?? matchedDoc?.id ?? null;
            if (rawId && Number.isInteger(Number(rawId)) && Number(rawId) > 0) {
              matchedAgentDocId = Number(rawId);
            }
          }

          updatedRejDocs.push({
            id: stableId,
            agentCustomerDocumentId: matchedAgentDocId,
            rejectionId: rej.backOfficeDocumentRejectionId ?? rej.BackOfficeDocumentRejectionId,
            documentTypeId: resolvedRejTypeId,
            documentTypeName: rejDocType ? String(rejDocType).replace(/_/g, ' ') : 'Updated Document',
            documentName: rejDocType ? String(rejDocType).replace(/_/g, ' ') : 'Updated Document',
            fileName,
            filePath: cleanCurr,
            currentDocumentPath: cleanCurr,
            // Explicit replacement markers - grouping relies on these, not array position.
            isRejectionDoc: true,
            fileType: isPdf ? 'pdf' : 'image',
            isOriginal: false,
            isLatest: true,
            status: rej.status ?? rej.Status ?? 'Resubmitted',
            rejectionRemarks: rej.rejectionRemarks ?? rej.RejectionRemarks,
            createdAt: rej.resubmittedAt ?? rej.ResubmittedAt ?? rej.verifiedAt ?? rej.VerifiedAt ?? rej.rejectedAt ?? rej.RejectedAt,
            isActive: true,
          });
        });

        setDocuments([...rawDocs, ...updatedRejDocs])
        setEmploymentTypes(extractArray(empRes))
        setDocumentTypes(docTypeList)
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
  const productName = customer.loanProductName || customer.productName || 'N/A'
  
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
    if (n.includes('pan') || n.includes('aadhaar') || n.includes('aadhar') || n.includes('id')) return IdCard
    if (n.includes('bank') || n.includes('passbook')) return Landmark
    return FileText
  }

  const getDocumentName = (docTypeId, fallbackName) => {
    if (docTypeId) {
      const type = documentTypes.find(t => Number(t.documentTypeId || t.id) === Number(docTypeId))
      if (type) return type.documentTypeName || type.name
    }
    if (fallbackName) return fallbackName
    return 'Document'
  }

  const handleViewDocument = async (doc) => {
    setViewError('')
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';
      const token = localStorage.getItem('authToken');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let blob;

      // 1. Resolve path with priority to currentDocumentPath for updated/rejection documents
      const targetPath = String(
        doc.currentDocumentPath ||
        doc.CurrentDocumentPath ||
        doc.filePath ||
        doc.FilePath ||
        doc.documentPath ||
        ''
      ).trim();
      const cleanPath = targetPath.replace(/\\/g, '/').replace(/^\/+/, '');

      // 2. Storage-provenance routing:
      const isAgentPath = cleanPath.startsWith('UploadedFiles/AgentCustomers/') || cleanPath.startsWith('AgentCustomers/');
      const isKycPath = cleanPath.startsWith('UploadedFiles/KYCDocuments/') || cleanPath.startsWith('KYCDocuments/');

      // Route A: Agent Customer document path (UploadedFiles/AgentCustomers/... or AgentCustomers/...)
      if (isAgentPath) {
        let agentDocId = doc.agentCustomerDocumentId ?? doc.id ?? null;
        if (!agentDocId || !Number.isInteger(Number(agentDocId)) || Number(agentDocId) <= 0) {
          const cleanPathLower = cleanPath.toLowerCase();
          const matchedDoc = documents.find((d) => {
            const p = String(d.filePath || d.documentPath || d.path || '').trim().replace(/\\/g, '/').replace(/^\/+/, '').toLowerCase();
            return p === cleanPathLower;
          });
          const resolvedId = matchedDoc?.agentCustomerDocumentId ?? matchedDoc?.id ?? null;
          if (resolvedId && Number.isInteger(Number(resolvedId)) && Number(resolvedId) > 0) {
            agentDocId = Number(resolvedId);
          }
        }

        if (!agentDocId) {
          setViewError('Document file reference is not available.');
          return;
        }

        blob = await agentCustomerService.downloadDocument(agentDocId);
      }
      // Route B: Application KYC document path (UploadedFiles/KYCDocuments/... or KYCDocuments/...)
      else if (isKycPath) {
        let serverPath = cleanPath;
        if (!serverPath.startsWith('UploadedFiles/')) {
          serverPath = `UploadedFiles/${serverPath}`;
        }

        const res = await fetch(`${API_BASE}/ApplicationKYCDocuments/download?path=${encodeURIComponent(serverPath)}`, { headers });
        if (res.status === 404) {
          setViewError('Document file not found on server.');
          return;
        }
        if (!res.ok) {
          setViewError(`Unable to retrieve document from server (HTTP ${res.status}).`);
          return;
        }
        blob = await res.blob();
      }
      // Route C: Original document without explicit path but with valid agentCustomerDocumentId
      else if (!doc.isRejectionDoc && (doc.agentCustomerDocumentId || doc.id)) {
        const rawDocId = doc.agentCustomerDocumentId || doc.id;
        blob = await agentCustomerService.downloadDocument(rawDocId);
      }
      // Route D: Unknown path prefix or missing reference
      else {
        setViewError('Document storage format is unsupported or file reference is missing.');
        return;
      }

      if (!blob || blob.size === 0) {
        setViewError('Document file is empty or unavailable.');
        return;
      }
      
      const fileName = doc.fileName || doc.documentName || doc.documentTypeName || cleanPath.split('/').pop() || '';
      const isPdfByExt = /\.pdf$/i.test(fileName);
      const isPdfByBlob = blob.type === 'application/pdf';
      const isPdf = isPdfByBlob || isPdfByExt;

      let mimeType = blob.type || (isPdf ? 'application/pdf' : 'image/jpeg');
      if (/\.(jpg|jpeg)$/i.test(fileName)) mimeType = 'image/jpeg';
      else if (/\.png$/i.test(fileName)) mimeType = 'image/png';
      else if (/\.webp$/i.test(fileName)) mimeType = 'image/webp';
      else if (/\.gif$/i.test(fileName)) mimeType = 'image/gif';
      else if (isPdf) mimeType = 'application/pdf';

      const typedBlob = new Blob([blob], { type: mimeType });
      const url = window.URL.createObjectURL(typedBlob);
      
      const isImage = mimeType.startsWith('image/') || (!isPdf && !mimeType.includes('pdf'));
      
      if (isImage) {
        setModalImage({
          src: url,
          title: getDocumentName(doc.documentTypeId, doc.documentName || doc.documentTypeName || fileName)
        });
      } else {
        window.open(url, '_blank');
        // Automatically revoke the URL after the new tab has had time to load it
        setTimeout(() => window.URL.revokeObjectURL(url), 10000);
      }
    } catch (err) {
      console.error('Failed to view document', err);
      const status = err.response?.status || err.status;
      if (status === 404) {
        setViewError('Document file not found.');
      } else if (status >= 500) {
        setViewError('Unable to retrieve document from server.');
      } else {
        setViewError(err.message || 'Unable to view document.');
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
            {viewError ? (
              <div
                role="alert"
                style={{
                  marginBottom: '12px',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid #fecaca',
                  background: '#fef2f2',
                  color: '#b91c1c',
                  fontSize: '13px',
                  fontWeight: 500,
                }}
              >
                {viewError}
              </div>
            ) : null}
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
                  <span className="detail-label">Product Name</span>
                  <span className="detail-value">{customer.loanProductName || customer.productName || 'N/A'}</span>
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

              {/* Tabs */}
              {!loadingDocs && documents.length > 0 && (
                <div className="drawer-doc-tabs">
                  <button
                    type="button"
                    className={`drawer-doc-tab-btn ${activeDocTab === 'original' ? 'drawer-doc-tab-btn--active' : ''}`}
                    onClick={() => setActiveDocTab('original')}
                  >
                    <span>Original Documents</span>
                    <span className="drawer-doc-tab-badge">{originalDocs.length}</span>
                  </button>
                  <button
                    type="button"
                    className={`drawer-doc-tab-btn ${activeDocTab === 'updated' ? 'drawer-doc-tab-btn--active' : ''}`}
                    onClick={() => setActiveDocTab('updated')}
                  >
                    <span>Updated Documents</span>
                    <span className="drawer-doc-tab-badge">{updatedDocs.length}</span>
                  </button>
                </div>
              )}

              <div className="drawer-documents-list">
                {loadingDocs ? (
                  <div style={{ color: '#64748b', fontSize: '13px' }}>Loading documents...</div>
                ) : documents.length === 0 ? (
                  <div style={{ color: '#64748b', fontSize: '13px' }}>No documents uploaded.</div>
                ) : activeDocTab === 'original' ? (
                  originalDocs.map((doc, idx) => {
                    const docName = getDocumentName(doc.documentTypeId, doc.documentName || doc.documentTypeName)
                    const IconComp = getDocumentIcon(docName)
                    return (
                      <div className="drawer-doc-card" key={doc.id || doc.agentCustomerDocumentId || idx}>
                        <div className="drawer-doc-info">
                          <div className="drawer-doc-icon">
                            <IconComp size={18} />
                          </div>
                          <div>
                            <div className="drawer-doc-title-row">
                              <span className="drawer-doc-title">{docName}</span>
                              <span className="drawer-doc-badge drawer-doc-badge--original">Original</span>
                            </div>
                            <div className="drawer-doc-status">{doc.fileName || 'Uploaded'}</div>
                            {doc.createdAt && (
                              <div className="drawer-doc-date">
                                <Clock size={10} /> {formatDate(doc.createdAt)}
                              </div>
                            )}
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
                ) : (
                  updatedDocs.length === 0 ? (
                    <div style={{ color: '#64748b', fontSize: '13px', padding: '12px 0', textAlign: 'center' }}>
                      No updated or replacement documents uploaded for this applicant.
                    </div>
                  ) : (
                    updatedDocs.map((doc, idx) => {
                      const docName = getDocumentName(doc.documentTypeId, doc.documentName || doc.documentTypeName)
                      const IconComp = getDocumentIcon(docName)
                      return (
                        <div className="drawer-doc-card" key={doc.id || doc.agentCustomerDocumentId || idx}>
                          <div className="drawer-doc-info">
                            <div className="drawer-doc-icon">
                              <IconComp size={18} />
                            </div>
                            <div>
                              <div className="drawer-doc-title-row">
                                <span className="drawer-doc-title">{docName}</span>
                                <div className="drawer-doc-badges-group">
                                  <span className="drawer-doc-badge drawer-doc-badge--updated">{doc.versionLabel}</span>
                                  {doc.isLatest && (
                                    <span className="drawer-doc-badge drawer-doc-badge--latest">Latest</span>
                                  )}
                                </div>
                              </div>
                              <div className="drawer-doc-status">{doc.fileName || 'Uploaded'}</div>
                              {doc.createdAt && (
                                <div className="drawer-doc-date">
                                  <Clock size={10} /> {formatDate(doc.createdAt)}
                                </div>
                              )}
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
                  )
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
