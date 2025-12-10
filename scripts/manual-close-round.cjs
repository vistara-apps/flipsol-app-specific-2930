#!/usr/bin/env node

/**
 * Manual Round Closure Script
 * Test if our settlement system works end-to-end
 */

const { Connection, PublicKey, Keypair, SystemProgram, TransactionInstruction, Transaction } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

// Configuration
const RPC_URL = 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey('BTU8kuz95iPH6XqBMp7a4VEsLhdco62s9H81Jt6G4GQL');

async function manualCloseRound() {
  console.log('🔧 Manual Round Closure Test\n');
  
  const connection = new Connection(RPC_URL, 'confirmed');
  
  // Load our authority keypair
  const keypairPath = path.join(process.env.HOME, '.config/solana/id.json');
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  const authority = Keypair.fromSecretKey(new Uint8Array(keypairData));
  
  console.log('🔑 Authority:', authority.publicKey.toString());
  
  // Check which round to close
  const roundId = process.argv[2] ? parseInt(process.argv[2]) : 31;
  console.log('🎯 Attempting to close Round #' + roundId);
  
  try {
    // Check round state first
    const [roundPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('round'), Buffer.from([roundId, 0, 0, 0, 0, 0, 0, 0])],
      PROGRAM_ID
    );
    
    console.log('📍 Round PDA:', roundPDA.toString());
    
    const roundAccount = await connection.getAccountInfo(roundPDA);
    if (!roundAccount) {
      console.log('❌ Round #' + roundId + ' does not exist');
      return;
    }
    
    console.log('💰 Round balance:', roundAccount.lamports / 1_000_000_000, 'SOL');
    
    // Read round state
    const data = roundAccount.data;
    const settled = data[40] === 1;
    console.log('✅ Round settled:', settled);
    
    if (settled) {
      console.log('✋ Round already settled!');
      return;
    }
    
    // Create close round instruction
    const [globalPDA] = PublicKey.findProgramAddressSync([Buffer.from('global_state')], PROGRAM_ID);
    const [treasuryPDA] = PublicKey.findProgramAddressSync([Buffer.from('treasury')], PROGRAM_ID);
    const [jackpotPDA] = PublicKey.findProgramAddressSync([Buffer.from('jackpot')], PROGRAM_ID);
    
    console.log('📋 PDAs:');
    console.log('  Global:', globalPDA.toString());
    console.log('  Treasury:', treasuryPDA.toString());
    console.log('  Jackpot:', jackpotPDA.toString());
    
    // Close round discriminator
    const discriminator = Buffer.from([149, 14, 81, 88, 230, 226, 234, 37]);
    
    const instruction = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: globalPDA, isSigner: false, isWritable: false },
        { pubkey: roundPDA, isSigner: false, isWritable: true },
        { pubkey: treasuryPDA, isSigner: false, isWritable: true },
        { pubkey: jackpotPDA, isSigner: false, isWritable: true },
        { pubkey: authority.publicKey, isSigner: true, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: discriminator,
    });
    
    const transaction = new Transaction().add(instruction);
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    transaction.feePayer = authority.publicKey;
    transaction.sign(authority);
    
    console.log('\n🚀 Sending close round transaction...');
    
    const txHash = await connection.sendRawTransaction(transaction.serialize());
    console.log('📤 Transaction sent:', txHash);
    console.log('🔗 Solscan:', `https://solscan.io/tx/${txHash}?cluster=devnet`);
    
    console.log('\n⏳ Confirming transaction...');
    const confirmation = await connection.confirmTransaction(txHash, 'confirmed');
    
    if (confirmation.value.err) {
      console.log('❌ Transaction failed:', confirmation.value.err);
    } else {
      console.log('✅ Transaction confirmed!');
      
      // Check the round state again
      const newRoundAccount = await connection.getAccountInfo(roundPDA);
      const newData = newRoundAccount.data;
      const nowSettled = newData[40] === 1;
      const winningSide = newData[41];
      
      console.log('\n🎉 Settlement Results:');
      console.log('  Settled:', nowSettled);
      console.log('  Winner:', winningSide === 0 ? 'HEADS' : 'TAILS');
      console.log('  New balance:', newRoundAccount.lamports / 1_000_000_000, 'SOL');
      
      if (nowSettled) {
        console.log('🎯 SUCCESS! Round settlement working correctly!');
        console.log('💡 The coin toss picked:', winningSide === 0 ? '👑 HEADS' : '👾 TAILS');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    
    if (error.message.includes('Transfer: `from` must not carry data')) {
      console.log('\n🔍 This is the jackpot transfer issue - program needs upgrade');
    }
  }
}

// Usage: node manual-close-round.js [roundId]
// Example: node manual-close-round.js 31
manualCloseRound().catch(console.error);