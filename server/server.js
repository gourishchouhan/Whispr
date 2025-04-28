const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
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
  cors: corsOptions
});

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on("setup", (userData) => {
      console.log(`Setup event received for user: ${userData?._id} on socket ${socket.id}`);
      socket.join(userData._id);
      console.log(`Socket ${socket.id} joined room: ${userData._id}`);
      socket.emit("connected");
  });

  socket.on("sendMessage", (messageData) => {
      console.log("Message received on backend:", messageData);
      const receiverRoom = messageData.receiver;
      if (receiverRoom) {
          console.log(`Emitting message to room: ${receiverRoom}`);
          socket.to(receiverRoom).emit("receiveMessage", messageData);
      }
  });

  socket.on("typing", (room) => socket.to(room).emit("typing"));
  socket.on("stop typing", (room) => socket.to(room).emit("stop typing"));

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server (including Socket.IO) is running on port ${PORT}`);
});

