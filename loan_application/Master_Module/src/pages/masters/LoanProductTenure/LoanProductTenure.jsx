import { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Clock } from 'lucide-react';
import { MasterTable } from '../../../components/masters/MasterTable/MasterTable';
import { MasterSearch } from '../../../components/masters/MasterSearch/MasterSearch';
import { MasterFilter } from '../../../components/masters/MasterFilter/MasterFilter';
import { MasterPagination } from '../../../components/masters/MasterPagination/MasterPagination';
import { MasterStatusBadge } from '../../../components/masters/MasterStatusBadge/MasterStatusBadge';
import { getLoanProductTenures } from '../../../api/masters/loanProductTenureApi';
import { getLoanProducts } from '../../../api/masters/loanProductApi';
import { LoanProductTenureForm } from './LoanProductTenureForm';
import { LoanProductTenureDeleteConfirm } from './LoanProductTenureDeleteConfirm';
import { formatDateTime } from '../../../utils/dateHelper';
import './LoanProductTenure.css';

export function LoanProductTenure() {
  const [data, setData] = useState([]);
  const [loanProducts, setLoanProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
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

  const fetchLookups = async () => {
    try {
      const response = await getLoanProducts();
      const records = Array.isArray(response) ? response : (response?.data || response?.value || response?.result || []);
      setLoanProducts(records);
    } catch (err) {
      console.error('Failed to fetch loan products lookup:', err);
    }
  };

  const fetchLoanProductTenures = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const response = await getLoanProductTenures();
      const records = Array.isArray(response) ? response : (response?.data || response?.value || response?.result || []);
      setData(records);
    } catch (error) {
      console.error('Failed to fetch loan product tenures:', error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLookups();
    fetchLoanProductTenures();
  }, []);

  const getProductName = (row) => {
    if (row.loanProductName) return row.loanProductName;
    if (row.productName) return row.productName;
    if (row.ProductName) return row.ProductName;
    const targetId = row.loanProductId ?? row.LoanProductId;
    const found = loanProducts.find(p => (p.loanProductId ?? p.LoanProductId) === targetId);
    return found ? (found.productName || found.ProductName) : (targetId ? ("Product #" + targetId) : '-');
  };

  const COLUMNS = [
    { 
      key: 'loanProductId', 
      label: 'Loan Product',
      render: (row) => getProductName(row)
    },
    { key: 'tenureCode', label: 'Tenure Code' },
    { 
      key: 'tenureValue', 
      label: 'Tenure Value',
      render: (row) => String(row.tenureValue) + " " + (row.tenureUnit || 'Months')
    },
    { 
      key: 'createdAt', 
      label: 'Created Date',
      render: (row) => formatDateTime(row.createdAt)
    },
    { 
      key: 'modifiedAt', 
      label: 'Modified Date',
      render: (row) => formatDateTime(row.modifiedAt)
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

  // Client-side filtering
  const filteredData = useMemo(() => {
    let result = data;
    
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(item => {
        const prodName = getProductName(item).toLowerCase();
        const code = String(item.tenureCode || '').toLowerCase();
        const val = String(item.tenureValue || '').toLowerCase();
        return prodName.includes(lowerSearch) || code.includes(lowerSearch) || val.includes(lowerSearch);
      });
    }

    if (filterStatus !== 'All') {
      const targetStatus = filterStatus === 'Active';
      result = result.filter(item => item.isActive === targetStatus);
    }
    
    return result;
  }, [data, searchTerm, filterStatus, loanProducts]);

  // Client-side pagination
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  const handleAdd = () => {
    setEditingRecord(null);
    setIsFormOpen(true);
  };

  const handleEdit = (row) => {
    const id = row?.loanProductTenureId ?? row?.LoanProductTenureId ?? row?.productTenureId ?? row?.id;
    if (!id) {
      console.error('Invalid record or missing loanProductTenureId:', row);
      return;
    }
    setEditingRecord(row);
    setIsFormOpen(true);
  };

  const handleDelete = (row) => {
    const id = row?.loanProductTenureId ?? row?.LoanProductTenureId ?? row?.productTenureId ?? row?.id;
    if (!id) {
      console.error('Invalid record or missing loanProductTenureId:', row);
      return;
    }
    setDeletingRecord(row);
    setIsDeleteOpen(true);
  };

  return (
    <div className="masters-page">
      <header className="masters-page-header">
        <div className="masters-page-header-icon">
          <Clock size={24} />
        </div>
        <div>
          <h1 className="masters-page-title">Loan Product Tenures</h1>
          <p className="masters-page-description">
            Manage allowable repayment tenure configurations for loan products.
          </p>
        </div>
      </header>

      <div className="masters-page-toolbar">
        <div className="masters-page-search-area">
          <MasterSearch 
            value={searchTerm} 
            onChange={setSearchTerm} 
            placeholder="Search by Loan Product, Tenure Code, or Tenure Value..."
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
            onClick={() => { fetchLookups(); fetchLoanProductTenures(); }}
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
            <Clock size={18} />
            <span>Add Tenure</span>
          </button>
        </div>
      </div>

      <div className="masters-page-content">
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
      </div>

      <LoanProductTenureForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={() => { fetchLookups(); fetchLoanProductTenures(); }}
        initialData={editingRecord}
        loanProducts={loanProducts}
      />

      <LoanProductTenureDeleteConfirm
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onSuccess={fetchLoanProductTenures}
        record={deletingRecord}
      />
    </div>
  );
}
