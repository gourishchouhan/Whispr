// routes/userRoutes.js

const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  getUserProfile,
  searchUsers, // <-- Import the new controller function
} = require("../controller/userController");

const router = express.Router();

// Existing route for user profile
router.get("/profile", protect, getUserProfile);

// --- NEW ROUTE ---
// This route handles searching for users. e.g., /api/users/search?q=john
router.get("/search", protect, searchUsers);

module.exports = router;