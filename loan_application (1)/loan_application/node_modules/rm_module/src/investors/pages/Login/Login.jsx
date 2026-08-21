import { useState } from 'react';
import iconMap from '../../config/iconMap';
import './Login.css';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const IndianRupee = iconMap['IndianRupee'];
  const UserIcon = iconMap['User'];
  const LockIcon = iconMap['Lock'];
  const EyeIcon = iconMap['Eye'];
  const AlertCircle = iconMap['AlertTriangle'] || iconMap['Info'];

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      const userToLogin = username.trim() || 'investor';
      onLoginSuccess && onLoginSuccess({ username: userToLogin });
    }, 300);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="brand-logo">
            {IndianRupee ? <IndianRupee size={24} color="#ffffff" /> : 'S'}
          </div>
          <h1 className="login-title">SIVELS FINANCE</h1>
          <p className="login-subtitle">Investor Portal Sign In</p>
        </div>

        {error && (
          <div className="login-error-alert">
            {AlertCircle && <AlertCircle size={16} />}
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label">Username</label>
            <div className="input-wrap">
              {UserIcon && <UserIcon size={16} className="input-icon" />}
              <input
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="form-input"
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-wrap">
              {LockIcon && <LockIcon size={16} className="input-icon" />}
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
              />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {EyeIcon && <EyeIcon size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="login-submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
