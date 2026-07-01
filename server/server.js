import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db.js';
import globalErrorHandler from './middleware/errorHandler.js';
import AppError from './utils/appError.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import packageRoutes from './routes/packageRoutes.js';
import vehicleRoutes from './routes/vehicleRoutes.js';
import testimonialRoutes from './routes/testimonialRoutes.js';
import inquiryRoutes from './routes/inquiryRoutes.js';

dotenv.config();

const app = express();

// Disable Express fingerprinting
app.disable('x-powered-by');

// Configure Helmet with sensible defaults
app.use(helmet());

// Admin Login Rate Limiting (15 minutes window, max 5 attempts)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.'
  },
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false
});

// Connect to MongoDB Atlas database
connectDB();

// CORS configuration (allow requests from the frontend client URL, local development, and dev tunnels)
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    const isProduction = process.env.NODE_ENV === 'production';
    
    // Parse allowed origins from environment variable (supports comma-separated list)
    const allowedOrigins = process.env.CLIENT_URL
      ? process.env.CLIENT_URL.split(',').map(url => url.trim())
      : [];

    // If the origin is in the allowed list, always allow it
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // In development mode, allow localhost, devtunnels.ms, and github.dev
    if (!isProduction) {
      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      const isDevTunnel = /^https?:\/\/[a-zA-Z0-9-]+\.(?:[a-zA-Z0-9-]+\.)*devtunnels\.ms$/.test(origin);
      const isGithubDev = /^https?:\/\/[a-zA-Z0-9-]+\.(?:[a-zA-Z0-9-]+\.)*github\.dev$/.test(origin);

      if (isLocalhost || isDevTunnel || isGithubDev) {
        return callback(null, true);
      }
    }

    // Reject the origin by passing false (standard CORS rejection without throwing Express errors)
    return callback(null, false);
  },
  credentials: true
};
app.use(cors(corsOptions));

// Request body parsers with limits to prevent buffer overflow attacks
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

/**
 * Health Check Endpoint
 * Publicly accessible, dynamically generates the server time, and returns 200 OK.
 */
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Mount versioned API routes with admin login rate limiting
app.use('/api/v1/auth/login', loginLimiter);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admins', adminRoutes);
app.use('/api/v1/packages', packageRoutes);
app.use('/api/v1/vehicles', vehicleRoutes);
app.use('/api/v1/testimonials', testimonialRoutes);
app.use('/api/v1/inquiries', inquiryRoutes);

// Catch-all for undefined routes
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Centralized error handling middleware
app.use(globalErrorHandler);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
