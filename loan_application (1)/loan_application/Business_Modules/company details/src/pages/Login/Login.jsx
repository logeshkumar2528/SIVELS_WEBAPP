import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  Shield,
  Building2,
  BarChart3,
  AlertCircle,
} from 'lucide-react'
import './Login.css'

function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.')
      return
    }

    setIsLoading(true)

    // Simulated login — replace with real API call
    setTimeout(() => {
      setIsLoading(false)
      if (username === 'admin' && password === 'admin123') {
        navigate('/company-info')
      } else {
        setError('Invalid username or password. Please try again.')
      }
    }, 1500)
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-card-header">
            <h2>Admin Login</h2>
            <p>Enter your credentials to continue</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            {/* Username */}
            <div className="login-field">
              <label htmlFor="login-username">Username</label>
              <div className="login-input-wrap">
                <User size={18} className="login-input-icon" />
                <input
                  id="login-username"
                  type="text"
                  className="login-input"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password */}
            <div className="login-field">
              <label htmlFor="login-password">Password</label>
              <div className="login-input-wrap">
                <Lock size={18} className="login-input-icon" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="login-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="login-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="login-error">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {/* Options Row */}
            <div className="login-options">
              <label className="login-remember">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me</span>
              </label>
              <a href="#" className="login-forgot">Forgot Password?</a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="login-submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="login-spinner" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="login-card-footer">
            <p>© 2025 <span>Sivels Finance</span>. All rights reserved.</p>
          </div>
        </div>
    </div>
  )
}

export default Login
