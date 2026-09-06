require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const errorHandler = require('./middleware/errorHandler');
const path = require('path');

const app = express();

// Security & Utility Middleware
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (mobile, serverless invocations, curl)
    if (!origin) return callback(null, true);
    if (
      origin.includes('localhost') || 
      origin.includes('127.0.0.1') || 
      origin.endsWith('.vercel.app') ||
      (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL)
    ) {
      return callback(null, true);
    }
    // Permissive for public API endpoints
    return callback(null, true);
  },
  optionsSuccessStatus: 200
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploads directory statically (in local environments)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount routes supporting both with and without '/api' prefix for rewrite versatility
const contactRouter = require('./routes/contact');
const quoteRouter = require('./routes/quote');
const currencyRouter = require('./routes/currency');
const uploadRouter = require('./routes/upload');
const adminRouter = require('./routes/admin');

app.use('/api/contact', contactRouter);
app.use('/contact', contactRouter);

app.use('/api/quote', quoteRouter);
app.use('/quote', quoteRouter);

app.use('/api/currency', currencyRouter);
app.use('/currency', currencyRouter);

app.use('/api/upload', uploadRouter);
app.use('/upload', uploadRouter);

app.use('/admin', adminRouter);

// Health check endpoints
const healthHandler = (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
};
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// Catch-all 404 handler returning structured JSON
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.originalUrl || req.url}`,
    message: `Endpoint not found: ${req.method} ${req.originalUrl || req.url}`
  });
});

// Centralized error handling
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
if (require.main === module || (!process.env.VERCEL && process.env.NODE_ENV !== 'test')) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

module.exports = app;
