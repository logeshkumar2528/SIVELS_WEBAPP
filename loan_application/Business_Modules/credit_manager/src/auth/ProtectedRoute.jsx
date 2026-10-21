/**
 * ProtectedRoute.jsx
 * --------------------
 * Auth Guard component for Credit Manager module routes.
 * Requires a session token and the CREDIT_MANAGER or CREDIT_HEAD role; other roles are sent
 * to their own landing page and signed-out users to the common /login route.
 */

import React from 'react';
import RequireAuth from '../../../../Core/src/auth/RequireAuth';

const CREDIT_ROLES = ['CREDIT_MANAGER', 'CREDIT_HEAD'];

export default function ProtectedRoute({ children }) {
  return <RequireAuth allowedRoles={CREDIT_ROLES}>{children}</RequireAuth>;
}
