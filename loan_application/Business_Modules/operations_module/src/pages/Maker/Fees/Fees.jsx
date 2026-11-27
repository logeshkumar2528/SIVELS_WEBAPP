import { ArrowLeft, ArrowRight, ChevronRight, FileText, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import backOfficeService from '../../../../../back_office/src/back-office/api/backOfficeService';
import { getFees } from '../../../../../../Master_Module/src/api/masters/feeMasterApi';
import { buildApplicationRoute, ROUTES } from '../../../config/routeConfig';
import { useOperationsApplication } from '../../../context/OperationsApplicationContext';
import OperationsLayout from '../../../layouts/OperationsLayout';
import operationsFeesService, { getFeesApiErrorMessage } from '../../../services/operationsFeesService';
import {
  createEmptyFeeRow,
  createFeeRowFromMaster,
  DERIVED_FIELDS,
  buildFeesPayload,
  getManualRowsSignature,
  GST_TREATMENTS,
  mapFeesResponse,
  mergeFeeMasterOptions,
  mergePreviewDerivedValues,
  normalizeFeeId,
  normalizeFeeMasterRecords,
  validateFeeRows,
  hasValidationErrors,
} from './feesPayload';
import './Fees.css';

const WORKFLOW_STEPS = [
  { id: 'loan-basic-details', label: 'Loan Basic Details', route: ROUTES.MAKER_LOAN_BASIC_DETAILS },
  { id: 'fees', label: 'Fees', active: true, route: ROUTES.MAKER_FEES },
  { id: 'repayment-schedule', label: 'Repayment Schedule', route: ROUTES.MAKER_REPAYMENT_SCHEDULE },
  { id: 'covenants', label: 'Covenants', route: ROUTES.MAKER_COVENANTS },
  { id: 'mandate-details', label: 'Mandate Details', route: ROUTES.MAKER_MANDATE_DETAILS },
  { id: 'cheque-details', label: 'Cheque Details', route: ROUTES.MAKER_CHEQUE_DETAILS },
];

const HEADER_TOTAL_FIELDS = Object.freeze([
  'totalCalculatedFee', 'totalNetFee', 'totalNetGst', 'totalTotNet', 'totalPaidAmount',
  'totalPaidGst', 'totalTotPaid', 'totalRemainingFee', 'totalRemainingGst', 'totalTotRemaining',
]);

const MANUAL_COLUMNS = [
  { key: 'gstPercent', label: 'GST %', className: 'operations-fees-col--percent', type: 'number' },
  { key: 'calculatedFee', label: 'Cal. Fee (₹)', className: 'operations-fees-col--financial', type: 'number' },
  { key: 'actualFee', label: 'Actual Fee (₹)', className: 'operations-fees-col--financial', type: 'number' },
  { key: 'feeWaiver', label: 'Fee Waiver (₹)', className: 'operations-fees-col--financial', type: 'number' },
  { key: 'paidAmount', label: 'Paid Amount (₹)', className: 'operations-fees-col--financial', type: 'number' },
  { key: 'paidGst', label: 'Paid GST (₹)', className: 'operations-fees-col--financial', type: 'number' },
];

const DERIVED_COLUMNS = [
  { key: 'netFee', label: 'Net Fee (₹)', className: 'operations-fees-col--financial' },
  { key: 'netGst', label: 'Net GST (₹)', className: 'operations-fees-col--financial' },
  { key: 'totalNet', label: 'Tot. Net (₹)', className: 'operations-fees-col--financial' },
  { key: 'totalPaid', label: 'Tot. Paid (₹)', className: 'operations-fees-col--financial' },
  { key: 'remainingFee', label: 'Remaining Fee (₹)', className: 'operations-fees-col--financial' },
  { key: 'remainingGst', label: 'Remaining GST (₹)', className: 'operations-fees-col--financial' },
  { key: 'totalRemaining', label: 'Tot. Remaining (₹)', className: 'operations-fees-col--financial' },
];

const TEXT_COLUMNS = [
  { key: 'feeScheduleMethod', label: 'Fee Schedule Method', className: 'operations-fees-col--text' },
  { key: 'bpType', label: 'BP Type', className: 'operations-fees-col--text' },
  { key: 'partnerCode', label: 'Partner Code', className: 'operations-fees-col--text' },
];

const EMPTY_HEADER = HEADER_TOTAL_FIELDS.reduce((values, field) => ({ ...values, [field]: null }), {});

function readValue(record, ...keys) {
  for (const key of keys) {
    if (record?.[key] !== undefined && record?.[key] !== null) return record[key];
  }
  return null;
}

function firstRecord(value) {
  if (Array.isArray(value)) return value[0] || null;
  return value && typeof value === 'object' ? value : null;
}

function validId(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function formatCurrency(value) {
  if (value === undefined || value === null || value === '' || !Number.isFinite(Number(value))) return '—';
  return `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getHeaderTotals(header) {
  return HEADER_TOTAL_FIELDS.reduce((values, field) => ({
    ...values,
    [field]: header?.[field] ?? header?.[field[0].toUpperCase() + field.slice(1)] ?? null,
  }), {});
}

function getDisbursementValues(response) {
  return {
    grossDisbursementAmount: response?.grossDisbursementAmount ?? response?.GrossDisbursementAmount ?? null,
    totalApplicableFeeDeduction: response?.totalApplicableFeeDeduction ?? response?.TotalApplicableFeeDeduction ?? null,
    finalNetDisbursementAmount: response?.finalNetDisbursementAmount ?? response?.FinalNetDisbursementAmount ?? null,
  };
}

function clearDerivedValues(row) {
  return DERIVED_FIELDS.reduce((next, field) => ({ ...next, [field]: '' }), { ...row });
}

function cloneFeeRows(rows) {
  return (rows || []).map((row) => ({ ...row }));
}

function errorSummary(errors) {
  return Object.values(errors || {})
    .flatMap((rowErrors) => Object.values(rowErrors || {}))
    .filter(Boolean)[0] || '';
}

function WorkflowSteps({ navigate, applicationId, onNavigate }) {
  return (
    <nav className="operations-fees-steps" aria-label="Application workflow steps">
      {WORKFLOW_STEPS.map((step, index) => (
        <button
          key={step.id}
          type="button"
          className={['operations-fees-step', step.active ? 'is-active' : ''].join(' ').trim()}
          aria-current={step.active ? 'step' : undefined}
          onClick={() => step.route && (onNavigate ? onNavigate(step.route) : navigate(buildApplicationRoute(step.route, applicationId)))}
        >
          <span className="operations-fees-step-number">{index + 1}</span>
          <span>{step.label}</span>
        </button>
      ))}
    </nav>
  );
}

function FeeRow({ row, index, feeOptions, selectedFeeIds, errors, onChange, onRemove, disabled }) {
  const rowErrors = errors?.[index] || {};
  const feeName = row.feeName || `Fee line ${index + 1}`;
  const currentFeeId = normalizeFeeId(row.feeId);
  const availableFeeOptions = feeOptions.filter((option) => {
    const optionFeeId = normalizeFeeId(option.feeId);
    return optionFeeId === currentFeeId || !selectedFeeIds.has(optionFeeId);
  });

  return (
    <tr>
      <td className="operations-fees-cell operations-fees-cell--serial">{index + 1}</td>
      <td className="operations-fees-cell operations-fees-cell--name">
        <select
          className={`operations-fees-select ${rowErrors.feeId ? 'is-invalid' : ''}`}
          aria-label={`Fee Name for line ${index + 1}`}
          value={row.feeId ?? ''}
          disabled={disabled}
          onChange={(event) => {
            const selected = feeOptions.find((option) => normalizeFeeId(option.feeId) === event.target.value);
            onChange(row.rowKey, 'feeId', selected?.feeId ?? '', selected?.feeName ?? '');
          }}
        >
          <option value="">Select Fee</option>
          {availableFeeOptions.map((option) => (
            <option key={option.feeId} value={option.feeId}>
              {option.feeName}{option.isActive ? '' : ' (inactive)'}
            </option>
          ))}
        </select>
      </td>
      <td className="operations-fees-cell operations-fees-cell--manual">
        <select
          className={`operations-fees-select ${rowErrors.gstTreatment ? 'is-invalid' : ''}`}
          aria-label={`GST Treatment for ${feeName}`}
          value={row.gstTreatment}
          disabled={disabled}
          onChange={(event) => onChange(row.rowKey, 'gstTreatment', event.target.value)}
        >
          {GST_TREATMENTS.map((treatment) => <option key={treatment} value={treatment}>{treatment}</option>)}
        </select>
      </td>
      {MANUAL_COLUMNS.map((column) => (
        <td className={['operations-fees-cell', column.className].join(' ').trim()} key={column.key}>
          <input
            className={`operations-fees-input ${rowErrors[column.key] ? 'is-invalid' : ''}`}
            type={column.type}
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="0.00"
            aria-label={`${column.label} for ${feeName}`}
            value={row[column.key] ?? ''}
            disabled={disabled}
            onChange={(event) => onChange(row.rowKey, column.key, event.target.value)}
          />
        </td>
      ))}
      {DERIVED_COLUMNS.map((column) => (
        <td className={['operations-fees-cell', column.className, 'operations-fees-cell--read-only'].join(' ').trim()} key={column.key}>
          <output aria-label={`${column.label} for ${feeName}`}>{formatCurrency(row[column.key])}</output>
        </td>
      ))}
      {TEXT_COLUMNS.map((column) => (
        <td className={['operations-fees-cell', column.className].join(' ').trim()} key={column.key}>
          <input
            className={`operations-fees-input operations-fees-input--text ${rowErrors[column.key] ? 'is-invalid' : ''}`}
            type="text"
            list={column.key === 'feeScheduleMethod' ? 'fee-schedule-method-suggestions' : undefined}
            aria-label={`${column.label} for ${feeName}`}
            value={row[column.key] ?? ''}
            disabled={disabled}
            onChange={(event) => onChange(row.rowKey, column.key, event.target.value)}
          />
        </td>
      ))}
      <td className="operations-fees-cell operations-fees-cell--action">
        <button
          type="button"
          className="operations-fees-remove-button"
          aria-label={`Remove fee line ${index + 1}`}
          title={`Remove fee line ${index + 1}`}
          onClick={() => onRemove(row.rowKey)}
          disabled={disabled}
        >
          <Trash2 size={15} aria-hidden="true" />
        </button>
      </td>
    </tr>
  );
}

export default function Fees() {
  const navigate = useNavigate();
  const location = useLocation();
  const { applicationId, application, profile, profileLoading, profileError } = useOperationsApplication();
  const requestIdRef = useRef(0);
  const previewRequestIdRef = useRef(0);
  const previewTimerRef = useRef(null);
  const suppressPreviewRef = useRef(false);
  const latestPreviewKeyRef = useRef('');
  const savedStateRef = useRef({ manualRowsKey: '', notes: '' });
  const savedSnapshotRef = useRef(null);
  const [masterOptions, setMasterOptions] = useState([]);
  const [rows, setRows] = useState([]);
  const [header, setHeader] = useState(EMPTY_HEADER);
  const [disbursement, setDisbursement] = useState({ grossDisbursementAmount: null, totalApplicableFeeDeduction: null, finalNetDisbursementAmount: null });
  const [operationsFeeHeaderId, setOperationsFeeHeaderId] = useState(null);
  const [resolvedApplicationProductDetailsId, setResolvedApplicationProductDetailsId] = useState(null);
  const [notes, setNotes] = useState('');
  const [loadState, setLoadState] = useState({ status: 'idle', error: '' });
  const [previewState, setPreviewState] = useState({ status: 'idle', error: '', errors: {} });
  const [saveState, setSaveState] = useState({ saving: false, error: '' });
  const [recordMode, setRecordMode] = useState('new');
  const [reloadKey, setReloadKey] = useState(0);
  const [previewRetryKey, setPreviewRetryKey] = useState(0);

  const agentCustomerId = validId(application?.agentCustomerId);
  const directApplicationProductDetailsId = validId(application?.applicationProductDetailsId);
  const operationsUserId = validId(profile?.operationsUserId);
  const contextSignature = [applicationId, agentCustomerId || '', directApplicationProductDetailsId || '', operationsUserId || ''].join(':');
  const manualRowsKey = useMemo(() => getManualRowsSignature(rows), [rows]);
  const validationErrors = useMemo(() => validateFeeRows(rows), [rows]);
  const saveValidationErrors = useMemo(() => validateFeeRows(rows, { validateAgainstPreview: true }), [rows]);
  const previewReadyForCurrentState = previewState.status === 'ready' && latestPreviewKeyRef.current === manualRowsKey;
  const selectedFeeIds = useMemo(() => new Set(rows.map((row) => normalizeFeeId(row.feeId)).filter(Boolean)), [rows]);
  const activeFeeOptions = useMemo(() => masterOptions.filter((option) => option.isActive), [masterOptions]);
  const unusedActiveFeeOptions = useMemo(
    () => activeFeeOptions.filter((option) => !selectedFeeIds.has(normalizeFeeId(option.feeId))),
    [activeFeeOptions, selectedFeeIds],
  );
  const hasIncompleteFeeRow = rows.some((row) => !normalizeFeeId(row.feeId) || !String(row.feeName || '').trim());
  const addFeeLineDisabled = loadState.status !== 'ready' || saveState.saving || recordMode === 'view' || hasIncompleteFeeRow || unusedActiveFeeOptions.length === 0;
  const hasUnsavedChanges = savedStateRef.current.manualRowsKey !== manualRowsKey || savedStateRef.current.notes !== notes;

  const buildContextRoute = (route) => (location.search ? `${route}${location.search}` : buildApplicationRoute(route, applicationId));
  const confirmNavigation = () => (
    !hasUnsavedChanges
    || typeof window === 'undefined'
    || typeof window.confirm !== 'function'
    || window.confirm('You have unsaved fee changes. Leave this page?')
  );

  const controlsDisabled = loadState.status !== 'ready' || saveState.saving || recordMode === 'view';

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    previewRequestIdRef.current += 1;
    latestPreviewKeyRef.current = '';
    suppressPreviewRef.current = true;
    setRows([]);
    setMasterOptions([]);
    setHeader(EMPTY_HEADER);
    setDisbursement({ grossDisbursementAmount: null, totalApplicableFeeDeduction: null, finalNetDisbursementAmount: null });
    setOperationsFeeHeaderId(null);
    setResolvedApplicationProductDetailsId(null);
    setNotes('');
    savedStateRef.current = { manualRowsKey: '', notes: '' };
    savedSnapshotRef.current = null;
    setRecordMode('new');
    setPreviewState({ status: 'idle', error: '', errors: {} });
    setSaveState({ saving: false, error: '' });

    if (profileLoading) {
      setLoadState({ status: 'loading', error: '' });
      return undefined;
    }
    if (profileError || !operationsUserId) {
      setLoadState({ status: 'error', error: 'Authenticated Operations Staff details are unavailable.' });
      return undefined;
    }
    if (!agentCustomerId) {
      setLoadState({ status: 'error', error: 'A valid agent customer is required before loading Fees.' });
      return undefined;
    }

    let isMounted = true;
    setLoadState({ status: 'loading', error: '' });

    const loadFees = async () => {
      try {
        let applicationProductDetailsId = directApplicationProductDetailsId;
        if (!applicationProductDetailsId) {
          const productDetails = firstRecord(await backOfficeService.getApplicationProductDetailsByCustomer(agentCustomerId));
          const returnedCustomerId = validId(readValue(productDetails, 'agentCustomerId', 'AgentCustomerId'));
          if (returnedCustomerId && returnedCustomerId !== agentCustomerId) {
            throw new Error('Application Product Details do not match the selected customer.');
          }
          applicationProductDetailsId = validId(readValue(productDetails, 'applicationProductDetailsId', 'ApplicationProductDetailsId'));
        }
        if (!applicationProductDetailsId) throw new Error('Application Product Details are unavailable for the selected application.');
        setResolvedApplicationProductDetailsId(applicationProductDetailsId);

        const [masterResult, savedResult] = await Promise.allSettled([
          getFees(),
          operationsFeesService.getByCustomer(agentCustomerId, applicationProductDetailsId),
        ]);
        if (!isMounted || requestId !== requestIdRef.current) return;
        if (masterResult.status === 'rejected') throw masterResult.reason;
        if (savedResult.status === 'rejected') throw savedResult.reason;

        const activeMasters = normalizeFeeMasterRecords(masterResult.value);
        const normalizedSaved = savedResult.value ? mapFeesResponse(savedResult.value) : null;
        const savedHeaderId = validId(normalizedSaved?.header?.operationsFeeHeaderId ?? normalizedSaved?.header?.OperationsFeeHeaderId);
        if (savedResult.value && !savedHeaderId) {
          throw new Error('Saved Fees response does not contain a valid fee header ID.');
        }
        const restoredRows = normalizedSaved ? normalizedSaved.lines : activeMasters.map((record) => createFeeRowFromMaster(record));
        const restoredNotes = normalizedSaved?.header?.notes ?? normalizedSaved?.header?.Notes ?? '';
        const restoredHeader = normalizedSaved ? getHeaderTotals(normalizedSaved.header) : EMPTY_HEADER;
        const restoredDisbursement = normalizedSaved
          ? getDisbursementValues(normalizedSaved)
          : { grossDisbursementAmount: null, totalApplicableFeeDeduction: null, finalNetDisbursementAmount: null };
        const restoredManualRowsKey = getManualRowsSignature(restoredRows);

        setMasterOptions(mergeFeeMasterOptions(activeMasters, restoredRows));
        setRows(restoredRows);
        setHeader(restoredHeader);
        setDisbursement(restoredDisbursement);
        setOperationsFeeHeaderId(savedHeaderId);
        setNotes(restoredNotes);
        latestPreviewKeyRef.current = savedHeaderId ? restoredManualRowsKey : '';
        savedStateRef.current = {
          manualRowsKey: restoredManualRowsKey,
          notes: restoredNotes,
        };
        savedSnapshotRef.current = {
          rows: cloneFeeRows(restoredRows),
          header: { ...restoredHeader },
          disbursement: { ...restoredDisbursement },
          notes: restoredNotes,
          headerId: savedHeaderId,
          manualRowsKey: restoredManualRowsKey,
          previewState: { status: savedHeaderId && restoredRows.length ? 'ready' : 'idle', error: '', errors: {} },
        };
        setRecordMode(savedHeaderId ? 'view' : 'new');
        setPreviewState({ status: savedHeaderId && restoredRows.length ? 'ready' : 'idle', error: '', errors: {} });
        setLoadState({ status: 'ready', error: '' });
      } catch (error) {
        if (!isMounted || requestId !== requestIdRef.current) return;
        const message = getFeesApiErrorMessage(error, 'Unable to load Fees data.');
        setLoadState({ status: 'error', error: message });
        toast.error(message);
      }
    };

    loadFees();
    return () => {
      isMounted = false;
      previewRequestIdRef.current += 1;
    };
  }, [agentCustomerId, applicationId, contextSignature, directApplicationProductDetailsId, operationsUserId, profileError, profileLoading, reloadKey]);

  useEffect(() => () => {
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
  }, []);

  useEffect(() => {
    if (loadState.status !== 'ready') return undefined;
    if (suppressPreviewRef.current) {
      suppressPreviewRef.current = false;
      return undefined;
    }

    const errors = validateFeeRows(rows);
    if (hasValidationErrors(errors)) {
      latestPreviewKeyRef.current = '';
      setPreviewState({ status: 'invalid', error: errorSummary(errors), errors });
      return undefined;
    }

    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    const requestId = ++previewRequestIdRef.current;
    setPreviewState({ status: 'pending', error: '', errors: {} });
    previewTimerRef.current = setTimeout(async () => {
      try {
        const payload = buildFeesPayload({
          agentCustomerId,
          applicationProductDetailsId: resolvedApplicationProductDetailsId,
          createdBy: operationsUserId,
          notes,
          rows,
        });
        const response = await operationsFeesService.preview(payload);
        if (requestId !== previewRequestIdRef.current) return;
        const normalized = mapFeesResponse(response);
        setRows((currentRows) => mergePreviewDerivedValues(currentRows, normalized.lines));
        setHeader(getHeaderTotals(normalized.header));
        setDisbursement(getDisbursementValues(normalized));
        if (normalized.header?.operationsFeeHeaderId ?? normalized.header?.OperationsFeeHeaderId) {
          setOperationsFeeHeaderId(normalized.header.operationsFeeHeaderId ?? normalized.header.OperationsFeeHeaderId);
        }
        latestPreviewKeyRef.current = manualRowsKey;
        setPreviewState({ status: 'ready', error: '', errors: {} });
      } catch (error) {
        if (requestId !== previewRequestIdRef.current) return;
        latestPreviewKeyRef.current = '';
        const message = getFeesApiErrorMessage(error, 'Fee preview failed.');
        setPreviewState({ status: 'error', error: message, errors: {} });
        toast.error(message);
      }
    }, 400);

    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, [agentCustomerId, loadState.status, manualRowsKey, notes, operationsUserId, previewRetryKey, resolvedApplicationProductDetailsId]);

  const updateRow = (rowKey, field, value, relatedFeeName) => {
    setRows((currentRows) => currentRows.map((row) => (
      row.rowKey === rowKey
        ? clearDerivedValues({ ...row, [field]: value, ...(field === 'feeId' ? { feeName: relatedFeeName || '' } : {}) })
        : row
    )));
  };

  const addFeeRow = () => {
    if (addFeeLineDisabled) return;
    previewRequestIdRef.current += 1;
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    setRows((currentRows) => [...currentRows.map(clearDerivedValues), createEmptyFeeRow()]);
    latestPreviewKeyRef.current = '';
    setHeader(EMPTY_HEADER);
    setDisbursement({ grossDisbursementAmount: null, totalApplicableFeeDeduction: null, finalNetDisbursementAmount: null });
  };

  const removeFeeRow = (rowKey) => {
    previewRequestIdRef.current += 1;
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    latestPreviewKeyRef.current = '';
    setRows((currentRows) => currentRows.filter((row) => row.rowKey !== rowKey).map(clearDerivedValues));
    setHeader(EMPTY_HEADER);
    setDisbursement({ grossDisbursementAmount: null, totalApplicableFeeDeduction: null, finalNetDisbursementAmount: null });
    setPreviewState({ status: 'idle', error: '', errors: {} });
  };

  const handleEdit = () => {
    if (loadState.status === 'ready') setRecordMode('edit');
  };

  const handleCancel = () => {
    const snapshot = savedSnapshotRef.current;
    if (!snapshot) return;
    previewRequestIdRef.current += 1;
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    setRows(cloneFeeRows(snapshot.rows));
    setHeader({ ...snapshot.header });
    setDisbursement({ ...snapshot.disbursement });
    setNotes(snapshot.notes);
    setOperationsFeeHeaderId(snapshot.headerId);
    latestPreviewKeyRef.current = snapshot.headerId ? snapshot.manualRowsKey : '';
    savedStateRef.current = { manualRowsKey: snapshot.manualRowsKey, notes: snapshot.notes };
    setPreviewState({ ...snapshot.previewState });
    setSaveState({ saving: false, error: '' });
    setRecordMode(snapshot.headerId ? 'view' : 'new');
  };

  const handleContinue = () => {
    navigate(buildContextRoute(ROUTES.MAKER_REPAYMENT_SCHEDULE));
  };

  const handleSave = async () => {
    if (recordMode === 'view' || (recordMode === 'edit' && !hasUnsavedChanges)) return;
    const currentErrors = validateFeeRows(rows, { validateAgainstPreview: true });
    if (hasValidationErrors(currentErrors)) {
      setPreviewState((current) => ({ ...current, status: 'invalid', error: errorSummary(currentErrors), errors: currentErrors }));
      toast.error(errorSummary(currentErrors) || 'Please correct the highlighted Fees fields.');
      return;
    }
    if (previewState.status === 'pending' || !previewReadyForCurrentState) {
      toast.error('Wait for the latest fee preview to complete before saving.');
      return;
    }
    if (saveState.saving) return;

    setSaveState({ saving: true, error: '' });
    try {
      const response = await operationsFeesService.save(buildFeesPayload({
        agentCustomerId,
        applicationProductDetailsId: resolvedApplicationProductDetailsId,
        createdBy: operationsUserId,
        notes,
        rows,
      }));
      const persistedResponse = await operationsFeesService.getByCustomer(agentCustomerId, resolvedApplicationProductDetailsId);
      if (!persistedResponse) throw new Error('Fees were saved, but persistence verification returned no saved record.');
      const normalized = mapFeesResponse(persistedResponse || response);
      setRows(normalized.lines);
      setHeader(getHeaderTotals(normalized.header));
      setDisbursement(getDisbursementValues(normalized));
      setOperationsFeeHeaderId(normalized.header?.operationsFeeHeaderId ?? normalized.header?.OperationsFeeHeaderId ?? null);
      setNotes(normalized.header?.notes ?? normalized.header?.Notes ?? notes);
      latestPreviewKeyRef.current = getManualRowsSignature(normalized.lines);
      const savedNotes = normalized.header?.notes ?? normalized.header?.Notes ?? notes;
      const savedHeaderId = validId(normalized.header?.operationsFeeHeaderId ?? normalized.header?.OperationsFeeHeaderId);
      if (!savedHeaderId) throw new Error('Fees were saved, but the persistence response did not contain a valid fee header ID.');
      savedSnapshotRef.current = {
        rows: cloneFeeRows(normalized.lines),
        header: { ...getHeaderTotals(normalized.header) },
        disbursement: { ...getDisbursementValues(normalized) },
        notes: savedNotes,
        headerId: savedHeaderId,
        manualRowsKey: getManualRowsSignature(normalized.lines),
        previewState: { status: normalized.lines.length ? 'ready' : 'idle', error: '', errors: {} },
      };
      savedStateRef.current = {
        manualRowsKey: getManualRowsSignature(normalized.lines),
        notes: savedNotes,
      };
      setPreviewState({ status: normalized.lines.length ? 'ready' : 'idle', error: '', errors: {} });
      setSaveState({ saving: false, error: '' });
      setRecordMode('view');
      toast.success('Fees saved successfully.');
      navigate(buildContextRoute(ROUTES.MAKER_REPAYMENT_SCHEDULE));
    } catch (error) {
      const message = getFeesApiErrorMessage(error, 'Unable to save Fees.');
      setSaveState({ saving: false, error: message });
      toast.error(message);
    }
  };

  const loanInformation = [
    ['Loan Type', application?.loanProductName || application?.LoanProductName || '—'],
    ['Loan Reference No.', application?.loanAccountNumber || application?.LoanAccountNumber || '—'],
    ['Customer Name', application?.fullName || '—'],
    ['Agent Customer ID', application?.agentCustomerId || '—'],
    ['Application Product ID', resolvedApplicationProductDetailsId || '—'],
    ['Operations Staff ID', operationsUserId || '—'],
  ];
  const summaryCards = [
    ['Total Calculated Fee', header.totalCalculatedFee],
    ['Total Paid', header.totalTotPaid],
    ['Total Remaining', header.totalTotRemaining],
    ['GST Amount', header.totalNetGst],
  ];
  const isSaveDisabled = loadState.status !== 'ready'
    || saveState.saving
    || recordMode === 'view'
    || (recordMode === 'edit' && !hasUnsavedChanges)
    || previewState.status === 'pending'
    || previewState.status === 'error'
    || hasValidationErrors(saveValidationErrors)
    || !previewReadyForCurrentState;

  return (
    <OperationsLayout title="Fees" subtitle="Operations Maker workflow">
      <div className="operations-fees-page">
        <nav className="operations-fees-breadcrumb" aria-label="Breadcrumb">
          <button type="button" onClick={() => confirmNavigation() && navigate(buildContextRoute(ROUTES.MAKER_DASHBOARD))}>Operations Maker</button>
          <ChevronRight size={15} aria-hidden="true" />
          <span>Fees</span>
        </nav>
        <WorkflowSteps navigate={navigate} applicationId={applicationId} onNavigate={(route) => confirmNavigation() && navigate(buildContextRoute(route))} />

        <section className="operations-fees-section" aria-labelledby="operations-fees-loan-information">
          <div className="operations-fees-section-heading"><div><h2 id="operations-fees-loan-information">Loan Information</h2></div></div>
          <dl className="operations-fees-information-grid">
            {loanInformation.slice(0, 3).map(([label, value]) => <div className="operations-fees-information-item" key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          </dl>
        </section>

        {loadState.status === 'loading' && <div className="operations-fees-state" role="status">Loading Fee Master and saved Fees...</div>}
        {loadState.status === 'error' && <div className="operations-fees-state operations-fees-state--error" role="alert"><span>{loadState.error}</span><button type="button" className="operations-fees-button operations-fees-button--secondary" onClick={() => setReloadKey((value) => value + 1)}><RefreshCw size={15} aria-hidden="true" /> Retry</button></div>}

        <section className="operations-fees-section" aria-labelledby="operations-fees-details">
          <div className="operations-fees-section-heading operations-fees-section-heading--actions">
            <div><h2 id="operations-fees-details">Fee Details</h2><p>Fee Name is selected from Fee Master. Financial results are calculated by the backend preview API.</p></div>
             <div className="operations-fees-section-actions">
               <button type="button" className="operations-fees-button operations-fees-button--secondary" onClick={addFeeRow} disabled={addFeeLineDisabled}><Plus size={15} aria-hidden="true" /> Add Fee Line</button>
               {loadState.status === 'ready' && unusedActiveFeeOptions.length === 0 && <span className="operations-fees-helper">All available fee types have been added.</span>}
             </div>
          </div>
          <div className="operations-fees-table-wrap">
            <table className="operations-fees-table">
              <colgroup>
                <col className="operations-fees-col operations-fees-col--serial" /><col className="operations-fees-col operations-fees-col--name" /><col className="operations-fees-col operations-fees-col--gst-treatment" />
                {MANUAL_COLUMNS.map((column) => <col className={`operations-fees-col ${column.className}`} key={column.key} />)}
                {DERIVED_COLUMNS.map((column) => <col className={`operations-fees-col ${column.className}`} key={column.key} />)}
                {TEXT_COLUMNS.map((column) => <col className={`operations-fees-col ${column.className}`} key={column.key} />)}
                 <col className="operations-fees-col operations-fees-col--action" />
              </colgroup>
              <thead><tr>
                <th scope="col">#</th><th scope="col">Fee Name / ID</th><th scope="col">GST Treatment</th>
                {MANUAL_COLUMNS.map((column) => <th scope="col" className={column.className} key={column.key}>{column.label}</th>)}
                {DERIVED_COLUMNS.map((column) => <th scope="col" className={column.className} key={column.key}>{column.label}</th>)}
                {TEXT_COLUMNS.map((column) => <th scope="col" className={column.className} key={column.key}>{column.label}</th>)}
                 <th scope="col" className="operations-fees-col--action">Action</th>
              </tr></thead>
              <tbody>
                {rows.length === 0 && loadState.status === 'ready' ? <tr><td className="operations-fees-empty-state" colSpan={20}>No saved fee lines. Use Add Fee Line to begin.</td></tr> : rows.map((row, index) => <FeeRow key={row.rowKey} row={row} index={index} feeOptions={masterOptions} selectedFeeIds={selectedFeeIds} errors={validationErrors} onChange={updateRow} onRemove={removeFeeRow} disabled={controlsDisabled} />)}
              </tbody>
            </table>
          </div>
          <datalist id="fee-schedule-method-suggestions"><option value="Deduct from Disbursement" /></datalist>
        </section>

        <div className="operations-fees-preview-status" role={previewState.status === 'error' ? 'alert' : 'status'}>
          {previewState.status === 'pending' && <span>Calculating latest Fees...</span>}
          {previewState.status === 'invalid' && <span>{previewState.error || 'Correct the highlighted fields before preview.'}</span>}
          {previewState.status === 'error' && <><span>{previewState.error || 'The latest fee preview is not current.'}</span><button type="button" className="operations-fees-button operations-fees-button--secondary" onClick={() => setPreviewRetryKey((value) => value + 1)}>Retry Preview</button></>}
          {previewState.status === 'ready' && <span>Calculated values are current.</span>}
        </div>

        <div className="operations-fees-receipt-row"><button type="button" className="operations-fees-button operations-fees-button--secondary" disabled title="Receipt integration is outside the Fees API."><FileText size={16} aria-hidden="true" /> View Receipt(s)</button></div>

        <section className="operations-fees-disbursement-summary" aria-label="Disbursement Summary">
          <article className="operations-fees-summary-card"><span>Gross Disbursement Amount</span><strong>{formatCurrency(disbursement.grossDisbursementAmount)}</strong></article>
          <article className="operations-fees-summary-card"><span>Applicable Fee Deduction</span><strong>{formatCurrency(disbursement.totalApplicableFeeDeduction)}</strong></article>
          <article className="operations-fees-summary-card operations-fees-summary-card--highlight"><span>Final Net Disbursement Amount</span><strong>{formatCurrency(disbursement.finalNetDisbursementAmount)}</strong></article>
        </section>

        <section className="operations-fees-summary" aria-label="Financial summary">
          {summaryCards.map(([label, value]) => <article className="operations-fees-summary-card" key={label}><span>{label}</span><strong>{formatCurrency(value)}</strong></article>)}
        </section>

        <footer className="operations-fees-footer">
           <div className="operations-fees-footer-meta">
             <div className="operations-fees-footer-status"><span className="operations-fees-status-dot" /><span>{hasUnsavedChanges || !operationsFeeHeaderId ? 'Unsaved Fee changes' : `Saved Fee Header: ${operationsFeeHeaderId}`}</span></div>
           </div>
          {saveState.error && <div className="operations-fees-save-error" role="alert">{saveState.error}</div>}
           <div className="operations-fees-actions operations-fees-actions--navigation">
             <button type="button" className="operations-fees-button operations-fees-button--secondary" onClick={() => confirmNavigation() && navigate(buildContextRoute(ROUTES.MAKER_LOAN_BASIC_DETAILS))}>
               <ArrowLeft size={16} aria-hidden="true" /> Back
             </button>
             {recordMode === 'view' && <button type="button" className="operations-fees-button operations-fees-button--secondary" onClick={handleEdit}>Edit</button>}
             {recordMode === 'edit' && <button type="button" className="operations-fees-button operations-fees-button--secondary" onClick={handleCancel} disabled={saveState.saving}>Cancel</button>}
             <button type="button" className="operations-fees-button operations-fees-button--primary" onClick={handleSave} disabled={isSaveDisabled}>
               {saveState.saving ? 'Saving…' : 'Save & Continue'} <ArrowRight size={16} aria-hidden="true" />
             </button>
             {recordMode === 'view' && <button type="button" className="operations-fees-button operations-fees-button--primary" onClick={handleContinue}>Continue <ArrowRight size={16} aria-hidden="true" /></button>}
          </div>
        </footer>
      </div>
    </OperationsLayout>
  );
}
