import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import iconMap from '../../config/iconMap';
import DataTable from '../../components/DataTable/DataTable';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import SectionHeader from '../../components/SectionHeader/SectionHeader';
import Button from '../../components/Button/Button';
import Pagination from '../../components/Pagination/Pagination';
import Breadcrumb from '../../components/Breadcrumb/Breadcrumb';
import Select from '../../components/Select/Select';
import { ROUTES } from '../../config/routeConfig';
import { allNewApplications } from './newApplicationsData';
import { useApplicationDraftStore } from '../../state/ApplicationDraftContext';
import './NewApplications.css';

export default function NewApplications({ initialFilter = 'All' }) {
  const navigate = useNavigate();
  const { createApplicationDraft } = useApplicationDraftStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialFilter);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const SearchIcon = iconMap['Search'];
  const FilterIcon = iconMap['Filter'];
  const PlusIcon = iconMap['FilePlus'];

  useEffect(() => {
    setStatusFilter(initialFilter);
    setCurrentPage(1);
    setSearchTerm('');
  }, [initialFilter]);

  const filteredData = useMemo(() => {
    return allNewApplications.filter((app) => {
      const matchesSearch =
        app.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.mobile.includes(searchTerm);
      const matchesStatus = statusFilter === 'All' || app.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter]);

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
    { key: 'customerName', label: 'CUSTOMER NAME' },
    { key: 'mobile', label: 'MOBILE' },
    { key: 'loanType', label: 'LOAN PURPOSE' },
    { key: 'amount', label: 'AMOUNT' },
    { key: 'agentName', label: 'FIELD AGENT' },
    { key: 'createdDate', label: 'DATE' },
    {
      key: 'status',
      label: 'STATUS',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'action',
      label: 'ACTIONS',
      render: (row) => {
        let btnText = 'Verify Now';
        if (row.status === 'Approved') btnText = 'View Details';
        if (row.status === 'Returned') btnText = 'Review Return';

        return (
          <Button
            size="sm"
            variant="primary"
            onClick={() => navigate(ROUTES.APPLICATION_DETAILS.replace(':applicationId', row.id))}
          >
            {btnText}
          </Button>
        );
      },
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

          <div className="flex-align-center gap-3">
            {FilterIcon && <FilterIcon size={16} className="text-muted" />}
            <div style={{ width: '180px' }}>
              <Select
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                options={[
                  {value: "All", label: "All Statuses"},
                  {value: "New", label: "New"},
                  {value: "Pending", label: "Pending"},
                  {value: "Under Review", label: "Under Review"},
                  {value: "Approved", label: "Approved"},
                  {value: "Returned", label: "Returned"}
                ]}
                placeholder={null}
              />
            </div>
          </div>
        </div>

        <div className="listing-table-flex">
          <DataTable columns={columns} data={paginatedData} rowKeyField="id" />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalRecords={filteredData.length}
            pageSize={pageSize}
            onPageChange={(p) => setCurrentPage(p)}
          />
        </div>
      </div>
    </div>
  );
}
