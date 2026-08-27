import { BrowserRouter } from 'react-router-dom';
import { RmModuleRoutes } from './index';

export default function App() {
  return (
    <BrowserRouter>
      <RmModuleRoutes />
    </BrowserRouter>
  );
}
