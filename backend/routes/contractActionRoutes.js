const express = require("express");
const router = express.Router();
const { requireAuth, requireLandlord } = require("../middleware/authMiddleware.js");
const { activateContract, terminateContract } = require("../controllers/contractActionsController.js");

router.patch("/:id/activate", requireAuth, requireLandlord, activateContract);
router.patch("/:id/terminate", requireAuth, requireLandlord, terminateContract);

module.exports = router;