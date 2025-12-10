import express from 'express';
import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import { broadcastSSE } from '../routes/feed.js';

const router = express.Router();

// Simple test to check if the authority wallet works
router.post('/test-authority', async (req, res) => {
  try {
    const CRON_AUTHORITY_PRIVATE_KEY = process.env.CRON_AUTHORITY_PRIVATE_KEY;

    if (!CRON_AUTHORITY_PRIVATE_KEY) {
      return res.status(400).json({ error: 'CRON_AUTHORITY_PRIVATE_KEY not configured' });
    }

    const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';
    const connection = new Connection(RPC_URL, 'confirmed');
    const keypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(CRON_AUTHORITY_PRIVATE_KEY)));

    const balance = await connection.getBalance(keypair.publicKey);

    res.json({
      success: true,
      publicKey: keypair.publicKey.toString(),
      balance: balance / 1000000000, // Convert to SOL
      rpcUrl: RPC_URL,
    });

  } catch (err) {
    const error = err as Error;
    res.status(500).json({
      error: 'Test failed',
      message: error.message,
    });
  }
});

// Simulate a round settlement event via SSE
router.post('/simulate-settlement', (req, res) => {
  const { roundId = 999, winner = 'HEADS', winningSide = 0, pot = 1.0, headsTotal = 0.5, tailsTotal = 0.5 } = req.body;

  const event = {
    type: 'round_settled',
    roundId,
    transactionHash: 'simulated_tx_hash_' + Date.now(),
    pot,
    headsTotal,
    tailsTotal,
    winningSide,
    winner,
    timestamp: new Date().toISOString()
  };

  broadcastSSE(event);

  res.json({
    success: true,
    message: 'Simulated settlement event broadcasted',
    event
  });
});

export { router as testRouter };