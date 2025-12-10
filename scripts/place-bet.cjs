#!/usr/bin/env node

/**
 * Place Bet Script
 * Place a test bet from our own wallet to test the system
 */

const { Connection, PublicKey, Keypair, SystemProgram, TransactionInstruction, Transaction } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

// Configuration
const RPC_URL = 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey('BTU8kuz95iPH6XqBMp7a4VEsLhdco62s9H81Jt6G4GQL');

async function placeBet() {
  console.log('🎲 Placing Test Bet\n');
  
  const connection = new Connection(RPC_URL, 'confirmed');
  
  // Load our authority keypair
  const keypairPath = path.join(process.env.HOME, '.config/solana/id.json');
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  const bettor = Keypair.fromSecretKey(new Uint8Array(keypairData));
  
  console.log('🔑 Bettor:', bettor.publicKey.toString());
  
  // Parse command line args
  const roundId = process.argv[2] ? parseInt(process.argv[2]) : 34;
  const side = process.argv[3] ? parseInt(process.argv[3]) : 0; // 0 = HEADS, 1 = TAILS
  const amount = process.argv[4] ? parseFloat(process.argv[4]) : 0.1; // Default 0.1 SOL
  
  const sideName = side === 0 ? 'HEADS' : 'TAILS';
  const amountLamports = Math.floor(amount * 1_000_000_000);
  
  console.log('🎯 Round:', roundId);
  console.log('🔥 Side:', sideName);
  console.log('💰 Amount:', amount, 'SOL');
  
  try {
    // Check current balance
    const balance = await connection.getBalance(bettor.publicKey);
    console.log('💳 Wallet balance:', (balance / 1_000_000_000).toFixed(3), 'SOL');
    
    if (balance < amountLamports + 5000) {
      console.log('❌ Insufficient balance for bet + fees');
      return;
    }
    
    // Check if round exists and is active
    const roundIdBuffer = Buffer.alloc(8);
    roundIdBuffer.writeUInt32LE(roundId, 0);
    
    const roundPDA = PublicKey.findProgramAddressSync(
      [Buffer.from('round'), roundIdBuffer],
      PROGRAM_ID
    )[0];
    
    console.log('📍 Round PDA:', roundPDA.toString());
    
    const roundAccount = await connection.getAccountInfo(roundPDA);
    if (!roundAccount) {
      console.log('❌ Round #' + roundId + ' does not exist');
      return;
    }
    
    // Check round state
    const data = roundAccount.data;
    const endsAt = Number(data.readBigInt64LE(32));
    const settled = data[40] === 1;
    const now = Math.floor(Date.now() / 1000);
    
    console.log('⏰ Ends at:', new Date(endsAt * 1000).toISOString());
    console.log('✅ Settled:', settled);
    console.log('🕐 Time left:', Math.max(0, endsAt - now), 'seconds');
    
    if (settled) {
      console.log('❌ Round already settled!');
      return;
    }
    
    if (now >= endsAt) {
      console.log('❌ Round has expired!');
      return;
    }
    
    // Create bet instruction
    const [globalPDA] = PublicKey.findProgramAddressSync([Buffer.from('global_state')], PROGRAM_ID);
    
    // Create user_bet PDA for this round
    const [bettorPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('user_bet'), bettor.publicKey.toBuffer(), roundIdBuffer],
      PROGRAM_ID
    );
    
    console.log('🎰 Bettor PDA:', bettorPDA.toString());
    
    // Place bet discriminator and data
    const discriminator = Buffer.from([222, 62, 67, 220, 63, 166, 126, 33]); // PlaceBet
    const sideBuffer = Buffer.alloc(1);
    sideBuffer.writeUInt8(side, 0);
    const amountBuffer = Buffer.alloc(8);
    amountBuffer.writeBigUInt64LE(BigInt(amountLamports), 0);
    
    const instructionData = Buffer.concat([discriminator, sideBuffer, amountBuffer]);
    
    const instruction = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: globalPDA, isSigner: false, isWritable: false },
        { pubkey: roundPDA, isSigner: false, isWritable: true },
        { pubkey: bettorPDA, isSigner: false, isWritable: true },
        { pubkey: bettor.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: instructionData,
    });
    
    const transaction = new Transaction().add(instruction);
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    transaction.feePayer = bettor.publicKey;
    transaction.sign(bettor);
    
    console.log('\n🚀 Placing bet...');
    
    const txHash = await connection.sendRawTransaction(transaction.serialize());
    console.log('📤 Transaction sent:', txHash);
    console.log('🔗 Solscan:', `https://solscan.io/tx/${txHash}?cluster=devnet`);
    
    console.log('\n⏳ Confirming transaction...');
    const confirmation = await connection.confirmTransaction(txHash, 'confirmed');
    
    if (confirmation.value.err) {
      console.log('❌ Transaction failed:', confirmation.value.err);
    } else {
      console.log('✅ Bet placed successfully!');
      
      // Check updated round state
      const updatedRoundAccount = await connection.getAccountInfo(roundPDA);
      const updatedData = updatedRoundAccount.data;
      const headsTotal = Number(updatedData.readBigUInt64LE(16));
      const tailsTotal = Number(updatedData.readBigUInt64LE(24));
      
      console.log('\n🎯 Updated Round State:');
      console.log('  HEADS total:', (headsTotal / 1_000_000_000).toFixed(3), 'SOL');
      console.log('  TAILS total:', (tailsTotal / 1_000_000_000).toFixed(3), 'SOL');
      console.log('  Total pot:', ((headsTotal + tailsTotal) / 1_000_000_000).toFixed(3), 'SOL');
      console.log('🎉 Ready to test settlement!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Usage: node place-bet.js [roundId] [side] [amount]
// Example: node place-bet.js 34 0 0.1  (Round 34, HEADS, 0.1 SOL)
// Example: node place-bet.js 34 1 0.05 (Round 34, TAILS, 0.05 SOL)
console.log('Usage: node place-bet.js [roundId] [side] [amount]');
console.log('  roundId: Round number (default: 34)');
console.log('  side: 0=HEADS, 1=TAILS (default: 0)');
console.log('  amount: SOL amount (default: 0.1)\n');

placeBet().catch(console.error);