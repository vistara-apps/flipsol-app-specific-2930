import { PrismaClient } from '@prisma/client';
import { logger } from '../services/logger.js';

const prisma = new PrismaClient();

export interface CleanupOptions {
  keepRoundsDays?: number;
  keepBetsDays?: number;
  keepFeedHours?: number;
}

const DEFAULT_OPTIONS: CleanupOptions = {
  keepRoundsDays: 90,
  keepBetsDays: 90,
  keepFeedHours: 24,
};

export async function cleanupOldData(options: CleanupOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();
  logger.info('Starting data cleanup...', opts);

  try {
    const now = new Date();

    // Clean up old rounds (keep for specified days)
    if (opts.keepRoundsDays) {
      const roundsCutoff = new Date(now.getTime() - opts.keepRoundsDays * 24 * 60 * 60 * 1000);
      const deletedRounds = await prisma.round.deleteMany({
        where: {
          settled: true,
          updatedAt: { lt: roundsCutoff },
        },
      });
      logger.info(`Deleted ${deletedRounds.count} old rounds`, { cutoff: roundsCutoff });
    }

    // Clean up old bets (keep for specified days)
    if (opts.keepBetsDays) {
      const betsCutoff = new Date(now.getTime() - opts.keepBetsDays * 24 * 60 * 60 * 1000);
      const deletedBets = await prisma.bet.deleteMany({
        where: {
          createdAt: { lt: betsCutoff },
          claimed: true, // Only delete claimed bets
        },
      });
      logger.info(`Deleted ${deletedBets.count} old bets`, { cutoff: betsCutoff });
    }

    // Clean up old feed data (keep for specified hours)
    // Note: Feed data is derived from rounds/bets, so this is mainly for optimization
    // In practice, you might want to archive rather than delete

    const duration = Date.now() - startTime;
    logger.logPerformance('cleanupOldData', duration, opts);
    logger.info('Data cleanup completed successfully', { duration });
  } catch (error: any) {
    logger.error('Error during data cleanup', { 
      error: error.message,
      stack: error.stack 
    });
    throw error;
  }
}

// Run cleanup job
export function startCleanupJob(intervalHours: number = 24) {
  logger.info(`Starting cleanup job (every ${intervalHours} hours)`);
  
  // Run immediately
  cleanupOldData().catch(err => {
    logger.error('Initial cleanup failed', { error: err.message });
  });

  // Then run on interval
  setInterval(() => {
    cleanupOldData().catch(err => {
      logger.error('Scheduled cleanup failed', { error: err.message });
    });
  }, intervalHours * 60 * 60 * 1000);
}
