import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get leaderboard (mock data - no database configured)
router.get('/', async (req, res) => {
  try {
    // Return mock leaderboard data for demo purposes
    const mockLeaderboard = [
      {
        rank: 1,
        address: '4ym542u...mcmk',
        totalWon: 12.45,
        roundsWon: 15,
        roundsPlayed: 32,
        winRate: '46.9%',
        totalVolume: 48.2,
        biggestWin: 3.8,
        lastActive: new Date(Date.now() - 600000).toISOString() // 10 minutes ago
      },
      {
        rank: 2,
        address: '8FhgQsk...z1wA',
        totalWon: 8.92,
        roundsWon: 12,
        roundsPlayed: 28,
        winRate: '42.9%',
        totalVolume: 35.6,
        biggestWin: 2.1,
        lastActive: new Date(Date.now() - 1200000).toISOString() // 20 minutes ago
      },
      {
        rank: 3,
        address: 'GxK8vJv...A7bV',
        totalWon: 6.78,
        roundsWon: 8,
        roundsPlayed: 19,
        winRate: '42.1%',
        totalVolume: 22.4,
        biggestWin: 1.9,
        lastActive: new Date(Date.now() - 1800000).toISOString() // 30 minutes ago
      },
      {
        rank: 4,
        address: 'Hm9PwX2...iM2s',
        totalWon: 5.23,
        roundsWon: 6,
        roundsPlayed: 18,
        winRate: '33.3%',
        totalVolume: 19.8,
        biggestWin: 1.5,
        lastActive: new Date(Date.now() - 2400000).toISOString() // 40 minutes ago
      },
      {
        rank: 5,
        address: 'J4kL7mQ...lM8',
        totalWon: 4.67,
        roundsWon: 7,
        roundsPlayed: 25,
        winRate: '28.0%',
        totalVolume: 28.9,
        biggestWin: 1.2,
        lastActive: new Date(Date.now() - 3000000).toISOString() // 50 minutes ago
      }
    ];
    
    res.json(mockLeaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

export { router as leaderboardRouter };
