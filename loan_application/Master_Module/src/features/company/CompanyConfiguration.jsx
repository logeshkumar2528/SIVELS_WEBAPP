import { useEffect, useMemo, useState } from 'react';
import { Building2, ChevronDown, ChevronRight, Plus, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/errorHelper';
import { getBanks } from '../../api/masters/bankApi';
import { getBankBranches } from '../../api/masters/bankBranchApi';
import { getCities } from '../../api/masters/cityApi';
import { getStates } from '../../api/masters/stateApi';
import { getDistricts } from '../../api/masters/districtApi';
import { getCountries } from '../../api/masters/countryApi';
import { MasterTable } from '../../components/masters/MasterTable/MasterTable';
import { MasterSearch } from '../../components/masters/MasterSearch/MasterSearch';
import { MasterFilter } from '../../components/masters/MasterFilter/MasterFilter';
import { MasterPagination } from '../../components/masters/MasterPagination/MasterPagination';
import { MasterModal } from '../../components/masters/MasterModal/MasterModal';
import { MasterStatusBadge } from '../../components/masters/MasterStatusBadge/MasterStatusBadge';
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

const toApiValue = (field, value) => {
  if (field.type === 'number') return Number(value);
  if (field.name === 'dispStatus') return Number(value);
  if (field.type === 'select' && field.name !== 'companyTypeId') return Number(value);
  if (field.type === 'static-select' && field.options.some((option) => option.value === 0 || option.value === 1)) {
    return value === true || value === 1 || value === '1';
  }
  return value;
};

const cleanPayload = (values, fields) => Object.fromEntries(
  fields.map((field) => [field, values[field.name]])
    .filter(([, value]) => value !== '' && value !== null && value !== undefined)
    .map(([field, value]) => [field.name, toApiValue(field, value)])
    .filter(([key, value]) => !AUDIT_KEYS.has(key) && !SENSITIVE_KEYS.has(key) && value !== '' && value !== null && value !== undefined)
);

const normalizeInputValue = (field, value) => {
  if (value === undefined || value === null) return '';
  if (field.type === 'date') return String(value).slice(0, 10);
  if (field.type === 'datetime-local') return String(value).slice(0, 16);
  if (field.type === 'static-select' && (value === true || value === false)) return value ? 1 : 0;
  return value;
};

const makeInitialValues = (section, record) => Object.fromEntries(
  section.fields.map((field) => [field.name, normalizeInputValue(field, record?.[field.name])])
);

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

const formatColumnLabel = (section, column) => {
  if (section.apiKey === 'accountingDetail' && column === 'yrId') return 'Year';
  if (section.apiKey === 'accountingDetail' && column === 'dispStatus') return 'Status';
  if (column === 'isActive' || column === 'status') return 'Status';
  return column.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase()).trim();
};

const isStatusColumn = (section, column) => (
  column === 'isActive' || column === 'status' || (section.apiKey === 'accountingDetail' && column === 'dispStatus')
);

const getLookupResource = (options) => {
  if (options === 'companies') return 'company';
  if (options === 'addressTypes') return 'addressType';
  if (options === 'companyTypes') return 'companyType';
  if (options === 'banks') return 'bank';
  if (options === 'bankBranches') return 'bankBranch';
  if (options === 'cities') return 'city';
  if (options === 'districts') return 'district';
  if (options === 'countries') return 'country';
  if (options === 'accountingDetails') return 'accountingDetail';
  return 'state';
};

const getLookupLabel = (options, option) => {
  if (options === 'accountingDetails') return `${option.yrId ?? ''} (${option.cUsrId ?? option.compYId ?? ''})`;
  if (options === 'companies') return getDisplayValue(option, 'companyName');
  if (options === 'addressTypes') return getDisplayValue(option, 'companyAddressTypeName');
  if (options === 'banks') return getDisplayValue(option, 'bankName');
  if (options === 'bankBranches') return getDisplayValue(option, 'branchName');
  if (options === 'cities') return getDisplayValue(option, 'cityName');
  if (options === 'districts') return getDisplayValue(option, 'districtName');
  if (options === 'countries') return getDisplayValue(option, 'countryName');
  if (options === 'states') return getDisplayValue(option, 'stateName');
  return getDisplayValue(option, 'companyTypeName');
};

function CompanyForm({ section, record, lookups, busy, serverError, onClose, onSubmit }) {
  const [values, setValues] = useState(() => makeInitialValues(section, record));
  const [validation, setValidation] = useState('');
  const Icon = section.icon;

  const submit = (event) => {
    event.preventDefault();
    const missing = section.fields.find((field) => field.required && !String(values[field.name] ?? '').trim());
    if (missing) {
      setValidation(`${missing.label} is required.`);
      return;
    }
    setValidation('');
    const payload = cleanPayload(values, section.fields);
    if (section.apiKey === 'accountingDetail' && payload.cUsrId === undefined) {
      payload.cUsrId = record?.cUsrId || 'SYSTEM';
    }
    if (section.fields.some((field) => field.name === 'status') && payload.status === undefined) {
      payload.status = values.status === '' ? true : values.status;
    }
    if (section.fields.some((field) => field.name === 'isActive') && payload.isActive === undefined) {
      payload.isActive = values.isActive === '' ? true : values.isActive;
    }
    onSubmit(payload);
  };

  return (
    <MasterModal
      isOpen
      onClose={onClose}
      title={record ? `Edit ${section.singular}` : `Add ${section.singular}`}
      subtitle="Company configuration"
      icon={<Icon size={22} />}
      className="company-form-modal"
    >
      <form className="masters-form company-masters-form" onSubmit={submit}>
        {(validation || serverError) && (
          <div className="company-form-alert" role="alert">
            {validation || serverError}
          </div>
        )}

        <div className="company-form-grid">
          {section.fields.map((field) => (
            <div className="form-group" key={field.name}>
              <label htmlFor={`company-${field.name}`} className="form-label">
                {field.label}
                {field.required ? <span className="text-danger"> *</span> : null}
              </label>
              {field.type === 'select' || field.type === 'static-select' ? (
                <select
                  id={`company-${field.name}`}
                  className="form-input"
                  value={values[field.name] ?? ''}
                  disabled={busy || (field.options === 'bankBranches' && !values.bankId)}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setValues((current) => ({
                      ...current,
                      [field.name]: nextValue,
                      ...(field.name === 'bankId' ? { bankBranchId: '' } : {}),
                    }));
                    if (validation) setValidation('');
                  }}
                >
                  <option value="">Select {field.label.toLowerCase()}</option>
                  {(field.type === 'static-select'
                    ? field.options
                    : (lookups[field.options] || []).filter((option) => (
                      field.options !== 'bankBranches' || String(option.bankId) === String(values.bankId)
                    )))
                    .map((option, optionIndex) => {
                      const resource = getLookupResource(field.options);
                      const optionValue = field.type === 'static-select'
                        ? option.value
                        : field.name === 'companyTypeId'
                          ? (option.companyTypeCode ?? option.companyTypeId ?? getRecordId(option, resource))
                          : getRecordId(option, resource);
                      const optionLabel = field.type === 'static-select'
                        ? option.label
                        : getLookupLabel(field.options, option);
                      return (
                        <option key={`${field.options}-${String(optionValue)}-${optionIndex}`} value={optionValue}>
                          {optionLabel}
                        </option>
                      );
                    })}
                </select>
              ) : (
                <input
                  id={`company-${field.name}`}
                  type={field.type}
                  className="form-input"
                  value={values[field.name] ?? ''}
                  disabled={busy}
                  onChange={(event) => {
                    setValues({ ...values, [field.name]: event.target.value });
                    if (validation) setValidation('');
                  }}
                />
              )}
            </div>
          ))}
        </div>

        <div className="form-actions">
          <button type="button" className="masters-btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="masters-btn-primary" disabled={busy}>
            {busy ? (record ? 'Updating...' : 'Saving...') : (record ? 'Update' : 'Save')}
          </button>
        </div>
      </form>
    </MasterModal>
  );
}

export function CompanyConfiguration() {
  const [activeKey, setActiveKey] = useState('companyType');
  const [records, setRecords] = useState([]);
  const [lookups, setLookups] = useState({
    companies: [],
    addressTypes: [],
    companyTypes: [],
    banks: [],
    bankBranches: [],
    cities: [],
    districts: [],
    states: [],
    countries: [],
    accountingDetails: [],
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [formRecord, setFormRecord] = useState(null);
  const [saving, setSaving] = useState(false);
  const [openGroups, setOpenGroups] = useState(() => Object.fromEntries(COMPANY_GROUPS.map((group) => [group.label, true])));
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const section = COMPANY_CONFIG[activeKey];
  const SectionIcon = section.icon;

  const loadLookup = async (key, target) => {
    try {
      const response = await companyApis[key].list();
      setLookups((current) => ({ ...current, [target]: unwrap(response) }));
    } catch {
      /* Main screen errors remain visible when a lookup is unavailable. */
    }
  };

  const loadExternalLookup = async (loader, target) => {
    try {
      const response = await loader();
      setLookups((current) => ({ ...current, [target]: unwrap(response) }));
    } catch {
      /* Optional lookups should not block the main screen. */
    }
  };

  const loadRecords = async () => {
    setLoading(true);
    setError('');
    try {
      const params = section.child && lookups.selectedCompanyId ? { companyId: lookups.selectedCompanyId } : undefined;
      setRecords(unwrap(await companyApis[section.apiKey].list(params)));
    } catch (requestError) {
      setError(getCompanyErrorMessage(requestError, `Unable to load ${section.title.toLowerCase()}.`));
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [activeKey, lookups.selectedCompanyId]);

  useEffect(() => {
    loadLookup('company', 'companies');
    loadLookup('addressType', 'addressTypes');
    loadLookup('companyType', 'companyTypes');
    loadLookup('accountingDetail', 'accountingDetails');
    loadExternalLookup(getBanks, 'banks');
    loadExternalLookup(getBankBranches, 'bankBranches');
    loadExternalLookup(getCities, 'cities');
    loadExternalLookup(getDistricts, 'districts');
    loadExternalLookup(getStates, 'states');
    loadExternalLookup(getCountries, 'countries');
  }, []);

  const filteredRecords = useMemo(
    () => records.filter((record) => JSON.stringify(record).toLowerCase().includes(searchTerm.toLowerCase())),
    [records, searchTerm],
  );

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getCellValue = (record, column) => {
    if (column === 'companyName' && !record.companyName && record.companyId !== undefined) {
      const company = lookups.companies.find((item) => String(getRecordId(item, 'company')) === String(record.companyId));
      return company ? getDisplayValue(company, 'companyName') : '-';
    }
    return getDisplayValue(record, column);
  };

  const columns = useMemo(() => section.columns.map((column) => ({
    key: column,
    label: formatColumnLabel(section, column),
    render: (row) => (
      isStatusColumn(section, column)
        ? <MasterStatusBadge status={row[column]} />
        : getCellValue(row, column)
    ),
  })), [section, lookups.companies]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeKey, searchTerm, lookups.selectedCompanyId, pageSize]);

  const handleSubmit = async (payload) => {
    setSaving(true);
    try {
      const id = formRecord && getRecordId(formRecord, section.apiKey);
      const response = id
        ? await companyApis[section.apiKey].update(id, payload)
        : await companyApis[section.apiKey].create(payload);
      toast.success(response?.message || `${section.singular} ${id ? 'updated' : 'created'} successfully.`);
      setFormError('');
      setFormRecord(null);
      await loadRecords();
    } catch (requestError) {
      const message = getCompanyErrorMessage(requestError, `Unable to save ${section.singular.toLowerCase()}.`);
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record) => {
    const id = getRecordId(record, section.apiKey);
    if (!id || !window.confirm(`Delete this ${section.singular.toLowerCase()}? This action cannot be undone.`)) return;
    try {
      const response = await companyApis[section.apiKey].remove(id);
      toast.success(response?.message || `${section.singular} deleted successfully.`);
      await loadRecords();
    } catch (requestError) {
      toast.error(getErrorMessage(requestError, `Unable to delete ${section.singular.toLowerCase()}.`));
    }
  };

  const companyFilterOptions = [
    { value: '', label: 'All companies' },
    ...lookups.companies.map((company) => ({
      value: String(getRecordId(company, 'company')),
      label: getDisplayValue(company, 'companyName'),
    })),
  ];

  return (
    <div className="masters-page company-config-page">
      <header className="masters-page-header">
        <div className="masters-page-header-icon">
          <Building2 size={24} />
        </div>
        <div>
          <h1 className="masters-page-title">Company Configuration</h1>
          <p className="masters-page-description">
            Manage company foundation, finance, communication, and compliance settings.
          </p>
        </div>
      </header>

      <div className="company-config-layout">
        <aside className="company-config-sidebar" aria-label="Company configuration sections">
          {COMPANY_GROUPS.map((group) => {
            const isOpen = openGroups[group.label];
            return (
              <div className="company-nav-group" key={group.label}>
                <button
                  className="company-nav-group-toggle"
                  type="button"
                  onClick={() => setOpenGroups((current) => ({ ...current, [group.label]: !current[group.label] }))}
                  aria-expanded={isOpen}
                >
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span>{group.label}</span>
                </button>
                {isOpen && (
                  <div className="company-nav-group-items">
                    {group.items.map((key) => {
                      const item = COMPANY_CONFIG[key];
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.apiKey}
                          type="button"
                          className={`company-nav-button ${activeKey === item.apiKey ? 'active' : ''}`}
                          onClick={() => {
                            setActiveKey(item.apiKey);
                            setSearchTerm('');
                          }}
                        >
                          <Icon size={16} />
                          <span className="company-nav-label">{item.title}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </aside>

        <section className="company-config-panel">
          <div className="company-panel-heading">
            <div className="company-panel-heading-left">
              <div className="company-panel-icon">
                <SectionIcon size={18} />
              </div>
              <div>
                <h2>{section.title}</h2>
                <p>Create, update, and maintain {section.title.toLowerCase()}.</p>
              </div>
            </div>
          </div>

          <div className="masters-page-toolbar">
            <div className="masters-page-search-area">
              <MasterSearch
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder={`Search ${section.title.toLowerCase()}...`}
              />
            </div>
            <div className="masters-page-actions-area">
              {section.child && (
                <MasterFilter
                  value={lookups.selectedCompanyId || ''}
                  onChange={(value) => setLookups({ ...lookups, selectedCompanyId: value })}
                  options={companyFilterOptions}
                />
              )}
              <button
                type="button"
                className="masters-btn-secondary"
                onClick={loadRecords}
                title="Refresh records"
                disabled={loading}
              >
                <RefreshCw size={18} className={loading ? 'master-spin' : ''} />
              </button>
              <button
                type="button"
                className="masters-btn-primary"
                onClick={() => {
                  setFormError('');
                  setFormRecord(section.child && lookups.selectedCompanyId ? { companyId: lookups.selectedCompanyId } : {});
                }}
              >
                <Plus size={18} />
                <span>Add {section.singular}</span>
              </button>
            </div>
          </div>

          {error && <div className="company-error" role="alert">{error}</div>}

          <div className="masters-page-content">
            {error ? (
              <div className="master-table-state company-error-state">
                <p className="master-table-error">Unable to load {section.title.toLowerCase()}</p>
                <p className="master-table-error-sub">Use Refresh to try again.</p>
              </div>
            ) : (
              <>
                <MasterTable
                  columns={columns}
                  data={paginatedRecords}
                  isLoading={loading}
                  isError={false}
                  onEdit={(row) => {
                    setFormError('');
                    setFormRecord(row);
                  }}
                  onDelete={handleDelete}
                />

                {!loading && filteredRecords.length > 0 && (
                  <MasterPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={filteredRecords.length}
                    pageSize={pageSize}
                    onPageSizeChange={(newSize) => {
                      setPageSize(newSize);
                      setCurrentPage(1);
                    }}
                  />
                )}
              </>
            )}
          </div>
        </section>
      </div>

      {formRecord !== null && (
        <CompanyForm
          section={section}
          record={Object.keys(formRecord).length ? formRecord : null}
          lookups={lookups}
          busy={saving}
          serverError={formError}
          onClose={() => {
            setFormError('');
            setFormRecord(null);
          }}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
