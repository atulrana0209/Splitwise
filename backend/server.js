const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');



dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security Headers ────────────────────────────────────────────────────────
app.use(helmet());

// ── HTTP Request Logging ──────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ── CORS ──────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));


// ── Body Parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' })); // limit body size
app.use(express.urlencoded({ extended: false }));

// ── Rate Limiting ────────────────────────────────────────────────────────
const isTest = process.env.NODE_ENV === 'test';

const globalLimiter = isTest
  ? (req, res, next) => next() // disabled in test
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, message: 'Too many requests, please try again later.' },
    });

const authLimiter = isTest
  ? (req, res, next) => next() // disabled in test
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 10,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, message: 'Too many auth attempts, please wait 15 minutes.' },
    });

app.use(globalLimiter);

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/settlements', require('./routes/settlements'));

// ── Health Check ─────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'UnitySplit API is running',
    env: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// ── 404 Handler ───────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` });
});

// ── Centralized Error Handler ─────────────────────────────────────────────
const { errorHandler } = require('./middleware/errorHandler');
app.use(errorHandler);

// ── Database & Server Start ───────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/unitysplit';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    });

    // ── Graceful Shutdown ────────────────────────────────────────────────
    const shutdown = (signal) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      server.close(() => {
        mongoose.connection.close(false, () => {
          console.log('MongoDB connection closed. Process exiting.');
          process.exit(0);
        });
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  })
  .catch((err) => {
    console.error('❌ Error connecting to MongoDB:', err.message);
    process.exit(1);
  });
