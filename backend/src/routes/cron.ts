import express from 'express';
import { Connection, Keypair, PublicKey, SystemProgram, TransactionInstruction, Transaction } from '@solana/web3.js';
import { AnchorProvider, Program, BN, Idl } from '@coral-xyz/anchor';
import { logger } from '../services/logger.js';

// Import the IDL - you'll need to create this file
const IDL = {
  "version": "0.1.0",
  "name": "flipsol",
  "instructions": [
    {
      "name": "closeRound",
      "accounts": [
        {"name": "globalState", "isMut": true, "isSigner": false},
        {"name": "roundState", "isMut": true, "isSigner": false},
        {"name": "treasury", "isMut": true, "isSigner": false},
        {"name": "jackpot", "isMut": true, "isSigner": false},
        {"name": "authority", "isMut": true, "isSigner": true},
        {"name": "systemProgram", "isMut": false, "isSigner": false}
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "roundState",
      "type": {
        "kind": "struct" as const,
        "fields": [
          {"name": "roundId", "type": "u64"},
          {"name": "headsTotal", "type": "u64"},
          {"name": "tailsTotal", "type": "u64"},
          {"name": "endsAt", "type": "i64"},
          {"name": "settled", "type": "bool"},
          {"name": "winningSide", "type": "u8"},
          {"name": "bump", "type": "u8"}
        ]
      }
    }
  ]
} as any;

const router = express.Router();

// Environment variables for cron functionality
const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID || 'BTU8kuz95iPH6XqBMp7a4VEsLhdco62s9H81Jt6G4GQL');
const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';
const CRON_AUTHORITY_PRIVATE_KEY = process.env.CRON_AUTHORITY_PRIVATE_KEY;

// Auto-close rounds that have expired
router.post('/close-rounds', async (req, res) => {
  if (!CRON_AUTHORITY_PRIVATE_KEY) {
    logger.error('CRON_AUTHORITY_PRIVATE_KEY not configured');
    return res.status(500).json({ error: 'Cron service not configured' });
  }

  try {
    // Set up connection and wallet
    const connection = new Connection(RPC_URL, 'confirmed');
    const keypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(CRON_AUTHORITY_PRIVATE_KEY)));
    const wallet = { 
      publicKey: keypair.publicKey,
      signTransaction: async (tx: any): Promise<any> => {
        tx.partialSign(keypair);
        return tx;
      },
      signAllTransactions: async (txs: any[]): Promise<any[]> => {
        return txs.map((tx: any) => {
          tx.partialSign(keypair);
          return tx;
        });
      },
    };

    const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
    const program = new Program(IDL as any, provider);

    // Calculate current round ID based on time
    const now = Date.now();
    const currentMinute = Math.floor(now / 60000);
    
    // Check last few rounds for unclosed ones
    const roundsToCheck = [currentMinute - 2, currentMinute - 1, currentMinute];
    const closedRounds = [];
    
    for (const roundId of roundsToCheck) {
      try {
        const roundStartTime = roundId * 60000;
        const bettingEndTime = roundStartTime + 50000; // 50s betting window
        const roundEndTime = roundStartTime + 60000; // 60s total
        
        // Only close rounds whose betting window has ended
        if (now < bettingEndTime) {
          continue;
        }

        // Create round ID buffer manually to avoid BN issues
        const roundIdBuffer = Buffer.alloc(8);
        roundIdBuffer.writeUInt32LE(roundId, 0);
        
        const roundPDA = PublicKey.findProgramAddressSync(
          [Buffer.from('round'), roundIdBuffer],
          PROGRAM_ID
        )[0];

        // Check if round exists and is not settled
        const roundState = await (program.account as any).roundState.fetch(roundPDA);
        if (roundState.settled) {
          continue; // Already settled
        }

        // Round needs to be closed
        logger.info(`Closing round ${roundId}`, {
          roundStartTime: new Date(roundStartTime),
          bettingEndTime: new Date(bettingEndTime),
          roundEndTime: new Date(roundEndTime),
          now: new Date(now),
        });

        const globalPDA = PublicKey.findProgramAddressSync([Buffer.from('global_state')], PROGRAM_ID)[0];
        const treasuryPDA = PublicKey.findProgramAddressSync([Buffer.from('treasury')], PROGRAM_ID)[0];
        const jackpotPDA = PublicKey.findProgramAddressSync([Buffer.from('jackpot')], PROGRAM_ID)[0];

        const tx = await (program as any).methods
          .closeRound()
          .accounts({
            globalState: globalPDA,
            roundState: roundPDA,
            treasury: treasuryPDA,
            jackpot: jackpotPDA,
            authority: keypair.publicKey,
          })
          .rpc();

        await connection.confirmTransaction(tx, 'confirmed');
        logger.info(`✅ Round ${roundId} closed successfully`, { tx });
        
        closedRounds.push({
          roundId,
          transactionHash: tx,
          closedAt: new Date().toISOString(),
        });

      } catch (err) {
        const error = err as Error;
        if (error.message.includes('Account does not exist')) {
          // Round doesn't exist on-chain yet, skip
          continue;
        }
        logger.error(`Failed to close round ${roundId}`, { error: error.message });
      }
    }

    res.json({
      success: true,
      closedRounds,
      checkedAt: new Date().toISOString(),
    });

  } catch (err) {
    const error = err as Error;
    logger.error('Cron job error', { error: error.message, stack: error.stack });
    res.status(500).json({ 
      error: 'Failed to close rounds',
      message: error.message,
    });
  }
});

// Start a new round using RAW SOLANA TRANSACTIONS (no Anchor bullshit)
router.post('/start-round', async (req, res) => {
  if (!CRON_AUTHORITY_PRIVATE_KEY) {
    logger.error('CRON_AUTHORITY_PRIVATE_KEY not configured');
    return res.status(500).json({ error: 'Cron service not configured' });
  }

  try {
    logger.info('🚀 Starting new round request (RAW)...');
    
    const connection = new Connection(RPC_URL, 'confirmed');
    const authority = Keypair.fromSecretKey(new Uint8Array(JSON.parse(CRON_AUTHORITY_PRIVATE_KEY)));
    
    logger.info('Authority loaded:', authority.publicKey.toString());
    
    // Get global state PDA
    const globalPDA = PublicKey.findProgramAddressSync([Buffer.from('global_state')], PROGRAM_ID)[0];
    
    // Read global state directly from account data
    const globalStateInfo = await connection.getAccountInfo(globalPDA);
    if (!globalStateInfo) {
      throw new Error('Global state not found - program not initialized');
    }
    
    // Current round is at offset 40 (after 32-byte authority pubkey + 8 bytes)
    const currentRound = globalStateInfo.data.readBigUInt64LE(40);
    const nextRound = Number(currentRound) + 1;
    const currentRoundIdBuffer = Buffer.alloc(8);
    
    logger.info(`Current round: ${currentRound}, starting round: ${nextRound}`);
    
    // STRICT CHECK: Do not start new round if current round exists and is not settled
    if (Number(currentRound) > 0) {
      currentRoundIdBuffer.writeUInt32LE(Number(currentRound), 0);
      const currentRoundPDA = PublicKey.findProgramAddressSync(
        [Buffer.from('round'), currentRoundIdBuffer], 
        PROGRAM_ID
      )[0];
      
      const currentRoundInfo = await connection.getAccountInfo(currentRoundPDA);
      if (currentRoundInfo) {
        // Parse round state to check if it's settled
        const roundData = currentRoundInfo.data;
        if (roundData.length >= 42) {
          const settled = roundData.readUInt8(40) === 1;
          const headsTotal = roundData.readBigUInt64LE(16);
          const tailsTotal = roundData.readBigUInt64LE(24);
          const totalPot = Number(headsTotal) + Number(tailsTotal);
          
          if (!settled) {
            logger.warn(`❌ Cannot start round ${nextRound} - Round ${currentRound} is still active and not settled`);
            logger.warn(`Round ${currentRound} status: settled=${settled}, pot=${(totalPot / 1_000_000_000).toFixed(3)} SOL`);
            return res.status(400).json({ 
              error: 'Active round exists',
              message: `Round ${currentRound} is still active and not settled. Wait for settlement before starting a new round.`,
              currentRound: Number(currentRound),
              settled: false,
              pot: totalPot / 1_000_000_000
            });
          } else {
            logger.info(`✅ Round ${currentRound} is settled - safe to start round ${nextRound}`);
          }
        } else {
          logger.warn(`⚠️ Round ${currentRound} account data too small - cannot verify settlement status`);
          logger.warn(`Proceeding with caution...`);
        }
      } else {
        logger.warn(`⚠️ Round ${currentRound} account not found - may have been closed`);
        logger.info(`Proceeding to start round ${nextRound}...`);
      }
    }
    
    // Create round PDA
    const nextRoundIdBuffer = Buffer.alloc(8);
    nextRoundIdBuffer.writeUInt32LE(nextRound, 0);
    const roundPDA = PublicKey.findProgramAddressSync(
      [Buffer.from('round'), nextRoundIdBuffer], 
      PROGRAM_ID
    )[0];
    
    logger.info('Round PDA:', roundPDA.toString());
    
    // Create instruction data for start_round
    // Instruction discriminator is first 8 bytes of sha256("global:start_round")
    const discriminator = Buffer.from([0x90, 0x90, 0x2b, 0x07, 0xc1, 0x2a, 0xd9, 0xd7]); // Correct discriminator
    const durationBuffer = Buffer.alloc(8);
    durationBuffer.writeBigInt64LE(BigInt(60), 0); // 60 seconds
    const instructionData = Buffer.concat([discriminator, durationBuffer]);
    
    // Create instruction
    const instruction = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: globalPDA, isSigner: false, isWritable: true },
        { pubkey: roundPDA, isSigner: false, isWritable: true },
        { pubkey: authority.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: instructionData,
    });
    
    // Create and send transaction
    const transaction = new Transaction().add(instruction);
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    transaction.feePayer = authority.publicKey;
    
    // Sign and send
    transaction.sign(authority);
    const txHash = await connection.sendRawTransaction(transaction.serialize());
    
    logger.info(`Transaction sent: ${txHash}`);
    
    // Confirm transaction
    await connection.confirmTransaction(txHash, 'confirmed');
    logger.info(`✅ Round ${nextRound} started successfully`);
    
    res.json({
      success: true,
      roundId: nextRound,
      transactionHash: txHash,
      startedAt: new Date().toISOString(),
    });

  } catch (err) {
    const error = err as Error;
    logger.error('Error starting round (RAW)', { error: error.message, stack: error.stack });
    res.status(500).json({ 
      error: 'Failed to start round',
      message: error.message,
    });
  }
});

export { router as cronRouter };
