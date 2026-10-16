/**
 * App.jsx
 * --------------------
 * Root application component for the Credit Head module.
 * Mounts the module inside a BrowserRouter with basename `/credit-head`.
 */

import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import { LoadingProvider } from '../../../Core/src/context/LoadingContext';
import '../../back_office/src/back-office/styles/variables.css';

function App() {
  return (
    <LoadingProvider>
      <BrowserRouter basename="/credit-head">
        <AppRoutes />
      </BrowserRouter>
    </LoadingProvider>
  );
}

export default App;
