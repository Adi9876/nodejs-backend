const Media = require("../models/media");
const { deleteMediaFromCloudinary } = require("../utils/cloudinary");
const { logger } = require("../utils/logger");

const handlePostDeleted = async (event) => {
  // console.log(event, "event.....");
  const { postId, userId, mediaIds } = event;
  try {
    const mediaToDelete = await Media.find({ _id: { $in: mediaIds } });

    for (const media of mediaToDelete) {
      await deleteMediaFromCloudinary(media.publicId);
      await Media.findById(media._id);
      logger.info(
        `Deleted media: ${media._id} associated with post : ${postId}`
      );
    }

    logger.info(`Processed deletion of media for postId ${postId}`);
  } catch (e) {
    logger.error("Error occured while media deletion");
  }
};

module.exports = { handlePostDeleted };

// this will use up from the post service..
