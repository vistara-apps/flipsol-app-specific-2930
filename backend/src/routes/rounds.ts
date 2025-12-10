import express from 'express';
import { PrismaClient } from '@prisma/client';
import { Connection, PublicKey } from '@solana/web3.js';
import { Buffer } from 'buffer'; // Ensure Buffer is available

const router = express.Router();
const prisma = new PrismaClient();

// Get round history
// Get round history - Fetch from ON-CHAIN (Solana) to bypass broken DB
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;

    // Use RPC from env or default
    const connection = new Connection(process.env.RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
    const programId = new PublicKey(process.env.PROGRAM_ID || 'BTU8kuz95iPH6XqBMp7a4VEsLhdco62s9H81Jt6G4GQL');

    // 1. Fetch Global State to get current round ID
    const [globalPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('global_state')],
      programId
    );

    const globalAccount = await connection.getAccountInfo(globalPDA);
    if (!globalAccount) {
      throw new Error('Global state not found on-chain');
    }

    // Parse global state (Skip 8 byte discriminator, read next 32 bytes authority, then u64 currentRound)
    // Layout: Discriminator (8) + Authority (32) + CurrentRound (8) + ...
    const currentRound = Number(globalAccount.data.readBigUInt64LE(40));

    // 2. Determine round IDs to fetch (from currentRound down to currentRound - limit)
    // Only fetch rounds that actually exist (roundId > 0)
    const roundIdsToFetch = [];
    for (let i = 0; i < limit; i++) {
      const rid = currentRound - i;
      if (rid > 0) roundIdsToFetch.push(rid);
    }

    if (roundIdsToFetch.length === 0) {
      return res.json([]);
    }

    // 3. Generate PDAs for these rounds
    const pdas = roundIdsToFetch.map(rid => {
      const buf = Buffer.alloc(8); // Round ID is u64, so 8 bytes
      buf.writeBigUInt64LE(BigInt(rid), 0);
      return PublicKey.findProgramAddressSync([Buffer.from('round'), buf], programId)[0];
    });

    // 4. Fetch all round accounts in parallel
    const accounts = await connection.getMultipleAccountsInfo(pdas);

    // 5. Parse and map to history format
    const history = accounts
      .map((acc, index) => {
        if (!acc) return null;
        const data = acc.data;
        // Minimum data length for discriminator (8) + roundId (8) + headsTotal (8) + tailsTotal (8) + endsAt (8) + settled (1) + winningSide (1) = 42 bytes
        if (data.length < 42) return null;

        // Parse per casinoAgent.ts layout
        const roundId = Number(data.readBigUInt64LE(8));
        const headsTotal = Number(data.readBigUInt64LE(16));
        const tailsTotal = Number(data.readBigUInt64LE(24));
        const endsAt = Number(data.readBigInt64LE(32)); // Unix timestamp in seconds
        const settled = data.readUInt8(40) === 1;
        const winningSide = data.readUInt8(41);

        // Skip unsettled rounds if we only want history (or keep them if user wants recent activity?)
        // Usually history implies settled.
        if (!settled) return null;

        return {
          roundId: roundId.toString(),
          headsTotal: (headsTotal / 1_000_000_000).toString(), // Lamports to SOL
          tailsTotal: (tailsTotal / 1_000_000_000).toString(),
          totalPot: ((headsTotal + tailsTotal) / 1_000_000_000).toString(),
          winningSide: winningSide,
          winner: winningSide, // Logic for frontend compatibility
          settled: settled,
          // Use endsAt (seconds) -> ms -> ISO
          timestamp: new Date(endsAt * 1000).toISOString(),
          jackpotTriggered: false, // Not easily parsed without full parsing layout, assuming false for basic history
          jackpotPayout: '0',
          players: 0 // Cannot easily count unique players from Round Account alone (need UserBet accounts). Set to 0.
        };
      })
      .filter(h => h !== null); // Remove nulls (unsettled or missing)

    res.json(history);
  } catch (error) {
    console.error('Error fetching on-chain history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Get current round
router.get('/current', async (req, res) => {
  try {
    const round = await prisma.round.findFirst({
      where: { settled: false },
      orderBy: { roundId: 'desc' },
      include: {
        bets: {
          select: {
            userAddress: true,
            side: true,
            amount: true,
          },
        },
      },
    });

    if (!round) {
      return res.json(null);
    }

    res.json({
      roundId: round.roundId.toString(),
      headsTotal: round.headsTotal.toString(),
      tailsTotal: round.tailsTotal.toString(),
      totalPot: round.totalPot.toString(),
      endsAt: round.endsAt.toISOString(),
      settled: round.settled,
      bets: round.bets,
    });
  } catch (error) {
    console.error('Error fetching current round:', error);
    res.status(500).json({ error: 'Failed to fetch current round' });
  }
});

// Get user history
router.get('/user/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const bets = await prisma.bet.findMany({
      where: { userAddress: address },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        round: {
          select: {
            roundId: true,
            winningSide: true,
            settled: true,
            jackpotTriggered: true,
          },
        },
      },
    });

    res.json(bets.map(bet => ({
      roundId: bet.roundId.toString(),
      side: bet.side,
      amount: bet.amount.toString(),
      payout: bet.payout?.toString(),
      claimed: bet.claimed,
      won: bet.round.settled && bet.round.winningSide === bet.side,
      jackpotTriggered: bet.round.jackpotTriggered,
      createdAt: bet.createdAt.toISOString(),
    })));
  } catch (error) {
    console.error('Error fetching user history:', error);
    res.status(500).json({ error: 'Failed to fetch user history' });
  }
});

export { router as roundsRouter };
