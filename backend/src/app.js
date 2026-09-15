const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { env } = require('./config/env');
const apiRoutes = require('./routes');
const { errorHandler, notFound } = require('./middlewares/error');

const app = express();

app.use(helmet());

// Configure CORS to accept multiple origins
const allowedOrigins = [
  'http://localhost:5173',      // Local frontend (Vite dev)
  'http://localhost:3000',      // Alternative local frontend
  'http://localhost:4000',      // Local backend (for testing)
  env.corsOrigin,               // From .env file
  env.appPublicUrl              // App public URL from .env
];

// Add Netlify domain dynamically if in production
if (process.env.NODE_ENV === 'production') {
  const netlifyDomain = process.env.NETLIFY_DOMAIN;
  if (netlifyDomain) {
    allowedOrigins.push(netlifyDomain);
  }
}

app.use(cors({ 
  origin: allowedOrigins.filter(Boolean), 
  credentials: true 
}));

app.use(express.json());
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'smartbooking-api' });
});

app.use('/api', apiRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = { app };
