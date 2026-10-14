const AppError = require("../utils/AppError");
const CODE_BY_STATUS = AppError.STATUS_TO_CODE;

const buildEnvelope = (code, message, details = []) => ({
  error: {
    code,
    message,
    details: Array.isArray(details) ? details : [],
    timestamp: new Date().toISOString(),
  },
});

const isEnvelope = (body) =>
  body && typeof body === "object" && body.error &&
  typeof body.error === "object" && typeof body.error.code === "string";

// Legacy 422s that are real business rules; all other old 422s were validation -> 400
const BUSINESS_RULE_RE = /yourself|not active|already|cannot|can't|transition|overlap|not allowed/i;

const FIELD_HINTS = [
  { re: /cash pickup date/i, field: "collection_date" },
  { re: /time_preference/i, field: "time_preference" },
  { re: /rating/i, field: "rating" },
  { re: /slots?\b/i, field: "slots" },
  { re: /occupation/i, field: "occupation" },
];

function detailsFromMessage(message) {
  if (!message) return [];
  const req = /^([a-z0-9_]+(?:,\s*(?:and\s+)?[a-z0-9_]+)*(?:\s+and\s+[a-z0-9_]+)?)\s+(?:is|are)\s+required/i.exec(message);
  if (req) {
    return req[1].split(/,\s*(?:and\s+)?|\s+and\s+/i).map((f) => f.trim()).filter(Boolean)
      .map((field) => ({ field, issue: "This field is required." }));
  }
  const hint = FIELD_HINTS.find((h) => h.re.test(message));
  return hint ? [{ field: hint.field, issue: message }] : [];
}

function defaultMessage(status) {
  return ({
    400: "Invalid field value provided.",
    401: "Missing or expired authentication token.",
    403: "You do not have permission to perform this action.",
    404: "Resource not found.",
    409: "Resource conflict.",
    422: "Business rule violated.",
    500: "An unexpected error occurred. Please try again later.",
  }[status] || "Request failed.");
}

function normalizeLegacy(status, body) {
  const b = body && typeof body === "object" ? body : {};
  let message = (typeof b.message === "string" && b.message) || (typeof body === "string" && body) || null;
  let details = [];
  let finalStatus = status;

  if (Array.isArray(b.errors) && b.errors.length) {
    details = b.errors.map((e) => ({ field: e.field ?? null, issue: e.message ?? e.issue ?? String(e) }));
    message = message || "Invalid field value provided.";
    finalStatus = 400;
  } else {
    if (status === 403 && /session expired|invalid token|please log ?in|log in again/i.test(message || "")) finalStatus = 401;
    if (status === 422 && !BUSINESS_RULE_RE.test(message || "")) finalStatus = 400;
    if (finalStatus === 400) details = detailsFromMessage(message);
    if (typeof b.details === "string" && b.details) {
      details.push({ field: null, issue: b.details });
    }
    if (Array.isArray(b.allowedFields)) details.push({ field: null, issue: `Allowed fields: ${b.allowedFields.join(", ")}` });
  }

  if (finalStatus >= 400 && finalStatus < 500 && !CODE_BY_STATUS[finalStatus]) finalStatus = 400;
  if (finalStatus >= 500) finalStatus = 500;

  const code = CODE_BY_STATUS[finalStatus];
  if (!message) message = defaultMessage(finalStatus);
  if (finalStatus === 500) message = "An unexpected error occurred. Please try again later.";
  return { status: finalStatus, envelope: buildEnvelope(code, message, details) };
}

// 1. Rewrites every old-style error reply into the envelope (controllers untouched)
function envelopeLegacyResponses(req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 400 && !isEnvelope(body)) {
      const { status, envelope } = normalizeLegacy(res.statusCode, body);
      res.statusCode = status;
      return originalJson(envelope);
    }
    return originalJson(body);
  };
  next();
}

// 2. Unknown route
function notFoundHandler(req, res) {
  res.status(404).json(buildEnvelope("NOT_FOUND", `Endpoint not found: ${req.method} ${req.originalUrl}`));
}

// 3. Thrown / rejected errors
function classifyError(err) {
  if (err && err.isAppError) return { status: err.status, code: err.code, message: err.message, details: err.details };

  if (err && ["TokenExpiredError", "JsonWebTokenError", "NotBeforeError"].includes(err.name))
    return { status: 401, code: "UNAUTHORIZED", message: "Missing or expired authentication token.", details: [] };

  if (err && (err.type === "entity.parse.failed" || (err instanceof SyntaxError && err.status === 400)))
    return { status: 400, code: "VALIDATION_ERROR", message: "Malformed JSON request body.", details: [] };
  if (err && err.type === "entity.too.large")
    return { status: 400, code: "VALIDATION_ERROR", message: "Request body is too large.", details: [] };
  if (err && err.name === "MulterError")
    return { status: 400, code: "VALIDATION_ERROR", message: "Invalid file upload.", details: [{ field: err.field || null, issue: err.message }] };

  switch (err && err.code) {
    case "23505":
      return { status: 409, code: "CONFLICT", message: "A record with the same unique value already exists.",
        details: err.constraint ? [{ field: null, issue: `Duplicate value violates ${err.constraint}.` }] : [] };
    case "23503":
      return { status: 404, code: "NOT_FOUND", message: "A referenced record does not exist.", details: [] };
    case "23502":
      return { status: 400, code: "VALIDATION_ERROR", message: "Missing required attributes.",
        details: err.column ? [{ field: err.column, issue: "This field is required." }] : [] };
    case "23514": case "22P02": case "22007": case "22008":
      return { status: 400, code: "VALIDATION_ERROR", message: "Invalid field value provided.", details: [] };
    default: break;
  }

  const s = err && (err.status || err.statusCode);
  if (Number.isInteger(s) && s >= 400 && s < 500) {
    const n = normalizeLegacy(s, { message: err.message });
    return { status: n.status, code: n.envelope.error.code, message: n.envelope.error.message, details: n.envelope.error.details };
  }
  return { status: 500, code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred. Please try again later.", details: [] };
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const { status, code, message, details } = classifyError(err);
  if (status >= 500) console.error(`[${req.method} ${req.originalUrl}]`, err);
  res.status(status).json(buildEnvelope(code, message, details));
}

module.exports = { envelopeLegacyResponses, notFoundHandler, errorHandler, buildEnvelope, classifyError, normalizeLegacy };