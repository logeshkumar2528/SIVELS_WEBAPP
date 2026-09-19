import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  FileText, CheckCircle, Clock, Eye, Download, ExternalLink, X, 
  ShieldCheck, AlertCircle, Loader2, User, Image as ImageIcon, 
  Landmark, Archive, ChevronDown, ChevronUp, History, FolderArchive
} from 'lucide-react';
import { downloadAgentCustomerDoc, downloadKycDocumentByPath } from '../../../api/application360Api';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

function resolveCategory(typeName = '', fileName = '') {
  const combined = `${typeName} ${fileName}`.toLowerCase();

  if (combined.includes('profile') || combined.includes('photo') || combined.includes('avatar') || combined.includes('selfie')) {
    return { category: 'PROFILE_IMAGE', categoryTitle: 'Profile Photograph', order: 1 };
  }
  if (combined.includes('aadhaar') || combined.includes('aadhar') || combined.includes('uidai')) {
    return { category: 'AADHAAR', categoryTitle: 'Aadhaar Card', order: 2 };
  }
  if (combined.includes('pan card') || combined.includes('pancard') || combined.includes('pan_card') || combined.includes('nsdl') || /\bpan\b/.test(combined)) {
    return { category: 'PAN', categoryTitle: 'PAN Card', order: 3 };
  }
  if (combined.includes('salary') || combined.includes('payslip') || combined.includes('pay slip') || combined.includes('paystub') || combined.includes('wage')) {
    return { category: 'SALARY_SLIP', categoryTitle: 'Salary Slip / Payslip', order: 4 };
  }
  if (combined.includes('bank') || combined.includes('statement') || combined.includes('passbook')) {
    return { category: 'BANK_STATEMENT', categoryTitle: 'Bank Statement', order: 5 };
  }
  if (fileName.match(/\.(zip|rar|7z|tar|gz)$/i) || combined.includes('zip') || combined.includes('archive') || combined.includes('compressed')) {
    return { category: 'ZIP_ARCHIVE', categoryTitle: 'ZIP / Archive', order: 6 };
  }

  const cleanTitle = typeName || 'Other Supporting Document';
  const slug = cleanTitle.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  return { category: `OTHER_${slug}`, categoryTitle: cleanTitle, order: 7 };
}

function renderCategoryIcon(categoryType) {
  switch (categoryType) {
    case 'PROFILE_IMAGE':
      return <ImageIcon size={16} className="app360-doc-icon-color-blue" />;
    case 'AADHAAR':
      return <ShieldCheck size={16} className="app360-doc-icon-color-green" />;
    case 'PAN':
      return <ShieldCheck size={16} className="app360-doc-icon-color-teal" />;
    case 'SALARY_SLIP':
      return <FileText size={16} className="app360-doc-icon-color-orange" />;
    case 'BANK_STATEMENT':
      return <Landmark size={16} className="app360-doc-icon-color-purple" />;
    case 'ZIP_ARCHIVE':
      return <Archive size={16} className="app360-doc-icon-color-slate" />;
    default:
      return <FileText size={16} className="app360-doc-icon-color-muted" />;
  }
}

export function KycDocumentsTab({ applicants = [], documents = [], masterLookups = {} }) {
  const [previewModal, setPreviewModal] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [downloadingKeys, setDownloadingKeys] = useState({});
  const [expandedHistories, setExpandedHistories] = useState({});
  const activeBlobUrlsRef = useRef([]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      activeBlobUrlsRef.current.forEach(url => {
        try { window.URL.revokeObjectURL(url); } catch {}
      });
      activeBlobUrlsRef.current = [];
    };
  }, []);

  const toggleHistory = (key) => {
    setExpandedHistories(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleOpenPreview = async ({ title, docId = null, serverPath = null, fileName = '' }) => {
    setIsLoadingPreview(true);
    setPreviewError('');

    try {
      let blobData = null;
      if (docId) {
        blobData = await downloadAgentCustomerDoc(docId);
      } else if (serverPath) {
        blobData = await downloadKycDocumentByPath(serverPath);
      }

      if (!blobData || blobData.size === 0) {
        throw new Error('Document content is empty or unavailable.');
      }

      const cleanFileName = fileName || serverPath || title || '';
      const ext = cleanFileName.split('?')[0].split('.').pop()?.toLowerCase();

      let mimeType = blobData.type || 'application/octet-stream';
      if (mimeType === 'application/octet-stream' || !mimeType) {
        if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
        else if (ext === 'png') mimeType = 'image/png';
        else if (ext === 'webp') mimeType = 'image/webp';
        else if (ext === 'pdf') mimeType = 'application/pdf';
      }

      const isPdf = mimeType === 'application/pdf' || ext === 'pdf';
      const isImage = mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext);
      const typedBlob = new Blob([blobData], { type: mimeType });
      const objectUrl = window.URL.createObjectURL(typedBlob);
      activeBlobUrlsRef.current.push(objectUrl);

      setPreviewModal({
        title,
        url: objectUrl,
        isPdf,
        isImage,
        fileName: cleanFileName || `${title}.${ext || 'jpg'}`
      });
    } catch (err) {
      console.error('Failed to load document preview:', err);
      setPreviewError(err.response?.data?.message || err.message || 'Unable to download document for preview.');
      setPreviewModal({
        title,
        url: null,
        isPdf: false,
        isImage: false,
        fileName: title
      });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleDownloadFile = async ({ title, docId = null, serverPath = null, fileName = '', itemKey = '' }) => {
    try {
      if (itemKey) {
        setDownloadingKeys(prev => ({ ...prev, [itemKey]: true }));
      }
      let blobData = null;
      if (docId) {
        blobData = await downloadAgentCustomerDoc(docId);
      } else if (serverPath) {
        blobData = await downloadKycDocumentByPath(serverPath);
      }

      if (!blobData || blobData.size === 0) {
        throw new Error('Document content is empty or unavailable.');
      }

      const cleanFileName = fileName || serverPath?.split('/')?.pop() || `${title || 'document'}`;
      const ext = cleanFileName.split('?')[0].split('.').pop()?.toLowerCase();
      let mimeType = blobData.type || 'application/octet-stream';
      if (mimeType === 'application/octet-stream' || !mimeType) {
        if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
        else if (ext === 'png') mimeType = 'image/png';
        else if (ext === 'pdf') mimeType = 'application/pdf';
      }

      const typedBlob = new Blob([blobData], { type: mimeType });
      const downloadUrl = window.URL.createObjectURL(typedBlob);

      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = cleanFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Direct download failed:', err);
      alert(err.response?.data?.message || err.message || 'Failed to download document.');
    } finally {
      if (itemKey) {
        setDownloadingKeys(prev => ({ ...prev, [itemKey]: false }));
      }
    }
  };

  const handleClosePreview = () => {
    if (previewModal?.url) {
      try { window.URL.revokeObjectURL(previewModal.url); } catch {}
    }
    setPreviewModal(null);
    setPreviewError('');
  };

  // Build Person-wise Document Groups and Unassigned Items
  const { personDocGroups, unassignedDocs } = useMemo(() => {
    const activeCustomerDocs = (Array.isArray(documents) ? documents : []).filter(d => d && d.isActive !== false);
    const claimedDocIds = new Set();

    const personGroups = applicants.map((app) => {
      const applicantName = app.person?.fullName || 
        [app.person?.firstName, app.person?.middleName, app.person?.lastName].filter(Boolean).join(' ') || 
        app.label;

      const applicantPan = app.person?.panNumber || app.person?.panCardNo || app.identityKyc?.panCardNo;
      const applicantMobile = app.person?.mobileNumber || app.person?.mobile;
      const rawItems = [];

      // 1. Core Identity KYC records
      if (app.identityKyc) {
        const kyc = app.identityKyc;
        const resolvedVerification = kyc.verificationId ? masterLookups.verifications?.[kyc.verificationId] : null;
        const vLabel = resolvedVerification || (kyc.isVerified === true ? 'Verified' : 'Pending');
        const isVerifiedRecord = Boolean(
          kyc.isVerified === true || 
          (resolvedVerification && (
            String(resolvedVerification).toLowerCase().includes('verif') || 
            String(resolvedVerification).toLowerCase().includes('approv')
          ))
        );

        // Profile Photo
        if (kyc.profileImagePath) {
          rawItems.push({
            source: 'identityKyc',
            category: 'PROFILE_IMAGE',
            categoryTitle: 'Profile Photograph',
            order: 1,
            docId: null,
            serverPath: kyc.profileImagePath,
            fileName: kyc.profileImagePath.split('/').pop() || 'Profile Photo',
            identifier: 'Applicant Photograph',
            status: vLabel,
            isVerified: isVerifiedRecord,
            createdAt: kyc.createdAt,
            modifiedAt: kyc.modifiedAt || kyc.createdAt,
            uniqueKey: `identity_profile_${app.sequence}_${kyc.applicationKYCDocumentId}`,
          });
        }

        // Aadhaar Card
        if (kyc.aadharDocumentPath || kyc.aadhaarLastFourDigits) {
          rawItems.push({
            source: 'identityKyc',
            category: 'AADHAAR',
            categoryTitle: 'Aadhaar Card',
            order: 2,
            docId: null,
            serverPath: kyc.aadharDocumentPath,
            fileName: kyc.aadharDocumentPath ? (kyc.aadharDocumentPath.split('/').pop() || 'Aadhaar Card') : 'Aadhaar e-KYC',
            identifier: kyc.aadhaarLastFourDigits ? `XXXX-XXXX-${kyc.aadhaarLastFourDigits}` : 'Aadhaar UIDAI Proof',
            status: vLabel,
            isVerified: isVerifiedRecord,
            createdAt: kyc.createdAt,
            modifiedAt: kyc.modifiedAt || kyc.createdAt,
            uniqueKey: `identity_aadhaar_${app.sequence}_${kyc.applicationKYCDocumentId}`,
          });
        }

        // PAN Card
        if (kyc.panCardPath || kyc.panCardNo || applicantPan) {
          const panNum = kyc.panCardNo || applicantPan;
          rawItems.push({
            source: 'identityKyc',
            category: 'PAN',
            categoryTitle: 'PAN Card',
            order: 3,
            docId: null,
            serverPath: kyc.panCardPath,
            fileName: kyc.panCardPath ? (kyc.panCardPath.split('/').pop() || 'PAN Card') : 'PAN Card Proof',
            identifier: panNum || 'PAN Card Proof',
            status: vLabel,
            isVerified: isVerifiedRecord,
            createdAt: kyc.createdAt,
            modifiedAt: kyc.modifiedAt || kyc.createdAt,
            uniqueKey: `identity_pan_${app.sequence}_${kyc.applicationKYCDocumentId}`,
          });
        }
      }

      // 2. Supplemental Applicant Documents
      (app.supplementalKyc || []).forEach((sDoc, sIdx) => {
        const typeName = (sDoc.documentTypeId && masterLookups.documentTypes?.[sDoc.documentTypeId]) || 
          sDoc.documentTypeName || 
          `Supplemental Document #${sDoc.documentTypeId || sIdx + 1}`;

        const resolvedVerification = sDoc.verificationId ? masterLookups.verifications?.[sDoc.verificationId] : null;
        const vLabel = resolvedVerification || sDoc.documentStatus || 'Uploaded';
        const isVerifiedRecord = Boolean(
          (resolvedVerification && (
            String(resolvedVerification).toLowerCase().includes('verif') || 
            String(resolvedVerification).toLowerCase().includes('approv')
          )) ||
          (sDoc.documentStatus && (
            String(sDoc.documentStatus).toLowerCase().includes('verif') || 
            String(sDoc.documentStatus).toLowerCase().includes('approv')
          ))
        );

        const categoryInfo = resolveCategory(typeName, sDoc.originalFileName || sDoc.fileName || sDoc.documentPath);

        rawItems.push({
          source: 'supplementalKyc',
          category: categoryInfo.category,
          categoryTitle: categoryInfo.categoryTitle || typeName,
          order: categoryInfo.order,
          docId: null,
          serverPath: sDoc.documentPath || sDoc.filePath,
          fileName: sDoc.originalFileName || sDoc.fileName || sDoc.documentPath?.split('/')?.pop() || typeName,
          identifier: typeName,
          status: vLabel,
          isVerified: isVerifiedRecord,
          createdAt: sDoc.createdAt,
          modifiedAt: sDoc.modifiedAt || sDoc.updatedAt || sDoc.createdAt,
          uniqueKey: `supp_${app.sequence}_${sDoc.applicationKYCDocumentId || sIdx}`,
        });
      });

      // 3. Uploaded Customer Documents (linked ONLY with explicit personalInformationId or applicantSequence)
      activeCustomerDocs.forEach((uDoc, uIdx) => {
        const hasMatchingPersonId = Boolean(
          uDoc.personalInformationId && 
          app.person?.personalInformationId && 
          Number(uDoc.personalInformationId) === Number(app.person.personalInformationId)
        );

        const hasMatchingSequence = Boolean(
          uDoc.applicantSequence !== null && 
          uDoc.applicantSequence !== undefined && 
          uDoc.applicantSequence !== '' && 
          Number(uDoc.applicantSequence) === Number(app.sequence)
        );

        const isMatch = hasMatchingPersonId || hasMatchingSequence;

        if (isMatch) {
          claimedDocIds.add(uDoc.agentCustomerDocumentId || uDoc.id || `doc_${uIdx}`);

          const typeName = (uDoc.documentTypeId && masterLookups.documentTypes?.[uDoc.documentTypeId]) || 
            uDoc.documentTypeName || 
            uDoc.documentType || 
            uDoc.documentName || 
            `Uploaded Document #${uDoc.documentTypeId || uIdx + 1}`;

          const resolvedVerification = uDoc.verificationId ? masterLookups.verifications?.[uDoc.verificationId] : null;
          const vLabel = resolvedVerification || (uDoc.status && uDoc.status !== 'Uploaded' ? uDoc.status : 'Uploaded');
          const isVerifiedRecord = Boolean(
            (resolvedVerification && (
              String(resolvedVerification).toLowerCase().includes('verif') || 
              String(resolvedVerification).toLowerCase().includes('approv')
            )) ||
            (uDoc.status && (
              String(uDoc.status).toLowerCase().includes('verif') || 
              String(uDoc.status).toLowerCase().includes('approv')
            ))
          );

          const categoryInfo = resolveCategory(typeName, uDoc.fileName || uDoc.documentName || uDoc.filePath);

          rawItems.push({
            source: 'customerDoc',
            category: categoryInfo.category,
            categoryTitle: categoryInfo.categoryTitle || typeName,
            order: categoryInfo.order,
            docId: uDoc.agentCustomerDocumentId || uDoc.id,
            serverPath: uDoc.filePath || null,
            fileName: uDoc.fileName || uDoc.documentName || typeName,
            identifier: typeName,
            status: vLabel,
            isVerified: isVerifiedRecord,
            createdAt: uDoc.createdAt || uDoc.uploadedAt,
            modifiedAt: uDoc.modifiedAt || uDoc.updatedAt || uDoc.createdAt || uDoc.uploadedAt,
            fileSize: uDoc.fileSize || uDoc.size,
            uniqueKey: `cust_${uDoc.agentCustomerDocumentId || uDoc.id || uIdx}`,
          });
        }
      });

      // Group raw items by category
      const categoryMap = new Map();
      rawItems.forEach(item => {
        if (!categoryMap.has(item.category)) {
          categoryMap.set(item.category, {
            category: item.category,
            categoryTitle: item.categoryTitle,
            order: item.order,
            identifier: item.identifier,
            items: []
          });
        }
        const group = categoryMap.get(item.category);
        if (item.identifier && (!group.identifier || group.identifier === group.categoryTitle)) {
          group.identifier = item.identifier;
        }

        // Deduplicate identical uploads (same docId or identical serverPath)
        const isDuplicate = group.items.some(existing => 
          (item.docId && existing.docId === item.docId) ||
          (item.serverPath && existing.serverPath === item.serverPath)
        );
        if (!isDuplicate) {
          group.items.push(item);
        }
      });

      // Sort versions chronologically (newest first) and order categories
      const docCategories = Array.from(categoryMap.values()).map(group => {
        group.items.sort((a, b) => {
          const timeA = new Date(a.modifiedAt || a.createdAt || 0).getTime();
          const timeB = new Date(b.modifiedAt || b.createdAt || 0).getTime();
          return timeB - timeA || (b.docId || 0) - (a.docId || 0);
        });

        const totalVersions = group.items.length;
        const latest = group.items[0];
        const history = group.items.slice(1);

        return {
          ...group,
          latest,
          history,
          totalVersions
        };
      }).sort((a, b) => (a.order - b.order) || a.categoryTitle.localeCompare(b.categoryTitle));

      const totalFilesCount = docCategories.reduce((acc, cat) => acc + cat.totalVersions, 0);
      const verifiedCount = docCategories.filter(cat => cat.latest?.isVerified).length;

      return {
        applicant: app,
        applicantName,
        applicantPan,
        applicantMobile,
        sequence: app.sequence,
        label: app.label,
        docCategories,
        totalDocTypes: docCategories.length,
        totalFilesCount,
        verifiedCount
      };
    });

    // Unassigned customer documents
    const unassigned = activeCustomerDocs.filter((uDoc, uIdx) => {
      const docId = uDoc.agentCustomerDocumentId || uDoc.id || `doc_${uIdx}`;
      return !claimedDocIds.has(docId);
    });

    return { personDocGroups: personGroups, unassignedDocs: unassigned };
  }, [applicants, documents, masterLookups]);

  return (
    <div className="app360-tab-pane">
      {/* PERSON-WISE APPLICANT DOCUMENT CARDS */}
      {personDocGroups.map(personGroup => {
        const { 
          applicantName, applicantPan, applicantMobile, 
          label, sequence, docCategories, totalDocTypes, totalFilesCount, verifiedCount 
        } = personGroup;

        return (
          <div key={sequence} className="app360-content-card app360-person-doc-card">
            {/* Person Document Card Header */}
            <div className="app360-person-doc-header">
              <div className="app360-person-header-left">
                <div className={`app360-avatar-sm ${sequence === 0 ? 'primary' : 'coapp'}`}>
                  {applicantName ? applicantName.charAt(0).toUpperCase() : <User size={18} />}
                </div>
                <div className="app360-person-title-wrap">
                  <div className="app360-person-title-row">
                    <span className={`app360-badge ${sequence === 0 ? 'app360-badge-primary' : 'app360-badge-outline'}`}>
                      {label}
                    </span>
                    <h3 className="app360-person-name">{applicantName}</h3>
                  </div>
                  <div className="app360-person-meta-row">
                    {applicantPan && (
                      <span className="app360-person-meta-tag">
                        PAN: <strong>{applicantPan}</strong>
                      </span>
                    )}
                    {applicantMobile && (
                      <span className="app360-person-meta-tag">
                        Mobile: <strong>{applicantMobile}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Document Summary Metrics */}
              <div className="app360-person-stats-pills">
                <span className="app360-stats-pill">
                  <strong>{totalDocTypes}</strong> Doc Types
                </span>
                <span className="app360-stats-pill">
                  <strong>{totalFilesCount}</strong> Total Files
                </span>
                <span className="app360-stats-pill success">
                  <CheckCircle size={12} />
                  <strong>{verifiedCount}</strong> Verified
                </span>
              </div>
            </div>

            {/* Person Document Table / List */}
            <div className="app360-card-body app360-p-0">
              {docCategories.length === 0 ? (
                <div className="app360-no-records-box">
                  <p className="app360-no-records">No KYC or supporting documents registered for this applicant.</p>
                </div>
              ) : (
                <div className="app360-table-wrapper">
                  <table className="app360-table app360-doc-table">
                    <thead>
                      <tr>
                        <th style={{ width: '26%' }}>Document Type & Info</th>
                        <th style={{ width: '28%' }}>Current / Latest File</th>
                        <th style={{ width: '12%' }}>Version</th>
                        <th style={{ width: '16%' }}>Verification Status</th>
                        <th style={{ width: '18%', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {docCategories.map(cat => {
                        const historyKey = `${sequence}_${cat.category}`;
                        const isHistoryOpen = Boolean(expandedHistories[historyKey]);
                        const latest = cat.latest;
                        const hasHistory = cat.history.length > 0;
                        const hasFile = Boolean(latest.serverPath || latest.docId);

                        return (
                          <React.Fragment key={cat.category}>
                            <tr className={isHistoryOpen ? 'app360-row-expanded' : ''}>
                              {/* 1. Document Type & Info */}
                              <td>
                                <div className="app360-doc-type-cell">
                                  <div className="app360-doc-type-icon-wrapper">
                                    {renderCategoryIcon(cat.category)}
                                  </div>
                                  <div className="app360-doc-type-details">
                                    <strong className="app360-doc-type-title">{cat.categoryTitle}</strong>
                                    {cat.identifier && (
                                      <span className="app360-doc-identifier">{cat.identifier}</span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* 2. Current / Latest File */}
                              <td>
                                <div className="app360-file-info-cell">
                                  <span className="app360-file-name" title={latest.fileName}>
                                    {latest.fileName}
                                  </span>
                                  <div className="app360-file-meta-small">
                                    <span>Uploaded: {formatDate(latest.modifiedAt || latest.createdAt)}</span>
                                    {latest.fileSize && (
                                      <span className="text-muted">({(latest.fileSize / 1024).toFixed(0)} KB)</span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* 3. Version Badge */}
                              <td>
                                <span className={`app360-version-badge ${cat.totalVersions > 1 ? 'updated' : 'original'}`}>
                                  Latest
                                </span>
                              </td>

                              {/* 4. Verification Status */}
                              <td>
                                <span className={`app360-status-badge ${latest.isVerified ? 'success' : 'pending'}`}>
                                  {latest.isVerified ? <CheckCircle size={12} /> : <Clock size={12} />}
                                  {latest.status}
                                </span>
                              </td>

                              {/* 5. Action Buttons */}
                              <td>
                                <div className="app360-doc-action-group">
                                  {hasFile ? (
                                    <>
                                      <button
                                        type="button"
                                        className="app360-btn-sm"
                                        onClick={() => handleOpenPreview({
                                          title: `${label} — ${cat.categoryTitle}`,
                                          docId: latest.docId,
                                          serverPath: latest.serverPath,
                                          fileName: latest.fileName
                                        })}
                                        title="Preview document in viewer"
                                      >
                                        <Eye size={13} /> View
                                      </button>
                                      <button
                                        type="button"
                                        className="app360-btn-sm app360-btn-outline"
                                        onClick={() => handleDownloadFile({
                                          title: `${label}_${cat.categoryTitle}`,
                                          docId: latest.docId,
                                          serverPath: latest.serverPath,
                                          fileName: latest.fileName,
                                          itemKey: latest.uniqueKey
                                        })}
                                        disabled={downloadingKeys[latest.uniqueKey]}
                                        title="Direct download"
                                      >
                                        {downloadingKeys[latest.uniqueKey] ? (
                                          <Loader2 size={13} className="app360-spinner" />
                                        ) : (
                                          <Download size={13} />
                                        )}
                                      </button>
                                    </>
                                  ) : (
                                    <span className="text-muted" style={{ fontSize: '12px' }}>No file</span>
                                  )}

                                  {/* Expandable History (N) Toggle */}
                                  {hasHistory && (
                                    <button
                                      type="button"
                                      className={`app360-btn-history ${isHistoryOpen ? 'active' : ''}`}
                                      onClick={() => toggleHistory(historyKey)}
                                      title={isHistoryOpen ? 'Hide version history' : 'Show previous versions'}
                                    >
                                      <History size={12} />
                                      <span>History ({cat.history.length})</span>
                                      {isHistoryOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>

                            {/* COLLAPSIBLE VERSION HISTORY DRAWER ROW */}
                            {hasHistory && isHistoryOpen && (
                              <tr className="app360-history-drawer-row">
                                <td colSpan={5} className="app360-history-drawer-cell">
                                  <div className="app360-history-container">
                                    <div className="app360-history-header">
                                      <History size={14} className="text-muted" />
                                      <span>Previous Versions History for <strong>{cat.categoryTitle}</strong> ({cat.history.length})</span>
                                    </div>
                                    <div className="app360-history-list">
                                      {cat.history.map((histDoc, hIdx) => {
                                        const versionNum = cat.totalVersions - (hIdx + 1);
                                        const hasHistFile = Boolean(histDoc.serverPath || histDoc.docId);

                                        return (
                                          <div key={histDoc.uniqueKey || hIdx} className="app360-history-item">
                                            <div className="app360-history-item-left">
                                              <span className="app360-history-vbadge">Earlier Upload (v{versionNum})</span>
                                              <div className="app360-history-item-details">
                                                <span className="app360-history-file-name" title={histDoc.fileName}>
                                                  {histDoc.fileName}
                                                </span>
                                                <span className="app360-history-meta">
                                                  Uploaded on: {formatDate(histDoc.modifiedAt || histDoc.createdAt)}
                                                  {histDoc.fileSize && ` • ${(histDoc.fileSize / 1024).toFixed(0)} KB`}
                                                </span>
                                              </div>
                                            </div>

                                            <div className="app360-history-item-right">
                                              <span className={`app360-status-badge ${histDoc.isVerified ? 'success' : 'pending'}`}>
                                                {histDoc.status}
                                              </span>
                                              {hasHistFile && (
                                                <div className="app360-history-actions">
                                                  <button
                                                    type="button"
                                                    className="app360-btn-sm"
                                                    onClick={() => handleOpenPreview({
                                                      title: `${label} — ${cat.categoryTitle} (v${versionNum})`,
                                                      docId: histDoc.docId,
                                                      serverPath: histDoc.serverPath,
                                                      fileName: histDoc.fileName
                                                    })}
                                                    title="View previous version"
                                                  >
                                                    <Eye size={12} /> View
                                                  </button>
                                                  <button
                                                    type="button"
                                                    className="app360-btn-sm app360-btn-outline"
                                                    onClick={() => handleDownloadFile({
                                                      title: `${label}_${cat.categoryTitle}_v${versionNum}`,
                                                      docId: histDoc.docId,
                                                      serverPath: histDoc.serverPath,
                                                      fileName: histDoc.fileName,
                                                      itemKey: histDoc.uniqueKey
                                                    })}
                                                    disabled={downloadingKeys[histDoc.uniqueKey]}
                                                    title="Download previous version"
                                                  >
                                                    {downloadingKeys[histDoc.uniqueKey] ? (
                                                      <Loader2 size={12} className="app360-spinner" />
                                                    ) : (
                                                      <Download size={12} />
                                                    )}
                                                  </button>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* GENERAL / UNASSIGNED DOCUMENTS (If any exist) */}
      {unassignedDocs.length > 0 && (
        <div className="app360-content-card app360-unassigned-card">
          <div className="app360-card-header">
            <div className="app360-card-title">
              <FolderArchive size={18} className="app360-card-icon" />
              <h3>General / Application Documents ({unassignedDocs.length})</h3>
            </div>
          </div>
          <div className="app360-card-body">
            <div className="app360-table-wrapper" style={{ maxHeight: '360px', overflowY: 'auto' }}>
              <table className="app360-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Document Name / Type</th>
                    <th>Upload Date</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {unassignedDocs.map((doc, idx) => {
                    const docId = doc.agentCustomerDocumentId || doc.id;
                    const docTypeName = doc.documentTypeId 
                      ? (masterLookups.documentTypes?.[doc.documentTypeId] || `Document Type #${doc.documentTypeId}`) 
                      : (doc.documentTypeName || doc.documentType);
                    const title = doc.fileName || doc.documentName || docTypeName || `Document ${idx + 1}`;
                    const docKey = `unassigned_${docId || idx}`;

                    return (
                      <tr key={docId || idx}>
                        <td>{idx + 1}</td>
                        <td>
                          <strong>{title}</strong>
                          {docTypeName && docTypeName !== title && (
                            <small className="app360-block-small text-muted">{docTypeName}</small>
                          )}
                        </td>
                        <td>{formatDate(doc.createdAt || doc.uploadedAt)}</td>
                        <td>
                          <span className="app360-badge">{doc.status || 'Uploaded'}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="app360-doc-action-group" style={{ justifyContent: 'flex-end' }}>
                            {docId ? (
                              <>
                                <button
                                  type="button"
                                  className="app360-btn-sm"
                                  onClick={() => handleOpenPreview({
                                    title: docTypeName || title,
                                    docId,
                                    fileName: doc.fileName || title
                                  })}
                                  title="Preview Document"
                                >
                                  <Eye size={13} /> View
                                </button>
                                <button
                                  type="button"
                                  className="app360-btn-sm app360-btn-outline"
                                  onClick={() => handleDownloadFile({
                                    title: docTypeName || title,
                                    docId,
                                    fileName: doc.fileName || title,
                                    itemKey: docKey
                                  })}
                                  disabled={downloadingKeys[docKey]}
                                  title="Download Document"
                                >
                                  {downloadingKeys[docKey] ? (
                                    <Loader2 size={13} className="app360-spinner" />
                                  ) : (
                                    <Download size={13} />
                                  )}
                                </button>
                              </>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Preview Modal with Authenticated Blob Viewer */}
      {(previewModal || isLoadingPreview) && (
        <div className="app360-modal-backdrop" onClick={handleClosePreview}>
          <div className="app360-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="app360-modal-header">
              <div className="app360-modal-title">
                <FileText size={18} />
                <h4>{previewModal?.title || 'Document Viewer'}</h4>
              </div>
              <div className="app360-modal-actions">
                {previewModal?.url && (
                  <>
                    <a
                      href={previewModal.url}
                      target="_blank"
                      rel="noreferrer"
                      className="app360-modal-btn"
                      title="Open in new window"
                    >
                      <ExternalLink size={15} /> Open in Tab
                    </a>
                    <a
                      href={previewModal.url}
                      download={previewModal.fileName || 'document'}
                      className="app360-modal-btn"
                      title="Download file"
                    >
                      <Download size={15} /> Download
                    </a>
                  </>
                )}
                <button
                  type="button"
                  className="app360-modal-close"
                  onClick={handleClosePreview}
                  aria-label="Close Preview"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="app360-modal-body">
              {isLoadingPreview && (
                <div className="app360-preview-fallback">
                  <Loader2 size={36} className="app360-spinner text-success" />
                  <p>Downloading secure document preview...</p>
                </div>
              )}

              {!isLoadingPreview && previewError && (
                <div className="app360-preview-fallback">
                  <AlertCircle size={36} className="text-danger" />
                  <p>{previewError}</p>
                  <button type="button" className="app360-btn-sm" onClick={handleClosePreview}>
                    Close
                  </button>
                </div>
              )}

              {!isLoadingPreview && !previewError && previewModal?.url && (
                previewModal.isPdf ? (
                  <iframe
                    src={previewModal.url}
                    title={previewModal.title}
                    className="app360-preview-frame"
                  />
                ) : previewModal.isImage ? (
                  <div className="app360-preview-img-wrapper">
                    <img
                      src={previewModal.url}
                      alt={previewModal.title}
                      className="app360-preview-img"
                    />
                  </div>
                ) : (
                  <div className="app360-preview-fallback">
                    <Archive size={48} className="text-muted" />
                    <p>Direct preview is not available for this file format.</p>
                    <a
                      href={previewModal.url}
                      download={previewModal.fileName || 'document'}
                      className="app360-btn-sm"
                    >
                      <Download size={14} /> Download File ({previewModal.fileName})
                    </a>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default KycDocumentsTab;
