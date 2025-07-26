// server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/db');
const chatRoutes = require('./routes/chatRoutes');

// Connect to Database
connectDB();

const app = express();

// Middleware
app.use(cors()); // Allow cross-origin requests (for React frontend)
app.use(express.json()); // Parse JSON bodies

// API Routes
app.use('/api', chatRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} 🚀`));