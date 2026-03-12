const express = require("express");
const cors    = require("cors");
const path    = require("path");

const usageRoutes = require("./routes/usage");

const app  = express();
const PORT = process.env.PORT || 8080;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || "https://classy-otter-13763f.netlify.app",
  methods: ["GET"],
}));
app.use(express.json());

// ── Static: screenshots ─────────────────────────────────────────────────────
app.use(
  "/screenshots",
  express.static(path.join(__dirname, "public", "screenshots"))
);

// ── Routes ──────────────────────────────────────────────────────────────────
app.use("/api", usageRoutes);

// ── Health check ────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ success: true, status: "ok", timestamp: new Date().toISOString() });
});

// ── 404 fallback ────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route not found: ${req.path}` });
});

// ── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`DataPulse API running on http://localhost:${PORT}`);
  console.log(`  GET /api/health`);
  console.log(`  GET /api/usage`);
  console.log(`  GET /api/usage?status=ongoing`);
  console.log(`  GET /api/usage?status=history`);
  console.log(`  GET /api/usage/:month`);
  console.log(`  GET /api/stats`);
  console.log(`  GET /screenshots/:filename`);
});