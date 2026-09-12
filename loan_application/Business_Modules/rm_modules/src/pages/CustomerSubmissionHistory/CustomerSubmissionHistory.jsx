import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Eye,
  Clock,
  RefreshCw,
  CheckCircle2,
  RotateCcw,
  AlertCircle,
  History,
  UserPlus,
  UserCheck,
  ArrowRight,
} from 'lucide-react';
import Pagination from '../../components/Pagination/Pagination';
import Select from '../../components/Select/Select';
import DatePicker from '../../components/DatePicker/DatePicker';
import ViewCustomerDrawer from './ViewCustomerDrawer';
import { rmCustomerService } from '../../services/rmCustomerService';
import { masterService } from '../../../../../Core/src/services/masterService';
import axiosInstance from '../../../../../Core/src/api/axiosInstance';
import { getCurrentRMContext, normalizeApplicationStatus } from '../../utils/rmContext';
import { ROUTES } from '../../config/routeConfig';
import './CustomerSubmissionHistory.css';

const STATUS_OPTIONS = [
  { value: 'All Status', label: 'All Status' },
  { value: 'New', label: 'New' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Under Review', label: 'Under Review' },
  { value: 'Returned', label: 'Returned' },
  { value: 'Logged to HO', label: 'Logged to HO' },
];

export default function CustomerSubmissionHistory() {
  const navigate = useNavigate();

  // RM Identity Resolution
  const rmContext = getCurrentRMContext();
  const currentRmId = rmContext.rmId ? Number(rmContext.rmId) : null;

  // Master Data State
  const [masterData, setMasterData] = useState({
    loanPurposes: [],
    employmentTypes: [],
    documentTypes: [],
    sourcingChannels: [],
    transactionTypes: [],
    interestTypes: [],
    rateOfInterests: [],
  });

  // API Data State
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Promotion In-flight State & Feedback
  const [isPromoting, setIsPromoting] = useState({});
  const [promotionFeedback, setPromotionFeedback] = useState(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [selectedDate, setSelectedDate] = useState('');

  // View Customer Drawer State
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const pageSizeOptions = [5, 10, 15, 20];

  const fetchSubmissions = async () => {
    setLoading(true);
    setError(null);

    const extractArray = (res) => {
      if (Array.isArray(res)) return res;
      if (res && typeof res === 'object') {
        if (Array.isArray(res.data)) return res.data;
        if (Array.isArray(res.items)) return res.items;
        if (Array.isArray(res.result)) return res.result;
        if (Array.isArray(res.list)) return res.list;
        for (const key of Object.keys(res)) {
          if (Array.isArray(res[key])) return res[key];
        }
      }
      return [];
    };

    try {
      const [
        customersRes,
        purpRes,
        empRes,
        docTypesRes,
        sourcingRes,
        txTypesRes,
        intTypesRes,
        roiRes,
      ] = await Promise.all([
        rmCustomerService.getAllCustomers().catch(() => []),
        masterService.getLoanPurposes().catch(() => []),
        masterService.getEmploymentTypes().catch(() => []),
        masterService.getDocumentTypes().catch(() => []),
        axiosInstance.get('/SourcingChannelMaster').then((r) => r.data).catch(() => []),
        axiosInstance.get('/LoanTransactionTypeMaster').then((r) => r.data).catch(() => []),
        axiosInstance.get('/InterestTypeMaster').then((r) => r.data).catch(() => []),
        axiosInstance.get('/RateOfInterestMaster').then((r) => r.data).catch(() => []),
      ]);

      const allCustomers = extractArray(customersRes);
      const loanPurposes = extractArray(purpRes);
      const employmentTypes = extractArray(empRes);
      const documentTypes = extractArray(docTypesRes);
      const sourcingChannels = extractArray(sourcingRes);
      const transactionTypes = extractArray(txTypesRes);
      const interestTypes = extractArray(intTypesRes);
      const rateOfInterests = extractArray(roiRes);

      setMasterData({
        loanPurposes,
        employmentTypes,
        documentTypes,
        sourcingChannels,
        transactionTypes,
        interestTypes,
        rateOfInterests,
      });

      // Filter by current RM identity
      const myCustomers = currentRmId
        ? allCustomers.filter((c) => Number(c.rmId || c.RMId || c.createdBy || c.CreatedBy) === Number(currentRmId))
        : [];

      // Sort DESC by CreatedAt
      myCustomers.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      setSubmissions(
        myCustomers.map((customer) => {
          const lp = loanPurposes.find((p) => Number(p.loanPurposeId || p.id) === Number(customer.loanPurposeId));
          const et = employmentTypes.find((e) => Number(e.employmentTypeId || e.id) === Number(customer.employmentTypeId));

          return {
            ...customer,
            rmCustomerId: customer.rmCustomerId || customer.rMCustomerId || customer.id,
            loanPurposeName: customer.loanPurposeName || lp?.productName || lp?.purposeName || lp?.name || 'N/A',
            employmentTypeName: customer.employmentTypeName || et?.employmentTypeName || et?.name || 'N/A',
            status: normalizeApplicationStatus(customer.status ?? customer.Status, customer.statusName ?? customer.StatusName),
          };
        })
      );
    } catch (err) {
      console.error('Failed to load RM customer submissions:', err);
      setError('Unable to load customer submission history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [currentRmId]);

  const handleContinueToApp = (customer) => {
    navigate(ROUTES.NEW_APPLICATIONS);
  };

  const handlePromoteCustomer = async (customer) => {
    const rmCustId = customer?.rmCustomerId || customer?.rMCustomerId || customer?.id;
    if (!rmCustId) return;

    if (!currentRmId) {
      setPromotionFeedback({
        type: 'error',
        message: 'No active Relationship Manager identity detected in session. Please sign in again.',
      });
      return;
    }

    // Check if customer is already converted
    if (customer.isConverted || customer.IsConverted) {
      navigate(ROUTES.NEW_APPLICATIONS);
      return;
    }

    // Resolve loanProductId dynamically from LoanPurposeMaster
    const matchedPurpose = (masterData.loanPurposes || []).find(
      (p) => Number(p.loanPurposeId || p.id) === Number(customer.loanPurposeId)
    );

    const loanProductId = matchedPurpose?.loanProductId ? Number(matchedPurpose.loanProductId) : null;

    if (!loanProductId) {
      setPromotionFeedback({
        type: 'error',
        message: `Unable to resolve valid Loan Product for the purpose: "${customer.loanPurposeName || 'Selected Purpose'}".`,
      });
      return;
    }

    // Resolve sourcingChannelId dynamically from SourcingChannelMaster (or confirmed master default)
    const sourcingChannelId = masterData.sourcingChannels?.[0]?.sourcingChannelId
      ? Number(masterData.sourcingChannels[0].sourcingChannelId)
      : 1;

    // Resolve loanTransactionTypeId dynamically from LoanTransactionTypeMaster
    const loanTransactionTypeId =
      masterData.transactionTypes?.find(
        (t) => t.transactionTypeCode === 'NL' || String(t.transactionTypeName).toLowerCase().includes('new')
      )?.loanTransactionTypeId ||
      (masterData.transactionTypes?.[0]?.loanTransactionTypeId
        ? Number(masterData.transactionTypes[0].loanTransactionTypeId)
        : 1);

    // Resolve interestTypeId dynamically from InterestTypeMaster
    const interestTypeId =
      masterData.interestTypes?.find(
        (i) => i.interestTypeCode === 'FX' || String(i.interestTypeName).toLowerCase().includes('fixed')
      )?.interestTypeId ||
      (masterData.interestTypes?.[0]?.interestTypeId
        ? Number(masterData.interestTypes[0].interestTypeId)
        : 1);

    // Resolve ROI dynamically from RateOfInterestMaster for this loanProductId
    const matchedRoi = masterData.rateOfInterests?.find(
      (r) => Number(r.loanProductId) === Number(loanProductId) && r.isActive !== false
    );
    const roi =
      matchedRoi?.interestRate !== undefined && matchedRoi?.interestRate !== null
        ? Number(matchedRoi.interestRate)
        : 10;

    const payload = {
      sourcingChannelId: Number(sourcingChannelId),
      loanProductId: Number(loanProductId),
      loanProductVariationId: null,
      loanTransactionTypeId: Number(loanTransactionTypeId),
      loanTenure: 60,
      interestTypeId: Number(interestTypeId),
      roi: Number(roi),
      distanceFromBranch: 5,
      noOfCoApplicants: 0,
      verificationId: 1,
      createdBy: Number(currentRmId),
    };

    setIsPromoting((prev) => ({ ...prev, [rmCustId]: true }));
    setPromotionFeedback(null);

    try {
      const res = await rmCustomerService.promoteRmCustomer(rmCustId, payload);
      const isSuccess =
        res?.status === 'Success' ||
        res?.status === 'AlreadyPromoted' ||
        res?.alreadyPromoted === true ||
        res?.data?.status === 'Success' ||
        res?.data?.status === 'AlreadyPromoted' ||
        res?.data?.alreadyPromoted === true;

      if (isSuccess || res?.agentCustomerId || res?.data?.agentCustomerId) {
        // Re-fetch submissions to update isConverted status on the row
        await fetchSubmissions();
        // Navigate to New Applications
        navigate(ROUTES.NEW_APPLICATIONS);
      } else {
        throw new Error(res?.message || res?.data?.message || 'Promotion response did not indicate success.');
      }
    } catch (err) {
      console.error('Failed to promote RM customer:', err);
      if (err?.response?.status === 404) {
        setPromotionFeedback({
          type: 'error',
          message: 'RM customer promotion endpoint is not deployed on the live backend yet.',
        });
      } else {
        setPromotionFeedback({
          type: 'error',
          message:
            err?.response?.data?.message ||
            err?.message ||
            'Failed to promote customer to application pipeline. Please try again.',
        });
      }
    } finally {
      setIsPromoting((prev) => ({ ...prev, [rmCustId]: false }));
    }
  };

  // Filter Logic
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((item) => {
      const nameMatch = (item.fullName || '').toLowerCase().includes(searchTerm.toLowerCase());
      const mobileMatch = (item.mobileNumber || '').includes(searchTerm);
      const matchesSearch = !searchTerm.trim() || nameMatch || mobileMatch;

      const matchesStatus =
        selectedStatus === 'All Status' || String(item.status ?? '').toLowerCase() === selectedStatus.toLowerCase();

      const itemDate = item.createdAt ? String(item.createdAt).substring(0, 10) : '';
      const matchesDate = !selectedDate || itemDate === selectedDate;

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [submissions, searchTerm, selectedStatus, selectedDate]);

  const totalRecords = filteredSubmissions.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;

  // Paginated Slicing
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSubmissions.slice(start, start + pageSize);
  }, [filteredSubmissions, currentPage, pageSize]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedStatus('All Status');
    setSelectedDate('');
    setCurrentPage(1);
  };

  const handleCreateCustomer = () => {
    navigate(ROUTES.ADD_CUSTOMER);
  };

  const getStatusType = (status) => {
    const s = String(status ?? '').toLowerCase();
    if (s.includes('pending')) return 'pending-rm';
    if (s.includes('review')) return 'under-review';
    if (s.includes('return') || s.includes('reject')) return 'returned-rm';
    if (s.includes('approve') || s.includes('success') || s.includes('logged to ho')) return 'approved-rm';
    if (s.includes('submit')) return 'submitted';
    if (s.includes('draft') || s.includes('new')) return 'new-rm';
    return 'default';
  };

  const renderStatusBadge = (status) => {
    const type = getStatusType(status);
    const displayStatus = status || 'Unknown';

    switch (type) {
      case 'pending-rm':
        return (
          <span className="status-pill status-pill--pending-rm">
            <Clock size={13} /> {displayStatus}
          </span>
        );
      case 'under-review':
        return (
          <span className="status-pill status-pill--under-review">
            <RefreshCw size={13} /> {displayStatus}
          </span>
        );
      case 'submitted':
      case 'new-rm':
        return (
          <span className="status-pill status-pill--submitted">
            <CheckCircle2 size={13} /> {displayStatus}
          </span>
        );
      case 'returned-rm':
        return (
          <span className="status-pill status-pill--returned-rm">
            <RotateCcw size={13} /> {displayStatus}
          </span>
        );
      case 'approved-rm':
        return (
          <span className="status-pill status-pill--approved-rm">
            <CheckCircle2 size={13} /> {displayStatus}
          </span>
        );
      default:
        return <span className="status-pill">{displayStatus}</span>;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || amount === '') return '-';
    const num = Number(amount);
    if (isNaN(num)) return String(amount);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(num);
  };

  return (
    <div className="rm-csh-page">
      {/* Session Identity Notice if RM ID is missing */}
      {!currentRmId && (
        <div className="rm-add-customer-banner rm-add-customer-banner--warning">
          <AlertCircle size={18} />
          <span>No active Relationship Manager identity detected in session. Please sign in again.</span>
        </div>
      )}

      {/* Promotion Feedback Notification */}
      {promotionFeedback && (
        <div className={`rm-add-customer-banner rm-add-customer-banner--${promotionFeedback.type === 'error' ? 'error' : 'success'}`}>
          <AlertCircle size={18} />
          <span>{promotionFeedback.message}</span>
        </div>
      )}

      {/* Main Table Card */}
      <div className="rm-csh-card">
        {/* Filter Bar */}
        <div className="rm-csh-filter-bar">
          <div className="rm-csh-search-box">
            <Search className="rm-csh-search-icon" size={16} />
            <input
              type="text"
              className="rm-csh-search-input"
              placeholder="Search by name or mobile number..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="rm-csh-date-box">
            <DatePicker
              value={selectedDate}
              onChange={(date) => {
                setSelectedDate(date);
                setCurrentPage(1);
              }}
              placeholder="Select Date Range"
            />
          </div>

          <div className="rm-csh-status-box">
            <Select
              name="status"
              value={selectedStatus}
              onChange={(val) => {
                setSelectedStatus(val || 'All Status');
                setCurrentPage(1);
              }}
              options={STATUS_OPTIONS}
              placeholder="All Status"
            />
          </div>

          <button type="button" className="rm-csh-btn-reset" onClick={handleResetFilters}>
            Reset
          </button>

          <button
            type="button"
            className="rm-csh-btn-create"
            onClick={handleCreateCustomer}
          >
            <Plus size={16} strokeWidth={2.2} />
            <span>Add New Customer</span>
          </button>
        </div>

        {/* Data Table Area */}
        {loading ? (
          <div className="rm-csh-loading-state">
            <RefreshCw size={24} className="animate-spin" />
            <span>Loading submission history...</span>
          </div>
        ) : error ? (
          <div className="rm-csh-error-state">
            <AlertCircle size={28} color="#EF4444" />
            <p>{error}</p>
            <button onClick={fetchSubmissions} className="rm-csh-btn-retry">
              Retry
            </button>
          </div>
        ) : submissions.length === 0 ? (
          <div className="rm-csh-empty-state">
            <div className="rm-csh-empty-icon">
              <History size={32} />
            </div>
            <h4 className="rm-csh-empty-title">No RM-created customer submissions found</h4>
            <p className="rm-csh-empty-desc">
              Customers created directly by the Relationship Manager will appear here once submitted.
            </p>
            <button
              type="button"
              className="rm-csh-btn-create"
              onClick={handleCreateCustomer}
            >
              <UserPlus size={16} />
              <span>Create First Customer</span>
            </button>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="rm-csh-empty-state">
            <div className="rm-csh-empty-icon">
              <Search size={32} />
            </div>
            <h4 className="rm-csh-empty-title">No submissions match your current filters</h4>
            <p className="rm-csh-empty-desc">
              Try adjusting your search query, date filter, or status filter.
            </p>
            <button
              type="button"
              className="rm-csh-btn-retry"
              onClick={handleResetFilters}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="rm-csh-table-container">
            <table className="rm-csh-table">
              <thead>
                <tr>
                  <th className="rm-csh-th index-col">S.NO</th>
                  <th className="rm-csh-th">CUSTOMER NAME</th>
                  <th className="rm-csh-th">MOBILE NUMBER</th>
                  <th className="rm-csh-th">LOAN PURPOSE</th>
                  <th className="rm-csh-th">EXPECTED AMOUNT</th>
                  <th className="rm-csh-th">SUBMITTED ON</th>
                  <th className="rm-csh-th">STATUS</th>
                  <th className="rm-csh-th">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item, idx) => {
                  const initial = (item.fullName || 'U').charAt(0).toUpperCase();
                  const avatarClass = initial.match(/[A-M]/i) ? 'avatar--A' : 'avatar--R';
                  const isItemPromoting = Boolean(isPromoting[item.rmCustomerId]);
                  const isItemConverted = Boolean(item.isConverted || item.IsConverted);

                  return (
                    <tr key={item.rmCustomerId || idx} className="rm-csh-tr">
                      <td className="rm-csh-td index-col">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>
                      <td className="rm-csh-td">
                        <div className="history-customer-cell">
                          <div className={`history-avatar ${avatarClass}`}>{initial}</div>
                          <span className="customer-name-text">{item.fullName}</span>
                        </div>
                      </td>
                      <td className="rm-csh-td">{item.mobileNumber}</td>
                      <td className="rm-csh-td">{item.loanPurposeName}</td>
                      <td className="rm-csh-td font-medium">{formatCurrency(item.expectedLoanAmount)}</td>
                      <td className="rm-csh-td">{formatDate(item.createdAt)}</td>
                      <td className="rm-csh-td">{renderStatusBadge(item.status)}</td>
                      <td className="rm-csh-td">
                        <div className="rm-csh-action-group">
                          <button
                            type="button"
                            className="btn-view-details"
                            onClick={() => setSelectedCustomer(item)}
                          >
                            <Eye size={15} strokeWidth={1.8} />
                            <span>View Details</span>
                          </button>
                          {isItemConverted ? (
                            <button
                              type="button"
                              className="btn-continue-app"
                              onClick={() => handleContinueToApp(item)}
                              title="Customer promoted. Open in New Applications"
                            >
                              <ArrowRight size={14} />
                              <span>Continue to Application</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn-promote-app"
                              onClick={() => handlePromoteCustomer(item)}
                              disabled={isItemPromoting}
                              title="Promote this customer to Underwriting Application pipeline"
                            >
                              {isItemPromoting ? (
                                <>
                                  <RefreshCw size={14} className="animate-spin" />
                                  <span>Creating Application...</span>
                                </>
                              ) : (
                                <>
                                  <UserCheck size={14} />
                                  <span>Promote to Application</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Standalone Pagination Component */}
        {!loading && !error && filteredSubmissions.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalRecords={totalRecords}
            pageSize={pageSize}
            pageSizeOptions={pageSizeOptions}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        )}
      </div>

      {/* View Customer Details Side Drawer */}
      {selectedCustomer && (
        <ViewCustomerDrawer
          customer={selectedCustomer}
          masterData={masterData}
          onClose={() => setSelectedCustomer(null)}
          onPromote={handlePromoteCustomer}
          onContinueToApp={handleContinueToApp}
          isPromoting={selectedCustomer ? Boolean(isPromoting[selectedCustomer.rmCustomerId]) : false}
        />
      )}
    </div>
  );
}
