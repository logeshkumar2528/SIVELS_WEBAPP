const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

// 1. Create API
const apiCode = `import axiosInstance from '../axiosInstance';

export const getRateOfInterests = async () => {
  const response = await axiosInstance.get('/RateOfInterestMaster');
  return response.data;
};

export const getRateOfInterestById = async (id) => {
  const response = await axiosInstance.get(\`/RateOfInterestMaster/\${id}\`);
  return response.data;
};

export const createRateOfInterest = async (data) => {
  const response = await axiosInstance.post('/RateOfInterestMaster', data);
  return response.data;
};

export const updateRateOfInterest = async (id, data) => {
  const response = await axiosInstance.put(\`/RateOfInterestMaster/\${id}\`, data);
  return response.data;
};

export const deleteRateOfInterest = async (id) => {
  const response = await axiosInstance.delete(\`/RateOfInterestMaster/\${id}\`);
  return response.data;
};
`;

fs.writeFileSync(path.join(srcDir, 'api', 'masters', 'rateOfInterestApi.js'), apiCode);

// 2. Create Pages
const roiDir = path.join(srcDir, 'pages', 'masters', 'RateOfInterest');
if (!fs.existsSync(roiDir)) fs.mkdirSync(roiDir, { recursive: true });

const listCode = `import { useState, useEffect, useMemo } from 'react';
import { RefreshCw, TrendingUp } from 'lucide-react';
import { MasterTable } from '../../../components/masters/MasterTable/MasterTable';
import { MasterSearch } from '../../../components/masters/MasterSearch/MasterSearch';
import { MasterFilter } from '../../../components/masters/MasterFilter/MasterFilter';
import { MasterPagination } from '../../../components/masters/MasterPagination/MasterPagination';
import { MasterStatusBadge } from '../../../components/masters/MasterStatusBadge/MasterStatusBadge';
import { getRateOfInterests } from '../../../api/masters/rateOfInterestApi';
import { RateOfInterestForm } from './RateOfInterestForm';
import { RateOfInterestDeleteConfirm } from './RateOfInterestDeleteConfirm';
import { formatDateTime } from '../../../utils/dateHelper';

const COLUMNS = [
  { 
    key: 'RateOfInterestCode', 
    label: 'Code',
    sortable: true
  },
  { 
    key: 'RateOfInterestName', 
    label: 'Name',
    sortable: true,
  },
  { 
    key: 'IsActive', 
    label: 'Status',
    render: (item) => <MasterStatusBadge isActive={item.IsActive} />
  },
  { 
    key: 'ModifiedAt', 
    label: 'Last Modified',
    sortable: true,
    render: (item) => formatDateTime(item.ModifiedAt)
  }
];

export function RateOfInterest() {
  const [data, setData] = useState([]);
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

  const fetchRateOfInterests = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const response = await getRateOfInterests();
      setData(response || []);
    } catch (error) {
      console.error('Error fetching rate of interests:', error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRateOfInterests();
  }, []);

  // Client-side filtering
  const filteredData = useMemo(() => {
    let result = data;
    
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(item => 
        (item.RateOfInterestCode?.toLowerCase() || '').includes(lowerSearch) ||
        (item.RateOfInterestName?.toLowerCase() || '').includes(lowerSearch)
      );
    }
    
    if (filterStatus !== 'All') {
      const isActive = filterStatus === 'Active';
      result = result.filter(item => item.IsActive === isActive);
    }
    
    return result;
  }, [data, searchTerm, filterStatus]);

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
    setEditingRecord(record);
    setIsFormOpen(true);
  };

  const handleDelete = (record) => {
    setDeletingRecord(record);
    setIsDeleteOpen(true);
  };

  const handleFormSuccess = () => {
    fetchRateOfInterests();
    setIsFormOpen(false);
  };

  const handleDeleteSuccess = () => {
    fetchRateOfInterests();
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
            placeholder="Search rate of interest..."
          />
          <div className="masters-page-toolbar-actions">
            <MasterFilter 
              value={filterStatus}
              onChange={setFilterStatus}
            />
            <button 
              type="button" 
              className="masters-btn-secondary"
              onClick={fetchRateOfInterests}
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
`;
fs.writeFileSync(path.join(roiDir, 'RateOfInterest.jsx'), listCode);

const formCode = `import { useState, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { MasterStatusCheckbox } from '../../../components/masters/MasterStatusCheckbox/MasterStatusCheckbox';
import { createRateOfInterest, updateRateOfInterest } from '../../../api/masters/rateOfInterestApi';

export function RateOfInterestForm({ isOpen, onClose, onSuccess, editingRecord }) {
  const [formData, setFormData] = useState({
    RateOfInterestCode: '',
    RateOfInterestName: '',
    IsActive: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingRecord) {
      setFormData({
        RateOfInterestCode: editingRecord.RateOfInterestCode || '',
        RateOfInterestName: editingRecord.RateOfInterestName || '',
        IsActive: editingRecord.IsActive ?? true
      });
    } else {
      setFormData({
        RateOfInterestCode: '',
        RateOfInterestName: '',
        IsActive: true
      });
    }
    setError('');
  }, [editingRecord, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.RateOfInterestCode.trim() || !formData.RateOfInterestName.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingRecord) {
        await updateRateOfInterest(editingRecord.RateOfInterestId, formData);
      } else {
        await createRateOfInterest(formData);
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <MasterModal
      isOpen={isOpen}
      onClose={onClose}
      title={editingRecord ? 'Edit Rate Of Interest' : 'Add Rate Of Interest'}
      icon={TrendingUp}
      subtitle={editingRecord ? 'Update rate of interest details' : 'Add a new rate of interest to the system'}
    >
      <form onSubmit={handleSubmit} className="master-form">
        {error && <div className="master-form-error">{error}</div>}
        
        <div className="master-form-group">
          <label htmlFor="RateOfInterestCode" className="master-form-label">
            Rate Of Interest Code <span className="master-form-required">*</span>
          </label>
          <input
            type="text"
            id="RateOfInterestCode"
            name="RateOfInterestCode"
            className="master-form-input"
            value={formData.RateOfInterestCode}
            onChange={handleChange}
            placeholder="Enter code (e.g., ROI01)"
            maxLength={20}
          />
        </div>

        <div className="master-form-group">
          <label htmlFor="RateOfInterestName" className="master-form-label">
            Rate Of Interest Name <span className="master-form-required">*</span>
          </label>
          <input
            type="text"
            id="RateOfInterestName"
            name="RateOfInterestName"
            className="master-form-input"
            value={formData.RateOfInterestName}
            onChange={handleChange}
            placeholder="Enter name (e.g., 10% Fixed)"
            maxLength={100}
          />
        </div>

        <div className="master-form-group">
          <MasterStatusCheckbox 
            checked={formData.IsActive}
            onChange={(checked) => setFormData(prev => ({ ...prev, IsActive: checked }))}
          />
        </div>

        <div className="master-form-actions">
          <button
            type="button"
            className="masters-btn-secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="masters-btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Rate Of Interest'}
          </button>
        </div>
      </form>
    </MasterModal>
  );
}
`;
fs.writeFileSync(path.join(roiDir, 'RateOfInterestForm.jsx'), formCode);

const deleteCode = `import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { MasterModal } from '../../../components/masters/MasterModal/MasterModal';
import { deleteRateOfInterest } from '../../../api/masters/rateOfInterestApi';

export function RateOfInterestDeleteConfirm({ isOpen, onClose, onSuccess, record }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (!record) return;
    
    setIsDeleting(true);
    setError('');
    
    try {
      await deleteRateOfInterest(record.RateOfInterestId);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred while deleting.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <MasterModal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Rate Of Interest"
    >
      <div className="master-delete-confirm">
        <div className="master-delete-icon-wrapper">
          <AlertTriangle size={32} className="master-delete-icon" />
        </div>
        
        <h3 className="master-delete-title">Are you absolutely sure?</h3>
        
        <p className="master-delete-text">
          This action cannot be undone. This will permanently delete the rate of interest 
          <strong className="master-delete-highlight"> {record?.RateOfInterestName} </strong>
          and remove its data from our servers.
        </p>

        {error && <div className="master-form-error">{error}</div>}

        <div className="master-delete-actions">
          <button
            type="button"
            className="masters-btn-secondary"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="masters-btn-danger"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Yes, delete rate of interest'}
          </button>
        </div>
      </div>
    </MasterModal>
  );
}
`;
fs.writeFileSync(path.join(roiDir, 'RateOfInterestDeleteConfirm.jsx'), deleteCode);

// 3. Update Navbar
let navPath = path.join(srcDir, 'components', 'navbar', 'Navbar.jsx');
let navContent = fs.readFileSync(navPath, 'utf8');
if (!navContent.includes('Rate Of Interest')) {
  navContent = navContent.replace('import { \n  ChevronDown, Menu, X, Search, Check, Database,\n  Percent, Type, Users, Network, FileText, UserCog, ToggleRight,\n  CreditCard, Package, Target, Repeat, User, Heart, Building, \n  Map, Building2, Briefcase, Landmark, Globe, MapPin, Link, \n  Layers, ShieldCheck, Home, Key, GraduationCap, Star, Contact, Shield\n} from \'lucide-react\';', 
  'import { \n  ChevronDown, Menu, X, Search, Check, Database,\n  Percent, Type, Users, Network, FileText, UserCog, ToggleRight,\n  CreditCard, Package, Target, Repeat, User, Heart, Building, \n  Map, Building2, Briefcase, Landmark, Globe, MapPin, Link, \n  Layers, ShieldCheck, Home, Key, GraduationCap, Star, Contact, Shield, TrendingUp\n} from \'lucide-react\';');
  
  if (!navContent.includes('TrendingUp')) {
     navContent = navContent.replace(/import {[^}]+} from 'lucide-react';/, (match) => {
         return match.replace('Shield', 'Shield, TrendingUp');
     });
  }

  const newMenuItem = `  { path: 'loan-product-collateral', label: 'Loan Product Collateral', icon: Shield },
  { path: 'rate-of-interest', label: 'Rate Of Interest', icon: TrendingUp },`;
  navContent = navContent.replace(`  { path: 'loan-product-collateral', label: 'Loan Product Collateral', icon: Shield },`, newMenuItem);
  fs.writeFileSync(navPath, navContent);
}

// 4. Update App.jsx
let appPath = path.join(srcDir, 'App.jsx');
let appContent = fs.readFileSync(appPath, 'utf8');
if (!appContent.includes('RateOfInterest')) {
  const importStatement = `import { LoanProductCollateral } from './pages/masters/LoanProductCollateral/LoanProductCollateral';\nimport { RateOfInterest } from './pages/masters/RateOfInterest/RateOfInterest';`;
  appContent = appContent.replace(`import { LoanProductCollateral } from './pages/masters/LoanProductCollateral/LoanProductCollateral';`, importStatement);
  
  const routeStatement = `<Route path="loan-product-collateral" element={<LoanProductCollateral />} />\n            <Route path="rate-of-interest" element={<RateOfInterest />} />`;
  appContent = appContent.replace(`<Route path="loan-product-collateral" element={<LoanProductCollateral />} />`, routeStatement);
  fs.writeFileSync(appPath, appContent);
}

console.log('RateOfInterest master module created successfully!');
