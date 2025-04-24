// server.js

const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");

// Load environment variables from .env file 
dotenv.config();

// Connect to Database
connectDB(); // Call the function to establish connection

// Create an Express application instance
const app = express();

// Enable CORS for all routes
app.use(cors());

// Middleware to parse JSON request bodies
app.use(express.json());

// Define a simple route for testing
app.get("/", (req, res) => {
  res.send("Whispr Backend API is running!");
});

// --- Define Routes (We will add these later) ---
// Example: app.use('/api/users', require('./routes/userRoutes'));
// Example: app.use('/api/messages', require('./routes/messageRoutes'));
// --- End Routes ---

// Get the port from environment variables or use a default
const PORT = process.env.PORT || 5000; // You mentioned you set PORT=5000

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
