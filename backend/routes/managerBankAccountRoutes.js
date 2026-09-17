const express = require("express");
const router = express.Router();
const {
  getMyBankAccount,
  createMyBankAccount,
  updateMyBankAccount,
  deleteMyBankAccount,
} = require("../controllers/managerBankAccountController");
const { protect, authorize } = require("../middleware/auth");

router.use(protect, authorize("partner", "manager"));

router.get("/", getMyBankAccount);
router.post("/", createMyBankAccount);
router.put("/", updateMyBankAccount);
router.delete("/", deleteMyBankAccount);

module.exports = router;
