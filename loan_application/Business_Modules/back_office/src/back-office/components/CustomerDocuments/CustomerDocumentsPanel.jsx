import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  FolderOpen,
  History,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Undo2,
  X,
} from 'lucide-react';
import {
  REJECTION_STATUS,
  applicantLabel,
  downloadAgentCustomerDocument,
  downloadCustomerDocumentProof,
  downloadDocumentByPath,
  getCustomerDocumentTypes,
  getProofCategories,
  getProofs,
  getRejectionsByApplication,
  hasValue,
  isCustomerFlowRejection,
  loadCombinedCustomerDocuments,
  normalizeCustomerDocumentType,
  rejectCustomerDocumentProof,
  rejectCustomerPageDocument,
  sameId,
  sortByLatest,
  sortRejectionsByLatest,
  verifyRejection,
} from '../../../../../../Core/src/services/customerDocumentService';
import { downloadDocument, openDocument, readApiError } from '../../../../../../Core/src/utils/documentFileActions';
import './CustomerDocumentsPanel.css';

function normalizeStoredPath(path) {
  return String(path || '').trim().replace(/\\/g, '/').replace(/^\/+/, '').toLowerCase();
}

const STATUS_META = {
  [REJECTION_STATUS.RETURNED]: { label: 'Returned to RM', tone: 'danger' },
  [REJECTION_STATUS.RESUBMITTED]: { label: 'Resubmitted', tone: 'warning' },
  [REJECTION_STATUS.VERIFIED]: { label: 'Verified', tone: 'success' },
};

function statusMeta(status) {
  return STATUS_META[status] || { label: 'Pending Review', tone: 'neutral' };
}

function formatDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function fileName(path) {
  return path ? String(path).replace(/\\/g, '/').split('/').pop() : '';
}

/**
 * Back Office view of every applicant and co-applicant document:
 *   - customer-page documents (AgentCustomerDocument, CustomerDocumentTypeId)
 *   - RM-uploaded proofs (CustomerDocumentProof, ApplicantSequence)
 * with BackOfficeDocumentRejection cycles (reject -> RM resubmit -> verify / reject again).
 */
export default function CustomerDocumentsPanel({
  open,
  onClose,
  agentCustomerId,
  applicationProductDetailsId,
  rmId,
  backOfficeId,
  applicants = [],
  onChanged,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadErrors, setLoadErrors] = useState([]);
  const [customerPageDocs, setCustomerPageDocs] = useState([]);
  const [proofDocs, setProofDocs] = useState([]);
  const [rejections, setRejections] = useState([]);
  const [categories, setCategories] = useState([]);
  const [proofCategories, setProofCategories] = useState([]);
  const [proofs, setProofs] = useState([]);

  const [rejectTarget, setRejectTarget] = useState(null); // { key, remarks, error }
  const [busy, setBusy] = useState(null); // { key, action }
  const [messages, setMessages] = useState({}); // { [key]: { type, text } }
  const [expanded, setExpanded] = useState({});
  const loadRequestRef = useRef(0);
  const mastersLoadedRef = useRef(false);

  const load = useCallback(async () => {
    if (!hasValue(agentCustomerId)) return;
    const requestId = ++loadRequestRef.current;
    setIsLoading(true);
    setLoadErrors([]);

    const mastersPromise = mastersLoadedRef.current
      ? Promise.resolve(null)
      : Promise.allSettled([getCustomerDocumentTypes(), getProofCategories(), getProofs()]);

    const [documents, rejectionResult, masters] = await Promise.all([
      loadCombinedCustomerDocuments({ agentCustomerId, applicationProductDetailsId }),
      hasValue(applicationProductDetailsId)
        ? getRejectionsByApplication(applicationProductDetailsId).then(
          (rows) => ({ rows }),
          (error) => ({ rows: [], error })
        )
        : Promise.resolve({ rows: [] }),
      mastersPromise,
    ]);
    if (requestId !== loadRequestRef.current) return;

    const errors = [];
    for (const { source, error } of documents.errors) {
      errors.push(await readApiError(error, `Unable to load ${source === 'AgentCustomerDocument' ? 'customer-page documents' : 'proof documents'}.`));
    }
    if (rejectionResult.error) {
      errors.push(await readApiError(rejectionResult.error, 'Unable to load rejection history.'));
    }

    if (masters) {
      const [categoryRes, proofCategoryRes, proofRes] = masters;
      if (categoryRes.status === 'fulfilled') setCategories(categoryRes.value.map(normalizeCustomerDocumentType));
      if (proofCategoryRes.status === 'fulfilled') setProofCategories(proofCategoryRes.value);
      if (proofRes.status === 'fulfilled') setProofs(proofRes.value);
      mastersLoadedRef.current = masters.every((m) => m.status === 'fulfilled');
    }

    setCustomerPageDocs(documents.customerPageDocs);
    setProofDocs(documents.proofDocs);
    setRejections(rejectionResult.rows.filter((r) => r.isActive && isCustomerFlowRejection(r)));
    setLoadErrors(errors);
    setIsLoading(false);
  }, [agentCustomerId, applicationProductDetailsId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onClose]);

  const categoryName = useCallback(
    (id) => categories.find((c) => sameId(c.customerDocumentTypeId, id))?.documentTypeName,
    [categories]
  );
  const proofCategoryName = useCallback(
    (id) => proofCategories.find((c) => sameId(c.documentTypeId, id))?.documentTypeName,
    [proofCategories]
  );
  const proofName = useCallback(
    (id) => proofs.find((p) => sameId(p.proofId, id))?.proofName,
    [proofs]
  );

  const sections = useMemo(() => {
    // Customer-page documents: one group per category; the newest file is current and
    // older uploads stay listed as previous versions.
    const customerGroups = new Map();
    customerPageDocs.forEach((doc) => {
      const isCustomerFlow = hasValue(doc.customerDocumentTypeId);
      const key = isCustomerFlow
        ? `cdt-${doc.customerDocumentTypeId}`
        : `legacy-${doc.documentTypeId ?? doc.agentCustomerDocumentId}`;
      if (!customerGroups.has(key)) customerGroups.set(key, { key, kind: 'customer', isCustomerFlow, docs: [] });
      customerGroups.get(key).docs.push(doc);
    });

    const cpGroups = [...customerGroups.values()].map((group) => {
      const docs = [...group.docs].sort(sortByLatest);
      const current = docs.find((d) => d.isActive) || docs[0];
      const groupRejections = rejections
        .filter((r) => (group.isCustomerFlow && sameId(r.customerDocumentTypeId, current.customerDocumentTypeId))
          || docs.some((d) => sameId(d.agentCustomerDocumentId, r.agentCustomerDocumentId)))
        .sort(sortRejectionsByLatest);
      return {
        ...group,
        sequence: 0,
        current,
        versions: docs.filter((d) => d !== current),
        rejections: groupRejections,
        title: group.isCustomerFlow
          ? current.customerDocumentTypeName || categoryName(current.customerDocumentTypeId) || 'Customer Document'
          : current.documentTypeName || 'Document',
        subtitle: group.isCustomerFlow ? 'Customer page document' : 'Customer page document (legacy type)',
      };
    });

    const proofIds = new Set(proofDocs.map((p) => String(p.customerDocumentProofId)));
    const proofRejections = rejections.filter((r) => hasValue(r.customerDocumentProofId));
    const proofGroups = proofDocs.map((proof) => ({
      key: proof.key,
      kind: 'proof',
      isCustomerFlow: true,
      sequence: proof.applicantSequence,
      current: proof,
      versions: [],
      rejections: proofRejections.filter((r) => sameId(r.customerDocumentProofId, proof.customerDocumentProofId)),
      title: proofName(proof.proofId) || 'Proof Document',
      subtitle: [proofCategoryName(proof.documentTypeId), proof.verificationTypeCode].filter(Boolean).join(' · ') || 'Proof document',
    }));

    // A corrected proof is a new record, so earlier cycles reference a proof id that is no
    // longer active. Attach them to the applicant's current proof of the same category.
    const orphanBySequence = {};
    proofRejections
      .filter((r) => !proofIds.has(String(r.customerDocumentProofId)))
      .forEach((r) => {
        const target = proofGroups.find((g) => g.sequence === r.applicantSequence && sameId(g.current.documentTypeId, r.documentTypeId));
        if (target) target.rejections.push(r);
        else (orphanBySequence[r.applicantSequence] ||= []).push(r);
      });
    proofGroups.forEach((g) => g.rejections.sort(sortRejectionsByLatest));

    const names = new Map(applicants.map((a) => [Number(a.sequence) || 0, a.name]));
    const sequences = new Set([0, ...names.keys(), ...proofGroups.map((g) => g.sequence), ...Object.keys(orphanBySequence).map(Number)]);

    return [...sequences].sort((a, b) => a - b).map((sequence) => ({
      sequence,
      label: applicantLabel(sequence),
      name: names.get(sequence) || '',
      groups: [...(sequence === 0 ? cpGroups : []), ...proofGroups.filter((g) => g.sequence === sequence)],
      orphanRejections: (orphanBySequence[sequence] || []).sort(sortRejectionsByLatest),
    }));
  }, [customerPageDocs, proofDocs, rejections, applicants, categoryName, proofCategoryName, proofName]);

  const totals = useMemo(() => {
    const groups = sections.flatMap((s) => s.groups);
    const latest = groups.map((g) => g.rejections[0]?.status);
    return {
      documents: groups.length,
      returned: latest.filter((s) => s === REJECTION_STATUS.RETURNED).length,
      resubmitted: latest.filter((s) => s === REJECTION_STATUS.RESUBMITTED).length,
    };
  }, [sections]);

  const missingRejectContext = [
    !hasValue(applicationProductDetailsId) && 'application ID',
    !hasValue(rmId) && 'RM',
    !hasValue(backOfficeId) && 'Back Office ID',
  ].filter(Boolean);

  const setMessage = (key, type, text) => setMessages((prev) => ({ ...prev, [key]: text ? { type, text } : null }));

  const loaderFor = (doc) => (doc.source === 'CustomerDocumentProof'
    ? () => downloadCustomerDocumentProof(doc.customerDocumentProofId)
    : () => downloadAgentCustomerDocument(doc.agentCustomerDocumentId));

  // The path download endpoint only serves UploadedFiles/KYCDocuments, so history paths that
  // belong to a loaded proof or customer-page document are downloaded through that record.
  const docsByPath = useMemo(() => {
    const map = new Map();
    [...customerPageDocs, ...proofDocs].forEach((doc) => {
      const path = normalizeStoredPath(doc.filePath);
      if (path && !map.has(path)) map.set(path, doc);
    });
    return map;
  }, [customerPageDocs, proofDocs]);

  const pathLoader = (path) => {
    const doc = docsByPath.get(normalizeStoredPath(path));
    return doc ? loaderFor(doc) : () => downloadDocumentByPath(path);
  };

  const runFileAction = async (key, action, run) => {
    setBusy({ key, action });
    setMessage(key, null, null);
    try {
      await run();
    } catch (err) {
      setMessage(key, 'error', await readApiError(err, 'Unable to open this file.'));
    } finally {
      setBusy(null);
    }
  };

  const handleReject = async (group) => {
    const remarks = (rejectTarget?.remarks || '').trim();
    if (!remarks) {
      setRejectTarget((prev) => ({ ...prev, error: 'Rejection remarks are required.' }));
      return;
    }
    if (missingRejectContext.length > 0) {
      setRejectTarget((prev) => ({ ...prev, error: `Missing ${missingRejectContext.join(', ')}. Unable to create the rejection.` }));
      return;
    }

    setBusy({ key: group.key, action: 'reject' });
    try {
      const context = { rmId, applicationProductDetailsId, backOfficeId, rejectionRemarks: remarks };
      if (group.kind === 'customer') {
        await rejectCustomerPageDocument({ ...context, document: group.current });
      } else {
        await rejectCustomerDocumentProof({
          ...context,
          proof: group.current,
          agentCustomerId,
          rejectedDocumentType: 'CUSTOMER_PROOF',
        });
      }
      setRejectTarget(null);
      setMessage(group.key, 'success', `${group.title} returned to RM.`);
      await load();
      onChanged?.();
    } catch (err) {
      const message = await readApiError(err, 'Unable to reject this document.');
      setRejectTarget((prev) => (prev?.key === group.key ? { ...prev, error: message } : prev));
    } finally {
      setBusy(null);
    }
  };

  const handleVerify = async (group, rejection) => {
    if (!hasValue(backOfficeId)) {
      setMessage(group.key, 'error', 'Back Office ID is not available. Please sign in again.');
      return;
    }
    setBusy({ key: group.key, action: 'verify' });
    setMessage(group.key, null, null);
    try {
      await verifyRejection(rejection.backOfficeDocumentRejectionId, backOfficeId);
      setMessage(group.key, 'success', `${group.title} verified. The rejection cycle is closed.`);
      await load();
      onChanged?.();
    } catch (err) {
      setMessage(group.key, 'error', await readApiError(err, 'Unable to verify this document.'));
    } finally {
      setBusy(null);
    }
  };

  if (!open) return null;

  const renderPathLink = (key, path, label) => (path ? (
    <button
      type="button"
      className="bo-cdp-path"
      title={path}
      onClick={() => runFileAction(key, 'path', () => openDocument(pathLoader(path), fileName(path)))}
    >
      <span className="bo-cdp-path-label">{label}</span>
      <span className="bo-cdp-path-value">{fileName(path)}</span>
    </button>
  ) : (
    <span className="bo-cdp-path is-empty">
      <span className="bo-cdp-path-label">{label}</span>
      <span className="bo-cdp-path-value">—</span>
    </span>
  ));

  const renderRejectionHistory = (key, list) => (
    <ol className="bo-cdp-cycles">
      {[...list].reverse().map((r, index) => {
        const meta = statusMeta(r.status);
        return (
          <li key={r.backOfficeDocumentRejectionId} className="bo-cdp-cycle">
            <div className="bo-cdp-cycle-head">
              <span className="bo-cdp-cycle-no">Cycle {index + 1}</span>
              <span className={`bo-cdp-badge is-${meta.tone}`}>{meta.label}</span>
            </div>
            <p className="bo-cdp-cycle-remarks">{r.rejectionRemarks || 'No remarks recorded.'}</p>
            <div className="bo-cdp-cycle-times">
              <span>Rejected: {formatDateTime(r.rejectedAt) || '—'}</span>
              <span>Resubmitted: {formatDateTime(r.resubmittedAt) || '—'}</span>
              <span>Verified: {formatDateTime(r.verifiedAt) || '—'}</span>
            </div>
            <div className="bo-cdp-cycle-paths">
              {renderPathLink(key, r.originalDocumentPath, 'Original')}
              {renderPathLink(key, r.currentDocumentPath, 'Current')}
            </div>
          </li>
        );
      })}
    </ol>
  );

  const renderGroup = (group) => {
    const { key, current } = group;
    const latest = group.rejections[0];
    const meta = statusMeta(latest?.status);
    const isBusy = busy?.key === key;
    const isRejecting = rejectTarget?.key === key;
    const canReject = group.isCustomerFlow && latest?.status !== REJECTION_STATUS.RETURNED;
    const isResubmitted = latest?.status === REJECTION_STATUS.RESUBMITTED;
    const historyCount = group.rejections.length + group.versions.length;
    const message = messages[key];

    return (
      <li key={key} className="bo-cdp-doc">
        <div className="bo-cdp-doc-main">
          <div className="bo-cdp-doc-icon"><FileText size={18} /></div>
          <div className="bo-cdp-doc-info">
            <div className="bo-cdp-doc-title-row">
              <span className="bo-cdp-doc-title">{group.title}</span>
              <span className={`bo-cdp-source is-${group.kind}`}>{group.kind === 'customer' ? 'Customer Page' : 'RM Proof'}</span>
              <span className={`bo-cdp-badge is-${meta.tone}`}>{meta.label}</span>
            </div>
            <span className="bo-cdp-doc-sub">{group.subtitle}</span>
            <span className="bo-cdp-doc-file" title={current.filePath}>
              {current.fileName || 'File'}{current.createdAt ? ` · Uploaded ${formatDateTime(current.createdAt)}` : ''}
            </span>
          </div>
          <div className="bo-cdp-doc-actions">
            <button
              type="button"
              className="bo-cdp-btn"
              disabled={isBusy}
              onClick={() => runFileAction(key, 'view', () => openDocument(loaderFor(current), current.fileName))}
            >
              <Eye size={13} /> {isBusy && busy.action === 'view' ? 'Opening...' : 'View'}
            </button>
            <button
              type="button"
              className="bo-cdp-btn"
              disabled={isBusy}
              onClick={() => runFileAction(key, 'download', () => downloadDocument(loaderFor(current), current.fileName))}
            >
              <Download size={13} /> Download
            </button>
            {isResubmitted && (
              <button
                type="button"
                className="bo-cdp-btn is-success"
                disabled={isBusy}
                onClick={() => handleVerify(group, latest)}
              >
                <ShieldCheck size={13} /> {isBusy && busy.action === 'verify' ? 'Verifying...' : 'Verify'}
              </button>
            )}
            {canReject && (
              <button
                type="button"
                className="bo-cdp-btn is-danger"
                disabled={isBusy || isRejecting}
                onClick={() => setRejectTarget({ key, remarks: '', error: '' })}
              >
                {isResubmitted ? <RotateCcw size={13} /> : <Undo2 size={13} />}
                {isResubmitted ? 'Reject Again' : 'Reject'}
              </button>
            )}
            {historyCount > 0 && (
              <button
                type="button"
                className={`bo-cdp-btn ${expanded[key] ? 'is-active' : ''}`}
                onClick={() => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))}
              >
                <History size={13} /> History ({historyCount})
              </button>
            )}
          </div>
        </div>

        {!group.isCustomerFlow && (
          <p className="bo-cdp-note">Uploaded with a legacy document type. Review it in the verification steps.</p>
        )}
        {latest?.status === REJECTION_STATUS.RETURNED && (
          <p className="bo-cdp-note is-warning">Awaiting RM correction: “{latest.rejectionRemarks}”</p>
        )}

        {isRejecting && (
          <div className="bo-cdp-reject">
            <label className="bo-cdp-reject-label" htmlFor={`bo-cdp-remarks-${key}`}>
              {isResubmitted ? 'Start another rejection cycle — remarks for RM' : 'Rejection remarks for RM'}
            </label>
            <textarea
              id={`bo-cdp-remarks-${key}`}
              className="bo-cdp-textarea"
              rows={3}
              maxLength={1000}
              value={rejectTarget.remarks}
              placeholder="e.g. Address proof is not clear"
              onChange={(e) => setRejectTarget((prev) => ({ ...prev, remarks: e.target.value, error: '' }))}
              disabled={isBusy}
            />
            {rejectTarget.error && <span className="bo-cdp-error">{rejectTarget.error}</span>}
            <div className="bo-cdp-reject-actions">
              <button type="button" className="bo-cdp-btn" onClick={() => setRejectTarget(null)} disabled={isBusy}>Cancel</button>
              <button type="button" className="bo-cdp-btn is-danger is-solid" onClick={() => handleReject(group)} disabled={isBusy}>
                {isBusy && busy.action === 'reject' ? 'Returning...' : 'Return to RM'}
              </button>
            </div>
          </div>
        )}

        {expanded[key] && (
          <div className="bo-cdp-history">
            {group.versions.length > 0 && (
              <>
                <h5 className="bo-cdp-history-title">Previous file versions</h5>
                <ul className="bo-cdp-versions">
                  {group.versions.map((version) => (
                    <li key={version.key} className="bo-cdp-version">
                      <span className="bo-cdp-version-name" title={version.filePath}>{version.fileName || 'File'}</span>
                      <span className="bo-cdp-version-date">{formatDateTime(version.createdAt)}</span>
                      <button
                        type="button"
                        className="bo-cdp-btn is-compact"
                        disabled={isBusy}
                        onClick={() => runFileAction(key, 'version', () => openDocument(loaderFor(version), version.fileName))}
                      >
                        <Eye size={12} /> View
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {group.rejections.length > 0 && (
              <>
                <h5 className="bo-cdp-history-title">Rejection history</h5>
                {renderRejectionHistory(key, group.rejections)}
              </>
            )}
          </div>
        )}

        {message && (
          <div className={`bo-cdp-message is-${message.type}`} role={message.type === 'error' ? 'alert' : 'status'}>
            {message.type === 'error' ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
            <span>{message.text}</span>
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="bo-cdp-overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="bo-cdp-dialog" role="dialog" aria-modal="true" aria-labelledby="bo-cdp-title">
        <header className="bo-cdp-header">
          <div>
            <h2 id="bo-cdp-title" className="bo-cdp-title">Applicant &amp; Co-Applicant Documents</h2>
            <p className="bo-cdp-subtitle">
              {totals.documents} documents · {totals.returned} returned to RM · {totals.resubmitted} awaiting verification
            </p>
          </div>
          <div className="bo-cdp-header-actions">
            <button type="button" className="bo-cdp-btn" onClick={load} disabled={isLoading}>
              <RefreshCw size={13} className={isLoading ? 'bo-cdp-spin' : ''} /> Refresh
            </button>
            <button type="button" className="bo-cdp-close" onClick={onClose} aria-label="Close" disabled={Boolean(busy)}>
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="bo-cdp-body">
          {loadErrors.map((error) => (
            <div key={error} className="bo-cdp-message is-error" role="alert">
              <AlertCircle size={14} /> <span>{error}</span>
            </div>
          ))}
          {missingRejectContext.length > 0 && !isLoading && (
            <div className="bo-cdp-message is-warning" role="status">
              <AlertCircle size={14} />
              <span>Missing {missingRejectContext.join(', ')}. Documents can be reviewed, but rejections cannot be created.</span>
            </div>
          )}

          {isLoading && sections.every((s) => s.groups.length === 0) ? (
            <div className="bo-cdp-empty"><RefreshCw size={20} className="bo-cdp-spin" /><span>Loading documents...</span></div>
          ) : (
            sections.map((section) => (
              <section key={section.sequence} className="bo-cdp-section">
                <h3 className="bo-cdp-section-title">
                  {section.label}
                  {section.name && <span className="bo-cdp-section-name">{section.name}</span>}
                  <span className="bo-cdp-section-seq">Seq {section.sequence}</span>
                </h3>
                {section.groups.length === 0 ? (
                  <div className="bo-cdp-empty is-inline"><FolderOpen size={16} /><span>No documents uploaded for this {section.sequence === 0 ? 'applicant' : 'co-applicant'}.</span></div>
                ) : (
                  <ul className="bo-cdp-docs">{section.groups.map(renderGroup)}</ul>
                )}
                {section.orphanRejections.length > 0 && (
                  <div className="bo-cdp-history is-standalone">
                    <h5 className="bo-cdp-history-title">Earlier proof rejection history</h5>
                    {renderRejectionHistory(`orphan-${section.sequence}`, section.orphanRejections)}
                    {messages[`orphan-${section.sequence}`] && (
                      <div className="bo-cdp-message is-error" role="alert">
                        <AlertCircle size={14} /> <span>{messages[`orphan-${section.sequence}`].text}</span>
                      </div>
                    )}
                  </div>
                )}
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
