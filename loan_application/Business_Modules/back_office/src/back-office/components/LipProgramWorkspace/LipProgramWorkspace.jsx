import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import backOfficeService from '../../api/backOfficeService';
import './LipProgramWorkspace.css';

const INPUT_FIELDS = [
  ['businessSales', 'Business Sales / Service receipts / Rental Income / Commission'],
  ['otherDirectIncome', 'Other Income (Direct business)'],
  ['purchases', 'Purchase of consumables / raw material'],
  ['labourSalaries', 'Labour / Staff Salaries'],
  ['fuel', 'Fuel (Petrol/Diesel/Gas)'],
  ['electricity', 'Electricity Expenses'],
  ['loadingUnloading', 'Loading / Unloading expenses'],
  ['rentMunicipality', 'Rental / Municipality payment'],
  ['commissionPaid', 'Commission Payment'],
  ['otherDirectExpenses', 'Other expenses (directly for business)'],
  ['stationery', 'Stationery'],
  ['staffWelfare', 'Staff welfare'],
  ['adminExpenses', 'Admin Expenses'],
  ['reimbursement', 'Reimbursement of expenses'],
  ['interestBankCharges', 'Interest & Bank Charges'],
  ['otherMiscExpenses', 'Other Misc. Exp.'],
];

const FIELD_TO_PERCENT = Object.fromEntries([
  ['businessSales', 'BusinessSales'], ['otherDirectIncome', 'OtherDirectIncome'],
  ['purchases', 'Purchases'], ['labourSalaries', 'LabourSalaries'], ['fuel', 'Fuel'],
  ['electricity', 'Electricity'], ['loadingUnloading', 'LoadingUnloading'],
  ['rentMunicipality', 'RentMunicipality'], ['commissionPaid', 'CommissionPaid'],
  ['otherDirectExpenses', 'OtherDirectExpenses'], ['stationery', 'Stationery'],
  ['staffWelfare', 'StaffWelfare'], ['adminExpenses', 'AdminExpenses'],
  ['reimbursement', 'Reimbursement'], ['interestBankCharges', 'InterestBankCharges'],
  ['otherMiscExpenses', 'OtherMiscExpenses'],
  // Calculated rows are also returned by the backend under percentOfRevenue.
  ['totalRevenue', 'TotalRevenue'],
  ['totalDirectExpenses', 'TotalDirectExpenses'],
  ['grossMargin', 'GrossMargin'],
  ['totalIndirectExpenses', 'TotalIndirectExpenses'],
  ['netMargin', 'NetMargin'],
  ['fdSavingInterest', 'FdSavingInterest'],
  ['otherIncome', 'OtherIncome'],
  ['totalMonthlyIncome', 'TotalMonthlyIncome'],
]);

const INITIAL_INPUTS = Object.fromEntries(INPUT_FIELDS.map(([key]) => [key, '']));

const amountFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const decimalFormatter = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function numberValue(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatAmount(value, options = {}) {
  const numeric = numberValue(value);
  if (numeric == null || numeric === 0) return '–';
  const text = options.decimal ? decimalFormatter.format(Math.abs(numeric)) : amountFormatter.format(Math.abs(numeric));
  return numeric < 0 ? `(${text})` : text;
}

function formatPercentFraction(value) {
  const numeric = numberValue(value);
  return numeric == null ? '–' : `${(numeric * 100).toFixed(2)}%`;
}

function formatDate(value) {
  if (!value) return '–';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '–';
  return date.toLocaleString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function responseInputs(record) {
  return Object.fromEntries(INPUT_FIELDS.map(([key]) => [key, record?.[key] == null ? '' : String(record[key])]));
}

function errorMessage(error, fallback) {
  return error?.response?.data?.message || error?.response?.data?.Message || error?.message || fallback;
}

function payloadFromInputs(inputs, foirPercent, context) {
  const payload = {
    applicationProductDetailsId: Number(context.applicationProductDetailsId),
    agentCustomerId: Number(context.agentCustomerId),
    applicantSequence: Number(context.applicantSequence || 0),
    foirPercent: numberValue(foirPercent) ?? 60,
    calculatedByUserId: context.calculatedByUserId,
    calculatedByBackOfficeId: context.calculatedByBackOfficeId,
    calculatedByRole: context.calculatedByRole,
  };
  INPUT_FIELDS.forEach(([key]) => { payload[key] = numberValue(inputs[key]); });
  return payload;
}

function displayValue(record, key, options) {
  if (key === 'bindingConstraint') return record?.[key] || '–';
  if (key === 'foirAchieved') return formatPercentFraction(record?.[key]);
  if (key === 'proposedROI') {
    const value = numberValue(record?.[key]);
    return value == null ? '–' : `${value.toFixed(2)}%`;
  }
  return formatAmount(record?.[key], options);
}

export default function LipProgramWorkspace({
  applicationProductDetailsId,
  agentCustomerId,
  applicantSequence = 0,
  onOpenProposedLoan,
  onBack,
}) {
  const [mode, setMode] = useState('loading');
  const [record, setRecord] = useState(null);
  const [draft, setDraft] = useState(INITIAL_INPUTS);
  const [foirPercent, setFoirPercent] = useState('60');
  const [preview, setPreview] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [previewError, setPreviewError] = useState(null);
  const [warning, setWarning] = useState([]);
  const [dirty, setDirty] = useState(false);
  const requestIdRef = useRef(0);
  const debounceRef = useRef(null);

  const context = useMemo(() => {
    let currentUser = null;
    try { currentUser = JSON.parse(localStorage.getItem('sivels_currentUser') || 'null'); } catch { currentUser = null; }
    const backOfficeId = Number(localStorage.getItem('backOfficeId') || currentUser?.backOfficeId || currentUser?.userId || currentUser?.id || 0) || null;
    return {
      applicationProductDetailsId, agentCustomerId, applicantSequence,
      calculatedByUserId: Number(currentUser?.userId || currentUser?.id || 0) || backOfficeId,
      calculatedByBackOfficeId: backOfficeId,
      calculatedByRole: currentUser?.role || 'BackOffice',
    };
  }, [applicationProductDetailsId, agentCustomerId, applicantSequence]);

  const runPreview = useCallback(async (nextDraft, nextFoir, options = {}) => {
    const requestId = ++requestIdRef.current;
    setPreviewLoading(true);
    if (!options.keepError) setPreviewError(null);
    try {
      const result = await backOfficeService.previewLipProgram(payloadFromInputs(nextDraft, nextFoir, context));
      if (requestId !== requestIdRef.current) return result;
      setPreview(result || null);
      return result;
    } catch (err) {
      if (requestId === requestIdRef.current) setPreviewError(errorMessage(err, 'Unable to preview LIP assessment.'));
      return null;
    } finally {
      if (requestId === requestIdRef.current) setPreviewLoading(false);
    }
  }, [context]);

  const loadCurrent = useCallback(async () => {
    setLoading(true); setError(null); setWarning([]);
    try {
      const current = await backOfficeService.getLipProgramCurrent(context.applicationProductDetailsId, context.applicantSequence);
      if (current?.lipProgramAssessmentId) {
        setRecord(current); setDraft(responseInputs(current)); setFoirPercent(String(current.foirPercentApplied ?? 60)); setMode('view');
        const fresh = await runPreview(responseInputs(current), current.foirPercentApplied ?? 60, { keepError: true });
        if (fresh) {
          const changes = [
            ['ROI', current.proposedROI, fresh.proposedROI, true],
            ['Tenure', current.proposedTenureMonths, fresh.proposedTenureMonths, false],
            ['Existing EMI', current.existingEMI, fresh.existingEMI, false],
            ['Eligible loan', current.eligibleLoanAmount, fresh.eligibleLoanAmount, false],
            ['Eligible EMI', current.eligibleEMI, fresh.eligibleEMI, false],
          ].filter(([, oldValue, newValue]) => numberValue(oldValue) !== numberValue(newValue));
          setWarning(changes);
        }
      } else {
        setRecord(null); setDraft({ ...INITIAL_INPUTS }); setFoirPercent('60'); setMode('new');
        await runPreview(INITIAL_INPUTS, '60');
      }
    } catch (err) {
      setMode('new'); setError(errorMessage(err, 'Unable to load LIP assessment.'));
      await runPreview(INITIAL_INPUTS, '60');
    } finally { setLoading(false); }
  }, [context, runPreview]);

  useEffect(() => { loadCurrent(); return () => clearTimeout(debounceRef.current); }, [loadCurrent]);

  const startEdit = (selected = record) => {
    if (!selected) { setMode('new'); return; }
    setDraft(responseInputs(selected));
    setFoirPercent(String(selected.foirPercentApplied ?? 60));
    setPreview(null); setWarning([]); setPreviewError(null); setDirty(false); setMode('edit');
    runPreview(responseInputs(selected), selected.foirPercentApplied ?? 60);
  };

  const updateInput = (key, value) => {
    const clean = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    setDraft((previous) => ({ ...previous, [key]: clean })); setDirty(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runPreview({ ...draft, [key]: clean }, foirPercent), 450);
  };

  const updateFoir = (value) => {
    const clean = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    setFoirPercent(clean); setDirty(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runPreview(draft, clean), 450);
  };

  const save = async () => {
    setSaving(true); setError(null);
    try {
      const saved = await backOfficeService.calculateLipProgram(payloadFromInputs(draft, foirPercent, context));
      setRecord(saved); setDraft(responseInputs(saved)); setFoirPercent(String(saved.foirPercentApplied ?? foirPercent));
      setPreview(saved); setWarning([]); setDirty(false); setMode('view');
    } catch (err) { setError(errorMessage(err, 'Unable to save LIP assessment.')); }
    finally { setSaving(false); }
  };

  const loadHistory = async () => {
    setHistoryOpen(true); setHistoryLoading(true); setError(null);
    try {
      const rows = await backOfficeService.getLipProgramHistory(context.applicationProductDetailsId, context.applicantSequence);
      const historyRows = Array.isArray(rows) ? rows : [];
      setHistory(historyRows.length > 0 ? historyRows : (record ? [record] : []));
    } catch (err) {
      // History is deployed independently from the calculation endpoints.
      // Until that route exists, show the empty state instead of a page-level error.
      if (err?.response?.status === 404) setHistory(record ? [record] : []);
      else setError(errorMessage(err, 'Unable to load LIP assessment history.'));
    }
    finally { setHistoryLoading(false); }
  };

  const selectHistoryRecord = async (item, edit = false) => {
    const selected = item?.lipProgramAssessmentId ? item : null;
    if (!selected) return;
    setRecord(selected); setDraft(responseInputs(selected)); setFoirPercent(String(selected.foirPercentApplied ?? 60));
    setPreview(selected); setWarning([]); setHistoryOpen(false); setDirty(false);
    if (edit) startEdit(selected); else setMode(selected.isCurrent ? 'view' : 'old');
  };

  const editable = mode === 'new' || mode === 'edit';
  // View/old mode must render the persisted record exactly as saved. Preview
  // values are only allowed to replace calculated fields while editing/new.
  const data = editable ? (preview || record || {}) : (record || preview || {});
  const status = mode === 'new' ? 'New – not saved' : mode === 'edit' ? `Editing${record?.calculationVersion ? ` – based on Version ${record.calculationVersion}` : ''}` : mode === 'old' ? `Viewing Version ${record?.calculationVersion} (old)` : `Saved – Version ${record?.calculationVersion || 1} (current)`;

  const renderRow = (label, key, options = {}) => {
    const percentKey = FIELD_TO_PERCENT[key];
    return <div className={`lip-row ${options.total ? 'is-total' : ''} ${options.highlight ? 'is-highlight' : ''}`} key={`${key}-${label}`}>
      <div className="lip-label">{label}{options.hint && <small>{options.hint}</small>}</div>
      <div className="lip-value">
        {editable && options.input ? <input aria-label={label} value={draft[key] ?? ''} onChange={(event) => updateInput(key, event.target.value)} inputMode="decimal" /> : displayValue(data, key, options)}
      </div>
      <div className="lip-percent">{percentKey ? formatPercentFraction(data?.percentOfRevenue?.[percentKey]) : ''}</div>
    </div>;
  };

  if (loading) return <div className="lip-workspace"><div className="lip-loading">Loading LIP assessment…</div></div>;

  return <div className="lip-workspace">
    <div className="lip-toolbar">
      <div><button type="button" className="lip-back-button" onClick={onBack}>← Back to Assessment</button><h2>LIP Program</h2><p>{context.applicantSequence === 0 ? 'Primary Applicant' : `Co-Applicant ${context.applicantSequence}`}</p></div>
      <div className="lip-toolbar-actions"><span className={`lip-status ${mode}`}>{status}</span>{mode === 'view' || mode === 'old' ? <button type="button" onClick={() => startEdit(record)}>Edit</button> : <button type="button" className="primary" disabled={saving || previewLoading} onClick={save}>{saving ? 'Saving…' : 'Save'}</button>} {editable && record && <button type="button" onClick={() => { setDraft(responseInputs(record)); setFoirPercent(String(record.foirPercentApplied ?? 60)); setDirty(false); setMode(record.isCurrent ? 'view' : 'old'); }}>Cancel</button>}<button type="button" onClick={loadHistory}>History</button></div>
    </div>
    {record && mode !== 'new' && <div className="lip-meta">Saved on {formatDate(record.calculatedAt)} by {record.calculatedByRole || '–'}</div>}
    {error && <div className="lip-banner error">{error}{/proposed loan/i.test(error) && <button type="button" onClick={onOpenProposedLoan}>Open Loan Obligations / Proposed Loan</button>}</div>}
    {previewError && <div className="lip-banner error">{previewError}</div>}
    {warning.length > 0 && <div className="lip-banner warning">Loan details have changed since this was saved: {warning.map(([label, oldValue, newValue]) => `${label} ${formatAmount(oldValue, { decimal: label === 'ROI' })} → ${formatAmount(newValue, { decimal: label === 'ROI' })}`).join(', ')}. Click Edit to recalculate and save a new version.</div>}

    <div className="lip-table" role="table" aria-label="LIP Program Monthly Cash Flow and FOIR Assessment">
      <div className="lip-header"><strong>Particulars</strong><strong>Amt (Rs.)</strong><strong>% of revenue</strong></div>
      <div className="lip-section">Revenue</div>
      {renderRow(INPUT_FIELDS[0][1], 'businessSales', { input: true })}{renderRow(INPUT_FIELDS[1][1], 'otherDirectIncome', { input: true })}{renderRow('Total Revenue', 'totalRevenue', { total: true })}
      <div className="lip-section">Direct Expenses</div>
      {INPUT_FIELDS.slice(2, 10).map(([key, label]) => renderRow(label, key, { input: true }))}{renderRow('Total Direct Expenses', 'totalDirectExpenses', { total: true })}{renderRow('Gross Margin / (Loss)', 'grossMargin', { total: true })}
      <div className="lip-section">Indirect Expenses</div>
      {INPUT_FIELDS.slice(10).map(([key, label]) => renderRow(label, key, { input: true }))}{renderRow('Total Indirect Expenses', 'totalIndirectExpenses', { total: true })}{renderRow('Net Margin / Profit or (Loss)', 'netMargin', { total: true })}
      {renderRow('Add: FD / Bank Saving Interest', 'fdSavingInterest')}{renderRow('Add: Other Income', 'otherIncome')}{renderRow('Total Monthly Income for FOIR', 'totalMonthlyIncome', { total: true })}
      <div className="lip-section">FOIR &amp; EMI Eligibility</div>
      {renderRow('Total monthly income (A)', 'totalMonthlyIncome')}{renderRow('Less: Household / family expenses', 'householdExpenses')}{renderRow('Less: Existing loan obligations (monthly EMIs)', 'existingEMI', { hint: 'From Loan Obligations (live, FOIR-applicable loans)' })}{renderRow('Net surplus after expenses & obligations', 'netSurplus', { total: true })}
      <div className="lip-row"><div className="lip-label">FOIR limit <small>Reset to 60% in Edit/New mode</small></div><div className="lip-value">{editable ? <input aria-label="FOIR limit" value={foirPercent} onChange={(event) => updateFoir(event.target.value)} suffix="%" /> : `${record?.foirPercentApplied ?? data?.foirPercentApplied ?? 60}%`}</div><div className="lip-percent" /></div>
      {renderRow('Max total obligations allowed at FOIR', 'maxObligationsAllowed')}{renderRow('Max EMI permitted by FOIR (after existing EMIs)', 'maxEMIByFOIR')}{renderRow('ELIGIBLE PRESENT LOAN EMI', 'eligibleEMI', { total: true, highlight: true })}{renderRow('Binding constraint', 'bindingConstraint')}{renderRow('FOIR achieved ((existing EMIs + new EMI) / income)', 'foirAchieved')}{renderRow('ROI p.a.', 'proposedROI', { hint: 'From Proposed Loan', decimal: true })}{renderRow('Tenure (months)', 'proposedTenureMonths', { hint: 'From Proposed Loan' })}{renderRow('Indicative loan amount supported by EMI', 'eligibleLoanAmount', { total: true })}{renderRow('EMI per lakh (Rs.)', 'emiPerLakh', { decimal: true })}
    </div>

    {historyOpen && <div className="lip-history-backdrop" onClick={() => setHistoryOpen(false)}><aside className="lip-history-panel" role="dialog" aria-modal="true" aria-labelledby="lip-history-title" onClick={(event) => event.stopPropagation()}><div className="lip-history-head"><h3 id="lip-history-title">LIP Assessment History</h3><button type="button" aria-label="Close history" onClick={() => setHistoryOpen(false)}>×</button></div>{historyLoading ? <div className="lip-loading">Loading history…</div> : history.length === 0 ? <p className="lip-history-empty">No saved assessments yet.</p> : <div className="lip-history-list">{history.map((item) => <div className="lip-history-item" key={item.lipProgramAssessmentId}><div className="lip-history-item-head"><div><strong>Version {item.calculationVersion}</strong>{item.isCurrent && <span className="lip-current">Current</span>}<small>{formatDate(item.calculatedAt)} · {item.calculatedByRole || '–'}</small></div></div><div className="lip-history-stats"><div><strong>{formatAmount(item.totalMonthlyIncome)}</strong><small>Total monthly income</small></div><div><strong>{formatAmount(item.eligibleEMI)}</strong><small>Eligible EMI</small></div><div><strong>{formatAmount(item.eligibleLoanAmount)}</strong><small>Eligible loan</small></div></div><div className="lip-history-actions"><button type="button" onClick={() => selectHistoryRecord(item)}>View</button><button type="button" onClick={() => selectHistoryRecord(item, true)}>Edit from this version</button></div></div>)}</div>}</aside></div>}
  </div>;
}
