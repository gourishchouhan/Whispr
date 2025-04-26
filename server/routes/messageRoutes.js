const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  sendMessage,
  getMessages,
} = require("../controller/messageController");

const router = express.Router();

router.use(protect);

router.post("/", sendMessage);
router.get("/:userId", getMessages);

module.exports = router;
