const { logger } = require("../utils/logger");
const Search = require("../models/search");

const searchPostController = async (req, res) => {
  logger.info("Search endpoint hit !");
  try {
    const { query } = req.query;

    const cacheKey = `search:${query}`;
    const cachedSearch = await req.redisClient.get(cacheKey);
    if (cachedSearch) {
      return res.json(JSON.parse(cachedSearch));
    }
    const results = await Search.find(
      {
        $text: { $search: query },
      },
      {
        score: { $meta: "textScore" },
      }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(10);

    await req.redisClient.setex(cacheKey, 300, JSON.stringify(results));

    return res.json(results);
  } catch (e) {
    logger.error("Error searching post", e);
    res.status(500).json({
      success: false,
      message: "Error while searching post",
    });
  }
};

module.exports = { searchPostController };
