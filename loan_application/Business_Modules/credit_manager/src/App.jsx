/**
 * App.jsx
 * --------------------
 * Root application component.
 * Mounts the Credit Manager module inside a BrowserRouter (basename `/credit`).
 */

import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import { CreditApplicationsProvider } from './context/CreditApplicationsContext';
import { LoadingProvider } from '../../../Core/src/context/LoadingContext';
import '../../back_office/src/back-office/styles/variables.css';

function App() {
  return (
    <LoadingProvider>
      <BrowserRouter basename="/credit">
        <CreditApplicationsProvider>
          <AppRoutes />
        </CreditApplicationsProvider>
      </BrowserRouter>
    </LoadingProvider>
  );
}

export default App;
