const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/authMiddleware.js");
const { listDisputes, getDispute, createDispute } = require("../controllers/disputeController.js");

// Resolving stays admin-only at PATCH /api/admin/disputes/:id/resolve.
router.get("/", requireAuth, listDisputes);
router.post("/", requireAuth, createDispute);
router.get("/:id", requireAuth, getDispute);

module.exports = router;