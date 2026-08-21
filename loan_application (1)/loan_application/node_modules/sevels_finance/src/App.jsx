import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import RouteTransitionLoader from './components/common/Loading/RouteTransitionLoader';
import { AuthProvider } from './context/AuthContext';
import './styles/StandardUI.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <RouteTransitionLoader />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
