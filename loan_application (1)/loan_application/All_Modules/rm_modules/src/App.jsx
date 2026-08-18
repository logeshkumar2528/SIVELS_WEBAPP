import { BrowserRouter } from 'react-router-dom';
import { RmModuleRoutes } from './rm-module';

export default function App() {
  return (
    <BrowserRouter>
      <RmModuleRoutes />
    </BrowserRouter>
  );
}
