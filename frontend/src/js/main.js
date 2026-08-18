/* ==========================================================================
   APT RENT — main.js
   Global behavior: mobile nav toggle, and locking nav tabs until sign-in.
   auth.js handles the login/register forms specifically — keep that logic
   out of this file.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initAuthGatedLinks();
  reflectAuthState();
});

/* ---- Mobile hamburger menu ---- */
function initMobileNav() {
  const navbar = document.querySelector('.navbar');
  const toggle = document.querySelector('.nav-toggle');
  if (!navbar || !toggle) return;

  toggle.addEventListener('click', () => {
    const isOpen = navbar.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  // Close menu when a link is tapped (mobile)
  navbar.querySelectorAll('.nav-links a').forEach((link) => {
    link.addEventListener('click', () => {
      navbar.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

/*
 * ---- Locked navigation ----
 * Per the project spec: tabs like "Properties" and "About" (anything beyond
 * Home) should not work until the visitor has logged in. Real access control
 * will happen on the backend later — this is just the front-end UI behavior
 * for tonight: clicking a locked tab redirects to the login page instead of
 * navigating, and shows a small "sign in required" cue.
 */
function initAuthGatedLinks() {
  document.querySelectorAll('.nav-links a.is-locked').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = resolvePath('pages/login.html');
    });
  });
}

/*
 * Resolves a project-root-relative path correctly whether the current page
 * is index.html (root) or a page inside /pages/.
 */
function resolvePath(rootRelativePath) {
  const inPagesFolder = window.location.pathname.includes('/pages/');
  return inPagesFolder ? `../${rootRelativePath}` : rootRelativePath;
}

/*
 * ---- Demo auth-state switch ----
 * There's no backend yet, so this reads a simple flag from localStorage to
 * flip the navbar between signed-out (Login/Register buttons) and signed-in
 * (user chip) UI. auth.js sets this flag when the demo login/register form
 * is submitted. Safe to delete once real authentication is wired up.
 */
function reflectAuthState() {
  const isLoggedIn = localStorage.getItem('aptrent_demo_auth') === 'true';
  document.body.setAttribute('data-auth', isLoggedIn ? 'in' : 'out');
}
