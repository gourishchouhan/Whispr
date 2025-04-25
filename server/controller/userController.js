const User = require("../models/User");

const getUserProfile = async (req, res) => {
  if (req.user) {
    res.json({
      _id: req.user._id,
      username: req.user.username,
      email: req.user.email,
    });
  } else {
    res.status(404).json({ message: "User not found" });
  }
};

module.exports = {
  getUserProfile,
};
