const express = require("express");
const multer = require("multer");
const { authenticateRequest } = require("../middleware/authMiddleware");

const { logger } = require("../utils/logger");
const {
  uploadMedia,
  getAllMedias,
} = require("../controllers/media-controller");
const router = express.Router();

// config multer for media storage

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
}).single("file");

router.post(
  "/upload",
  authenticateRequest,
  (req, res, next) => {
    upload(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        logger.error("Multer error while uploading", err);
        return res.status(400).json({
          message: "Multer error while uploading",
          error: err.message,
          stack: err.stack,
        });
      } else if (err) {
        logger.error("Unknown error while uploading", err);
        return res.status(500).json({
          message: "Unknown error while uploading",
          error: err.message,
          stack: err.stack,
        });
      }
      if (!req.file) {
        logger.error("No file found", err);
        return res.status(400).json({
          message: "No file found",
        });
      }
      next();
    });
  },
  uploadMedia
);

router.get("/get", authenticateRequest, getAllMedias);

module.exports = router;
