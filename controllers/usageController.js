const { getDB } = require("../config/db");

const COLLECTION = "usage";

// ── GET /api/usage ──────────────────────────────────────────────────────────
// Optional query: ?status=ongoing | ?status=completed
async function getAllUsage(req, res) {
  try {
    const db     = getDB();
    const filter = {};
    const { status } = req.query;

    if (status === "ongoing" || status === "completed") {
      filter.status = status;
    }

    // Always return oldest → newest (sorted by updated_at)
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

// ── GET /api/usage/:month ───────────────────────────────────────────────────
async function getUsageByMonth(req, res) {
  try {
    const db    = getDB();
    const month = decodeURIComponent(req.params.month);

    const item = await db
      .collection(COLLECTION)
      .findOne({ month });

    if (!item) {
      return res.status(404).json({ success: false, error: "Month not found" });
    }

    res.json({ success: true, data: item });
  } catch (err) {
    console.error("getUsageByMonth error:", err);
    res.status(500).json({ success: false, error: "Failed to load usage data" });
  }
}

// ── GET /api/stats ──────────────────────────────────────────────────────────
async function getStats(req, res) {
  try {
    const db = getDB();

    // Fetch ongoing and completed in parallel
    const [currentArr, history] = await Promise.all([
      db.collection(COLLECTION)
        .find({ status: "ongoing" })
        .toArray(),
      db.collection(COLLECTION)
        .find({ status: "completed" })
        .sort({ updated_at: 1 })
        .toArray(),
    ]);

    const current = currentArr[0] || null;

    // allMonths: completed oldest→newest, ongoing appended at end
    const allMonths = [...history];
    if (current) allMonths.push(current);

    const totalUsage = allMonths.reduce((s, m) => s + m.usage_gb, 0);
    const avgUsage   = allMonths.length > 0 ? totalUsage / allMonths.length : 0;

    const maxHistoryUsage = history.reduce(
      (max, m) => (m.usage_gb > max.usage_gb ? m : max),
      history[0] || { usage_gb: 0 }
    );

    // 2nd-order difference prediction
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

    // lastUpdated = ongoing month's updated_at → DD.MM.YYYY
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

module.exports = { getAllUsage, getUsageByMonth, getStats };