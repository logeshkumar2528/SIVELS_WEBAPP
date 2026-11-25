import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import operationsApplicationService from '../services/operationsApplicationService';

const OperationsApplicationContext = createContext(null);

function readValue(record, ...keys) {
  for (const key of keys) {
    if (record?.[key] !== undefined && record?.[key] !== null) return record[key];
  }
  return null;
}

function normalizeApplication(record, requestedId) {
  const source = record?.application || record?.Application || record;
  if (!source || typeof source !== 'object') return null;

  const agentCustomerId = readValue(source, 'agentCustomerId', 'AgentCustomerId') ?? requestedId;
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
  };
}

function errorMessage(error) {
  const status = error?.response?.status;
  if (status === 401 || status === 403) return 'You are not authorized to access this application.';
  if (status === 404) return 'This application was not found or is no longer available to you.';
  return error?.response?.data?.message || error?.response?.data?.title || error?.message || 'Unable to load this application.';
}

export function OperationsApplicationProvider({ children }) {
  const [searchParams] = useSearchParams();
  const applicationId = searchParams.get('applicationId')?.trim() || '';
  const requestIdRef = useRef(0);
  const [state, setState] = useState({ status: 'idle', application: null, error: '' });

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

  const value = useMemo(() => ({
    applicationId,
    application: state.application,
    status: state.status,
    error: state.error,
    retry: loadApplication,
  }), [applicationId, loadApplication, state]);

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
