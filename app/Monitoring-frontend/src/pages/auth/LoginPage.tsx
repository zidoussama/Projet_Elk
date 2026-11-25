import { useState } from 'react'
import type { FormEvent } from 'react'
import { BarChart3, Eye, EyeOff } from 'lucide-react'
import axios from 'axios'
import api from '../../api/axios'
import ForgetPassword from './ForgetPassword'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [isForgetPasswordOpen, setIsForgetPasswordOpen] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const { data } = await api.post('/auth/sign-in/email', {
        email,
        password,
        rememberMe,
      })

      if (data.twoFactorRedirect) {
        setError('Two-factor authentication is required for this account.')
        return
      }

      setSuccess('Signed in successfully.')
    } catch (submitError) {
      if (axios.isAxiosError<{ message?: string; error?: string }>(submitError)) {
        setError(
          submitError.response?.data.message ??
          submitError.response?.data.error ??
          'Unable to sign in. Please try again.',
        )
        return
      }

      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to sign in. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-showcase" aria-label="LogSight overview">
        <div className="showcase-brand">
          <BarChart3 size={17} strokeWidth={2.3} aria-hidden="true" />
          <span>LogSight</span>
        </div>

        <div className="showcase-content">
          <p className="showcase-kicker">E-COMMERCE OBSERVABILITY</p>
          <h1>See the signal.<br />Resolve what matters.</h1>
          <p className="showcase-description">
            Search, monitor and understand every event across your e-commerce platform
            from one workspace.
          </p>

          <div className="showcase-chart" aria-label="Production line metrics preview">
            <div className="chart-metrics">
              <div className="metric metric-primary">
                <span><i /> Production line</span>
                <strong>1.84M</strong>
              </div>
              <div className="metric">
                <span>Error rate</span>
                <strong>1.72%</strong>
              </div>
              <div className="metric">
                <span>P95 latency</span>
                <strong>684 ms</strong>
              </div>
            </div>

            <div className="chart-grid">
              <svg viewBox="0 0 520 180" role="img" aria-label="Service activity chart">
                <defs>
                  <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#78c6ff" stopOpacity="0.34" />
                    <stop offset="100%" stopColor="#78c6ff" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  className="chart-area"
                  d="M0 137 C48 137 70 78 112 90 C154 102 174 134 218 137 C264 140 278 56 330 55 C378 54 398 111 444 101 C482 93 496 56 520 57 L520 180 L0 180 Z"
                />
                <path
                  className="chart-line"
                  d="M0 137 C48 137 70 78 112 90 C154 102 174 134 218 137 C264 140 278 56 330 55 C378 54 398 111 444 101 C482 93 496 56 520 57"
                />
              </svg>
            </div>

            <div className="chart-footer">
              <span className="error-chip">ERROR</span>
              <span>payment-service · Payment gateway timeout for order #4821</span>
            </div>
          </div>
        </div>
      </section>

      <section className="login-panel" aria-label="Sign in">
        <div className="login-card">
          <div className="system-status">
            <i />
            <span>SYSTEMS OPERATIONAL</span>
          </div>

          <header className="login-header">
            <h2>Welcome back</h2>
            <p>Enter your credentials to access your workspace.</p>
          </header>

          <form className="login-form" onSubmit={handleSubmit}>
            <label htmlFor="email">Work email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="alex.morgan@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={loading}
            />

            <div className="password-heading">
              <label htmlFor="password">Password</label>
              <button
                type="button"
                className="forgot-link"
                onClick={() => {
                  setError('')
                  setSuccess('')
                  setIsForgetPasswordOpen(true)
                }}
              >
                Forgot password?
              </button>
            </div>
            <div className="password-field">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <label className="remember-row">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                disabled={loading}
              />
              <span>Remember me</span>
            </label>

            {error && <div className="form-error" role="alert">{error}</div>}
            {success && <div className="form-success" role="status">{success}</div>}

            <button className="sign-in-button" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in to LogSight'}
            </button>
          </form>

          <p className="login-footer">Authorized access only · Activity is securely logged.</p>
        </div>
      </section>

      {isForgetPasswordOpen && (
        <ForgetPassword
          initialEmail={email}
          onClose={() => setIsForgetPasswordOpen(false)}
          onPasswordReset={() => {
            setIsForgetPasswordOpen(false)
            setSuccess('Password changed successfully. You can now sign in.')
          }}
        />
      )}
    </main>
  )
}