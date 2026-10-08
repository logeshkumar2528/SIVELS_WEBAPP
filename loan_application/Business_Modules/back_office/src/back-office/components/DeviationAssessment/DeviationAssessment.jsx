import { useCallback, useEffect, useMemo, useState } from 'react';
import backOfficeService from '../../api/backOfficeService';
import { MasterModal } from '../../../../../../Master_Module/src/components/masters/MasterModal/MasterModal';
import './DeviationAssessment.css';

const read = (row, keys, fallback = '—') => keys.map((key) => row?.[key]).find((value) => value !== undefined && value !== null && value !== '') ?? fallback;
const unwrap = (value) => Array.isArray(value) ? value : value?.data || value?.value || value?.result || [];
const active = (row) => { const value = read(row, ['isActive', 'IsActive', 'active', 'Active'], true); return value === true || value === 1 || value === '1'; };
const decisionId = (row) => read(row, ['applicationDeviationDecisionId', 'ApplicationDeviationDecisionId', 'applicationCIRDeviationDecisionId', 'ApplicationCIRDeviationDecisionId', 'applicationNegativeFIDecisionId', 'ApplicationNegativeFIDecisionId', 'id', 'Id'], null);
const decisionValue = (row) => read(row, ['decision', 'Decision'], '');
const masterId = (row, type) => read(row, type === 'general' ? ['deviationId', 'DeviationId', 'id', 'Id'] : type === 'cir' ? ['cirDeviationId', 'CIRDeviationId', 'id', 'Id'] : ['negativeFIDeviationId', 'NegativeFIDeviationId', 'id', 'Id'], null);
const decisionMasterId = (row, type) => read(row, type === 'general' ? ['deviationId', 'DeviationId'] : type === 'cir' ? ['cirDeviationId', 'CIRDeviationId'] : ['negativeFIDeviationId', 'NegativeFIDeviationId'], null);

export default function DeviationAssessment({ applicationProductDetailsId, backOfficeId, createdBy }) {
  const [masters, setMasters] = useState({ general: [], cir: [], negativeFi: [] });
  const [decisions, setDecisions] = useState({ general: [], cir: [], negativeFi: [] });
  const [savingKey, setSavingKey] = useState('');
  const [pendingDecisions, setPendingDecisions] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!applicationProductDetailsId) return;
    setError('');
    try {
      const [general, cir, negativeFi, generalDecisions, cirDecisions, negativeFiDecisions] = await Promise.all([
        backOfficeService.getDeviationMasters(), backOfficeService.getCIRDeviationMasters(), backOfficeService.getNegativeFIDeviationMasters(),
        backOfficeService.getApplicationDeviationDecisions(applicationProductDetailsId), backOfficeService.getApplicationCIRDeviationDecisions(applicationProductDetailsId), backOfficeService.getApplicationNegativeFIDecisions(applicationProductDetailsId),
      ]);
      setMasters({ general: unwrap(general).filter(active), cir: unwrap(cir).filter(active), negativeFi: unwrap(negativeFi).filter(active) });
      setDecisions({ general: unwrap(generalDecisions), cir: unwrap(cirDecisions), negativeFi: unwrap(negativeFiDecisions) });
      setPendingDecisions({});
    } catch (err) { setError(err?.response?.data?.message || err?.message || 'Unable to load deviation data.'); }
  }, [applicationProductDetailsId]);

  useEffect(() => { load(); }, [load]);

  const findDecision = useCallback((type, id) => decisions[type].find((row) => String(decisionMasterId(row, type)) === String(id)), [decisions]);
  const save = async (type, master, value) => {
    const id = masterId(master, type);
    const existing = findDecision(type, id);
    const key = `${type}-${id}`;
    setSavingKey(key); setError('');
    const user = Number(backOfficeId || createdBy || 0);
    const payload = { applicationProductDetailsId: Number(applicationProductDetailsId), decision: value, remarks: existing ? 'Decision updated' : null, backOfficeId: user, ...(existing ? { createdBy: Number(createdBy || user), modifiedBy: user } : { createdBy: Number(createdBy || user) }) };
    if (type === 'general') payload.deviationId = Number(id);
    if (type === 'cir') payload.cirDeviationId = Number(id);
    if (type === 'negativeFi') payload.negativeFIDeviationId = Number(id);
    try {
      if (existing && decisionId(existing) != null) {
        if (type === 'general') await backOfficeService.updateDeviationDecision(decisionId(existing), payload);
        if (type === 'cir') await backOfficeService.updateCIRDeviationDecision(decisionId(existing), payload);
        if (type === 'negativeFi') await backOfficeService.updateNegativeFIDecision(decisionId(existing), payload);
      } else if (type === 'general') await backOfficeService.saveDeviationDecision(applicationProductDetailsId, payload);
      else if (type === 'cir') await backOfficeService.saveCIRDeviationDecision(payload);
      else await backOfficeService.saveNegativeFIDecision(payload);
    } catch (err) { throw err; }
    finally { setSavingKey(''); }
  };

  const saveAll = async () => {
    const entries = Object.entries(pendingDecisions).filter(([, value]) => value === 'Yes' || value === 'No');
    if (!entries.length) return;
    setIsSaving(true); setError(''); setSavedMessage('');
    try {
      for (const [key, value] of entries) {
        const [type, id] = key.split(':');
        const master = masters[type].find((row) => String(masterId(row, type)) === String(id));
        if (master) await save(type, master, value);
      }
      await load();
      setSavedMessage('Deviation decisions saved successfully.');
    } catch (err) { setError(err?.response?.data?.message || err?.message || 'Unable to save deviation decisions.'); }
    finally { setIsSaving(false); }
  };

  const section = (type, title, columns, rows) => <section className="bo-deviation-section" key={type}>
    <div className="bo-deviation-section-title"><h3>{title}</h3><span>{rows.length} records</span></div>
    <div className="bo-deviation-table-wrap"><table className="bo-deviation-table"><thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}<th>Yes/No</th></tr></thead><tbody>{rows.map((row) => {
      const id = masterId(row, type); const existing = findDecision(type, id); const key = `${type}:${id}`;
      const value = pendingDecisions[key] ?? decisionValue(existing);
      return <tr key={String(id)}>{columns.map((column) => <td key={column.key}>{column.render(row)}</td>)}<td><select value={value} onChange={(event) => { setSavedMessage(''); setPendingDecisions((current) => ({ ...current, [key]: event.target.value })); }} disabled={isSaving || savingKey === key}><option value="">Select</option><option value="Yes">Yes</option><option value="No">No</option></select></td></tr>;
    })}</tbody></table></div>
  </section>;

  const generalColumns = useMemo(() => [
    { key: 'product', label: 'Loan Product', render: (row) => read(row, ['loanProductName', 'LoanProductName', 'productName', 'ProductName', 'loanProduct', 'LoanProduct']) },
    { key: 'program', label: 'Program / Section', render: (row) => read(row, ['programSection', 'ProgramSection', 'program', 'Program', 'section', 'Section']) },
    { key: 'norms', label: 'Deviation Norms', render: (row) => read(row, ['deviationNorms', 'DeviationNorms', 'deviationNorm', 'DeviationNorm']) },
    { key: 'description', label: 'Deviation Description', render: (row) => read(row, ['deviationDescription', 'DeviationDescription', 'description', 'Description']) },
    { key: 'authority', label: 'Approving Authority', render: (row) => read(row, ['approvingAuthority', 'ApprovingAuthority']) },
  ], []);

  return <div className="bo-deviation-assessment">
    <div className="bo-deviation-header"><div><h2>Deviation</h2></div><div className="bo-deviation-header-actions"><button type="button" onClick={load} disabled={isSaving}>Refresh</button></div></div>
    {error && <div className="bo-deviation-error">{error}</div>}
    {section('general', 'Deviation List', generalColumns, masters.general)}
    {section('cir', 'CIR Deviations', [
      { key: 'description', label: 'CIR Deviation Description', render: (row) => read(row, ['cirDeviationDescription', 'CIRDeviationDescription', 'deviationDescription', 'DeviationDescription', 'description', 'Description']) },
      { key: 'authority', label: 'Approving Authority', render: (row) => read(row, ['approvingAuthority', 'ApprovingAuthority']) },
    ], masters.cir)}
    {section('negativeFi', 'Negative FI Approval Matrix', [
      { key: 'category', label: 'Category', render: (row) => read(row, ['category', 'Category', 'negativeFICategory', 'NegativeFICategory']) },
      { key: 'description', label: 'Reason Description', render: (row) => read(row, ['reasonDescription', 'ReasonDescription', 'negativeFIDescription', 'NegativeFIDescription', 'description', 'Description']) },
      { key: 'authority', label: 'Approving Authority', render: (row) => read(row, ['approvingAuthority', 'ApprovingAuthority']) },
    ], masters.negativeFi)}
    <div className="bo-deviation-footer-actions">
      {savedMessage && <div className="bo-deviation-success">{savedMessage}</div>}
      <button type="button" className="bo-deviation-save" onClick={() => setConfirmSaveOpen(true)} disabled={isSaving || Object.keys(pendingDecisions).length === 0}>
        {isSaving ? 'Saving...' : 'Save Decisions'}
      </button>
    </div>
    <MasterModal className="bo-deviation-confirm-modal" isOpen={confirmSaveOpen} onClose={() => !isSaving && setConfirmSaveOpen(false)} title="Save Deviation Decisions?">
      <div className="bo-deviation-confirm">
        <p>Are you sure you want to save the selected Yes/No decisions for this application?</p>
        <div className="bo-deviation-confirm-actions">
          <button type="button" className="bo-deviation-cancel" onClick={() => setConfirmSaveOpen(false)} disabled={isSaving}>Cancel</button>
          <button type="button" className="bo-deviation-save" onClick={async () => { setConfirmSaveOpen(false); await saveAll(); }} disabled={isSaving}>Yes, Save Decisions</button>
        </div>
      </div>
    </MasterModal>
  </div>;
}
