import { useState, useEffect, useMemo } from 'react';
import { RefreshCw, TrendingUp } from 'lucide-react';
import { MasterTable } from '../../../components/masters/MasterTable/MasterTable';
import { MasterSearch } from '../../../components/masters/MasterSearch/MasterSearch';
import { MasterFilter } from '../../../components/masters/MasterFilter/MasterFilter';
import { MasterPagination } from '../../../components/masters/MasterPagination/MasterPagination';
import { MasterStatusBadge } from '../../../components/masters/MasterStatusBadge/MasterStatusBadge';
import { getRateOfInterests } from '../../../api/masters/rateOfInterestApi';
import { getLoanProducts } from '../../../api/masters/loanProductApi';
import { RateOfInterestForm } from './RateOfInterestForm';
import { RateOfInterestDeleteConfirm } from './RateOfInterestDeleteConfirm';
import { formatDateTime } from '../../../utils/dateHelper';
import './RateOfInterest.css';

const getRateOfInterestId = (record) => record?.rateOfInterestId ?? record?.RateOfInterestId;
const getLoanProductId = (record) => record?.loanProductId ?? record?.LoanProductId;
const getInterestCode = (record) => record?.interestCode ?? record?.InterestCode ?? '';
const getInterestRate = (record) => record?.interestRate ?? record?.InterestRate;
const getEffectiveFrom = (record) => record?.effectiveFrom ?? record?.EffectiveFrom;
const getEffectiveTo = (record) => record?.effectiveTo ?? record?.EffectiveTo;
const getIsActive = (record) => record?.isActive ?? record?.IsActive;
const getLoanProductName = (record) =>
  record?.loanProductName ?? record?.ProductName ?? record?.productName ?? record?.LoanProductName ?? '';

export function RateOfInterest() {
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

  const fetchInitialData = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const [roiData, productsData] = await Promise.all([
        getRateOfInterests(),
        getLoanProducts().catch(() => []) // Fallback if products fail
      ]);
      setData(roiData || []);
      setLoanProducts(productsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Map loan product IDs to Names
  const productMap = useMemo(() => {
    const map = {};
    loanProducts.forEach(p => {
      const loanProductId = getLoanProductId(p);
      if (loanProductId == null) return;
      map[loanProductId] = getLoanProductName(p) || `Product ${loanProductId}`;
    });
    return map;
  }, [loanProducts]);

  const COLUMNS = useMemo(() => [
    { 
      key: 'loanProductId', 
      label: 'Loan Product',
      sortable: true,
      render: (item) => productMap[getLoanProductId(item)] || getLoanProductName(item) || getLoanProductId(item) || 'N/A'
    },
    { 
      key: 'interestCode', 
      label: 'Code',
      sortable: true
    },
    { 
      key: 'interestRate', 
      label: 'Rate (%)',
      sortable: true,
      render: (item) => getInterestRate(item) != null ? `${Number(getInterestRate(item)).toFixed(2)}%` : 'N/A'
    },
    { 
      key: 'effectiveFrom', 
      label: 'Valid From',
      render: (item) => item.effectiveFrom || item.EffectiveFrom ? formatDateTime(getEffectiveFrom(item)) : 'N/A'
    },
    { 
      key: 'effectiveTo', 
      label: 'Valid To',
      render: (item) => item.effectiveTo || item.EffectiveTo ? formatDateTime(getEffectiveTo(item)) : 'N/A'
    },
    { 
      key: 'isActive', 
      label: 'Status',
      render: (item) => <MasterStatusBadge status={getIsActive(item)} />
    }
  ], [productMap]);

  // Client-side filtering
  const filteredData = useMemo(() => {
    let result = data;
    
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(item => {
        const loanProductId = getLoanProductId(item);
        const prodName = (productMap[loanProductId] || getLoanProductName(item) || '').toLowerCase();
        return (getInterestCode(item).toLowerCase() || '').includes(lowerSearch) ||
               (getInterestRate(item)?.toString() || '').includes(lowerSearch) ||
               prodName.includes(lowerSearch);
      });
    }

    if (filterStatus !== 'All') {
      const isActive = filterStatus === 'Active';
      result = result.filter(item => {
        const itemActive = getIsActive(item) === true || getIsActive(item) === 1 || getIsActive(item) === '1';
        return itemActive === isActive;
      });
    }
    
    return result;
  }, [data, searchTerm, filterStatus, productMap]);

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

  const handleEdit = (record) => {
    if (!record || getRateOfInterestId(record) == null) {
      console.error('Invalid record or missing rateOfInterestId:', record);
      return;
    }
    setEditingRecord(record);
    setIsFormOpen(true);
  };

  const handleDelete = (record) => {
    if (!record || getRateOfInterestId(record) == null) {
      console.error('Invalid record or missing rateOfInterestId:', record);
      return;
    }
    setDeletingRecord(record);
    setIsDeleteOpen(true);
  };

  const handleFormSuccess = () => {
    fetchInitialData();
    setIsFormOpen(false);
  };

  const handleDeleteSuccess = () => {
    fetchInitialData();
    setIsDeleteOpen(false);
  };

  return (
    <div className="masters-page">
      <header className="masters-page-header">
        <div className="masters-page-header-icon">
          <TrendingUp size={24} />
        </div>
        <div>
          <h1 className="masters-page-title">Rate Of Interest Master</h1>
          <p className="masters-page-description">
            Manage rate of interest configuration.
          </p>
        </div>
      </header>

      <div className="masters-page-content">
        <div className="masters-page-toolbar">
          <MasterSearch 
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search rates, codes, or products..."
          />
          <div className="masters-page-toolbar-actions">
            <MasterFilter 
              value={filterStatus}
              onChange={setFilterStatus}
            />
            <button 
              type="button" 
              className="masters-btn-secondary"
              onClick={fetchInitialData}
              title="Refresh Data"
            >
              <RefreshCw size={18} />
            </button>
            <button 
              type="button" 
              className="masters-btn-primary" 
              onClick={handleAdd}
            >
              <TrendingUp size={18} />
              <span>Add Rate Of Interest</span>
            </button>
          </div>
        </div>

        <div className="masters-page-table-container">
          {isLoading && (
            <div className="master-table-state">
              <div className="master-table-loader"></div>
              <p>Loading rate of interests...</p>
            </div>
          )}

          {isError && (
            <div className="master-table-state">
              <p className="master-table-error">Failed to load rate of interest data.</p>
            </div>
          )}

          {!isLoading && !isError && filteredData.length === 0 ? (
            <div className="master-table-state">
              <p className="master-table-empty">No rate of interest records found.</p>
            </div>
          ) : (
            <MasterTable 
              columns={COLUMNS}
              data={paginatedData}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
          
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
      </div>

      <RateOfInterestForm 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={handleFormSuccess}
        editingRecord={editingRecord}
        loanProducts={loanProducts}
      />

      <RateOfInterestDeleteConfirm 
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onSuccess={handleDeleteSuccess}
        record={deletingRecord}
      />
    </div>
  );
}
