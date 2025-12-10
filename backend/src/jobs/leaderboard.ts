import { PrismaClient } from '@prisma/client';
import { logger } from '../services/logger.js';

const prisma = new PrismaClient();

export async function refreshLeaderboard() {
  const startTime = Date.now();
  logger.info('Starting leaderboard refresh...');

  try {
    // Get all users with their total winnings
    const users = await prisma.user.findMany({
      where: {
        totalWon: { gt: 0 },
      },
      orderBy: {
        totalWon: 'desc',
      },
      take: 1000,
    });

    // Update leaderboard
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      await prisma.leaderboard.upsert({
        where: { userAddress: user.address },
        update: {
          totalWon: user.totalWon,
          rank: i + 1,
        },
        create: {
          userAddress: user.address,
          totalWon: user.totalWon,
          rank: i + 1,
        },
      });
    }

    // Remove users who are no longer in top 1000
    const topAddresses = users.map(u => u.address);
    await prisma.leaderboard.deleteMany({
      where: {
        userAddress: { notIn: topAddresses },
      },
    });

    const duration = Date.now() - startTime;
    logger.logPerformance('refreshLeaderboard', duration, { 
      userCount: users.length 
    });
    logger.info(`Leaderboard refreshed successfully`, { 
      userCount: users.length,
      duration 
    });
  } catch (error: any) {
    logger.error('Error refreshing leaderboard', { 
      error: error.message,
      stack: error.stack 
    });
    throw error;
  }
}

// Run leaderboard refresh job
export function startLeaderboardJob(intervalMinutes: number = 5) {
  logger.info(`Starting leaderboard refresh job (every ${intervalMinutes} minutes)`);
  
  // Run immediately
  refreshLeaderboard().catch(err => {
    logger.error('Initial leaderboard refresh failed', { error: err.message });
  });

  // Then run on interval
  setInterval(() => {
    refreshLeaderboard().catch(err => {
      logger.error('Scheduled leaderboard refresh failed', { error: err.message });
    });
  }, intervalMinutes * 60 * 1000);
}
