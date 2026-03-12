require("dotenv").config();

const express = require("express");
const cors    = require("cors");

const { connectDB } = require("./config/db");
const usageRoutes   = require("./routes/usage");

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──────────────────────────────────────────────────────────────
const rawOrigin     = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const allowedOrigin = rawOrigin.replace(/\/$/, "");

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (origin.replace(/\/$/, "") === allowedOrigin) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  methods: ["GET"],
}));
app.use(express.json());


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

// ── Connect to MongoDB then start server ─────────────────────────────────────
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`DataPulse API running on http://localhost:${PORT}`);
      console.log(`  GET /api/health`);
      console.log(`  GET /api/usage`);
      console.log(`  GET /api/usage?status=ongoing`);
      console.log(`  GET /api/usage?status=completed`);
      console.log(`  GET /api/usage/:month`);
      console.log(`  GET /api/stats`);
    });
  })
  .catch(err => {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });