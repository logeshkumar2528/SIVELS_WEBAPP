import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { LoadingProvider } from '../../../Core/src/context/LoadingContext';
import AppRoutes from './routes/AppRoutes';

function App() {
  return (
    <LoadingProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <AppRoutes />
      </BrowserRouter>
    </LoadingProvider>
  );
}

export default App;
