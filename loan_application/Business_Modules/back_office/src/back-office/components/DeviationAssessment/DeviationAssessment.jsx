import { useCallback, useEffect, useMemo, useState } from 'react';
import backOfficeService from '../../api/backOfficeService';
import { MasterModal } from '../../../../../../Master_Module/src/components/masters/MasterModal/MasterModal';
import './DeviationAssessment.css';

const read = (row, keys, fallback = '—') =>
  keys.map((key) => row?.[key]).find((value) => value !== undefined && value !== null && value !== '') ?? fallback;

const unwrap = (value) =>
  Array.isArray(value) ? value : value?.data || value?.value || value?.result || [];

const active = (row) => {
  const value = read(row, ['isActive', 'IsActive', 'active', 'Active'], true);
  return value === true || value === 1 || value === '1';
};

const decisionId = (row) =>
  read(
    row,
    [
      'applicationDeviationDecisionId',
      'ApplicationDeviationDecisionId',
      'applicationCIRDeviationDecisionId',
      'ApplicationCIRDeviationDecisionId',
      'applicationNegativeFIDecisionId',
      'ApplicationNegativeFIDecisionId',
      'id',
      'Id',
    ],
    null
  );

const decisionValue = (row) => read(row, ['decision', 'Decision'], '');
const decisionRemarks = (row) => read(row, ['remarks', 'Remarks'], '');

const masterId = (row, type) =>
  read(
    row,
    type === 'general'
      ? ['deviationId', 'DeviationId', 'id', 'Id']
      : type === 'cir'
        ? ['cirDeviationId', 'CIRDeviationId', 'id', 'Id']
        : ['negativeFIDeviationId', 'NegativeFIDeviationId', 'id', 'Id'],
    null
  );

const decisionMasterId = (row, type) =>
  read(
    row,
    type === 'general'
      ? ['deviationId', 'DeviationId']
      : type === 'cir'
        ? ['cirDeviationId', 'CIRDeviationId']
        : ['negativeFIDeviationId', 'NegativeFIDeviationId'],
    null
  );

const getDeviationTitle = (row, type) => {
  if (!row) return 'Deviation Details';
  if (type === 'general') {
    return read(
      row,
      ['deviationDescription', 'DeviationDescription', 'description', 'Description', 'deviationNorms', 'DeviationNorms'],
      'General Deviation'
    );
  }
  if (type === 'cir') {
    return read(
      row,
      ['cirDeviationDescription', 'CIRDeviationDescription', 'deviationDescription', 'DeviationDescription', 'description', 'Description'],
      'CIR Deviation'
    );
  }
  return read(
    row,
    ['reasonDescription', 'ReasonDescription', 'negativeFIDescription', 'NegativeFIDescription', 'category', 'Category', 'description', 'Description'],
    'Negative FI Deviation'
  );
};

export default function DeviationAssessment({
  applicationProductDetailsId,
  backOfficeId,
  createdBy,
  showRefresh = true,
  canEdit = true,
  isCmLocked = false,
}) {
  const [masters, setMasters] = useState({ general: [], cir: [], negativeFi: [] });
  const [decisions, setDecisions] = useState({ general: [], cir: [], negativeFi: [] });
  const [savingKey, setSavingKey] = useState('');
  const [pendingDecisions, setPendingDecisions] = useState({});
  const [pendingRemarks, setPendingRemarks] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [error, setError] = useState('');
  const [missingRemarksTarget, setMissingRemarksTarget] = useState(null);

  // Row-specific popup state (purely client-side UI)
  const [activePopup, setActivePopup] = useState(null);
  const [popupRemarks, setPopupRemarks] = useState('');
  const [popupError, setPopupError] = useState('');
  const [justSavedKeys, setJustSavedKeys] = useState(new Set());

  const refreshCategoryDecisions = useCallback(
    async (type) => {
      if (!applicationProductDetailsId) return [];
      if (type === 'general') {
        const res = unwrap(await backOfficeService.getApplicationDeviationDecisions(applicationProductDetailsId));
        setDecisions((prev) => ({ ...prev, general: res }));
        return res;
      }
      if (type === 'cir') {
        const res = unwrap(await backOfficeService.getApplicationCIRDeviationDecisions(applicationProductDetailsId));
        setDecisions((prev) => ({ ...prev, cir: res }));
        return res;
      }
      if (type === 'negativeFi') {
        const res = unwrap(await backOfficeService.getApplicationNegativeFIDecisions(applicationProductDetailsId));
        setDecisions((prev) => ({ ...prev, negativeFi: res }));
        return res;
      }
      return [];
    },
    [applicationProductDetailsId]
  );

  const load = useCallback(
    async (preservePending = false) => {
      if (!applicationProductDetailsId) return;
      setError('');
      try {
        const [general, cir, negativeFi, generalDecisions, cirDecisions, negativeFiDecisions] = await Promise.all([
          backOfficeService.getDeviationMasters(),
          backOfficeService.getCIRDeviationMasters(),
          backOfficeService.getNegativeFIDeviationMasters(),
          backOfficeService.getApplicationDeviationDecisions(applicationProductDetailsId),
          backOfficeService.getApplicationCIRDeviationDecisions(applicationProductDetailsId),
          backOfficeService.getApplicationNegativeFIDecisions(applicationProductDetailsId),
        ]);
        setMasters({
          general: unwrap(general).filter(active),
          cir: unwrap(cir).filter(active),
          negativeFi: unwrap(negativeFi).filter(active),
        });
        setDecisions({
          general: unwrap(generalDecisions),
          cir: unwrap(cirDecisions),
          negativeFi: unwrap(negativeFiDecisions),
        });
        if (!preservePending) {
          setPendingDecisions({});
          setPendingRemarks({});
          setMissingRemarksTarget(null);
        }
      } catch (err) {
        setError(err?.response?.data?.message || err?.message || 'Unable to load deviation data.');
      }
    },
    [applicationProductDetailsId]
  );

  // Customer switching & async safety
  useEffect(() => {
    let isCurrent = true;
    setPendingDecisions({});
    setPendingRemarks({});
    setActivePopup(null);
    setPopupRemarks('');
    setPopupError('');
    setError('');
    setSavedMessage('');
    setJustSavedKeys(new Set());
    setMissingRemarksTarget(null);

    const fetchAll = async () => {
      if (!applicationProductDetailsId) return;
      try {
        const [general, cir, negativeFi, generalDecisions, cirDecisions, negativeFiDecisions] = await Promise.all([
          backOfficeService.getDeviationMasters(),
          backOfficeService.getCIRDeviationMasters(),
          backOfficeService.getNegativeFIDeviationMasters(),
          backOfficeService.getApplicationDeviationDecisions(applicationProductDetailsId),
          backOfficeService.getApplicationCIRDeviationDecisions(applicationProductDetailsId),
          backOfficeService.getApplicationNegativeFIDecisions(applicationProductDetailsId),
        ]);
        if (!isCurrent) return;
        setMasters({
          general: unwrap(general).filter(active),
          cir: unwrap(cir).filter(active),
          negativeFi: unwrap(negativeFi).filter(active),
        });
        setDecisions({
          general: unwrap(generalDecisions),
          cir: unwrap(cirDecisions),
          negativeFi: unwrap(negativeFiDecisions),
        });
      } catch (err) {
        if (!isCurrent) return;
        setError(err?.response?.data?.message || err?.message || 'Unable to load deviation data.');
      }
    };

    fetchAll();
    return () => {
      isCurrent = false;
    };
  }, [applicationProductDetailsId]);

  const findDecision = useCallback(
    (type, id) => decisions[type]?.find((row) => String(decisionMasterId(row, type)) === String(id)),
    [decisions]
  );

  const saveSingleRow = async (type, master, value, remarks, existingOverride = null) => {
    const id = masterId(master, type);
    const existing = existingOverride ?? findDecision(type, id);
    const key = `${type}-${id}`;
    setSavingKey(key);

    const user = Number(backOfficeId || createdBy || 0);
    const payload = {
      applicationProductDetailsId: Number(applicationProductDetailsId),
      decision: value,
      remarks: remarks,
      backOfficeId: user,
      ...(existing
        ? { createdBy: Number(existing.createdBy || createdBy || user), modifiedBy: user }
        : { createdBy: Number(createdBy || user) }),
    };

    if (type === 'general') payload.deviationId = Number(id);
    if (type === 'cir') payload.cirDeviationId = Number(id);
    if (type === 'negativeFi') payload.negativeFIDeviationId = Number(id);

    try {
      const existingId = decisionId(existing);
      if (existing && existingId != null) {
        if (type === 'general') await backOfficeService.updateDeviationDecision(existingId, payload);
        else if (type === 'cir') await backOfficeService.updateCIRDeviationDecision(existingId, payload);
        else if (type === 'negativeFi') await backOfficeService.updateNegativeFIDecision(existingId, payload);
        return { mode: 'update', id: existingId };
      } else {
        try {
          let res;
          if (type === 'general') res = await backOfficeService.saveDeviationDecision(applicationProductDetailsId, payload);
          else if (type === 'cir') res = await backOfficeService.saveCIRDeviationDecision(payload);
          else if (type === 'negativeFi') res = await backOfficeService.saveNegativeFIDecision(payload);
          return { mode: 'create', result: res };
        } catch (postErr) {
          if (postErr?.response?.status === 409) {
            // Authoritative server reconciliation
            const freshDecisions = await refreshCategoryDecisions(type);
            const freshExisting = freshDecisions?.find((r) => String(decisionMasterId(r, type)) === String(id));
            if (freshExisting) {
              const freshVal = decisionValue(freshExisting);
              const freshRemarks = decisionRemarks(freshExisting);
              // If already saved with target decision & remarks (e.g. prior timeout/retry), reconcile as success
              if (freshVal === value && (freshRemarks || null) === (remarks || null)) {
                return { mode: 'reconciled', existing: freshExisting };
              }
              // Check if modified by another user
              const freshModifiedBy = Number(freshExisting.modifiedBy || freshExisting.createdBy || 0);
              if (freshModifiedBy && freshModifiedBy !== user) {
                throw new Error(
                  `Conflict (HTTP 409) for "${getDeviationTitle(master, type)}": Another user modified this deviation. Server data refreshed; please review.`
                );
              }
              // Safe to update via PUT
              const freshId = decisionId(freshExisting);
              if (freshId != null) {
                payload.modifiedBy = user;
                payload.createdBy = Number(freshExisting.createdBy || createdBy || user);
                if (type === 'general') await backOfficeService.updateDeviationDecision(freshId, payload);
                else if (type === 'cir') await backOfficeService.updateCIRDeviationDecision(freshId, payload);
                else if (type === 'negativeFi') await backOfficeService.updateNegativeFIDecision(freshId, payload);
                return { mode: 'reconciled-update', id: freshId };
              }
            }
          }
          throw postErr;
        }
      }
    } finally {
      setSavingKey('');
    }
  };

  const openRemarksPopup = (type, master, key, currentRemarks) => {
    const id = masterId(master, type);
    const name = getDeviationTitle(master, type);
    setActivePopup({
      key,
      type,
      master,
      id,
      name,
    });
    setPopupRemarks(currentRemarks || '');
    setPopupError('');
  };

  const closePopup = () => {
    setActivePopup(null);
    setPopupRemarks('');
    setPopupError('');
  };

  // Popup Save — Staged purely in component state (ZERO backend API calls)
  const handlePopupSave = () => {
    if (!canEdit || !activePopup) return;
    const trimmed = popupRemarks.trim();
    if (!trimmed) {
      setPopupError('Remarks are mandatory when selecting Yes.');
      return;
    }
    if (trimmed.length > 1000) {
      setPopupError('Remarks cannot exceed 1,000 characters.');
      return;
    }

    const { key } = activePopup;

    // Stage remarks in React state
    setPendingRemarks((prev) => ({
      ...prev,
      [key]: trimmed,
    }));

    // Ensure Yes decision is tracked in pending state
    setPendingDecisions((prev) => ({
      ...prev,
      [key]: 'Yes',
    }));

    if (missingRemarksTarget?.key === key) {
      setMissingRemarksTarget(null);
      setError('');
    }

    closePopup();
  };

  const handleDecisionChange = (key, type, master, nextValue) => {
    setSavedMessage('');
    setError('');
    if (missingRemarksTarget?.key === key) {
      setMissingRemarksTarget(null);
    }
    setPendingDecisions((prev) => ({ ...prev, [key]: nextValue }));

    if (nextValue === 'Yes') {
      const id = masterId(master, type);
      const existing = findDecision(type, id);
      const currentRemarks = pendingRemarks[key] !== undefined ? pendingRemarks[key] : decisionRemarks(existing);
      openRemarksPopup(type, master, key, currentRemarks);
    } else {
      if (activePopup?.key === key) {
        closePopup();
      }
    }
  };

  const handleOpenConfirmSave = () => {
    setError('');
    setMissingRemarksTarget(null);
    const pendingKeys = Array.from(new Set([...Object.keys(pendingDecisions), ...Object.keys(pendingRemarks)]));

    for (const key of pendingKeys) {
      const [type, id] = key.split(':');
      const existing = findDecision(type, id);
      const effectiveDecision = pendingDecisions[key] ?? decisionValue(existing);

      if (effectiveDecision === 'Yes') {
        const remarks = pendingRemarks[key] !== undefined ? pendingRemarks[key] : decisionRemarks(existing);
        if (!remarks || !remarks.trim()) {
          const master = masters[type]?.find((m) => String(masterId(m, type)) === String(id));
          const name = getDeviationTitle(master, type);
          setError(`Remarks are mandatory for "${name}" marked as Yes. Please add remarks before saving.`);
          setMissingRemarksTarget({ type, master, key, currentRemarks: '' });
          return;
        }
      }
    }
    setConfirmSaveOpen(true);
  };

  const saveAll = async () => {
    if (!canEdit || isSaving) return;
    const pendingKeys = Array.from(new Set([...Object.keys(pendingDecisions), ...Object.keys(pendingRemarks)]));
    if (!pendingKeys.length) return;

    // Upfront validation
    for (const key of pendingKeys) {
      const [type, id] = key.split(':');
      const existing = findDecision(type, id);
      const effectiveDecision = pendingDecisions[key] ?? decisionValue(existing);

      if (effectiveDecision === 'Yes') {
        const remarks = pendingRemarks[key] !== undefined ? pendingRemarks[key] : decisionRemarks(existing);
        if (!remarks || !remarks.trim()) {
          const master = masters[type]?.find((m) => String(masterId(m, type)) === String(id));
          const name = getDeviationTitle(master, type);
          setError(`Remarks are mandatory for "${name}" marked as Yes. Please add remarks before saving.`);
          setMissingRemarksTarget({ type, master, key, currentRemarks: '' });
          return;
        }
      }
    }

    setIsSaving(true);
    setError('');
    setSavedMessage('');
    setMissingRemarksTarget(null);

    const successfulKeys = [];
    const failedItems = [];

    for (const key of pendingKeys) {
      const [type, id] = key.split(':');
      const master = masters[type]?.find((row) => String(masterId(row, type)) === String(id));
      if (!master) continue;
      let existing = findDecision(type, id);

      const value = pendingDecisions[key] ?? decisionValue(existing);
      if (value !== 'Yes' && value !== 'No') continue;

      let remarksToSave = null;
      if (value === 'Yes') {
        const r = pendingRemarks[key] !== undefined ? pendingRemarks[key] : decisionRemarks(existing);
        if (!r || !r.trim()) {
          failedItems.push({
            key,
            name: getDeviationTitle(master, type),
            error: 'Remarks are mandatory when selecting Yes.',
          });
          continue;
        }
        remarksToSave = r.trim();
      } else {
        // Explicit No -> remarks: null
        remarksToSave = null;
      }

      // Avoid resubmitting unchanged rows
      const currentSavedVal = decisionValue(existing);
      const currentSavedRemarks = decisionRemarks(existing);
      if (existing && currentSavedVal === value && (currentSavedRemarks || null) === (remarksToSave || null)) {
        successfulKeys.push(key);
        setPendingDecisions((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        setPendingRemarks((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        continue;
      }

      try {
        await saveSingleRow(type, master, value, remarksToSave, existing);
        successfulKeys.push(key);
        // Evict succeeded key immediately so retry never duplicates it
        setPendingDecisions((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        setPendingRemarks((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      } catch (err) {
        failedItems.push({
          key,
          name: getDeviationTitle(master, type),
          error: err?.response?.data?.message || err?.message || 'Save failed',
        });
      }
    }

    // Refresh authoritative decisions from server; preserve pending state for any failed rows
    await load(failedItems.length > 0);

    if (successfulKeys.length > 0) {
      setJustSavedKeys(new Set(successfulKeys));
      setTimeout(() => {
        setJustSavedKeys(new Set());
      }, 4000);
    }

    if (failedItems.length === 0) {
      setSavedMessage('All deviation decisions saved successfully.');
      setError('');
    } else if (successfulKeys.length > 0) {
      setSavedMessage(`${successfulKeys.length} deviation decision(s) saved successfully.`);
      setError(
        `${failedItems.length} deviation(s) could not be saved: ${failedItems
          .map((f) => `"${f.name}" (${f.error})`)
          .join(', ')}. Please review and retry.`
      );
    } else {
      setError(
        failedItems.length === 1
          ? `Failed to save "${failedItems[0].name}": ${failedItems[0].error}`
          : `Failed to save ${failedItems.length} deviation(s): ${failedItems
              .map((f) => `"${f.name}" (${f.error})`)
              .join(', ')}`
      );
    }

    setIsSaving(false);
  };

  const hasPendingChanges = Object.keys(pendingDecisions).length > 0 || Object.keys(pendingRemarks).length > 0;

  const section = (type, title, columns, rows) => (
    <section className="bo-deviation-section" key={type}>
      <div className="bo-deviation-section-title">
        <h3>{title}</h3>
        <span>{rows.length} records</span>
      </div>
      <div className="bo-deviation-table-wrap">
        <table className="bo-deviation-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
              <th>Yes/No</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const id = masterId(row, type);
              const existing = findDecision(type, id);
              const key = `${type}:${id}`;
              const savedVal = decisionValue(existing);
              const savedRemarks = decisionRemarks(existing);
              const value = pendingDecisions[key] ?? (savedVal || 'No');
              const remarks = pendingRemarks[key] !== undefined ? pendingRemarks[key] : savedRemarks;
              const hasRemarks = Boolean(remarks && remarks.trim());

              const hasPendingDecision = pendingDecisions[key] !== undefined && pendingDecisions[key] !== savedVal;
              const hasPendingRemarks = pendingRemarks[key] !== undefined && pendingRemarks[key] !== savedRemarks;
              const isStaged = hasPendingDecision || hasPendingRemarks;

              let stagedLabel = '';
              if (hasPendingRemarks) {
                stagedLabel = savedRemarks ? 'Remarks Updated' : 'Remarks Added';
              } else if (hasPendingDecision) {
                stagedLabel = 'Unsaved';
              }

              return (
                <tr key={String(id)}>
                  {columns.map((column) => (
                    <td key={column.key}>{column.render(row)}</td>
                  ))}
                  <td>
                    <div className="bo-deviation-action-group">
                      <select
                        value={value}
                        onChange={(event) => handleDecisionChange(key, type, row, event.target.value)}
                        disabled={!canEdit || isSaving || savingKey === `${type}-${id}`}
                        className={`bo-deviation-select ${value === 'Yes' ? 'is-yes' : ''}`}
                      >
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                      {value === 'Yes' && (
                        <button
                          type="button"
                          className={`bo-deviation-remarks-btn ${hasRemarks ? 'has-remarks' : 'no-remarks'}`}
                          onClick={() => openRemarksPopup(type, row, key, remarks)}
                          title={hasRemarks ? 'Edit remarks for this deviation' : 'Add remarks for this deviation'}
                        >
                          {canEdit ? (hasRemarks ? 'Edit Remarks' : 'Add Remarks *') : 'View Remarks'}
                        </button>
                      )}
                      {isStaged && (
                        <span className="bo-deviation-staged-tag" title="Unsaved changes - click Save Decisions below to persist">
                          {stagedLabel}
                        </span>
                      )}
                      {justSavedKeys.has(key) && (
                        <span className="bo-deviation-saved-tag" title="Saved to database">
                          Saved
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );

  const generalColumns = useMemo(
    () => [
      {
        key: 'product',
        label: 'Loan Product',
        render: (row) =>
          read(row, ['loanProductName', 'LoanProductName', 'productName', 'ProductName', 'loanProduct', 'LoanProduct']),
      },
      {
        key: 'program',
        label: 'Program / Section',
        render: (row) =>
          read(row, ['programSection', 'ProgramSection', 'program', 'Program', 'section', 'Section']),
      },
      {
        key: 'norms',
        label: 'Deviation Norms',
        render: (row) =>
          read(row, ['deviationNorms', 'DeviationNorms', 'deviationNorm', 'DeviationNorm']),
      },
      {
        key: 'description',
        label: 'Deviation Description',
        render: (row) =>
          read(row, ['deviationDescription', 'DeviationDescription', 'description', 'Description']),
      },
      {
        key: 'authority',
        label: 'Approving Authority',
        render: (row) => read(row, ['approvingAuthority', 'ApprovingAuthority']),
      },
    ],
    []
  );

  return (
    <div className="bo-deviation-assessment">
      {showRefresh && (
        <div className="bo-deviation-header">
          <div />
          <div className="bo-deviation-header-actions">
            <button type="button" onClick={() => load(false)} disabled={isSaving}>
              Refresh
            </button>
          </div>
        </div>
      )}
      {error && <div className="bo-deviation-error">{error}</div>}
      {section('general', 'Deviation List', generalColumns, masters.general)}
      {section(
        'cir',
        'CIR Deviations',
        [
          {
            key: 'description',
            label: 'CIR Deviation Description',
            render: (row) =>
              read(row, [
                'cirDeviationDescription',
                'CIRDeviationDescription',
                'deviationDescription',
                'DeviationDescription',
                'description',
                'Description',
              ]),
          },
          {
            key: 'authority',
            label: 'Approving Authority',
            render: (row) => read(row, ['approvingAuthority', 'ApprovingAuthority']),
          },
        ],
        masters.cir
      )}
      {section(
        'negativeFi',
        'Negative FI Approval Matrix',
        [
          {
            key: 'category',
            label: 'Category',
            render: (row) =>
              read(row, ['category', 'Category', 'negativeFICategory', 'NegativeFICategory']),
          },
          {
            key: 'description',
            label: 'Reason Description',
            render: (row) =>
              read(row, [
                'reasonDescription',
                'ReasonDescription',
                'negativeFIDescription',
                'NegativeFIDescription',
                'description',
                'Description',
              ]),
          },
          {
            key: 'authority',
            label: 'Approving Authority',
            render: (row) => read(row, ['approvingAuthority', 'ApprovingAuthority']),
          },
        ],
        masters.negativeFi
      )}
      <div className="bo-deviation-footer-actions">
        {error && (
          <div className="bo-deviation-footer-error" role="alert">
            <span className="bo-deviation-footer-error-text">{error}</span>
            {missingRemarksTarget && (
              <button
                type="button"
                className="bo-deviation-footer-action-btn"
                onClick={() => {
                  const { type, master, key, currentRemarks } = missingRemarksTarget;
                  openRemarksPopup(type, master, key, currentRemarks);
                }}
              >
                Add Remarks
              </button>
            )}
          </div>
        )}
        {savedMessage && <div className="bo-deviation-success">{savedMessage}</div>}
        {canEdit && (
          <button
            type="button"
            className="bo-deviation-save"
            onClick={handleOpenConfirmSave}
            disabled={isSaving || !hasPendingChanges}
          >
            {isSaving ? 'Saving...' : 'Save Decisions'}
          </button>
        )}
      </div>
      {!canEdit && isCmLocked && (
        <div className="bo-deviation-lock-notice" role="status">
          Section is locked for review. Click &quot;Edit&quot; in the section header above to make changes.
        </div>
      )}
      {!canEdit && !isCmLocked && (
        <div className="bo-deviation-readonly-notice" role="status">
          Application is read-only. Deviation decisions cannot be changed.
        </div>
      )}

      {/* Confirmation Modal for Footer Save Decisions */}
      <MasterModal
        className="bo-deviation-confirm-modal"
        isOpen={confirmSaveOpen}
        onClose={() => !isSaving && setConfirmSaveOpen(false)}
        title="Save Deviation Decisions?"
      >
        <div className="bo-deviation-confirm">
          <p>Are you sure you want to save the selected Yes/No decisions and remarks for this application?</p>
          <div className="bo-deviation-confirm-actions">
            <button
              type="button"
              className="bo-deviation-cancel"
              onClick={() => setConfirmSaveOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="bo-deviation-save"
              onClick={async () => {
                setConfirmSaveOpen(false);
                await saveAll();
              }}
              disabled={isSaving}
            >
              Yes, Save Decisions
            </button>
          </div>
        </div>
      </MasterModal>

      {/* Remarks Popup Modal */}
      <MasterModal
        className="bo-deviation-remarks-modal"
        isOpen={Boolean(activePopup)}
        onClose={closePopup}
        title={canEdit ? (activePopup?.name ? 'Deviation Remarks' : 'Add Remarks') : 'View Deviation Remarks'}
      >
        <div className="bo-deviation-remarks-modal-body">
          {activePopup && (
            <div className="bo-deviation-modal-deviation-name">
              <strong>
                {activePopup.type === 'general'
                  ? 'General Deviation: '
                  : activePopup.type === 'cir'
                    ? 'CIR Deviation: '
                    : 'Negative FI Deviation: '}
              </strong>
              {activePopup.name}
            </div>
          )}
          <div className="bo-deviation-modal-textarea-wrap">
            <textarea
              className="bo-deviation-remarks-textarea"
              value={popupRemarks}
              onChange={(e) => {
                setPopupRemarks(e.target.value.slice(0, 1000));
                setPopupError('');
              }}
              placeholder={
                canEdit
                  ? 'Enter specific rationale or mitigating factors (mandatory when Yes)...'
                  : 'No remarks entered.'
              }
              maxLength={1000}
              rows={4}
              disabled={!canEdit}
              autoFocus={canEdit}
            />
            <div className="bo-deviation-modal-counter">
              {popupRemarks.length} / 1,000 characters
            </div>
          </div>
          {popupError && <div className="bo-deviation-popup-error">{popupError}</div>}
          <div className="bo-deviation-remarks-modal-actions">
            {canEdit ? (
              <>
                <button
                  type="button"
                  className="bo-deviation-cancel"
                  onClick={closePopup}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="bo-deviation-save"
                  onClick={handlePopupSave}
                >
                  Save Remarks
                </button>
              </>
            ) : (
              <button
                type="button"
                className="bo-deviation-cancel"
                onClick={closePopup}
              >
                Close
              </button>
            )}
          </div>
        </div>
      </MasterModal>
    </div>
  );
}
