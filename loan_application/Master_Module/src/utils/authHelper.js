import { getStoredUser } from '../../../Core/src/auth/session';

// Legacy Users-table id of the logged-in user (from the verify-otp response).
export const getCurrentUserId = () => {
  const userId = Number(getStoredUser()?.userId);
  return Number.isFinite(userId) && userId > 0 ? userId : null;
};
