const { logger } = require("../utils/logger");
const { validateCreatePost } = require("../utils/validation");
const Post = require("../models/post");
const { publishEvent } = require("../utils/rabbitMQ");

async function invalidatePostCache(req, input) {
  const cachedKey = await req.redisClient.keys(`post:${input}`);
  if (cachedKey.length > 0) {
    await req.redisClient.del(cachedKey);
  }
  const keys = await req.redisClient.keys("posts:*");
  if (keys.length > 0) {
    await req.redisClient.del(keys);
  }
}

const createPost = async (req, res) => {
  logger.info("Create Post endpoint hit");
  try {
    const { error } = validateCreatePost(req.body);
    if (error) {
      logger.warn("Validation error", error.details[0].message);
      return res.status(400).json({
        success: false,
        error: error.details[0].message,
      });
    }
    const { content, mediaIds } = req.body;
    const newlyCreatedPost = new Post({
      user: req.user.userId,
      content,
      mediaIds: mediaIds || [],
    });
    await newlyCreatedPost.save();

    // here we publish an event
    await publishEvent("post.created", {
      postId: newlyCreatedPost._id.toString(),
      userId: newlyCreatedPost.user.toString(),
      content: newlyCreatedPost.content,
      createdAt: newlyCreatedPost.createdAt,
    });

    logger.info("Post created successfully");

    await invalidatePostCache(req, newlyCreatedPost._id.toString());

    res.status(201).json({
      succees: true,
      message: "Post created successfully",
    });
  } catch (error) {
    logger.error("Error creating post", error);
    res.status(500).json({
      succees: false,
      message: "Error creating post",
    });
  }
};

const getAllPosts = async (req, res) => {
  logger.info("Get All Posts endpoint hit");

  try {
    // pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;

    // cache
    const cacheKey = `posts:${page}:${limit}`;
    const cachedPosts = await req.redisClient.get(cacheKey);
    if (cachedPosts) {
      return res.json(JSON.parse(cachedPosts));
    }
    const post = await Post.find({})
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    const totalNoOfPosts = await Post.countDocuments();
    const result = {
      post,
      currentpage: page,
      totalPages: Math.ceil(totalNoOfPosts / limit),
      totalPosts: totalNoOfPosts,
    };

    // firstly now save post in redis cache since not in cache
    await req.redisClient.setex(cacheKey, 300, JSON.stringify(result));

    return res.json(result);
  } catch (error) {
    logger.error("Error fetching posts", error);
    return res.status(500).json({
      succees: false,
      message: "Error fetching posts",
    });
  }
};

const getPost = async (req, res) => {
  logger.info("Get Post endpoint hit");

  try {
    const postId = req.params.id;
    const cacheKey = `post:${postId}`;
    const cachedPost = await req.redisClient.get(cacheKey);

    if (cachedPost) {
      return res.json(JSON.parse(cachedPost));
    }
    const singlePostDetailsbyId = await Post.findById(postId);
    if (!singlePostDetailsbyId) {
      return res.status(404).json({
        succees: false,
        message: "Post not found",
      });
    }

    await req.redisClient.setex(
      cacheKey,
      600,
      JSON.stringify(singlePostDetailsbyId)
    );

    return res.json(singlePostDetailsbyId);
  } catch (error) {
    logger.error("Error fetching post", error);
    res.status(500).json({
      succees: false,
      message: "Error fetching post",
    });
  }
};

const deletePost = async (req, res) => {
  logger.info("Delete Post endpoint hit");

  try {
    const postId = req.params.id;
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        succees: false,
        message: "Post not found",
      });
    }
    // publish delete event form here
    await publishEvent("post.deleted", {
      postId: post._id.toString(),
      userId: req.user.userId,
      mediaIds: post.mediaIds,
    });

    // owner chekc
    if (post.user.toString() !== req.user.userId) {
      return res.status(403).json({
        succees: false,
        message: "You are not authorized to delete this post",
      });
    }
    await Post.findByIdAndDelete(postId);
    await invalidatePostCache(req, postId);
    res.status(200).json({
      succees: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting post", error);
    res.status(500).json({
      succees: false,
      message: "Error deleting post",
    });
  }
};

module.exports = { createPost, getAllPosts, deletePost, getPost };
