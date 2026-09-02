import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronRight, LoaderCircle, Plus, RefreshCw, Search, SquarePen, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/errorHelper';
import { companyApis } from './companyApi';
import { AUDIT_KEYS, COMPANY_CONFIG, COMPANY_GROUPS, SENSITIVE_KEYS, getDisplayValue, getRecordId } from './companyConfig';
import './CompanyConfiguration.css';

const unwrap = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.result)) return value.result;
  if (Array.isArray(value?.value)) return value.value;
  return value ? [value] : [];
};

const cleanPayload = (values, fields) => Object.fromEntries(
  fields.map((field) => [field.name, values[field.name]])
    .filter(([key, value]) => !AUDIT_KEYS.has(key) && !SENSITIVE_KEYS.has(key) && value !== '' && value !== null && value !== undefined)
);

const makeInitialValues = (section) => Object.fromEntries(section.fields.map((field) => [field.name, '']));

const getCompanyErrorMessage = (error, fallback) => {
  const data = error?.response?.data;
  if (typeof data === 'string' && data.trim()) return data.trim();
  if (data?.detail || data?.title) return [data.title, data.detail].filter(Boolean).join(': ');
  const validation = data?.errors || data?.ModelState;
  if (validation && typeof validation === 'object') {
    const messages = Object.values(validation).flatMap((value) => Array.isArray(value) ? value : [value]).filter(Boolean);
    if (messages.length) return messages.join(' ');
  }
  return getErrorMessage(error, fallback);
};

function StatusBadge({ value }) {
  const active = value !== false && value !== 0 && value !== 'false' && value !== 'Inactive';
  return <span className={`company-status ${active ? '' : 'inactive'}`}>{active ? 'Active' : 'Inactive'}</span>;
}

function CompanyForm({ section, record, lookups, busy, serverError, onClose, onSubmit }) {
  const [values, setValues] = useState(() => ({ ...makeInitialValues(section), ...(record || {}) }));
  const [validation, setValidation] = useState('');

  const submit = (event) => {
    event.preventDefault();
    const missing = section.fields.find((field) => field.required && !String(values[field.name] ?? '').trim());
    if (missing) {
      setValidation(`${missing.label} is required.`);
      return;
    }
    setValidation('');
    const payload = cleanPayload(values, section.fields);
    if (payload.isActive === undefined) payload.isActive = values.isActive ?? true;
    onSubmit(payload);
  };

  return (
    <div className="company-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="company-modal" role="dialog" aria-modal="true" aria-labelledby="company-form-title">
        <div className="company-modal-header">
          <div><p className="company-config-eyebrow">Configuration</p><h3 id="company-form-title">{record ? `Edit ${section.singular}` : `Add ${section.singular}`}</h3></div>
          <button className="company-close-button" type="button" onClick={onClose} aria-label="Close form"><X size={19} /></button>
        </div>
        <form className="company-form" onSubmit={submit}>
          {validation && <div className="company-error company-field full">{validation}</div>}
          {serverError && <div className="company-error company-field full">{serverError}</div>}
          {section.fields.map((field) => (
            <div className="company-field" key={field.name}>
              <label htmlFor={`company-${field.name}`}>{field.label}{field.required ? ' *' : ''}</label>
              {field.type === 'select' ? (
                <select id={`company-${field.name}`} value={values[field.name] ?? ''} onChange={(event) => setValues({ ...values, [field.name]: event.target.value })}>
                  <option value="">Select {field.label.toLowerCase()}</option>
                  {(field.options === 'companies' ? lookups.companies : field.options === 'addressTypes' ? lookups.addressTypes : lookups.companyTypes).map((option) => (
                    <option key={getRecordId(option, field.options === 'companies' ? 'company' : field.options === 'addressTypes' ? 'addressType' : 'companyType')} value={getRecordId(option, field.options === 'companies' ? 'company' : field.options === 'addressTypes' ? 'addressType' : 'companyType')}>{getDisplayValue(option, field.options === 'companies' ? 'companyName' : field.options === 'addressTypes' ? 'companyAddressTypeName' : 'companyTypeName')}</option>
                  ))}
                </select>
              ) : (
                <input id={`company-${field.name}`} type={field.type} value={values[field.name] ?? ''} onChange={(event) => setValues({ ...values, [field.name]: event.target.value })} />
              )}
            </div>
          ))}
          <div className="company-form-footer">
            <button className="company-button ghost" type="button" onClick={onClose}>Cancel</button>
            <button className="company-button primary" type="submit" disabled={busy}>{busy ? <LoaderCircle size={16} className="company-spin" /> : null}{record ? 'Save changes' : 'Create record'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function CompanyConfiguration() {
  const [activeKey, setActiveKey] = useState('companyType');
  const [records, setRecords] = useState([]);
  const [lookups, setLookups] = useState({ companies: [], addressTypes: [], companyTypes: [] });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [formRecord, setFormRecord] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [openGroups, setOpenGroups] = useState(() => Object.fromEntries(COMPANY_GROUPS.map((group) => [group.label, true])));
  const [sortConfig, setSortConfig] = useState({ key: '', direction: 'ascending' });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const section = COMPANY_CONFIG[activeKey];

  const loadLookup = async (key, target) => {
    try {
      const response = await companyApis[key].list();
      setLookups((current) => ({ ...current, [target]: unwrap(response) }));
    } catch { /* Main screen errors remain visible when a lookup is unavailable. */ }
  };

  const loadRecords = async () => {
    setLoading(true); setError('');
    try {
      const params = section.child && lookups.selectedCompanyId ? { companyId: lookups.selectedCompanyId } : undefined;
      setRecords(unwrap(await companyApis[section.apiKey].list(params)));
    } catch (requestError) { setError(getCompanyErrorMessage(requestError, `Unable to load ${section.title.toLowerCase()}.`)); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadRecords(); }, [activeKey, lookups.selectedCompanyId]);
  useEffect(() => { loadLookup('company', 'companies'); loadLookup('addressType', 'addressTypes'); loadLookup('companyType', 'companyTypes'); }, []);

  const filteredRecords = useMemo(() => records.filter((record) => JSON.stringify(record).toLowerCase().includes(searchTerm.toLowerCase())), [records, searchTerm]);
  const sortedRecords = useMemo(() => {
    if (!sortConfig.key) return filteredRecords;
    return [...filteredRecords].sort((left, right) => {
      const first = getDisplayValue(left, sortConfig.key).toLowerCase();
      const second = getDisplayValue(right, sortConfig.key).toLowerCase();
      const comparison = first.localeCompare(second, undefined, { numeric: true });
      return sortConfig.direction === 'ascending' ? comparison : -comparison;
    });
  }, [filteredRecords, sortConfig]);
  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / pageSize));
  const paginatedRecords = sortedRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => { setCurrentPage(1); }, [activeKey, searchTerm, lookups.selectedCompanyId, pageSize]);
  const handleSubmit = async (payload) => {
    setSaving(true);
    try {
      const id = formRecord && getRecordId(formRecord, section.apiKey);
      const response = id ? await companyApis[section.apiKey].update(id, payload) : await companyApis[section.apiKey].create(payload);
      toast.success(response?.message || `${section.singular} ${id ? 'updated' : 'created'} successfully.`);
      setFormError('');
      setFormRecord(null); await loadRecords();
    } catch (requestError) {
      const message = getCompanyErrorMessage(requestError, `Unable to save ${section.singular.toLowerCase()}.`);
      setFormError(message);
      toast.error(message);
    }
    finally { setSaving(false); }
  };

  const handleDelete = async (record) => {
    const id = getRecordId(record, section.apiKey);
    if (!id || !window.confirm(`Delete this ${section.singular.toLowerCase()}? This action cannot be undone.`)) return;
    setDeleting(id);
    try { const response = await companyApis[section.apiKey].remove(id); toast.success(response?.message || `${section.singular} deleted successfully.`); await loadRecords(); }
    catch (requestError) { toast.error(getErrorMessage(requestError, `Unable to delete ${section.singular.toLowerCase()}.`)); }
    finally { setDeleting(null); }
  };

  const toggleSort = (key) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'ascending' ? 'descending' : 'ascending',
    }));
  };

  const sortIcon = (key) => {
    if (sortConfig.key !== key) return <ArrowUpDown size={14} />;
    return sortConfig.direction === 'ascending' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  return (
    <main className="company-config-page">
      <header className="company-config-hero">
        <div><p className="company-config-eyebrow">Sivels / Company</p><h1 className="company-config-title">Company configuration</h1></div>
      </header>
      <div className="company-config-layout">
        <aside className="company-config-sidebar" aria-label="Company configuration sections">
          {COMPANY_GROUPS.map((group) => {
            const isOpen = openGroups[group.label];
            return <div className="company-nav-group" key={group.label}>
              <button className="company-nav-group-toggle" type="button" onClick={() => setOpenGroups((current) => ({ ...current, [group.label]: !current[group.label] }))} aria-expanded={isOpen}>
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}<span>{group.label}</span>
              </button>
              {isOpen && <div className="company-nav-group-items">{group.items.map((key) => { const item = COMPANY_CONFIG[key]; const Icon = item.icon; return <button key={item.apiKey} type="button" className={`company-nav-button ${activeKey === item.apiKey ? 'active' : ''}`} onClick={() => { setActiveKey(item.apiKey); setSearchTerm(''); }}><Icon size={17} /><span className="company-nav-label">{item.title}</span></button>; })}</div>}
            </div>;
          })}
        </aside>
        <section className="company-config-panel">
          <div className="company-panel-heading"><div><h2>{section.title}</h2></div><div className="company-actions"><button className="company-button ghost" onClick={loadRecords} disabled={loading}><RefreshCw size={16} />Refresh</button><button className="company-button primary" onClick={() => { setFormError(''); setFormRecord({}); }}><Plus size={17} />Add {section.singular}</button></div></div>
          <div className={`company-toolbar ${section.child ? 'company-toolbar-child' : ''}`}>
            {section.child && <select className="company-company-filter" aria-label="Filter by company" value={lookups.selectedCompanyId || ''} onChange={(event) => setLookups({ ...lookups, selectedCompanyId: event.target.value })}><option value="">All companies</option>{lookups.companies.map((company) => <option key={getRecordId(company, 'company')} value={getRecordId(company, 'company')}>{getDisplayValue(company, 'companyName')}</option>)}</select>}
            <div className="company-search"><Search size={17} /><input className="company-search-input" aria-label="Search records" placeholder="Search records..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} /></div>
          </div>
          {error && <div className="company-error">{error}</div>}
          {loading ? <div className="company-state"><LoaderCircle className="company-spin" size={24} /> Loading {section.title.toLowerCase()}...</div> : paginatedRecords.length === 0 ? <div className="company-state"><strong>No {section.title.toLowerCase()} found</strong><span>Try adjusting your search or create a new record.</span></div> : <div className="company-table-wrap"><table className="company-table"><thead><tr>{section.columns.map((column) => <th key={column}><button type="button" className="company-sort-button" onClick={() => toggleSort(column)}>{column.replace(/([A-Z])/g, ' $1')}{sortIcon(column)}</button></th>)}<th>Actions</th></tr></thead><tbody>{paginatedRecords.map((record, index) => <tr key={getRecordId(record, section.apiKey) ?? index}>{section.columns.map((column) => <td key={column}>{column === 'isActive' ? <StatusBadge value={record[column]} /> : getDisplayValue(record, column)}</td>)}<td><div className="company-row-actions"><button className="company-icon-button" onClick={() => setFormRecord(record)} aria-label={`Edit ${section.singular}`}><SquarePen size={18} /></button><button className="company-icon-button delete" onClick={() => handleDelete(record)} disabled={deleting === getRecordId(record, section.apiKey)} aria-label={`Delete ${section.singular}`}>{deleting === getRecordId(record, section.apiKey) ? <LoaderCircle className="company-spin" size={18} /> : <Trash2 size={18} />}</button></div></td></tr>)}</tbody></table></div>}
          {!loading && sortedRecords.length > 0 && <footer className="company-table-footer"><span>Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, sortedRecords.length)} of {sortedRecords.length} records</span><div className="company-pagination"><label htmlFor="company-page-size">Rows</label><select id="company-page-size" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}><option value="10">10</option><option value="25">25</option><option value="50">50</option></select><button type="button" className="company-page-button" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)} aria-label="Previous page">Previous</button><span>Page {currentPage} of {totalPages}</span><button type="button" className="company-page-button" disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => page + 1)} aria-label="Next page">Next</button></div></footer>}
        </section>
      </div>
      {formRecord !== null && <CompanyForm section={section} record={Object.keys(formRecord).length ? formRecord : null} lookups={lookups} busy={saving} serverError={formError} onClose={() => { setFormError(''); setFormRecord(null); }} onSubmit={handleSubmit} />}
    </main>
  );
}
