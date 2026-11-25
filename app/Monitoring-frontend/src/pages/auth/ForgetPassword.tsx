import { useState } from 'react'
import type { FormEvent } from 'react'
import axios from 'axios'
import { ArrowLeft, KeyRound, X } from 'lucide-react'
import api from '../../api/axios'

type ForgetPasswordProps = {
  initialEmail: string
  onClose: () => void
  onPasswordReset: () => void
}

type ResetStep = 'email' | 'code' | 'password'

export default function ForgetPassword({
  initialEmail,
  onClose,
  onPasswordReset,
}: ForgetPasswordProps) {
  const [step, setStep] = useState<ResetStep>('email')
  const [email, setEmail] = useState(initialEmail)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)

  function getErrorMessage(submitError: unknown, fallback: string) {
    if (axios.isAxiosError<{ message?: string; error?: string }>(submitError)) {
      return (
        submitError.response?.data.message ??
        submitError.response?.data.error ??
        fallback
      )
    }

    return submitError instanceof Error ? submitError.message : fallback
  }

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    setLoading(true)

    try {
      await api.post('/auth/request-password-reset', {
        email,
        redirectTo: window.location.origin,
      })
      setNotice('If an account exists for this email, you will receive a reset link.')
      setStep('code')
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'Unable to request a password reset. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  function continueWithCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    setStep('password')
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')

    if (password.length < 8) {
      setError('Your password must be at least 8 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setError('The passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/reset-password', {
        token: code.trim(),
        newPassword: password,
      })
      onPasswordReset()
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'Unable to reset your password. Check the reset code and try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="reset-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onClose()
      }}
    >
      <section
        className="reset-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-title"
        aria-describedby="reset-description"
      >
        <button
          type="button"
          className="reset-close"
          aria-label="Close password reset"
          onClick={onClose}
          disabled={loading}
        >
          <X size={18} aria-hidden="true" />
        </button>

        <div className="reset-icon">
          <KeyRound size={20} aria-hidden="true" />
        </div>

        <header className="reset-header">
          <h2 id="reset-title">
            {step === 'email' ? 'Reset your password' : step === 'code' ? 'Check your email' : 'Create a new password'}
          </h2>
          <p id="reset-description">
            {step === 'email'
              ? 'Enter the email address associated with your account.'
              : step === 'code'
                ? 'Paste the reset token from the email to continue.'
                : 'Choose a new password for your account.'}
          </p>
        </header>

        {step === 'email' && (
          <form className="reset-form" onSubmit={requestReset}>
            <label htmlFor="reset-email">Email address</label>
            <input
              id="reset-email"
              type="email"
              autoComplete="email"
              placeholder="alex.morgan@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={loading}
              autoFocus
            />
            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="sign-in-button" type="submit" disabled={loading}>
              {loading ? 'Sending…' : 'Send reset email'}
            </button>
          </form>
        )}

        {step === 'code' && (
          <form className="reset-form" onSubmit={continueWithCode}>
            {notice && <div className="form-success" role="status">{notice}</div>}
            <label htmlFor="reset-code">Reset code</label>
            <input
              id="reset-code"
              type="text"
              autoComplete="one-time-code"
              placeholder="Paste the reset token"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
              autoFocus
            />
            {error && <div className="form-error" role="alert">{error}</div>}
            <p className="reset-hint">The reset token is verified when you save your new password.</p>
            <button className="sign-in-button" type="submit">
              Continue
            </button>
            <button
              className="reset-back-button"
              type="button"
              onClick={() => {
                setError('')
                setNotice('')
                setStep('email')
              }}
            >
              <ArrowLeft size={14} aria-hidden="true" />
              Use a different email
            </button>
          </form>
        )}

        {step === 'password' && (
          <form className="reset-form" onSubmit={resetPassword}>
            <label htmlFor="new-password">New password</label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
              disabled={loading}
              autoFocus
            />
            <label htmlFor="confirm-new-password">Confirm new password</label>
            <input
              id="confirm-new-password"
              type="password"
              autoComplete="new-password"
              placeholder="Enter your new password again"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              required
              disabled={loading}
            />
            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="sign-in-button" type="submit" disabled={loading}>
              {loading ? 'Updating…' : 'Update password'}
            </button>
            <button
              className="reset-back-button"
              type="button"
              onClick={() => {
                setError('')
                setStep('code')
              }}
              disabled={loading}
            >
              <ArrowLeft size={14} aria-hidden="true" />
              Back to reset code
            </button>
          </form>
        )}
      </section>
    </div>
  )
}