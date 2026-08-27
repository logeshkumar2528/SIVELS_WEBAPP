import { useState, useEffect, useMemo } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { MasterTable } from '../../../components/masters/MasterTable/MasterTable';
import { MasterSearch } from '../../../components/masters/MasterSearch/MasterSearch';
import { MasterFilter } from '../../../components/masters/MasterFilter/MasterFilter';
import { MasterPagination } from '../../../components/masters/MasterPagination/MasterPagination';
import { MasterStatusBadge } from '../../../components/masters/MasterStatusBadge/MasterStatusBadge';
import { getLoanProducts } from '../../../api/masters/loanProductApi';
import { getLoanTypes } from '../../../api/masters/loanTypeApi';
import { LoanProductForm } from './LoanProductForm';
import { LoanProductDeleteConfirm } from './LoanProductDeleteConfirm';
import { formatDateTime } from '../../../utils/dateHelper';
import './LoanProduct.css';

const PAGE_SIZE = 10;

const FILTER_OPTIONS = [
  { value: 'All', label: 'All Status' },
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' }
];

export function LoanProduct() {
  const [data, setData] = useState([]);
  const [loanTypes, setLoanTypes] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  // Delete State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState(null);

  const fetchDependencies = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const [productsResponse, typesResponse] = await Promise.all([
        getLoanProducts().catch(() => []),
        getLoanTypes().catch(() => [])
      ]);
      
      const records = Array.isArray(productsResponse) ? productsResponse : (productsResponse.data || []);
      const types = Array.isArray(typesResponse) ? typesResponse : (typesResponse.data || []);
      
      const typesMap = {};
      types.forEach(t => {
        typesMap[t.loanTypeId] = t.typeName;
      });
      
      setLoanTypes(typesMap);
      setData(records);
    } catch (error) {
      console.error('Failed to fetch loan products:', error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDependencies();
  }, []);

  const enrichedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      displayTypeName: item.typeName || loanTypes[item.loanTypeId] || 'Unknown'
    }));
  }, [data, loanTypes]);

  // Client-side filtering
  const filteredData = useMemo(() => {
    let result = enrichedData;
    
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(item => 
        item.productName?.toLowerCase().includes(lowerSearch) ||
        item.productCode?.toLowerCase().includes(lowerSearch) ||
        item.displayTypeName.toLowerCase().includes(lowerSearch)
      );
    }

    if (filterStatus !== 'All') {
      const targetStatus = filterStatus === 'Active';
      result = result.filter(item => item.isActive === targetStatus);
    }
    
    return result;
  }, [enrichedData, searchTerm, filterStatus]);

  // Client-side pagination
  const totalPages = Math.ceil(filteredData.length / PAGE_SIZE) || 1;
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredData.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredData, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  const handleAdd = () => {
    setEditingRecord(null);
    setIsFormOpen(true);
  };

  const handleEdit = (row) => {
    if (!row || !row.loanProductId) {
      console.error('Invalid record or missing loanProductId:', row);
      return;
    }
    setEditingRecord(row);
    setIsFormOpen(true);
  };

  const handleDelete = (row) => {
    if (!row || !row.loanProductId) {
      console.error('Invalid record or missing loanProductId:', row);
      return;
    }
    setDeletingRecord(row);
    setIsDeleteOpen(true);
  };

  const COLUMNS = [
    { key: 'displayTypeName', label: 'Loan Type' },
    { key: 'productCode', label: 'Product Code' },
    { key: 'productName', label: 'Product Name' },
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

  return (
    <div className="masters-page">
      <header className="masters-page-header">
        <div>
          <h1 className="masters-page-title">Loan Products</h1>
          <p className="masters-page-description">
            Manage loan product configuration.
          </p>
        </div>
      </header>

      <div className="masters-page-toolbar">
        <div className="masters-page-search-area">
          <MasterSearch 
            value={searchTerm} 
            onChange={setSearchTerm} 
            placeholder="Search by Product Code, Name or Loan Type..."
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
            onClick={fetchDependencies}
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
            <Plus size={18} />
            <span>Add Loan Product</span>
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
          />
        )}
      </div>

      <LoanProductForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchDependencies}
        initialData={editingRecord}
      />

      <LoanProductDeleteConfirm
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onSuccess={fetchDependencies}
        record={deletingRecord}
      />
    </div>
  );
}
