// GIVRwrld API Server
// Self-hosted API for local/production deployments

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import paypalRoutes, { paypalWebhookRouter } from './routes/paypal.js';
import authRoutes from './routes/auth.js';
import checkoutRoutes from './routes/checkout.js';
import plansRoutes from './routes/plans.js';
import ordersRoutes from './routes/orders.js';
import serversRoutes from './routes/servers.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration - must be before other middleware
const corsOptions = {
  origin: process.env.FRONTEND_URL 
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
    : (process.env.NODE_ENV === 'production' ? false : true),
  // Frontend uses `credentials: include`; allow cookies/auth headers in local dev too.
  credentials: process.env.FRONTEND_URL ? true : (process.env.NODE_ENV === 'production' ? false : true),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Webhooks must be mounted BEFORE express.json() to preserve raw body
app.use('/api/paypal/webhook', paypalWebhookRouter);

// Body parsing middleware (for all other routes)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'givrwrld-api'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/paypal', paypalRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/servers', serversRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 GIVRwrld API Server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth: http://localhost:${PORT}/api/auth`);
  console.log(`💳 PayPal: http://localhost:${PORT}/api/paypal`);
});

export default app;


