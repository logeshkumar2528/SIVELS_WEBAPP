import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Edit2,
  Trash2,
} from 'lucide-react';
import Pagination from '../../components/Pagination/Pagination';
import Select from '../../components/Select/Select';
import DatePicker from '../../components/DatePicker/DatePicker';
import ViewCustomerDrawer from './ViewCustomerDrawer';
import { rmCustomerService } from '../../services/rmCustomerService';
import { masterService } from '../../../../../Core/src/services/masterService';
import axiosInstance from '../../../../../Core/src/api/axiosInstance';
import { getCurrentRMContext, normalizeApplicationStatus } from '../../utils/rmContext';
import { resolveApplicationOwnership } from '../../utils/ownershipHelper';
import { resolveVerificationIdByCodeOrName } from '../../../../../Core/src/utils/verificationHelper';
import { matchesListingDateCriteria } from '../../utils/dateHelper';
import { ROUTES } from '../../config/routeConfig';
import { Can } from '../../../../../Core/src/auth/permissions';
import {
  resolveDocumentTypeId,
  selectLatestCustomerPhotoDoc,
} from '../../../../../Core/src/utils/documentTypeHelper';
import './CustomerSubmissionHistory.css';

const STATUS_OPTIONS = [
  { value: 'All Status', label: 'All Status' },
  { value: 'New', label: 'New' },
  { value: 'Pending', label: 'RM Pending' },
  { value: 'Under Review', label: 'CM Pending' },
  { value: 'Returned', label: 'BO Returned' },
  { value: 'Logged to HO', label: 'Logged to HO' },
];

/**
 * Correlates a customer record with their corresponding ApplicationProductDetails record.
 * Checks existing application identifiers, active flags, and RM relationship fields.
 * If multiple records share the same customer identifier:
 * - Prioritizes exact applicationProductDetailsId if present on the customer
 * - Filters for active records (isActive !== false)
 * - Checks RM ownership (rmId === currentRmId)
 * - Checks consensus if all candidate records point to the exact same LoanProductId
 * - If matching remains ambiguous with conflicting LoanProductIds, reports the ambiguity and returns null
 */
function correlateCustomerWithApplicationProduct(customer, allAppProducts = [], currentRmId = null) {
  if (!customer || !Array.isArray(allAppProducts) || allAppProducts.length === 0) {
    return null;
  }

  const customerAgentId = Number(customer.agentCustomerId ?? customer.AgentCustomerId ?? 0);
  const customerRmId = Number(customer.rmCustomerId ?? customer.rMCustomerId ?? customer.id ?? 0);
  const customerAppProdId = Number(customer.applicationProductDetailsId ?? customer.ApplicationProductDetailsId ?? 0);
  const targetRmId = Number(currentRmId || customer.rmId || customer.RmId || customer.createdBy || customer.CreatedBy || 0);

  // Establish eligible candidates strictly upfront before any early return
  const eligibleCandidates = allAppProducts.filter((p) => {
    if (!p) return false;

    // 1. Exclude explicitly inactive application records
    if (p.isActive === false || p.IsActive === false) {
      return false;
    }

    // 2. Separate customer/product ID namespace matching
    const pAppProdId = Number(p.applicationProductDetailsId ?? p.ApplicationProductDetailsId ?? 0);
    const pAgentCustId = Number(p.agentCustomerId ?? p.AgentCustomerId ?? 0);
    const pRmCustId = Number(p.rmCustomerId ?? p.RmCustomerId ?? p.RMCustomerId ?? 0);

    const isExactAppProdMatch = customerAppProdId > 0 && pAppProdId > 0 && pAppProdId === customerAppProdId;
    const isAgentCustomerMatch = customerAgentId > 0 && pAgentCustId > 0 && pAgentCustId === customerAgentId;
    const isRmCustomerMatch = customerRmId > 0 && pRmCustId > 0 && pRmCustId === customerRmId;

    if (!isExactAppProdMatch && !isAgentCustomerMatch && !isRmCustomerMatch) {
      return false;
    }

    // 3. Exclude Agent-owned applications
    const pAgentId = Number(p.agentId ?? p.AgentId ?? 0);
    if (pAgentId > 0) {
      return false;
    }

    // 4. Enforce confirmed RM ownership when ownership information is available.
    // Do not treat missing ownership metadata as evidence of ownership.
    if (targetRmId > 0) {
      const pRmId = Number(p.rmId ?? p.RmId ?? 0);
      const pCreatedBy = Number(p.createdBy ?? p.CreatedBy ?? 0);

      const isConfirmedRmOwned = pRmId === targetRmId || (pRmId === 0 && pCreatedBy === targetRmId);
      if (!isConfirmedRmOwned) {
        return false;
      }
    }

    return true;
  });

  // If no eligible application record remains, fall back safely
  if (eligibleCandidates.length === 0) {
    return null;
  }

  // Exactly one confirmed, active, RM-owned application record
  if (eligibleCandidates.length === 1) {
    return eligibleCandidates[0];
  }

  // --- MULTIPLE ELIGIBLE CANDIDATES HANDLING ---

  // Priority A: Exact primary key match if customer carries applicationProductDetailsId
  if (customerAppProdId > 0) {
    const exactMatches = eligibleCandidates.filter((p) => {
      const pAppProdId = Number(p.applicationProductDetailsId ?? p.ApplicationProductDetailsId ?? 0);
      return pAppProdId === customerAppProdId;
    });
    if (exactMatches.length === 1) {
      return exactMatches[0];
    }
  }

  // Priority B: Product consensus across all eligible candidates
  const distinctProductIds = Array.from(
    new Set(
      eligibleCandidates
        .map((p) => Number(p.loanProductId ?? p.LoanProductId ?? 0))
        .filter((id) => id > 0)
    )
  );

  if (distinctProductIds.length === 1) {
    return eligibleCandidates[0];
  }

  // Priority C: Ambiguity with conflicting LoanProductIds - do NOT select arbitrarily
  console.warn(
    `[CustomerSubmissionHistory] Ambiguous ApplicationProductDetails for customer "${customer.fullName || ''}" (ID: ${customerAgentId || customerRmId}): ` +
    `Found ${eligibleCandidates.length} eligible application records with conflicting LoanProductIds: [${distinctProductIds.join(', ')}]. ` +
    `Preserving initial customer intake product to avoid arbitrary selection.`,
    { customer, candidates: eligibleCandidates }
  );
  return null;
}

export default function CustomerSubmissionHistory() {
  const navigate = useNavigate();

  // RM Identity Resolution
  const rmContext = getCurrentRMContext();
  const currentRmId = rmContext.rmId ? Number(rmContext.rmId) : null;

  // Master Data State
  const [masterData, setMasterData] = useState({
    loanPurposes: [],
    loanProducts: [],
    employmentTypes: [],
    documentTypes: [],
    sourcingChannels: [],
    transactionTypes: [],
    interestTypes: [],
    rateOfInterests: [],
    verifications: [],
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
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // View Customer Drawer State
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Photo Resolution and Caching States
  const [photoDocTypeId, setPhotoDocTypeId] = useState(null);
  const [customerPhotos, setCustomerPhotos] = useState({});
  const photoUrlsRef = useRef({});
  const inFlightCustIdsRef = useRef(new Set());

  // Delete Customer Modal State
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const handleEditCustomer = (customer) => {
    const custId = customer.rmCustomerId || customer.rMCustomerId || customer.id;
    if (!custId) return;
    navigate(`${ROUTES.ADD_CUSTOMER}?id=${custId}&mode=edit`, {
      state: { customerId: custId, mode: 'edit' },
    });
  };

  const handleOpenDeleteModal = (customer) => {
    setCustomerToDelete(customer);
    setDeleteError(null);
  };

  const handleCloseDeleteModal = () => {
    if (!isDeleting) {
      setCustomerToDelete(null);
      setDeleteError(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!customerToDelete || isDeleting) return;
    const custId = customerToDelete.rmCustomerId || customerToDelete.rMCustomerId || customerToDelete.id;
    if (!custId) return;

    setIsDeleting(true);
    setDeleteError(null);
    try {
      await rmCustomerService.deleteCustomer(custId);
      setCustomerToDelete(null);
      await fetchSubmissions();
    } catch (err) {
      console.error('Failed to delete customer', err);
      const errMsg =
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        err?.message ||
        'Failed to delete customer. Please try again.';
      setDeleteError(errMsg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const pageSizeOptions = [5, 8, 10, 15, 20];

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
        productsRes,
        loanTypesRes,
        empRes,
        docTypesRes,
        sourcingRes,
        txTypesRes,
        intTypesRes,
        roiRes,
        verificationsRes,
        appProdRes,
      ] = await Promise.all([
        rmCustomerService.getAllCustomers().catch(() => []),
        masterService.getLoanPurposes().catch(() => []),
        masterService.getLoanProducts().catch(() => []),
        masterService.getLoanTypes().catch(() => []),
        masterService.getEmploymentTypes().catch(() => []),
        masterService.getDocumentTypes().catch(() => []),
        axiosInstance.get('/SourcingChannelMaster').then((r) => r.data).catch(() => []),
        axiosInstance.get('/LoanTransactionTypeMaster').then((r) => r.data).catch(() => []),
        axiosInstance.get('/InterestTypeMaster').then((r) => r.data).catch(() => []),
        axiosInstance.get('/RateOfInterestMaster').then((r) => r.data).catch(() => []),
        axiosInstance.get('/VerificationMaster').then((r) => r.data).catch(() => []),
        axiosInstance.get('/ApplicationProductDetails/my').then((r) => r.data).catch(() => []),
      ]);

      const allCustomers = extractArray(customersRes);
      const loanPurposes = extractArray(purpRes);
      const loanProducts = extractArray(productsRes);
      const loanTypes = extractArray(loanTypesRes);
      const employmentTypes = extractArray(empRes);
      const documentTypes = extractArray(docTypesRes);
      const sourcingChannels = extractArray(sourcingRes);
      const transactionTypes = extractArray(txTypesRes);
      const interestTypes = extractArray(intTypesRes);
      const rateOfInterests = extractArray(roiRes);
      const verifications = extractArray(verificationsRes);
      const allApplicationProducts = extractArray(appProdRes);

      setMasterData({
        loanPurposes,
        loanProducts,
        loanTypes,
        employmentTypes,
        documentTypes,
        sourcingChannels,
        transactionTypes,
        interestTypes,
        rateOfInterests,
        verifications,
      });

      const resolvedPhotoDocId = resolveDocumentTypeId(documentTypes, 'photo');
      if (resolvedPhotoDocId) {
        setPhotoDocTypeId(resolvedPhotoDocId);
      }

      // Filter by current RM identity: strictly records created through RM Add Customer flow
      const myCustomers = currentRmId
        ? allCustomers.filter((c) => {
            const role = String(
              c.createdByRole ??
              c.CreatedByRole ??
              c.created_by_role ??
              c.raw?.createdByRole ??
              ''
            ).trim().toLowerCase();

            const rawAgentId = Number(
              c.agentId ??
              c.AgentId ??
              c.agent_id ??
              c.raw?.agentId ??
              0
            );

            // Exclude any record with an Agent owner or Agent role
            if (role === 'agent' || rawAgentId > 0) return false;

            const recordRmId = Number(
              c.rmId ??
              c.RmId ??
              c.RMId ??
              c.rm_id ??
              c.raw?.rmId ??
              0
            );

            const creatorId = Number(
              c.createdByUserId ??
              c.CreatedByUserId ??
              c.created_by_user_id ??
              c.createdBy ??
              c.CreatedBy ??
              c.created_by ??
              c.raw?.createdByUserId ??
              c.raw?.createdBy ??
              0
            );

            const belongsToCurrentRm = recordRmId === currentRmId || creatorId === currentRmId;
            const hasNoAgentOwner = !rawAgentId || rawAgentId <= 0;
            const isExplicitRmCreated = role === 'rm';

            return belongsToCurrentRm && hasNoAgentOwner && isExplicitRmCreated;
          })
        : [];

      // Sort DESC by CreatedAt
      myCustomers.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      setSubmissions(
        myCustomers.map((customer) => {
          const rawIntakeProductId = customer.loanProductId ?? customer.LoanProductId ?? null;
          const rawPurposeId = customer.loanPurposeId ?? customer.LoanPurposeId ?? null;

          // Correlate customer with application product details
          const matchedAppProduct = correlateCustomerWithApplicationProduct(
            customer,
            allApplicationProducts,
            currentRmId
          );

          // For converted/application-stage customers with a valid matched application product record,
          // prioritize ApplicationProductDetails.LoanProductId.
          // For New/unconverted customers, preserve AgentAddCustomer.loanProductId.
          const appLoanProductId = matchedAppProduct
            ? (matchedAppProduct.loanProductId ?? matchedAppProduct.LoanProductId ?? null)
            : null;

          const effectiveProductId =
            appLoanProductId !== null && appLoanProductId !== undefined && appLoanProductId !== ''
              ? appLoanProductId
              : rawIntakeProductId;

          // Derive displayed product name from LoanProductMaster using the effective LoanProductId
          const matchedProduct =
            effectiveProductId !== null && effectiveProductId !== undefined && effectiveProductId !== ''
              ? loanProducts.find((p) => Number(p.loanProductId || p.id) === Number(effectiveProductId))
              : null;

          const matchedPurpose =
            rawPurposeId !== null && rawPurposeId !== undefined && rawPurposeId !== ''
              ? loanPurposes.find((p) => Number(p.loanPurposeId || p.id) === Number(rawPurposeId))
              : null;

          // Derive Loan Type from the effective product
          const effectiveLoanTypeId =
            matchedProduct?.loanTypeId ??
            matchedProduct?.LoanTypeId ??
            customer.loanTypeId ??
            customer.LoanTypeId ??
            null;

          const matchedType =
            effectiveLoanTypeId !== null && effectiveLoanTypeId !== undefined && effectiveLoanTypeId !== ''
              ? loanTypes.find((t) => Number(t.loanTypeId || t.id) === Number(effectiveLoanTypeId))
              : null;

          const effectiveTypeName =
            matchedType?.typeName ||
            matchedType?.name ||
            customer.loanTypeName ||
            customer.LoanTypeName ||
            'N/A';

          const effectiveProductName = matchedProduct?.productName || matchedProduct?.name || null;

          const resolvedLoanName =
            effectiveProductName ||
            (!matchedAppProduct ? (customer.loanProductName || customer.LoanProductName) : null) ||
            customer.loanPurposeName ||
            customer.LoanPurposeName ||
            matchedPurpose?.purposeName ||
            matchedPurpose?.productName ||
            matchedPurpose?.name ||
            'N/A';

          const et = employmentTypes.find((e) => Number(e.employmentTypeId || e.id) === Number(customer.employmentTypeId));

          return {
            ...customer,
            rmCustomerId: customer.rmCustomerId || customer.rMCustomerId || customer.id,
            loanProductId: effectiveProductId,
            LoanProductId: effectiveProductId,
            loanProductName: resolvedLoanName,
            LoanProductName: resolvedLoanName,
            loanPurposeName: resolvedLoanName,
            loanTypeId: effectiveLoanTypeId,
            LoanTypeId: effectiveLoanTypeId,
            loanTypeName: effectiveTypeName,
            LoanTypeName: effectiveTypeName,
            applicationProductDetailsId:
              matchedAppProduct?.applicationProductDetailsId ??
              matchedAppProduct?.ApplicationProductDetailsId ??
              customer.applicationProductDetailsId ??
              customer.ApplicationProductDetailsId ??
              null,
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

    // Resolve VerificationId dynamically from active VerificationMaster records.
    // Promotion workflow semantics are unchanged: this step records the customer as 'Verified'.
    // No numeric fallback - if the master cannot resolve it, the promotion is blocked.
    const promotionVerificationId = resolveVerificationIdByCodeOrName(masterData.verifications, 'Verified');

    if (!promotionVerificationId) {
      setPromotionFeedback({
        type: 'error',
        message:
          'Unable to resolve the "Verified" status from Verification Master. Promotion blocked until master data is available.',
      });
      return;
    }

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
      verificationId: Number(promotionVerificationId),
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
    const searchTrimmed = searchTerm.trim();
    const searchLower = searchTrimmed.toLowerCase();
    const searchActive = searchTrimmed.length > 0;

    return submissions.filter((item) => {
      const matchesDate = matchesListingDateCriteria({
        dateValue: item.createdAt,
        searchActive,
        fromDate,
        toDate,
      });
      if (!matchesDate) return false;

      if (searchActive) {
        const nameMatch = (item.fullName || '').toLowerCase().includes(searchLower);
        const mobileMatch = (item.mobileNumber || '').includes(searchTrimmed);
        if (!nameMatch && !mobileMatch) return false;
      }

      const matchesStatus =
        selectedStatus === 'All Status' || String(item.status ?? '').toLowerCase() === selectedStatus.toLowerCase();

      return matchesStatus;
    });
  }, [submissions, searchTerm, selectedStatus, fromDate, toDate]);

  const totalRecords = filteredSubmissions.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;

  // Paginated Slicing
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSubmissions.slice(start, start + pageSize);
  }, [filteredSubmissions, currentPage, pageSize]);

  // Load Photos for current visible page (paginatedData) with priority:
  // 1. Original / Latest Photo from AgentCustomerDocument
  // 2. Initial letter avatar (null)
  useEffect(() => {
    if (!paginatedData || paginatedData.length === 0) return;

    let isMounted = true;

    // Identify customers on the current visible page that haven't been checked/cached yet
    const uncheckedCustomers = paginatedData.filter((item) => {
      const custId = item.agentCustomerId ?? item.AgentCustomerId ?? item.rmCustomerId ?? item.rMCustomerId ?? item.id;
      return custId && customerPhotos[custId] === undefined && !inFlightCustIdsRef.current.has(custId);
    });

    if (uncheckedCustomers.length === 0) return;

    const fetchPhotos = async () => {
      for (const item of uncheckedCustomers) {
        if (!isMounted) break;
        const custId = item.agentCustomerId ?? item.AgentCustomerId ?? item.rmCustomerId ?? item.rMCustomerId ?? item.id;
        if (!custId) continue;

        inFlightCustIdsRef.current.add(custId);
        let loadedPhotoUrl = null;

        try {
          const docsRes = await rmCustomerService.getAgentCustomerDocumentsByCustomerId(custId);
          const extractArray = (res) => {
            if (Array.isArray(res)) return res;
            if (res && typeof res === 'object') {
              if (Array.isArray(res.data)) return res.data;
              if (Array.isArray(res.items)) return res.items;
              if (Array.isArray(res.result)) return res.result;
              if (Array.isArray(res.list)) return res.list;
            }
            return [];
          };
          const docList = extractArray(docsRes);

          const photoDoc = selectLatestCustomerPhotoDoc(docList, photoDocTypeId);
          if (photoDoc) {
            const docId = photoDoc.agentCustomerDocumentId ?? photoDoc.AgentCustomerDocumentId ?? photoDoc.id;
            if (docId) {
              const blob = await rmCustomerService.downloadAgentCustomerDocument(docId);
              if (blob && blob.size > 0) {
                let mimeType = blob.type || 'image/jpeg';
                const fileName = photoDoc.fileName || photoDoc.documentName || '';
                if (/\.png$/i.test(fileName)) mimeType = 'image/png';
                else if (/\.(jpg|jpeg)$/i.test(fileName)) mimeType = 'image/jpeg';
                else if (/\.webp$/i.test(fileName)) mimeType = 'image/webp';

                const typedBlob = blob.type ? blob : new Blob([blob], { type: mimeType });
                loadedPhotoUrl = URL.createObjectURL(typedBlob);
              }
            }
          }

          if (isMounted) {
            if (loadedPhotoUrl) {
              photoUrlsRef.current[custId] = loadedPhotoUrl;
              setCustomerPhotos((prev) => ({ ...prev, [custId]: loadedPhotoUrl }));
            } else {
              setCustomerPhotos((prev) => ({ ...prev, [custId]: null }));
            }
          } else if (loadedPhotoUrl) {
            URL.revokeObjectURL(loadedPhotoUrl);
          }
        } catch (err) {
          if (isMounted) {
            setCustomerPhotos((prev) => ({ ...prev, [custId]: null }));
          }
        } finally {
          inFlightCustIdsRef.current.delete(custId);
        }
      }
    };

    fetchPhotos();

    return () => {
      isMounted = false;
    };
  }, [paginatedData, photoDocTypeId, customerPhotos]);

  // Cleanup all created Object URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(photoUrlsRef.current).forEach((url) => {
        if (url) {
          try {
            URL.revokeObjectURL(url);
          } catch (e) {
            // ignore
          }
        }
      });
      photoUrlsRef.current = {};
    };
  }, []);

  const handleImageError = (custId) => {
    const url = photoUrlsRef.current[custId];
    if (url) {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        // ignore
      }
      delete photoUrlsRef.current[custId];
    }
    setCustomerPhotos((prev) => ({ ...prev, [custId]: null }));
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedStatus('All Status');
    setFromDate('');
    setToDate('');
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
    let displayStatus = status || 'Unknown';
    if (status === 'Pending') displayStatus = 'RM Pending';
    else if (status === 'Under Review') displayStatus = 'CM Pending';
    else if (status === 'Returned') displayStatus = 'BO Returned';

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

          <div className="rm-csh-date-group">
            <div className="rm-csh-date-box">
              <DatePicker
                value={fromDate}
                max={toDate || undefined}
                onChange={(date) => {
                  setFromDate(date);
                  setCurrentPage(1);
                }}
                placeholder="From Date"
              />
            </div>
            <div className="rm-csh-date-box">
              <DatePicker
                value={toDate}
                onChange={(date) => {
                  setToDate(date);
                  setCurrentPage(1);
                }}
                placeholder="To Date"
              />
            </div>
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

          <Can permission="APPLICATIONS.EDIT">
            <button
              type="button"
              className="rm-csh-btn-create"
              onClick={handleCreateCustomer}
            >
              <Plus size={16} strokeWidth={2.2} />
              <span>Add New Customer</span>
            </button>
          </Can>
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
            <Can permission="APPLICATIONS.EDIT">
              <button
                type="button"
                className="rm-csh-btn-create"
                onClick={handleCreateCustomer}
              >
                <UserPlus size={16} />
                <span>Create First Customer</span>
              </button>
            </Can>
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
                  const custId = item.agentCustomerId ?? item.AgentCustomerId ?? item.rmCustomerId ?? item.rMCustomerId ?? item.id;
                  const initial = (item.fullName || 'U').charAt(0).toUpperCase();
                  const avatarClass = initial.match(/[A-M]/i) ? 'avatar--A' : 'avatar--R';
                  const photoUrl = customerPhotos[custId];
                  const isItemPromoting = Boolean(isPromoting[item.rmCustomerId]);
                  const isDirectRmOwned =
                    (!item.agentId || item.agentId === '') &&
                    Number(item.rmId || item.RMId || item.createdBy || item.CreatedBy) === Number(currentRmId);
                  const isItemConverted = Boolean(item.isConverted || item.IsConverted || isDirectRmOwned);
                  const hasBeenConverted = Boolean(item.isConverted || item.IsConverted || item.applicationId || item.ApplicationId || item.applicationProductDetailsId);
                  const isNewStatus = item.status === 'New' || Number(item.raw?.status ?? item.Status ?? item.status) === 0;
                  const canEditOrDelete = isNewStatus && isDirectRmOwned && !hasBeenConverted;

                  return (
                    <tr key={item.rmCustomerId || idx} className="rm-csh-tr">
                      <td className="rm-csh-td index-col">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>
                      <td className="rm-csh-td">
                        <div className="history-customer-cell">
                          {photoUrl ? (
                            <img
                              src={photoUrl}
                              alt={item.fullName || 'Customer'}
                              className="history-avatar history-avatar-img"
                              onError={() => handleImageError(custId)}
                            />
                          ) : (
                            <div className={`history-avatar ${avatarClass}`}>{initial}</div>
                          )}
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
                            title="View customer details"
                          >
                            <Eye size={15} strokeWidth={1.8} />
                            <span>View Details</span>
                          </button>
                          {canEditOrDelete && (
                            <>
                              <button
                                type="button"
                                className="btn-edit-customer"
                                onClick={() => handleEditCustomer(item)}
                                title="Edit customer details"
                                aria-label={`Edit ${item.fullName || 'Customer'}`}
                              >
                                <Edit2 size={14} strokeWidth={1.8} />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                className="btn-delete-customer"
                                onClick={() => handleOpenDeleteModal(item)}
                                title="Delete customer application"
                                aria-label={`Delete ${item.fullName || 'Customer'}`}
                              >
                                <Trash2 size={14} strokeWidth={1.8} />
                                <span>Delete</span>
                              </button>
                            </>
                          )}
                          {!isItemConverted && (
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

      {/* Delete Confirmation Modal */}
      {customerToDelete && (
        <div
          className="history-delete-modal-backdrop"
          onClick={handleCloseDeleteModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div
            className="history-delete-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="history-delete-modal-header">
              <div className="history-delete-modal-icon">
                <Trash2 size={20} />
              </div>
              <h3 id="delete-modal-title" className="history-delete-modal-title">
                Delete Customer Application
              </h3>
            </div>

            {deleteError && (
              <div className="history-delete-modal-error">
                {deleteError}
              </div>
            )}

            <p className="history-delete-modal-message">
              Are you sure you want to delete customer <strong>"{customerToDelete?.fullName || 'this customer'}"</strong>? This action cannot be undone.
            </p>

            <div className="history-delete-modal-actions">
              <button
                type="button"
                className="history-delete-modal-btn-cancel"
                onClick={handleCloseDeleteModal}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="history-delete-modal-btn-confirm"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
