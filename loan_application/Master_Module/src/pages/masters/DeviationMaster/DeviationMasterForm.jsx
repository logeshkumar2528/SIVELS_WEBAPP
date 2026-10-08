import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Activity, ShieldAlert, ShieldCheck } from 'lucide-react';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';
import { getLoanProducts } from '../../../api/masters/loanProductApi';
import { deviationMasterApi } from '../../../api/masters/deviationMasterApi';
import { getCurrentUserId } from '../../../utils/authHelper';
import { getErrorMessage } from '../../../utils/errorHelper';

const read = (row, keys, fallback = '') => keys.map((key) => row?.[key]).find((value) => value !== undefined && value !== null) ?? fallback;
const getId = (row, type) => read(row, type === 'general'
  ? ['deviationId', 'DeviationId', 'id', 'Id']
  : type === 'cir' ? ['cirDeviationId', 'CIRDeviationId', 'id', 'Id']
    : ['negativeFIDeviationId', 'NegativeFIDeviationId', 'id', 'Id'], null);
const getActive = (row) => {
  const value = read(row, ['isActive', 'IsActive', 'active', 'Active'], true);
  return value === true || value === 1 || value === '1';
};

const initialFor = (type) => type === 'general'
  ? { loanProductId: '', programSection: '', deviationNorms: '', deviationDescription: '', approvingAuthority: '', isActive: true }
  : type === 'cir'
    ? { cirDeviationDescription: '', approvingAuthority: '', isActive: true }
    : { category: '', reasonDescription: '', approvingAuthority: '', isActive: true };

export function DeviationMasterForm({ isOpen, onClose, onSuccess, editingRecord, type }) {
  const [form, setForm] = useState(initialFor(type));
  const [products, setProducts] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const isEdit = Boolean(editingRecord);
  const labels = type === 'general'
    ? { title: 'Deviation', icon: <ShieldCheck size={24} /> }
    : type === 'cir' ? { title: 'CIR Deviation', icon: <Activity size={24} /> }
      : { title: 'Negative FI Deviation', icon: <ShieldAlert size={24} /> };

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    if (!editingRecord) setForm(initialFor(type));
    else if (type === 'general') setForm({
      loanProductId: String(read(editingRecord, ['loanProductId', 'LoanProductId'], '')),
      programSection: read(editingRecord, ['programSection', 'ProgramSection', 'program', 'Program']),
      deviationNorms: read(editingRecord, ['deviationNorms', 'DeviationNorms', 'deviationNorm', 'DeviationNorm']),
      deviationDescription: read(editingRecord, ['deviationDescription', 'DeviationDescription', 'description', 'Description']),
      approvingAuthority: read(editingRecord, ['approvingAuthority', 'ApprovingAuthority']), isActive: getActive(editingRecord),
    });
    else if (type === 'cir') setForm({
      cirDeviationDescription: read(editingRecord, ['cirDeviationDescription', 'CIRDeviationDescription', 'deviationDescription', 'DeviationDescription', 'description', 'Description']),
      approvingAuthority: read(editingRecord, ['approvingAuthority', 'ApprovingAuthority']), isActive: getActive(editingRecord),
    });
    else setForm({
      category: read(editingRecord, ['category', 'Category', 'negativeFICategory', 'NegativeFICategory']),
      reasonDescription: read(editingRecord, ['reasonDescription', 'ReasonDescription', 'negativeFIDescription', 'NegativeFIDescription', 'description', 'Description']),
      approvingAuthority: read(editingRecord, ['approvingAuthority', 'ApprovingAuthority']), isActive: getActive(editingRecord),
    });
    if (type === 'general') getLoanProducts().then((res) => {
      const data = res?.data || res?.value || res;
      setProducts(Array.isArray(data) ? data : []);
    }).catch(() => setProducts([]));
  }, [editingRecord, isOpen, type]);

  const update = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const submit = async (event) => {
    event.preventDefault();
    setError('');
    const required = type === 'general'
      ? ['loanProductId', 'programSection', 'deviationNorms', 'deviationDescription', 'approvingAuthority']
      : type === 'cir' ? ['cirDeviationDescription', 'approvingAuthority'] : ['category', 'reasonDescription', 'approvingAuthority'];
    if (required.some((field) => !String(form[field] ?? '').trim())) {
      setError('Please complete all required fields.');
      return;
    }
    setSubmitting(true);
    const userId = getCurrentUserId() || 1;
    const payload = { ...form, ...(type === 'general' ? { loanProductId: Number(form.loanProductId) } : {}), isActive: form.isActive === true };
    try {
      if (isEdit) await deviationMasterApi[type].update(getId(editingRecord, type), { ...payload, modifiedBy: userId });
      else await deviationMasterApi[type].create({ ...payload, createdBy: userId });
      toast.success(`${labels.title} ${isEdit ? 'updated' : 'created'} successfully`);
      onSuccess();
      onClose();
    } catch (err) {
      const message = getErrorMessage(err, `Unable to save ${labels.title}.`);
      setError(message);
      toast.error(message);
    } finally { setSubmitting(false); }
  };

  return <MasterModal isOpen={isOpen} onClose={onClose} title={`${isEdit ? 'Edit' : 'Add'} ${labels.title}`} icon={labels.icon}>
    <form onSubmit={submit} className="masters-form" noValidate>
      {error && <div className="form-error-banner">{error}</div>}
      {type === 'general' && <>
        <div className="form-group"><label className="form-label required">Loan Product</label><select className="form-input" value={form.loanProductId} onChange={(e) => update('loanProductId', e.target.value)} disabled={submitting}><option value="">Select loan product</option>{products.map((product) => <option key={read(product, ['loanProductId', 'LoanProductId', 'id', 'Id'])} value={read(product, ['loanProductId', 'LoanProductId', 'id', 'Id'])}>{read(product, ['loanProductName', 'LoanProductName', 'productName', 'ProductName', 'name', 'Name'])}</option>)}</select></div>
        <div className="deviation-form-grid"><Field label="Program / Section" value={form.programSection} onChange={(v) => update('programSection', v)} /><Field label="Deviation Norms" value={form.deviationNorms} onChange={(v) => update('deviationNorms', v)} /></div>
        <Field label="Deviation Description" value={form.deviationDescription} onChange={(v) => update('deviationDescription', v)} textarea />
      </>}
      {type === 'cir' && <Field label="CIR Deviation Description" value={form.cirDeviationDescription} onChange={(v) => update('cirDeviationDescription', v)} textarea />}
      {type === 'negativeFi' && <><Field label="Category" value={form.category} onChange={(v) => update('category', v)} /><Field label="Reason Description" value={form.reasonDescription} onChange={(v) => update('reasonDescription', v)} textarea /></>}
      <Field label="Approving Authority" value={form.approvingAuthority} onChange={(v) => update('approvingAuthority', v)} />
      <MasterStatusCheckbox isActive={form.isActive} onChange={(value) => update('isActive', value)} disabled={submitting} />
      <div className="form-actions"><button type="button" className="masters-btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button><button type="submit" className="masters-btn-primary" disabled={submitting}>{submitting ? 'Saving...' : isEdit ? 'Update' : 'Create'}</button></div>
    </form>
  </MasterModal>;
}

function Field({ label, value, onChange, textarea = false }) {
  const Tag = textarea ? 'textarea' : 'input';
  return <div className="form-group"><label className="form-label required">{label}</label><Tag className="form-input" value={value} onChange={(e) => onChange(e.target.value)} rows={textarea ? 3 : undefined} /></div>;
}
