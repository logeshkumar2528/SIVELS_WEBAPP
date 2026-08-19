import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import iconMap from '../../config/iconMap';
import DataTable from '../../components/DataTable/DataTable';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Button from '../../components/Button/Button';
import Pagination from '../../components/Pagination/Pagination';
import { ROUTES } from '../../config/routeConfig';
import { useApplicationDraftStore } from '../../state/ApplicationDraftContext';

export default function SubmissionHistory() {
  const navigate = useNavigate();
  const { applications } = useApplicationDraftStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const SearchIcon = iconMap['Search'];

  const filteredData = useMemo(() => {
    return Object.values(applications).filter((app) => {
      // Only show applications that have been submitted
      if (app.status !== 'Ready for Review') {
        return false;
      }
      
      const searchLower = searchTerm.toLowerCase();
      const applicant = app.registration?.personalInformation?.applicant;
      const computedName = applicant ? `${applicant.firstName || ''} ${applicant.lastName || ''}`.trim() : '';
      const customerName = (app.customerName || computedName || 'Unknown').toLowerCase();
      const id = (app.id || '').toLowerCase();
      const mobile = app.mobile || app.mobileNo || applicant?.mobileNo || '';
      
      return customerName.includes(searchLower) ||
             id.includes(searchLower) ||
             mobile.includes(searchLower);
    }).sort((a, b) => {
      return new Date(b.createdDate || Date.now()) - new Date(a.createdDate || Date.now());
    });
  }, [applications, searchTerm]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize).map((row, index) => ({
      ...row,
      sno: start + index + 1
    }));
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;

  const columns = [
    { key: 'sno', label: 'S.NO' },
    { key: 'id', label: 'APP ID' },
    { 
      key: 'customerName', 
      label: 'CUSTOMER NAME',
      render: (row) => {
        const applicant = row.registration?.personalInformation?.applicant;
        const computedName = applicant ? `${applicant.firstName || ''} ${applicant.lastName || ''}`.trim() : '';
        return row.customerName || computedName || 'Unknown';
      }
    },
    { 
      key: 'mobile', 
      label: 'MOBILE',
      render: (row) => row.mobile || row.mobileNo || row.registration?.personalInformation?.applicant?.mobileNo || 'N/A'
    },
    { key: 'loanType', label: 'LOAN PURPOSE' },
    { key: 'amount', label: 'AMOUNT' },
    { key: 'agentName', label: 'FIELD AGENT' },
    { 
      key: 'status',
      label: 'STATUS',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'action',
      label: 'ACTIONS',
      render: (row) => (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => navigate(ROUTES.APPLICATION_PDF_VIEW.replace(':applicationId', row.id))}
        >
          View Form
        </Button>
      ),
    },
  ];

  return (
    <div className="listing-page-wrapper">
      <div className="panel listing-card-full">
        <div className="filter-bar">
          <div className="search-box">
            {SearchIcon && <SearchIcon size={16} className="search-icon" />}
            <input
              type="text"
              className="form-input"
              placeholder="Search by ID, Customer or Mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="listing-table-flex">
          {filteredData.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              <p>No submitted applications found.</p>
              <p style={{ fontSize: '14px', marginTop: '8px' }}>Applications that have completed all 12 steps and are submitted will appear here.</p>
            </div>
          ) : (
            <>
              <DataTable columns={columns} data={paginatedData} rowKeyField="id" />
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalRecords={filteredData.length}
                pageSize={pageSize}
                onPageChange={(p) => setCurrentPage(p)}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
