import { useState, useEffect, useCallback, useRef } from 'react';
import axiosInstance from '../../../../Core/src/api/axiosInstance';
import { getAccessToken } from '../../../../Core/src/auth/tokenStore';

/**
 * Normalizes customer record supporting both camelCase and PascalCase
 */
function normalizeCustomerRecord(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const rawCustomerId =
    raw.agentCustomerId ??
    raw.AgentCustomerId ??
    raw.customerId ??
    raw.CustomerId ??
    raw.id ??
    raw.Id ??
    null;

  return {
    ...raw,
    agentCustomerId: rawCustomerId != null ? Number(rawCustomerId) : null,
    customerCode: raw.customerCode ?? raw.CustomerCode ?? raw.customer_code ?? null,
    fullName: (raw.fullName ?? raw.FullName ?? '').trim(),
    mobileNumber: raw.mobileNumber ?? raw.MobileNumber ?? '',
    email: raw.email ?? raw.Email ?? null,
    expectedLoanAmount: raw.expectedLoanAmount ?? raw.ExpectedLoanAmount ?? null,
    loanPurposeName: raw.loanPurposeName ?? raw.LoanPurposeName ?? '',
    employmentTypeName: raw.employmentTypeName ?? raw.EmploymentTypeName ?? '',
    employmentTypeId: raw.employmentTypeId ?? raw.EmploymentTypeId ?? null,
    status: raw.status ?? raw.Status ?? null,
    agentName: raw.agentName ?? raw.AgentName ?? '',
    agentId: raw.agentId ?? raw.AgentId ?? null,
    remarks: raw.remarks ?? raw.Remarks ?? '',
    createdAt: raw.createdAt ?? raw.CreatedAt ?? raw.createdDate ?? raw.CreatedDate ?? null,
    kycStatus: raw.kycStatus ?? raw.KycStatus ?? null,
    appId: raw.appId ?? raw.AppId ?? raw.App_Id ?? null,
  };
}

/**
 * Safely extracts server-confirmed agentCustomerId from GET /auth/me response.
 */
function extractServerConfirmedCustomerId(meData) {
  if (!meData || typeof meData !== 'object') return null;

  const rawId =
    meData.agentCustomerId ??
    meData.AgentCustomerId ??
    meData.customer?.agentCustomerId ??
    meData.customer?.AgentCustomerId ??
    meData.customer?.customerId ??
    meData.customer?.id ??
    (String(meData.legacyType || '').toLowerCase() === 'customer' ? meData.legacyId : null) ??
    meData.customerId ??
    meData.CustomerId ??
    null;

  const num = Number(rawId);
  return rawId !== null && rawId !== undefined && rawId !== '' && Number.isFinite(num) && num > 0
    ? num
    : null;
}

// Session-isolated in-memory cache and promise deduplicator
const CACHE_TTL_MS = 30000; // 30-second TTL allows automatic fresh status updates without hard reload

let cachedCustomerData = null;
let cachedSessionToken = null;
let cachedCustomerId = null;
let cachedTimestamp = 0;

let activeFetchPromise = null;
let activeFetchToken = null;

/**
 * Reset module cache (called on auth failure or identity change)
 */
export function clearCustomerIdentityCache() {
  cachedCustomerData = null;
  cachedSessionToken = null;
  cachedCustomerId = null;
  cachedTimestamp = 0;
  activeFetchPromise = null;
  activeFetchToken = null;
}

/**
 * Validates whether cached data matches the currently authenticated session token and is within TTL.
 */
function isSessionCacheValid(currentToken) {
  if (!currentToken || !cachedCustomerData || !cachedSessionToken) {
    return false;
  }
  if (currentToken !== cachedSessionToken) {
    return false;
  }
  if (Date.now() - cachedTimestamp > CACHE_TTL_MS) {
    return false;
  }
  return true;
}

/**
 * Resolves authenticated customer identity from GET /auth/me and then
 * fetches the authoritative customer record from GET /AgentAddCustomer/:agentCustomerId.
 *
 * Guarantees:
 * - Scoped strictly to the active session token (never shared across accounts).
 * - Discards responses if the active token changed while in-flight.
 * - Deduplicates concurrent calls under the same session token.
 * - Clears cache on authentication failure.
 */
async function fetchAuthoritativeCustomer(forceRefresh = false) {
  const currentToken = getAccessToken();

  if (!currentToken) {
    clearCustomerIdentityCache();
    return null;
  }

  // Invalidate cache immediately if session token changed
  if (cachedSessionToken && cachedSessionToken !== currentToken) {
    clearCustomerIdentityCache();
  }

  // Return fresh session cache if valid and not forcing refresh
  if (!forceRefresh && isSessionCacheValid(currentToken)) {
    return cachedCustomerData;
  }

  // Reuse existing in-flight promise if it was started under the identical token
  if (!forceRefresh && activeFetchPromise && activeFetchToken === currentToken) {
    return activeFetchPromise;
  }

  activeFetchToken = currentToken;
  activeFetchPromise = (async () => {
    // 1. Resolve server-confirmed identity from /auth/me
    let meRes;
    try {
      meRes = await axiosInstance.get('/auth/me');
    } catch (err) {
      console.warn('[useCustomerIdentity] /auth/me lookup failed:', err?.message || err);
      clearCustomerIdentityCache();
      throw err;
    }

    // Verify session token did not change while /auth/me was in flight
    if (getAccessToken() !== currentToken) {
      return null;
    }

    const meData = meRes?.data || {};
    const confirmedId = extractServerConfirmedCustomerId(meData);

    if (!confirmedId) {
      console.warn('[useCustomerIdentity] No server-confirmed agentCustomerId found in /auth/me response');
      clearCustomerIdentityCache();
      return null;
    }

    // 2. Fetch authoritative customer details strictly using the server-confirmed ID
    let rawCustomer = null;
    try {
      const res = await axiosInstance.get(`/AgentAddCustomer/${encodeURIComponent(confirmedId)}`);
      rawCustomer = res.data?.value ?? res.data ?? null;
    } catch (fetchErr) {
      console.warn('[useCustomerIdentity] Fetch /AgentAddCustomer/:id failed:', fetchErr?.message || fetchErr);
      clearCustomerIdentityCache();
      throw fetchErr;
    }

    // Verify session token did not change while /AgentAddCustomer was in flight
    if (getAccessToken() !== currentToken) {
      return null;
    }

    if (!rawCustomer) {
      clearCustomerIdentityCache();
      return null;
    }

    const normalized = normalizeCustomerRecord({
      ...rawCustomer,
      agentCustomerId: confirmedId,
      // Supplement mobile number from /auth/me if omitted in customer record
      mobileNumber: rawCustomer.mobileNumber || rawCustomer.MobileNumber || meData.mobileNumber || '',
    });

    // Update session-scoped cache
    cachedCustomerData = normalized;
    cachedSessionToken = currentToken;
    cachedCustomerId = confirmedId;
    cachedTimestamp = Date.now();

    // Maintain non-authoritative localStorage cache solely for backward compatibility with external code,
    // but never read it back as authoritative identity for future requests.
    try {
      localStorage.setItem('customerData', JSON.stringify(normalized));
      localStorage.setItem('customerId', String(confirmedId));
    } catch {}

    return normalized;
  })().finally(() => {
    activeFetchPromise = null;
    activeFetchToken = null;
  });

  return activeFetchPromise;
}

export function useCustomerIdentity() {
  const currentToken = getAccessToken();
  const hasValidCache = isSessionCacheValid(currentToken);

  const [customerData, setCustomerData] = useState(() => (hasValidCache ? cachedCustomerData : null));
  const [loading, setLoading] = useState(() => !hasValidCache);
  const [error, setError] = useState(null);

  const isMountedRef = useRef(true);

  const loadData = useCallback((force = false) => {
    const activeToken = getAccessToken();

    if (!activeToken) {
      clearCustomerIdentityCache();
      if (isMountedRef.current) {
        setCustomerData(null);
        setLoading(false);
        setError(null);
      }
      return Promise.resolve(null);
    }

    if (!force && isSessionCacheValid(activeToken)) {
      if (isMountedRef.current) {
        setCustomerData(cachedCustomerData);
        setLoading(false);
        setError(null);
      }
      return Promise.resolve(cachedCustomerData);
    }

    if (isMountedRef.current) {
      setLoading(true);
    }

    return fetchAuthoritativeCustomer(force)
      .then((data) => {
        if (!isMountedRef.current) return null;
        // Verify current token has not changed while request was processing
        if (getAccessToken() === activeToken) {
          setCustomerData(data);
          setError(null);
        }
        return data;
      })
      .catch((err) => {
        if (!isMountedRef.current) return null;
        console.error('[useCustomerIdentity] Error resolving customer identity:', err?.message || err);
        if (getAccessToken() === activeToken) {
          setCustomerData(null);
          setError(err);
        }
        throw err;
      })
      .finally(() => {
        if (isMountedRef.current && getAccessToken() === activeToken) {
          setLoading(false);
        }
      });
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    loadData(false);

    return () => {
      isMountedRef.current = false;
    };
  }, [loadData]);

  const refetch = useCallback(() => loadData(true), [loadData]);

  return { customerData, loading, error, refetch };
}
