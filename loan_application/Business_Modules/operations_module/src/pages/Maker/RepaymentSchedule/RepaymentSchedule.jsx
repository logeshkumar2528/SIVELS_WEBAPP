import { ArrowLeft, ArrowRight, CheckCircle2, RefreshCw, TriangleAlert } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import backOfficeService from '../../../../../back_office/src/back-office/api/backOfficeService';
import { getStoredUser } from '../../../../../../Core/src/auth/session';
import { formatIndianAmount } from '../../../../../../Core/src/utils/amountHelper';
import { buildApplicationRoute, ROUTES } from '../../../config/routeConfig';
import { useOperationsApplication } from '../../../context/OperationsApplicationContext';
import OperationsLayout from '../../../layouts/OperationsLayout';
import operationsRepaymentScheduleService, {
  getRepaymentScheduleApiErrorMessage,
} from '../../../services/operationsRepaymentScheduleService';
import './RepaymentSchedule.css';

const WORKFLOW_STEPS = [
  { id: 'loan-basic-details', label: 'Loan Basic Details', route: ROUTES.MAKER_LOAN_BASIC_DETAILS },
  { id: 'fees', label: 'Fees', route: ROUTES.MAKER_FEES },
  { id: 'repayment-schedule', label: 'Repayment Schedule', active: true, route: ROUTES.MAKER_REPAYMENT_SCHEDULE },
  { id: 'covenants', label: 'Covenants', route: ROUTES.MAKER_COVENANTS },
  { id: 'mandate-details', label: 'Mandate Details', route: ROUTES.MAKER_MANDATE_DETAILS },
  { id: 'cheque-details', label: 'Cheque Details', route: ROUTES.MAKER_CHEQUE_DETAILS },
];

const SUMMARY_FIELDS = [
  ['Schedule Principal', 'loanAmount', 'amount'],
  ['Interest Rate', 'interestRatePa', 'rate'],
  ['Tenure', 'tenureMonths', 'months'],
  ['Disbursement Date', 'disbursementDate', 'date'],
  ['EMI Due Day', 'emiDayOfMonth', 'number'],
  ['Day Count Basis', 'dayCountBasis', 'number'],
  ['Monthly EMI', 'monthlyEmi', 'amount'],
  ['First EMI Date', 'firstEmiDate', 'date'],
  ['Maturity Date', 'maturityDate', 'date'],
  ['Schedule Version', 'scheduleVersion', 'number'],
];

const BPI_FIELDS = [
  ['Allow BPI', 'allowBPI', 'boolean'],
  ['BPI Period End Date', 'bpiPeriodEndDate', 'date'],
  ['BPI Days', 'bpiDays', 'number'],
  ['Broken Period Interest', 'brokenPeriodInterest', 'amount'],
  ['Total Interest Including BPI', 'totalInterestInclBpi', 'amount'],
];

const COMPARISON_SCHEDULE_FIELDS = [
  ['loanAmount', 'amount'],
  ['interestRatePa', 'amount'],
  ['tenureMonths', 'amount'],
  ['disbursementDate', 'date'],
  ['emiDayOfMonth', 'amount'],
  ['dayCountBasis', 'amount'],
  ['allowBPI', 'boolean'],
  ['bpiPeriodEndDate', 'date'],
  ['bpiDays', 'amount'],
  ['brokenPeriodInterest', 'amount'],
  ['firstEmiDate', 'date'],
  ['monthlyEmi', 'amount'],
  ['maturityDate', 'date'],
  ['totalInterestOverTenure', 'amount'],
  ['totalInterestInclBpi', 'amount'],
];

const COMPARISON_DETAIL_FIELDS = [
  ['emiNo', 'amount'],
  ['emiDate', 'date'],
  ['daysInPeriod', 'amount'],
  ['openingBalance', 'amount'],
  ['emiAmount', 'amount'],
  ['interestAmount', 'amount'],
  ['principalAmount', 'amount'],
  ['closingBalance', 'amount'],
  ['isLastEmi', 'boolean'],
];

function readValue(record, ...keys) {
  if (!record || typeof record !== 'object') return null;
  for (const key of keys) {
    if (record[key] !== undefined) return record[key];
  }
  return null;
}

function firstRecord(value) {
  if (Array.isArray(value)) return value[0] || null;
  return value && typeof value === 'object' ? value : null;
}

function sameIdentifier(left, right) {
  if (left === undefined || left === null || right === undefined || right === null) return false;
  return String(left).trim() === String(right).trim();
}

function resolveOperationsUserId(profile) {
  const storedUser = getStoredUser(['MAKER', 'CHECKER']) || getStoredUser() || {};
  const value =
    profile?.operationsUserId
    || profile?.OperationsUserId
    || profile?.id
    || profile?.Id
    || storedUser.operationsUserId
    || storedUser.OperationsUserId
    || storedUser.legacyId
    || storedUser.LegacyId
    || storedUser.userId
    || storedUser.staffId;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function unwrapScheduleResponse(response) {
  const payload = response?.value ?? response?.data ?? response?.result ?? response;
  const schedule = payload?.schedule ?? payload?.Schedule ?? null;
  const details = payload?.details ?? payload?.Details ?? [];
  return {
    schedule: schedule && typeof schedule === 'object' ? schedule : null,
    details: Array.isArray(details) ? details : null,
  };
}

function validateScheduleResponse(response, agentCustomerId, applicationProductDetailsId) {
  const normalized = unwrapScheduleResponse(response);
  if (!normalized.schedule || !Array.isArray(normalized.details)) {
    return { valid: false, error: 'The repayment schedule response is incomplete.' };
  }

  const returnedCustomerId = readValue(normalized.schedule, 'agentCustomerId', 'AgentCustomerId');
  const returnedProductId = readValue(
    normalized.schedule,
    'applicationProductDetailsId',
    'ApplicationProductDetailsId'
  );
  if (!sameIdentifier(returnedCustomerId, agentCustomerId) || !sameIdentifier(returnedProductId, applicationProductDetailsId)) {
    return { valid: false, error: 'The repayment schedule does not match the selected application product.' };
  }

  const requiredDetailFields = [
    ['emiNo', 'EmiNo'],
    ['emiDate', 'EmiDate'],
    ['interestAmount', 'InterestAmount'],
    ['principalAmount', 'PrincipalAmount'],
    ['emiAmount', 'EmiAmount'],
    ['closingBalance', 'ClosingBalance'],
  ];
  if (normalized.details.some((detail) => (
    !detail
    || typeof detail !== 'object'
    || requiredDetailFields.some(([key, alternateKey]) => readValue(detail, key, alternateKey) === null)
  ))) {
    return { valid: false, error: 'The repayment schedule contains invalid installment details.' };
  }

  return { valid: true, value: normalized };
}

function formatAmount(value) {
  if (value === null || value === undefined || String(value).trim() === '') return '—';
  const formatted = formatIndianAmount(value, true, 6);
  return formatted ? `₹${formatted}` : '—';
}

function formatNumber(value) {
  if (value === null || value === undefined || String(value).trim() === '') return '—';
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString('en-IN', { maximumFractionDigits: 6 }) : String(value);
}

function formatRate(value) {
  if (value === null || value === undefined || String(value).trim() === '') return '—';
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  const percentage = number * 100;
  return `${Number(percentage.toFixed(6))}%`;
}

function formatBoolean(value) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return ['true', '1', 'yes'].includes(value.trim().toLowerCase()) ? 'Yes' : 'No';
  return value ? 'Yes' : 'No';
}

function formatScheduleDate(value) {
  if (value === null || value === undefined || String(value).trim() === '') return '—';
  const text = String(value).trim();
  const datePart = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const date = datePart
    ? new Date(Number(datePart[1]), Number(datePart[2]) - 1, Number(datePart[3]))
    : new Date(text);
  if (Number.isNaN(date.getTime())) return '—';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(date.getDate()).padStart(2, '0')}-${months[date.getMonth()]}-${String(date.getFullYear()).slice(-2)}`;
}

function decimalToScaled(value, scale = 6) {
  if (value === null || value === undefined || String(value).trim() === '') return 0n;
  const text = String(value).trim();
  const negative = text.startsWith('-');
  const unsigned = negative ? text.slice(1) : text;
  const [whole = '0', fraction = ''] = unsigned.split('.');
  const fractionText = fraction.replace(/\D/g, '').slice(0, scale).padEnd(scale, '0');
  const scaled = (BigInt(whole.replace(/\D/g, '') || '0') * (10n ** BigInt(scale))) + BigInt(fractionText || '0');
  return negative ? -scaled : scaled;
}

function sumBackendAmounts(rows, field) {
  const scale = 6;
  const total = rows.reduce((sum, row) => sum + decimalToScaled(readValue(row, field, field[0].toUpperCase() + field.slice(1)), scale), 0n);
  const negative = total < 0n;
  const absolute = negative ? -total : total;
  const factor = 10n ** BigInt(scale);
  const whole = absolute / factor;
  const fraction = String(absolute % factor).padStart(scale, '0').replace(/0+$/, '');
  return `${negative ? '-' : ''}${whole.toString()}${fraction ? `.${fraction}` : ''}`;
}

function normalizeComparableValue(value, type) {
  if (type === 'date') {
    if (value === null || value === undefined || String(value).trim() === '') return null;
    const match = String(value).trim().match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : String(value).trim();
  }
  if (type === 'boolean') {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') return ['true', '1', 'yes'].includes(value.trim().toLowerCase());
    return Boolean(value);
  }
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : String(value).trim();
}

function comparableSchedule(value) {
  const schedule = value?.schedule || {};
  const details = value?.details || [];
  const normalizedSchedule = {};
  COMPARISON_SCHEDULE_FIELDS.forEach(([field, type]) => {
    normalizedSchedule[field] = normalizeComparableValue(readValue(schedule, field, field[0].toUpperCase() + field.slice(1)), type);
  });
  return {
    schedule: normalizedSchedule,
    details: details.map((detail) => {
      const normalizedDetail = {};
      COMPARISON_DETAIL_FIELDS.forEach(([field, type]) => {
        normalizedDetail[field] = normalizeComparableValue(readValue(detail, field, field[0].toUpperCase() + field.slice(1)), type);
      });
      return normalizedDetail;
    }),
  };
}

function SummaryField({ label, value, type }) {
  const display = type === 'amount'
    ? formatAmount(value)
    : type === 'rate'
      ? formatRate(value)
      : type === 'date'
        ? formatScheduleDate(value)
        : type === 'boolean'
          ? formatBoolean(value)
          : formatNumber(value);
  return (
    <div className="operations-repayment-summary-field">
      <span>{label}</span>
      <strong>{display}</strong>
    </div>
  );
}

function WorkflowSteps({ navigate, applicationId }) {
  return (
    <nav className="operations-repayment-steps" aria-label="Application workflow steps">
      {WORKFLOW_STEPS.map((step, index) => (
        <button
          key={step.id}
          type="button"
          className={['operations-repayment-step', step.active ? 'is-active' : ''].join(' ').trim()}
          aria-current={step.active ? 'step' : undefined}
          onClick={() => navigate(buildApplicationRoute(step.route, applicationId))}
        >
          <span className="operations-repayment-step-number">{index + 1}</span>
          <span>{step.label}</span>
        </button>
      ))}
    </nav>
  );
}

export default function RepaymentSchedule() {
  const navigate = useNavigate();
  const { applicationId, application, profile, profileLoading, profileError } = useOperationsApplication();
  const [ids, setIds] = useState({ agentCustomerId: null, applicationProductDetailsId: null, operationsUserId: null });
  const [savedState, setSavedState] = useState({ status: 'idle', schedule: null, details: [], error: '' });
  const [verifyState, setVerifyState] = useState({ status: 'idle', message: '' });
  const [buildState, setBuildState] = useState({ status: 'idle', message: '' });
  const [reloadKey, setReloadKey] = useState(0);
  const requestSequenceRef = useRef(0);

  const agentCustomerId = application?.agentCustomerId || applicationId;
  const contextProductId = application?.applicationProductDetailsId || application?.ApplicationProductDetailsId || null;
  const operationsUserId = resolveOperationsUserId(profile);

  useEffect(() => {
    const requestId = ++requestSequenceRef.current;
    let active = true;

    if (profileLoading) {
      setSavedState((current) => ({ ...current, status: 'loading', error: '' }));
      return () => { active = false; };
    }

    const loadSavedSchedule = async () => {
      setSavedState({ status: 'loading', schedule: null, details: [], error: '' });
      setVerifyState({ status: 'idle', message: '' });
      setBuildState({ status: 'idle', message: '' });

      try {
        if (profileError) throw new Error(profileError);
        if (!agentCustomerId) throw new Error('The selected application does not have a valid customer identifier.');
        if (!operationsUserId) throw new Error('Unable to resolve the authenticated Operations Staff ID.');

        let productId = contextProductId;
        if (!productId) {
          const productResponse = await backOfficeService.getApplicationProductDetailsByCustomer(agentCustomerId);
          const product = firstRecord(productResponse);
          const returnedCustomerId = readValue(product, 'agentCustomerId', 'AgentCustomerId');
          productId = readValue(product, 'applicationProductDetailsId', 'ApplicationProductDetailsId');
          if (!sameIdentifier(returnedCustomerId, agentCustomerId) || !productId) {
            throw new Error('The application product could not be validated for the selected customer.');
          }
        }

        if (!active || requestId !== requestSequenceRef.current) return;
        setIds({ agentCustomerId, applicationProductDetailsId: productId, operationsUserId });

        const response = await operationsRepaymentScheduleService.getByCustomer(agentCustomerId, productId);
        if (!active || requestId !== requestSequenceRef.current) return;

        if (response == null) {
          setSavedState({ status: 'empty', schedule: null, details: [], error: '' });
          return;
        }

        const validated = validateScheduleResponse(response, agentCustomerId, productId);
        if (!validated.valid) throw new Error(validated.error);
        setSavedState({ status: 'ready', schedule: validated.value.schedule, details: validated.value.details, error: '' });
      } catch (error) {
        if (!active || requestId !== requestSequenceRef.current) return;
        setSavedState((current) => ({
          status: 'error',
          schedule: current.schedule,
          details: current.details,
          error: getRepaymentScheduleApiErrorMessage(error, 'Unable to load the repayment schedule.'),
        }));
      }
    };

    loadSavedSchedule();
    return () => { active = false; };
  }, [agentCustomerId, application, contextProductId, operationsUserId, profileError, profileLoading, reloadKey]);

  const requestPayload = useMemo(() => ({
    agentCustomerId: ids.agentCustomerId == null ? null : Number(ids.agentCustomerId),
    applicationProductDetailsId: ids.applicationProductDetailsId == null ? null : Number(ids.applicationProductDetailsId),
    createdBy: ids.operationsUserId == null ? null : Number(ids.operationsUserId),
    remarks: '',
  }), [ids]);

  const totals = useMemo(() => ({
    principal: sumBackendAmounts(savedState.details, 'principalAmount'),
    emi: sumBackendAmounts(savedState.details, 'emiAmount'),
  }), [savedState.details]);
  const busy = savedState.status === 'loading' || verifyState.status === 'loading' || buildState.status === 'loading';
  const actionsDisabled = busy || savedState.status === 'error' || !requestPayload.agentCustomerId || !requestPayload.applicationProductDetailsId || !requestPayload.createdBy;

  const handleVerify = async () => {
    if (actionsDisabled || verifyState.status === 'loading') return;
    const requestId = requestSequenceRef.current;
    setVerifyState({ status: 'loading', message: '' });
    try {
      const savedResponse = await operationsRepaymentScheduleService.getByCustomer(
        requestPayload.agentCustomerId,
        requestPayload.applicationProductDetailsId
      );
      if (requestId !== requestSequenceRef.current) return;
      if (savedResponse == null) {
        setSavedState({ status: 'empty', schedule: null, details: [], error: '' });
        setVerifyState({ status: 'ready', message: 'No saved repayment schedule. Click Build to generate.' });
        return;
      }

      const saved = validateScheduleResponse(savedResponse, requestPayload.agentCustomerId, requestPayload.applicationProductDetailsId);
      if (!saved.valid) throw new Error(saved.error);
      setSavedState({ status: 'ready', schedule: saved.value.schedule, details: saved.value.details, error: '' });

      const previewResponse = await operationsRepaymentScheduleService.preview(requestPayload);
      if (requestId !== requestSequenceRef.current) return;
      const preview = validateScheduleResponse(previewResponse, requestPayload.agentCustomerId, requestPayload.applicationProductDetailsId);
      if (!preview.valid) throw new Error(preview.error);

      const changed = JSON.stringify(comparableSchedule(saved.value)) !== JSON.stringify(comparableSchedule(preview.value));
      setVerifyState({
        status: 'ready',
        message: changed ? 'Changes detected. Click Build to regenerate.' : 'Repayment schedule is up to date.',
      });
    } catch (error) {
      if (requestId !== requestSequenceRef.current) return;
      setVerifyState({ status: 'error', message: getRepaymentScheduleApiErrorMessage(error, 'Verification failed. Please retry.') });
    }
  };

  const handleBuild = async () => {
    if (actionsDisabled || buildState.status === 'loading') return;
    const requestId = requestSequenceRef.current;
    let generated = false;
    setBuildState({ status: 'loading', message: '' });
    try {
      if (!requestPayload.agentCustomerId || !requestPayload.applicationProductDetailsId || !requestPayload.createdBy) {
        throw new Error('Required application and staff identifiers are unavailable.');
      }
      const generatedResponse = await operationsRepaymentScheduleService.generate(requestPayload);
      generated = true;
      const generatedSchedule = validateScheduleResponse(
        generatedResponse,
        requestPayload.agentCustomerId,
        requestPayload.applicationProductDetailsId
      );
      if (!generatedSchedule.valid) throw new Error(generatedSchedule.error);

      const refreshedResponse = await operationsRepaymentScheduleService.getByCustomer(
        requestPayload.agentCustomerId,
        requestPayload.applicationProductDetailsId
      );
      if (requestId !== requestSequenceRef.current) return;
      if (refreshedResponse == null) {
        throw new Error('Repayment schedule was generated successfully, but refreshing the saved schedule returned no record.');
      }
      const refreshed = validateScheduleResponse(
        refreshedResponse,
        requestPayload.agentCustomerId,
        requestPayload.applicationProductDetailsId
      );
      if (!refreshed.valid) throw new Error(`Repayment schedule was generated successfully, but refresh failed: ${refreshed.error}`);

      setSavedState({ status: 'ready', schedule: refreshed.value.schedule, details: refreshed.value.details, error: '' });
      setVerifyState({ status: 'idle', message: '' });
      setBuildState({ status: 'ready', message: 'Repayment schedule generated and refreshed successfully.' });
      toast.success('Repayment schedule generated successfully.');
    } catch (error) {
      if (requestId !== requestSequenceRef.current) return;
      const message = generated
        ? `Repayment schedule generated successfully, but saved-schedule refresh failed. ${getRepaymentScheduleApiErrorMessage(error, 'Retry the saved schedule refresh.')}`
        : getRepaymentScheduleApiErrorMessage(error, 'Unable to generate the repayment schedule.');
      setBuildState({ status: 'error', message });
      toast.error(message);
    }
  };

  const schedule = savedState.schedule;
  const details = savedState.details;

  return (
    <OperationsLayout title="Repayment Schedule" subtitle="Operations Maker workflow">
      <div className="operations-repayment-page">
        <nav className="operations-repayment-breadcrumb" aria-label="Breadcrumb">
          <button type="button" onClick={() => navigate(buildApplicationRoute(ROUTES.MAKER_DASHBOARD, applicationId))}>Operations Maker</button>
          <span aria-hidden="true">›</span>
          <span>Repayment Schedule</span>
        </nav>

        <WorkflowSteps navigate={navigate} applicationId={applicationId} />

        {savedState.status === 'loading' && <div className="operations-repayment-state" role="status">Loading repayment schedule…</div>}
        {savedState.error && (
          <div className="operations-repayment-state operations-repayment-state--error" role="alert">
            <TriangleAlert size={17} aria-hidden="true" />
            <span>{savedState.error}</span>
            <button type="button" className="operations-repayment-button operations-repayment-button--secondary" onClick={() => setReloadKey((value) => value + 1)}>
              <RefreshCw size={15} aria-hidden="true" /> Retry
            </button>
          </div>
        )}
        {savedState.status === 'empty' && !savedState.error && (
          <div className="operations-repayment-empty" role="status">
            <strong>No saved repayment schedule.</strong>
            <span>Use Build to generate the schedule from the backend.</span>
          </div>
        )}
        {verifyState.message && (
          <div className={['operations-repayment-status', verifyState.status === 'error' ? 'operations-repayment-status--error' : ''].join(' ').trim()} role={verifyState.status === 'error' ? 'alert' : 'status'}>
            {verifyState.status === 'error' ? <TriangleAlert size={17} aria-hidden="true" /> : <CheckCircle2 size={17} aria-hidden="true" />}
            <span>{verifyState.message}</span>
          </div>
        )}
        {buildState.message && (
          <div className={['operations-repayment-status', buildState.status === 'error' ? 'operations-repayment-status--error' : ''].join(' ').trim()} role={buildState.status === 'error' ? 'alert' : 'status'}>
            {buildState.status === 'error' ? <TriangleAlert size={17} aria-hidden="true" /> : <CheckCircle2 size={17} aria-hidden="true" />}
            <span>{buildState.message}</span>
            {buildState.status === 'error' && buildState.message.includes('refresh failed') && (
              <button type="button" className="operations-repayment-button operations-repayment-button--secondary" onClick={() => setReloadKey((value) => value + 1)}>
                <RefreshCw size={15} aria-hidden="true" /> Retry Refresh
              </button>
            )}
          </div>
        )}

        <section className="operations-repayment-panel" aria-labelledby="operations-repayment-summary-title">
          <div className="operations-repayment-panel-heading">
            <div>
              <h2 id="operations-repayment-summary-title">Repayment Summary</h2>
              <p>Financial values are read-only and supplied by the repayment schedule backend.</p>
            </div>
            <div className="operations-repayment-actions">
              <button type="button" className="operations-repayment-button operations-repayment-button--secondary" onClick={handleVerify} disabled={actionsDisabled || verifyState.status === 'loading'}>
                {verifyState.status === 'loading' ? 'Verifying…' : 'Verify'}
              </button>
              <button type="button" className="operations-repayment-button operations-repayment-button--primary" onClick={handleBuild} disabled={actionsDisabled || buildState.status === 'loading'}>
                {buildState.status === 'loading' ? 'Building…' : 'Build'}
              </button>
            </div>
          </div>
          <div className="operations-repayment-summary-grid">
            {SUMMARY_FIELDS.map(([label, field, type]) => <SummaryField key={field} label={label} value={readValue(schedule, field, field[0].toUpperCase() + field.slice(1))} type={type} />)}
          </div>
        </section>

        <section className="operations-repayment-panel" aria-labelledby="operations-repayment-bpi-title">
          <div className="operations-repayment-panel-heading">
            <div>
              <h2 id="operations-repayment-bpi-title">BPI Details</h2>
              <p>BPI values are displayed directly from the backend schedule response.</p>
            </div>
          </div>
          <div className="operations-repayment-summary-grid operations-repayment-summary-grid--bpi">
            {BPI_FIELDS.map(([label, field, type]) => <SummaryField key={field} label={label} value={readValue(schedule, field, field[0].toUpperCase() + field.slice(1))} type={type} />)}
          </div>
        </section>

        <section className="operations-repayment-panel" aria-labelledby="operations-repayment-table-title">
          <div className="operations-repayment-panel-heading">
            <div>
              <h2 id="operations-repayment-table-title">Amortization Schedule</h2>
              <p>{details.length ? `${details.length} backend-provided installments` : 'No installment rows are available.'}</p>
            </div>
          </div>
          <div className="operations-repayment-table-wrap">
            <table className="operations-repayment-table">
              <thead>
                <tr><th>Installment</th><th>Date</th><th>Interest</th><th>Principal</th><th>EMI</th><th>Closing</th></tr>
              </thead>
              <tbody>
                {details.length === 0 ? (
                  <tr><td colSpan={6} className="operations-repayment-empty-cell">No repayment schedule rows available.</td></tr>
                ) : details.map((detail, index) => (
                  <tr key={`${readValue(detail, 'emiNo', 'EmiNo') ?? 'row'}-${index}`}>
                    <td>{formatNumber(readValue(detail, 'emiNo', 'EmiNo'))}</td>
                    <td>{formatScheduleDate(readValue(detail, 'emiDate', 'EmiDate'))}</td>
                    <td>{formatAmount(readValue(detail, 'interestAmount', 'InterestAmount'))}</td>
                    <td>{formatAmount(readValue(detail, 'principalAmount', 'PrincipalAmount'))}</td>
                    <td>{formatAmount(readValue(detail, 'emiAmount', 'EmiAmount'))}</td>
                    <td>{formatAmount(readValue(detail, 'closingBalance', 'ClosingBalance'))}</td>
                  </tr>
                ))}
              </tbody>
              {details.length > 0 && (
                <tfoot>
                  <tr>
                    <th colSpan={2}>Total</th>
                    <th>{formatAmount(readValue(schedule, 'totalInterestInclBpi', 'TotalInterestInclBpi'))}</th>
                    <th>{formatAmount(totals.principal)}</th>
                    <th>{formatAmount(totals.emi)}</th>
                    <th>—</th>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>

        <footer className="operations-repayment-footer">
          <button type="button" className="operations-repayment-button operations-repayment-button--secondary" onClick={() => navigate(buildApplicationRoute(ROUTES.MAKER_FEES, applicationId))}>
            <ArrowLeft size={16} aria-hidden="true" /> Back
          </button>
          <button type="button" className="operations-repayment-button operations-repayment-button--primary" onClick={() => navigate(buildApplicationRoute(ROUTES.MAKER_COVENANTS, applicationId))}>
            Continue <ArrowRight size={16} aria-hidden="true" />
          </button>
        </footer>
      </div>
    </OperationsLayout>
  );
}
