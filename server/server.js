const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");

dotenv.config();

connectDB();

const app = express();

const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  methods: ["GET", "POST"],
};
app.use(cors(corsOptions));

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Whispr Backend API is running!");
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  pingTimeout: 60000,
  cors: corsOptions,
});

io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  console.log("Socket Auth Middleware: Attempting auth with token:", token ? "Token Present" : "No Token");

  if (!token) {
    console.error("Socket Auth Middleware: Authentication error - No token provided");
    return next(new Error("Authentication error: No token provided"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Socket Auth Middleware: Token decoded - User ID:", decoded.id);

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      console.error("Socket Auth Middleware: Authentication error - User not found for token");
      return next(new Error("Authentication error: User not found"));
    }

    socket.user = user;
    console.log(`Socket Auth Middleware: User ${user.username} authenticated for socket ${socket.id}`);
    next();
  } catch (error) {
    console.error("Socket Auth Middleware: Authentication error - Token invalid", error.message);
    next(new Error("Authentication error: Token is invalid"));
  }
});

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}, User: ${socket.user.username} (${socket.user._id})`);

  socket.join(socket.user._id.toString());
  console.log(`Socket ${socket.id} joined room: ${socket.user._id.toString()}`);
  socket.emit("connected");

  socket.on("sendMessage", (messageData) => {
    console.log(`Message received from ${socket.user.username} to ${messageData.receiverId}:`, messageData.content);

    const receiverRoom = messageData.receiverId?.toString();
    const senderId = socket.user._id.toString();

    if (!receiverRoom || !messageData.content) {
        console.error("sendMessage Error: Missing receiverId or content");
        return;
    }

    const messageToSend = {
        sender: {
            _id: senderId,
            username: socket.user.username,
        },
        receiver: receiverRoom,
        content: messageData.content,
        createdAt: new Date().toISOString(),
    };

    console.log(`Emitting message to room: ${receiverRoom}`);
    io.to(receiverRoom).emit("receiveMessage", messageToSend);
  });

  socket.on("typing", (room) => {
      console.log(`${socket.user.username} is typing in room ${room}`);
      socket.to(room).emit("typing", { userId: socket.user._id, username: socket.user.username });
  });
  socket.on("stop typing", (room) => {
      console.log(`${socket.user.username} stopped typing in room ${room}`);
      socket.to(room).emit("stop typing", { userId: socket.user._id });
  });

  socket.on("disconnect", (reason) => {
    console.log(`Socket disconnected: ${socket.id}, User: ${socket.user?.username}, Reason: ${reason}`);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server (including Socket.IO) is running on port ${PORT}`);
});
