/* ==========================================================================
   APT RENT — auth.js
   Everything scoped to the Login / Register pages: password visibility,
   role tab switching, conditional occupation fields, file-name previews,
   and lightweight client-side validation (UI only — no real backend yet).
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initPasswordToggles();
  initRoleTabs();
  initOccupationFields();
  initFileNamePreviews();
  initLoginForm();
  initRegisterForm();
});

/* ---- Show / hide password ---- */
function initPasswordToggles() {
  document.querySelectorAll('.toggle-visibility').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = btn.closest('.input-shell').querySelector('input');
      const showIcon = btn.querySelector('.icon-show');
      const hideIcon = btn.querySelector('.icon-hide');
      const isPassword = input.type === 'password';

      input.type = isPassword ? 'text' : 'password';
      showIcon.style.display = isPassword ? 'none' : 'block';
      hideIcon.style.display = isPassword ? 'block' : 'none';
      btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
    });
  });
}

/* ---- Landlord / Tenant role tabs on the register page ---- */
function initRoleTabs() {
  const tabs = document.querySelectorAll('.role-tab');
  if (!tabs.length) return;

  const roleInput = document.getElementById('selectedRole');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.setAttribute('aria-selected', 'false'));
      tab.setAttribute('aria-selected', 'true');
      if (roleInput) roleInput.value = tab.dataset.role;
    });
  });
}

/*
 * ---- Occupation-dependent sub-fields ----
 * Student -> institution + student ID upload
 * Service holder -> workplace + work ID upload
 * Businessman -> trade license upload
 */
function initOccupationFields() {
  const occupationSelect = document.getElementById('occupation');
  if (!occupationSelect) return;

  const groups = document.querySelectorAll('[data-occupation-group]');

  const syncGroups = () => {
    const value = occupationSelect.value;
    groups.forEach((group) => {
      group.classList.toggle('is-active', group.dataset.occupationGroup === value);
    });
  };

  occupationSelect.addEventListener('change', syncGroups);
  syncGroups(); // set initial state on load
}

/* ---- Show the chosen file's name inside upload dropzones ---- */
function initFileNamePreviews() {
  document.querySelectorAll('.upload-zone input[type="file"]').forEach((input) => {
    input.addEventListener('change', () => {
      const nameEl = input.closest('.upload-zone').querySelector('.file-name');
      if (!nameEl) return;
      nameEl.textContent = input.files.length ? input.files[0].name : '';
    });
  });
}

/* ---- Small validation helpers (shared by both forms) ---- */
function setFieldError(fieldEl, message) {
  const shell = fieldEl.querySelector('.input-shell');
  const errorEl = fieldEl.querySelector('.field-error');
  if (shell) shell.classList.toggle('has-error', Boolean(message));
  if (errorEl) errorEl.textContent = message || '';
}

function isEmpty(value) {
  return !value || !value.trim();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/* ---- Login form ---- */
function initLoginForm() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let valid = true;

    const emailField = form.querySelector('[data-field="email"]');
    const passwordField = form.querySelector('[data-field="password"]');
    const email = form.querySelector('#loginEmail').value;
    const password = form.querySelector('#loginPassword').value;

    if (isEmpty(email)) {
      setFieldError(emailField, 'Enter your email address.');
      valid = false;
    } else if (!isValidEmail(email)) {
      setFieldError(emailField, 'Enter a valid email address.');
      valid = false;
    } else {
      setFieldError(emailField, '');
    }

    if (isEmpty(password)) {
      setFieldError(passwordField, 'Enter your password.');
      valid = false;
    } else {
      setFieldError(passwordField, '');
    }

    if (!valid) return;

    // No backend yet — this is a front-end-only placeholder.
    // Swap this block for a real fetch() call to your auth API later.
    localStorage.setItem('aptrent_demo_auth', 'true');
    window.location.href = '../index.html';
  });
}

/* ---- Register form ---- */
function initRegisterForm() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let valid = true;

    const requiredTextFields = form.querySelectorAll('[data-field][data-required="true"] input, [data-field][data-required="true"] select');
    requiredTextFields.forEach((input) => {
      const fieldEl = input.closest('[data-field]');
      if (isEmpty(input.value)) {
        setFieldError(fieldEl, 'This field is required.');
        valid = false;
      } else {
        setFieldError(fieldEl, '');
      }
    });

    const emailField = form.querySelector('[data-field="email"]');
    const emailInput = form.querySelector('#registerEmail');
    if (emailInput && !isEmpty(emailInput.value) && !isValidEmail(emailInput.value)) {
      setFieldError(emailField, 'Enter a valid email address.');
      valid = false;
    }

    const passwordInput = form.querySelector('#registerPassword');
    const confirmInput = form.querySelector('#registerConfirmPassword');
    const confirmField = form.querySelector('[data-field="confirmPassword"]');
    if (passwordInput && confirmInput && passwordInput.value !== confirmInput.value) {
      setFieldError(confirmField, 'Passwords do not match.');
      valid = false;
    }

    const termsInput = form.querySelector('#agreeTerms');
    if (termsInput && !termsInput.checked) {
      valid = false;
      termsInput.closest('.field-checkbox').style.color = 'var(--color-error)';
    }

    if (!valid) return;

    // Front-end placeholder only — wire this up to your registration API,
    // including the file uploads (profile photo, NID, ID/license docs).
    localStorage.setItem('aptrent_demo_auth', 'true');
    window.location.href = '../index.html';
  });
}
