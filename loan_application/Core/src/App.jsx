import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import { AuthProvider } from './context/AuthContext';
import { LoadingProvider } from './context/LoadingContext';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import './styles/StandardUI.css';

function App() {
  return (
    <AuthProvider>
      <LoadingProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </BrowserRouter>
      </LoadingProvider>
    </AuthProvider>
  );
}

export default App;
