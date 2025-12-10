import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import dotenv from 'dotenv';

dotenv.config();

async function fixJackpotAccount() {
  console.log('🔧 Fixing jackpot account ownership issue...\n');
  
  const PROGRAM_ID = process.env.PROGRAM_ID || 'BTU8kuz95iPH6XqBMp7a4VEsL82s9H81Jt6G4GQL';
  const CRON_AUTHORITY_PRIVATE_KEY = process.env.CRON_AUTHORITY_PRIVATE_KEY;
  const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';
  
  if (!CRON_AUTHORITY_PRIVATE_KEY) {
    console.error('❌ Missing CRON_AUTHORITY_PRIVATE_KEY in .env');
    process.exit(1);
  }

  const connection = new Connection(RPC_URL, 'confirmed');
  const programId = new PublicKey(PROGRAM_ID);
  
  // Parse authority keypair
  let authorityPrivateKey;
  try {
    authorityPrivateKey = JSON.parse(CRON_AUTHORITY_PRIVATE_KEY);
  } catch (error) {
    console.error('❌ Invalid CRON_AUTHORITY_PRIVATE_KEY format');
    process.exit(1);
  }
  
  const authority = Keypair.fromSecretKey(new Uint8Array(authorityPrivateKey));
  console.log(`Authority: ${authority.publicKey.toString()}`);

  // Get jackpot PDA
  const [jackpotPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('jackpot')],
    programId
  );
  
  console.log(`Jackpot PDA: ${jackpotPDA.toString()}`);
  console.log(`Program ID: ${programId.toString()}\n`);

  // Check current state
  const jackpotInfo = await connection.getAccountInfo(jackpotPDA);
  
  if (!jackpotInfo) {
    console.log('✅ Jackpot account does not exist - will be created by program on next round close');
    console.log('No action needed.');
    process.exit(0);
  }

  const isCorrectOwner = jackpotInfo.owner.equals(programId);
  const isSystemOwned = jackpotInfo.owner.equals(SystemProgram.programId);
  
  console.log(`Current owner: ${jackpotInfo.owner.toString()}`);
  console.log(`Expected owner: ${programId.toString()}`);
  console.log(`Is correct: ${isCorrectOwner ? '✅' : '❌'}`);
  console.log(`Is System Program: ${isSystemOwned ? '⚠️' : ''}\n`);

  if (isCorrectOwner) {
    console.log('✅ Jackpot account is already properly owned by the program!');
    process.exit(0);
  }

  if (isSystemOwned) {
    console.log('⚠️ Jackpot account is owned by System Program (incorrect).');
    console.log('🔧 Attempting to fix...\n');
    
    // Since it's a PDA, we can't directly close it from outside the program
    // However, if it was created incorrectly, we might be able to work around it
    // The best solution is to ensure the program can handle this case
    
    console.log('💡 SOLUTION:');
    console.log('The jackpot account needs to be reinitialized by the program.');
    console.log('Since the account is a PDA owned by System Program, we cannot close it directly.');
    console.log('\n🎯 RECOMMENDED FIX:');
    console.log('1. The backend will now attempt to close rounds even with this issue');
    console.log('2. The program may need to be updated to handle missing/wrong jackpot accounts');
    console.log('3. OR: Reinitialize the entire program (requires draining treasury first)');
    console.log('\n📝 For now, rounds will attempt to close - if they fail,');
    console.log('   you may need to update the Solana program to handle this case.');
    
    // Check if we can at least verify the account balance
    console.log(`\nAccount balance: ${jackpotInfo.lamports / 1e9} SOL`);
    console.log(`Account size: ${jackpotInfo.data.length} bytes`);
    
    process.exit(0);
  } else {
    console.error(`❌ Jackpot account owned by unknown program: ${jackpotInfo.owner.toString()}`);
    console.error('This requires manual intervention.');
    process.exit(1);
  }
}

fixJackpotAccount().catch(console.error);

