import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await axios.post(
        'http://localhost:5000/api/auth/login',
        { email, password },
        { withCredentials: true }
      );

      if (response.data?.status === 'success') {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    }
  };

  return (
    <div className="page-shell">

      {/* NAVBAR (matches HTML structure) */}
      <header className="navbar">
        <div className="container">
          <a href="/" className="brand">
            <img src="/assets/images/logo/apt-rent-logo.png" alt="APT Rent logo" className="brand-logo" />
          </a>
          <nav className="nav-links" id="navLinks">
            <a href="/">Home</a>
            <a href="#" className="is-locked" title="Sign in to browse properties">Properties <span className="lock-badge">Sign in</span></a>
            <a href="#" className="is-locked" title="Sign in to view this page">About <span className="lock-badge">Sign in</span></a>
          </nav>

          <div className="nav-actions">
            <div className="auth-only-out" style={{display: 'flex', gap: 10}}>
              <a href="/login" className="btn btn-ghost">Log in</a>
              <a href="/register" className="btn btn-primary">Register</a>
            </div>
            <div className="auth-only-in user-chip">
              <span className="avatar">A</span>
              Account
            </div>
            <button className="nav-toggle" id="navToggle" aria-label="Toggle menu" aria-expanded="false">
              <img src="/assets/icons/menu.svg" alt="" />
            </button>
          </div>
        </div>
      </header>

      {/* AUTH LAYOUT (left brand + right form) */}
      <main className="auth-shell">
        <section className="auth-brand">
          <a href="/" className="brand">
            <img src="/assets/images/logo/apt-rent-logo.png" alt="APT Rent logo" className="brand-logo" />
            <span className="brand-name">APT<span> Rent</span></span>
          </a>

          <div className="auth-brand-copy">
            <span className="eyebrow">Welcome back</span>
            <h2>Pick up right where the lease left off.</h2>
            <p>One sign-in for both sides of the rental — landlords managing units, tenants tracking rent and requests.</p>
            <ul className="auth-brand-list">
              <li>See live rent status and receipts</li>
              <li>Message your landlord or tenant on record</li>
              <li>File and follow up on maintenance requests</li>
            </ul>
          </div>

          <p className="auth-brand-foot">APT&nbsp;RENT // SECURE SIGN-IN</p>
        </section>

        <section className="auth-form-panel">
          <div className="auth-card corner-marks">
            <header>
              <span className="eyebrow">Account access</span>
              <h1>Log in</h1>
              <p>Enter your details to access your APT Rent dashboard.</p>
            </header>

            <form id="loginForm" className="form-grid" onSubmit={handleLogin} noValidate>

              <div className="field" data-field="email">
                <label htmlFor="loginEmail">Email address <span className="req">*</span></label>
                <div className="input-shell">
                  <img src="/assets/icons/email.svg" alt="" />
                  <input type="email" id="loginEmail" name="email" placeholder="you@example.com" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <span className="field-error"></span>
              </div>

              <div className="field" data-field="password">
                <label htmlFor="loginPassword">Password <span className="req">*</span></label>
                <div className="input-shell">
                  <img src="/assets/icons/lock.svg" alt="" />
                  <input type="password" id="loginPassword" name="password" placeholder="••••••••" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  <button type="button" className="toggle-visibility" aria-label="Show password">
                    <img className="icon-show" src="/assets/icons/eye.svg" alt="" />
                    <img className="icon-hide" src="/assets/icons/eye-off.svg" alt="" style={{display: 'none'}} />
                  </button>
                </div>
                <span className="field-error"></span>
              </div>

              <div className="field-checkbox" style={{justifyContent: 'space-between', alignItems: 'center'}}>
                <label style={{display: 'flex', alignItems: 'center', gap: 8}}>
                  <input type="checkbox" id="rememberMe" name="rememberMe" />
                  Remember me
                </label>
                <a href="#" style={{fontWeight: 600, color: 'var(--color-blueprint)'}}>Forgot password?</a>
              </div>

              <button type="submit" className="btn btn-primary btn-block">Log in</button>
              <p className="form-note">This is a front-end preview — submitting logs you in locally only, no server yet.</p>
            </form>

            <div className="auth-switch">
              New to APT Rent? <a href="/register">Create an account</a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer omitted (left to app shell) */}
    </div>
  );
}
