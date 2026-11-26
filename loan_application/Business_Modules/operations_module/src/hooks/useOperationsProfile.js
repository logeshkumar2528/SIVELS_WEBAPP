import { useOperationsApplication } from '../context/OperationsApplicationContext';

export default function useOperationsProfile() {
  const {
    profile,
    profileLoading,
    profileError,
    reloadProfile,
  } = useOperationsApplication();

  return {
    profile,
    loading: profileLoading,
    error: profileError,
    reload: reloadProfile,
  };
}
