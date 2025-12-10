import express from 'express';
import { PrismaClient } from '@prisma/client';
import { Connection, PublicKey, Transaction, TransactionInstruction, SystemProgram, Keypair } from '@solana/web3.js';
import { logger } from '../services/logger.js';

const router = express.Router();
const prisma = new PrismaClient();

// Middleware to check admin auth
const checkAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_KEY) {
    logger.warn('Unauthorized admin access attempt', { 
      ip: req.ip,
      path: req.path 
    });
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

router.use(checkAdmin);

// Get comprehensive house metrics
router.get('/metrics', async (req, res) => {
  try {
    const startTime = Date.now();

    // Database metrics
    const [totalVolume, totalBets, totalPayouts, totalRounds, activeUsers] = await Promise.all([
      prisma.round.aggregate({
        where: { settled: true },
        _sum: { totalPot: true },
      }),
      prisma.bet.aggregate({
        _sum: { amount: true },
      }),
      prisma.bet.aggregate({
        where: { claimed: true },
        _sum: { payout: true },
      }),
      prisma.round.count({
        where: { settled: true },
      }),
      prisma.user.count({
        where: {
          totalBet: { gt: 0 },
        },
      }),
    ]);

    // Calculate rake (2% of total volume)
    const totalVolumeNum = Number(totalVolume._sum.totalPot || 0);
    const totalRake = totalVolumeNum * 0.02;
    const totalJackpotContribution = totalVolumeNum * 0.01;
    const totalPayoutsNum = Number(totalPayouts._sum.payout || 0);

    // Calculate PnL
    const totalBetsNum = Number(totalBets._sum.amount || 0);
    const pnl = totalRake - (totalPayoutsNum - (totalBetsNum - totalVolumeNum));

    // Get on-chain treasury and jackpot balances
    let treasuryBalance = '0';
    let jackpotBalance = '0';
    
    try {
      const connection = new Connection(process.env.RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
      const programId = new PublicKey(process.env.PROGRAM_ID || 'FLipSoL111111111111111111111111111111111111');
      
      const [treasuryPDA] = await PublicKey.findProgramAddress(
        [Buffer.from('treasury')],
        programId
      );
      const [jackpotPDA] = await PublicKey.findProgramAddress(
        [Buffer.from('jackpot')],
        programId
      );
      
      treasuryBalance = (await connection.getBalance(treasuryPDA) / 1e9).toString();
      jackpotBalance = (await connection.getBalance(jackpotPDA) / 1e9).toString();
    } catch (error: any) {
      logger.warn('Failed to fetch on-chain balances', { error: error.message });
    }

    // Get recent activity (last 24 hours)
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [recentVolume, recentBets, recentRounds] = await Promise.all([
      prisma.round.aggregate({
        where: {
          settled: true,
          updatedAt: { gte: last24Hours },
        },
        _sum: { totalPot: true },
      }),
      prisma.bet.count({
        where: {
          createdAt: { gte: last24Hours },
        },
      }),
      prisma.round.count({
        where: {
          createdAt: { gte: last24Hours },
        },
      }),
    ]);

    const duration = Date.now() - startTime;
    logger.logPerformance('admin_metrics', duration);

    res.json({
      // Overall metrics
      totalVolume: totalVolumeNum.toString(),
      totalRake: totalRake.toString(),
      totalJackpotContribution: totalJackpotContribution.toString(),
      totalBets: totalBetsNum.toString(),
      totalPayouts: totalPayoutsNum.toString(),
      totalRounds,
      activeUsers,
      
      // PnL
      pnl: pnl.toString(),
      pnlPercentage: totalVolumeNum > 0 ? ((pnl / totalVolumeNum) * 100).toFixed(2) : '0',
      
      // On-chain balances
      treasuryBalance,
      jackpotBalance,
      
      // Recent activity (24h)
      recentVolume: Number(recentVolume._sum.totalPot || 0).toString(),
      recentBets,
      recentRounds,
      
      // Timestamp
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Error fetching admin metrics', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// Get system health
router.get('/health', async (req, res) => {
  try {
    const { MonitoringService } = await import('../services/monitoring.js');
    const { Connection } = await import('@solana/web3.js');
    
    const connection = new Connection(process.env.RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
    const monitoring = new MonitoringService(connection);
    const health = await monitoring.getSystemHealth();
    
    res.json(health);
  } catch (error: any) {
    logger.error('Error fetching system health', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch health' });
  }
});

// Fix program initialization - reinitialize accounts with wrong ownership
router.post('/fix-program', async (req, res) => {
  try {
    const PROGRAM_ID = process.env.PROGRAM_ID;
    const CRON_AUTHORITY_PRIVATE_KEY = process.env.CRON_AUTHORITY_PRIVATE_KEY;
    
    if (!PROGRAM_ID || !CRON_AUTHORITY_PRIVATE_KEY) {
      return res.status(400).json({ 
        error: 'Missing PROGRAM_ID or CRON_AUTHORITY_PRIVATE_KEY in environment' 
      });
    }

    const connection = new Connection(process.env.RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
    const programId = new PublicKey(PROGRAM_ID);
    
    // Parse authority keypair
    let authorityPrivateKey;
    try {
      if (typeof CRON_AUTHORITY_PRIVATE_KEY === 'string') {
        authorityPrivateKey = JSON.parse(CRON_AUTHORITY_PRIVATE_KEY);
      } else {
        authorityPrivateKey = CRON_AUTHORITY_PRIVATE_KEY;
      }
    } catch (error) {
      return res.status(400).json({ error: 'Invalid CRON_AUTHORITY_PRIVATE_KEY format' });
    }
    
    const authority = Keypair.fromSecretKey(new Uint8Array(authorityPrivateKey));

    // Get PDAs
    const [globalPDA] = await PublicKey.findProgramAddress([Buffer.from('global_state')], programId);
    const [treasuryPDA] = await PublicKey.findProgramAddress([Buffer.from('treasury')], programId);
    const [jackpotPDA] = await PublicKey.findProgramAddress([Buffer.from('jackpot')], programId);

    // Check account ownership
    const [globalInfo, treasuryInfo, jackpotInfo] = await Promise.all([
      connection.getAccountInfo(globalPDA),
      connection.getAccountInfo(treasuryPDA),
      connection.getAccountInfo(jackpotPDA)
    ]);

    const issues = [];
    if (globalInfo && !globalInfo.owner.equals(programId)) {
      issues.push({
        account: 'globalState',
        address: globalPDA.toString(),
        currentOwner: globalInfo.owner.toString(),
        expectedOwner: programId.toString()
      });
    }
    if (treasuryInfo && !treasuryInfo.owner.equals(programId)) {
      issues.push({
        account: 'treasury',
        address: treasuryPDA.toString(),
        currentOwner: treasuryInfo.owner.toString(),
        expectedOwner: programId.toString()
      });
    }
    if (jackpotInfo && !jackpotInfo.owner.equals(programId)) {
      issues.push({
        account: 'jackpot',
        address: jackpotPDA.toString(),
        currentOwner: jackpotInfo.owner.toString(),
        expectedOwner: programId.toString()
      });
    }

    if (issues.length === 0) {
      return res.json({ 
        message: 'All accounts have correct ownership',
        globalState: globalPDA.toString(),
        treasury: treasuryPDA.toString(),
        jackpot: jackpotPDA.toString()
      });
    }

    logger.info('Found ownership issues, attempting to reinitialize...', { issues });

    // Attempt to reinitialize the program
    const initDiscriminator = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]);
    const rakeBps = Buffer.alloc(2);
    const jackpotBps = Buffer.alloc(2);
    rakeBps.writeUInt16LE(200, 0); // 2% rake
    jackpotBps.writeUInt16LE(100, 0); // 1% jackpot
    
    const initData = Buffer.concat([initDiscriminator, rakeBps, jackpotBps]);
    
    const instruction = new TransactionInstruction({
      programId: programId,
      keys: [
        { pubkey: globalPDA, isSigner: false, isWritable: true },
        { pubkey: treasuryPDA, isSigner: false, isWritable: true },
        { pubkey: jackpotPDA, isSigner: false, isWritable: true },
        { pubkey: authority.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: initData,
    });
    
    const transaction = new Transaction().add(instruction);
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    transaction.feePayer = authority.publicKey;
    transaction.sign(authority);
    
    const txHash = await connection.sendRawTransaction(transaction.serialize());
    await connection.confirmTransaction(txHash, 'confirmed');

    logger.info('Program reinitialized successfully', { txHash });

    res.json({
      message: 'Program reinitialized successfully',
      transactionHash: txHash,
      issuesFound: issues,
      globalState: globalPDA.toString(),
      treasury: treasuryPDA.toString(),
      jackpot: jackpotPDA.toString()
    });

  } catch (error: any) {
    logger.error('Error fixing program initialization', { 
      error: error.message,
      logs: error.logs || null 
    });
    res.status(500).json({ 
      error: 'Failed to fix program initialization',
      details: error.message,
      logs: error.logs || null
    });
  }
});

export { router as adminRouter };
