/**
 * useCreditHeadProfile.js
 * --------------------
 * The authenticated session is used only to resolve the target employee ID.
 * Displayed profile values always fetch live data from `GET /CreditHeadMaster/:id`.
 *
 * Returns:
 *   { profile, loading, error, refetch }
 */

import { useState, useEffect, useCallback } from 'react';
import creditHeadService from '../api/creditHeadService';
import { mapCreditHeadProfile } from '../mappers/creditHeadMapper';
import { getCreditHeadId } from '../auth/authStorage';
import { masterService } from '../../../../Core/src/services/masterService';

const INITIAL_PROFILE = {
  id: '',
  creditHeadId: null,
  creditHeadCode: '—',
  fullName: '—',
  mobileNumber: '—',
  emailAddress: '—',
  branch: '—',
  role: 'Credit Head',
  status: 'Active',
  isActive: true,
};

export function useCreditHeadProfile() {
  const [profile, setProfile] = useState(INITIAL_PROFILE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (isActive = () => true) => {
    setLoading(true);
    setError(null);

    try {
      const targetId = getCreditHeadId();
      if (!targetId) {
        if (isActive()) setError('No active Credit Head session found. Please log in again.');
        return;
      }

      // Fetch profile and master lookups in parallel for location & gender names
      const [apiResponse, gendersRes, statesRes, districtsRes, citiesRes] = await Promise.allSettled([
        creditHeadService.getCreditHeadProfile(targetId),
        masterService.getGenders(),
        masterService.getStates(),
        masterService.getDistricts(),
        masterService.getCities(),
      ]);

      if (apiResponse.status !== 'fulfilled' || !apiResponse.value) {
        throw new Error(apiResponse.reason?.response?.data?.message || apiResponse.reason?.message || 'Failed to fetch Credit Head profile.');
      }

      const lookupData = {
        genders: gendersRes.status === 'fulfilled' ? gendersRes.value : [],
        states: statesRes.status === 'fulfilled' ? statesRes.value : [],
        districts: districtsRes.status === 'fulfilled' ? districtsRes.value : [],
        cities: citiesRes.status === 'fulfilled' ? citiesRes.value : [],
      };

      const liveProfile = mapCreditHeadProfile(apiResponse.value, lookupData);
      if (!liveProfile) {
        throw new Error('The profile API returned an empty response.');
      }

      if (isActive()) {
        setProfile(liveProfile);
      }
    } catch (err) {
      if (isActive()) {
        setError(err?.response?.data?.message || err?.message || 'Failed to load profile details.');
      }
    } finally {
      if (isActive()) {
        setLoading(false);
      }
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

export default useCreditHeadProfile;
