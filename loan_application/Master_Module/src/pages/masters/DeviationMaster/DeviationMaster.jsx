import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Plus, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react';
import { MasterTable } from '../../../components/masters/MasterTable/MasterTable';
import { MasterSearch } from '../../../components/masters/MasterSearch/MasterSearch';
import { MasterFilter } from '../../../components/masters/MasterFilter/MasterFilter';
import { MasterPagination } from '../../../components/masters/MasterPagination/MasterPagination';
import { MasterStatusBadge } from '../../../components/masters/MasterStatusBadge/MasterStatusBadge';
import {
  getCIRDeviationMasters,
  getDeviationMasters,
  getNegativeFIDeviationMasters,
} from '../../../api/masters/deviationMasterApi';
import './DeviationMaster.css';
import { DeviationMasterForm } from './DeviationMasterForm';
import { deviationMasterApi } from '../../../api/masters/deviationMasterApi';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';

const read = (row, keys, fallback = '—') => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return fallback;
};

const getId = (row) => read(row, [
  'deviationId', 'DeviationId', 'cirDeviationId', 'CIRDeviationId',
  'negativeFIDeviationId', 'NegativeFIDeviationId', 'id', 'Id',
], null);

const getActive = (row) => {
  const value = read(row, ['isActive', 'IsActive', 'active', 'Active'], true);
  return value === true || value === 1 || value === '1';
};

const getProduct = (row) => read(row, [
  'loanProductName', 'LoanProductName', 'productName', 'ProductName',
  'loanProduct', 'LoanProduct',
], '—');

const getAuthority = (row) => read(row, [
  'approvingAuthority', 'ApprovingAuthority', 'approvalAuthority', 'ApprovalAuthority',
]);

const unwrapProduct = (value) => typeof value === 'object' && value !== null
  ? read(value, ['loanProductName', 'LoanProductName', 'productName', 'ProductName', 'name', 'Name'])
  : value;

const configs = {
  general: {
    title: 'Deviation List',
    description: 'Configure general deviation norms and approving authorities.',
    icon: ShieldCheck,
    load: getDeviationMasters,
    columns: [
      { key: 'loanProduct', label: 'Loan Product', render: (row) => unwrapProduct(getProduct(row)) },
      { key: 'programSection', label: 'Program / Section', render: (row) => read(row, ['programSection', 'ProgramSection', 'program', 'Program', 'section', 'Section']) },
      { key: 'deviationNorms', label: 'Deviation Norms', render: (row) => read(row, ['deviationNorms', 'DeviationNorms', 'deviationNorm', 'DeviationNorm', 'norms', 'Norms']) },
      { key: 'description', label: 'Deviation Description', render: (row) => read(row, ['deviationDescription', 'DeviationDescription', 'description', 'Description']) },
      { key: 'authority', label: 'Approving Authority', render: (row) => getAuthority(row) },
    ],
    searchFields: ['loanProductName', 'LoanProductName', 'programSection', 'ProgramSection', 'deviationNorms', 'DeviationNorms', 'deviationDescription', 'DeviationDescription', 'approvingAuthority', 'ApprovingAuthority'],
  },
  cir: {
    title: 'CIR Deviations',
    description: 'Configure CIR deviation descriptions and approving authorities.',
    icon: Activity,
    load: getCIRDeviationMasters,
    columns: [
      { key: 'description', label: 'CIR Deviation Description', render: (row) => read(row, ['cirDeviationDescription', 'CIRDeviationDescription', 'deviationDescription', 'DeviationDescription', 'description', 'Description']) },
      { key: 'authority', label: 'Approving Authority', render: (row) => getAuthority(row) },
    ],
    searchFields: ['cirDeviationDescription', 'CIRDeviationDescription', 'deviationDescription', 'DeviationDescription', 'approvingAuthority', 'ApprovingAuthority'],
  },
  negativeFi: {
    title: 'Negative FI Deviations',
    description: 'Configure Negative FI categories, reasons, and approving authorities.',
    icon: ShieldAlert,
    load: getNegativeFIDeviationMasters,
    columns: [
      { key: 'category', label: 'Category', render: (row) => read(row, ['category', 'Category', 'negativeFICategory', 'NegativeFICategory']) },
      { key: 'description', label: 'Reason Description', render: (row) => read(row, ['reasonDescription', 'ReasonDescription', 'negativeFIDescription', 'NegativeFIDescription', 'description', 'Description']) },
      { key: 'authority', label: 'Approving Authority', render: (row) => getAuthority(row) },
    ],
    searchFields: ['category', 'Category', 'reasonDescription', 'ReasonDescription', 'negativeFIDescription', 'NegativeFIDescription', 'approvingAuthority', 'ApprovingAuthority'],
  },
};

export function DeviationMaster({ type = 'general' }) {
  const config = configs[type] || configs.general;
  const Icon = config.icon;
  const [records, setRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [deletingRecord, setDeletingRecord] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      setRecords(await config.load());
    } catch (error) {
      console.error(`Failed to fetch ${config.title}:`, error);
      setIsError(true);
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const filteredRecords = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return records.filter((row) => {
      const matchesSearch = !query || config.searchFields.some((field) => String(row?.[field] ?? '').toLowerCase().includes(query));
      const matchesStatus = filterStatus === 'All' || getActive(row) === (filterStatus === 'Active');
      return matchesSearch && matchesStatus;
    });
  }, [config, filterStatus, records, searchTerm]);

  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize), [currentPage, filteredRecords, pageSize]);

  useEffect(() => { setCurrentPage(1); }, [filterStatus, searchTerm, type]);

  const columns = [
    ...config.columns,
    { key: 'status', label: 'Status', render: (row) => <MasterStatusBadge status={getActive(row)} /> },
  ];

  return (
    <div className="masters-page deviation-master-page">
      <header className="masters-page-header">
        <div className="masters-page-header-icon"><Icon size={24} /></div>
        <div>
          <h1 className="masters-page-title">{config.title}</h1>
          <p className="masters-page-description">{config.description}</p>
        </div>
      </header>

      <div className="masters-page-content">
        <div className="masters-page-toolbar">
          <MasterSearch value={searchTerm} onChange={setSearchTerm} placeholder="Search deviation master data..." />
          <div className="masters-page-toolbar-actions">
            <MasterFilter value={filterStatus} onChange={setFilterStatus} />
            <button type="button" className="masters-btn-secondary" onClick={fetchRecords} disabled={isLoading} title="Refresh records">
              <RefreshCw size={18} className={isLoading ? 'master-spin' : ''} />
            </button>
            <button type="button" className="masters-btn-primary" onClick={() => { setEditingRecord(null); setIsFormOpen(true); }}>
              <Plus size={18} /> <span>Add {config.title}</span>
            </button>
          </div>
        </div>

        <MasterTable columns={columns} data={paginatedRecords} isLoading={isLoading} isError={isError}
          onEdit={(row) => { setEditingRecord(row); setIsFormOpen(true); }}
          onDelete={(row) => setDeletingRecord(row)} />

        {!isLoading && !isError && filteredRecords.length > 0 && (
          <MasterPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredRecords.length}
            pageSize={pageSize}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
          />
        )}
      </div>

      <DeviationMasterForm isOpen={isFormOpen} onClose={() => { setIsFormOpen(false); setEditingRecord(null); }} onSuccess={fetchRecords} editingRecord={editingRecord} type={type} />

      <MasterModal isOpen={Boolean(deletingRecord)} onClose={() => !isDeleting && setDeletingRecord(null)} title={`Delete ${config.title}`} icon={<ShieldAlert size={24} />}>
        <div className="deviation-delete-confirm">
          <p>Are you sure you want to delete this master record?</p>
          <div className="form-actions">
            <button type="button" className="masters-btn-secondary" onClick={() => setDeletingRecord(null)} disabled={isDeleting}>Cancel</button>
            <button type="button" className="masters-btn-danger" disabled={isDeleting} onClick={async () => {
              setIsDeleting(true);
              try { await deviationMasterApi[type].remove(getId(deletingRecord)); setDeletingRecord(null); await fetchRecords(); }
              finally { setIsDeleting(false); }
            }}>{isDeleting ? 'Deleting...' : 'Delete'}</button>
          </div>
        </div>
      </MasterModal>
    </div>
  );
}

export const GeneralDeviationMaster = () => <DeviationMaster type="general" />;
export const CIRDeviationMaster = () => <DeviationMaster type="cir" />;
export const NegativeFIDeviationMaster = () => <DeviationMaster type="negativeFi" />;

export default DeviationMaster;
