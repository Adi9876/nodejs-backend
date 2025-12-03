//user register
//user login
//refresh token
//logout

const { logger } = require("../utils/logger");
const { validateRegistration, validateLogin } = require("../utils/validation");
const User = require("../models/user");
const generateTokens = require("../utils/generateToken");
const RefreshToken = require("../models/refresh-token");

const registerUser = async (req, res) => {
  logger.info("Register endpoint hit");

  // validate it
  try {
    const { error } = validateRegistration(req.body);
    if (error) {
      logger.warn("Validation error", error.details[0].message);
      return res.status(400).json({
        success: false,
        error: error.details[0].message,
      });
    }

    const { username, email, password } = req.body;
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      logger.warn("User already exists");
      return res.status(400).json({
        success: false,
        error: "User already exists",
      });
    }

    user = new User({ username, email, password });
    await user.save();
    logger.info("User saved !!", user._id);

    const { accessToken, refreshToken } = await generateTokens(user);
    res.status(201).json({
      success: true,
      message: "User registered !!",
      accessToken,
      refreshToken,
    });
  } catch (e) {
    logger.error("Registeration Error occrured");
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const loginUser = async (req, res) => {
  logger.info("Login endpoint hit");
  try {
    const { error } = validateLogin(req.body);
    if (error) {
      logger.warn("Validation error", error.details[0].message);
      return res.status(400).json({
        success: false,
        error: error.details[0].message,
      });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      logger.warn("Invalid user");
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      logger.warn("Invalid password");
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const { accessToken, refreshToken } = await generateTokens(user);
    res.json({
      accessToken,
      refreshToken,
      userId: user._id,
    });
  } catch (error) {
    logger.error("Login Error occrured");
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const refreshTokenUser = async (req, res) => {
  logger.info("Refresh Token endpoint hit");

  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.error("Refresh token missing");
      res.status(500).json({
        success: false,
        message: "Refresh token missing",
      });
    }

    const storedToken = await RefreshToken.findOne({ refreshToken });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      logger.warn("Invalid or expired refresh token");
      return res.status(401).json({
        success: false,
        message: "Internal server error",
      });
    }

    const user = await RefreshToken.findById(storedToken.user);
    if (!user) {
      logger.warn("User not found");
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    const { accessToken: newAccessToken, refreshToken: newrefreshToken } =
      await generateTokens(user);

    await RefreshToken.deleteOne({ _id: storedToken._id });

    return res.json({
      accessToken: newAccessToken,
      refreshToken: newrefreshToken,
    });
  } catch (error) {
    logger.error("Refresh token error occrured");
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const logoutUser = async (req, res) => {
  logger.info("Logout endpoint hit");
  try {
    // delete first
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.error("Refresh token missing");
      res.status(500).json({
        success: false,
        message: "Refresh token missing",
      });
    }
    await RefreshToken.deleteOne({ _id: storedToken._id });

    logger.info("Refresh token deleted for logout");

    return res.json({
      success: true,
      message: "Logged Out successfully",
    });
  } catch (error) {
    logger.error("Log Out error");
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = { registerUser, loginUser, refreshTokenUser, logoutUser };
