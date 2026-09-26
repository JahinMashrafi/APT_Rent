require("dotenv").config();

const BASE = `${process.env.SUPABASE_URL}/storage/v1`;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const headers = { Authorization: `Bearer ${KEY}`, apikey: KEY };

const uploadToBucket = async (bucket, path, buffer, contentType) => {
  const res = await fetch(`${BASE}/object/${bucket}/${path}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": contentType, "x-upsert": "true" },
    body: buffer,
  });
  if (!res.ok) throw new Error(`Upload failed: ${await res.text()}`);

  const isPublic = bucket === "avatars" || bucket === "property-photos";
  if (isPublic) {
    return { path, url: `${process.env.SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}` };
  }
  return { path, url: null }; // private bucket: caller stores `path`, signs on read
};

const getSignedUrl = async (bucket, path, expiresIn = 3600) => {
  if (!path) return null;
  const res = await fetch(`${BASE}/object/sign/${bucket}/${path}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn }),
  });
  if (!res.ok) throw new Error(`Sign failed: ${await res.text()}`);
  const data = await res.json();
  return `${process.env.SUPABASE_URL}/storage/v1${data.signedURL}`;
};

const deleteFromBucket = async (bucket, path) => {
  if (!path) return;
  const res = await fetch(`${BASE}/object/${bucket}/${path}`, { method: "DELETE", headers });
  if (!res.ok) throw new Error(`Delete failed: ${await res.text()}`);
};

module.exports = { uploadToBucket, getSignedUrl, deleteFromBucket };