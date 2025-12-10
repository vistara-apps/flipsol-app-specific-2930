import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get overall stats
router.get('/', async (req, res) => {
  try {
    const totalRounds = await prisma.round.count({ where: { settled: true } });
    const totalVolume = await prisma.round.aggregate({
      where: { settled: true },
      _sum: { totalPot: true },
    });
    const totalUsers = await prisma.user.count();
    const totalJackpots = await prisma.round.count({
      where: { jackpotTriggered: true },
    });

    res.json({
      totalRounds,
      totalVolume: totalVolume._sum.totalPot?.toString() || '0',
      totalUsers,
      totalJackpots,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export { router as statsRouter };
