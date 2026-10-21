import { BrowserRouter } from 'react-router-dom';
import { RmModuleRoutes } from './index';
import { LoadingProvider } from '../../../Core/src/context/LoadingContext';
import RequireAuth from '../../../Core/src/auth/RequireAuth';

export default function App() {
  return (
    <LoadingProvider>
      <BrowserRouter>
        <RequireAuth allowedRoles={['RM']}>
          <RmModuleRoutes />
        </RequireAuth>
      </BrowserRouter>
    </LoadingProvider>
  );
}
