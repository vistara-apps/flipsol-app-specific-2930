#!/usr/bin/env node

/**
 * Claim Winnings Script
 * Claim winnings from a settled round where you were on the winning side
 */

const { Connection, PublicKey, Keypair, SystemProgram, TransactionInstruction, Transaction } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

// Configuration
const RPC_URL = 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey('BTU8kuz95iPH6XqBMp7a4VEsLhdco62s9H81Jt6G4GQL');

async function claimWinnings() {
  console.log('💰 Claiming Winnings\n');
  
  const connection = new Connection(RPC_URL, 'confirmed');
  
  // Load our authority keypair (the bettor)
  const keypairPath = path.join(process.env.HOME, '.config/solana/id.json');
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  const user = Keypair.fromSecretKey(new Uint8Array(keypairData));
  
  console.log('🔑 User:', user.publicKey.toString());
  
  // Parse command line args
  const roundId = process.argv[2] ? parseInt(process.argv[2]) : 37;
  console.log('🎯 Claiming from Round:', roundId);
  
  try {
    // Get current balance
    const balanceBefore = await connection.getBalance(user.publicKey);
    console.log('💳 Balance before:', (balanceBefore / 1_000_000_000).toFixed(4), 'SOL');
    
    // Check round state
    const roundIdBuffer = Buffer.alloc(8);
    roundIdBuffer.writeUInt32LE(roundId, 0);
    
    const [roundPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('round'), roundIdBuffer],
      PROGRAM_ID
    );
    
    console.log('📍 Round PDA:', roundPDA.toString());
    
    const roundAccount = await connection.getAccountInfo(roundPDA);
    if (!roundAccount) {
      console.log('❌ Round #' + roundId + ' does not exist');
      return;
    }
    
    // Parse round state
    const data = roundAccount.data;
    const headsTotal = Number(data.readBigUInt64LE(16));
    const tailsTotal = Number(data.readBigUInt64LE(24));
    const settled = data[40] === 1;
    const winningSide = data[41];
    
    console.log('\n📊 Round State:');
    console.log('  Settled:', settled);
    console.log('  Winner:', winningSide === 0 ? 'HEADS' : 'TAILS');
    console.log('  HEADS total:', (headsTotal / 1_000_000_000).toFixed(3), 'SOL');
    console.log('  TAILS total:', (tailsTotal / 1_000_000_000).toFixed(3), 'SOL');
    console.log('  Round balance:', (roundAccount.lamports / 1_000_000_000).toFixed(6), 'SOL');
    
    if (!settled) {
      console.log('❌ Round not settled yet!');
      return;
    }
    
    // Check user bet
    const [userBetPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('user_bet'), user.publicKey.toBuffer(), roundIdBuffer],
      PROGRAM_ID
    );
    
    console.log('🎰 User bet PDA:', userBetPDA.toString());
    
    const userBetAccount = await connection.getAccountInfo(userBetPDA);
    if (!userBetAccount) {
      console.log('❌ You did not bet in this round');
      return;
    }
    
    // Parse user bet (skip 8-byte discriminator)
    const betData = userBetAccount.data;
    // UserBet struct: user(32) + round_id(8) + side(1) + amount(8) + claimed(1) + bump(1)
    const betSide = betData[8 + 32 + 8]; // After discriminator + user + round_id
    const betAmount = Number(betData.readBigUInt64LE(8 + 32 + 8 + 1)); // After side
    const claimed = betData[8 + 32 + 8 + 1 + 8] === 1; // After side + amount
    
    console.log('\n🎲 Your Bet:');
    console.log('  Amount:', (betAmount / 1_000_000_000).toFixed(3), 'SOL');
    console.log('  Side:', betSide === 0 ? 'HEADS' : 'TAILS');
    console.log('  Claimed:', claimed);
    
    if (claimed) {
      console.log('✅ Already claimed!');
      return;
    }
    
    if (betSide !== winningSide) {
      console.log('❌ You bet on the losing side');
      return;
    }
    
    // Calculate expected winnings
    const totalPot = headsTotal + tailsTotal;
    const winningTotal = winningSide === 0 ? headsTotal : tailsTotal;
    const feePercentage = 0.02; // 2% total fees
    const winnerPool = totalPot * (1 - feePercentage);
    const expectedWinnings = (betAmount / winningTotal) * winnerPool;
    
    console.log('\n💵 Expected Winnings:');
    console.log('  Total pot:', (totalPot / 1_000_000_000).toFixed(3), 'SOL');
    console.log('  Winner pool (98%):', (winnerPool / 1_000_000_000).toFixed(3), 'SOL');
    console.log('  Your share:', (expectedWinnings / 1_000_000_000).toFixed(6), 'SOL');
    
    // Create claim instruction
    const [globalPDA] = PublicKey.findProgramAddressSync([Buffer.from('global_state')], PROGRAM_ID);
    
    // Claim winnings discriminator
    const discriminator = Buffer.from([161, 215, 24, 59, 14, 236, 242, 221]); // claim_winnings
    
    const instruction = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: globalPDA, isSigner: false, isWritable: false },
        { pubkey: roundPDA, isSigner: false, isWritable: true },
        { pubkey: userBetPDA, isSigner: false, isWritable: true },
        { pubkey: user.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: discriminator,
    });
    
    const transaction = new Transaction().add(instruction);
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    transaction.feePayer = user.publicKey;
    transaction.sign(user);
    
    console.log('\n🚀 Claiming winnings...');
    
    const txHash = await connection.sendRawTransaction(transaction.serialize());
    console.log('📤 Transaction sent:', txHash);
    console.log('🔗 Solscan:', `https://solscan.io/tx/${txHash}?cluster=devnet`);
    
    console.log('\n⏳ Confirming transaction...');
    const confirmation = await connection.confirmTransaction(txHash, 'confirmed');
    
    if (confirmation.value.err) {
      console.log('❌ Transaction failed:', confirmation.value.err);
    } else {
      console.log('✅ Winnings claimed successfully!');
      
      // Check new balance
      const balanceAfter = await connection.getBalance(user.publicKey);
      const actualReceived = balanceAfter - balanceBefore;
      
      console.log('\n💰 Results:');
      console.log('  Balance after:', (balanceAfter / 1_000_000_000).toFixed(4), 'SOL');
      console.log('  Received:', (actualReceived / 1_000_000_000).toFixed(6), 'SOL');
      
      // Check if user bet is now marked as claimed
      const updatedUserBet = await connection.getAccountInfo(userBetPDA);
      if (updatedUserBet && updatedUserBet.data[49] === 1) {
        console.log('  ✅ Bet marked as claimed');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Usage: node claim-winnings.js [roundId]
console.log('Usage: node claim-winnings.js [roundId]');
console.log('  roundId: Round number (default: 37)\n');

claimWinnings().catch(console.error);