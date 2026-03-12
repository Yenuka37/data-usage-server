const { getDB } = require("../config/db");

const COLLECTION = "usage";

// ── Helper — get next auto-increment id ─────────────────────────────────────
async function getNextId() {
  const db  = getDB();
  const last = await db
    .collection(COLLECTION)
    .find()
    .sort({ _id: -1 })
    .limit(1)
    .toArray();
  return last.length > 0 ? last[0]._id + 1 : 1;
}

// ── GET /api/usage ──────────────────────────────────────────────────────────
async function getAllUsage(req, res) {
  try {
    const db     = getDB();
    const filter = {};
    const { status } = req.query;

    if (status === "ongoing" || status === "completed") {
      filter.status = status;
    }

    const data = await db
      .collection(COLLECTION)
      .find(filter)
      .sort({ updated_at: 1 })
      .toArray();

    res.json({ success: true, data });
  } catch (err) {
    console.error("getAllUsage error:", err);
    res.status(500).json({ success: false, error: "Failed to load usage data" });
  }
}

// ── GET /api/usage/:id ──────────────────────────────────────────────────────
async function getUsageById(req, res) {
  try {
    const db = getDB();
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: "Invalid id" });
    }

    const item = await db.collection(COLLECTION).findOne({ _id: id });

    if (!item) {
      return res.status(404).json({ success: false, error: "Month not found" });
    }

    res.json({ success: true, data: item });
  } catch (err) {
    console.error("getUsageById error:", err);
    res.status(500).json({ success: false, error: "Failed to load usage data" });
  }
}

// ── POST /api/usage ─────────────────────────────────────────────────────────
async function createUsage(req, res) {
  try {
    const db = getDB();
    const { month, usage_gb, screenshot, status } = req.body;

    // Validate required fields
    if (!month || usage_gb === undefined || !status) {
      return res.status(400).json({
        success: false,
        error: "month, usage_gb and status are required",
      });
    }

    if (!["ongoing", "completed"].includes(status)) {
      return res.status(400).json({
        success: false,
        error: "status must be 'ongoing' or 'completed'",
      });
    }

    // Only one ongoing month allowed
    if (status === "ongoing") {
      const existing = await db.collection(COLLECTION).findOne({ status: "ongoing" });
      if (existing) {
        return res.status(400).json({
          success: false,
          error: `Only one ongoing month allowed. '${existing.month}' is already ongoing.`,
        });
      }
    }

    const nextId = await getNextId();
    const today  = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    const doc = {
      _id:        nextId,
      month:      month.trim(),
      usage_gb:   Number(usage_gb),
      screenshot: screenshot || "",
      updated_at: today,
      status,
    };

    await db.collection(COLLECTION).insertOne(doc);
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    console.error("createUsage error:", err);
    res.status(500).json({ success: false, error: "Failed to create usage entry" });
  }
}

// ── PUT /api/usage/:id ──────────────────────────────────────────────────────
async function updateUsage(req, res) {
  try {
    const db = getDB();
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: "Invalid id" });
    }

    const { month, usage_gb, screenshot, status } = req.body;

    if (!month || usage_gb === undefined || !status) {
      return res.status(400).json({
        success: false,
        error: "month, usage_gb and status are required",
      });
    }

    if (!["ongoing", "completed"].includes(status)) {
      return res.status(400).json({
        success: false,
        error: "status must be 'ongoing' or 'completed'",
      });
    }

    // If setting this to ongoing, make sure no other month is already ongoing
    if (status === "ongoing") {
      const existing = await db
        .collection(COLLECTION)
        .findOne({ status: "ongoing", _id: { $ne: id } });
      if (existing) {
        return res.status(400).json({
          success: false,
          error: `Only one ongoing month allowed. '${existing.month}' is already ongoing.`,
        });
      }
    }

    const today = new Date().toISOString().split("T")[0];

    const updated = {
      month:      month.trim(),
      usage_gb:   Number(usage_gb),
      screenshot: screenshot || "",
      updated_at: today,
      status,
    };

    const result = await db
      .collection(COLLECTION)
      .findOneAndUpdate(
        { _id: id },
        { $set: updated },
        { returnDocument: "after" }
      );

    if (!result) {
      return res.status(404).json({ success: false, error: "Month not found" });
    }

    res.json({ success: true, data: result });
  } catch (err) {
    console.error("updateUsage error:", err);
    res.status(500).json({ success: false, error: "Failed to update usage entry" });
  }
}

// ── DELETE /api/usage/:id ───────────────────────────────────────────────────
async function deleteUsage(req, res) {
  try {
    const db = getDB();
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: "Invalid id" });
    }

    // Find the document first to check status
    const item = await db.collection(COLLECTION).findOne({ _id: id });

    if (!item) {
      return res.status(404).json({ success: false, error: "Month not found" });
    }

    // Block deletion of completed months
    if (item.status === "completed") {
      return res.status(403).json({
        success: false,
        error: "Completed months cannot be deleted",
      });
    }

    await db.collection(COLLECTION).deleteOne({ _id: id });
    res.json({ success: true, message: `Month '${item.month}' deleted` });
  } catch (err) {
    console.error("deleteUsage error:", err);
    res.status(500).json({ success: false, error: "Failed to delete usage entry" });
  }
}

// ── GET /api/stats ──────────────────────────────────────────────────────────
async function getStats(req, res) {
  try {
    const db = getDB();

    const [currentArr, history] = await Promise.all([
      db.collection(COLLECTION).find({ status: "ongoing" }).toArray(),
      db.collection(COLLECTION).find({ status: "completed" }).sort({ updated_at: 1 }).toArray(),
    ]);

    const current   = currentArr[0] || null;
    const allMonths = [...history];
    if (current) allMonths.push(current);

    const totalUsage = allMonths.reduce((s, m) => s + m.usage_gb, 0);
    const avgUsage   = allMonths.length > 0 ? totalUsage / allMonths.length : 0;

    const maxHistoryUsage = history.reduce(
      (max, m) => (m.usage_gb > max.usage_gb ? m : max),
      history[0] || { usage_gb: 0 }
    );

    const lastThree = allMonths.slice(-3);
    let predicted = 0;
    if      (lastThree.length >= 3)  predicted = 2 * lastThree[2].usage_gb - lastThree[0].usage_gb;
    else if (lastThree.length === 2) predicted = lastThree[1].usage_gb + (lastThree[1].usage_gb - lastThree[0].usage_gb);
    else if (lastThree.length === 1) predicted = lastThree[0].usage_gb;
    predicted = Math.max(0, predicted);

    const currentVsPrev = current && allMonths.length >= 2
      ? ((current.usage_gb - allMonths[allMonths.length - 2].usage_gb)
          / allMonths[allMonths.length - 2].usage_gb * 100)
      : 0;

    const lastUpdated = current
      ? current.updated_at.split("-").reverse().join(".")
      : null;

    res.json({
      success: true,
      data: {
        totalUsage,
        avgUsage,
        monthCount:   allMonths.length,
        peakMonth:    maxHistoryUsage,
        predicted:    Math.max(0, predicted),
        currentVsPrev,
        lastUpdated,
      },
    });
  } catch (err) {
    console.error("getStats error:", err);
    res.status(500).json({ success: false, error: "Failed to compute stats" });
  }
}

module.exports = {
  getAllUsage,
  getUsageById,
  createUsage,
  updateUsage,
  deleteUsage,
  getStats,
};