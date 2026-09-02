import { useState, useMemo, useEffect } from 'react';
import { RefreshCw, Layers } from 'lucide-react';
import { MasterTable } from '../../../components/masters/MasterTable/MasterTable';
import { MasterSearch } from '../../../components/masters/MasterSearch/MasterSearch';
import { MasterFilter } from '../../../components/masters/MasterFilter/MasterFilter';
import { MasterPagination } from '../../../components/masters/MasterPagination/MasterPagination';
import { MasterStatusBadge } from '../../../components/masters/MasterStatusBadge/MasterStatusBadge';
import { LoanProductVariationForm } from './LoanProductVariationForm';
import { LoanProductVariationDeleteConfirm } from './LoanProductVariationDeleteConfirm';
import { getLoanProductVariations } from '../../../api/masters/loanProductVariationApi';
import { getLoanProducts } from '../../../api/masters/loanProductApi';


const formatDisplayDate = (val) => {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d.getTime())) return '—';
  const pad = (n) => n.toString().padStart(2, '0');
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = pad(d.getMinutes());
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${day}/${month}/${year} ${pad(hours)}:${minutes} ${ampm}`;
};

const COLUMNS = [
  { key: 'loanProductName', label: 'Loan Product' },
  { key: 'variationCode', label: 'Variation Code' },
  { key: 'variationName', label: 'Variation Name' },
  { 
    key: 'createdAt', 
    label: 'Created Date',
    render: (row) => formatDisplayDate(row.createdAt)
  },
  { 
    key: 'modifiedAt', 
    label: 'Modified Date',
    render: (row) => formatDisplayDate(row.modifiedAt)
  },
  { 
    key: 'isActive', 
    label: 'Status',
    render: (row) => <MasterStatusBadge status={row.isActive} />
  }
];

const FILTER_OPTIONS = [
  { value: 'All', label: 'All Status' },
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' }
];

export function LoanProductVariation() {
  const [data, setData] = useState([]);
  const [loanProductsDict, setLoanProductsDict] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  // Delete State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState(null);

  const fetchData = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      // Fetch products and variations in parallel
      const [variationsRes, productsRes] = await Promise.all([
        getLoanProductVariations(),
        getLoanProducts()
      ]);

      const prods = Array.isArray(productsRes) ? productsRes : (productsRes?.data || productsRes?.value || []);
      const dict = {};
      prods.forEach(p => {
        dict[p.loanProductId] = `${p.productName} - ${p.loanType}`;
      });
      setLoanProductsDict(dict);

      const variations = Array.isArray(variationsRes) ? variationsRes : (variationsRes?.data || variationsRes?.value || []);
      const enrichedVariations = variations.map(v => ({
        ...v,
        loanProductName: v.loanProductName || dict[v.loanProductId] || ''
      }));
      setData(enrichedVariations);
    } catch (err) {
      console.error('Failed to fetch loan product variations:', err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const isActiveValue = (value) =>
    value === true || value === 1 || value === "1";

  // Client-side filtering
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        item.variationCode?.toLowerCase().includes(searchLower) ||
        item.variationName?.toLowerCase().includes(searchLower) ||
        item.loanProductName?.toLowerCase().includes(searchLower);

      const statusFilterLower = filterStatus.toLowerCase();
      const matchesStatus =
        statusFilterLower === "all"
          ? true
          : statusFilterLower === "active"
          ? isActiveValue(item.isActive)
          : !isActiveValue(item.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [data, searchTerm, filterStatus]);

  // Client-side pagination
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize).map(item => ({
      ...item,
      id: item.loanProductVariationId
    }));
  }, [filteredData, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  const handleAdd = () => {
    setEditingRecord(null);
    setIsFormOpen(true);
  };

  const handleEdit = (row) => {
    if (!row || !row.loanProductVariationId) return;
    setEditingRecord(row);
    setIsFormOpen(true);
  };

  const handleDelete = (row) => {
    if (!row || !row.loanProductVariationId) return;
    setDeletingRecord(row);
    setIsDeleteOpen(true);
  };



  return (
    <div className="masters-page">
      <header className="masters-page-header">
        <div className="masters-page-header-icon">
            <Layers size={24} />
          </div>
          <div>
          <h1 className="masters-page-title">Loan Product Variations</h1>
          <p className="masters-page-description">
            Manage loan product variation configuration.
          </p>
        </div>
      </header>

      <div className="masters-page-toolbar">
        <div className="masters-page-search-area">
          <MasterSearch 
            value={searchTerm} 
            onChange={setSearchTerm} 
            placeholder="Search by Variation Code or Variation Name"
          />
        </div>
        <div className="masters-page-actions-area">
          <MasterFilter
            value={filterStatus}
            onChange={setFilterStatus}
            options={FILTER_OPTIONS}
          />
          <button 
            type="button" 
            className="masters-btn-secondary" 
            onClick={fetchData}
            title="Refresh records"
            disabled={isLoading}
          >
            <RefreshCw size={18} className={isLoading ? 'master-spin' : ''} />
          </button>
          <button 
            type="button" 
            className="masters-btn-primary" 
            onClick={handleAdd}
          >
            <Layers size={18} />
            <span>Add Variation</span>
          </button>
        </div>
      </div>

      <div className="masters-page-content">
        {data.length === 0 && !isLoading ? (
          <div className="empty-state">
            <h3 style={{ marginBottom: '8px' }}>No loan product variations found.</h3>
            <p>Configure variations for your loan products.</p>
          </div>
        ) : (
          <>
            <MasterTable 
              columns={COLUMNS}
              data={paginatedData}
              isLoading={isLoading}
              isError={isError}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
            
            {!isLoading && !isError && filteredData.length > 0 && (
              <MasterPagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredData.length}
            pageSize={pageSize}
            onPageSizeChange={(newSize) => { setPageSize(newSize); setCurrentPage(1); }}
          />
            )}
          </>
        )}
      </div>

      <LoanProductVariationForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchData}
        initialData={editingRecord}
      />

      <LoanProductVariationDeleteConfirm
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onSuccess={fetchData}
        record={deletingRecord}
      />
    </div>
  );
}
