import { useState } from 'react';
import iconMap from '../../config/iconMap';
import './RmLogin.css';

export default function RmLogin({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const LockIcon = iconMap['Lock'];
  const UserIcon = iconMap['User'];

  const handleSubmit = (e) => {
    e.preventDefault();
    if ((username === 'rm' || username === 'admin' || username === 'demo') && password) {
      onLogin();
    } else if (username === '' || password === '') {
      setError('Please enter username and password');
    } else {
      // Allow demo login
      onLogin();
    }
  };

  return (
    <div className="rm-login-root">
      <div className="rm-login-card">
        <div className="rm-login-header">
          <div className="rm-login-logo">
            <span className="rm-login-logo-badge">S</span>
          </div>
          <h2 className="rm-login-title">Sivels Finance</h2>
          <p className="rm-login-subtitle">RM Back-Office Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="rm-login-form">
          {error && <div className="rm-login-error">{error}</div>}

          <div className="form-group">
            <label className="form-label">Username</label>
            <div className="input-with-icon">
              {UserIcon && <UserIcon size={18} className="input-icon" />}
              <input
                type="text"
                className="form-input input-padded"
                placeholder="Enter RM username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-with-icon">
              {LockIcon && <LockIcon size={18} className="input-icon" />}
              <input
                type="password"
                className="form-input input-padded"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="btn btn--primary btn--full btn--lg">
            Sign In to Portal
          </button>
        </form>

        <div className="rm-login-footer">
          <p className="text-muted">Demo Access: Username <strong>rm</strong> / Password <strong>rm123</strong></p>
        </div>
      </div>
    </div>
  );
}
