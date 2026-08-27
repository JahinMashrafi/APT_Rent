export const normalizeUserPayload = (user) => {
  if (!user) {
    return null;
  }

  return {
    id: user.id ?? user.userId ?? user.user_id ?? null,
    name: user.name ?? "",
    email: user.email ?? "",
    phone: user.phone ?? user.contact_number ?? "",
    address: user.address ?? "",
    occupation: user.occupation ?? "",
    institutionName: user.institutionName ?? user.institution_name ?? "",
    workplaceName: user.workplaceName ?? user.workplace_name ?? "",
    profilePictureUrl: user.profilePictureUrl ?? user.profile_picture_url ?? "",
    isLandlord: Boolean(user.islandlord ?? user.is_landlord),
    isTenant: Boolean(user.istenant ?? user.is_tenant),
    isAdmin: Boolean(user.isadmin ?? user.is_admin),
  };
};

export const fetchCurrentUser = async () => {
  const response = await fetch("http://localhost:5000/api/auth/me", {
    method: "GET",
    credentials: "include",
  });

  if (response.status === 401 || response.status === 403) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Failed to load authenticated user");
  }

  const data = await response.json();
  return normalizeUserPayload(data?.user);
};

export const logoutUser = async () => {
  await fetch("http://localhost:5000/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });
};
