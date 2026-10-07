import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Download, Eye, FolderOpen, RefreshCw, RotateCcw, ShieldCheck, Undo2 } from 'lucide-react';
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
  VERIFIED: { label: 'Verified', tone: 'success' },
  PENDING: { label: 'Pending Review', tone: 'neutral' },
  RETURNED: { label: 'Returned to RM', tone: 'danger' },
  RESUBMITTED: { label: 'Resubmitted', tone: 'warning' },
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
    // A rejection points at the rejected proof id; after resubmission its CurrentDocumentPath is
    // the corrected proof's file, which is a new record.
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
            ) : section.categories.map((category) => (
              <div key={category.key} className="bo-cpv-category">
                <div className="bo-cpv-category-name">
                  {category.name}
                  <span className="bo-cpv-category-count">
                    {category.rows.filter((r) => r.status === STATUS.VERIFIED).length}/{category.rows.length}
                  </span>
                </div>

                {category.rows.map(({ proof, latestRejection, status }) => {
                  const key = `proof-${proof.customerDocumentProofId}`;
                  const title = proofName(proof.proofId);
                  const message = messages[key];
                  const isRejecting = rejectTarget?.key === key;
                  return (
                    <div key={key} className="bo-cpv-proof">
                      <div className="bo-cpv-proof-main">
                        <div className="bo-cpv-proof-info">
                          <div className="bo-cpv-proof-title-row">
                            <span className="bo-cpv-proof-title">{title}</span>
                            <span className={`bo-cpv-badge is-${status.tone}`}>{status.label}</span>
                          </div>
                          <span className="bo-cpv-proof-meta">
                            {proof.fileName || 'File'}
                            {proof.createdAt ? ` · Uploaded ${formatDateTime(proof.createdAt)}` : ''}
                            {status === STATUS.VERIFIED && proof.verifiedAt ? ` · Verified ${formatDateTime(proof.verifiedAt)}` : ''}
                          </span>
                          {status === STATUS.RETURNED && latestRejection?.rejectionRemarks && (
                            <span className="bo-cpv-proof-remarks">Returned: {latestRejection.rejectionRemarks}</span>
                          )}
                        </div>
                        <div className="bo-cpv-actions">
                          <button
                            type="button"
                            className="bo-cpv-btn"
                            disabled={Boolean(busy)}
                            onClick={() => runAction(key, 'view', () => openDocument(loaderFor(proof), proof.fileName))}
                          >
                            <Eye size={14} /> View
                          </button>
                          <button
                            type="button"
                            className="bo-cpv-btn"
                            disabled={Boolean(busy)}
                            onClick={() => runAction(key, 'download', () => downloadDocument(loaderFor(proof), proof.fileName))}
                          >
                            <Download size={14} /> Download
                          </button>
                          {status === STATUS.RESUBMITTED && latestRejection && (
                            <button
                              type="button"
                              className="bo-cpv-btn is-success"
                              disabled={Boolean(busy)}
                              onClick={() => handleVerifyResubmission(key, latestRejection)}
                            >
                              <ShieldCheck size={14} /> {isBusy(key, 'verify-resubmission') ? 'Verifying…' : 'Verify'}
                            </button>
                          )}
                          {status === STATUS.PENDING && (
                            <button
                              type="button"
                              className="bo-cpv-btn is-success"
                              disabled={Boolean(busy)}
                              onClick={() => handleVerify(key, proof, true)}
                            >
                              <CheckCircle2 size={14} /> {isBusy(key, 'verify') ? 'Verifying…' : 'Verify'}
                            </button>
                          )}
                          {status === STATUS.VERIFIED && (
                            <button
                              type="button"
                              className="bo-cpv-btn"
                              disabled={Boolean(busy)}
                              onClick={() => handleVerify(key, proof, false)}
                            >
                              <Undo2 size={14} /> {isBusy(key, 'unverify') ? 'Resetting…' : 'Unverify'}
                            </button>
                          )}
                          {status !== STATUS.RETURNED && (
                            <button
                              type="button"
                              className="bo-cpv-btn is-danger"
                              disabled={Boolean(busy) || isRejecting}
                              onClick={() => setRejectTarget({ key, remarks: '', error: '' })}
                            >
                              <RotateCcw size={14} /> {status === STATUS.PENDING ? 'Reject' : 'Reject Again'}
                            </button>
                          )}
                        </div>
                      </div>

                      {isRejecting && (
                        <div className="bo-cpv-reject">
                          <label className="bo-cpv-reject-label" htmlFor={`${key}-remarks`}>Rejection remarks for RM</label>
                          <textarea
                            id={`${key}-remarks`}
                            className="bo-cpv-reject-input"
                            rows={2}
                            value={rejectTarget.remarks}
                            onChange={(e) => setRejectTarget((prev) => ({ ...prev, remarks: e.target.value, error: '' }))}
                          />
                          {rejectTarget.error && <p className="bo-cpv-message is-error">{rejectTarget.error}</p>}
                          <div className="bo-cpv-reject-actions">
                            <button type="button" className="bo-cpv-btn" onClick={() => setRejectTarget(null)} disabled={isBusy(key, 'reject')}>
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="bo-cpv-btn is-danger-solid"
                              onClick={() => handleReject(key, proof, title)}
                              disabled={isBusy(key, 'reject')}
                            >
                              {isBusy(key, 'reject') ? 'Returning…' : 'Return to RM'}
                            </button>
                          </div>
                        </div>
                      )}

                      {message && <p className={`bo-cpv-message is-${message.type}`}>{message.text}</p>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
