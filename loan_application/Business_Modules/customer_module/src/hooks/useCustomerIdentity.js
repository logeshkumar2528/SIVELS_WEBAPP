import { useState, useEffect } from 'react';
import axiosInstance from '../../../../Core/src/api/axiosInstance';

/**
 * Safely normalizes customer record supporting both camelCase and PascalCase
 */
function normalizeCustomerRecord(raw) {
  if (!raw || typeof raw !== 'object') return null;

  return {
    ...raw,
    agentCustomerId: raw.agentCustomerId ?? raw.AgentCustomerId ?? raw.customerId ?? raw.CustomerId ?? raw.id ?? raw.Id,
    fullName: raw.fullName ?? raw.FullName ?? '',
    mobileNumber: raw.mobileNumber ?? raw.MobileNumber ?? '',
    email: raw.email ?? raw.Email ?? null,
    expectedLoanAmount: raw.expectedLoanAmount ?? raw.ExpectedLoanAmount ?? null,
    loanPurposeName: raw.loanPurposeName ?? raw.LoanPurposeName ?? '',
    employmentTypeName: raw.employmentTypeName ?? raw.EmploymentTypeName ?? '',
    status: raw.status ?? raw.Status ?? '',
    agentName: raw.agentName ?? raw.AgentName ?? '',
    agentId: raw.agentId ?? raw.AgentId ?? null,
    remarks: raw.remarks ?? raw.Remarks ?? '',
  };
}

export function useCustomerIdentity() {
  // Read immediately from localStorage to avoid initial render flicker
  const [customerData, setCustomerData] = useState(() => {
    try {
      const stored = localStorage.getItem('customerData') || localStorage.getItem('sivels_currentUser');
      if (stored) {
        const parsed = JSON.parse(stored);
        return normalizeCustomerRecord(parsed);
      }
      return null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(!customerData);

  useEffect(() => {
    let isMounted = true;

    async function fetchFreshCustomer() {
      let storedCustomer = null;
      try {
        const raw = localStorage.getItem('customerData') || localStorage.getItem('sivels_currentUser');
        if (raw) {
          storedCustomer = JSON.parse(raw);
        }
      } catch (err) {
        console.error('[useCustomerIdentity] Error reading session:', err);
      }

      if (!storedCustomer) {
        if (isMounted) {
          setCustomerData(null);
          setLoading(false);
        }
        return;
      }

      const customerId = storedCustomer.agentCustomerId ?? storedCustomer.AgentCustomerId ?? storedCustomer.customerId ?? storedCustomer.id ?? localStorage.getItem('customerId');
      const mobile = storedCustomer.mobileNumber ?? storedCustomer.MobileNumber;

      try {
        let freshData = null;

        // 1. If we have customer ID, fetch fresh record from GET /AgentAddCustomer/{id}
        if (customerId) {
          try {
            const res = await axiosInstance.get(`/AgentAddCustomer/${customerId}`);
            freshData = res.data?.value ?? res.data ?? null;
          } catch (fetchErr) {
            console.warn('[useCustomerIdentity] Direct ID lookup failed:', fetchErr?.message);
          }
        }

        // 2. Fallback: match by mobile number from GET /AgentAddCustomer
        if (!freshData && mobile) {
          const res = await axiosInstance.get('/AgentAddCustomer');
          const rawList = res.data?.value ?? res.data ?? [];
          const list = Array.isArray(rawList) ? rawList : (rawList ? [rawList] : []);
          const cleanMobile = String(mobile).replace(/\D/g, '').slice(-10);

          freshData = list.find((item) => {
            const itemNum = String(item?.mobileNumber ?? item?.MobileNumber ?? '').replace(/\D/g, '').slice(-10);
            return itemNum === cleanMobile;
          });
        }

        if (isMounted) {
          if (freshData) {
            const merged = normalizeCustomerRecord({ ...storedCustomer, ...freshData });
            setCustomerData(merged);
            localStorage.setItem('customerData', JSON.stringify(merged));
          } else {
            setCustomerData(normalizeCustomerRecord(storedCustomer));
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('[useCustomerIdentity] Error refreshing customer data:', err);
        if (isMounted) {
          setCustomerData(normalizeCustomerRecord(storedCustomer));
          setLoading(false);
        }
      }
    }

    fetchFreshCustomer();

    return () => {
      isMounted = false;
    };
  }, []);

  return { customerData, loading };
}
