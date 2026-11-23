import { BrowserRouter } from 'react-router-dom';
import { LoadingProvider } from '../../../Core/src/context/LoadingContext';
import AppRoutes from './routes/AppRoutes';

function App() {
  return (
    <LoadingProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </LoadingProvider>
  );
}

export default App;
