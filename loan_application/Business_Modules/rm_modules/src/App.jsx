import { BrowserRouter } from 'react-router-dom';
import { RmModuleRoutes } from './index';
import { AuthProvider } from '../../../Core/src/context/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <RmModuleRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
