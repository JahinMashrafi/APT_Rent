const express = require("express");
const router = express.Router();
const { requireAuth, requireLandlord } = require("../middleware/authMiddleware.js");
const { upload } = require("../middleware/upload.js");
const {
  getProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  uploadPropertyPhotos,
  deletePropertyPhoto,
  updatePropertyVisibility,
} = require("../controllers/propertyController");

router.get("/", getProperties);
router.get("/:id", getPropertyById);

router.post("/", requireAuth, requireLandlord, createProperty);
router.patch("/:id", requireAuth, requireLandlord, updateProperty);
router.delete("/:id", requireAuth, requireLandlord, deleteProperty);

router.post(
  "/:id/photos",
  requireAuth,
  requireLandlord,
  upload.array("photos", 10),
  uploadPropertyPhotos,
);
router.delete("/:id/photos/:photo_id", requireAuth, requireLandlord, deletePropertyPhoto);

router.patch("/:id/visibility", requireAuth, requireLandlord, updatePropertyVisibility);

module.exports = router;