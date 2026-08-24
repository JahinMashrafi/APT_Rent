import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Register() {
  const [role, setRole] = useState('tenant');
  const [occupation, setOccupation] = useState('');
  const [formData, setFormData] = useState({
    fullName: '', userId: '', phone: '', email: '', password: '', confirmPassword: '', address: ''
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    // Basic front-end validation similar to original HTML preview
    if (!formData.fullName || !formData.email || !formData.phone || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all required fields.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setIsSubmitting(true);
      // Example payload — adapt to real API if needed
      const payload = {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        address: formData.address,
        role
      };

      const response = await axios.post('http://localhost:5000/api/auth/register', payload, { withCredentials: true });
      if (response.data?.status === 'success') {
        navigate('/');
      } else {
        setError(response.data?.message || 'Registration failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-shell">

      {/* NAVBAR to match HTML */}
      <header className="navbar">
        <div className="container">
          <a href="/" className="brand">
            <img src="/assets/images/logo/apt-rent-logo.png" alt="APT Rent logo" className="brand-logo" />
            <span className="brand-name">APT<span> Rent</span></span>
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

      {/* AUTH LAYOUT */}
      <main className="auth-shell">
        <section className="auth-brand">
          <a href="/" className="brand">
            <img src="/assets/images/logo/apt-rent-logo.png" alt="APT Rent logo" className="brand-logo" />
            <span className="brand-name">APT<span> Rent</span></span>
          </a>

          <div className="auth-brand-copy">
            <span className="eyebrow">Join APT Rent</span>
            <h2>One profile, verified once, used everywhere.</h2>
            <p>Whether you're listing a unit or looking for one, your details are recorded once and carried through every lease.</p>
            <ul className="auth-brand-list">
              <li>ID verification keeps both sides accountable</li>
              <li>Landlords manage listings, leases, and rent in one view</li>
              <li>Tenants get a documented paper trail, digitally</li>
            </ul>
          </div>

          <p className="auth-brand-foot">APT&nbsp;RENT // NEW ACCOUNT</p>
        </section>

        <section className="auth-form-panel">
          <div className="auth-card auth-card-wide corner-marks">
            <header>
              <span className="eyebrow">Create your account</span>
              <h1>Register</h1>
              <p>Tell us who you are — this becomes your verified APT Rent profile.</p>
            </header>

            <div className="role-tabs" role="tablist" aria-label="Register as">
              <div className="role-tab" role="tab" aria-selected={role === 'tenant'} data-role="tenant" tabIndex={0} onClick={() => setRole('tenant')}>I'm a Tenant</div>
              <div className="role-tab" role="tab" aria-selected={role === 'landlord'} data-role="landlord" tabIndex={0} onClick={() => setRole('landlord')}>I'm a Landlord</div>
            </div>

            <form id="registerForm" className="form-grid" onSubmit={handleRegister} noValidate>
              <input type="hidden" id="selectedRole" name="role" value={role} />

              <div className="form-row-2">
                <div className="field" data-field="fullName" data-required="true">
                  <label htmlFor="fullName">Full name <span className="req">*</span></label>
                  <div className="input-shell">
                    <img src="/assets/icons/user.svg" alt="" />
                    <input type="text" id="fullName" name="fullName" placeholder="e.g. Farhana Akter" value={formData.fullName} onChange={handleInputChange} />
                  </div>
                  <span className="field-error"></span>
                </div>

                <div className="field" data-field="userId">
                  <label htmlFor="userId">User ID <span className="hint">auto-generated</span></label>
                  <div className="input-shell disabled">
                    <input type="text" id="userId" name="userId" value={formData.userId || 'Assigned after registration'} disabled />
                  </div>
                </div>
              </div>

              <div className="form-row-2">
                <div className="field" data-field="profilePhoto">
                  <label htmlFor="profilePhoto">Profile picture</label>
                  <label className="upload-zone" htmlFor="profilePhoto">
                    <img src="/assets/icons/upload.svg" alt="" />
                    <span className="upload-copy">
                      <strong>Upload photo</strong>
                      <span>JPG or PNG</span>
                    </span>
                    <span className="file-name"></span>
                    <input type="file" id="profilePhoto" name="profilePhoto" accept="image/*" />
                  </label>
                </div>

                <div className="field" data-field="nidPhoto">
                  <label htmlFor="nidPhoto">NID photo <span className="req">*</span></label>
                  <label className="upload-zone" htmlFor="nidPhoto">
                    <img src="/assets/icons/upload.svg" alt="" />
                    <span className="upload-copy">
                      <strong>Upload NID</strong>
                      <span>Front side, clear scan</span>
                    </span>
                    <span className="file-name"></span>
                    <input type="file" id="nidPhoto" name="nidPhoto" accept="image/*" />
                  </label>
                </div>
              </div>

              <div className="field" data-field="address" data-required="true">
                <label htmlFor="address">Present address <span className="req">*</span></label>
                <div className="input-shell">
                  <input type="text" id="address" name="address" placeholder="House, road, area, city" value={formData.address} onChange={handleInputChange} />
                </div>
                <span className="field-error"></span>
              </div>

              <div className="field" data-field="occupation" data-required="true">
                <label htmlFor="occupation">Occupation <span className="req">*</span></label>
                <div className="input-shell">
                  <select id="occupation" name="occupation" value={occupation} onChange={(e) => setOccupation(e.target.value)}>
                    <option value="" disabled>Select occupation</option>
                    <option value="student">Student</option>
                    <option value="service">Service holder</option>
                    <option value="business">Businessman</option>
                  </select>
                </div>
                <span className="field-error"></span>
              </div>

              {/* Student fields (example) */}
              {occupation === 'student' && (
                <div className="occupation-fields" data-occupation-group="student">
                  <div className="field" data-field="institution">
                    <label htmlFor="institution">School / College / University</label>
                    <div className="input-shell">
                      <input type="text" id="institution" name="institution" placeholder="Institution name" />
                    </div>
                  </div>
                  <div className="field" data-field="studentIdCard">
                    <label htmlFor="studentIdCard">Student ID card copy</label>
                    <label className="upload-zone" htmlFor="studentIdCard">
                      <img src="/assets/icons/upload.svg" alt="" />
                      <span className="upload-copy"><strong>Upload ID card</strong><span>JPG, PNG, or PDF</span></span>
                      <span className="file-name"></span>
                      <input type="file" id="studentIdCard" name="studentIdCard" accept="image/*,.pdf" />
                    </label>
                  </div>
                </div>
              )}

              <div className="form-row-2">
                <div className="field" data-field="phone" data-required="true">
                  <label htmlFor="phone">Contact number <span className="req">*</span></label>
                  <div className="input-shell">
                    <input type="tel" id="phone" name="phone" placeholder="+880 1XXX-XXXXXX" value={formData.phone} onChange={handleInputChange} />
                  </div>
                  <span className="field-error"></span>
                </div>

                <div className="field" data-field="email" data-required="true">
                  <label htmlFor="registerEmail">Email address <span className="req">*</span></label>
                  <div className="input-shell">
                    <img src="/assets/icons/email.svg" alt="" />
                    <input type="email" id="registerEmail" name="email" placeholder="you@example.com" value={formData.email} onChange={handleInputChange} />
                  </div>
                  <span className="field-error"></span>
                </div>
              </div>

              <div className="form-row-2">
                <div className="field" data-field="password" data-required="true">
                  <label htmlFor="registerPassword">Password <span className="req">*</span></label>
                  <div className="input-shell">
                    <img src="/assets/icons/lock.svg" alt="" />
                    <input type="password" id="registerPassword" name="password" placeholder="••••••••" />
                    <button type="button" className="toggle-visibility" aria-label="Show password">
                      <img className="icon-show" src="/assets/icons/eye.svg" alt="" />
                      <img className="icon-hide" src="/assets/icons/eye-off.svg" alt="" style={{display: 'none'}} />
                    </button>
                  </div>
                  <span className="field-error"></span>
                </div>

                <div className="field" data-field="confirmPassword" data-required="true">
                  <label htmlFor="registerConfirmPassword">Confirm password <span className="req">*</span></label>
                  <div className="input-shell">
                    <img src="/assets/icons/lock.svg" alt="" />
                    <input type="password" id="registerConfirmPassword" name="confirmPassword" placeholder="••••••••" />
                    <button type="button" className="toggle-visibility" aria-label="Show password">
                      <img className="icon-show" src="/assets/icons/eye.svg" alt="" />
                      <img className="icon-hide" src="/assets/icons/eye-off.svg" alt="" style={{display: 'none'}} />
                    </button>
                  </div>
                  <span className="field-error"></span>
                </div>
              </div>

              <label className="field-checkbox">
                <input type="checkbox" id="confirmAccurate" name="confirmAccurate" />
                I confirm the details above are accurate and I am submitting them for verification review.
              </label>

              <label className="field-checkbox" id="agreeTermsWrap">
                <input type="checkbox" id="agreeTerms" name="agreeTerms" />
                I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
              </label>

              <button type="submit" className="btn btn-primary btn-block">Create account</button>
              <p className="form-note">Front-end preview — no files are uploaded anywhere yet; this just demonstrates the UI.</p>
            </form>

            <div className="auth-switch">
              Already have an account? <a href="/login">Log in</a>
            </div>
          </div>
        </section>
      </main>

    </div>
  );
}
