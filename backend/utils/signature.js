const { uploadToBucket } = require("./storage.js");

// Accepts a data URL like "data:image/png;base64,iVBORw0..." and uploads it
// to the private `signatures` bucket. Returns the storage PATH (not a public
// URL) — sign it with getSignedUrl() whenever it needs to be shown to a party.
const saveBase64Signature = async (dataUrl, prefix) => {
  const match = /^data:image\/(png|jpeg|jpg);base64,(.+)$/.exec(dataUrl || "");
  if (!match) {
    throw new Error("signature_image_base64 must be a data:image/png or image/jpeg base64 string");
  }
  const ext = match[1] === "jpeg" ? "jpg" : match[1];
  const buffer = Buffer.from(match[2], "base64");
  const path = `${prefix}-${Date.now()}.${ext}`;

  const { path: storedPath } = await uploadToBucket("signatures", path, buffer, `image/${match[1]}`);
  return storedPath;
};

module.exports = { saveBase64Signature };