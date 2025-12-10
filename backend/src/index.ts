import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { roundsRouter } from './routes/rounds.js';
import { leaderboardRouter } from './routes/leaderboard.js';
import { statsRouter } from './routes/stats.js';
import { adminRouter } from './routes/admin.js';
import { feedRouter } from './routes/feed.js';
import { cronRouter } from './routes/cron.js';
import { testRouter } from './routes/test.js';
import userRouter from './routes/user.js';
import { startLeaderboardJob } from './jobs/leaderboard.js';
import { startCleanupJob } from './jobs/cleanup.js';
import { FlipSOLEngine } from './services/casinoAgent.js';
import { logger } from './services/logger.js';
import { broadcastSSE } from './routes/feed.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Request logging middleware - only log errors (very minimal)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    // Only log server errors (500+) or very slow requests
    if (res.statusCode >= 500 || duration > 3000) {
      logger.error('HTTP Server Error', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration,
      });
    }
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/rounds', roundsRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/stats', statsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/feed', feedRouter);
app.use('/api/user', userRouter);
app.use('/api/cron', cronRouter);
app.use('/api/test', testRouter);

// Start background jobs (disabled for now - requires database setup)
// logger.info('Background jobs disabled - requires database configuration');
// startLeaderboardJob(5); // Refresh every 5 minutes
// startCleanupJob(24); // Cleanup every 24 hours

// Start REAL autonomous cron system
const PROGRAM_ID = process.env.PROGRAM_ID || 'BTU8kuz95iPH6XqBMp7a4VEsLhdco62s9H81Jt6G4GQL';
const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';
const CRON_AUTHORITY_PRIVATE_KEY = process.env.CRON_AUTHORITY_PRIVATE_KEY;

let flipsolEngine: FlipSOLEngine | null = null;

if (CRON_AUTHORITY_PRIVATE_KEY) {
  flipsolEngine = new FlipSOLEngine(
    RPC_URL,
    PROGRAM_ID,
    CRON_AUTHORITY_PRIVATE_KEY
  );
  
  // Connect FlipSOL Engine events to SSE broadcast
  flipsolEngine.addListener((event) => {
    broadcastSSE(event);
  });
  
  flipsolEngine.start();
  logger.info('🚀 FlipSOL Engine ONLINE - ready for 100+ concurrent users!');
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('🛑 Shutting down FlipSOL Engine...');
    flipsolEngine?.stop();
  });
  
  process.on('SIGINT', () => {
    logger.info('🛑 Shutting down FlipSOL Engine...');
    flipsolEngine?.stop();
    process.exit(0);
  });
} else {
  logger.error('❌ CRON_AUTHORITY_PRIVATE_KEY not configured - FlipSOL Engine DISABLED!');
}

// Real-time cron status endpoint
app.get('/api/cron-status', (req, res) => {
  if (!flipsolEngine) {
    return res.json({
      enabled: false,
      error: 'FlipSOL Engine not configured'
    });
  }
  
  const status = flipsolEngine.getStatus();
  res.json({
    enabled: true,
    ...status,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  logger.info(`🚀 Backend server running on port ${PORT}`);
  console.log(`🚀 Backend server running on port ${PORT}`);
});
