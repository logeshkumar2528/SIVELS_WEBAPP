import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { RefreshCw, FileCheck } from 'lucide-react';
import { MasterTable } from '../../../components/masters/MasterTable/MasterTable';
import { MasterSearch } from '../../../components/masters/MasterSearch/MasterSearch';
import { MasterFilter } from '../../../components/masters/MasterFilter/MasterFilter';
import { MasterPagination } from '../../../components/masters/MasterPagination/MasterPagination';
import { MasterStatusBadge } from '../../../components/masters/MasterStatusBadge/MasterStatusBadge';
import { getProofMasters } from '../../../api/masters/proofMasterApi';
import { getDocumentTypes } from '../../../api/masters/documentTypeApi';
import { ProofMasterForm } from './ProofMasterForm';
import { ProofMasterDeleteConfirm } from './ProofMasterDeleteConfirm';
import './ProofMaster.css';

const FILTER_OPTIONS = [
  { value: 'All', label: 'All Status' },
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
];

export function ProofMaster() {
  const [proofs, setProofs] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
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
  const hasFetchedRef = useRef(false);

  const fetchData = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const [proofsResponse, docTypesResponse] = await Promise.allSettled([
        getProofMasters(),
        getDocumentTypes(),
      ]);

      if (proofsResponse.status === 'fulfilled') {
        const raw = proofsResponse.value;
        const records = Array.isArray(raw)
          ? raw
          : raw?.data || raw?.value || raw?.items || [];
        setProofs(records);
      } else {
        console.error('Failed to fetch proof masters:', proofsResponse.reason);
        setIsError(true);
      }

      if (docTypesResponse.status === 'fulfilled') {
        const rawDoc = docTypesResponse.value;
        const docRecords = Array.isArray(rawDoc)
          ? rawDoc
          : rawDoc?.data || rawDoc?.value || rawDoc?.items || [];
        setDocumentTypes(docRecords);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchData();
  }, []);

  const documentTypeMap = useMemo(() => {
    const map = new Map();
    documentTypes.forEach((doc) => {
      const id = Number(doc.documentTypeId || doc.id);
      if (id) {
        map.set(id, doc.documentTypeName || doc.documentTypeCode || String(id));
      }
    });
    return map;
  }, [documentTypes]);

  const getDocumentTypeName = useCallback(
    (documentTypeId) => {
      const numId = Number(documentTypeId);
      return documentTypeMap.get(numId) || (documentTypeId ? `Document Type #${documentTypeId}` : '—');
    },
    [documentTypeMap]
  );

  const COLUMNS = useMemo(
    () => [
      { key: 'proofCode', label: 'Proof Code' },
      { key: 'proofName', label: 'Proof Name' },
      {
        key: 'documentTypeId',
        label: 'Document Type',
        render: (row) => getDocumentTypeName(row.documentTypeId),
      },
      {
        key: 'isActive',
        label: 'Status',
        render: (row) => <MasterStatusBadge status={row.isActive} />,
      },
    ],
    [getDocumentTypeName]
  );

  // Client-side filtering: Search -> Status Filter -> Pagination
  const filteredData = useMemo(() => {
    let result = proofs;

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter((item) => {
        const pName = item.proofName?.toLowerCase() || '';
        const pCode = item.proofCode?.toLowerCase() || '';
        const docName = getDocumentTypeName(item.documentTypeId).toLowerCase();
        return (
          pName.includes(lowerSearch) ||
          pCode.includes(lowerSearch) ||
          docName.includes(lowerSearch)
        );
      });
    }

    if (filterStatus !== 'All') {
      const targetStatus = filterStatus === 'Active';
      result = result.filter((item) => item.isActive === targetStatus);
    }

    return result;
  }, [proofs, searchTerm, filterStatus, getDocumentTypeName]);

  // Client-side pagination
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // Reset to first page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  const handleAdd = () => {
    setEditingRecord(null);
    setIsFormOpen(true);
  };

  const handleEdit = (row) => {
    if (!row || !row.proofId) {
      console.error('Invalid record or missing proofId:', row);
      return;
    }
    setEditingRecord(row);
    setIsFormOpen(true);
  };

  const handleDelete = (row) => {
    if (!row || !row.proofId) {
      console.error('Invalid record or missing proofId:', row);
      return;
    }
    setDeletingRecord(row);
    setIsDeleteOpen(true);
  };

  return (
    <div className="masters-page">
      <header className="masters-page-header">
        <div className="masters-page-header-icon">
          <FileCheck size={24} />
        </div>
        <div>
          <h1 className="masters-page-title">Proof Master</h1>
          <p className="masters-page-description">
            Manage document proof definitions and requirements.
          </p>
        </div>
      </header>

      <div className="masters-page-toolbar">
        <div className="masters-page-search-area">
          <MasterSearch
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by proof code, name, or document type..."
          />
        </div>
        <div className="masters-page-actions-area">
          <MasterFilter
            options={FILTER_OPTIONS}
            value={filterStatus}
            onChange={setFilterStatus}
          />
          <button
            type="button"
            className="masters-btn-secondary"
            onClick={fetchData}
            title="Refresh list"
          >
            <RefreshCw size={16} className={isLoading ? 'master-spin' : ''} />
          </button>
          <button
            type="button"
            className="masters-btn-primary"
            onClick={handleAdd}
          >
            Add Proof
          </button>
        </div>
      </div>

      <MasterTable
        columns={COLUMNS}
        data={paginatedData}
        isLoading={isLoading}
        isError={isError}
        onEdit={handleEdit}
        onDelete={handleDelete}
        emptyMessage="No proofs found."
      />

      <MasterPagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalRecords={filteredData.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

      <ProofMasterForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchData}
        initialData={editingRecord}
      />

      <ProofMasterDeleteConfirm
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onSuccess={fetchData}
        record={deletingRecord}
      />
    </div>
  );
}
