/**
 * useBackOfficeProfile.js
 * --------------------
 * Purpose:
 *   Custom hook for fetching, normalizing, and managing authenticated Back Office user profile data.
 *
 * Priority Strategy:
 *   - Priority 1: Use authenticated login session data from localStorage (`backOfficeData`, `sivels_currentUser`, `backOfficeAuth`)
 *                 if full profile is already present.
 *   - Priority 2: If only user ID / backOfficeId is present (or on page refresh), fetch fresh profile details
 *                 via `GET /BackOfficeMaster/:id` using `backOfficeService.getBackOfficeProfile(id)`.
 *   - Priority 3: Fall back safely to "Not Available" for missing fields. Zero dummy data used.
 *
 * Returns:
 *   { profile, loading, error, refetch }
 */

import { useState, useEffect, useCallback } from 'react';
import backOfficeService from '../api/backOfficeService';
import { mapBackOfficeProfile } from '../mappers/hierarchyMapper';

/**
 * Retrieve session user from browser localStorage across known authentication keys.
 */
function getStoredSessionUser() {
  try {
    const boDataRaw = localStorage.getItem('backOfficeData');
    if (boDataRaw) {
      const parsed = JSON.parse(boDataRaw);
      if (parsed && typeof parsed === 'object') return parsed;
    }

    const currentUserRaw = localStorage.getItem('sivels_currentUser');
    if (currentUserRaw) {
      const parsed = JSON.parse(currentUserRaw);
      if (parsed && typeof parsed === 'object') {
        // If stored as { backOffice: { ... } }
        if (parsed.backOffice) return parsed.backOffice;
        return parsed;
      }
    }

    const authRaw = localStorage.getItem('backOfficeAuth');
    if (authRaw) {
      const parsed = JSON.parse(authRaw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (err) {
    console.warn('[useBackOfficeProfile] Error parsing session storage:', err);
  }
  return null;
}

const INITIAL_PROFILE = {
  id: '',
  backOfficeId: null,
  backOfficeCode: 'Not Available',
  employeeCode: 'Not Available',
  fullName: 'Not Available',
  mobile: 'Not Available',
  mobileNumber: 'Not Available',
  email: 'Not Available',
  emailAddress: 'Not Available',
  branch: 'Not Available',
  role: 'Operations Team',
  status: 'Active',
  isActive: true,
};

export function useBackOfficeProfile() {
  const [profile, setProfile] = useState(INITIAL_PROFILE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async () => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    try {
      // 1. Check local session storage first (Priority 1)
      const sessionUser = getStoredSessionUser();
      let initialMapped = null;

      if (sessionUser) {
        initialMapped = mapBackOfficeProfile(sessionUser);
        if (initialMapped && isMounted) {
          setProfile(initialMapped);
        }
      }

      // 2. Extract authentic Back Office ID / User ID
      const targetId =
        sessionUser?.backOfficeId ??
        sessionUser?.BackOfficeId ??
        sessionUser?.userId ??
        sessionUser?.UserId ??
        sessionUser?.id ??
        sessionUser?.Id ??
        sessionUser?.backOffice?.backOfficeId;

      // 3. If authentic ID is available, fetch live profile from API (Priority 2)
      if (targetId) {
        try {
          const apiResponse = await backOfficeService.getBackOfficeProfile(targetId);
          if (!isMounted) return;

          if (apiResponse) {
            const liveProfile = mapBackOfficeProfile(apiResponse);
            if (liveProfile) {
              setProfile(liveProfile);

              // Update cached backOfficeData for offline / instant reload
              try {
                localStorage.setItem('backOfficeData', JSON.stringify(apiResponse));
              } catch {
                // Ignore storage quota errors
              }
              setLoading(false);
              return;
            }
          }
        } catch (apiErr) {
          // If API fails but we have sessionUser, log warning and use sessionUser
          if (initialMapped) {
            console.warn('[useBackOfficeProfile] Live profile lookup failed, using session data:', apiErr?.message);
            if (isMounted) setLoading(false);
            return;
          }
          throw apiErr;
        }
      }

      // If no ID and no sessionUser found
      if (!initialMapped && isMounted) {
        setError('No active Back Office session found. Please log in again.');
      }
    } catch (err) {
      if (isMounted) {
        const msg = err?.response?.data?.message || err?.message || 'Failed to load profile details.';
        setError(msg);
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    loading,
    error,
    refetch: fetchProfile,
  };
}

export default useBackOfficeProfile;
