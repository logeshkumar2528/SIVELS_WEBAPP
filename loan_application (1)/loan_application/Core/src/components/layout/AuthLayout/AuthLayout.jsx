import LeftPanel from '../LeftPanel/LeftPanel';
import './AuthLayout.css';

const AuthLayout = ({ children, theme }) => {
  if (theme === 'signup') {
    // Full-bleed gradient, single centered column — no split panel, no white card.
    return (
      <div className="auth-layout auth-layout--signup">
        <div className="auth-fullbleed">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={`auth-layout ${theme ? `auth-layout--${theme}` : ''}`}>
      <div className="auth-container">
        <div className="auth-content">
          <div className="auth-left">
            <LeftPanel />
          </div>

          <div className="auth-right">
            <div className="auth-form-container">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;