import React, { useState, useEffect, useMemo, useCallback } from 'react';
import iconMap from '../../config/iconMap';
import backOfficeService from '../../api/backOfficeService';
import { getBackOfficeAuth } from '../../auth/authStorage';
import './RtrCommonSheet.css';

const PlusIcon = iconMap['Plus'] || iconMap['FilePlus'];
const Trash2Icon = iconMap['Trash2'] || iconMap['X'];
const SaveIcon = iconMap['Save'] || iconMap['Check'];

const createBlankRow = () => ({
  id: `rtr-row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  applicationLoanObligationDetailsId: null,
  borrowerName: '',
  bankName: '',
  emiAccount: '',
  product: '',
  rtrLoanStatusId: '',
  statusCode: '',
  statusName: '',
  loanAmount: '',
  emi: '',
  pos: '',
  reflectedInCibil: '',
  startDate: '',
  endDate: '',
  tenor: '',
  paidTenor: '',
  outstandingTenor: '',
  bounceCount: '',
  forValue: '',
  emiDueDay: null,
  dpd: '',
  rtrComment: '',
});

/**
 * Check if a row is completely blank (untouched) across all meaningful business fields.
 */
const isRowBlank = (row) => {
  return (
    !String(row.borrowerName || '').trim() &&
    !String(row.bankName || '').trim() &&
    !String(row.emiAccount || '').trim() &&
    !String(row.product || '').trim() &&
    !row.rtrLoanStatusId &&
    (row.loanAmount === '' || row.loanAmount == null) &&
    (row.emi === '' || row.emi == null) &&
    (row.pos === '' || row.pos == null) &&
    !row.reflectedInCibil &&
    !row.startDate &&
    !row.endDate &&
    (row.tenor === '' || row.tenor == null) &&
    (row.paidTenor === '' || row.paidTenor == null) &&
    (row.outstandingTenor === '' || row.outstandingTenor == null) &&
    (row.bounceCount === '' || row.bounceCount == null) &&
    !row.forValue &&
    !String(row.dpd || '').trim() &&
    !String(row.rtrComment || '').trim()
  );
};

/**
 * RTR Common Sheet (Step 10 Component)
 * Follows Excel-style RTR obligations worksheet layout.
 * Integrates CRUD with /api/calculation/loan-obligations.
 */
export default function RtrCommonSheet({
  applicationProductDetailsId = 0,
  applicantSequence = 0,
  currentUserId: propUserId,
}) {
  // Top Summary Section Groups (Local UI State only, empty strings initially)
  const [summary, setSummary] = useState({
    // 1. Total Obligations - Live Loans
    totalObligationsLivePos: '',
    totalObligationsLiveEmi: '',

    // 2. Closure within 12 months & Proposed BT & Proposed to be closed from Sivels Finance
    closureWithin12MonthsPos: '',
    closureWithin12MonthsEmi: '',

    // 3. Details of Proposed Loan
    proposedLoanAmount: '',
    proposedLoanTenor: '',
    proposedLoanRoi: '',
    proposedLoanEmi: '',

    // 4. Total Obligations including Sivels Finance
    totalObligationsWithSivelsPos: '',
    totalObligationsWithSivelsEmi: '',

    // 5. Personal Obligation not considered
    personalObligationNotConsideredPos: '',
    personalObligationNotConsideredEmi: '',
  });

  // Obligation Table Rows (Starts with 1 blank row by default)
  const [rows, setRows] = useState(() => [createBlankRow()]);

  // Master RTR Loan Status State
  const [rtrLoanStatuses, setRtrLoanStatuses] = useState([]);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState(null);

  // CRUD Operation States
  const [obligationsLoading, setObligationsLoading] = useState(false);
  const [obligationsSaving, setObligationsSaving] = useState(false);
  const [obligationsError, setObligationsError] = useState(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState(null);

  // Delete Confirmation State
  const [deleteConfirmRow, setDeleteConfirmRow] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Current authenticated user ID resolution
  const resolveCurrentUserId = useCallback(() => {
    if (propUserId != null && !isNaN(Number(propUserId)) && Number(propUserId) > 0) {
      return Number(propUserId);
    }
    const boAuth = getBackOfficeAuth();
    const directId = boAuth?.backOfficeId ?? boAuth?.id;
    if (directId != null && !isNaN(Number(directId)) && Number(directId) > 0) {
      return Number(directId);
    }
    const storedBoId = localStorage.getItem('backOfficeId');
    if (storedBoId != null && !isNaN(Number(storedBoId)) && Number(storedBoId) > 0) {
      return Number(storedBoId);
    }
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId != null && !isNaN(Number(storedUserId)) && Number(storedUserId) > 0) {
      return Number(storedUserId);
    }
    return 1;
  }, [propUserId]);

  // Fetch status master once on mount
  useEffect(() => {
    let isMounted = true;

    async function fetchStatusMaster() {
      setStatusLoading(true);
      setStatusError(null);
      try {
        const res = await backOfficeService.getRtrLoanStatusMaster();
        if (!isMounted) return;
        const list = Array.isArray(res) ? res : (res?.data || res?.value || []);
        setRtrLoanStatuses(list);
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to load RTR loan status master:', err);
        setStatusError('Statuses unavailable');
      } finally {
        if (isMounted) {
          setStatusLoading(false);
        }
      }
    }

    fetchStatusMaster();

    return () => {
      isMounted = false;
    };
  }, []);

  // Strict active filtering: item.isActive === true
  const activeStatuses = useMemo(() => {
    return (rtrLoanStatuses || []).filter((item) => item && item.isActive === true);
  }, [rtrLoanStatuses]);

  // Re-resolve status names and codes whenever status master is loaded
  useEffect(() => {
    if (activeStatuses.length > 0) {
      setRows((prev) =>
        prev.map((r) => {
          if (r.rtrLoanStatusId !== '' && r.rtrLoanStatusId != null) {
            const matched = activeStatuses.find(
              (s) => Number(s.rtrLoanStatusId) === Number(r.rtrLoanStatusId)
            );
            if (matched) {
              return {
                ...r,
                statusCode: matched.statusCode || '',
                statusName: matched.statusName || '',
              };
            }
          }
          return r;
        })
      );
    }
  }, [activeStatuses]);

  // Format server date to YYYY-MM-DD for HTML date input
  const formatToDateInput = (val) => {
    if (!val) return '';
    try {
      const str = String(val);
      if (str.length >= 10 && str.includes('-')) {
        return str.slice(0, 10);
      }
      const d = new Date(val);
      if (isNaN(d.getTime())) return '';
      return d.toISOString().slice(0, 10);
    } catch {
      return '';
    }
  };

  // GET hydration: fetch existing saved obligations
  const fetchObligations = useCallback(async () => {
    if (!applicationProductDetailsId || Number(applicationProductDetailsId) <= 0) {
      return;
    }
    setObligationsLoading(true);
    setObligationsError(null);
    try {
      const res = await backOfficeService.getLoanObligations(
        Number(applicationProductDetailsId),
        Number(applicantSequence || 0)
      );
      const list = Array.isArray(res) ? res : (res?.data || res?.value || []);

      if (list && list.length > 0) {
        const mapped = list.map((item) => {
          const statusId =
            item.rtrLoanStatusId != null && item.rtrLoanStatusId !== ''
              ? Number(item.rtrLoanStatusId)
              : '';
          const matched = (activeStatuses || []).find(
            (s) => Number(s.rtrLoanStatusId) === statusId
          );

          return {
            id: `rtr-row-saved-${item.applicationLoanObligationDetailsId}`,
            applicationLoanObligationDetailsId: item.applicationLoanObligationDetailsId,
            borrowerName: item.borrowerName ?? '',
            bankName: item.lenderName ?? '',
            emiAccount: item.emiSource ?? '',
            product: item.product ?? '',
            rtrLoanStatusId: statusId,
            statusCode: matched?.statusCode || item.statusCode || '',
            statusName: matched?.statusName || item.statusName || '',
            loanAmount: item.loanAmount ?? '',
            emi: item.emiAmount ?? '',
            pos: item.currentPOS ?? '',
            reflectedInCibil:
              item.reflectedInCIBIL === true || item.reflectedInCIBIL === 'Yes'
                ? 'Yes'
                : (item.reflectedInCIBIL === false || item.reflectedInCIBIL === 'No' ? 'No' : ''),
            startDate: formatToDateInput(item.emiStartDate),
            endDate: formatToDateInput(item.loanEndDate),
            tenor: item.tenureMonths ?? '',
            paidTenor: item.paidTenureMonths ?? '',
            outstandingTenor: item.outstandingTenureMonths ?? '',
            bounceCount: item.bounceCount ?? '',
            forValue:
              item.isFoirApplicable === true || item.isFoirApplicable === 'Yes'
                ? 'Yes'
                : (item.isFoirApplicable === false || item.isFoirApplicable === 'No' ? 'No' : ''),
            emiDueDay: item.emiDueDay ?? null,
            dpd: item.dpdDetails ?? '',
            rtrComment: item.rtrComments ?? '',
          };
        });
        setRows(mapped);
      } else {
        setRows([createBlankRow()]);
      }
    } catch (err) {
      console.error('Failed to load loan obligations:', err);
      if (err?.response?.status === 404) {
        setRows([createBlankRow()]);
      } else {
        setObligationsError('Failed to load loan obligations.');
      }
    } finally {
      setObligationsLoading(false);
    }
  }, [applicationProductDetailsId, applicantSequence, activeStatuses]);

  // Trigger hydration on mount and when applicationProductDetailsId changes
  useEffect(() => {
    fetchObligations();
  }, [fetchObligations]);

  // Update Summary field
  const handleSummaryChange = (field, value) => {
    setSummary((prev) => ({ ...prev, [field]: value }));
  };

  // Add a new blank row
  const handleAddRow = () => {
    setRows((prev) => [...prev, createBlankRow()]);
  };

  // Remove row handler (local only for unsaved; confirmation + DELETE for saved)
  const handleRemoveRow = (row) => {
    if (!row.applicationLoanObligationDetailsId) {
      setRows((prev) => {
        if (prev.length <= 1) {
          return [createBlankRow()];
        }
        return prev.filter((r) => r.id !== row.id);
      });
      return;
    }
    setDeleteConfirmRow(row);
  };

  // Confirmed delete execution for saved row
  const handleConfirmDelete = async () => {
    if (!deleteConfirmRow || !deleteConfirmRow.applicationLoanObligationDetailsId) return;
    setIsDeleting(true);
    setObligationsError(null);
    setSaveSuccessMessage(null);
    try {
      const currentUserId = resolveCurrentUserId();
      await backOfficeService.deleteLoanObligation(
        deleteConfirmRow.applicationLoanObligationDetailsId,
        currentUserId
      );
      setDeleteConfirmRow(null);
      setSaveSuccessMessage('Obligation record deleted successfully.');
      await fetchObligations();
    } catch (err) {
      console.error('Failed to delete obligation record:', err);
      const errMsg =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to delete obligation record.';
      setObligationsError(errMsg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Update a regular table cell
  const handleRowChange = (rowId, field, value) => {
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, [field]: value } : r))
    );
  };

  // Handle dynamic master status selection
  const handleStatusChange = (rowId, selectedIdStr) => {
    const numericId = selectedIdStr === '' ? '' : Number(selectedIdStr);
    const matched = activeStatuses.find(
      (item) => Number(item.rtrLoanStatusId) === numericId
    );

    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? {
              ...r,
              rtrLoanStatusId: numericId,
              statusCode: matched?.statusCode || '',
              statusName: matched?.statusName || '',
            }
          : r
      )
    );
  };

  // Payload mapper
  const toPayload = (row, isEdit) => {
    const currentUserId = resolveCurrentUserId();

    const parseNumOrNull = (v) => {
      if (v === '' || v == null) return null;
      const n = Number(v);
      return isNaN(n) ? null : n;
    };

    const parseBoolOrNull = (v) => {
      if (v === 'Yes' || v === true) return true;
      if (v === 'No' || v === false) return false;
      return null;
    };

    const parseDateOrNull = (v) => {
      if (!v) return null;
      const trimmed = String(v).trim();
      return trimmed || null;
    };

    const payload = {
      applicationProductDetailsId: Number(applicationProductDetailsId),
      applicantSequence: Number(applicantSequence || 0),
      borrowerName: String(row.borrowerName || '').trim() || null,
      lenderName: String(row.bankName || '').trim() || null,
      emiSource: String(row.emiAccount || '').trim() || null,
      product: String(row.product || '').trim() || null,
      loanAmount: parseNumOrNull(row.loanAmount),
      emiAmount: parseNumOrNull(row.emi),
      currentPOS: parseNumOrNull(row.pos),
      reflectedInCIBIL: parseBoolOrNull(row.reflectedInCibil),
      emiStartDate: parseDateOrNull(row.startDate),
      loanEndDate: parseDateOrNull(row.endDate),
      tenureMonths: parseNumOrNull(row.tenor),
      paidTenureMonths: parseNumOrNull(row.paidTenor),
      outstandingTenureMonths: parseNumOrNull(row.outstandingTenor),
      bounceCount: parseNumOrNull(row.bounceCount),
      isFoirApplicable: parseBoolOrNull(row.forValue),
      emiDueDay: row.emiDueDay != null ? Number(row.emiDueDay) : null,
      rtrLoanStatusId: row.rtrLoanStatusId ? Number(row.rtrLoanStatusId) : null,
      dpdDetails: String(row.dpd || '').trim() || null,
      rtrComments: String(row.rtrComment || '').trim() || null,
    };

    if (isEdit) {
      payload.modifiedBy = currentUserId;
    } else {
      payload.createdBy = currentUserId;
    }

    return payload;
  };

  // Section-level Save Obligations Handler
  const handleSaveObligations = async () => {
    if (!applicationProductDetailsId || Number(applicationProductDetailsId) <= 0) {
      setObligationsError('Application Product ID not found. Unable to save obligations.');
      return;
    }

    const meaningfulRows = rows.filter((r) => !isRowBlank(r));
    if (meaningfulRows.length === 0) {
      setObligationsError('No obligation details to save. Please enter obligation information.');
      return;
    }

    // Validation: ensure status is selected for non-empty rows
    for (let i = 0; i < meaningfulRows.length; i++) {
      const r = meaningfulRows[i];
      if (!r.rtrLoanStatusId) {
        setObligationsError(`Please select Status (Live / Closed) for Row ${i + 1}.`);
        return;
      }
    }

    setObligationsSaving(true);
    setObligationsError(null);
    setSaveSuccessMessage(null);

    let createdCount = 0;
    let updatedCount = 0;

    try {
      for (const row of meaningfulRows) {
        if (!row.applicationLoanObligationDetailsId) {
          const payload = toPayload(row, false);
          await backOfficeService.createLoanObligation(payload);
          createdCount++;
        } else {
          const payload = toPayload(row, true);
          await backOfficeService.updateLoanObligation(
            row.applicationLoanObligationDetailsId,
            payload
          );
          updatedCount++;
        }
      }

      setSaveSuccessMessage(
        `Obligations saved successfully (${createdCount} created, ${updatedCount} updated).`
      );
      await fetchObligations();
    } catch (err) {
      console.error('Failed to save obligations:', err);
      const errMsg =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to save one or more obligation records.';
      setObligationsError(errMsg);
    } finally {
      setObligationsSaving(false);
    }
  };

  return (
    <div className="bo-cv-step-panel bo-rtr-panel">
      {/* Panel Header */}
      <div className="bo-cv-step-panel-header">
        <div className="bo-cv-step-header-left">
          <div className="bo-cv-step-badge-num">10</div>
          <div>
            <h2 className="bo-cv-step-panel-title">RTR Common Sheet</h2>
            <p className="bo-cv-step-panel-desc">
              Obligation assessment and repayment track record evaluation.
            </p>
          </div>
        </div>
        <span className="bo-cv-step-tag-pill">Step 10 of 12</span>
      </div>

      <div className="bo-rtr-container">
        {/* Top Summary Section */}
        <section className="bo-rtr-summary-deck" aria-label="RTR Obligation Summary">
          <div className="bo-rtr-summary-grid">
            {/* 1. Total Obligations - Live Loans */}
            <article className="bo-rtr-summary-card">
              <header className="bo-rtr-summary-card-header">
                <span className="bo-rtr-group-number">1</span>
                <h4 className="bo-rtr-summary-title">Total Obligations - Live Loans</h4>
              </header>
              <div className="bo-rtr-summary-fields">
                <label className="bo-rtr-field-group">
                  <span className="bo-rtr-field-label">POS (In Rs.)</span>
                  <input
                    type="number"
                    placeholder="Enter POS"
                    className="bo-rtr-input"
                    value={summary.totalObligationsLivePos}
                    onChange={(e) => handleSummaryChange('totalObligationsLivePos', e.target.value)}
                  />
                </label>
                <label className="bo-rtr-field-group">
                  <span className="bo-rtr-field-label">EMI (In Rs.)</span>
                  <input
                    type="number"
                    placeholder="Enter EMI"
                    className="bo-rtr-input"
                    value={summary.totalObligationsLiveEmi}
                    onChange={(e) => handleSummaryChange('totalObligationsLiveEmi', e.target.value)}
                  />
                </label>
              </div>
            </article>

            {/* 2. Closure within 12 months & Proposed BT & Proposed to be closed from Sivels Finance */}
            <article className="bo-rtr-summary-card">
              <header className="bo-rtr-summary-card-header">
                <span className="bo-rtr-group-number">2</span>
                <h4 className="bo-rtr-summary-title">
                  Closure within 12 months & Proposed BT & Proposed to be closed from Sivels Finance
                </h4>
              </header>
              <div className="bo-rtr-summary-fields">
                <label className="bo-rtr-field-group">
                  <span className="bo-rtr-field-label">POS (In Rs.)</span>
                  <input
                    type="number"
                    placeholder="Enter POS"
                    className="bo-rtr-input"
                    value={summary.closureWithin12MonthsPos}
                    onChange={(e) => handleSummaryChange('closureWithin12MonthsPos', e.target.value)}
                  />
                </label>
                <label className="bo-rtr-field-group">
                  <span className="bo-rtr-field-label">EMI (In Rs.)</span>
                  <input
                    type="number"
                    placeholder="Enter EMI"
                    className="bo-rtr-input"
                    value={summary.closureWithin12MonthsEmi}
                    onChange={(e) => handleSummaryChange('closureWithin12MonthsEmi', e.target.value)}
                  />
                </label>
              </div>
            </article>

            {/* 3. Details of Proposed Loan */}
            <article className="bo-rtr-summary-card bo-rtr-summary-card--wide">
              <header className="bo-rtr-summary-card-header">
                <span className="bo-rtr-group-number">3</span>
                <h4 className="bo-rtr-summary-title">Details of Proposed Loan</h4>
              </header>
              <div className="bo-rtr-summary-fields bo-rtr-summary-fields--quad">
                <label className="bo-rtr-field-group">
                  <span className="bo-rtr-field-label">Loan Amount (In Rs.)</span>
                  <input
                    type="number"
                    placeholder="Enter loan amount"
                    className="bo-rtr-input"
                    value={summary.proposedLoanAmount}
                    onChange={(e) => handleSummaryChange('proposedLoanAmount', e.target.value)}
                  />
                </label>
                <label className="bo-rtr-field-group">
                  <span className="bo-rtr-field-label">Tenor</span>
                  <input
                    type="number"
                    placeholder="Months"
                    className="bo-rtr-input"
                    value={summary.proposedLoanTenor}
                    onChange={(e) => handleSummaryChange('proposedLoanTenor', e.target.value)}
                  />
                </label>
                <label className="bo-rtr-field-group">
                  <span className="bo-rtr-field-label">ROI (%)</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 10.5"
                    className="bo-rtr-input"
                    value={summary.proposedLoanRoi}
                    onChange={(e) => handleSummaryChange('proposedLoanRoi', e.target.value)}
                  />
                </label>
                <label className="bo-rtr-field-group">
                  <span className="bo-rtr-field-label">EMI (In Rs.)</span>
                  <input
                    type="number"
                    placeholder="Enter EMI"
                    className="bo-rtr-input"
                    value={summary.proposedLoanEmi}
                    onChange={(e) => handleSummaryChange('proposedLoanEmi', e.target.value)}
                  />
                </label>
              </div>
            </article>

            {/* 4. Total Obligations including Sivels Finance */}
            <article className="bo-rtr-summary-card">
              <header className="bo-rtr-summary-card-header">
                <span className="bo-rtr-group-number">4</span>
                <h4 className="bo-rtr-summary-title">Total Obligations including Sivels Finance</h4>
              </header>
              <div className="bo-rtr-summary-fields">
                <label className="bo-rtr-field-group">
                  <span className="bo-rtr-field-label">POS (In Rs.)</span>
                  <input
                    type="number"
                    placeholder="Enter POS"
                    className="bo-rtr-input"
                    value={summary.totalObligationsWithSivelsPos}
                    onChange={(e) => handleSummaryChange('totalObligationsWithSivelsPos', e.target.value)}
                  />
                </label>
                <label className="bo-rtr-field-group">
                  <span className="bo-rtr-field-label">EMI (In Rs.)</span>
                  <input
                    type="number"
                    placeholder="Enter EMI"
                    className="bo-rtr-input"
                    value={summary.totalObligationsWithSivelsEmi}
                    onChange={(e) => handleSummaryChange('totalObligationsWithSivelsEmi', e.target.value)}
                  />
                </label>
              </div>
            </article>

            {/* 5. Personal Obligation not considered */}
            <article className="bo-rtr-summary-card">
              <header className="bo-rtr-summary-card-header">
                <span className="bo-rtr-group-number">5</span>
                <h4 className="bo-rtr-summary-title">Personal Obligation not considered</h4>
              </header>
              <div className="bo-rtr-summary-fields">
                <label className="bo-rtr-field-group">
                  <span className="bo-rtr-field-label">POS (In Rs.)</span>
                  <input
                    type="number"
                    placeholder="Enter POS"
                    className="bo-rtr-input"
                    value={summary.personalObligationNotConsideredPos}
                    onChange={(e) => handleSummaryChange('personalObligationNotConsideredPos', e.target.value)}
                  />
                </label>
                <label className="bo-rtr-field-group">
                  <span className="bo-rtr-field-label">EMI (In Rs.)</span>
                  <input
                    type="number"
                    placeholder="Enter EMI"
                    className="bo-rtr-input"
                    value={summary.personalObligationNotConsideredEmi}
                    onChange={(e) => handleSummaryChange('personalObligationNotConsideredEmi', e.target.value)}
                  />
                </label>
              </div>
            </article>
          </div>
        </section>

        {/* Obligation Table Section */}
        <section className="bo-rtr-table-section" aria-label="RTR Obligation Table">
          {/* Status Banners */}
          {saveSuccessMessage && (
            <div className="bo-rtr-banner bo-rtr-banner--success" role="status">
              <span>{saveSuccessMessage}</span>
              <button
                type="button"
                className="bo-rtr-banner-close"
                onClick={() => setSaveSuccessMessage(null)}
                aria-label="Dismiss success message"
              >
                ×
              </button>
            </div>
          )}
          {obligationsError && (
            <div className="bo-rtr-banner bo-rtr-banner--error" role="alert">
              <span>{obligationsError}</span>
              <button
                type="button"
                className="bo-rtr-banner-close"
                onClick={() => setObligationsError(null)}
                aria-label="Dismiss error message"
              >
                ×
              </button>
            </div>
          )}

          <div className="bo-rtr-table-toolbar">
            <div className="bo-rtr-table-title-wrap">
              <h3 className="bo-rtr-section-title">Obligation Details</h3>
              <span className="bo-rtr-table-subtitle">
                Record borrower loan facilities and repayment track record from credit bureau & statements
              </span>
            </div>
            <div className="bo-rtr-table-toolbar-actions">
              <button
                type="button"
                className="bo-rtr-add-row-btn"
                onClick={handleAddRow}
                disabled={obligationsSaving}
                aria-label="Add Obligation Row"
              >
                {PlusIcon ? <PlusIcon size={14} /> : <span>+</span>}
                <span>Add Row</span>
              </button>
              <button
                type="button"
                className="bo-rtr-save-btn"
                onClick={handleSaveObligations}
                disabled={obligationsSaving || obligationsLoading}
                aria-label="Save Obligations"
              >
                {SaveIcon ? <SaveIcon size={14} /> : null}
                <span>{obligationsSaving ? 'Saving...' : 'Save Obligations'}</span>
              </button>
            </div>
          </div>

          <div className="bo-rtr-table-scroll-container">
            <table className="bo-rtr-table">
              <thead>
                <tr>
                  <th className="bo-rtr-th bo-rtr-col-seq">#</th>
                  <th className="bo-rtr-th bo-rtr-col-borrower">Name of Borrower</th>
                  <th className="bo-rtr-th bo-rtr-col-bank">Bank / FI Name</th>
                  <th className="bo-rtr-th bo-rtr-col-acct">Account from where EMI served</th>
                  <th className="bo-rtr-th bo-rtr-col-product">Product</th>
                  <th className="bo-rtr-th bo-rtr-col-status">Status (Live / Closed)</th>
                  <th className="bo-rtr-th bo-rtr-col-amount">Loan Amount (In Rs.)</th>
                  <th className="bo-rtr-th bo-rtr-col-emi">EMI</th>
                  <th className="bo-rtr-th bo-rtr-col-pos">POS</th>
                  <th className="bo-rtr-th bo-rtr-col-cibil">Reflected in CIBIL</th>
                  <th className="bo-rtr-th bo-rtr-col-date">Start Date</th>
                  <th className="bo-rtr-th bo-rtr-col-date">End Date</th>
                  <th className="bo-rtr-th bo-rtr-col-tenor">Tenor (In months)</th>
                  <th className="bo-rtr-th bo-rtr-col-tenor">Paid Tenor</th>
                  <th className="bo-rtr-th bo-rtr-col-tenor">O/s Tenor</th>
                  <th className="bo-rtr-th bo-rtr-col-bounce">No of bounce in Last 12 months</th>
                  <th className="bo-rtr-th bo-rtr-col-for">FOR (Y/N)</th>
                  <th className="bo-rtr-th bo-rtr-col-dpd">DPD's in CIBIL report</th>
                  <th className="bo-rtr-th bo-rtr-col-comment">Comment on RTR</th>
                  <th className="bo-rtr-th bo-rtr-col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={row.id} className="bo-rtr-tr">
                    <td className="bo-rtr-td bo-rtr-td-seq">{idx + 1}</td>

                    {/* 1. Name of Borrower */}
                    <td className="bo-rtr-td">
                      <input
                        type="text"
                        placeholder="Borrower name"
                        className="bo-rtr-cell-input"
                        value={row.borrowerName}
                        onChange={(e) => handleRowChange(row.id, 'borrowerName', e.target.value)}
                        disabled={obligationsSaving}
                      />
                    </td>

                    {/* 2. Bank / FI Name */}
                    <td className="bo-rtr-td">
                      <input
                        type="text"
                        placeholder="Bank / FI name"
                        className="bo-rtr-cell-input"
                        value={row.bankName}
                        onChange={(e) => handleRowChange(row.id, 'bankName', e.target.value)}
                        disabled={obligationsSaving}
                      />
                    </td>

                    {/* 3. Account from where EMI served */}
                    <td className="bo-rtr-td">
                      <input
                        type="text"
                        placeholder="Account number"
                        className="bo-rtr-cell-input"
                        value={row.emiAccount}
                        onChange={(e) => handleRowChange(row.id, 'emiAccount', e.target.value)}
                        disabled={obligationsSaving}
                      />
                    </td>

                    {/* 4. Product */}
                    <td className="bo-rtr-td">
                      <input
                        type="text"
                        placeholder="Product type"
                        className="bo-rtr-cell-input"
                        value={row.product}
                        onChange={(e) => handleRowChange(row.id, 'product', e.target.value)}
                        disabled={obligationsSaving}
                      />
                    </td>

                    {/* 5. Status (From RTR Loan Status Master) */}
                    <td className="bo-rtr-td">
                      <select
                        className="bo-rtr-cell-select"
                        value={row.rtrLoanStatusId !== null && row.rtrLoanStatusId !== undefined ? row.rtrLoanStatusId : ''}
                        onChange={(e) => handleStatusChange(row.id, e.target.value)}
                        disabled={statusLoading || Boolean(statusError) || activeStatuses.length === 0 || obligationsSaving}
                      >
                        {statusLoading ? (
                          <option value="">Loading statuses...</option>
                        ) : statusError ? (
                          <option value="">Statuses unavailable</option>
                        ) : activeStatuses.length === 0 ? (
                          <option value="">No statuses available</option>
                        ) : (
                          <>
                            <option value="">Select</option>
                            {activeStatuses.map((item) => (
                              <option key={item.rtrLoanStatusId} value={item.rtrLoanStatusId}>
                                {item.statusName}
                              </option>
                            ))}
                            {row.rtrLoanStatusId !== '' &&
                              row.rtrLoanStatusId != null &&
                              !activeStatuses.some(
                                (item) => Number(item.rtrLoanStatusId) === Number(row.rtrLoanStatusId)
                              ) && (
                                <option value={row.rtrLoanStatusId} disabled>
                                  {row.statusName || 'Status unavailable'}
                                </option>
                              )}
                          </>
                        )}
                      </select>
                    </td>

                    {/* 6. Loan Amount (In Rs.) */}
                    <td className="bo-rtr-td">
                      <input
                        type="number"
                        placeholder="0"
                        className="bo-rtr-cell-input bo-rtr-cell-number"
                        value={row.loanAmount}
                        onChange={(e) => handleRowChange(row.id, 'loanAmount', e.target.value)}
                        disabled={obligationsSaving}
                      />
                    </td>

                    {/* 7. EMI */}
                    <td className="bo-rtr-td">
                      <input
                        type="number"
                        placeholder="0"
                        className="bo-rtr-cell-input bo-rtr-cell-number"
                        value={row.emi}
                        onChange={(e) => handleRowChange(row.id, 'emi', e.target.value)}
                        disabled={obligationsSaving}
                      />
                    </td>

                    {/* 8. POS */}
                    <td className="bo-rtr-td">
                      <input
                        type="number"
                        placeholder="0"
                        className="bo-rtr-cell-input bo-rtr-cell-number"
                        value={row.pos}
                        onChange={(e) => handleRowChange(row.id, 'pos', e.target.value)}
                        disabled={obligationsSaving}
                      />
                    </td>

                    {/* 9. Reflected in CIBIL */}
                    <td className="bo-rtr-td">
                      <select
                        className="bo-rtr-cell-select"
                        value={row.reflectedInCibil}
                        onChange={(e) => handleRowChange(row.id, 'reflectedInCibil', e.target.value)}
                        disabled={obligationsSaving}
                      >
                        <option value="">Select</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </td>

                    {/* 10. Start Date */}
                    <td className="bo-rtr-td">
                      <input
                        type="date"
                        className="bo-rtr-cell-input bo-rtr-cell-date"
                        value={row.startDate}
                        onChange={(e) => handleRowChange(row.id, 'startDate', e.target.value)}
                        disabled={obligationsSaving}
                      />
                    </td>

                    {/* 11. End Date */}
                    <td className="bo-rtr-td">
                      <input
                        type="date"
                        className="bo-rtr-cell-input bo-rtr-cell-date"
                        value={row.endDate}
                        onChange={(e) => handleRowChange(row.id, 'endDate', e.target.value)}
                        disabled={obligationsSaving}
                      />
                    </td>

                    {/* 12. Tenor (In months) */}
                    <td className="bo-rtr-td">
                      <input
                        type="number"
                        placeholder="0"
                        className="bo-rtr-cell-input bo-rtr-cell-number"
                        value={row.tenor}
                        onChange={(e) => handleRowChange(row.id, 'tenor', e.target.value)}
                        disabled={obligationsSaving}
                      />
                    </td>

                    {/* 13. Paid Tenor */}
                    <td className="bo-rtr-td">
                      <input
                        type="number"
                        placeholder="0"
                        className="bo-rtr-cell-input bo-rtr-cell-number"
                        value={row.paidTenor}
                        onChange={(e) => handleRowChange(row.id, 'paidTenor', e.target.value)}
                        disabled={obligationsSaving}
                      />
                    </td>

                    {/* 14. O/s Tenor */}
                    <td className="bo-rtr-td">
                      <input
                        type="number"
                        placeholder="0"
                        className="bo-rtr-cell-input bo-rtr-cell-number"
                        value={row.outstandingTenor}
                        onChange={(e) => handleRowChange(row.id, 'outstandingTenor', e.target.value)}
                        disabled={obligationsSaving}
                      />
                    </td>

                    {/* 15. No of bounce in Last 12 months */}
                    <td className="bo-rtr-td">
                      <input
                        type="number"
                        placeholder="0"
                        className="bo-rtr-cell-input bo-rtr-cell-number"
                        value={row.bounceCount}
                        onChange={(e) => handleRowChange(row.id, 'bounceCount', e.target.value)}
                        disabled={obligationsSaving}
                      />
                    </td>

                    {/* 16. FOR (Y/N) */}
                    <td className="bo-rtr-td">
                      <select
                        className="bo-rtr-cell-select"
                        value={row.forValue}
                        onChange={(e) => handleRowChange(row.id, 'forValue', e.target.value)}
                        disabled={obligationsSaving}
                      >
                        <option value="">Select</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </td>

                    {/* 17. DPD's in CIBIL report */}
                    <td className="bo-rtr-td">
                      <input
                        type="text"
                        placeholder="DPD"
                        className="bo-rtr-cell-input"
                        value={row.dpd}
                        onChange={(e) => handleRowChange(row.id, 'dpd', e.target.value)}
                        disabled={obligationsSaving}
                      />
                    </td>

                    {/* 18. Comment on RTR */}
                    <td className="bo-rtr-td">
                      <input
                        type="text"
                        placeholder="Remarks / comments"
                        className="bo-rtr-cell-input bo-rtr-cell-wide"
                        value={row.rtrComment}
                        onChange={(e) => handleRowChange(row.id, 'rtrComment', e.target.value)}
                        disabled={obligationsSaving}
                      />
                    </td>

                    {/* 19. Actions */}
                    <td className="bo-rtr-td bo-rtr-td-actions">
                      <button
                        type="button"
                        className="bo-rtr-remove-row-btn"
                        onClick={() => handleRemoveRow(row)}
                        title={row.applicationLoanObligationDetailsId ? 'Delete saved obligation' : 'Remove draft row'}
                        aria-label={`Remove row ${idx + 1}`}
                        disabled={obligationsSaving}
                      >
                        {Trash2Icon ? <Trash2Icon size={14} /> : <span>×</span>}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bo-rtr-table-footer">
            <div className="bo-rtr-footer-actions">
              <button
                type="button"
                className="bo-rtr-add-row-btn bo-rtr-add-row-btn--bottom"
                onClick={handleAddRow}
                disabled={obligationsSaving}
              >
                {PlusIcon ? <PlusIcon size={14} /> : <span>+</span>}
                <span>Add Row</span>
              </button>
              <button
                type="button"
                className="bo-rtr-save-btn"
                onClick={handleSaveObligations}
                disabled={obligationsSaving || obligationsLoading}
                aria-label="Save Obligations"
              >
                {SaveIcon ? <SaveIcon size={14} /> : null}
                <span>{obligationsSaving ? 'Saving...' : 'Save Obligations'}</span>
              </button>
            </div>
            <span className="bo-rtr-rows-counter">
              Total rows: <strong>{rows.length}</strong>
            </span>
          </div>
        </section>
      </div>

      {/* Delete Confirmation Modal for Saved Rows */}
      {deleteConfirmRow && (
        <div className="bo-rtr-modal-overlay" role="dialog" aria-modal="true">
          <div className="bo-rtr-modal-card">
            <h4 className="bo-rtr-modal-title">Delete Obligation Record?</h4>
            <p className="bo-rtr-modal-desc">
              Are you sure you want to delete the loan obligation facility for{' '}
              <strong>
                "{deleteConfirmRow.borrowerName || deleteConfirmRow.bankName || `Record #${deleteConfirmRow.applicationLoanObligationDetailsId}`}"
              </strong>?
              This action will remove the record from the database.
            </p>
            <div className="bo-rtr-modal-actions">
              <button
                type="button"
                className="bo-rtr-btn-secondary"
                onClick={() => setDeleteConfirmRow(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="bo-rtr-btn-danger"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
