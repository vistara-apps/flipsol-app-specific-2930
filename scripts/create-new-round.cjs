#!/usr/bin/env node

/**
 * Create New Round Script
 * Force create Round #32 with the UPGRADED program
 */

const { Connection, PublicKey, Keypair, SystemProgram, TransactionInstruction, Transaction } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

// Configuration
const RPC_URL = 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey('BTU8kuz95iPH6XqBMp7a4VEsLhdco62s9H81Jt6G4GQL');

async function createNewRound() {
  console.log('🚀 Creating New Round with Upgraded Program\n');
  
  const connection = new Connection(RPC_URL, 'confirmed');
  
  // Load our authority keypair
  const keypairPath = path.join(process.env.HOME, '.config/solana/id.json');
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  const authority = Keypair.fromSecretKey(new Uint8Array(keypairData));
  
  console.log('🔑 Authority:', authority.publicKey.toString());
  
  try {
    // Check global state
    const [globalPDA] = PublicKey.findProgramAddressSync([Buffer.from('global_state')], PROGRAM_ID);
    console.log('📍 Global PDA:', globalPDA.toString());
    
    const globalAccount = await connection.getAccountInfo(globalPDA);
    if (!globalAccount) {
      console.log('❌ Global state not found - program not initialized');
      return;
    }
    
    // Read current round from global state
    const globalData = globalAccount.data;
    const currentRound = globalData.readBigUInt64LE(8); // After discriminator and authority
    console.log('📊 Current round:', Number(currentRound));
    
    const nextRound = Number(currentRound) + 1;
    console.log('🎯 Creating Round #' + nextRound);
    
    // Check if round already exists
    const [nextRoundPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('round'), Buffer.from([nextRound, 0, 0, 0, 0, 0, 0, 0])],
      PROGRAM_ID
    );
    
    const existingRound = await connection.getAccountInfo(nextRoundPDA);
    if (existingRound) {
      console.log('⚠️ Round #' + nextRound + ' already exists!');
      console.log('💰 Balance:', existingRound.lamports / 1_000_000_000, 'SOL');
      return;
    }
    
    // Create start round instruction
    const duration = 60; // 60 seconds for testing
    const discriminator = Buffer.from([97, 75, 98, 99, 30, 240, 20, 187]); // StartRound
    
    // Encode duration as BN (8 bytes little endian)
    const durationBuffer = Buffer.alloc(8);
    durationBuffer.writeBigUInt64LE(BigInt(duration), 0);
    
    const instruction = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: globalPDA, isSigner: false, isWritable: true },
        { pubkey: nextRoundPDA, isSigner: false, isWritable: true },
        { pubkey: authority.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([discriminator, durationBuffer]),
    });
    
    const transaction = new Transaction().add(instruction);
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    transaction.feePayer = authority.publicKey;
    transaction.sign(authority);
    
    console.log('\n🚀 Sending start round transaction...');
    
    const txHash = await connection.sendRawTransaction(transaction.serialize());
    console.log('📤 Transaction sent:', txHash);
    console.log('🔗 Solscan:', `https://solscan.io/tx/${txHash}?cluster=devnet`);
    
    console.log('\n⏳ Confirming transaction...');
    const confirmation = await connection.confirmTransaction(txHash, 'confirmed');
    
    if (confirmation.value.err) {
      console.log('❌ Transaction failed:', confirmation.value.err);
    } else {
      console.log('✅ Transaction confirmed!');
      console.log(`🎉 Round #${nextRound} created successfully with UPGRADED program!`);
      console.log(`⏰ Round will expire in ${duration} seconds`);
      
      // Wait a moment then check the round
      setTimeout(async () => {
        const newRoundAccount = await connection.getAccountInfo(nextRoundPDA);
        if (newRoundAccount) {
          console.log('📊 New round balance:', newRoundAccount.lamports / 1_000_000_000, 'SOL');
          console.log('🎯 Ready to test settlement in', duration, 'seconds!');
        }
      }, 2000);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createNewRound().catch(console.error);