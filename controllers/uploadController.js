const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

// Cloudinary is configured via env vars set in .env / Railway:
// CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET

async function uploadToCloudinary(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No image file provided" });
    }

    // Stream the buffer to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder:         "datapulse",
          transformation: [{ quality: "auto", fetch_format: "auto" }],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });

    res.json({
      success: true,
      data: {
        url:       result.secure_url,
        public_id: result.public_id,
      },
    });
  } catch (err) {
    console.error("uploadToCloudinary error:", err);
    res.status(500).json({ success: false, error: "Image upload failed" });
  }
}

module.exports = { uploadToCloudinary };