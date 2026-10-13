const STATUS_TO_CODE = {
  400: "VALIDATION_ERROR",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  422: "BUSINESS_RULE_VIOLATION",
  500: "INTERNAL_SERVER_ERROR",
};

class AppError extends Error {
  constructor(status, message, details = []) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = STATUS_TO_CODE[status] || "INTERNAL_SERVER_ERROR";
    this.details = Array.isArray(details) ? details : [];
    this.isAppError = true;
    Error.captureStackTrace?.(this, AppError);
  }
  static validation(message = "Invalid field value provided.", details = []) { return new AppError(400, message, details); }
  static unauthorized(message = "Missing or expired authentication token.") { return new AppError(401, message); }
  static forbidden(message = "You do not have permission to perform this action.") { return new AppError(403, message); }
  static notFound(message = "Resource not found.") { return new AppError(404, message); }
  static conflict(message = "Resource conflict.", details = []) { return new AppError(409, message, details); }
  static businessRule(message = "Business rule violated.", details = []) { return new AppError(422, message, details); }
  static internal(message = "Internal server error.") { return new AppError(500, message); }
}

AppError.STATUS_TO_CODE = STATUS_TO_CODE;
module.exports = AppError;