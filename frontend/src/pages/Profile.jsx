import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar.jsx";
import { fetchCurrentUser, logoutUser } from "../utils/auth";

const toFormState = (user) => ({
  name: user?.name ?? "",
  email: user?.email ?? "",
  contact_number: user?.contact_number ?? user?.phone ?? "",
  address: user?.address ?? "",
  occupation: user?.occupation ?? "",
  profile_picture_url: user?.profile_picture_url ?? user?.profilePictureUrl ?? "",
});

export default function Profile() {
  const navigate = useNavigate();
  const [sessionUserId, setSessionUserId] = useState(null);
  const [form, setForm] = useState(() => toFormState(null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
        setSessionUserId(authUser.id);

        const response = await axios.get(`http://localhost:5000/api/users/${authUser.id}`, {
          withCredentials: true,
        });
        const fetchedUser = response.data?.data;
        setForm(toFormState(fetchedUser));
      } catch (loadError) {
        setError(loadError.response?.data?.message || "Failed to load profile.");
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
    if (!sessionUserId) {
      navigate("/login");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");
      const response = await axios.put(`http://localhost:5000/api/users/${sessionUserId}`, form, {
        withCredentials: true,
      });

      const updated = response.data?.data;
      setForm(toFormState(updated));
      setSuccess("Profile updated successfully.");
    } catch (updateError) {
      setError(updateError.response?.data?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!sessionUserId) {
      navigate("/login");
      return;
    }

    const confirmed = window.confirm("Are you sure you want to delete your account? This cannot be undone.");
    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);
      setError("");
      await axios.delete(`http://localhost:5000/api/users/${sessionUserId}`, {
        withCredentials: true,
      });
      await logoutUser();
      navigate("/");
    } catch (deleteError) {
      setError(deleteError.response?.data?.message || "Failed to delete account.");
    } finally {
      setDeleting(false);
    }
  };

  const avatarInitial = (form.name?.trim()?.[0] || "U").toUpperCase();

  return (
    <div className="page-shell">
      <Navbar />
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
                  {saving ? "Saving..." : "Edit Profile"}
                </button>
                <button type="button" className="btn btn-ghost" onClick={handleDeleteAccount} disabled={deleting || loading}>
                  {deleting ? "Deleting..." : "Delete Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}