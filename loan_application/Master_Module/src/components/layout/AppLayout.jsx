import { Outlet } from 'react-router-dom';
import { Navbar } from '../navbar/Navbar';
import '../../styles/masters-page.css';
import './AppLayout.css';

export function AppLayout() {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
