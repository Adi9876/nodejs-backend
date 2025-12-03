const logger = require("../utils/logger");
const jwt = require("jsonwebtoken");
const validateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    logger.warn("Access attempt without valid token");
    return res.status(401).json({
      message: "Auth required",
      success: false,
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decodedUser) => {
    if (err) {
      logger.warn("Invalid token");
      return res.status(401).json({
        message: "Invalid token",
        success: false,
      });
    }

    // Attach decoded user payload to the request and continue
    req.user = decodedUser;
    next();
  });
};

module.exports = { validateToken };
