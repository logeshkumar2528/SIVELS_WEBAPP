/**
 * App.jsx
 * --------------------
 * Root application component.
 * Mounts the Back Office module inside a BrowserRouter.
 */

import { BrowserRouter } from 'react-router-dom';
import { BackOfficeRoutes } from './back-office/index';
import { LoadingProvider } from '../../../Core/src/context/LoadingContext';
import './back-office/styles/variables.css';

function App() {
  return (
    <LoadingProvider>
      <BrowserRouter>
        <BackOfficeRoutes />
      </BrowserRouter>
    </LoadingProvider>
  );
}

export default App;
