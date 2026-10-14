const multer = require("multer");
const path = require("path");
const AppError = require("../utils/AppError.js");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowed.includes(ext)) return cb(new Error("Unsupported file type"), false);
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Multer reports problems as plain errors (which would surface as a 500).
// Wrapping a multer middleware turns them into proper 400 responses with a
// message the frontend can show.
const friendly = (middleware, field) => (req, res, next) =>
  middleware(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") {
      return next(AppError.validation("File is too large.", [{ field, issue: "File exceeds the size limit." }]));
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return next(AppError.validation("Unexpected file field.", [{ field, issue: err.message }]));
    }
    return next(AppError.validation(err.message || "Invalid upload.", [{ field, issue: err.message || "Invalid upload." }]));
  });

// Profile picture: one image, 2 MB max. The real type is verified from the
// file's bytes in the controller.
const avatarMulter = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
      return cb(new Error("Profile picture must be a JPG, PNG or WebP image."), false);
    }
    cb(null, true);
  },
}).single("avatar");

const uploadAvatar = friendly(avatarMulter, "avatar");

const uploadVerificationDocs = friendly(
  upload.fields([
    { name: "nid_photo", maxCount: 1 },
    { name: "student_id_card", maxCount: 1 },
    { name: "job_id_card", maxCount: 1 },
    { name: "trade_license", maxCount: 1 },
  ]),
  "documents",
);

module.exports = { upload, uploadAvatar, uploadVerificationDocs };
