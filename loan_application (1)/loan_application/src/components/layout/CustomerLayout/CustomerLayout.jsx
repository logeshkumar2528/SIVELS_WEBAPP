import { Outlet } from 'react-router-dom';
import AppShell from '../AppShell/AppShell';

const CustomerLayout = () => {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
};

export default CustomerLayout;
