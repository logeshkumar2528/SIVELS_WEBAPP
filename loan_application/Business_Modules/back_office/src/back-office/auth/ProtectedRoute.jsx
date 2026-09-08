/**
 * ProtectedRoute.jsx
 * --------------------
 * Auth Guard component for Back Office module routes.
 * Redirects unauthenticated users directly to the common /login route.
 */

import React, { useEffect } from 'react';
import { isBackOfficeAuthenticated } from './authStorage';

export default function ProtectedRoute({ children }) {
  const authenticated = isBackOfficeAuthenticated();

  useEffect(() => {
    if (!authenticated) {
      window.location.href = '/login';
    }
  }, [authenticated]);

  if (!authenticated) {
    return null;
  }

  return children;
}
