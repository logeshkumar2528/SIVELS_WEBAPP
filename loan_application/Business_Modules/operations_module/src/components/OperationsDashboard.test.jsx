import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  profileHook: {
    profile: { fullName: 'Maker User' },
    loading: false,
    error: null,
  },
  storedUser: { fullName: 'Stored User' },
}));

vi.mock('../../../../Core/src/auth/session', () => ({
  getStoredRoleCode: () => 'CHECKER',
  getStoredUser: () => mocks.storedUser,
}));

vi.mock('../hooks/useOperationsProfile', () => ({
  default: () => mocks.profileHook,
}));

vi.mock('../layouts/OperationsLayout', () => ({
  default: ({ children }) => <div data-testid="operations-layout">{children}</div>,
}));

vi.mock('./OperationsMakerDashboard', () => ({
  default: ({ displayName }) => <div data-testid="maker-dashboard">{displayName}</div>,
}));

import OperationsDashboard from './OperationsDashboard';

describe('OperationsDashboard role isolation', () => {
  beforeEach(() => {
    mocks.profileHook = {
      profile: { fullName: 'Maker User' },
      loading: false,
      error: null,
    };
  });

  it('renders the Maker dashboard branch only for Maker role', () => {
    render(<OperationsDashboard roleCode="MAKER" />);

    expect(screen.getByTestId('maker-dashboard')).toHaveTextContent('Maker User');
    expect(screen.queryByText('Application workspace')).not.toBeInTheDocument();
  });

  it('preserves the existing Checker dashboard branch', () => {
    render(<OperationsDashboard roleCode="CHECKER" />);

    expect(screen.queryByTestId('maker-dashboard')).not.toBeInTheDocument();
    expect(screen.getByText('Application workspace')).toBeInTheDocument();
    expect(screen.getByText(/Operations application APIs are not available/)).toBeInTheDocument();
  });
});
