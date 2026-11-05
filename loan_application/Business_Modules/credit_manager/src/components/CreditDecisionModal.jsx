/**
 * CreditDecisionModal.jsx
 * --------------------
 * Approve / Reject / Return-to-Back-Office dialog for the Credit Manager.
 *
 *   - Approve -> POST /ApplicationWorkflow/:id/credit-approve        (3 -> 4)
 *   - Reject  -> POST /ApplicationWorkflow/:id/credit-reject         (3 -> 5)
 *   - Return  -> POST /ApplicationWorkflow/:id/return-to-backoffice  (3 -> 2), with flagged fields
 */

import React, { useState } from 'react';
import iconMap from '../../../back_office/src/back-office/config/iconMap';
import creditManagerService from '../api/creditManagerService';
import { getCreditManagerId } from '../auth/authStorage';
import ReturnIssuesBuilder from './ReturnIssuesBuilder';

export const REMARKS_MAX = 2000;

export const DECISION_ACTIONS = {
  APPROVE: {
    key: 'APPROVE',
    title: 'Approve Application',
    confirmLabel: 'Approve Application',
    remarksLabel: 'Approval Remarks',
    remarksPlaceholder: 'Optional. Summarise the credit assessment behind this approval.',
    defaultRemarks: 'Approved as per RTR proposed loan terms.',
    successMessage: 'Application approved successfully.',
    call: creditManagerService.creditApprove,
  },
  REJECT: {
    key: 'REJECT',
    title: 'Reject Application',
    confirmLabel: 'Reject Application',
    remarksLabel: 'Rejection Reason',
    remarksPlaceholder: 'Explain why this application is being rejected.',
    successMessage: 'Application rejected.',
    call: creditManagerService.creditReject,
  },
  RETURN: {
    key: 'RETURN',
    title: 'Return to Back Office',
    confirmLabel: 'Return to Back Office',
    remarksLabel: 'Overall note to Back Office',
    remarksPlaceholder: 'Optional summary. If left empty, the flagged fields are used as the note.',
    successMessage: 'Application returned to the Back Office for correction.',
    call: creditManagerService.returnToBackOffice,
  },
};

export function getErrorMessage(err, fallback) {
  const data = err?.response?.data;
  if (typeof data === 'string' && data.trim()) return data;
  if (data?.message) return data.message;
  if (data?.title) return data.title;
  if (data?.errors && typeof data.errors === 'object') {
    const first = Object.values(data.errors).flat()[0];
    if (first) return String(first);
  }
  return err?.message || fallback;
}

function positive(value) {
  const num = Number(value);
  return value !== null && value !== undefined && value !== '' && Number.isFinite(num) && num > 0 ? num : null;
}

function formatAmount(value) {
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export default function CreditDecisionModal({
  action,
  sanctionTerms,
  initialIssues = [],
  onIssuesChange,
  onClose,
  onSubmitted,
}) {
  const isApprove = action.key === 'APPROVE';
  const isReturn = action.key === 'RETURN';
  const [issues, setIssues] = useState(initialIssues);
  const [form, setForm] = useState({ conditions: '', remarks: '' });
  const termsLoading = Boolean(sanctionTerms?.loading);
  const sanctionedAmount = positive(sanctionTerms?.amount);
  const sanctionedROI = positive(sanctionTerms?.roi);
  const sanctionedTenure = positive(sanctionTerms?.tenure);
  const hasSanctionTerms =
    sanctionedAmount != null &&
    sanctionedROI != null &&
    sanctionedROI <= 100 &&
    sanctionedTenure != null &&
    Number.isInteger(sanctionedTenure) &&
    sanctionedTenure <= 480;
  const approveBlocked = isApprove && (termsLoading || !hasSanctionTerms);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const XIcon = iconMap['X'];
  const AlertCircleIcon = iconMap['AlertCircle'];

  const setField = (field) => (e) => {
    const { value } = e.target;
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const next = {};
    const remarks = form.remarks.trim();
    if (isReturn) {
      if (issues.length === 0) next.issues = 'Add at least one field the Back Office must correct.';
    } else if (!remarks && !isApprove) {
      next.remarks = `${action.remarksLabel} is required.`;
    }
    if (remarks.length > REMARKS_MAX) next.remarks = `Maximum ${REMARKS_MAX} characters allowed.`;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || approveBlocked || !validate()) return;

    const creditManagerId = getCreditManagerId();
    if (!creditManagerId) {
      setSubmitError('Your Credit Manager session has expired. Please log in again.');
      return;
    }

    const payload = {
      performedByUserId: Number(creditManagerId),
      performedByRole: 'CreditManager',
      remarks: form.remarks.trim(),
    };
    if (isReturn) {
      payload.returnItems = issues.map(({ sectionCode, sectionName, fieldKey, fieldLabel, issue }) => ({
        sectionCode,
        sectionName,
        fieldKey,
        fieldLabel,
        issue,
      }));
      if (!payload.remarks) {
        payload.remarks = issues
          .map((item) => `${item.sectionName} › ${item.fieldLabel}: ${item.issue}`)
          .join('\n')
          .slice(0, REMARKS_MAX);
      }
    }
    if (isApprove) {
      payload.remarks = payload.remarks || action.defaultRemarks;
      payload.sanctionedLoanAmount = sanctionedAmount;
      payload.sanctionedROI = sanctionedROI;
      payload.sanctionedTenureMonths = sanctionedTenure;
      payload.conditions = form.conditions.trim() || null;
    }

    setSubmitting(true);
    setSubmitError('');
    try {
      await onSubmitted(action, payload);
    } catch (err) {
      const status = err?.response?.status;
      setSubmitError(
        status === 409
          ? 'This application has already been actioned. Refresh the page to see the latest status.'
          : getErrorMessage(err, 'Unable to save the decision. Please try again.')
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="stc-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="cm-decision-title">
      <form
        className={`stc-modal-window cm-decision-modal${isReturn ? ' cm-decision-modal--wide' : ''}`}
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="stc-modal-header">
          <h3 id="cm-decision-title">{action.title}</h3>
          <button
            type="button"
            className="stc-modal-close-btn"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
          >
            {XIcon && <XIcon size={20} />}
          </button>
        </div>

        <div className="stc-modal-body cm-decision-body">
          {submitError && (
            <div className="cm-form-alert" role="alert">
              {AlertCircleIcon && <AlertCircleIcon size={16} />}
              <span>{submitError}</span>
            </div>
          )}

          {isApprove && !termsLoading && !hasSanctionTerms && (
            <div className="cm-form-alert" role="alert">
              {AlertCircleIcon && <AlertCircleIcon size={16} />}
              <span>RTR proposed loan terms are not saved. Complete the RTR Common Sheet (amount, ROI and tenure) before approving.</span>
            </div>
          )}

          {isApprove && (
            <div className="cm-form-grid">
              <div className="cm-form-field">
                <span>Sanctioned Loan Amount (₹)</span>
                <div className="cm-form-readonly">
                  {termsLoading ? 'Loading…' : sanctionedAmount != null ? formatAmount(sanctionedAmount) : '—'}
                </div>
              </div>
              <div className="cm-form-field">
                <span>Sanctioned ROI (% p.a.)</span>
                <div className="cm-form-readonly">
                  {termsLoading ? 'Loading…' : sanctionedROI != null ? `${sanctionedROI}%` : '—'}
                </div>
              </div>
              <div className="cm-form-field">
                <span>Sanctioned Tenure (Months)</span>
                <div className="cm-form-readonly">
                  {termsLoading ? 'Loading…' : sanctionedTenure != null ? `${sanctionedTenure} months` : '—'}
                </div>
              </div>
              <p className="cm-form-note">Taken from the RTR Common Sheet proposed loan and cannot be changed here.</p>
              <label className="cm-form-field cm-form-field--full">
                <span>Sanction Conditions</span>
                <textarea
                  rows={3}
                  value={form.conditions}
                  onChange={setField('conditions')}
                  placeholder="Optional conditions, e.g. original property documents before disbursement."
                />
              </label>
            </div>
          )}

          {isReturn && (
            <ReturnIssuesBuilder
              issues={issues}
              onChange={(next) => {
                setIssues(next);
                onIssuesChange?.(next);
                setErrors((prev) => ({ ...prev, issues: undefined }));
              }}
              disabled={submitting}
              error={errors.issues}
            />
          )}

          <label className="cm-form-field cm-form-field--full">
            <span>{action.remarksLabel}{isReturn || isApprove ? '' : ' *'}</span>
            <textarea
              rows={isReturn ? 2 : 4}
              maxLength={REMARKS_MAX}
              value={form.remarks}
              onChange={setField('remarks')}
              placeholder={action.remarksPlaceholder}
              className={errors.remarks ? 'cm-input--error' : ''}
            />
            <div className="cm-form-hint">
              {errors.remarks ? <small>{errors.remarks}</small> : <span />}
              <span>{form.remarks.length}/{REMARKS_MAX}</span>
            </div>
          </label>
        </div>

        <div className="cm-decision-footer">
          <button type="button" className="stc-btn-doc stc-btn-doc--outline" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="submit"
            className={`stc-btn-doc cm-btn-${action.key.toLowerCase()}`}
            disabled={submitting || approveBlocked}
          >
            {submitting ? 'Saving...' : action.confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
