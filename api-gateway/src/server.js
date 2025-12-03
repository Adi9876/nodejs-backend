require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Redis = require("ioredis");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const logger = require("./utils/logger");
const proxy = require("express-http-proxy");
const errorHandler = require("./middleware/errorHandler");
const { validateToken } = require("./middleware/authMiddleware");

const app = express();
const PORT = process.env.PORT || 3000;

const redisClient = new Redis(process.env.REDIS_URL);

app.use(helmet());
app.use(cors());
app.use(express.json());

//rate limiting
const ratelimitOptions = rateLimit({
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

app.use(ratelimitOptions);

//logging

app.use((req, res, next) => {
  // basically for logging only
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Request body ${req.body}`);
  next();
});

// api-gateway -> /v1/auth/register -> 3000;
// id-service  -> /api/auth/register -> 3001;
// so
// localhost:3000/v1/auth/register -> localhost:3001/api/auth/register VIA PROXY

const proxyOptions = {
  proxyReqPathResolver: (req) => {
    return req.originalUrl.replace(/^\/v1/, "/api");
  },
  proxyErrorHandler: (err, res, next) => {
    logger.error(`Proxy Error ${err}`);
    res.status(500).json({
      message: "Internal Server Error",
      error: err.message,
    });
  },
};

// setting up proxy for our identity service

app.use(
  "/v1/auth",
  proxy(process.env.IDENTITY_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyReqData, userReq, userRes) => {
      logger.info(`Response received from identity service ${proxyRes}`);
      return proxyReqData;
    },
  })
);

// setting up proxy for our post service

app.use(
  "/v1/posts",
  validateToken, // imp
  proxy(process.env.POST_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyReqData, userReq, userRes) => {
      logger.info(`Response received from Post service ${proxyRes}`);
      return proxyReqData;
    },
  })
);

// setting up proxy for our media service

app.use(
  "/v1/media",
  validateToken,
  proxy(process.env.MEDIA_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;

      // single multi part data not text
      if (!srcReq.headers["content-type"].startsWith("multipart/form-data")) {
        proxyReqOpts.headers["Content-Type"] = "application/json";
      }
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyReqData, userReq, userRes) => {
      logger.info(`Response received from Media service ${proxyRes}`);
      return proxyReqData;
    },
    parseReqBody: false, // ensure that entire is also for file upload also
  })
);

// setting up proxy for our search service

app.use(
  "/v1/search",
  validateToken, // imp
  proxy(process.env.SEARCH_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyReqData, userReq, userRes) => {
      logger.info(`Response received from Search service ${proxyRes}`);
      return proxyReqData;
    },
  })
);

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`API Gateway is running on PORT ${PORT}`);
  logger.info(
    `Identity service is running on port ${process.env.IDENTITY_SERVICE_URL}`
  );
  logger.info(
    `Post service is running on port ${process.env.POST_SERVICE_URL}`
  );
  logger.info(
    `Media service is running on port ${process.env.MEDIA_SERVICE_URL}`
  );
  logger.info(
    `Search service is running on port ${process.env.SEARCH_SERVICE_URL}`
  );
  logger.info(`Redis Url ${process.env.REDIS_URL}`);
});
