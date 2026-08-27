import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { Plus, RefreshCw } from "lucide-react";
import { MasterTable } from "../../../components/masters/MasterTable/MasterTable";
import { MasterSearch } from "../../../components/masters/MasterSearch/MasterSearch";
import { MasterFilter } from "../../../components/masters/MasterFilter/MasterFilter";
import { MasterPagination } from "../../../components/masters/MasterPagination/MasterPagination";
import { MasterStatusBadge } from "../../../components/masters/MasterStatusBadge/MasterStatusBadge";
import { getMaritalStatuses } from "../../../api/masters/maritalStatusApi";
import { MaritalStatusForm } from "./MaritalStatusForm";
import { MaritalStatusDeleteConfirm } from "./MaritalStatusDeleteConfirm";
import { formatDateTime } from "../../../utils/dateHelper";
import "./MaritalStatus.css";

const PAGE_SIZE = 10;

const COLUMNS = [
  { key: "maritalStatusCode", label: "Marital Status Code" },
  { key: "maritalStatusName", label: "Marital Status Name" },
  { 
    key: "createdAt", 
    label: "Created Date",
    render: (row) => formatDateTime(row.createdAt)
  },
  { 
    key: "modifiedAt", 
    label: "Modified Date",
    render: (row) => formatDateTime(row.modifiedAt)
  },
  { 
    key: "isActive", 
    label: "Status",
    render: (row) => <MasterStatusBadge status={row.isActive} />
  }
];

const FILTER_OPTIONS = [
  { value: "All", label: "All Status" },
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" }
];

export function MaritalStatus() {
  const [maritalStatuses, setMaritalStatuses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  // Delete State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState(null);

  const fetchMaritalStatuses = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const response = await getMaritalStatuses();
      const data = Array.isArray(response)
        ? response
        : response?.value ?? response?.data ?? response?.result ?? [];
      setMaritalStatuses(data);
    } catch (error) {
      console.error("Failed to fetch marital statuses:", error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMaritalStatuses();
  }, []);

  const isActiveValue = (value) =>
    value === true ||
    value === 1 ||
    value === "1";

  // Client-side filtering
  const filteredData = useMemo(() => {
    return maritalStatuses.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        item.maritalStatusCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.maritalStatusName?.toLowerCase().includes(searchTerm.toLowerCase());

      const statusFilterLower = filterStatus.toLowerCase();

      const matchesStatus =
        statusFilterLower === "all"
          ? true
          : statusFilterLower === "active"
          ? isActiveValue(item.isActive)
          : !isActiveValue(item.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [maritalStatuses, searchTerm, filterStatus]);

  // Client-side pagination
  const totalPages = Math.ceil(filteredData.length / PAGE_SIZE) || 1;
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredData.slice(startIndex, startIndex + PAGE_SIZE).map(item => ({
      ...item,
      id: item.maritalStatusId // Guarantee MasterTable uses a unique key instead of array index
    }));
  }, [filteredData, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  const handleAdd = () => {
    setEditingRecord(null);
    setIsFormOpen(true);
  };

  const handleEdit = (row) => {
    if (!row || !row.maritalStatusId) {
      console.error("Invalid record or missing maritalStatusId:", row);
      return;
    }
    setEditingRecord(row);
    setIsFormOpen(true);
  };

  const handleDelete = (row) => {
    if (!row || !row.maritalStatusId) {
      console.error("Invalid record or missing maritalStatusId:", row);
      return;
    }
    setDeletingRecord(row);
    setIsDeleteOpen(true);
  };

  return (
    <div className="masters-page">
      <header className="masters-page-header">
        <div>
          <h1 className="masters-page-title">Marital Status</h1>
          <p className="masters-page-description">
            Manage marital status configuration.
          </p>
        </div>
      </header>

      <div className="masters-page-toolbar">
        <div className="masters-page-search-area">
          <MasterSearch 
            value={searchTerm} 
            onChange={setSearchTerm} 
            placeholder="Search by Marital Status Code or Name..."
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
            onClick={fetchMaritalStatuses}
            title="Refresh records"
            disabled={isLoading}
          >
            <RefreshCw size={18} className={isLoading ? "master-spin" : ""} />
          </button>
          <button 
            type="button" 
            className="masters-btn-primary" 
            onClick={handleAdd}
          >
            <Plus size={18} />
            <span>Add Marital Status</span>
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

      <MaritalStatusForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchMaritalStatuses}
        initialData={editingRecord}
      />

      <MaritalStatusDeleteConfirm
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onSuccess={fetchMaritalStatuses}
        record={deletingRecord}
      />
    </div>
  );
}
