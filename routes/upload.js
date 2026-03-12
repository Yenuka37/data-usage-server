const express  = require("express");
const router   = express.Router();
const multer   = require("multer");
const path     = require("path");
const { uploadToCloudinary } = require("../controllers/uploadController");

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"];

// Use memory storage — stream buffer directly to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (_req, file, cb) => {
    const ext      = path.extname(file.originalname).toLowerCase();
    const mimeOk   = file.mimetype.startsWith("image/") ||
                     file.mimetype === "application/octet-stream";
    const extOk    = ALLOWED_EXTENSIONS.includes(ext);

    if (mimeOk || extOk) cb(null, true);
    else cb(new Error(`Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`));
  },
});

// POST /api/upload  → multipart/form-data with field "image"
router.post("/upload", upload.single("image"), uploadToCloudinary);

module.exports = router;