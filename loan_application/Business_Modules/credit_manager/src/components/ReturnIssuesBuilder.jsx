/**
 * ReturnIssuesBuilder.jsx
 * --------------------
 * Lets the Credit Manager flag the exact fields the Back Office must correct:
 * pick a section, pick a field (or "Other"), describe the issue, add to the list.
 */

import React, { useMemo, useState } from 'react';
import iconMap from '../../../back_office/src/back-office/config/iconMap';
import {
  CREDIT_RETURN_SECTIONS,
  OTHER_FIELD_KEY,
  getCreditReturnSection,
} from '../../../back_office/src/back-office/config/creditReturnFields';

export const ISSUE_MAX = 1000;

const EMPTY_DRAFT = { sectionCode: '', fieldKey: '', otherLabel: '', issue: '' };

export default function ReturnIssuesBuilder({ issues, onChange, disabled, error }) {
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [draftError, setDraftError] = useState('');

  const PlusIcon = iconMap['FilePlus'];
  const TrashIcon = iconMap['Trash2'];

  const section = useMemo(() => getCreditReturnSection(draft.sectionCode), [draft.sectionCode]);

  const update = (field) => (e) => {
    const { value } = e.target;
    setDraft((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'sectionCode' ? { fieldKey: '', otherLabel: '' } : {}),
    }));
    setDraftError('');
  };

  const handleAdd = () => {
    if (!section) return setDraftError('Select the section that has the problem.');
    if (!draft.fieldKey) return setDraftError('Select the field that is wrong.');
    const isOther = draft.fieldKey === OTHER_FIELD_KEY;
    const fieldLabel = isOther
      ? draft.otherLabel.trim()
      : section.fields.find((f) => f.key === draft.fieldKey)?.label || '';
    if (!fieldLabel) return setDraftError('Enter the name of the field.');
    const issue = draft.issue.trim();
    if (!issue) return setDraftError('Describe what is wrong with this field.');

    const duplicate = issues.some(
      (item) =>
        item.sectionCode === section.code &&
        item.fieldKey === draft.fieldKey &&
        item.fieldLabel.toLowerCase() === fieldLabel.toLowerCase()
    );
    if (duplicate) return setDraftError('This field is already in the list. Edit or remove it below.');

    onChange([
      ...issues,
      {
        sectionCode: section.code,
        sectionName: section.name,
        fieldKey: draft.fieldKey,
        fieldLabel,
        issue: issue.slice(0, ISSUE_MAX),
      },
    ]);
    setDraft((prev) => ({ ...EMPTY_DRAFT, sectionCode: prev.sectionCode }));
  };

  const handleRemove = (index) => onChange(issues.filter((_, i) => i !== index));

  return (
    <div className="cm-issues">
      <div className="cm-issues-head">
        <span>Fields to correct *</span>
        <small>{issues.length} added</small>
      </div>

      <div className="cm-issues-builder">
        <div className="cm-form-grid">
          <label className="cm-form-field">
            <span>Section</span>
            <select value={draft.sectionCode} onChange={update('sectionCode')} disabled={disabled}>
              <option value="">Select section</option>
              {CREDIT_RETURN_SECTIONS.map((s) => (
                <option key={s.code} value={s.code}>{s.name}</option>
              ))}
            </select>
          </label>
          <label className="cm-form-field">
            <span>Field</span>
            <select value={draft.fieldKey} onChange={update('fieldKey')} disabled={disabled || !section}>
              <option value="">{section ? 'Select field' : 'Select a section first'}</option>
              {section?.fields.map((f) => (
                <option key={f.key} value={f.key}>{f.label}</option>
              ))}
              {section && <option value={OTHER_FIELD_KEY}>Other (type the field name)</option>}
            </select>
          </label>
          {draft.fieldKey === OTHER_FIELD_KEY ? (
            <label className="cm-form-field">
              <span>Field name</span>
              <input
                type="text"
                maxLength={150}
                value={draft.otherLabel}
                onChange={update('otherLabel')}
                placeholder="e.g. Nominee Name"
                disabled={disabled}
              />
            </label>
          ) : (
            <span />
          )}
          <label className="cm-form-field cm-form-field--full">
            <span>What is wrong</span>
            <textarea
              rows={2}
              maxLength={ISSUE_MAX}
              value={draft.issue}
              onChange={update('issue')}
              placeholder="e.g. PAN number does not match the PAN card image."
              disabled={disabled}
            />
          </label>
        </div>
        {draftError && <small className="cm-issues-error">{draftError}</small>}
        <div className="cm-issues-add">
          <button type="button" className="stc-btn-doc stc-btn-doc--outline" onClick={handleAdd} disabled={disabled}>
            {PlusIcon && <PlusIcon size={14} />}
            <span>Add Field</span>
          </button>
        </div>
      </div>

      {issues.length > 0 && (
        <ul className="cm-issues-list">
          {issues.map((item, index) => (
            <li key={`${item.sectionCode}-${item.fieldKey}-${item.fieldLabel}`}>
              <div>
                <strong>{item.sectionName} › {item.fieldLabel}</strong>
                <p>{item.issue}</p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                disabled={disabled}
                aria-label={`Remove ${item.fieldLabel}`}
              >
                {TrashIcon && <TrashIcon size={15} />}
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <small className="cm-issues-error">{error}</small>}
    </div>
  );
}
