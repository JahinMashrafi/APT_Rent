const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/authMiddleware.js");
const { upload } = require("../middleware/upload.js");
const {
  getUsers,
  updateUser,
  deleteUser,
  getMe,
  updateMe,
  uploadDocuments,
  getPublicProfile,
} = require("../controllers/userController");

// IMPORTANT: /me routes must be declared before /:id, or Express will
// treat "me" as an :id value and hit the wrong handler.
router.get("/me", requireAuth, getMe);
router.patch("/me", requireAuth, updateMe);
router.post(
  "/me/documents",
  requireAuth,
  upload.fields([
    { name: "nid_photo", maxCount: 1 },
    { name: "student_id_card", maxCount: 1 },
    { name: "job_id_card", maxCount: 1 },
    { name: "trade_license", maxCount: 1 },
  ]),
  uploadDocuments,
);

router.get("/", getUsers);
router.get("/:id", getPublicProfile);
router.put("/:id", updateUser);
router.patch("/:id", updateUser);
router.delete("/:id", deleteUser);

module.exports = router;