const { getSignedUrl } = require("./storage.js");

/**
 * Takes a DB row (or plain object) and a map of { fieldName: bucketName }
 * for fields that hold private-bucket PATHS (not public URLs), and returns
 * a shallow copy with each of those fields replaced by a fresh signed URL.
 *
 * Using this instead of hand-writing getSignedUrl() calls in every endpoint
 * means the "which fields need signing" knowledge lives in ONE place (the
 * *_SIGNED_FIELDS maps below), not scattered across every controller that
 * happens to touch these tables. Forgetting to sign a field becomes much
 * harder — you'd have to forget to call signFields() at all, rather than
 * forgetting one specific field among several.
 *
 * Fields not present on the row, or already null, resolve to null and are
 * left as null (getSignedUrl already short-circuits on falsy paths).
 */
const signFields = async (row, fieldBucketMap) => {
  if (!row) return row;
  const result = { ...row };
  const entries = Object.entries(fieldBucketMap);

  await Promise.all(
    entries.map(async ([field, bucket]) => {
      if (Object.prototype.hasOwnProperty.call(row, field)) {
        result[field] = await getSignedUrl(bucket, row[field]);
      }
    }),
  );

  return result;
};

// Canonical map of every column, across every table, that currently holds
// a private-bucket PATH rather than a public URL. Add to these whenever a
// new private-bucket column is introduced — this is the single checklist
// that replaces "remembering" per endpoint.
const USER_SIGNED_FIELDS = {
  nid_photo_url: "verification-docs",
  student_id_card_url: "verification-docs",
  job_id_card_url: "verification-docs",
  trade_license_url: "verification-docs",
};

const CONTRACT_SIGNED_FIELDS = {
  owner_signature_url: "signatures",
  tenant_signature_url: "signatures",
};

const PAYMENT_SIGNED_FIELDS = {
  receipt_url: "receipts",
};

module.exports = {
  signFields,
  USER_SIGNED_FIELDS,
  CONTRACT_SIGNED_FIELDS,
  PAYMENT_SIGNED_FIELDS,
};