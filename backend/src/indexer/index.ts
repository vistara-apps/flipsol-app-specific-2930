import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { logger } from '../services/logger.js';
import { MonitoringService } from '../services/monitoring.js';
import { IDL } from '../idl/flipsol.js';
import { broadcastSSE } from '../routes/feed.js';

dotenv.config();

const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID || 'FLipSoL111111111111111111111111111111111111');

const connection = new Connection(RPC_URL, 'confirmed');
const prisma = new PrismaClient();
const monitoring = new MonitoringService(connection);

// Create a dummy wallet for the provider (we only need it for reading)
const dummyWallet: Wallet = {
  publicKey: PublicKey.default,
  signTransaction: async <T extends Transaction | any>(tx: T): Promise<T> => { 
    throw new Error('Not implemented for read-only indexer'); 
  },
  signAllTransactions: async <T extends Transaction | any>(txs: T[]): Promise<T[]> => { 
    throw new Error('Not implemented for read-only indexer'); 
  },
  payer: Keypair.generate(),
};

const provider = new AnchorProvider(connection, dummyWallet, {
  commitment: 'confirmed',
});

const program = new Program(IDL as any, provider);

let isIndexing = false;
let lastProcessedSlot = 0;

async function indexRound(roundId: number) {
  try {
    const startTime = Date.now();
    const [roundStatePDA] = await PublicKey.findProgramAddress(
      [
        Buffer.from('round'),
        (() => {
          const buffer = Buffer.allocUnsafe(8);
          buffer.writeBigUInt64LE(BigInt(roundId), 0);
          return buffer;
        })(),
      ],
      PROGRAM_ID
    );

    const roundState = await (program.account as any)['roundState'].fetch(roundStatePDA);

    const roundData = {
      roundId: BigInt(roundState.roundId.toString()),
      headsTotal: roundState.headsTotal.toString(),
      tailsTotal: roundState.tailsTotal.toString(),
      totalPot: (Number(roundState.headsTotal) + Number(roundState.tailsTotal)).toString(),
      endsAt: new Date(Number(roundState.endsAt) * 1000),
      settled: roundState.settled,
      winningSide: roundState.winningSide === 2 ? null : roundState.winningSide,
      jackpotTriggered: false, // Will be updated when round closes
      jackpotAmount: null,
    };

    await prisma.round.upsert({
      where: { roundId: roundData.roundId },
      update: roundData,
      create: roundData,
    });

    const duration = Date.now() - startTime;
    logger.logPerformance('indexRound', duration, { roundId });
    logger.info(`Indexed round ${roundId}`);
  } catch (error: any) {
    logger.error(`Error indexing round ${roundId}`, { error: error.message, roundId });
  }
}

async function indexUserBet(userAddress: string, roundId: number) {
  try {
    const startTime = Date.now();
    const userPubkey = new PublicKey(userAddress);
    const [userBetPDA] = await PublicKey.findProgramAddress(
      [
        Buffer.from('user_bet'),
        userPubkey.toBuffer(),
        (() => {
          const buffer = Buffer.allocUnsafe(8);
          buffer.writeBigUInt64LE(BigInt(roundId), 0);
          return buffer;
        })(),
      ],
      PROGRAM_ID
    );

    const userBet = await (program.account as any)['userBet'].fetch(userBetPDA);

    const betData = {
      roundId: BigInt(roundId),
      userAddress: userAddress,
      side: userBet.side,
      amount: userBet.amount.toString(),
      claimed: userBet.claimed,
      payout: null, // Will be calculated when round settles
    };

    await prisma.bet.upsert({
      where: {
        roundId_userAddress: {
          roundId: betData.roundId,
          userAddress: userAddress,
        },
      },
      update: betData,
      create: betData,
    });

    // Update user stats
    await prisma.user.upsert({
      where: { address: userAddress },
      update: {
        totalBet: { increment: userBet.amount.toString() },
        totalRounds: { increment: 1 },
      },
      create: {
        address: userAddress,
        totalBet: userBet.amount.toString(),
        totalRounds: 1,
      },
    });

    const duration = Date.now() - startTime;
    logger.logPerformance('indexUserBet', duration, { userAddress, roundId });
    logger.logEvent('bet_placed', { userAddress, roundId, side: userBet.side, amount: userBet.amount.toString() });
    
    // Emit real-time SSE event for new bet
    const betAmount = Number(userBet.amount) / 1_000_000_000; // Convert to SOL
    broadcastSSE({
      type: 'bet_placed',
      roundId: roundId,
      userWallet: userAddress,
      side: userBet.side,
      amount: betAmount,
      sideName: userBet.side === 0 ? 'Heads' : 'Tails',
      timestamp: new Date().toISOString()
    });
    
    logger.info(`📢 Emitted SSE bet_placed event for round ${roundId}`, {
      userAddress: userAddress.slice(0, 8) + '...',
      side: userBet.side === 0 ? 'Heads' : 'Tails',
      amount: betAmount
    });
  } catch (error: any) {
    logger.error(`Error indexing user bet`, { error: error.message, userAddress, roundId });
  }
}

async function processRoundSettlement(roundId: number) {
  try {
    const round = await prisma.round.findUnique({
      where: { roundId: BigInt(roundId) },
      include: { bets: true },
    });

    if (!round || !round.settled || round.winningSide === null) return;

    const winningSide = round.winningSide;
    const winningBets = round.bets.filter(b => b.side === winningSide);
    const winningTotal = winningBets.reduce((sum, b) => sum + Number(b.amount), 0);
    const totalPot = Number(round.totalPot);

    // Calculate payouts
    for (const bet of winningBets) {
      const userShare = Number(bet.amount) / winningTotal;
      const rake = totalPot * 0.02;
      const jackpotContribution = totalPot * 0.01;
      const winnerPool = totalPot - rake - jackpotContribution;
      const payout = winnerPool * userShare;

      await prisma.bet.update({
        where: { id: bet.id },
        data: { payout: payout.toString() },
      });

      // Update user stats
      await prisma.user.update({
        where: { address: bet.userAddress },
        data: {
          totalWon: { increment: payout.toString() },
          wins: { increment: 1 },
        },
      });
    }

    logger.logEvent('round_settled', {
      roundId,
      winningSide,
      totalPot: round.totalPot.toString(),
      winnerCount: winningBets.length,
    });
    
    // Emit real-time SSE event for round settlement
    broadcastSSE({
      type: 'round_settled',
      roundId: roundId,
      winningSide: winningSide,
      winner: winningSide === 0 ? 'Heads' : 'Tails',
      totalPot: Number(round.totalPot),
      winnerCount: winningBets.length,
      timestamp: new Date().toISOString()
    });
    
    logger.info(`📢 Emitted SSE round_settled event for round ${roundId}`);
  } catch (error: any) {
    logger.error(`Error processing round settlement`, { error: error.message, roundId });
  }
}

async function scanForNewBets() {
  if (isIndexing) return;
  isIndexing = true;

  try {
    const currentSlot = await connection.getSlot();
    
    // Get all program accounts
    const programAccounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        {
          dataSize: 8 + 32 + 8 + 1 + 8 + 1 + 1, // UserBet account size
        },
      ],
    });

    for (const { account, pubkey } of programAccounts) {
      try {
        const userBet = program.coder.accounts.decode('UserBet', account.data);
        const roundId = Number(userBet.roundId);
        const userAddress = userBet.user.toString();

        await indexUserBet(userAddress, roundId);
      } catch (error) {
        // Not a UserBet account, skip
      }
    }

    lastProcessedSlot = currentSlot;
  } catch (error: any) {
    logger.error('Error scanning for new bets', { error: error.message });
  } finally {
    isIndexing = false;
  }
}

async function listenToProgram() {
  logger.info('Starting event listener...', { programId: PROGRAM_ID.toString(), rpcUrl: RPC_URL });

  // Subscribe to program account changes
  const subscriptionId = connection.onProgramAccountChange(
    PROGRAM_ID,
    async (accountInfo, context) => {
      try {
        const accountData = accountInfo.accountInfo.data;
        
        // Try to decode as RoundState
        try {
          const roundState = program.coder.accounts.decode('RoundState', accountData);
          const roundId = Number(roundState.roundId);
          
          await indexRound(roundId);
          
          if (roundState.settled) {
            await processRoundSettlement(roundId);
          }
        } catch {
          // Not a RoundState account
        }

        // Try to decode as UserBet
        try {
          const userBet = program.coder.accounts.decode('UserBet', accountData);
          const roundId = Number(userBet.roundId);
          const userAddress = userBet.user.toString();
          
          await indexUserBet(userAddress, roundId);
        } catch {
          // Not a UserBet account
        }
      } catch (error: any) {
        logger.error('Error processing account change', { error: error.message });
      }
    },
    'confirmed'
  );

  logger.info('Subscribed to program account changes', { subscriptionId });

  // Poll for new rounds periodically
  setInterval(async () => {
    try {
      const health = await monitoring.getSystemHealth();
      if (health.rpc.status !== 'healthy') {
        logger.warn('RPC health check failed, skipping poll', { health });
        return;
      }

      const [globalStatePDA] = await PublicKey.findProgramAddress(
        [Buffer.from('global_state')],
        PROGRAM_ID
      );

      const globalState = await (program.account as any)['globalState'].fetch(globalStatePDA);
      const currentRound = Number(globalState.currentRound);

      // Index current round
      if (currentRound > 0) {
        await indexRound(currentRound);
      }

      // Scan for new bets
      await scanForNewBets();
    } catch (error: any) {
      logger.error('Error polling rounds', { error: error.message });
    }
  }, 5000); // Poll every 5 seconds

  // Cleanup on exit
  process.on('SIGINT', () => {
    logger.info('Shutting down indexer...');
    connection.removeProgramAccountChangeListener(subscriptionId);
    process.exit(0);
  });
}

async function main() {
  logger.info('🚀 Starting Flip\'n Sol indexer...', {
    programId: PROGRAM_ID.toString(),
    rpcUrl: RPC_URL,
  });

  // Check system health
  const health = await monitoring.getSystemHealth();
  logger.info('System health check', health);

  if (health.overall !== 'healthy') {
    logger.warn('System health degraded, continuing anyway...', health);
  }

  await listenToProgram();
}

main().catch((error) => {
  logger.error('Fatal error in indexer', { error: error.message, stack: error.stack });
  process.exit(1);
});
