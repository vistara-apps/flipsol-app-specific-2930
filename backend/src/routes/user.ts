import { Router, Request, Response } from 'express';
import { Connection, PublicKey } from '@solana/web3.js';
import { logger } from '../services/logger.js';

const router = Router();
const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID || 'BTU8kuz95iPH6XqBMp7a4VEsLhdco62s9H81Jt6G4GQL');
const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');

interface UnclaimedWinning {
  roundId: number;
  betAmount: number;
  side: string;
  winningSide: string;
  estimatedWinnings: number;
  roundSettled: boolean;
  claimed: boolean;
}

// Get unclaimed winnings for a user
router.get('/unclaimed-winnings/:walletAddress', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;
    const userPubkey = new PublicKey(walletAddress);
    
    logger.info(`Checking unclaimed winnings for ${walletAddress}`);
    
    // Get all user_bet accounts for this user
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        {
          dataSize: 8 + 51, // Discriminator + UserBet size
        },
        {
          memcmp: {
            offset: 8, // After discriminator
            bytes: userPubkey.toBase58(),
          },
        },
      ],
    });
    
    const unclaimedWinnings: UnclaimedWinning[] = [];
    
    for (const { pubkey, account } of accounts) {
      const data = account.data;
      
      // Parse UserBet struct
      const roundId = Number(data.readBigUInt64LE(8 + 32)); // After discriminator + user
      const betSide = data[8 + 32 + 8]; // After round_id
      const betAmount = Number(data.readBigUInt64LE(8 + 32 + 8 + 1)); // After side
      const claimed = data[8 + 32 + 8 + 1 + 8] === 1; // After amount
      
      // Get round state to check if settled and who won
      const roundIdBuffer = Buffer.alloc(8);
      roundIdBuffer.writeUInt32LE(roundId, 0);
      const [roundPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('round'), roundIdBuffer],
        PROGRAM_ID
      );
      
      const roundAccount = await connection.getAccountInfo(roundPDA);
      if (!roundAccount) continue;
      
      const roundData = roundAccount.data;
      const headsTotal = Number(roundData.readBigUInt64LE(16));
      const tailsTotal = Number(roundData.readBigUInt64LE(24));
      const settled = roundData[40] === 1;
      const winningSide = roundData[41];
      
      if (settled && !claimed && betSide === winningSide) {
        // Calculate estimated winnings
        const totalPot = headsTotal + tailsTotal;
        const winningTotal = winningSide === 0 ? headsTotal : tailsTotal;
        const feePercentage = 0.02; // 2% total fees
        const winnerPool = totalPot * (1 - feePercentage);
        const estimatedWinnings = winningTotal > 0 ? (betAmount / winningTotal) * winnerPool : 0;
        
        unclaimedWinnings.push({
          roundId,
          betAmount: betAmount / 1_000_000_000,
          side: betSide === 0 ? 'HEADS' : 'TAILS',
          winningSide: winningSide === 0 ? 'HEADS' : 'TAILS',
          estimatedWinnings: estimatedWinnings / 1_000_000_000,
          roundSettled: settled,
          claimed,
        });
      }
    }
    
    res.json({
      success: true,
      wallet: walletAddress,
      unclaimedWinnings,
      totalUnclaimed: unclaimedWinnings.reduce((sum, w) => sum + w.estimatedWinnings, 0),
    });
    
  } catch (error) {
    const err = error as Error;
    logger.error('Error checking unclaimed winnings', { error: err.message });
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// Get bet history for a user
router.get('/bet-history/:walletAddress', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;
    const userPubkey = new PublicKey(walletAddress);
    
    logger.info(`Getting bet history for ${walletAddress}`);
    
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        {
          dataSize: 8 + 51, // Discriminator + UserBet size
        },
        {
          memcmp: {
            offset: 8, // After discriminator
            bytes: userPubkey.toBase58(),
          },
        },
      ],
    });
    
    const betHistory = [];
    
    for (const { pubkey, account } of accounts) {
      const data = account.data;
      
      // Parse UserBet struct
      const roundId = Number(data.readBigUInt64LE(8 + 32));
      const betSide = data[8 + 32 + 8];
      const betAmount = Number(data.readBigUInt64LE(8 + 32 + 8 + 1));
      const claimed = data[8 + 32 + 8 + 1 + 8] === 1;
      
      // Get round state
      const roundIdBuffer = Buffer.alloc(8);
      roundIdBuffer.writeUInt32LE(roundId, 0);
      const [roundPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('round'), roundIdBuffer],
        PROGRAM_ID
      );
      
      const roundAccount = await connection.getAccountInfo(roundPDA);
      let roundStatus = 'UNKNOWN';
      let winningSide = null;
      let result = 'PENDING';
      
      if (roundAccount) {
        const roundData = roundAccount.data;
        const settled = roundData[40] === 1;
        winningSide = roundData[41];
        
        if (settled) {
          roundStatus = 'SETTLED';
          result = betSide === winningSide ? 'WON' : 'LOST';
        } else {
          roundStatus = 'ACTIVE';
        }
      }
      
      betHistory.push({
        roundId,
        betAmount: betAmount / 1_000_000_000,
        side: betSide === 0 ? 'HEADS' : 'TAILS',
        claimed,
        roundStatus,
        winningSide: winningSide !== null ? (winningSide === 0 ? 'HEADS' : 'TAILS') : null,
        result,
      });
    }
    
    // Sort by round ID descending
    betHistory.sort((a, b) => b.roundId - a.roundId);
    
    res.json({
      success: true,
      wallet: walletAddress,
      betHistory,
      totalBets: betHistory.length,
    });
    
  } catch (error) {
    const err = error as Error;
    logger.error('Error getting bet history', { error: err.message });
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

export default router;