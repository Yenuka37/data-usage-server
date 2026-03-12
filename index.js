require("dotenv").config();

const express       = require("express");
const cors          = require("cors");
const cloudinary    = require("cloudinary").v2;
const { connectDB } = require("./config/db");
const usageRoutes   = require("./routes/usage");
const uploadRoutes  = require("./routes/upload");

const app  = express();
const PORT = process.env.PORT || 8080;

// ── Cloudinary config ───────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── CORS ────────────────────────────────────────────────────────────────────
const rawOrigin     = process.env.CLIENT_ORIGIN || "https://classy-otter-13763f.netlify.app";
const allowedOrigin = rawOrigin.replace(/\/$/, "");

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (origin.replace(/\/$/, "") === allowedOrigin) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type"],
}));
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────────────────────
app.use("/api", usageRoutes);
app.use("/api", uploadRoutes);

// ── Health check ────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ success: true, status: "ok", timestamp: new Date().toISOString() });
});

// ── 404 fallback ────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route not found: ${req.path}` });
});

// ── Connect DB then start ───────────────────────────────────────────────────
connectDB()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`DataPulse API running on http://0.0.0.0:${PORT}`);
      console.log(`  GET    /api/health`);
      console.log(`  GET    /api/usage`);
      console.log(`  GET    /api/usage/:id`);
      console.log(`  POST   /api/usage`);
      console.log(`  PUT    /api/usage/:id`);
      console.log(`  DELETE /api/usage/:id`);
      console.log(`  GET    /api/stats`);
      console.log(`  POST   /api/upload`);
    });
  })
  .catch(err => {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });