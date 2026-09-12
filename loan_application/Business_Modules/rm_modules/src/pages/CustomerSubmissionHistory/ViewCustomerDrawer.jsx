import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  User,
  CreditCard,
  FileText,
  Eye,
  IdCard,
  Landmark,
  Clock,
  AlertCircle,
  ArrowRight,
  UserCheck,
  RefreshCw,
} from 'lucide-react';
import { rmCustomerService } from '../../services/rmCustomerService';
import './CustomerSubmissionHistory.css';

export default function ViewCustomerDrawer({
  customer,
  masterData = {},
  onClose,
  onPromote,
  onContinueToApp,
  isPromoting = false,
}) {
  const [modalImage, setModalImage] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [activeDocTab, setActiveDocTab] = useState('original');
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [viewError, setViewError] = useState('');

  const blobUrlsRef = useRef([]);

  const cleanupBlobUrls = () => {
    blobUrlsRef.current.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error('Error revoking blob url:', e);
      }
    });
    blobUrlsRef.current = [];
  };

  useEffect(() => {
    return () => {
      cleanupBlobUrls();
    };
  }, []);

  const { loanPurposes = [], employmentTypes = [], documentTypes = [] } = masterData;

  const rmCustomerId = customer?.rmCustomerId || customer?.rMCustomerId || customer?.id;

  // Group and sort documents chronologically into Original (V1) and Updated (V2+)
  const { originalDocs, updatedDocs } = useMemo(() => {
    const active = (documents || []).filter((d) => d && d.isActive !== false);

    const grouped = {};
    active.forEach((doc) => {
      const key = doc.documentTypeId
        ? String(doc.documentTypeId)
        : String(doc.documentTypeName || doc.documentName || 'other').trim().toLowerCase();
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(doc);
    });

    const original = [];
    const updated = [];

    Object.keys(grouped).forEach((key) => {
      const list = grouped[key];
      // Sort chronologically ascending
      list.sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        if (timeA !== timeB) return timeA - timeB;
        return (Number(a.rmCustomerDocumentId || a.id) || 0) - (Number(b.rmCustomerDocumentId || b.id) || 0);
      });

      list.forEach((doc, index) => {
        const isOrig = index === 0;
        const isLat = index === list.length - 1;
        const versionLabel = `V${index + 1}`;
        const item = {
          ...doc,
          isOriginal: isOrig,
          isLatest: isLat,
          versionLabel,
          versionDisplay: isOrig ? 'Original' : versionLabel,
        };

        if (isOrig) {
          original.push(item);
        } else {
          updated.push(item);
        }
      });
    });

    // In Updated tab, sort descending by version / createdAt (latest first)
    updated.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      if (timeA !== timeB) return timeB - timeA;
      return (Number(b.rmCustomerDocumentId || b.id) || 0) - (Number(a.rmCustomerDocumentId || a.id) || 0);
    });

    return { originalDocs: original, updatedDocs: updated };
  }, [documents]);

  useEffect(() => {
    let isMounted = true;

    const loadDocuments = async () => {
      if (!rmCustomerId) {
        setLoadingDocs(false);
        return;
      }
      setLoadingDocs(true);
      setViewError('');
      try {
        const res = await rmCustomerService.getDocumentsByCustomerId(rmCustomerId);
        const extractArray = (data) => {
          if (Array.isArray(data)) return data;
          if (data && typeof data === 'object') {
            if (Array.isArray(data.data)) return data.data;
            if (Array.isArray(data.items)) return data.items;
            if (Array.isArray(data.result)) return data.result;
            if (Array.isArray(data.list)) return data.list;
            for (const key of Object.keys(data)) {
              if (Array.isArray(data[key])) return data[key];
            }
          }
          return [];
        };

        if (isMounted) {
          setDocuments(extractArray(res));
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load customer documents:', err);
          setViewError('Unable to load customer documents.');
        }
      } finally {
        if (isMounted) {
          setLoadingDocs(false);
        }
      }
    };

    loadDocuments();

    return () => {
      isMounted = false;
    };
  }, [rmCustomerId]);

  if (!customer) return null;

  const customerName = customer.fullName || 'Unknown Customer';
  const initial = customerName.charAt(0).toUpperCase();
  const mobile = customer.mobileNumber || 'N/A';
  const email = customer.email || 'N/A';

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const submittedOn = formatDate(customer.createdAt);
  const status = customer.status || 'New';

  // Resolve Names
  let loanPurposeName = customer.loanPurposeName;
  if (!loanPurposeName && customer.loanPurposeId) {
    const p = loanPurposes.find((x) => Number(x.loanPurposeId || x.id) === Number(customer.loanPurposeId));
    if (p) loanPurposeName = p.productName || p.purposeName || p.name;
  }

  let employmentTypeName = customer.employmentTypeName;
  if (!employmentTypeName && customer.employmentTypeId) {
    const e = employmentTypes.find((x) => Number(x.employmentTypeId || x.id) === Number(customer.employmentTypeId));
    if (e) employmentTypeName = e.employmentTypeName || e.name;
  }

  const loanAmount = customer.expectedLoanAmount
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(
        customer.expectedLoanAmount
      )
    : 'N/A';

  const remarks = customer.remarks || 'No remarks provided.';

  const getDocumentIcon = (name) => {
    const n = (name || '').toLowerCase();
    if (n.includes('image') || n.includes('photo')) return User;
    if (n.includes('pan') || n.includes('aadhaar') || n.includes('id')) return IdCard;
    if (n.includes('bank') || n.includes('passbook')) return Landmark;
    return FileText;
  };

  const getDocumentName = (docTypeId, fallbackName) => {
    if (fallbackName) return fallbackName;
    const type = documentTypes.find((t) => Number(t.documentTypeId || t.id) === Number(docTypeId));
    return type ? type.documentTypeName || type.name : 'Document';
  };

  const handleViewDocument = async (doc) => {
    setViewError('');
    try {
      const docId = doc.rmCustomerDocumentId || doc.id;
      const blob = await rmCustomerService.downloadDocument(docId);

      const fileName = doc.fileName || doc.documentName || '';
      let mimeType = 'application/octet-stream';
      if (/\.(jpg|jpeg)$/i.test(fileName)) mimeType = 'image/jpeg';
      else if (/\.png$/i.test(fileName)) mimeType = 'image/png';
      else if (/\.pdf$/i.test(fileName)) mimeType = 'application/pdf';
      else if (/\.gif$/i.test(fileName)) mimeType = 'image/gif';

      const typedBlob = new Blob([blob], { type: mimeType });
      const url = window.URL.createObjectURL(typedBlob);
      blobUrlsRef.current.push(url);

      const isImage = mimeType.startsWith('image/');

      if (isImage) {
        setModalImage({
          src: url,
          title: getDocumentName(doc.documentTypeId, doc.documentName || doc.documentTypeName),
        });
      } else {
        window.open(url, '_blank');
        setTimeout(() => {
          try {
            window.URL.revokeObjectURL(url);
          } catch {}
        }, 15000);
      }
    } catch (err) {
      console.error('Failed to view document', err);
      if (!err?.response) {
        setViewError('Unable to connect to document server.');
      } else if (err.response.status === 404) {
        setViewError('Document file not found.');
      } else if (err.response.status >= 500) {
        setViewError('Unable to retrieve document from server.');
      } else {
        setViewError('Unable to view document.');
      }
    }
  };

  const handleClose = () => {
    cleanupBlobUrls();
    onClose();
  };

  return (
    <>
      <div className="customer-modal-backdrop" onClick={handleClose}>
        <div
          className="customer-modal-drawer"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {/* Header Bar */}
          <div className="drawer-header">
            <div className="drawer-header-info">
              <div
                className="drawer-avatar"
                style={{
                  backgroundColor: initial.match(/[A-M]/) ? '#EAF5EE' : '#EFF6FF',
                  color: initial.match(/[A-M]/) ? '#1A7A3C' : '#2563EB',
                }}
              >
                {initial}
              </div>
              <div className="drawer-title-text">
                <h2>{customerName}</h2>
                <span>ID: {rmCustomerId}</span>
              </div>
            </div>
            <button
              type="button"
              className="drawer-close-btn"
              onClick={handleClose}
              aria-label="Close details"
            >
              <X size={18} />
            </button>
          </div>

          {/* Drawer Scrollable Content Body */}
          <div className="drawer-body">
            {viewError ? (
              <div className="drawer-error-alert" role="alert">
                <AlertCircle size={16} />
                <span>{viewError}</span>
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
                  <span className="detail-value" style={{ color: '#D97706', fontWeight: 600 }}>
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
                  <span className="detail-value detail-value--amount">{loanAmount}</span>
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
                  <div style={{ color: '#64748b', fontSize: '13px', padding: '12px 0', textAlign: 'center' }}>
                    Loading documents...
                  </div>
                ) : documents.length === 0 ? (
                  <div style={{ color: '#64748b', fontSize: '13px', padding: '12px 0', textAlign: 'center' }}>
                    No documents uploaded.
                  </div>
                ) : activeDocTab === 'original' ? (
                  originalDocs.length === 0 ? (
                    <div style={{ color: '#64748b', fontSize: '13px', padding: '12px 0', textAlign: 'center' }}>
                      No original documents found.
                    </div>
                  ) : (
                    originalDocs.map((doc, idx) => {
                      const docName = getDocumentName(doc.documentTypeId, doc.documentName || doc.documentTypeName);
                      const IconComp = getDocumentIcon(docName);
                      return (
                        <div className="drawer-doc-card" key={doc.rmCustomerDocumentId || doc.id || idx}>
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
                      );
                    })
                  )
                ) : updatedDocs.length === 0 ? (
                  <div style={{ color: '#64748b', fontSize: '13px', padding: '12px 0', textAlign: 'center' }}>
                    No updated or replacement documents uploaded for this applicant.
                  </div>
                ) : (
                  updatedDocs.map((doc, idx) => {
                    const docName = getDocumentName(doc.documentTypeId, doc.documentName || doc.documentTypeName);
                    const IconComp = getDocumentIcon(docName);
                    return (
                      <div className="drawer-doc-card" key={doc.rmCustomerDocumentId || doc.id || idx}>
                        <div className="drawer-doc-info">
                          <div className="drawer-doc-icon">
                            <IconComp size={18} />
                          </div>
                          <div>
                            <div className="drawer-doc-title-row">
                              <span className="drawer-doc-title">{docName}</span>
                              <div className="drawer-doc-badges-group">
                                <span className="drawer-doc-badge drawer-doc-badge--updated">
                                  {doc.versionLabel}
                                </span>
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
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="drawer-footer">
            <button type="button" className="btn-close-drawer" onClick={handleClose}>
              Close Details
            </button>
            {customer.isConverted || customer.IsConverted ? (
              <button
                type="button"
                className="btn-drawer-continue-app"
                onClick={() => onContinueToApp && onContinueToApp(customer)}
              >
                <ArrowRight size={15} />
                <span>Continue to Application</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn-drawer-promote-app"
                onClick={() => onPromote && onPromote(customer)}
                disabled={Boolean(isPromoting)}
              >
                {isPromoting ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Creating Application...</span>
                  </>
                ) : (
                  <>
                    <UserCheck size={15} />
                    <span>Promote to Application</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* FULL DOCUMENT IMAGE MODAL PREVIEW */}
      {modalImage && (
        <div
          className="image-modal-backdrop"
          onClick={() => {
            setModalImage(null);
          }}
        >
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="image-modal-header">
              <span className="image-modal-title">{modalImage.title}</span>
              <button
                type="button"
                className="image-modal-close"
                onClick={() => {
                  setModalImage(null);
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
  );
}
