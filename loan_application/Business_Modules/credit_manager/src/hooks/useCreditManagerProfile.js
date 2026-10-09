/**
 * useCreditManagerProfile.js
 * --------------------
 * The session is used only to resolve the authenticated profile ID. Displayed
 * profile values always come from `GET /CreditManagerMaster/:id`.
 *
 * Returns:
 *   { profile, loading, error, refetch }
 */

import { useState, useEffect, useCallback } from 'react';
import creditManagerService from '../api/creditManagerService';
import { mapCreditManagerProfile } from '../mappers/creditMapper';
import { getCreditManagerId } from '../auth/authStorage';

const INITIAL_PROFILE = {
  id: '',
  creditManagerId: null,
  creditManagerCode: 'Not Available',
  fullName: 'Not Available',
  mobileNumber: 'Not Available',
  emailAddress: 'Not Available',
  branch: 'Not Available',
  role: 'Credit Manager',
  status: 'Active',
  isActive: true,
};

export function useCreditManagerProfile() {
  const [profile, setProfile] = useState(INITIAL_PROFILE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (isActive = () => true) => {
    setLoading(true);
    setError(null);

    try {
      const targetId = getCreditManagerId();
      if (!targetId) {
        if (isActive()) setError('No active Credit Manager session found. Please log in again.');
        return;
      }

      const apiResponse = await creditManagerService.getCreditManagerProfile(targetId);
      const liveProfile = mapCreditManagerProfile(apiResponse);
      if (!liveProfile) {
        throw new Error('The profile API returned an empty response.');
      }
      if (isActive()) setProfile(liveProfile);
    } catch (err) {
      if (isActive()) {
        setError(err?.response?.data?.message || err?.message || 'Failed to load profile details.');
      }
    } finally {
      if (isActive()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    load(() => active);
    return () => {
      active = false;
    };
  }, [load]);

  return {
    profile,
    loading,
    error,
    refetch: () => load(),
  };
}

export default useCreditManagerProfile;
