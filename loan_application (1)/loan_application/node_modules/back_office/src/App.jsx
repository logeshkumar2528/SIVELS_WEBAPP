/**
 * App.jsx
 * --------------------
 * Root application component.
 * Mounts the Back Office module inside a BrowserRouter.
 */

import { BrowserRouter } from 'react-router-dom';
import { BackOfficeRoutes } from './back-office/index';
import './back-office/styles/variables.css';

function App() {
  return (
    <BrowserRouter>
      <BackOfficeRoutes />
    </BrowserRouter>
  );
}

export default App;
