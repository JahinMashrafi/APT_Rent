const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/authMiddleware.js");
const { getHistory } = require("../controllers/historyController");

router.get("/", requireAuth, getHistory);

module.exports = router;