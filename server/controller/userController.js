// controllers/userController.js

const asyncHandler = require("express-async-handler");

// IMPORTANT: Check your folder structure and use the correct path below!
// If your 'models' folder is inside 'server', use '../models/userModel'
// If your 'models' folder is at the root (next to 'server'), use '../../models/userModel'
const User = require("../models/User"); // <-- LIKELY FIX: Use this path if 'models' is at the root.

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  if (user) {
    res.json(user);
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

// @desc    Search for users by username
// @route   GET /api/users/search?q=<query>
// @access  Private
const searchUsers = asyncHandler(async (req, res) => {
  const searchQuery = req.query.q
    ? {
        username: {
          $regex: req.query.q,
          $options: "i",
        },
      }
    : {};

  const users = await User.find({
    ...searchQuery,
    _id: { $ne: req.user.id },
  }).select("-password");

  res.json(users);
});

module.exports = {
  getUserProfile,
  searchUsers,
};