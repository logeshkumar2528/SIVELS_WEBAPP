import { ChevronRight, FileText, Send, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFees } from '../../../../../../Master_Module/src/api/masters/feeMasterApi';
import { buildApplicationRoute, ROUTES } from '../../../config/routeConfig';
import { useOperationsApplication } from '../../../context/OperationsApplicationContext';
import OperationsLayout from '../../../layouts/OperationsLayout';
import './Fees.css';

const WORKFLOW_STEPS = [
  { id: 'loan-basic-details', label: 'Loan Basic Details', route: ROUTES.MAKER_LOAN_BASIC_DETAILS },
  { id: 'fees', label: 'Fees', active: true, route: ROUTES.MAKER_FEES },
  { id: 'covenants', label: 'Covenants', route: ROUTES.MAKER_COVENANTS },
  { id: 'mandate-details', label: 'Mandate Details', route: ROUTES.MAKER_MANDATE_DETAILS },
  { id: 'cheque-details', label: 'Cheque Details', route: ROUTES.MAKER_CHEQUE_DETAILS },
];

const FINANCIAL_FIELDS = [
  'calculatedFee',
  'actualFee',
  'feeWaiver',
  'netFee',
  'netGst',
  'totalNet',
  'paidAmount',
  'paidGst',
  'totalPaid',
  'remainingFee',
  'remainingGst',
  'totalRemaining',
];

const TABLE_COLUMNS = [
  { key: 'calculatedFee', label: 'Cal. Fee (₹)', className: 'operations-fees-col--financial' },
  { key: 'actualFee', label: 'Actual Fee (₹)', className: 'operations-fees-col--financial' },
  { key: 'feeWaiver', label: 'Fee Waiver (₹)', className: 'operations-fees-col--financial' },
  { key: 'netFee', label: 'Net Fee (₹)', className: 'operations-fees-col--financial' },
  { key: 'netGst', label: 'Net GST (₹)', className: 'operations-fees-col--financial' },
  { key: 'totalNet', label: 'Tot. Net (₹)', className: 'operations-fees-col--financial' },
  { key: 'paidAmount', label: 'Paid Amount (₹)', className: 'operations-fees-col--financial' },
  { key: 'paidGst', label: 'Paid GST (₹)', className: 'operations-fees-col--financial' },
  { key: 'totalPaid', label: 'Tot. Paid (₹)', className: 'operations-fees-col--financial' },
  { key: 'remainingFee', label: 'Remaining Fee (₹)', className: 'operations-fees-col--financial' },
  { key: 'remainingGst', label: 'Remaining GST (₹)', className: 'operations-fees-col--financial' },
  { key: 'totalRemaining', label: 'Tot. Remaining (₹)', className: 'operations-fees-col--financial' },
];

const SUMMARY_CARDS = [
  { label: 'Total Calculated Fee', value: '₹0.00' },
  { label: 'Total Paid', value: '₹0.00' },
  { label: 'Total Remaining', value: '₹0.00' },
  { label: 'GST Amount', value: '₹0.00' },
];

const LOAN_INFORMATION = [
  { label: 'Loan Type', value: '—' },
  { label: 'Schedule Method', value: '—' },
  { label: 'Loan Reference No.', value: '—' },
  { label: 'Currency', value: '—' },
  { label: 'Interest Days Basis', value: '—' },
  { label: 'Customer Name', value: '—' },
];

function createEmptyFinancialValues() {
  return FINANCIAL_FIELDS.reduce((values, field) => ({ ...values, [field]: '' }), {});
}

function normalizeFeeMasterRecords(response) {
  const records = [response, response?.value, response?.data, response?.result]
    .find((candidate) => Array.isArray(candidate)) || [];

  if (!Array.isArray(records)) return [];

  return records
    .filter((record) => record?.isActive === true || record?.IsActive === true)
    .map((record) => {
      const feeId = record?.feeId ?? record?.FeeId ?? record?.id;
      const feeName = record?.feeName ?? record?.FeeName;

      return {
        stableId: feeId,
        feeName: typeof feeName === 'string' ? feeName.trim() : feeName,
      };
    })
    .filter((record) => (
      record.stableId !== undefined
      && record.stableId !== null
      && String(record.stableId).trim() !== ''
      && typeof record.feeName === 'string'
      && record.feeName.trim() !== ''
    ));
}

function WorkflowSteps({ navigate, applicationId }) {
  return (
    <nav className="operations-fees-steps" aria-label="Application workflow steps">
      {WORKFLOW_STEPS.map((step, index) => (
        <button
          key={step.id}
          type="button"
          className={['operations-fees-step', step.active ? 'is-active' : ''].join(' ').trim()}
          aria-current={step.active ? 'step' : undefined}
          disabled={!step.route}
          onClick={() => step.route && navigate(buildApplicationRoute(step.route, applicationId))}
        >
          <span className="operations-fees-step-number">{index + 1}</span>
          <span>{step.label}</span>
        </button>
      ))}
    </nav>
  );
}

function FeeRow({ record, index, values, onChange }) {
  // `stableId` and `feeName` are normalized frontend view-model fields. The future
  // Master adapter must map the backend contract into these fields.
  const masterId = record.stableId;
  const feeName = record.feeName || '—';

  return (
    <tr>
      <td className="operations-fees-cell operations-fees-cell--serial">{index + 1}</td>
      <td className="operations-fees-cell operations-fees-cell--name">{feeName}</td>
      {TABLE_COLUMNS.map((column) => (
        <td className={['operations-fees-cell', column.className].join(' ').trim()} key={column.key}>
          <input
            className="operations-fees-input"
            type="number"
            step="0.01"
            inputMode="decimal"
            placeholder="0.00"
            aria-label={`${column.label} for ${feeName}`}
            value={values?.[column.key] ?? ''}
            onChange={(event) => onChange(masterId, column.key, event.target.value)}
          />
        </td>
      ))}
    </tr>
  );
}

export default function Fees() {
  const navigate = useNavigate();
  const { applicationId, application } = useOperationsApplication();
  const requestIdRef = useRef(0);
  const [masterRecords, setMasterRecords] = useState([]);
  const [isMasterLoading, setIsMasterLoading] = useState(true);
  const [isMasterError, setIsMasterError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [financialValuesByMasterId, setFinancialValuesByMasterId] = useState({});
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    let isMounted = true;

    const loadFeeMasterRecords = async () => {
      setIsMasterLoading(true);
      setIsMasterError(false);

      try {
        const response = await getFees();
        if (!isMounted || requestId !== requestIdRef.current) return;

        setMasterRecords(normalizeFeeMasterRecords(response));
      } catch (error) {
        if (!isMounted || requestId !== requestIdRef.current) return;

        console.error('Failed to fetch Fee Master records:', error);
        setIsMasterError(true);
      } finally {
        if (isMounted && requestId === requestIdRef.current) {
          setIsMasterLoading(false);
        }
      }
    };

    loadFeeMasterRecords();

    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  const updateFinancialValue = (masterId, field, value) => {
    setFinancialValuesByMasterId((current) => ({
      ...current,
      [masterId]: {
        ...(current[masterId] || createEmptyFinancialValues()),
        [field]: value,
      },
    }));
  };

  const loanInformation = LOAN_INFORMATION.map((item) => (
    item.label === 'Customer Name'
      ? { ...item, value: application?.fullName || '—' }
      : item
  ));

  return (
    <OperationsLayout title="Fees" subtitle="Operations Maker workflow">
      <div className="operations-fees-page">
        <nav className="operations-fees-breadcrumb" aria-label="Breadcrumb">
          <button type="button" onClick={() => navigate(ROUTES.MAKER_DASHBOARD)}>Operations Maker</button>
          <ChevronRight size={15} aria-hidden="true" />
          <span>Fees</span>
        </nav>

        <WorkflowSteps navigate={navigate} applicationId={applicationId} />

        <section className="operations-fees-section" aria-labelledby="operations-fees-loan-information">
          <div className="operations-fees-section-heading">
            <div>
              <h2 id="operations-fees-loan-information">Loan Information</h2>
              <p>Application details supplied by the selected loan record.</p>
            </div>
          </div>
          <dl className="operations-fees-information-grid">
            {loanInformation.map((item) => (
              <div className="operations-fees-information-item" key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="operations-fees-section" aria-labelledby="operations-fees-details">
          <div className="operations-fees-section-heading">
            <div>
              <h2 id="operations-fees-details">Fee Details</h2>
              <p>Fee names will be supplied by the Fee Master. Financial values are entered manually.</p>
            </div>
          </div>
          <div className="operations-fees-table-wrap">
            <table className="operations-fees-table">
              <colgroup>
                <col className="operations-fees-col operations-fees-col--serial" />
                <col className="operations-fees-col operations-fees-col--name" />
                {TABLE_COLUMNS.map((column) => (
                  <col className={['operations-fees-col', column.className].join(' ').trim()} key={column.key} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Type / GST Treatment</th>
                  {TABLE_COLUMNS.map((column) => (
                    <th scope="col" className={column.className} key={column.key}>{column.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isMasterLoading ? (
                  <tr>
                    <td className="operations-fees-empty-state" colSpan={14}>
                      Loading fee master records...
                    </td>
                  </tr>
                ) : isMasterError ? (
                  <tr>
                    <td className="operations-fees-empty-state" colSpan={14}>
                      <div>Unable to load fee master records.</div>
                      <button
                        type="button"
                        className="operations-fees-button operations-fees-button--secondary"
                        onClick={() => setReloadKey((current) => current + 1)}
                      >
                        Retry
                      </button>
                    </td>
                  </tr>
                ) : masterRecords.length === 0 ? (
                  <tr>
                    <td className="operations-fees-empty-state" colSpan={14}>
                      No active fee master records available.
                    </td>
                  </tr>
                ) : (
                  masterRecords.map((record, index) => (
                    <FeeRow
                      key={record.stableId}
                      record={record}
                      index={index}
                      values={financialValuesByMasterId[record.stableId]}
                      onChange={updateFinancialValue}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="operations-fees-receipt-row">
          <button
            type="button"
            className="operations-fees-button operations-fees-button--secondary"
            disabled
            title="Receipt integration is not connected yet."
          >
            <FileText size={16} aria-hidden="true" />
            View Receipt(s)
          </button>
        </div>

        <section className="operations-fees-summary" aria-label="Financial summary">
          {SUMMARY_CARDS.map((card) => (
            <article className="operations-fees-summary-card" key={card.label}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </article>
          ))}
        </section>

        <footer className="operations-fees-footer">
          <div className="operations-fees-footer-meta">
            <div className="operations-fees-footer-status">
              <span className="operations-fees-status-dot" />
              <span>Status: UI-only draft</span>
            </div>
            <label className="operations-fees-notes">
              <span>Notes</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Add notes"
                rows="2"
              />
            </label>
          </div>
          <div className="operations-fees-actions">
            <button type="button" className="operations-fees-button operations-fees-button--secondary" disabled title="Backend workflow is not connected yet.">
              <Send size={16} aria-hidden="true" />
              Resubmit
            </button>
            <button type="button" className="operations-fees-button operations-fees-button--primary" disabled title="Backend workflow is not connected yet.">
              <Send size={16} aria-hidden="true" />
              Submit
            </button>
            <button type="button" className="operations-fees-button operations-fees-button--danger" disabled title="Backend workflow is not connected yet.">
              <X size={16} aria-hidden="true" />
              Reject
            </button>
          </div>
        </footer>
      </div>
    </OperationsLayout>
  );
}
