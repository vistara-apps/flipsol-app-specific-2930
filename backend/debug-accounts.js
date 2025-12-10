import { Connection, PublicKey } from '@solana/web3.js';
import dotenv from 'dotenv';

dotenv.config();

async function debugAccounts() {
  console.log('🔍 Debugging FlipSOL account states...\n');
  
  const PROGRAM_ID = process.env.PROGRAM_ID;
  if (!PROGRAM_ID) {
    console.error('❌ PROGRAM_ID not found in .env');
    process.exit(1);
  }

  const connection = new Connection(process.env.RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
  const programId = new PublicKey(PROGRAM_ID);
  
  // System Program ID for comparison
  const systemProgram = new PublicKey('11111111111111111111111111111111');
  
  // Get all PDAs
  const [globalPDA] = PublicKey.findProgramAddressSync([Buffer.from('global_state')], programId);
  const [treasuryPDA] = PublicKey.findProgramAddressSync([Buffer.from('treasury')], programId);
  const [jackpotPDA] = PublicKey.findProgramAddressSync([Buffer.from('jackpot')], programId);

  console.log('📍 PDA Addresses:');
  console.log(`Program ID: ${programId.toString()}`);
  console.log(`Global State: ${globalPDA.toString()}`);
  console.log(`Treasury: ${treasuryPDA.toString()}`);
  console.log(`Jackpot: ${jackpotPDA.toString()}`);
  console.log();

  // Check all accounts
  const [globalInfo, treasuryInfo, jackpotInfo] = await Promise.all([
    connection.getAccountInfo(globalPDA),
    connection.getAccountInfo(treasuryPDA),
    connection.getAccountInfo(jackpotPDA)
  ]);

  console.log('🔎 Account States:');
  
  // Global State
  if (globalInfo) {
    const isCorrectOwner = globalInfo.owner.equals(programId);
    console.log(`Global State: ✅ EXISTS`);
    console.log(`  Owner: ${globalInfo.owner.toString()} ${isCorrectOwner ? '✅' : '❌'}`);
    console.log(`  Size: ${globalInfo.data.length} bytes`);
    console.log(`  Lamports: ${globalInfo.lamports / 1e9} SOL`);
  } else {
    console.log(`Global State: ❌ DOES NOT EXIST`);
  }
  
  // Treasury
  if (treasuryInfo) {
    const isCorrectOwner = treasuryInfo.owner.equals(programId);
    console.log(`Treasury: ✅ EXISTS`);
    console.log(`  Owner: ${treasuryInfo.owner.toString()} ${isCorrectOwner ? '✅' : '❌'}`);
    console.log(`  Size: ${treasuryInfo.data.length} bytes`);
    console.log(`  Lamports: ${treasuryInfo.lamports / 1e9} SOL`);
  } else {
    console.log(`Treasury: ❌ DOES NOT EXIST`);
  }
  
  // Jackpot (the problematic one)
  if (jackpotInfo) {
    const isCorrectOwner = jackpotInfo.owner.equals(programId);
    const isSystemOwned = jackpotInfo.owner.equals(systemProgram);
    console.log(`Jackpot: ⚠️ EXISTS BUT PROBLEMATIC`);
    console.log(`  Owner: ${jackpotInfo.owner.toString()} ${isCorrectOwner ? '✅' : (isSystemOwned ? '❌ (System Program)' : '❌ (Unknown)')}`);
    console.log(`  Size: ${jackpotInfo.data.length} bytes`);
    console.log(`  Lamports: ${jackpotInfo.lamports / 1e9} SOL`);
    
    if (isSystemOwned) {
      console.log(`  🚨 ISSUE: Account is owned by System Program, not FlipSOL program!`);
      console.log(`  🔧 SOLUTION: Run program initialization to transfer ownership`);
    }
  } else {
    console.log(`Jackpot: ❌ DOES NOT EXIST`);
  }
  
  console.log();
  
  // Determine next steps
  if (!globalInfo || !treasuryInfo) {
    console.log('🎯 NEXT STEP: Run full program initialization (all accounts missing)');
    console.log('   node ./scripts/init-program.js');
  } else if (!jackpotInfo || (jackpotInfo && !jackpotInfo.owner.equals(programId))) {
    console.log('🎯 NEXT STEP: Re-initialize program to fix jackpot account');
    console.log('   node ./scripts/init-program.js');
  } else {
    console.log('✅ All accounts are properly initialized!');
  }
}

debugAccounts().catch(console.error);