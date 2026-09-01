const express = require("express");
const router = express.Router();
const { registerUser, loginUser, getCurrentUser, logoutUser } = require("../controllers/authController");
const { requireAuth } = require("../middleware/authMiddleware");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", requireAuth, getCurrentUser);
router.post("/logout", logoutUser);

module.exports = router;
