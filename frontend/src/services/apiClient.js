import axios from "axios";

/**
 * Base URL for the APT Rent REST API (see apt_rent_api spec, "Global
 * Architectural Blueprint"). Point VITE_API_BASE_URL at your backend once
 * it's built — e.g. http://localhost:5000/v1 for local dev, or
 * https://api.aptrent.app/v1 in production.
 */
const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/v1";

/**
 * Auth model: httpOnly cookie, not a token kept in JS.
 * `withCredentials: true` makes the browser attach the auth cookie on every
 * request and store whatever the server sets via `Set-Cookie` on
 * login/register — no manual header, no localStorage.
 *
 * The backend needs to diverge slightly from the spec's literal "Bearer JWT
 * in Authorization header" line: on POST /auth/login and POST /auth/register,
 * set the JWT as an httpOnly (Secure, SameSite=Lax for same-site dev,
 * SameSite=None; Secure for cross-site prod) cookie, read it from that
 * cookie in your auth middleware, and clear it on POST /auth/logout.
 */
const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// The spec's global error envelope is { error: { code, message, details, timestamp } }.
// Normalize it so callers can just read err.message / err.code / err.details.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const envelope = error.response?.data?.error;

    if (envelope) {
      const normalized = new Error(envelope.message || "Request failed");
      normalized.code = envelope.code;
      normalized.details = envelope.details;
      normalized.status = error.response.status;
      return Promise.reject(normalized);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
