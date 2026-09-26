import api from "../services/api";

export const normalizeUserPayload = (user) => {
  if (!user) {
    return null;
  }

  return {
    id: user.id ?? user.user_id ?? null,
    name: user.name ?? "",
    email: user.email ?? "",
    phone: user.contact_number ?? user.phone ?? "",
    address: user.address ?? "",
    occupation: user.occupation ?? "",
    institutionName: user.institution_name ?? "",
    workplaceName: user.workplace_name ?? "",
    profilePictureUrl: user.profile_picture_url ?? "",
    isLandlord: Boolean(user.is_landlord),
    isTenant: Boolean(user.is_tenant),
    isAdmin: Boolean(user.is_admin),
    isVerified: Boolean(user.is_verified),
  };
};

// Logs in against POST /auth/login. The server sets the auth cookie via
// Set-Cookie on this response — there's nothing to store client-side.
export const loginUser = async (email, password) => {
  const data = await api.auth.login({ email, password });
  return normalizeUserPayload(data.user);
};

// Registers against POST /auth/register (same cookie behavior as login).
export const registerUser = async (payload) => {
  const data = await api.auth.register(payload);
  return normalizeUserPayload(data.user);
};

// Source of truth for "am I logged in": ask the server, since the auth
// cookie is httpOnly and can't be read from JS. A 401/403 just means
// signed out, not a real error.
export const fetchCurrentUser = async () => {
  try {
    const user = await api.users.me();
    return normalizeUserPayload(user);
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) {
      return null;
    }
    throw error;
  }
};

// Server clears the auth cookie on this call.
export const logoutUser = async () => {
  await api.auth.logout();
};
