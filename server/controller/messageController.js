const Message = require("../models/Message");
const User = require("../models/User");

const sendMessage = async (req, res) => {
  const { receiverId, content } = req.body;
  const senderId = req.user._id;

  if (!receiverId || !content) {
    return res
      .status(400)
      .json({ message: "Receiver ID and message content are required" });
  }

  try {
    const receiverExists = await User.findById(receiverId);
    if (!receiverExists) {
      return res.status(404).json({ message: "Receiver user not found" });
    }

    const newMessage = new Message({
      sender: senderId,
      receiver: receiverId,
      content: content,
    });

    const savedMessage = await newMessage.save();

    res.status(201).json(savedMessage);
  } catch (error) {
    console.error("Send Message Error:", error);
    res.status(500).json({ message: "Server error sending message" });
  }
};

const getMessages = async (req, res) => {
  const otherUserId = req.params.userId;
  const loggedInUserId = req.user._id;

  try {
    const messages = await Message.find({
      $or: [
        { sender: loggedInUserId, receiver: otherUserId },
        { sender: otherUserId, receiver: loggedInUserId },
      ],
    })
      .sort({ createdAt: 1 })
      .populate("sender", "username")
      .populate("receiver", "username");

    res.status(200).json(messages);
  } catch (error) {
    console.error("Get Messages Error:", error);
    res.status(500).json({ message: "Server error retrieving messages" });
  }
};

module.exports = {
  sendMessage,
  getMessages,
};
