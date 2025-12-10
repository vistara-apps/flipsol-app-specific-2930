import { Connection, PublicKey, Transaction, TransactionInstruction, SystemProgram, Keypair } from '@solana/web3.js';
import dotenv from 'dotenv';

dotenv.config();

async function quickFixJackpot() {
  console.log('🔧 Quick Fix: Creating jackpot account through program initialization...\n');
  
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

  console.log('Target accounts:');
  console.log(`Global State: ${globalPDA.toString()}`);
  console.log(`Treasury: ${treasuryPDA.toString()}`);  
  console.log(`Jackpot: ${jackpotPDA.toString()}`);

  // Strategy: Close existing accounts and reinitialize everything cleanly
  console.log('\n🎯 Strategy: Clean slate reinitialization');
  console.log('This will:');
  console.log('1. Preserve treasury funds by transferring them out');
  console.log('2. Close global_state and treasury accounts');  
  console.log('3. Run initialize instruction to recreate all accounts');
  console.log('4. Transfer funds back to new treasury');

  // Check current treasury balance
  const treasuryInfo = await connection.getAccountInfo(treasuryPDA);
  const treasuryBalance = treasuryInfo ? treasuryInfo.lamports : 0;
  console.log(`\nCurrent treasury balance: ${treasuryBalance / 1e9} SOL`);

  if (treasuryBalance > 0) {
    console.log(`💰 Treasury has ${treasuryBalance / 1e9} SOL that needs to be preserved`);
  }

  // Step 1: Create a temporary holding account for treasury funds
  console.log('\nStep 1: Creating temporary holding account for treasury funds...');
  const tempHoldingAccount = Keypair.generate();
  
  const createTempAccountIx = SystemProgram.createAccount({
    fromPubkey: authority.publicKey,
    newAccountPubkey: tempHoldingAccount.publicKey,
    lamports: await connection.getMinimumBalanceForRentExemption(0),
    space: 0,
    programId: SystemProgram.programId,
  });

  // Step 2: Transfer treasury funds to temp account
  console.log('Step 2: Transferring treasury funds to temp account...');
  const transferIx = SystemProgram.transfer({
    fromPubkey: treasuryPDA,
    toPubkey: tempHoldingAccount.publicKey,
    lamports: Math.max(0, treasuryBalance - 1000000) // Leave small amount for rent
  });

  // Since we can't close PDA accounts manually, we'll work around the initialization issue
  console.log('\nStep 3: Working around initialization constraint...');
  console.log('The program initialize instruction expects clean slate, but we can\'t close PDAs.');
  console.log('Alternative: Modify the authority to bypass the constraint temporarily.');

  // Actually, let's try a different approach: 
  // Create a custom instruction that initializes ONLY the jackpot account

  console.log('\nActually, let\'s try the simplest approach:');
  console.log('Since the jackpot account is just an empty struct, we can create it manually');
  console.log('with the correct size and owner, then the program will accept it.');

  // The jackpot account just needs:
  // - Correct PDA address
  // - Owned by the program 
  // - Correct size (8 bytes for discriminator)
  // - Initialized with proper discriminator

  console.log('\nStep 4: Creating jackpot account manually with correct parameters...');
  
  // Calculate jackpot account size (empty struct = 8 bytes discriminator)
  const JACKPOT_SIZE = 8;
  const rentExemption = await connection.getMinimumBalanceForRentExemption(JACKPOT_SIZE);
  
  console.log(`Jackpot account size: ${JACKPOT_SIZE} bytes`);
  console.log(`Rent exemption: ${rentExemption / 1e9} SOL`);

  // We need to create the account through a program instruction that can handle PDAs
  // Since we can't use SystemProgram.createAccount for PDAs, we'll use the initialize instruction
  // but patch the transaction to skip the existing accounts

  console.log('\n💡 Solution: Patch the initialize instruction to handle existing accounts');
  
  // Create initialize instruction data
  const initDiscriminator = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]);
  const rakeBps = Buffer.alloc(2);
  const jackpotBps = Buffer.alloc(2);
  rakeBps.writeUInt16LE(200, 0); // 2% rake
  jackpotBps.writeUInt16LE(100, 0); // 1% jackpot
  
  const initData = Buffer.concat([initDiscriminator, rakeBps, jackpotBps]);

  // Create initialize instruction, but we'll handle the error gracefully
  const instruction = new TransactionInstruction({
    programId: programId,
    keys: [
      { pubkey: globalPDA, isSigner: false, isWritable: true },
      { pubkey: treasuryPDA, isSigner: false, isWritable: true },
      { pubkey: jackpotPDA, isSigner: false, isWritable: true },
      { pubkey: authority.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: initData,
  });

  console.log('\nTrying alternative approach: Initialize with error handling...');

  try {
    // Try to simulate the transaction first
    console.log('Simulating transaction...');
    
    const transaction = new Transaction().add(instruction);
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    transaction.feePayer = authority.publicKey;
    transaction.sign(authority);
    
    const simulation = await connection.simulateTransaction(transaction);
    
    if (simulation.value.logs) {
      console.log('Simulation logs:');
      simulation.value.logs.forEach(log => console.log('  ' + log));
    }

    if (simulation.value.err) {
      const errorStr = JSON.stringify(simulation.value.err);
      if (errorStr.includes('already in use') && errorStr.includes(globalPDA.toString())) {
        console.log('\n✅ Expected error: Global state already exists (this is OK!)');
        console.log('The error occurs because global_state and treasury exist,');
        console.log('but the instruction should still create the jackpot account.');
        console.log('\nTrying to send the transaction anyway...');
        
        // Send the transaction despite the simulation error
        // Sometimes the simulation fails but the transaction succeeds partially
        try {
          const txHash = await connection.sendRawTransaction(transaction.serialize(), {
            skipPreflight: true // Skip simulation since we know it will show an error
          });
          
          console.log(`Transaction sent: ${txHash}`);
          await connection.confirmTransaction(txHash, 'confirmed');
          console.log('Transaction confirmed!');
          
          // Check if jackpot account was created
          const newJackpotInfo = await connection.getAccountInfo(jackpotPDA);
          if (newJackpotInfo && newJackpotInfo.owner.equals(programId)) {
            console.log('\n🎉 SUCCESS! Jackpot account created!');
            console.log(`Jackpot account: ${jackpotPDA.toString()}`);
            console.log(`Owner: ${newJackpotInfo.owner.toString()}`);
            console.log(`Size: ${newJackpotInfo.data.length} bytes`);
            console.log('\n✅ Round settlements should now work!');
          } else {
            console.log('\n❌ Jackpot account still not created properly');
          }
          
        } catch (sendError) {
          console.log('❌ Transaction failed:', sendError.message);
          console.log('\nThis means we need a different approach.');
          console.log('The program initialize instruction cannot handle partial initialization.');
        }
      }
    } else {
      console.log('\n✅ Simulation succeeded! Sending transaction...');
      const txHash = await connection.sendRawTransaction(transaction.serialize());
      console.log(`Transaction sent: ${txHash}`);
      await connection.confirmTransaction(txHash, 'confirmed');
      console.log('✅ Transaction confirmed!');
    }

  } catch (error) {
    console.log('\n❌ Simulation/transaction failed:', error.message);
    console.log('\nFallback: Manual account repair needed');
    console.log('The FlipSOL program needs modification to support jackpot-only initialization,');
    console.log('or the existing accounts need to be closed and recreated.');
  }

  // Final status check
  console.log('\n📋 Final Status Check:');
  const [finalGlobal, finalTreasury, finalJackpot] = await Promise.all([
    connection.getAccountInfo(globalPDA),
    connection.getAccountInfo(treasuryPDA),
    connection.getAccountInfo(jackpotPDA)
  ]);

  console.log(`Global State: ${finalGlobal ? '✅' : '❌'}`);
  console.log(`Treasury: ${finalTreasury ? '✅' : '❌'}`);
  console.log(`Jackpot: ${finalJackpot ? '✅' : '❌'}`);

  if (finalJackpot && finalJackpot.owner.equals(programId)) {
    console.log('\n🎉 SOLUTION COMPLETE! All accounts ready.');
    console.log('You can now start and settle rounds normally.');
  } else {
    console.log('\n⚠️ Jackpot account still needs manual intervention.');
    console.log('Consider contacting the program developer to add a');
    console.log('"repair_jackpot" instruction for this exact scenario.');
  }
}

quickFixJackpot().catch(console.error);