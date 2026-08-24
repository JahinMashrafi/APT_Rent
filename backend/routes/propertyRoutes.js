const express = require("express");
const router = express.Router();

const { requireAuth, requireLandlord } = requre(
  "../middleware/authMiddleware.js",
);

router.get("/", (req, res) => {
  res.json({ message: "List of all properties" });
});

router.post("/create", requireAuth, requireLandlord);

module.exports = router;
