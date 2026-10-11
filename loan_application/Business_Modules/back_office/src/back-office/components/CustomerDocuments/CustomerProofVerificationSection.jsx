import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Eye, FileText, FolderOpen, RefreshCw, RotateCcw, X } from 'lucide-react';
import {
  REJECTION_STATUS,
  applicantLabel,
  downloadCustomerDocumentProof,
  getCustomerDocumentProofs,
  getProofCategories,
  getProofs,
  getRejectionsByApplication,
  hasValue,
  rejectCustomerDocumentProof,
  sameId,
  sortByLatest,
  sortRejectionsByLatest,
  verifyCustomerDocumentProof,
  verifyRejection,
} from '../../../../../../Core/src/services/customerDocumentService';
import { downloadDocument, openDocument, readApiError } from '../../../../../../Core/src/utils/documentFileActions';
import './CustomerProofVerificationSection.css';

const STATUS = {
  VERIFIED: { label: 'Verified', tone: 'verified' },
  PENDING: { label: 'Pending Review', tone: 'pending' },
  RETURNED: { label: 'Returned to RM', tone: 'returned' },
  RESUBMITTED: { label: 'Resubmitted', tone: 'resubmitted' },
};

function normalizePath(path) {
  return String(path || '').trim().replace(/\\/g, '/').replace(/^\/+/, '').toLowerCase();
}

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return null;
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function isPdfFile(fileName = '') {
  return String(fileName).toLowerCase().endsWith('.pdf');
}

function isImageFile(fileName = '') {
  const lower = String(fileName).toLowerCase();
  return lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp');
}

/**
 * Step 02 "Customer Proofs": every active RM-uploaded proof (CustomerDocumentProof) per applicant,
 * grouped by proof category, with View / Download / Verify / Return to RM and resubmission verify.
 */
export default function CustomerProofVerificationSection({
  agentCustomerId,
  applicationProductDetailsId,
  rmId,
  backOfficeId,
  applicants = [],
  onChanged,
}) {
  const [proofs, setProofs] = useState([]);
  const [rejections, setRejections] = useState([]);
  const [categories, setCategories] = useState([]);
  const [proofMasters, setProofMasters] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(null);
  const [messages, setMessages] = useState({});
  const [rejectTarget, setRejectTarget] = useState(null);

  const load = useCallback(async () => {
    if (!hasValue(agentCustomerId)) return;
    setIsLoading(true);
    setLoadError('');
    try {
      const [proofRows, rejectionRows, categoryRows, proofRowsMaster] = await Promise.all([
        getCustomerDocumentProofs({ agentCustomerId, applicationProductDetailsId }),
        hasValue(applicationProductDetailsId) ? getRejectionsByApplication(applicationProductDetailsId) : Promise.resolve([]),
        getProofCategories().catch(() => []),
        getProofs().catch(() => []),
      ]);
      setProofs(proofRows.filter((p) => p.isActive
        && sameId(p.agentCustomerId ?? agentCustomerId, agentCustomerId)
        && (!hasValue(applicationProductDetailsId) || !hasValue(p.applicationProductDetailsId)
          || sameId(p.applicationProductDetailsId, applicationProductDetailsId))));
      setRejections(rejectionRows.filter((r) => r.isActive && hasValue(r.customerDocumentProofId)));
      setCategories(categoryRows);
      setProofMasters(proofRowsMaster);
    } catch (err) {
      setLoadError(await readApiError(err, 'Unable to load customer proofs.'));
    } finally {
      setIsLoading(false);
    }
  }, [agentCustomerId, applicationProductDetailsId]);

  useEffect(() => {
    load();
  }, [load]);

  const categoryName = useCallback(
    (id) => categories.find((c) => sameId(c.documentTypeId, id))?.documentTypeName || 'Other',
    [categories]
  );
  const proofName = useCallback(
    (id) => proofMasters.find((p) => sameId(p.proofId, id))?.proofName || 'Proof',
    [proofMasters]
  );

  const sections = useMemo(() => {
    const rejectionsFor = (proof) => rejections
      .filter((r) => sameId(r.customerDocumentProofId, proof.customerDocumentProofId)
        || (r.currentDocumentPath && normalizePath(r.currentDocumentPath) === normalizePath(proof.filePath)))
      .sort(sortRejectionsByLatest);

    const rows = proofs.map((proof) => {
      const latestRejection = rejectionsFor(proof)[0] || null;
      let status = proof.isVerified ? STATUS.VERIFIED : STATUS.PENDING;
      if (latestRejection?.status === REJECTION_STATUS.RETURNED) status = STATUS.RETURNED;
      else if (latestRejection?.status === REJECTION_STATUS.RESUBMITTED) status = STATUS.RESUBMITTED;
      return { proof, latestRejection, status };
    });

    const names = new Map(applicants.map((a) => [Number(a.sequence) || 0, a.name]));
    const sequences = [...new Set([...names.keys(), ...rows.map((r) => r.proof.applicantSequence)])].sort((a, b) => a - b);

    return sequences.map((sequence) => {
      const personRows = rows.filter((r) => r.proof.applicantSequence === sequence);
      const byCategory = new Map();
      [...personRows]
        .sort((a, b) => sortByLatest(a.proof, b.proof))
        .forEach((row) => {
          const key = String(row.proof.documentTypeId ?? 'other');
          if (!byCategory.has(key)) byCategory.set(key, { key, name: categoryName(row.proof.documentTypeId), rows: [] });
          byCategory.get(key).rows.push(row);
        });
      return {
        sequence,
        label: applicantLabel(sequence),
        name: names.get(sequence) || '',
        categories: [...byCategory.values()],
        total: personRows.length,
        verified: personRows.filter((r) => r.status === STATUS.VERIFIED).length,
      };
    });
  }, [proofs, rejections, applicants, categoryName]);

  const totals = useMemo(() => ({
    total: sections.reduce((sum, s) => sum + s.total, 0),
    verified: sections.reduce((sum, s) => sum + s.verified, 0),
  }), [sections]);

  const setMessage = (key, type, text) => setMessages((prev) => ({ ...prev, [key]: text ? { type, text } : null }));

  const runAction = async (key, action, run, { successText, reload = false } = {}) => {
    setBusy({ key, action });
    setMessage(key, null, null);
    try {
      await run();
      if (successText) setMessage(key, 'success', successText);
      if (reload) {
        await load();
        onChanged?.();
      }
      return true;
    } catch (err) {
      setMessage(key, 'error', await readApiError(err, 'The action could not be completed.'));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const loaderFor = (proof) => () => downloadCustomerDocumentProof(proof.customerDocumentProofId);

  const handleVerify = (key, proof, isVerified) => {
    if (!hasValue(backOfficeId)) {
      setMessage(key, 'error', 'Unable to identify the logged-in Back Office user. Please log in again.');
      return;
    }
    runAction(
      key,
      isVerified ? 'verify' : 'unverify',
      () => verifyCustomerDocumentProof(proof.customerDocumentProofId, { backOfficeId, isVerified }),
      { successText: isVerified ? 'Proof verified.' : 'Verification reset.', reload: true }
    );
  };

  const handleVerifyResubmission = (key, rejection) => {
    if (!hasValue(backOfficeId)) {
      setMessage(key, 'error', 'Unable to identify the logged-in Back Office user. Please log in again.');
      return;
    }
    runAction(
      key,
      'verify-resubmission',
      () => verifyRejection(rejection.backOfficeDocumentRejectionId, backOfficeId),
      { successText: 'Corrected proof verified.', reload: true }
    );
  };

  const handleReject = async (key, proof, title) => {
    const remarks = (rejectTarget?.remarks || '').trim();
    if (!remarks) {
      setRejectTarget((prev) => ({ ...prev, error: 'Rejection remarks are required.' }));
      return;
    }
    const missing = [
      !hasValue(applicationProductDetailsId) && 'application ID',
      !hasValue(rmId) && 'RM',
      !hasValue(backOfficeId) && 'Back Office ID',
    ].filter(Boolean);
    if (missing.length > 0) {
      setRejectTarget((prev) => ({ ...prev, error: `Missing ${missing.join(', ')}. Unable to return this proof.` }));
      return;
    }
    setBusy({ key, action: 'reject' });
    try {
      await rejectCustomerDocumentProof({
        proof,
        agentCustomerId,
        rmId,
        applicationProductDetailsId,
        backOfficeId,
        rejectionRemarks: remarks,
        rejectedDocumentType: 'CUSTOMER_PROOF',
      });
      setRejectTarget(null);
      setMessage(key, 'success', `${title} returned to RM.`);
      await load();
      onChanged?.();
    } catch (err) {
      const message = await readApiError(err, 'Unable to return this proof.');
      setRejectTarget((prev) => (prev?.key === key ? { ...prev, error: message } : prev));
    } finally {
      setBusy(null);
    }
  };

  const isBusy = (key, action) => busy?.key === key && (!action || busy.action === action);

  return (
    <div className="bo-cpv">
      <div className="bo-cpv-header">
        <div className="bo-cpv-header-left">
          <div className="bo-cpv-header-icon"><FolderOpen size={18} /></div>
          <div>
            <h3 className="bo-cpv-title">Customer Proofs</h3>
            <span className="bo-cpv-subtitle">RM-uploaded proofs by applicant and proof category</span>
          </div>
        </div>
        <div className="bo-cpv-header-right">
          <span className={`bo-cpv-count${totals.total > 0 && totals.verified === totals.total ? ' is-complete' : ''}`}>
            {totals.verified} of {totals.total} Verified
          </span>
          <button type="button" className="bo-cpv-icon-btn" onClick={load} disabled={isLoading} title="Refresh proofs">
            <RefreshCw size={14} className={isLoading ? 'is-spinning' : ''} />
          </button>
        </div>
      </div>

      <div className="bo-cpv-body">
        {loadError && <p className="bo-cpv-message is-error">{loadError}</p>}

        {!loadError && isLoading && proofs.length === 0 ? (
          <p className="bo-cpv-empty">Loading customer proofs…</p>
        ) : !loadError && totals.total === 0 ? (
          <p className="bo-cpv-empty">No customer proofs have been uploaded for this application.</p>
        ) : (
          sections.map((section) => (
            <div key={section.sequence} className="bo-cpv-person">
              <div className="bo-cpv-person-head">
                <span className="bo-cpv-person-label">{section.label}</span>
                {section.name && <span className="bo-cpv-person-name">{section.name}</span>}
                <span className="bo-cpv-person-count">{section.verified}/{section.total} verified</span>
              </div>

              {section.categories.length === 0 ? (
                <p className="bo-cpv-empty is-inline">No proofs uploaded.</p>
              ) : (
                section.categories.map((category) => (
                  <div key={category.key} className="bo-cpv-category">
                    <div className="bo-cpv-category-name">
                      {category.name}
                      <span className="bo-cpv-category-count">
                        {category.rows.filter((r) => r.status === STATUS.VERIFIED).length}/{category.rows.length}
                      </span>
                    </div>

                    <div className="bo-cv-doc-table-wrapper">
                      <table className="bo-cv-doc-table">
                        <thead>
                          <tr>
                            <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                            <th style={{ width: '180px' }}>Document</th>
                            <th style={{ width: '65px', textAlign: 'center' }}>Preview</th>
                            <th>File Name</th>
                            <th style={{ width: '115px', textAlign: 'center' }}>Verified</th>
                            <th style={{ width: '120px', textAlign: 'center' }}>Status</th>
                            <th style={{ width: '120px', textAlign: 'center' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {category.rows.map(({ proof, latestRejection, status }, idx) => {
                            const key = `proof-${proof.customerDocumentProofId}`;
                            const title = proofName(proof.proofId);
                            const isPdf = isPdfFile(proof.fileName);
                            const isImg = isImageFile(proof.fileName);
                            const fileSizeStr = formatFileSize(proof.fileSize);
                            const isVerifying = isBusy(key, 'verify') || isBusy(key, 'unverify') || isBusy(key, 'verify-resubmission');
                            const isCheckboxDisabled = Boolean(busy) || isVerifying || status === STATUS.RETURNED;

                            return (
                              <tr key={key} className="bo-cv-doc-tr">
                                <td className="bo-cv-doc-td-num">
                                  <span className="bo-cv-doc-num-badge">0{idx + 1}</span>
                                </td>
                                <td className="bo-cv-doc-td-type">
                                  <div className="bo-cv-doc-type-cell">
                                    <div className="bo-cv-doc-type-icon">
                                      <FileText size={15} />
                                    </div>
                                    <span className="bo-cv-doc-type-name">{title}</span>
                                  </div>
                                </td>
                                <td className="bo-cv-doc-td-thumb" style={{ textAlign: 'center' }}>
                                  <div
                                    className="bo-cv-doc-thumb-box is-clickable"
                                    onClick={() => runAction(key, 'view', () => openDocument(loaderFor(proof), proof.fileName))}
                                    title="Click to preview proof"
                                  >
                                    {isPdf ? (
                                      <div className="bo-cv-doc-thumb-pdf">PDF</div>
                                    ) : isImg ? (
                                      <div className="bo-cv-doc-thumb-placeholder">IMG</div>
                                    ) : (
                                      <div className="bo-cv-doc-thumb-placeholder">DOC</div>
                                    )}
                                    <div className="bo-cv-doc-thumb-hover-overlay">
                                      <Eye size={12} />
                                    </div>
                                  </div>
                                </td>
                                <td className="bo-cv-doc-td-details">
                                  <div className="bo-cv-doc-file-info">
                                    <span className="bo-cv-doc-filename" title={proof.fileName || 'Proof Document'}>
                                      {proof.fileName || 'Proof Document'}
                                    </span>
                                    <div className="bo-cv-doc-file-meta">
                                      {fileSizeStr && <span>{fileSizeStr}</span>}
                                      {fileSizeStr && proof.createdAt && <span>•</span>}
                                      {proof.createdAt && <span>{formatDateTime(proof.createdAt)}</span>}
                                      {status === STATUS.RETURNED && latestRejection?.rejectionRemarks && (
                                        <span className="bo-cpv-proof-remarks" style={{ display: 'block', color: '#dc2626' }}>
                                          Returned: {latestRejection.rejectionRemarks}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="bo-cv-doc-td-verify" style={{ textAlign: 'center' }}>
                                  <label
                                    className={`bo-cv-doc-verify-checkbox-label ${isCheckboxDisabled ? 'is-disabled' : ''} ${status === STATUS.VERIFIED ? 'is-checked' : ''}`}
                                    title={
                                      status === STATUS.RETURNED
                                        ? 'Cannot verify: Document is returned to RM'
                                        : status === STATUS.RESUBMITTED
                                        ? 'Click to verify resubmitted proof'
                                        : status === STATUS.VERIFIED
                                        ? 'Click to unverify proof'
                                        : 'Click to mark proof as verified'
                                    }
                                  >
                                    <input
                                      type="checkbox"
                                      className="bo-cv-doc-verify-checkbox"
                                      checked={status === STATUS.VERIFIED}
                                      disabled={isCheckboxDisabled}
                                      onChange={() => {
                                        if (status === STATUS.RESUBMITTED && latestRejection) {
                                          handleVerifyResubmission(key, latestRejection);
                                        } else {
                                          handleVerify(key, proof, status !== STATUS.VERIFIED);
                                        }
                                      }}
                                    />
                                    <span className={`bo-cv-doc-verify-checkbox-text ${status === STATUS.VERIFIED ? 'is-verified' : ''}`}>
                                      {status === STATUS.VERIFIED ? 'Verified' : ''}
                                    </span>
                                  </label>
                                </td>
                                <td className="bo-cv-doc-td-status" style={{ textAlign: 'center' }}>
                                  <span className={`bo-cv-status-badge bo-cv-status-badge--${status.tone}`}>
                                    <span className="bo-cv-badge-dot" />
                                    {status.label}
                                  </span>
                                </td>
                                <td className="bo-cv-doc-td-actions" style={{ textAlign: 'center' }}>
                                  <div className="bo-cv-doc-actions-group">
                                    <button
                                      type="button"
                                      className="bo-cv-doc-action-btn bo-cv-doc-action-btn--view"
                                      title="View proof"
                                      disabled={Boolean(busy)}
                                      onClick={() => runAction(key, 'view', () => openDocument(loaderFor(proof), proof.fileName))}
                                    >
                                      <Eye size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      className="bo-cv-doc-action-btn bo-cv-doc-action-btn--download"
                                      title="Download proof"
                                      disabled={Boolean(busy)}
                                      onClick={() => runAction(key, 'download', () => downloadDocument(loaderFor(proof), proof.fileName))}
                                    >
                                      <Download size={14} />
                                    </button>
                                    {status !== STATUS.RETURNED && (
                                      <button
                                        type="button"
                                        className="bo-cv-doc-action-btn bo-cv-doc-action-btn--return"
                                        title={status === STATUS.PENDING ? 'Return proof to RM' : 'Reject Again'}
                                        disabled={Boolean(busy) || rejectTarget?.key === key}
                                        onClick={() => setRejectTarget({ key, proof, title, remarks: '', error: '' })}
                                      >
                                        <RotateCcw size={14} />
                                      </button>
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
                ))
              )}
            </div>
          ))
        )}
      </div>

      {/* Return Document to RM Modal */}
      {rejectTarget && (
        <div
          className="bo-cv-confirm-modal-backdrop"
          onClick={() => !isBusy(rejectTarget.key, 'reject') && setRejectTarget(null)}
        >
          <div
            className="bo-cv-confirm-modal-card bo-cv-confirm-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="bo-cpv-reject-title"
          >
            <div className="bo-cv-confirm-modal-header">
              <div className="bo-cv-confirm-modal-icon-badge" style={{ background: '#fef2f2', color: '#dc2626' }}>
                <RotateCcw size={18} />
              </div>
              <div className="bo-cv-confirm-modal-title-group">
                <h3 id="bo-cpv-reject-title" className="bo-cv-confirm-modal-title">
                  Return Document to RM
                </h3>
                <p className="bo-cv-confirm-modal-subtitle">
                  Document: {rejectTarget.title}
                </p>
              </div>
              <button
                type="button"
                className="bo-cv-confirm-modal-close"
                onClick={() => setRejectTarget(null)}
                disabled={isBusy(rejectTarget.key, 'reject')}
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bo-cv-confirm-modal-body">
              <p className="bo-cv-confirm-modal-question">
                Are you sure you want to return this document to the RM?
              </p>

              <div className="bo-cv-confirm-remarks-block">
                <label className="bo-cv-confirm-remarks-label" htmlFor="proof-modal-remarks">
                  Remarks <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  id="proof-modal-remarks"
                  className={`bo-cv-confirm-remarks-textarea ${rejectTarget.error ? 'is-invalid' : ''}`}
                  value={rejectTarget.remarks || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setRejectTarget((prev) => ({
                      ...prev,
                      remarks: val,
                      error: val.trim() ? '' : prev.error,
                    }));
                  }}
                  placeholder="Enter rejection reason / remarks for RM..."
                  rows={3}
                  autoFocus
                />
                {rejectTarget.error && (
                  <div className="bo-cv-confirm-remarks-error">
                    {rejectTarget.error}
                  </div>
                )}
              </div>
            </div>

            <div className="bo-cv-confirm-modal-footer">
              <button
                type="button"
                className="bo-cv-confirm-btn-cancel"
                onClick={() => setRejectTarget(null)}
                disabled={isBusy(rejectTarget.key, 'reject')}
              >
                Cancel
              </button>
              <button
                type="button"
                className="bo-cv-confirm-btn-reject"
                onClick={() => handleReject(rejectTarget.key, rejectTarget.proof, rejectTarget.title)}
                disabled={isBusy(rejectTarget.key, 'reject')}
              >
                {isBusy(rejectTarget.key, 'reject') ? 'Sending...' : 'Send to RM'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
