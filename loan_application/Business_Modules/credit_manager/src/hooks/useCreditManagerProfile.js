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
import { masterService } from '../../../../Core/src/services/masterService';

function unwrapLookup(response) {
  const value = response?.value ?? response?.data ?? response?.result ?? response;
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.value)) return value.value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.result)) return value.result;
  return [];
}

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

      const [profileResult, countriesResult, statesResult, districtsResult, citiesResult] = await Promise.allSettled([
        creditManagerService.getCreditManagerProfile(targetId),
        masterService.getCountries(),
        masterService.getStates(),
        masterService.getDistricts(),
        masterService.getCities(),
      ]);

      if (profileResult.status !== 'fulfilled') {
        throw profileResult.reason || new Error('Failed to load profile details.');
      }

      const lookupData = {
        countries: countriesResult.status === 'fulfilled' ? unwrapLookup(countriesResult.value) : [],
        states: statesResult.status === 'fulfilled' ? unwrapLookup(statesResult.value) : [],
        districts: districtsResult.status === 'fulfilled' ? unwrapLookup(districtsResult.value) : [],
        cities: citiesResult.status === 'fulfilled' ? unwrapLookup(citiesResult.value) : [],
      };

      const liveProfile = mapCreditManagerProfile(profileResult.value, lookupData);
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
