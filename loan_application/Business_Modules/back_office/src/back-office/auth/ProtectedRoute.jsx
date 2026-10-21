/**
 * ProtectedRoute.jsx
 * --------------------
 * Auth Guard component for Back Office module routes.
 * Requires a session token and the BACK_OFFICE role; other roles are sent to their own
 * landing page and signed-out users to the common /login route.
 */

import React from 'react';
import RequireAuth from '../../../../../Core/src/auth/RequireAuth';

const BACK_OFFICE_ROLES = ['BACK_OFFICE'];

export default function ProtectedRoute({ children }) {
  return <RequireAuth allowedRoles={BACK_OFFICE_ROLES}>{children}</RequireAuth>;
}
