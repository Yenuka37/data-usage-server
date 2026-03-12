const express = require("express");
const router  = express.Router();

const {
  getAllUsage,
  getUsageById,
  createUsage,
  updateUsage,
  deleteUsage,
  getStats,
} = require("../controllers/usageController");

// GET  /api/usage                  → all months (oldest → newest)
// GET  /api/usage?status=ongoing   → current month only
// GET  /api/usage?status=completed → completed months only
router.get("/usage", getAllUsage);

// GET  /api/usage/:id  → single month by id
router.get("/usage/:id", getUsageById);

// POST /api/usage      → create new month
router.post("/usage", createUsage);

// PUT  /api/usage/:id  → update month
router.put("/usage/:id", updateUsage);

// DELETE /api/usage/:id → delete month
router.delete("/usage/:id", deleteUsage);

// GET  /api/stats      → pre-computed aggregates
router.get("/stats", getStats);

module.exports = router;