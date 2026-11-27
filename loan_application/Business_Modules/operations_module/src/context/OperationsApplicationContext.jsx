import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getStoredRoleCode, getStoredUser } from '../../../../Core/src/auth/session';
import { PERMISSIONS_CHANGED_EVENT } from '../../../../Core/src/auth/permissions';
import operationsService from '../services/operationsService';
import operationsApplicationService from '../services/operationsApplicationService';
import { extractWorkflowStatus } from '../../../../Core/src/utils/applicationWorkflowStatus';

const OperationsApplicationContext = createContext(null);

function readValue(record, ...keys) {
  for (const key of keys) {
    if (record?.[key] !== undefined && record?.[key] !== null) return record[key];
  }
  return null;
}

function unwrapRecord(value) {
  if (!value || typeof value !== 'object') return {};
  if (value.value && typeof value.value === 'object' && !Array.isArray(value.value)) return value.value;
  if (value.result && typeof value.result === 'object' && !Array.isArray(value.result)) return value.result;
  if (value.data && typeof value.data === 'object' && !Array.isArray(value.data)) return value.data;
  return value;
}

function normalizeOperationsProfile(value, storedUser) {
  const source = unwrapRecord(value);
  const fallbackOperationsUserId = readValue(
    storedUser,
    'operationsUserId',
    'OperationsUserId',
    'legacyId',
    'LegacyId',
  );

  return {
    ...source,
    operationsUserId: readValue(source, 'operationsUserId', 'OperationsUserId', 'id', 'Id') ?? fallbackOperationsUserId,
    fullName: readValue(source, 'fullName', 'FullName', 'name', 'Name', 'displayName') || '',
    employeeCode: readValue(source, 'employeeCode', 'EmployeeCode', 'staffCode', 'StaffCode') || '',
    roleCode: readValue(source, 'roleCode', 'RoleCode') || readValue(storedUser, 'roleCode', 'RoleCode') || '',
    roleName: readValue(source, 'roleName', 'RoleName', 'role', 'Role') || '',
  };
}

function normalizeQueueApplication(record) {
  if (!record || typeof record !== 'object') return null;
  const source = unwrapRecord(record);
  const agentCustomerId = readValue(source, 'agentCustomerId', 'AgentCustomerId');
  if (agentCustomerId === null) return null;
  const sourceWorkflowStatus = extractWorkflowStatus(source);
  const recordWorkflowStatus = extractWorkflowStatus(record);
  const workflowStatus = sourceWorkflowStatus.hasDetailedWorkflowStatus
    ? sourceWorkflowStatus
    : recordWorkflowStatus;

  return {
    ...source,
    agentCustomerId: String(agentCustomerId),
    fullName: String(readValue(source, 'fullName', 'FullName') || '').trim(),
    loanAccountNumber: String(readValue(source, 'loanAccountNumber', 'LoanAccountNumber') || ''),
    operationsStatus: String(readValue(source, 'operationsStatus', 'OperationsStatus') || ''),
    statusChangedAt: readValue(source, 'statusChangedAt', 'StatusChangedAt'),
    profileImagePath: String(readValue(source, 'profileImagePath', 'ProfileImagePath') || ''),
    workflowStatus,
    workflowStatusCode: workflowStatus.workflowStatusCode,
    workflowStatusName: workflowStatus.workflowStatusName,
  };
}

function normalizeApplication(record, requestedId) {
  const source = record?.application || record?.Application || record;
  if (!source || typeof source !== 'object') return null;

  const agentCustomerId = readValue(source, 'agentCustomerId', 'AgentCustomerId') ?? requestedId;
  const sourceWorkflowStatus = extractWorkflowStatus(source);
  const recordWorkflowStatus = extractWorkflowStatus(record);
  const workflowStatus = sourceWorkflowStatus.hasDetailedWorkflowStatus
    ? sourceWorkflowStatus
    : recordWorkflowStatus;
  return {
    ...source,
    agentCustomerId: String(agentCustomerId),
    applicationProductDetailsId: readValue(source, 'applicationProductDetailsId', 'ApplicationProductDetailsId'),
    appId: readValue(source, 'appId', 'AppId'),
    customerCode: readValue(source, 'customerCode', 'CustomerCode'),
    fullName: readValue(source, 'fullName', 'FullName') || '',
    loanStartDate: readValue(source, 'loanStartDate', 'LoanStartDate'),
    agentId: readValue(source, 'agentId', 'AgentId'),
    agentName: readValue(source, 'agentName', 'AgentName') || '',
    agentCode: readValue(source, 'agentCode', 'AgentCode') || '',
    rmId: readValue(source, 'rmId', 'RmId', 'RMId'),
    rmName: readValue(source, 'rmName', 'RmName', 'RMName') || '',
    rmCode: readValue(source, 'rmCode', 'RmCode', 'RMCode') || '',
    createdByRole: readValue(source, 'createdByRole', 'CreatedByRole'),
    createdByUserId: readValue(source, 'createdByUserId', 'CreatedByUserId'),
    status: readValue(source, 'status', 'Status'),
    operationsStatus: readValue(source, 'operationsStatus', 'OperationsStatus'),
    loanAccountNumber: readValue(source, 'loanAccountNumber', 'LoanAccountNumber'),
    profileImagePath: readValue(source, 'profileImagePath', 'ProfileImagePath') || '',
    assignedMakerStaffId: readValue(source, 'assignedMakerStaffId', 'AssignedMakerStaffId'),
    workflowStatus,
    workflowStatusCode: workflowStatus.workflowStatusCode,
    workflowStatusName: workflowStatus.workflowStatusName,
  };
}

function errorMessage(error) {
  const status = error?.response?.status;
  if (status === 401 || status === 403) return 'You are not authorized to access this application.';
  if (status === 404) return 'This application was not found or is no longer available to you.';
  return error?.response?.data?.message || error?.response?.data?.title || error?.message || 'Unable to load this application.';
}

const EMPTY_QUEUE_STATE = {
  status: 'idle',
  newApplications: [],
  pendingApplications: [],
  newTotal: null,
  pendingTotal: null,
  error: '',
};

function getIdentityKey(roleCode, storedUser) {
  return [
    roleCode || '',
    readValue(storedUser, 'operationsUserId', 'OperationsUserId', 'legacyId', 'LegacyId') || '',
    readValue(storedUser, 'staffId', 'StaffId') || '',
    readValue(storedUser, 'employeeCode', 'EmployeeCode', 'staffCode', 'StaffCode') || '',
  ].join(':');
}

export function OperationsApplicationProvider({ children }) {
  const [searchParams] = useSearchParams();
  const applicationId = searchParams.get('applicationId')?.trim() || '';
  const requestIdRef = useRef(0);
  const [state, setState] = useState({ status: 'idle', application: null, error: '' });
  const [identityRevision, setIdentityRevision] = useState(0);
  const roleCode = useMemo(() => getStoredRoleCode(['MAKER', 'CHECKER']), [identityRevision]);
  const storedUser = useMemo(() => getStoredUser(['MAKER', 'CHECKER']), [identityRevision]);
  const identityKey = getIdentityKey(roleCode, storedUser);
  const profileRequestIdRef = useRef(0);
  const profileRefreshPromiseRef = useRef(null);
  const profileRefreshKeyRef = useRef(null);
  const [profileState, setProfileState] = useState({ status: 'idle', profile: null, error: null });
  const queueRequestIdRef = useRef(0);
  const queueRefreshPromiseRef = useRef(null);
  const queueRefreshKeyRef = useRef(null);
  const [queueState, setQueueState] = useState(EMPTY_QUEUE_STATE);

  useEffect(() => {
    const refreshIdentity = () => setIdentityRevision((revision) => revision + 1);
    const handleStorage = (event) => {
      if (
        event.key === null
        || event.key === 'sivels_currentUser'
        || event.key === 'sivels_logout_event'
        || event.key?.startsWith('sivels_session_')
      ) {
        refreshIdentity();
      }
    };

    window.addEventListener(PERMISSIONS_CHANGED_EVENT, refreshIdentity);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(PERMISSIONS_CHANGED_EVENT, refreshIdentity);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const refreshProfile = useCallback(() => {
    if (!roleCode) {
      profileRequestIdRef.current += 1;
      profileRefreshPromiseRef.current = null;
      profileRefreshKeyRef.current = null;
      setProfileState({ status: 'idle', profile: null, error: null });
      return Promise.resolve(null);
    }

    if (profileRefreshPromiseRef.current && profileRefreshKeyRef.current === identityKey) {
      return profileRefreshPromiseRef.current;
    }

    const requestId = ++profileRequestIdRef.current;
    profileRefreshKeyRef.current = identityKey;
    setProfileState((current) => ({ ...current, status: 'loading', error: null }));

    let requestPromise;
    requestPromise = operationsService.getCurrentUser()
      .then((response) => {
        if (requestId !== profileRequestIdRef.current) return null;
        const profile = normalizeOperationsProfile(response, storedUser);
        setProfileState({ status: 'ready', profile, error: null });
        return profile;
      })
      .catch((error) => {
        if (requestId === profileRequestIdRef.current) {
          setProfileState({ status: 'error', profile: null, error });
        }
        return null;
      })
      .finally(() => {
        if (profileRefreshPromiseRef.current === requestPromise) {
          profileRefreshPromiseRef.current = null;
          profileRefreshKeyRef.current = null;
        }
      });

    profileRefreshPromiseRef.current = requestPromise;
    return requestPromise;
  }, [identityKey, roleCode, storedUser]);

  const refreshQueue = useCallback(() => {
    if (roleCode !== 'MAKER') {
      queueRequestIdRef.current += 1;
      queueRefreshPromiseRef.current = null;
      queueRefreshKeyRef.current = null;
      setQueueState(EMPTY_QUEUE_STATE);
      return Promise.resolve(null);
    }

    if (queueRefreshPromiseRef.current && queueRefreshKeyRef.current === identityKey) {
      return queueRefreshPromiseRef.current;
    }

    const requestId = ++queueRequestIdRef.current;
    queueRefreshKeyRef.current = identityKey;
    setQueueState((current) => ({ ...current, status: 'loading', error: '' }));

    let requestPromise;
    requestPromise = Promise.all([
      operationsApplicationService.getQueueApplications('NEW'),
      operationsApplicationService.getQueueApplications('PENDING'),
    ])
      .then(([newQueue, pendingQueue]) => {
        if (requestId !== queueRequestIdRef.current) return null;

        const newApplications = newQueue.items.map(normalizeQueueApplication).filter(Boolean);
        const pendingApplications = pendingQueue.items.map(normalizeQueueApplication).filter(Boolean);
        setQueueState({
          status: 'ready',
          newApplications,
          pendingApplications,
          newTotal: newQueue.total ?? newApplications.length,
          pendingTotal: pendingQueue.total ?? pendingApplications.length,
          error: '',
        });
        return { newApplications, pendingApplications };
      })
      .catch((error) => {
        if (requestId === queueRequestIdRef.current) {
          setQueueState({ ...EMPTY_QUEUE_STATE, status: 'error', error });
        }
        return null;
      })
      .finally(() => {
        if (queueRefreshPromiseRef.current === requestPromise) {
          queueRefreshPromiseRef.current = null;
          queueRefreshKeyRef.current = null;
        }
      });

    queueRefreshPromiseRef.current = requestPromise;
    return requestPromise;
  }, [identityKey, roleCode]);

  const loadApplication = useCallback(async () => {
    if (!applicationId) {
      setState({ status: 'missing', application: null, error: 'A valid application must be selected before opening the Maker workflow.' });
      return;
    }

    const requestId = ++requestIdRef.current;
    setState({ status: 'loading', application: null, error: '' });

    try {
      const response = await operationsApplicationService.getApplicationById(applicationId);
      if (requestId !== requestIdRef.current) return;

      const application = normalizeApplication(response, applicationId);
      if (!application || String(application.agentCustomerId) !== String(applicationId)) {
        setState({ status: 'error', application: null, error: 'This application could not be validated for the Maker workflow.' });
        return;
      }

      setState({ status: 'ready', application, error: '' });
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setState({ status: 'error', application: null, error: errorMessage(error) });
    }
  }, [applicationId]);

  useEffect(() => {
    loadApplication();
    return () => {
      requestIdRef.current += 1;
    };
  }, [loadApplication]);

  useEffect(() => {
    setProfileState({ status: 'idle', profile: null, error: null });
    setQueueState(roleCode === 'MAKER' ? { ...EMPTY_QUEUE_STATE, status: 'loading' } : EMPTY_QUEUE_STATE);

    if (!roleCode) {
      profileRequestIdRef.current += 1;
      queueRequestIdRef.current += 1;
      return undefined;
    }
    refreshProfile();
    refreshQueue();
  }, [identityRevision, identityKey, roleCode, refreshProfile, refreshQueue]);

  useEffect(() => () => {
    profileRequestIdRef.current += 1;
    queueRequestIdRef.current += 1;
    profileRefreshPromiseRef.current = null;
    queueRefreshPromiseRef.current = null;
    profileRefreshKeyRef.current = null;
    queueRefreshKeyRef.current = null;
  }, []);

  const value = useMemo(() => ({
    applicationId,
    application: state.application,
    status: state.status,
    error: state.error,
    retry: loadApplication,
    profile: profileState.profile,
    profileLoading: profileState.status === 'loading' || profileState.status === 'idle',
    profileError: profileState.error,
    reloadProfile: refreshProfile,
    queueStatus: queueState.status,
    queueError: queueState.error,
    newApplications: queueState.newApplications,
    pendingApplications: queueState.pendingApplications,
    newApplicationCount: queueState.status === 'ready' ? queueState.newTotal : null,
    pendingApplicationCount: queueState.status === 'ready' ? queueState.pendingTotal : null,
    refreshQueue,
  }), [applicationId, loadApplication, profileState, queueState, refreshProfile, refreshQueue, state]);

  return (
    <OperationsApplicationContext.Provider value={value}>
      {children}
    </OperationsApplicationContext.Provider>
  );
}

export function useOperationsApplication() {
  const context = useContext(OperationsApplicationContext);
  if (!context) throw new Error('useOperationsApplication must be used within OperationsApplicationProvider');
  return context;
}
