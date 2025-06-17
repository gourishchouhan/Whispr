// server.js

const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const Message = require("./models/Message"); // <-- 1. Import the Message model
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");

// ... (rest of your setup code is fine)
dotenv.config();
connectDB();
const app = express();
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  methods: ["GET", "POST"],
};
app.use(cors(corsOptions));
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
const server = http.createServer(app);
const io = new Server(server, {
  pingTimeout: 60000,
  cors: corsOptions,
});
const onlineUsers = new Map();

// ... (your io.use() auth middleware is fine)
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Authentication error: No token provided"));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return next(new Error("Authentication error: User not found"));
    }
    socket.user = user;
    next();
  } catch (error) {
    next(new Error("Authentication error: Token is invalid"));
  }
});

io.on("connection", (socket) => {
  const userId = socket.user._id.toString();
  console.log(
    `Socket connected: ${socket.id}, User: ${socket.user.username} (${userId})`,
  );

  onlineUsers.set(userId, socket.id);
  io.emit("updateOnlineUsers", Array.from(onlineUsers.keys()));

  socket.join(userId);
  socket.emit("connected");

  // --- MODIFIED: sendMessage listener ---
  socket.on("sendMessage", async (messageData) => {
    // <-- 2. Make the function async
    const receiverId = messageData.receiverId?.toString();
    const senderId = socket.user._id;

    if (!receiverId || !messageData.content) {
      console.error("sendMessage Error: Missing receiverId or content");
      return;
    }

    try {
      // 3. Create the new message object to be saved
      const newMessage = new Message({
        sender: senderId,
        receiver: receiverId,
        content: messageData.content,
      });

      // 4. Save the message to the database
      let savedMessage = await newMessage.save();

      // 5. Populate the sender's info before emitting
      // .populate() returns the full document, which is what we want
      savedMessage = await savedMessage.populate("sender", "username");

      console.log(`Emitting saved message to room: ${receiverId}`);

      // 6. Emit the FULL saved message object (it now has a unique _id)
      io.to(receiverId).emit("receiveMessage", savedMessage);
    } catch (error) {
      console.error("Error saving or emitting message:", error);
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(
      `Socket disconnected: ${socket.id}, User: ${socket.user?.username}, Reason: ${reason}`,
    );
    onlineUsers.delete(userId);
    io.emit("updateOnlineUsers", Array.from(onlineUsers.keys()));
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server (including Socket.IO) is running on port ${PORT}`);
});