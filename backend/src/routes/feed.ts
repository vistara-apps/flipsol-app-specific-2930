import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Store active SSE connections for real-time updates
const sseConnections: Map<express.Response, { userId: string, connectedAt: Date }> = new Map();

// Broadcast event to all connected SSE clients
export function broadcastSSE(event: any) {
  const eventData = `data: ${JSON.stringify(event)}\n\n`;
  sseConnections.forEach((connectionInfo, res) => {
    try {
      res.write(eventData);
    } catch (error) {
      // Remove dead connections
      sseConnections.delete(res);
    }
  });
}

// Get active users count
export function getActiveUsersCount(): number {
  return sseConnections.size;
}

// Broadcast user count updates
export function broadcastUserCount() {
  const count = getActiveUsersCount();
  broadcastSSE({
    type: 'users_online',
    count,
    timestamp: new Date().toISOString()
  });
}

// Live feed endpoint - returns recent activity
router.get('/live', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const since = req.query.since 
      ? new Date(req.query.since as string)
      : new Date(Date.now() - 5 * 60 * 1000); // Last 5 minutes

    // Get recent bets
    const recentBets = await prisma.bet.findMany({
      where: {
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        round: {
          select: {
            roundId: true,
            settled: true,
            winningSide: true,
          },
        },
      },
    });

    // Get recent round settlements
    const recentRounds = await prisma.round.findMany({
      where: {
        settled: true,
        updatedAt: { gte: since },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      include: {
        bets: {
          select: {
            userAddress: true,
            side: true,
            amount: true,
            payout: true,
          },
          take: 10,
        },
      },
    });

    // Format feed items
    const feedItems = [
      ...recentBets.map(bet => ({
        type: 'bet',
        timestamp: bet.createdAt.toISOString(),
        roundId: bet.roundId.toString(),
        userAddress: bet.userAddress,
        side: bet.side === 0 ? 'Heads' : 'Tails',
        amount: bet.amount.toString(),
        roundSettled: bet.round.settled,
        won: bet.round.settled && bet.round.winningSide === bet.side,
      })),
      ...recentRounds.map(round => ({
        type: 'settlement',
        timestamp: round.updatedAt.toISOString(),
        roundId: round.roundId.toString(),
        winningSide: round.winningSide === 0 ? 'Heads' : 'Tails',
        totalPot: round.totalPot.toString(),
        jackpotTriggered: round.jackpotTriggered,
        jackpotAmount: round.jackpotAmount?.toString(),
        winnerCount: round.bets.filter(b => 
          round.winningSide !== null && b.side === round.winningSide
        ).length,
      })),
    ].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ).slice(0, limit);

    res.json({
      feed: feedItems,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching live feed:', error);
    res.status(500).json({ error: 'Failed to fetch live feed' });
  }
});

// WebSocket-like SSE endpoint for real-time updates
router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Get user ID from query params or generate anonymous ID
  const userId = req.query.userId as string || `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Add this connection to active SSE connections
  sseConnections.set(res, { userId, connectedAt: new Date() });

  const sendEvent = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Send initial connection message
  sendEvent({ type: 'connected', userId, timestamp: new Date().toISOString() });
  
  // Broadcast updated user count
  broadcastUserCount();

  // Enhanced cleanup for better connection tracking
  let heartbeat: NodeJS.Timeout;
  
  const cleanup = () => {
    if (sseConnections.has(res)) {
      sseConnections.delete(res);
      if (heartbeat) clearInterval(heartbeat);
      // Broadcast updated user count when user disconnects
      setTimeout(() => broadcastUserCount(), 100); // Small delay to ensure cleanup
    }
  };

  // Handle various disconnect scenarios
  req.on('close', cleanup);
  req.on('error', cleanup);
  res.on('close', cleanup);
  res.on('error', cleanup);
  
  // Keep connection alive with validation
  heartbeat = setInterval(() => {
    try {
      sendEvent({ type: 'heartbeat', timestamp: new Date().toISOString() });
    } catch (error) {
      // Connection dead, clean it up
      cleanup();
    }
  }, 30000);
});

export { router as feedRouter };
