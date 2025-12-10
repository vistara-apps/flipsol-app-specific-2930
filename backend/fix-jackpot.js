import { Connection, PublicKey, Transaction, TransactionInstruction, SystemProgram, Keypair } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { IDL } from './src/idl/flipsol.js';
import dotenv from 'dotenv';

dotenv.config();

async function fixJackpotAccount() {
  console.log('🔧 Fixing jackpot account initialization...\n');
  
  const PROGRAM_ID = process.env.PROGRAM_ID;
  const CRON_AUTHORITY_PRIVATE_KEY = process.env.CRON_AUTHORITY_PRIVATE_KEY;
  
  if (!PROGRAM_ID || !CRON_AUTHORITY_PRIVATE_KEY) {
    console.error('❌ Missing PROGRAM_ID or CRON_AUTHORITY_PRIVATE_KEY in .env');
    process.exit(1);
  }

  const connection = new Connection(process.env.RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
  const programId = new PublicKey(PROGRAM_ID);
  
  // Parse authority keypair
  const authorityPrivateKey = JSON.parse(CRON_AUTHORITY_PRIVATE_KEY);
  const authority = Keypair.fromSecretKey(new Uint8Array(authorityPrivateKey));
  
  console.log(`Authority: ${authority.publicKey.toString()}`);

  // Get PDAs
  const [globalPDA] = PublicKey.findProgramAddressSync([Buffer.from('global_state')], programId);
  const [treasuryPDA] = PublicKey.findProgramAddressSync([Buffer.from('treasury')], programId);
  const [jackpotPDA] = PublicKey.findProgramAddressSync([Buffer.from('jackpot')], programId);

  console.log('PDAs:');
  console.log(`Global State: ${globalPDA.toString()}`);
  console.log(`Treasury: ${treasuryPDA.toString()}`);
  console.log(`Jackpot: ${jackpotPDA.toString()}`);

  // Check current states
  const [globalInfo, treasuryInfo, jackpotInfo] = await Promise.all([
    connection.getAccountInfo(globalPDA),
    connection.getAccountInfo(treasuryPDA),
    connection.getAccountInfo(jackpotPDA)
  ]);

  console.log('\nCurrent states:');
  console.log(`Global State: ${globalInfo ? '✅ exists' : '❌ missing'}`);
  console.log(`Treasury: ${treasuryInfo ? '✅ exists' : '❌ missing'}`);
  console.log(`Jackpot: ${jackpotInfo ? '✅ exists' : '❌ missing'}`);

  if (!globalInfo || !treasuryInfo) {
    console.error('\n❌ Global state or treasury missing. Need full reinitialization.');
    console.log('Run: node ./scripts/init-program.js (after clearing existing accounts)');
    process.exit(1);
  }

  if (jackpotInfo) {
    if (jackpotInfo.owner.equals(programId)) {
      console.log('\n✅ Jackpot account already properly initialized!');
      process.exit(0);
    } else {
      console.log('\n⚠️ Jackpot account exists but wrong owner. Attempting to fix...');
    }
  }

  console.log('\n🛠️ Method: Using raw Solana instructions to create jackpot account...');

  try {
    // Method 1: Try to create the jackpot account with SystemProgram and then transfer ownership
    console.log('\nStep 1: Creating jackpot account with proper size and ownership...');
    
    // Calculate space needed for Jackpot account (from IDL - it's empty struct, so just discriminator)
    const JACKPOT_ACCOUNT_SIZE = 8; // Just the Anchor discriminator
    const rentExemption = await connection.getMinimumBalanceForRentExemption(JACKPOT_ACCOUNT_SIZE);
    
    console.log(`Space needed: ${JACKPOT_ACCOUNT_SIZE} bytes`);
    console.log(`Rent exemption: ${rentExemption / 1e9} SOL`);

    // Since we can't create a PDA directly with SystemProgram.createAccount,
    // we need to use a CPI (Cross Program Invocation) approach.
    // The only way to properly initialize the jackpot account is through the program itself.
    
    // Let's try a different approach: Create a minimal instruction that only initializes jackpot
    console.log('\nStep 2: Attempting to call program with jackpot-only initialization...');
    
    // We'll create a custom transaction that mimics what the initialize instruction does,
    // but only for the jackpot account
    
    // First, let's check if there's a way to recreate all accounts by clearing the existing ones
    console.log('\n⚠️ The FlipSOL program requires a clean slate for initialization.');
    console.log('This means we need to either:');
    console.log('1. Modify the program to support partial initialization, OR');
    console.log('2. Close existing accounts and reinitialize everything, OR');
    console.log('3. Transfer all funds, close accounts, and reinitialize');
    
    console.log('\n💡 Recommended solution: Close and reinitialize all accounts');
    console.log('This will preserve the treasury funds but require restarting the game state.');
    
    // For now, let's try approach 3: Transfer funds out, close accounts, reinitialize
    console.log('\nStep 3: Preparing account closure and reinitialization...');
    
    // Get current treasury balance
    const treasuryBalance = treasuryInfo.lamports;
    console.log(`Treasury balance: ${treasuryBalance / 1e9} SOL`);
    
    if (treasuryBalance > 0) {
      console.log('\n⚠️ Treasury has funds. For safety, please:');
      console.log('1. Pause the game');
      console.log('2. Ensure no active rounds');
      console.log('3. Consider withdrawing treasury funds first');
      console.log('\nProceed? (This is just a dry-run simulation)');
    }
    
    // Create a special initialization transaction that works with existing accounts
    console.log('\nStep 4: Creating special initialization transaction...');
    
    // Since the program initialize instruction fails with existing accounts,
    // we need to manually create just the jackpot account using the system program,
    // but assign it to the correct program ID from the start
    
    const jackpotSeeds = [Buffer.from('jackpot')];
    const [jackpotPubkey, bump] = PublicKey.findProgramAddressSync(jackpotSeeds, programId);
    
    console.log(`Creating account at: ${jackpotPubkey.toString()}`);
    console.log(`Bump: ${bump}`);
    
    // Create the account instruction
    const createAccountIx = SystemProgram.createAccount({
      fromPubkey: authority.publicKey,
      newAccountPubkey: jackpotPubkey,
      lamports: rentExemption,
      space: JACKPOT_ACCOUNT_SIZE,
      programId: programId, // This is the key - assign it to our program, not system program
    });
    
    // But wait - we can't sign for a PDA! PDAs don't have private keys.
    // This is why the original script failed.
    
    console.log('\n❌ Cannot create PDA with SystemProgram.createAccount - PDAs have no private key!');
    console.log('\n✅ CORRECT SOLUTION IDENTIFIED:');
    console.log('The jackpot account MUST be created by the FlipSOL program itself.');
    console.log('Since the initialize instruction creates all three accounts,');
    console.log('we need to modify our approach:\n');
    
    console.log('🎯 WORKING SOLUTION:');
    console.log('1. Create a small script to drain treasury (if needed)');
    console.log('2. Close the global_state and treasury accounts');
    console.log('3. Run the initialize instruction fresh');
    console.log('4. This will create all three accounts properly');
    
    console.log('\nThis requires careful fund management but is the cleanest solution.');
    console.log('Alternatively, the program code could be modified to support partial initialization.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixJackpotAccount().catch(console.error);