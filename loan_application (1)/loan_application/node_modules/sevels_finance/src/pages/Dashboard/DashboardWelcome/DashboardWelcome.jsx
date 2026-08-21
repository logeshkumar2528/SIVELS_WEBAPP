import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout/DashboardLayout';
import { CheckCircle2, X } from 'lucide-react';
import './DashboardWelcome.css';

const DashboardWelcome = () => {
  const location = useLocation();
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (location.state?.showLoginSuccess) {
      setShowToast(true);
      
      // Clean up the state so it doesn't reappear on refresh
      window.history.replaceState({}, document.title);

      const timer = setTimeout(() => {
        setShowToast(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [location]);

  return (
    <DashboardLayout title="Dashboard" hideSidebar={true}>
      <div className="dash-wrap">
        {showToast && (
          <div className="login-success-toast">
            <CheckCircle2 size={20} className="toast-icon" />
            <div className="toast-content">
              <span className="toast-title">Login Successfully</span>
              <span className="toast-desc">Welcome securely to your financial dashboard.</span>
            </div>
            <button type="button" className="toast-close" onClick={() => setShowToast(false)}>
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardWelcome;
