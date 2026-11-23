import RequireAuth from '../../../../Core/src/auth/RequireAuth';

export default function OperationsGuard({ allowedRoles, children }) {
  return (
    <RequireAuth allowedRoles={allowedRoles}>
      {children}
    </RequireAuth>
  );
}
