import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  // Tokens and the tab role are also kept per tab in sessionStorage; tests only reset localStorage.
  sessionStorage.clear();
});
