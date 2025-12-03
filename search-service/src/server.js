require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const Redis = require("ioredis");
const helmet = require("helmet");
const { logger } = require("./utils/logger");
const searchRoutes = require("./routes/search-routes.js");

const errorHandler = require("./middleware/errorHandler");
const { connectRabbitMQ, consumeEvent } = require("./utils/rabbitMQ.js");
const {
  handlePostCreated,
  handlePostDeleted,
} = require("./eventHandlers/search-event-handlers.js");

const app = express();
const PORT = process.env.PORT || 3004;

//connect to db
mongoose
  .connect(process.env.MONGODB_URL)
  .then(() => {
    logger.info("Connected to mongodb.");
  })
  .catch((e) => {
    logger.error("Mongo Connection error: ", e);
  });

const redisClient = new Redis(process.env.REDIS_URL);

// middleware

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Request body ${req.body}`);
  next();
});

// const sensitiveEndpointLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 50,
//   standardHeaders: true,
//   legacyHeaders: false,
//   handler: (req, res) => {
//     logger.warn(`Sensitive endpoint rate limit exceeded for IP ${req.ip}`);
//     res.status(429).json({
//       success: false,
//       message: "Too many requests",
//     });
//   },
//   store: new RedisStore({
//     sendCommand: (...args) => redisClient.call(...args),
//   }),
// });

app.use(
  "/api/search",
  (req, res, next) => {
    req.redisClient = redisClient;
    next();
  },
  searchRoutes
);

// but we don't have any search entries
// os we'll have to publish event when user creates a post
// and consume it as well
// so go to post controller and publish an event after the post creation

app.use(errorHandler);

async function startServer() {
  try {
    await connectRabbitMQ();

    // consume event / subscribe to the events
    await consumeEvent("post.created", handlePostCreated);
    await consumeEvent("post.deleted", handlePostDeleted);

    app.listen(PORT, () => {
      logger.info(`Search service running on port ${PORT}`);
    });
  } catch (e) {
    logger.error(e, "failed to start search service");
    process.exit(1);
  }
}

startServer();
