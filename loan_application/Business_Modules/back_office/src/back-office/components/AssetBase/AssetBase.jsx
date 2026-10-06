import React, { useState, useEffect, useMemo, useCallback } from 'react';
import iconMap from '../../config/iconMap';
import backOfficeService from '../../api/backOfficeService';
import { getBackOfficeAuth } from '../../auth/authStorage';
import './AssetBase.css';

const PlusIcon = iconMap['Plus'] || iconMap['FilePlus'];
const Trash2Icon = iconMap['Trash2'] || iconMap['X'];
const SaveIcon = iconMap['Save'] || iconMap['Check'];
const Edit3Icon = iconMap['Edit3'] || iconMap['FileText'];
const RefreshCwIcon = iconMap['RefreshCw'];
const AlertTriangleIcon = iconMap['AlertTriangle'] || iconMap['AlertCircle'];
const CheckCircle2Icon = iconMap['CheckCircle2'] || iconMap['CheckCircle'];
const XIcon = iconMap['X'];

const initialNewAssetForm = {
  propertyId: '',
  propertyAddress: '',
  propertyOwner: '',
  propertyUsage: '',
  marketValue: '',
  mortgageStatusId: '',
  mortgagedToWhom: '',
};

/**
 * AssetBase Component (Visible Step 11 / Internal Step 20)
 * --------------------------------------------------------
 * Manages property and asset portfolio records for loan underwriting.
 *
 * Master-driven dropdowns:
 *   - Type of Property (/PropertyMaster)
 *   - Mortgage Status (/MortgageStatusMaster)
 *
 * Manual text entry:
 *   - Property Usage (CRITICAL: Manual input, not a master)
 *   - Property Address
 *   - Property Owner
 *   - Market Value
 *   - Mortgaged To Whom
 */
export default function AssetBase({
  applicationProductDetailsId,
  agentCustomerId,
  applicantSequence = 0,
  currentUserId: propUserId,
}) {
  // Master Data State
  const [propertyMasters, setPropertyMasters] = useState([]);
  const [isPropertyMasterLoading, setIsPropertyMasterLoading] = useState(false);
  const [propertyMasterError, setPropertyMasterError] = useState(null);

  const [mortgageStatusMasters, setMortgageStatusMasters] = useState([]);
  const [isMortgageMasterLoading, setIsMortgageMasterLoading] = useState(false);
  const [mortgageMasterError, setMortgageMasterError] = useState(null);

  // Asset List & Summary State
  const [assets, setAssets] = useState([]);
  const [backendTotalMarketValue, setBackendTotalMarketValue] = useState(0);
  const [isAssetsLoading, setIsAssetsLoading] = useState(false);
  const [assetsError, setAssetsError] = useState(null);

  // UI / Form State
  const [isAdding, setIsAdding] = useState(false);
  const [newAssetForm, setNewAssetForm] = useState(initialNewAssetForm);
  const [editingAssetId, setEditingAssetId] = useState(null);
  const [editAssetForm, setEditAssetForm] = useState(initialNewAssetForm);

  // Operation States
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Delete Confirmation State
  const [deleteConfirmRow, setDeleteConfirmRow] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Dynamic user ID resolution
  const resolveCurrentUserId = useCallback(() => {
    if (propUserId != null && !isNaN(Number(propUserId)) && Number(propUserId) > 0) {
      return Number(propUserId);
    }
    const boAuth = getBackOfficeAuth();
    const directId = boAuth?.backOfficeId ?? boAuth?.id;
    if (directId != null && !isNaN(Number(directId)) && Number(directId) > 0) {
      return Number(directId);
    }
    const storedBoId = localStorage.getItem('backOfficeId');
    if (storedBoId != null && !isNaN(Number(storedBoId)) && Number(storedBoId) > 0) {
      return Number(storedBoId);
    }
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId != null && !isNaN(Number(storedUserId)) && Number(storedUserId) > 0) {
      return Number(storedUserId);
    }
    return null;
  }, [propUserId]);

  // Fetch Property Master
  const fetchPropertyMasters = useCallback(async () => {
    setIsPropertyMasterLoading(true);
    setPropertyMasterError(null);
    try {
      const res = await backOfficeService.getPropertyMaster();
      const list = Array.isArray(res) ? res : (res?.data || res?.value || []);
      setPropertyMasters(list);
    } catch (err) {
      console.error('Failed to load Property Master:', err);
      setPropertyMasterError('Property types unavailable. Please retry.');
    } finally {
      setIsPropertyMasterLoading(false);
    }
  }, []);

  // Fetch Mortgage Status Master
  const fetchMortgageStatusMasters = useCallback(async () => {
    setIsMortgageMasterLoading(true);
    setMortgageMasterError(null);
    try {
      const res = await backOfficeService.getMortgageStatusMaster();
      const list = Array.isArray(res) ? res : (res?.data || res?.value || []);
      setMortgageStatusMasters(list);
    } catch (err) {
      console.error('Failed to load Mortgage Status Master:', err);
      setMortgageMasterError('Mortgage statuses unavailable. Please retry.');
    } finally {
      setIsMortgageMasterLoading(false);
    }
  }, []);

  // Fetch Application Assets
  const fetchApplicationAssets = useCallback(async () => {
    if (!applicationProductDetailsId) {
      setAssets([]);
      setBackendTotalMarketValue(0);
      return;
    }

    setIsAssetsLoading(true);
    setAssetsError(null);
    try {
      const res = await backOfficeService.getApplicationAssets(applicationProductDetailsId);
      let list = [];
      let totalVal = 0;

      if (Array.isArray(res)) {
        list = res;
        totalVal = list.reduce((sum, item) => sum + (Number(item.marketValue) || 0), 0);
      } else if (res && typeof res === 'object') {
        list = Array.isArray(res.assets)
          ? res.assets
          : (Array.isArray(res.data) ? res.data : []);
        totalVal = res.totalMarketValue != null
          ? Number(res.totalMarketValue)
          : list.reduce((sum, item) => sum + (Number(item.marketValue) || 0), 0);
      }

      // Filter active records (soft delete check)
      const activeList = list.filter((item) => item.isActive !== false);
      setAssets(activeList);
      setBackendTotalMarketValue(totalVal);
    } catch (err) {
      console.error('Failed to load Application Assets:', err);
      setAssetsError('Failed to load application asset details.');
    } finally {
      setIsAssetsLoading(false);
    }
  }, [applicationProductDetailsId]);

  // Initial Data Load
  useEffect(() => {
    fetchPropertyMasters();
    fetchMortgageStatusMasters();
  }, [fetchPropertyMasters, fetchMortgageStatusMasters]);

  useEffect(() => {
    fetchApplicationAssets();
  }, [fetchApplicationAssets]);

  // Filter Active Master Lists
  const activePropertyMasters = useMemo(() => {
    return (propertyMasters || []).filter((item) => item.isActive !== false);
  }, [propertyMasters]);

  const activeMortgageStatusMasters = useMemo(() => {
    return (mortgageStatusMasters || []).filter((item) => item.isActive !== false);
  }, [mortgageStatusMasters]);

  // Master Lookup Maps for fast name resolution
  const propertyNameMap = useMemo(() => {
    const map = new Map();
    (propertyMasters || []).forEach((item) => {
      const id = item.propertyId ?? item.id;
      if (id != null) map.set(Number(id), item.propertyName || item.name || item.propertyCode || '');
    });
    return map;
  }, [propertyMasters]);

  const mortgageStatusNameMap = useMemo(() => {
    const map = new Map();
    (mortgageStatusMasters || []).forEach((item) => {
      const id = item.mortgageStatusId ?? item.id;
      if (id != null) map.set(Number(id), item.mortgageStatusName || item.name || item.mortgageStatusCode || '');
    });
    return map;
  }, [mortgageStatusMasters]);

  // Clear auto-dismissing notifications
  useEffect(() => {
    if (!successMessage && !actionError) return;
    const timer = setTimeout(() => {
      setSuccessMessage(null);
      setActionError(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [successMessage, actionError]);

  // Handle Add Asset Click
  const handleStartAdd = () => {
    if (isAdding) return;
    setEditingAssetId(null);
    setNewAssetForm(initialNewAssetForm);
    setIsAdding(true);
    setActionError(null);
    setSuccessMessage(null);
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setNewAssetForm(initialNewAssetForm);
    setActionError(null);
  };

  // Handle Save New Asset (POST)
  const handleSaveNewAsset = async () => {
    setActionError(null);
    setSuccessMessage(null);

    // Basic technical validation
    if (!newAssetForm.propertyId) {
      setActionError('Please select Type of Property.');
      return;
    }
    if (!String(newAssetForm.propertyAddress || '').trim()) {
      setActionError('Please enter Property Address.');
      return;
    }
    if (!String(newAssetForm.propertyOwner || '').trim()) {
      setActionError('Please enter Property Owner.');
      return;
    }
    if (newAssetForm.marketValue === '' || isNaN(Number(newAssetForm.marketValue)) || Number(newAssetForm.marketValue) <= 0) {
      setActionError('Please enter a valid Market Value greater than zero.');
      return;
    }
    if (!newAssetForm.mortgageStatusId) {
      setActionError('Please select Mortgage Status.');
      return;
    }

    const currentUserId = resolveCurrentUserId();
    if (!currentUserId) {
      setActionError('Unable to identify authenticated Back Office user. Please log in again.');
      return;
    }

    const payload = {
      applicationProductDetailsId: Number(applicationProductDetailsId),
      agentCustomerId: Number(agentCustomerId),
      applicantSequence: Number(applicantSequence || 0),
      propertyId: Number(newAssetForm.propertyId),
      propertyAddress: String(newAssetForm.propertyAddress || '').trim(),
      propertyOwner: String(newAssetForm.propertyOwner || '').trim(),
      propertyUsage: String(newAssetForm.propertyUsage || '').trim(),
      marketValue: Number(newAssetForm.marketValue),
      mortgageStatusId: Number(newAssetForm.mortgageStatusId),
      mortgagedToWhom: String(newAssetForm.mortgagedToWhom || '').trim(),
      enteredByBackOfficeId: Number(currentUserId),
      createdBy: Number(currentUserId),
    };

    setIsSaving(true);
    try {
      await backOfficeService.createApplicationAsset(payload);
      setSuccessMessage('Asset record added successfully.');
      setIsAdding(false);
      setNewAssetForm(initialNewAssetForm);
      await fetchApplicationAssets();
    } catch (err) {
      console.error('Failed to create asset record:', err);
      const msg = err?.response?.data?.message || err?.response?.data?.title || err?.message || 'Failed to save asset record.';
      setActionError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Start Edit (Hydrate Row or GET One)
  const handleStartEdit = async (row) => {
    setIsAdding(false);
    setActionError(null);
    setSuccessMessage(null);

    const assetId = row.applicationAssetDetailsId ?? row.id;
    if (!assetId) return;

    try {
      // Fetch fresh single record if available, fallback to hydrated row
      let freshData = row;
      try {
        const fetched = await backOfficeService.getApplicationAssetById(assetId);
        if (fetched) freshData = fetched;
      } catch (getOneErr) {
        console.warn('GET by ID fallback to row data:', getOneErr);
      }

      setEditingAssetId(assetId);
      setEditAssetForm({
        propertyId: freshData.propertyId ?? '',
        propertyAddress: freshData.propertyAddress ?? '',
        propertyOwner: freshData.propertyOwner ?? '',
        propertyUsage: freshData.propertyUsage ?? '',
        marketValue: freshData.marketValue != null ? String(freshData.marketValue) : '',
        mortgageStatusId: freshData.mortgageStatusId ?? '',
        mortgagedToWhom: freshData.mortgagedToWhom ?? '',
        enteredByBackOfficeId: freshData.enteredByBackOfficeId ?? null,
      });
    } catch (err) {
      console.error('Failed to prepare asset for editing:', err);
      setActionError('Unable to load asset for editing.');
    }
  };

  const handleCancelEdit = () => {
    setEditingAssetId(null);
    setEditAssetForm(initialNewAssetForm);
    setActionError(null);
  };

  // Handle Save Edit (PUT)
  const handleSaveEdit = async (assetId) => {
    setActionError(null);
    setSuccessMessage(null);

    if (!editAssetForm.propertyId) {
      setActionError('Please select Type of Property.');
      return;
    }
    if (!String(editAssetForm.propertyAddress || '').trim()) {
      setActionError('Please enter Property Address.');
      return;
    }
    if (!String(editAssetForm.propertyOwner || '').trim()) {
      setActionError('Please enter Property Owner.');
      return;
    }
    if (editAssetForm.marketValue === '' || isNaN(Number(editAssetForm.marketValue)) || Number(editAssetForm.marketValue) <= 0) {
      setActionError('Please enter a valid Market Value greater than zero.');
      return;
    }
    if (!editAssetForm.mortgageStatusId) {
      setActionError('Please select Mortgage Status.');
      return;
    }

    const currentUserId = resolveCurrentUserId();
    if (!currentUserId) {
      setActionError('Unable to identify authenticated Back Office user. Please log in again.');
      return;
    }

    const payload = {
      applicationProductDetailsId: Number(applicationProductDetailsId),
      agentCustomerId: Number(agentCustomerId),
      applicantSequence: Number(applicantSequence || 0),
      propertyId: Number(editAssetForm.propertyId),
      propertyAddress: String(editAssetForm.propertyAddress || '').trim(),
      propertyOwner: String(editAssetForm.propertyOwner || '').trim(),
      propertyUsage: String(editAssetForm.propertyUsage || '').trim(),
      marketValue: Number(editAssetForm.marketValue),
      mortgageStatusId: Number(editAssetForm.mortgageStatusId),
      mortgagedToWhom: String(editAssetForm.mortgagedToWhom || '').trim(),
      enteredByBackOfficeId: Number(editAssetForm.enteredByBackOfficeId || currentUserId),
      modifiedBy: Number(currentUserId),
    };

    setIsSaving(true);
    try {
      await backOfficeService.updateApplicationAsset(assetId, payload);
      setSuccessMessage('Asset record updated successfully.');
      setEditingAssetId(null);
      setEditAssetForm(initialNewAssetForm);
      await fetchApplicationAssets();
    } catch (err) {
      console.error('Failed to update asset record:', err);
      const msg = err?.response?.data?.message || err?.response?.data?.title || err?.message || 'Failed to update asset record.';
      setActionError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Delete Confirmation (DELETE)
  const handleDeleteClick = (row) => {
    setDeleteConfirmRow(row);
    setActionError(null);
    setSuccessMessage(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmRow) return;
    const assetId = deleteConfirmRow.applicationAssetDetailsId ?? deleteConfirmRow.id;
    if (!assetId) return;

    setIsDeleting(true);
    setActionError(null);
    try {
      await backOfficeService.deleteApplicationAsset(assetId);
      setDeleteConfirmRow(null);
      setSuccessMessage('Asset record deleted successfully.');
      await fetchApplicationAssets();
    } catch (err) {
      console.error('Failed to delete asset record:', err);
      const msg = err?.response?.data?.message || err?.response?.data?.title || err?.message || 'Failed to delete asset record.';
      setActionError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="bo-ab-container" aria-label="Asset Base Verification">
      {/* ── Section Header ── */}
      <div className="bo-ab-header">
        <div className="bo-ab-header-left">
          <h2 className="bo-ab-title">Asset Base</h2>
          <p className="bo-ab-subtitle">
            Capture property and assets considered for the application.
          </p>
        </div>
        <div className="bo-ab-header-actions">
          <button
            type="button"
            className="bo-ab-btn bo-ab-btn-primary"
            onClick={handleStartAdd}
            disabled={isAdding || isSaving || isAssetsLoading}
          >
            {PlusIcon && <PlusIcon size={16} />}
            <span>Add Asset</span>
          </button>
        </div>
      </div>

      {/* ── Feedback Banners ── */}
      {propertyMasterError && (
        <div className="bo-ab-alert bo-ab-alert-warning" role="alert">
          {AlertTriangleIcon && <AlertTriangleIcon size={16} />}
          <span>{propertyMasterError}</span>
          <button
            type="button"
            className="bo-ab-alert-retry"
            onClick={fetchPropertyMasters}
            disabled={isPropertyMasterLoading}
          >
            {RefreshCwIcon && <RefreshCwIcon size={13} className={isPropertyMasterLoading ? 'bo-ab-spin' : ''} />}
            <span>Retry</span>
          </button>
        </div>
      )}

      {mortgageMasterError && (
        <div className="bo-ab-alert bo-ab-alert-warning" role="alert">
          {AlertTriangleIcon && <AlertTriangleIcon size={16} />}
          <span>{mortgageMasterError}</span>
          <button
            type="button"
            className="bo-ab-alert-retry"
            onClick={fetchMortgageStatusMasters}
            disabled={isMortgageMasterLoading}
          >
            {RefreshCwIcon && <RefreshCwIcon size={13} className={isMortgageMasterLoading ? 'bo-ab-spin' : ''} />}
            <span>Retry</span>
          </button>
        </div>
      )}

      {actionError && (
        <div className="bo-ab-alert bo-ab-alert-danger" role="alert">
          {AlertTriangleIcon && <AlertTriangleIcon size={16} />}
          <span>{actionError}</span>
          <button type="button" className="bo-ab-alert-close" onClick={() => setActionError(null)}>
            {XIcon && <XIcon size={14} />}
          </button>
        </div>
      )}

      {assetsError && (
        <div className="bo-ab-alert bo-ab-alert-danger" role="alert">
          {AlertTriangleIcon && <AlertTriangleIcon size={16} />}
          <span>{assetsError}</span>
          <button type="button" className="bo-ab-alert-retry" onClick={fetchApplicationAssets} disabled={isAssetsLoading}>
            {RefreshCwIcon && <RefreshCwIcon size={13} className={isAssetsLoading ? 'bo-ab-spin' : ''} />}
            <span>Reload</span>
          </button>
        </div>
      )}

      {successMessage && (
        <div className="bo-ab-alert bo-ab-alert-success" role="alert">
          {CheckCircle2Icon && <CheckCircle2Icon size={16} />}
          <span>{successMessage}</span>
          <button type="button" className="bo-ab-alert-close" onClick={() => setSuccessMessage(null)}>
            {XIcon && <XIcon size={14} />}
          </button>
        </div>
      )}

      {/* ── Table Wrapper ── */}
      <div className="bo-ab-table-wrapper">
        <table className="bo-ab-table" aria-label="Asset Base Records">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>#</th>
              <th style={{ minWidth: '170px' }}>Type of Property</th>
              <th style={{ minWidth: '200px' }}>Property Address</th>
              <th style={{ minWidth: '150px' }}>Property Owner</th>
              <th style={{ minWidth: '140px' }}>Property Usage</th>
              <th style={{ minWidth: '140px' }}>Market Value (₹)</th>
              <th style={{ minWidth: '160px' }}>Mortgage Status</th>
              <th style={{ minWidth: '160px' }}>Mortgaged To Whom</th>
              <th style={{ width: '110px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* ── Loading Skeleton ── */}
            {isAssetsLoading && assets.length === 0 && (
              <tr>
                <td colSpan={9} className="bo-ab-empty-cell">
                  <div className="bo-ab-loading-state">
                    {RefreshCwIcon && <RefreshCwIcon size={18} className="bo-ab-spin" />}
                    <span>Loading asset base records...</span>
                  </div>
                </td>
              </tr>
            )}

            {/* ── Empty State ── */}
            {!isAssetsLoading && assets.length === 0 && !isAdding && (
              <tr>
                <td colSpan={9} className="bo-ab-empty-cell">
                  <div className="bo-ab-no-data">
                    <p>No asset records added yet for this application.</p>
                    <button
                      type="button"
                      className="bo-ab-btn bo-ab-btn-outline"
                      onClick={handleStartAdd}
                      disabled={isSaving}
                    >
                      {PlusIcon && <PlusIcon size={14} />}
                      <span>Add First Asset</span>
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {/* ── Existing Asset Rows ── */}
            {assets.map((row, idx) => {
              const assetId = row.applicationAssetDetailsId ?? row.id;
              const isEditing = editingAssetId === assetId;
              const propName = row.propertyName || propertyNameMap.get(Number(row.propertyId)) || 'Property';
              const mortName = row.mortgageStatusName || mortgageStatusNameMap.get(Number(row.mortgageStatusId)) || '-';

              if (isEditing) {
                return (
                  <tr key={assetId || `edit-${idx}`} className="bo-ab-row--editing">
                    <td className="bo-ab-cell-index">{idx + 1}</td>
                    <td>
                      <select
                        className="bo-ab-select"
                        value={editAssetForm.propertyId}
                        onChange={(e) => setEditAssetForm((prev) => ({ ...prev, propertyId: e.target.value }))}
                        disabled={isSaving}
                      >
                        <option value="">-- Select Property Type --</option>
                        {activePropertyMasters.map((pm) => (
                          <option key={pm.propertyId} value={pm.propertyId}>
                            {pm.propertyName || pm.propertyCode}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        className="bo-ab-input"
                        placeholder="Enter Property Address"
                        value={editAssetForm.propertyAddress}
                        onChange={(e) => setEditAssetForm((prev) => ({ ...prev, propertyAddress: e.target.value }))}
                        disabled={isSaving}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="bo-ab-input"
                        placeholder="Enter Property Owner"
                        value={editAssetForm.propertyOwner}
                        onChange={(e) => setEditAssetForm((prev) => ({ ...prev, propertyOwner: e.target.value }))}
                        disabled={isSaving}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="bo-ab-input"
                        placeholder="e.g. Self-Occupied, Rented"
                        value={editAssetForm.propertyUsage}
                        onChange={(e) => setEditAssetForm((prev) => ({ ...prev, propertyUsage: e.target.value }))}
                        disabled={isSaving}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="bo-ab-input bo-ab-input--number"
                        placeholder="₹ Market Value"
                        min="0"
                        step="1000"
                        value={editAssetForm.marketValue}
                        onChange={(e) => setEditAssetForm((prev) => ({ ...prev, marketValue: e.target.value }))}
                        disabled={isSaving}
                      />
                    </td>
                    <td>
                      <select
                        className="bo-ab-select"
                        value={editAssetForm.mortgageStatusId}
                        onChange={(e) => setEditAssetForm((prev) => ({ ...prev, mortgageStatusId: e.target.value }))}
                        disabled={isSaving}
                      >
                        <option value="">-- Select Status --</option>
                        {activeMortgageStatusMasters.map((ms) => (
                          <option key={ms.mortgageStatusId} value={ms.mortgageStatusId}>
                            {ms.mortgageStatusName || ms.mortgageStatusCode}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        className="bo-ab-input"
                        placeholder="Bank / Financier"
                        value={editAssetForm.mortgagedToWhom}
                        onChange={(e) => setEditAssetForm((prev) => ({ ...prev, mortgagedToWhom: e.target.value }))}
                        disabled={isSaving}
                      />
                    </td>
                    <td className="bo-ab-actions-cell">
                      <div className="bo-ab-actions-group">
                        <button
                          type="button"
                          className="bo-ab-btn-icon bo-ab-btn-icon--save"
                          title="Save Changes"
                          onClick={() => handleSaveEdit(assetId)}
                          disabled={isSaving}
                        >
                          {SaveIcon && <SaveIcon size={15} />}
                        </button>
                        <button
                          type="button"
                          className="bo-ab-btn-icon bo-ab-btn-icon--cancel"
                          title="Cancel"
                          onClick={handleCancelEdit}
                          disabled={isSaving}
                        >
                          {XIcon && <XIcon size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={assetId || `view-${idx}`} className="bo-ab-row">
                  <td className="bo-ab-cell-index">{idx + 1}</td>
                  <td className="bo-ab-cell-text" title={propName}>
                    <span className="bo-ab-badge bo-ab-badge--property">{propName}</span>
                  </td>
                  <td className="bo-ab-cell-text" title={row.propertyAddress || '-'}>
                    {row.propertyAddress || '-'}
                  </td>
                  <td className="bo-ab-cell-text" title={row.propertyOwner || '-'}>
                    {row.propertyOwner || '-'}
                  </td>
                  <td className="bo-ab-cell-text" title={row.propertyUsage || '-'}>
                    {row.propertyUsage || '-'}
                  </td>
                  <td className="bo-ab-cell-number">
                    ₹ {Number(row.marketValue || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="bo-ab-cell-text">
                    <span className="bo-ab-badge bo-ab-badge--status">{mortName}</span>
                  </td>
                  <td className="bo-ab-cell-text" title={row.mortgagedToWhom || '-'}>
                    {row.mortgagedToWhom || '-'}
                  </td>
                  <td className="bo-ab-actions-cell">
                    <div className="bo-ab-actions-group">
                      <button
                        type="button"
                        className="bo-ab-btn-icon bo-ab-btn-icon--edit"
                        title="Edit Asset"
                        onClick={() => handleStartEdit(row)}
                        disabled={isSaving || isAdding || editingAssetId != null}
                      >
                        {Edit3Icon && <Edit3Icon size={14} />}
                      </button>
                      <button
                        type="button"
                        className="bo-ab-btn-icon bo-ab-btn-icon--delete"
                        title="Delete Asset"
                        onClick={() => handleDeleteClick(row)}
                        disabled={isSaving || isAdding || editingAssetId != null}
                      >
                        {Trash2Icon && <Trash2Icon size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {/* ── New Asset Inline Form Row ── */}
            {isAdding && (
              <tr className="bo-ab-row--adding">
                <td className="bo-ab-cell-index">{assets.length + 1}</td>
                <td>
                  <select
                    className="bo-ab-select"
                    value={newAssetForm.propertyId}
                    onChange={(e) => setNewAssetForm((prev) => ({ ...prev, propertyId: e.target.value }))}
                    disabled={isSaving}
                    autoFocus
                  >
                    <option value="">-- Select Property Type --</option>
                    {activePropertyMasters.map((pm) => (
                      <option key={pm.propertyId} value={pm.propertyId}>
                        {pm.propertyName || pm.propertyCode}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="text"
                    className="bo-ab-input"
                    placeholder="Enter Property Address"
                    value={newAssetForm.propertyAddress}
                    onChange={(e) => setNewAssetForm((prev) => ({ ...prev, propertyAddress: e.target.value }))}
                    disabled={isSaving}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="bo-ab-input"
                    placeholder="Enter Property Owner"
                    value={newAssetForm.propertyOwner}
                    onChange={(e) => setNewAssetForm((prev) => ({ ...prev, propertyOwner: e.target.value }))}
                    disabled={isSaving}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="bo-ab-input"
                    placeholder="e.g. Self-Occupied, Rented"
                    value={newAssetForm.propertyUsage}
                    onChange={(e) => setNewAssetForm((prev) => ({ ...prev, propertyUsage: e.target.value }))}
                    disabled={isSaving}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    className="bo-ab-input bo-ab-input--number"
                    placeholder="₹ Market Value"
                    min="0"
                    step="1000"
                    value={newAssetForm.marketValue}
                    onChange={(e) => setNewAssetForm((prev) => ({ ...prev, marketValue: e.target.value }))}
                    disabled={isSaving}
                  />
                </td>
                <td>
                  <select
                    className="bo-ab-select"
                    value={newAssetForm.mortgageStatusId}
                    onChange={(e) => setNewAssetForm((prev) => ({ ...prev, mortgageStatusId: e.target.value }))}
                    disabled={isSaving}
                  >
                    <option value="">-- Select Status --</option>
                    {activeMortgageStatusMasters.map((ms) => (
                      <option key={ms.mortgageStatusId} value={ms.mortgageStatusId}>
                        {ms.mortgageStatusName || ms.mortgageStatusCode}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="text"
                    className="bo-ab-input"
                    placeholder="Bank / Financier"
                    value={newAssetForm.mortgagedToWhom}
                    onChange={(e) => setNewAssetForm((prev) => ({ ...prev, mortgagedToWhom: e.target.value }))}
                    disabled={isSaving}
                  />
                </td>
                <td className="bo-ab-actions-cell">
                  <div className="bo-ab-actions-group">
                    <button
                      type="button"
                      className="bo-ab-btn-icon bo-ab-btn-icon--save"
                      title="Save Asset"
                      onClick={handleSaveNewAsset}
                      disabled={isSaving}
                    >
                      {SaveIcon && <SaveIcon size={15} />}
                    </button>
                    <button
                      type="button"
                      className="bo-ab-btn-icon bo-ab-btn-icon--cancel"
                      title="Cancel"
                      onClick={handleCancelAdd}
                      disabled={isSaving}
                    >
                      {XIcon && <XIcon size={15} />}
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Total Market Value Bar ── */}
      <div className="bo-ab-total-bar">
        <div className="bo-ab-total-label">Total Market Value</div>
        <div className="bo-ab-total-value">
          ₹ {Number(backendTotalMarketValue || 0).toLocaleString('en-IN')}
        </div>
      </div>

      {/* ── Delete Confirmation Modal ── */}
      {deleteConfirmRow && (
        <div className="bo-ab-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="bo-ab-delete-title">
          <div className="bo-ab-modal-card">
            <div className="bo-ab-modal-header">
              <div className="bo-ab-modal-icon-danger">
                {Trash2Icon && <Trash2Icon size={20} />}
              </div>
              <h3 id="bo-ab-delete-title" className="bo-ab-modal-title">Delete Asset Record?</h3>
            </div>
            <p className="bo-ab-modal-desc">
              Are you sure you want to delete the asset entry for{' '}
              <strong>
                "{deleteConfirmRow.propertyName || propertyNameMap.get(Number(deleteConfirmRow.propertyId)) || 'Property'}
                {deleteConfirmRow.propertyAddress ? ` - ${deleteConfirmRow.propertyAddress}` : ''}"
              </strong>?
              This record will be removed from the loan application.
            </p>
            <div className="bo-ab-modal-actions">
              <button
                type="button"
                className="bo-ab-btn bo-ab-btn-secondary"
                onClick={() => setDeleteConfirmRow(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="bo-ab-btn bo-ab-btn-danger"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Asset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
