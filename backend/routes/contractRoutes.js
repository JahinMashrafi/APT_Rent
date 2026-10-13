const express = require("express");
const router = express.Router();
const { requireAuth, requireLandlord, requireTenant } = require("../middleware/authMiddleware.js");
const {
  createContract,
  listContracts,
  getContractById,
  signContract,
  payDeposit,
} = require("../controllers/contractController");

router.post("/", requireAuth, requireLandlord, createContract);
router.get("/", requireAuth, listContracts);
router.get("/:id", requireAuth, getContractById);
router.patch("/:id/sign", requireAuth, signContract);
router.post("/:id/deposit", requireAuth, requireTenant, payDeposit);

module.exports = router;