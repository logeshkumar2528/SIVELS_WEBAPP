import { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Target } from 'lucide-react';
import { MasterTable } from '../../../components/masters/MasterTable/MasterTable';
import { MasterSearch } from '../../../components/masters/MasterSearch/MasterSearch';
import { MasterFilter } from '../../../components/masters/MasterFilter/MasterFilter';
import { MasterPagination } from '../../../components/masters/MasterPagination/MasterPagination';
import { MasterStatusBadge } from '../../../components/masters/MasterStatusBadge/MasterStatusBadge';
import { getLoanPurposes } from '../../../api/masters/loanPurposeApi';
import { getLoanProducts } from '../../../api/masters/loanProductApi';
import { LoanPurposeForm } from './LoanPurposeForm';
import { LoanPurposeDeleteConfirm } from './LoanPurposeDeleteConfirm';
import { formatDateTime } from '../../../utils/dateHelper';
import './LoanPurpose.css';


const FILTER_OPTIONS = [
  { value: 'All', label: 'All Status' },
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' }
];

export function LoanPurpose() {
  const [data, setData] = useState([]);
  const [loanProducts, setLoanProducts] = useState({});
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

  const fetchDependencies = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const [purposesResponse, productsResponse] = await Promise.all([
        getLoanPurposes().catch(() => []),
        getLoanProducts().catch(() => [])
      ]);
      
      const records = Array.isArray(purposesResponse) ? purposesResponse : (purposesResponse.data || []);
      const products = Array.isArray(productsResponse) ? productsResponse : (productsResponse.data || []);
      
      const productsMap = {};
      products.forEach(p => {
        productsMap[p.loanProductId] = p.productName;
      });
      
      setLoanProducts(productsMap);
      setData(records);
    } catch (error) {
      console.error('Failed to fetch loan purposes:', error);
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
      displayProductName: item.productName || loanProducts[item.loanProductId] || 'Unknown'
    }));
  }, [data, loanProducts]);

  // Client-side filtering
  const filteredData = useMemo(() => {
    let result = enrichedData;
    
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(item => 
        item.purposeName?.toLowerCase().includes(lowerSearch) ||
        item.purposeCode?.toLowerCase().includes(lowerSearch) ||
        item.displayProductName.toLowerCase().includes(lowerSearch)
      );
    }

    if (filterStatus !== 'All') {
      const targetStatus = filterStatus === 'Active';
      result = result.filter(item => item.isActive === targetStatus);
    }
    
    return result;
  }, [enrichedData, searchTerm, filterStatus]);

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
    if (!row || !row.loanPurposeId) {
      console.error('Invalid record or missing loanPurposeId:', row);
      return;
    }
    setEditingRecord(row);
    setIsFormOpen(true);
  };

  const handleDelete = (row) => {
    if (!row || !row.loanPurposeId) {
      console.error('Invalid record or missing loanPurposeId:', row);
      return;
    }
    setDeletingRecord(row);
    setIsDeleteOpen(true);
  };

  const COLUMNS = [
    { key: 'displayProductName', label: 'Loan Product' },
    { key: 'purposeCode', label: 'Purpose Code' },
    { key: 'purposeName', label: 'Purpose Name' },
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
        <div className="masters-page-header-icon">
            <Target size={24} />
          </div>
          <div>
          <h1 className="masters-page-title">Loan Purposes</h1>
          <p className="masters-page-description">
            Manage loan purpose configuration.
          </p>
        </div>
      </header>

      <div className="masters-page-toolbar">
        <div className="masters-page-search-area">
          <MasterSearch 
            value={searchTerm} 
            onChange={setSearchTerm} 
            placeholder="Search by Purpose Code, Name or Loan Product..."
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
            <Target size={18} />
            <span>Add Loan Purpose</span>
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

      <LoanPurposeForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchDependencies}
        initialData={editingRecord}
      />

      <LoanPurposeDeleteConfirm
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onSuccess={fetchDependencies}
        record={deletingRecord}
      />
    </div>
  );
}
