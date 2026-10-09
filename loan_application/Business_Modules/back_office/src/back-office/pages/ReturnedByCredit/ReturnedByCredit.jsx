/**
 * ReturnedByCredit.jsx
 * --------------------
 * Back Office queue of applications the Credit Manager returned for correction.
 *
 * Route: /backoffice/returned-by-credit
 *
 * Responsibilities:
 * - Lists status-2 applications whose latest Credit Manager decision is ReturnedToBackOffice.
 * - Shows the Credit Manager's remarks (what needs to be corrected), who returned it and when.
 * - "Correct Entries" opens the verification workspace, where the Back Office fixes the entries.
 * - "Send to Credit Manager" re-submits the corrected application (status 2 -> 3). It is enabled
 *   only when the application passes the same readiness checks as the normal submission.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import iconMap from '../../config/iconMap';
import { buildRoute } from '../../config/routeConfig';
import { useCustomerQueue } from '../../hooks/useCustomerQueue';
import { useCreditReturns } from '../../hooks/useCreditReturns';
import backOfficeService from '../../api/backOfficeService';
import { getBackOfficeAuth } from '../../auth/authStorage';
import Pagination from '../../components/Pagination/Pagination';
import { getReturnItemStep } from '../../config/creditReturnFields';
import { RETURN_ITEM_STATUS, RETURN_ITEM_STATUS_META, mapCreditReturnItem } from '../../mappers/creditReturnMapper';
import '../SubmitToCredit/SubmitToCredit.css';
import '../../components/CreditReturnPanel/CreditReturnPanel.css';
import './ReturnedByCredit.css';

/** Verification workspace URL opened at the section the item belongs to. */
function buildSectionRoute(custId, item) {
  return `${buildRoute.customerVerification(custId)}?step=${Number(getReturnItemStep(item).visibleNum)}`;
}

function formatCurrency(amount) {
  const num = Number(amount);
  if (!amount || isNaN(num) || num === 0) return '₹0';
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

function formatDateTime(value) {
  const date = parseDate(value);
  if (!date) return '—';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isWithinRange(value, fromDate, toDate) {
  if (!fromDate && !toDate) return true;
  const date = parseDate(value);
  if (!date) return false;
  if (fromDate && date < new Date(`${fromDate}T00:00:00`)) return false;
  if (toDate && date > new Date(`${toDate}T23:59:59.999`)) return false;
  return true;
}

function getAppNo(c) {
  return c.appId || (c.applicationNo && c.applicationNo !== 'N/A' && !c.applicationNo.startsWith('APP-') ? c.applicationNo : 'N/A');
}

const REMARKS_MAX = 2000;

function getBackOfficeUserId() {
  const auth = getBackOfficeAuth();
  const candidates = [auth?.backOfficeId, auth?.id, localStorage.getItem('backOfficeId')];
  for (const value of candidates) {
    const num = Number(value);
    if (value != null && !isNaN(num) && num > 0) return num;
  }
  return null;
}

function getApiError(err, fallback) {
  const data = err?.response?.data;
  return (typeof data === 'string' && data) || data?.message || data?.title || err?.message || fallback;
}

function IssueResolveRow({ item, disabled, onResolved }) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const CheckIcon = iconMap['Check'];

  const handleResolve = async () => {
    const trimmed = note.trim();
    if (!trimmed) {
      setError('Describe how this field was corrected.');
      return;
    }
    const backOfficeId = getBackOfficeUserId();
    if (!backOfficeId) {
      setError('Unable to identify the logged-in Back Office user. Please login again.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const updated = mapCreditReturnItem(
        await backOfficeService.resolveCreditReturnItem(item.id, {
          resolvedByUserId: backOfficeId,
          resolvedByRole: 'BackOffice',
          resolutionNote: trimmed,
        })
      );
      onResolved(item, trimmed, updated?.id != null ? updated : null);
    } catch (err) {
      setError(getApiError(err, 'Unable to mark this field as corrected.'));
      setSaving(false);
    }
  };

  return (
    <li className={item.isResolved ? 'is-resolved' : 'is-open'}>
      <div className="rbc-issue-title">
        <strong>
          {!item.isResolved && <span className="crp-indicator" aria-hidden="true" />} {item.sectionName} › {item.fieldLabel}
        </strong>
        <span className={`crp-pill ${RETURN_ITEM_STATUS_META[item.itemStatus]?.className || 'crp-pill--open'}`}>
          {RETURN_ITEM_STATUS_META[item.itemStatus]?.label || item.itemStatus}
        </span>
      </div>
      <p className="rbc-issue-text"><span>Credit Manager:</span> {item.issue}</p>

      {item.isResolved ? (
        <p className="rbc-issue-fix"><span>Fix:</span> {item.resolutionNote || '—'}</p>
      ) : (
        <div className="rbc-issue-resolve">
          <textarea
            rows={2}
            maxLength={REMARKS_MAX}
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setError('');
            }}
            placeholder="What did you correct? e.g. Updated PAN to ABCDE1234F as per PAN card."
            disabled={disabled || saving}
          />
          <button
            type="button"
            className="stc-btn-review"
            onClick={handleResolve}
            disabled={disabled || saving}
          >
            {CheckIcon && <CheckIcon size={14} />}
            <span>{saving ? 'Saving...' : 'Resolve'}</span>
          </button>
          {error && <small className="rbc-inline-error">{error}</small>}
        </div>
      )}
    </li>
  );
}

function ResendModal({ application, onClose, onSent, onItemResolved }) {
  const [items, setItems] = useState(application.returnItems || []);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const XIcon = iconMap['X'];
  const SendIcon = iconMap['Send'];

  const custId = application.agentCustomerId || application.id;
  const hasItems = items.length > 0;
  const openCount = items.filter((item) => !item.isResolved).length;
  const canSend = application.isCreditReady && openCount === 0;

  const handleItemResolved = (resolvedItem, note, updated) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id !== resolvedItem.id
          ? item
          : updated || {
              ...item,
              itemStatus: RETURN_ITEM_STATUS.RESOLVED,
              isResolved: true,
              resolutionNote: note,
              resolvedAt: new Date().toISOString(),
            }
      )
    );
    onItemResolved();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSend) return;
    let trimmed = remarks.trim();
    if (!trimmed && hasItems) {
      trimmed = items
        .map((item) => `${item.sectionName} › ${item.fieldLabel}: ${item.resolutionNote}`)
        .join('\n')
        .slice(0, REMARKS_MAX);
    }
    if (!trimmed) {
      setError('Please describe the corrections made before resending.');
      return;
    }
    const backOfficeId = getBackOfficeUserId();
    if (!backOfficeId) {
      setError('Unable to identify the logged-in Back Office user. Please login again.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await backOfficeService.sendApplicationToCreditManager(custId, {
        performedByUserId: backOfficeId,
        performedByRole: 'BackOffice',
        remarks: trimmed,
      });
      onSent(application);
    } catch (err) {
      setError(getApiError(err, 'Failed to send the application to the Credit Manager.'));
      setSubmitting(false);
    }
  };

  return (
    <div className="stc-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="rbc-resend-title">
      <form className={`stc-modal-window rbc-modal${hasItems ? ' rbc-modal--wide' : ''}`} onSubmit={handleSubmit} noValidate>
        <div className="stc-modal-header">
          <h3 id="rbc-resend-title">Resolve &amp; Resubmit to Credit Manager</h3>
          <button type="button" className="stc-modal-close-btn" onClick={onClose} disabled={submitting} aria-label="Close">
            {XIcon && <XIcon size={20} />}
          </button>
        </div>

        <div className="stc-modal-body rbc-modal-body">
          <p className="rbc-modal-intro">
            Application <strong>{getAppNo(application)}</strong> for{' '}
            <strong>{application.customerName || application.fullName || 'Customer'}</strong>. Correct each flagged
            field in the verification workspace, mark it corrected here, then send it back to the Credit Manager.
          </p>

          {hasItems ? (
            <div className="rbc-modal-cm-remarks">
              <span className="rbc-label">
                Fields to correct · {items.length - openCount} of {items.length} corrected
              </span>
              <ul className="rbc-issue-list">
                {items.map((item) => (
                  <IssueResolveRow
                    key={item.id}
                    item={item}
                    disabled={submitting}
                    onResolved={handleItemResolved}
                  />
                ))}
              </ul>
            </div>
          ) : (
            <div className="rbc-modal-cm-remarks">
              <span className="rbc-label">Credit Manager asked to correct</span>
              <span className="rbc-remarks">{application.returnRemarks || '—'}</span>
            </div>
          )}

          {!application.isCreditReady && (
            <div className="rbc-error">
              Verification is incomplete. Complete all mandatory verification steps and resolve rejections before sending.
            </div>
          )}

          <label className="rbc-field">
            <span className="rbc-label">{hasItems ? 'Note to Credit Manager (optional)' : 'Corrections made *'}</span>
            <textarea
              rows={hasItems ? 2 : 4}
              maxLength={REMARKS_MAX}
              value={remarks}
              onChange={(e) => {
                setRemarks(e.target.value);
                setError('');
              }}
              placeholder="Describe what was corrected so the Credit Manager can re-check it."
              disabled={submitting}
            />
            <span className="rbc-hint">{remarks.length}/{REMARKS_MAX}</span>
          </label>

          {error && <div className="rbc-error" role="alert">{error}</div>}
        </div>

        <div className="rbc-modal-footer">
          <button type="button" className="stc-btn-doc stc-btn-doc--outline" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="submit"
            className="stc-btn-doc stc-btn-doc--primary"
            disabled={submitting || !canSend}
            title={openCount > 0 ? `Mark all ${openCount} open field(s) as corrected first` : undefined}
          >
            {SendIcon && <SendIcon size={14} />}
            <span>
              {submitting
                ? 'Sending...'
                : openCount > 0
                ? `${openCount} Field${openCount === 1 ? '' : 's'} Still Open`
                : 'Resubmit to Credit Manager'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ReturnedByCredit() {
  const navigate = useNavigate();
  const { customers, loading: queueLoading, error: queueError, refetch: refetchQueue } = useCustomerQueue();
  const {
    returnedApplications,
    loading: returnsLoading,
    error: returnsError,
    refetch: refetchReturns,
  } = useCreditReturns(customers);

  const loading = queueLoading || returnsLoading;
  const error = queueError || returnsError;

  const [searchTerm, setSearchTerm] = useState('');
  const [districtFilter, setDistrictFilter] = useState('All');
  const [rmFilter, setRmFilter] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [resendTarget, setResendTarget] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const SearchIcon = iconMap['Search'];
  const CalendarIcon = iconMap['Calendar'];
  const RotateCcwIcon = iconMap['RotateCcw'];
  const RefreshCwIcon = iconMap['RefreshCw'];
  const Edit3Icon = iconMap['Edit3'];
  const SendIcon = iconMap['Send'];
  const CheckCircleIcon = iconMap['CheckCircle'];
  const XIcon = iconMap['X'];

  const districtOptions = useMemo(
    () => [...new Set(returnedApplications.map((c) => c.districtName).filter(Boolean))].sort(),
    [returnedApplications]
  );
  const rmOptions = useMemo(
    () => [...new Set(returnedApplications.map((c) => c.rmName).filter(Boolean))].sort(),
    [returnedApplications]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, districtFilter, rmFilter, fromDate, toDate]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return returnedApplications
      .filter((c) => {
        if (!isWithinRange(c.returnedAt, fromDate, toDate)) return false;
        if (districtFilter !== 'All' && String(c.districtName || '').toLowerCase() !== districtFilter.toLowerCase()) return false;
        if (rmFilter !== 'All' && String(c.rmName || '').toLowerCase() !== rmFilter.toLowerCase()) return false;
        if (!term) return true;
        return (
          String(c.customerName || c.fullName || '').toLowerCase().includes(term) ||
          String(c.mobile || c.mobileNumber || '').includes(term) ||
          String(getAppNo(c)).toLowerCase().includes(term) ||
          String(c.returnRemarks || '').toLowerCase().includes(term) ||
          c.returnItems.some((item) => `${item.sectionName} ${item.fieldLabel}`.toLowerCase().includes(term))
        );
      })
      .sort((a, b) => (parseDate(b.returnedAt)?.getTime() || 0) - (parseDate(a.returnedAt)?.getTime() || 0));
  }, [returnedApplications, searchTerm, districtFilter, rmFilter, fromDate, toDate]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const hasFilters = searchTerm || fromDate || toDate || districtFilter !== 'All' || rmFilter !== 'All';

  const handleRefresh = () => {
    refetchQueue();
    refetchReturns();
  };

  const handleSent = (application) => {
    setResendTarget(null);
    setSuccessMessage(
      `Application ${getAppNo(application)} has been resubmitted to the Credit Manager for review.`
    );
    refetchQueue();
    refetchReturns();
  };

  return (
    <div className="stc-page-container">
      {successMessage && (
        <div className="rbc-success" role="status">
          {CheckCircleIcon && <CheckCircleIcon size={18} />}
          <span>{successMessage}</span>
          <button type="button" onClick={() => setSuccessMessage('')} aria-label="Dismiss">
            {XIcon && <XIcon size={16} />}
          </button>
        </div>
      )}

      <div className="stc-controls-card">
        <div className="stc-filter-row-top">
          <div className="stc-search-bar">
            {SearchIcon && <SearchIcon size={16} className="stc-search-icon" />}
            <input
              type="text"
              placeholder="Search by customer name, mobile, application ID or remarks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="stc-search-input"
              aria-label="Search returned applications"
            />
          </div>
          <div className="stc-count-badge">
            Showing <strong>{filtered.length}</strong> of {returnedApplications.length} Returned Applications
          </div>
        </div>

        <div className="stc-filter-row-bottom">
          <div className="stc-select-wrap">
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="stc-filter-select"
              aria-label="Filter by District"
            >
              <option value="All">All Districts</option>
              {districtOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="stc-select-wrap">
            <select
              value={rmFilter}
              onChange={(e) => setRmFilter(e.target.value)}
              className="stc-filter-select"
              aria-label="Filter by Relationship Manager"
            >
              <option value="All">All RMs</option>
              {rmOptions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <label className="stc-unified-date-box">
            {CalendarIcon && <CalendarIcon size={14} className="stc-date-icon" />}
            <span className="stc-date-prefix">Returned From:</span>
            <input
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(e) => setFromDate(e.target.value)}
              className="stc-date-input"
              aria-label="Returned From Date"
            />
          </label>

          <label className="stc-unified-date-box">
            {CalendarIcon && <CalendarIcon size={14} className="stc-date-icon" />}
            <span className="stc-date-prefix">To:</span>
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => setToDate(e.target.value)}
              className="stc-date-input"
              aria-label="Returned To Date"
            />
          </label>

          {hasFilters && (
            <button
              type="button"
              className="stc-btn-reset-filter"
              onClick={() => {
                setSearchTerm('');
                setFromDate('');
                setToDate('');
                setDistrictFilter('All');
                setRmFilter('All');
              }}
              title="Reset all filters"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="stc-table-card">
        <div className="stc-table-header">
          <h2 className="stc-table-title">
            {RotateCcwIcon && <RotateCcwIcon size={18} style={{ color: '#00593b' }} />}
            <span>Applications Returned by Credit Manager</span>
          </h2>
          <button type="button" className="stc-btn-review" onClick={handleRefresh} disabled={loading}>
            {RefreshCwIcon && <RefreshCwIcon size={14} />}
            <span>Refresh</span>
          </button>
        </div>

        {error && !loading && (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#dc2626' }}>
            <p>Unable to load returned applications: {error}</p>
            <button
              type="button"
              className="stc-btn-review"
              onClick={handleRefresh}
              style={{ marginTop: '0.5rem', display: 'inline-flex' }}
            >
              {RefreshCwIcon && <RefreshCwIcon size={14} />} Retry
            </button>
          </div>
        )}

        {loading && (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <p>Loading applications returned by the Credit Manager...</p>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="stc-table-scroll">
              <table className="stc-table">
                <thead>
                  <tr>
                    <th>Application No &amp; Date</th>
                    <th>Customer Name</th>
                    <th>Loan Product</th>
                    <th>Amount</th>
                    <th>Assigned RM &amp; Agent</th>
                    <th>Returned On &amp; By</th>
                    <th>Fields to Correct</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((c) => {
                    const custId = c.agentCustomerId || c.id;
                    const appNo = getAppNo(c);
                    const appliedDate = c.createdAt || c.appliedDate;
                    return (
                      <tr key={custId}>
                        <td>
                          <strong>{appNo}</strong>
                          <div className="stc-customer-sub">
                            {appliedDate ? String(appliedDate).slice(0, 10) : '—'}
                          </div>
                        </td>
                        <td>
                          <div className="stc-customer-cell">
                            <span className="stc-customer-name">{c.customerName || c.fullName || 'Customer'}</span>
                            <span className="stc-customer-sub">{c.mobile || c.mobileNumber || ''}</span>
                          </div>
                        </td>
                        <td>{c.loanType || c.loanProduct || '—'}</td>
                        <td>
                          <span className="stc-amount-cell">
                            {formatCurrency(c.expectedLoanAmount || c.loanAmount || c.amount)}
                          </span>
                        </td>
                        <td>
                          <div><strong>RM:</strong> {c.rmName || '—'}</div>
                          <div className="stc-customer-sub"><strong>Agent:</strong> {c.agentName || '—'}</div>
                        </td>
                        <td>
                          <div>{formatDateTime(c.returnedAt)}</div>
                          <div className="stc-customer-sub">{c.returnedByName}</div>
                        </td>
                        <td className="rbc-remarks-cell">
                          {c.returnItems.length > 0 ? (
                            <div className="rbc-field-chips">
                              <span className="rbc-field-count">
                                {c.openReturnItems.length} open · {c.returnItems.length - c.openReturnItems.length} corrected
                              </span>
                              {c.returnItems.map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  className={`rbc-field-chip${item.isResolved ? ' is-resolved' : ''}`}
                                  title={`Open ${item.sectionName} to see the Credit Manager remarks`}
                                  onClick={() => navigate(buildSectionRoute(custId, item))}
                                  aria-label={`Open ${item.sectionName}${item.isResolved ? '' : ' (action required)'}`}
                                >
                                  <strong>
                                    {!item.isResolved && <span className="crp-indicator" aria-hidden="true" />}
                                    {item.sectionName} › {item.fieldLabel}
                                  </strong>
                                  <span>{item.issue}</span>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span className="rbc-remarks">{c.returnRemarks || '—'}</span>
                          )}
                        </td>
                        <td>
                          <div className="rbc-actions">
                            <button
                              type="button"
                              className="rbc-btn-outline"
                              onClick={() =>
                                navigate(
                                  c.openReturnItems.length > 0
                                    ? buildSectionRoute(custId, c.openReturnItems[0])
                                    : buildRoute.customerVerification(custId)
                                )
                              }
                              aria-label={`Correct entries for application ${appNo}`}
                            >
                              {Edit3Icon && <Edit3Icon size={14} />}
                              <span>Correct Entries</span>
                            </button>
                            <button
                              type="button"
                              className="stc-btn-review"
                              onClick={() => setResendTarget(c)}
                              title="Mark corrected fields and send the application to the Credit Manager"
                              aria-label={`Mark corrections and send application ${appNo} to Credit Manager`}
                            >
                              {SendIcon && <SendIcon size={14} />}
                              <span>
                                {c.openReturnItems.length > 0 ? 'Resolve Items' : 'Resubmit to Credit Manager'}
                              </span>
                            </button>
                            {!c.isCreditReady && (
                              <span className="rbc-not-ready">Verification incomplete</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                        {returnedApplications.length === 0
                          ? 'No applications have been returned by the Credit Manager.'
                          : 'No returned applications match your filters.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {filtered.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={filtered.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                pageSizeOptions={[5, 10, 20, 50]}
              />
            )}
          </>
        )}
      </div>

      {resendTarget && (
        <ResendModal
          application={resendTarget}
          onClose={() => setResendTarget(null)}
          onSent={handleSent}
          onItemResolved={refetchReturns}
        />
      )}
    </div>
  );
}
