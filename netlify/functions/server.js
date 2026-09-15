const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

// Import your backend routes
const authRoutes = require('../../backend/src/routes/authRoutes');
const bookingRoutes = require('../../backend/src/routes/bookingRoutes');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend is running' });
});

module.exports = app;
