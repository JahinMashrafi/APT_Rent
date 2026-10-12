import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppNavbar from "../components/AppNavbar.jsx";
import { fetchCurrentUser, logoutUser } from "../utils/auth";
import { useApp } from "../context/AppContext.jsx";
import api from "../services/api";

const toFormState = (user) => ({
  name: user?.name ?? "",
  email: user?.email ?? "",
  contact_number: user?.contact_number ?? user?.phone ?? "",
  address: user?.address ?? "",
  occupation: user?.occupation ?? "",
  profile_picture_url: user?.profile_picture_url ?? user?.profilePictureUrl ?? "",
});

export default function Profile() {
  const { clearSession } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState(() => toFormState(null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const authUser = await fetchCurrentUser();
        if (!authUser?.id) {
          navigate("/login");
          return;
        }
        // fetchCurrentUser already hits GET /users/me; reuse its shape.
        setForm(toFormState(authUser));
      } catch (loadError) {
        setError(loadError.message || "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [navigate]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdateProfile = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");
      // PATCH /users/me — the spec's own profile-mutation endpoint.
      const updated = await api.users.updateMe(form);
      setForm(toFormState(updated));
      setSuccess("Profile updated successfully.");
    } catch (updateError) {
      setError(updateError.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } finally {
      clearSession();
      navigate("/login");
    }
  };

  const avatarInitial = (form.name?.trim()?.[0] || "U").toUpperCase();

  return (
    <div className="page-shell">
      <AppNavbar />
      <section className="profile-page">
        <div className="profile-container">
          <div className="profile-card">
            <div className="profile-header">
              {form.profile_picture_url ? (
                <img src={form.profile_picture_url} alt="Profile" className="profile-avatar" referrerPolicy="no-referrer" />
              ) : (
                <span className="profile-avatar">{avatarInitial}</span>
              )}
              <div>
                <h1>My Profile</h1>
                <p>View and manage your account information.</p>
              </div>
            </div>

            {loading ? <p>Loading profile...</p> : null}
            {error ? <p className="profile-error">{error}</p> : null}
            {success ? <p className="profile-success">{success}</p> : null}

            <form className="profile-grid" onSubmit={handleUpdateProfile}>
              <label className="field">
                <span>Name</span>
                <input type="text" name="name" value={form.name} onChange={handleInputChange} required />
              </label>
              <label className="field">
                <span>Email</span>
                <input type="email" name="email" value={form.email} onChange={handleInputChange} required />
              </label>
              <label className="field">
                <span>Contact Number</span>
                <input type="text" name="contact_number" value={form.contact_number} onChange={handleInputChange} />
              </label>
              <label className="field">
                <span>Occupation</span>
                <select name="occupation" value={form.occupation} onChange={handleInputChange}>
                  <option value="">Select occupation</option>
                  <option value="student">Student</option>
                  <option value="service">Service holder</option>
                  <option value="business">Businessman</option>
                </select>
              </label>
              <label className="field">
                <span>Address</span>
                <input type="text" name="address" value={form.address} onChange={handleInputChange} />
              </label>
              <label className="field">
                <span>Profile Photo URL</span>
                <input
                  type="url"
                  name="profile_picture_url"
                  value={form.profile_picture_url}
                  onChange={handleInputChange}
                  placeholder="https://example.com/my-photo.jpg"
                />
              </label>

              <div className="profile-actions">
                <button type="submit" className="btn btn-primary" disabled={saving || loading}>
                  {saving ? "Saving..." : "Save changes"}
                </button>
                <button type="button" className="btn btn-ghost" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}