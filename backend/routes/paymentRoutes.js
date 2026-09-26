const express = require("express");
const router = express.Router();
const { requireAuth, requireTenant } = require("../middleware/authMiddleware.js");
const { createPayment } = require("../controllers/paymentController");

router.post("/", requireAuth, requireTenant, createPayment);

module.exports = router;