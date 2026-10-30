const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/authMiddleware.js");
const { listSaved, listSavedIds, saveProperty, unsaveProperty } = require("../controllers/savedController.js");

router.get("/", requireAuth, listSaved);
router.get("/ids", requireAuth, listSavedIds); // before /:propertyId
router.post("/:propertyId", requireAuth, saveProperty);
router.delete("/:propertyId", requireAuth, unsaveProperty);

module.exports = router;