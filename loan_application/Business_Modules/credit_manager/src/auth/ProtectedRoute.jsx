/**
 * ProtectedRoute.jsx
 * --------------------
 * Auth Guard component for Credit Manager module routes.
 * Redirects unauthenticated users directly to the common /login route.
 */

import React, { useEffect } from 'react';
import { isCreditManagerAuthenticated } from './authStorage';

export default function ProtectedRoute({ children }) {
  const authenticated = isCreditManagerAuthenticated();

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
