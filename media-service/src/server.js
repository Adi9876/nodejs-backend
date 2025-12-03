require("dotenv").config();
const cors = require("cors");
const express = require("express");
const errorHandler = require("./middleware/errorHandler");
const { rateLimit } = require("express-rate-limit");
const mongoose = require("mongoose");
const { RedisStore } = require("rate-limit-redis");
const helmet = require("helmet");
const Redis = require("ioredis");
const mediaRoutes = require("./routes/media-routes");
const { logger } = require("./utils/logger");
const { connectRabbitMQ, consumeEvent } = require("./utils/rabbitMQ");
const { handlePostDeleted } = require("./eventHandlers/media-event-handlers");

const app = express();
const PORT = process.env.PORT || 3003;

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

// sensitive endpoint
const sensitiveEndpointLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Sensitive endpoint rate limit exceeded for IP ${req.ip}`);
    res.status(429).json({
      success: false,
      message: "Too many requests",
    });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

app.use("/api/media", mediaRoutes);

app.use(errorHandler);

async function startServer() {
  try {
    await connectRabbitMQ();
    // consume all the events
    await consumeEvent("post.deleted", handlePostDeleted);
    app.listen(PORT, () => {
      logger.info(`Media service running on port ${PORT}`);
    });
  } catch (e) {
    logger.error("Failed to start server!");
    process.exit(1);
  }
}

startServer();

process.on("unhandledRejection", (reason, promise) => {
  logger.error(`Unhandled Rejection at ${promise}, reason: ${reason} `);
});
