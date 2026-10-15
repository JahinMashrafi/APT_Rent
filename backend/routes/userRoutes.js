const express = require("express");
const router = express.Router();
const { requireAuth, requireAdmin } = require("../middleware/authMiddleware.js");
const { uploadAvatar: uploadAvatarMiddleware, uploadVerificationDocs } = require("../middleware/upload.js");
const {
  getUsers,
  updateUser,
  deleteUser,
  getMe,
  updateMe,
  uploadDocuments,
  uploadAvatarImage,
  removeAvatar,
  getProfileDetail,
  getPublicProfile,
} = require("../controllers/userController");

// IMPORTANT: /me routes must be declared before /:id, or Express will
// treat "me" as an :id value and hit the wrong handler.
router.get("/me", requireAuth, getMe);
router.patch("/me", requireAuth, updateMe);
router.post("/me/documents", requireAuth, uploadVerificationDocs, uploadDocuments);
router.post("/me/avatar", requireAuth, uploadAvatarMiddleware, uploadAvatarImage);
router.delete("/me/avatar", requireAuth, removeAvatar);

// Detailed profile page (signed-in users only).
router.get("/:id/profile", requireAuth, getProfileDetail);

// Admin-only: these used to have no authentication at all.
router.get("/", requireAuth, requireAdmin, getUsers);
router.get("/:id", getPublicProfile);
router.put("/:id", requireAuth, requireAdmin, updateUser);
router.patch("/:id", requireAuth, requireAdmin, updateUser);
router.delete("/:id", requireAuth, requireAdmin, deleteUser);

module.exports = router;
