import { BrowserRouter } from 'react-router-dom';
import { RmModuleRoutes } from './index';
import { LoadingProvider } from '../../../Core/src/context/LoadingContext';

export default function App() {
  return (
    <LoadingProvider>
      <BrowserRouter>
        <RmModuleRoutes />
      </BrowserRouter>
    </LoadingProvider>
  );
}
