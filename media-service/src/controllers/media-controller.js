const { uploadMediaToCloudinary } = require("../utils/cloudinary");
const { logger } = require("../utils/logger");
const Media = require("../models/media");

const uploadMedia = async (req, res) => {
  logger.info("Starting media upload");
  try {
    if (!req.file) {
      logger.error("No file found, please try adding a file");
      return res.status(400).json({
        success: false,
        message: "No file found, please try adding a file",
      });
    }

    const { originalname, mimetype, buffer } = req.file;
    const userId = req.user.userId;
    logger.info(`File details: ${originalname}, type : ${mimetype}`);
    logger.info("Uploading to cloudinary starting");

    const cloudinaryUploadMedia = await uploadMediaToCloudinary(req.file);
    logger.info(
      `Cloudinary upload successful ! Public Id : ${cloudinaryUploadMedia.public_id}`
    );

    const newlyCreatedMedia = new Media({
      publicId: cloudinaryUploadMedia.public_id,
      originalName: originalname,
      mimeType: mimetype,
      url: cloudinaryUploadMedia.secure_url,
      userId,
    });

    await newlyCreatedMedia.save();

    return res.status(201).json({
      success: true,
      mediaId: newlyCreatedMedia._id,
      url: newlyCreatedMedia.url,
      message: "Media upload is successful",
    });
  } catch (e) {
    logger.error("Error uploading media", e);
    res.status(400).json({
      success: false,
      message: "Error uploading media ",
    });
  }
};

const getAllMedias = async (req, res) => {
  try {
    const result = await Media.find({});
    res.json({ result });
  } catch (e) {
    logger.error("Error fetcing medias", e);
    res.status(400).json({
      success: false,
      message: "Error fetching medias",
    });
  }
};

module.exports = { uploadMedia, getAllMedias };
