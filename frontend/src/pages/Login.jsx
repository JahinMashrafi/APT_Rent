import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppNavbar from "../components/AppNavbar.jsx";
import { loginUser } from "../utils/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  // Controls whether the password field shows plain text or dots.
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await loginUser(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Something went wrong");
    }
  };

  return (
    <div className="page-shell">
      <AppNavbar />

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
                  <input
                    type="email"
                    id="loginEmail"
                    name="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <span className="field-error"></span>
              </div>

              <div className="field" data-field="password">
                <label htmlFor="loginPassword">Password <span className="req">*</span></label>
                <div className="input-shell">
                  <img src="/assets/icons/lock.svg" alt="" />
                  <input
                    type={showPassword ? "text" : "password"}
                    id="loginPassword"
                    name="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="toggle-visibility"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    <img
                      className="icon-show"
                      src="/assets/icons/eye.svg"
                      alt=""
                      style={{ display: showPassword ? "none" : "block" }}
                    />
                    <img
                      className="icon-hide"
                      src="/assets/icons/eye-off.svg"
                      alt=""
                      style={{ display: showPassword ? "block" : "none" }}
                    />
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
              {error ? <p className="form-note" style={{ color: "var(--color-error)" }}>{error}</p> : null}
              <p className="form-note">Your secure session is saved in an HTTP-only cookie for seven days.</p>
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