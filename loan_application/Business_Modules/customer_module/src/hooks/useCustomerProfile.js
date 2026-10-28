import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchCustomerProfile,
  clearCustomerProfileCache,
} from '../services/customerProfileService';
import { getAccessToken } from '../../../../Core/src/auth/tokenStore';
import { useCustomerIdentity } from './useCustomerIdentity';

/**
 * Hook to provide authenticated customer profile data from GET /CustomerProfile/me.
 *
 * Guarantees:
 * - Scoped strictly to the active session token (session-isolated).
 * - Master tables (gender, marital status, employment type, loan products, relationships) resolved seamlessly.
 * - Graceful fallback to useCustomerIdentity in case the customer has not yet been migrated to /CustomerProfile/me.
 * - Handles 401/403 and clears state without leaking tokens or sensitive data.
 */
export function useCustomerProfile() {
  const currentToken = getAccessToken();
  const { customerData: fallbackIdentity, loading: identityLoading } = useCustomerIdentity();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isMountedRef = useRef(true);

  const loadProfile = useCallback((force = false) => {
    const activeToken = getAccessToken();

    if (!activeToken) {
      clearCustomerProfileCache();
      if (isMountedRef.current) {
        setProfile(null);
        setLoading(false);
        setError(null);
      }
      return Promise.resolve(null);
    }

    if (isMountedRef.current) {
      setLoading(true);
    }

    return fetchCustomerProfile(force)
      .then((data) => {
        if (!isMountedRef.current) return null;
        if (getAccessToken() === activeToken) {
          setProfile(data);
          setError(null);
        }
        return data;
      })
      .catch((err) => {
        if (!isMountedRef.current) return null;
        console.warn('[useCustomerProfile] /CustomerProfile/me fetch issue:', err?.message || err);
        if (getAccessToken() === activeToken) {
          setError(err);
        }
        return null;
      })
      .finally(() => {
        if (isMountedRef.current && getAccessToken() === activeToken) {
          setLoading(false);
        }
      });
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    loadProfile(false);

    return () => {
      isMountedRef.current = false;
    };
  }, [loadProfile]);

  const refetch = useCallback(() => loadProfile(true), [loadProfile]);

  return {
    profile,
    fallbackIdentity,
    loading: loading && (!profile && identityLoading),
    error,
    refetch,
  };
}

export default useCustomerProfile;
