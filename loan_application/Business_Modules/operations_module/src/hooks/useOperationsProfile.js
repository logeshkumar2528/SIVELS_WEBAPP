import { useCallback, useEffect, useState } from 'react';
import operationsService from '../services/operationsService';

export default function useOperationsProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const nextProfile = await operationsService.getCurrentUser();
      setProfile(nextProfile && typeof nextProfile === 'object' ? nextProfile : {});
    } catch (requestError) {
      setError(requestError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  return { profile, loading, error, reload: loadProfile };
}
