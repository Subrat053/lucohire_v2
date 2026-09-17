const express = require("express");
const router = express.Router();
const {
  getAllManagerBankAccounts,
  getManagerBankAccountById,
  verifyManagerBankAccount,
} = require("../controllers/managerBankAccountController");
const { protect, authorize } = require("../middleware/auth");

router.use(protect, authorize("admin"));

router.get("/", getAllManagerBankAccounts);
router.get("/:id", getManagerBankAccountById);
router.patch("/:id/verify", verifyManagerBankAccount);

module.exports = router;
