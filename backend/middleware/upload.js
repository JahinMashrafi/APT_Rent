const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Local disk storage for dev. photo_url / *_url fields resolve to real,
// reachable links via express.static("/uploads") wired in server.js.
// Swap this storage engine for S3/Cloud Storage before production.
const UPLOAD_ROOT = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOAD_ROOT)) fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_ROOT),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowed.includes(ext)) {
    return cb(new Error("Unsupported file type"), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per file
});

const fileUrl = (req, filename) =>
  `${req.protocol}://${req.get("host")}/uploads/${filename}`;

module.exports = { upload, fileUrl, UPLOAD_ROOT };