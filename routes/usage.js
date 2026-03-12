const express = require("express");
const router  = express.Router();

const {
  getAllUsage,
  getUsageByMonth,
  getStats,
} = require("../controllers/usageController");

// GET /api/usage              → all months
// GET /api/usage?status=ongoing  → current month only
// GET /api/usage?status=history  → completed months only
router.get("/usage", getAllUsage);

// GET /api/usage/:month       → single month e.g. /api/usage/Mar%202026
router.get("/usage/:month", getUsageByMonth);

// GET /api/stats              → pre-computed aggregates
router.get("/stats", getStats);

module.exports = router;