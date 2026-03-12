const fs   = require("fs");
const path = require("path");

const DATA_PATH = path.join(__dirname, "../data/usage.json");

// ── Helper ──────────────────────────────────────────────────────────────────
function readUsage() {
  const raw = fs.readFileSync(DATA_PATH, "utf8");
  return JSON.parse(raw);
}

// ── GET /api/usage ──────────────────────────────────────────────────────────
// Optional query: ?status=ongoing | ?status=completed
function getAllUsage(req, res) {
  try {
    let data = readUsage();
    const { status } = req.query;

    if (status === "ongoing") {
      data = data.filter(m => m.status === "ongoing");
    } else if (status === "completed") {
      data = data.filter(m => m.status === "completed");
    }

    // Always return oldest → newest (sorted by updated_at)
    data.sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at));

    res.json({ success: true, data });
  } catch (err) {
    console.error("getAllUsage error:", err);
    res.status(500).json({ success: false, error: "Failed to load usage data" });
  }
}

// ── GET /api/usage/:month ───────────────────────────────────────────────────
function getUsageByMonth(req, res) {
  try {
    const data  = readUsage();
    const month = decodeURIComponent(req.params.month);
    const item  = data.find(m => m.month === month);

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
function getStats(req, res) {
  try {
    const raw     = readUsage();
    const current = raw.find(m => m.status === "ongoing");

    // completed months sorted oldest → newest
    const history = raw
      .filter(m => m.status === "completed")
      .sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at));

    // allMonths: oldest → newest, ongoing appended at end
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

    // last updated = ongoing month's updated_at → DD.MM.YYYY
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