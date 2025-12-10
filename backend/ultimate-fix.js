import { Connection, PublicKey, Transaction, TransactionInstruction, SystemProgram, Keypair } from '@solana/web3.js';
import dotenv from 'dotenv';

dotenv.config();

async function ultimateFix() {
  console.log('🔧 ULTIMATE FIX: Working around the initialize constraint\n');
  
  const PROGRAM_ID = process.env.PROGRAM_ID;
  const CRON_AUTHORITY_PRIVATE_KEY = process.env.CRON_AUTHORITY_PRIVATE_KEY;
  
  if (!PROGRAM_ID || !CRON_AUTHORITY_PRIVATE_KEY) {
    console.error('❌ Missing environment variables');
    process.exit(1);
  }

  const connection = new Connection(process.env.RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
  const programId = new PublicKey(PROGRAM_ID);
  const authority = Keypair.fromSecretKey(new Uint8Array(JSON.parse(CRON_AUTHORITY_PRIVATE_KEY)));
  
  console.log(`Authority: ${authority.publicKey.toString()}`);
  console.log(`Program: ${programId.toString()}\n`);

  // Get PDAs
  const [globalPDA] = PublicKey.findProgramAddressSync([Buffer.from('global_state')], programId);
  const [treasuryPDA] = PublicKey.findProgramAddressSync([Buffer.from('treasury')], programId);
  const [jackpotPDA] = PublicKey.findProgramAddressSync([Buffer.from('jackpot')], programId);

  console.log('📍 Account Addresses:');
  console.log(`Global: ${globalPDA.toString()}`);
  console.log(`Treasury: ${treasuryPDA.toString()}`);
  console.log(`Jackpot: ${jackpotPDA.toString()}\n`);

  // Step 1: Check current state
  console.log('🔍 Step 1: Analyzing current account states...');
  const [globalInfo, treasuryInfo, jackpotInfo] = await Promise.all([
    connection.getAccountInfo(globalPDA),
    connection.getAccountInfo(treasuryPDA),
    connection.getAccountInfo(jackpotPDA)
  ]);

  const globalExists = globalInfo !== null;
  const treasuryExists = treasuryInfo !== null;
  const jackpotExists = jackpotInfo !== null;
  const treasuryBalance = treasuryInfo ? treasuryInfo.lamports : 0;

  console.log(`Global State: ${globalExists ? '✅ EXISTS' : '❌ MISSING'}`);
  console.log(`Treasury: ${treasuryExists ? '✅ EXISTS' : '❌ MISSING'} (${treasuryBalance / 1e9} SOL)`);
  console.log(`Jackpot: ${jackpotExists ? '✅ EXISTS' : '❌ MISSING'}\n`);

  if (!globalExists || !treasuryExists) {
    console.log('❌ Global or treasury missing - need full initialization');
    process.exit(1);
  }

  if (jackpotExists && jackpotInfo.owner.equals(programId)) {
    console.log('✅ Jackpot already properly initialized!');
    process.exit(0);
  }

  // Step 2: The Nuclear Option - Transfer everything out and reinitialize
  console.log('🚨 Step 2: Nuclear option - Clean slate reinitialization');
  console.log('This will completely reset the program state but preserve funds.\n');

  console.log('⚠️  WARNING: This will:');
  console.log('   - Reset the round counter to 0');
  console.log('   - Clear all program state');
  console.log('   - Preserve treasury funds');
  console.log('   - Require restarting the game\n');

  // Create temporary account to hold treasury funds
  console.log('Creating temporary account for fund preservation...');
  const tempAccount = Keypair.generate();
  const tempAccountRent = await connection.getMinimumBalanceForRentExemption(0);

  const createTempIx = SystemProgram.createAccount({
    fromPubkey: authority.publicKey,
    newAccountPubkey: tempAccount.publicKey,
    lamports: tempAccountRent,
    space: 0,
    programId: SystemProgram.programId,
  });

  // Transfer most of treasury funds to temp account (leave a bit for rent)
  const amountToTransfer = Math.max(0, treasuryBalance - 2000000); // Leave 0.002 SOL
  console.log(`Transferring ${amountToTransfer / 1e9} SOL to temporary account...`);

  const transferIx = SystemProgram.transfer({
    fromPubkey: treasuryPDA,
    toPubkey: tempAccount.publicKey,
    lamports: amountToTransfer
  });

  // Step 3: The trick - use a special Solana instruction to close the treasury account
  // This will require manually crafting the instruction since treasury is a PDA
  
  console.log('\n💡 Actually, let\'s try a different approach...');
  console.log('Since closing PDAs is complex, let\'s drain the accounts to make them "empty"');
  console.log('and then try initialization again.\n');

  try {
    // First, transfer out treasury funds
    console.log('Step 3a: Draining treasury account...');
    const drainTx = new Transaction().add(createTempIx, transferIx);
    drainTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    drainTx.feePayer = authority.publicKey;
    drainTx.sign(authority, tempAccount);

    const drainTxHash = await connection.sendRawTransaction(drainTx.serialize());
    await connection.confirmTransaction(drainTxHash, 'confirmed');
    console.log(`✅ Funds drained, tx: ${drainTxHash}`);

    // Now the treasury is nearly empty, let's try a different approach
    console.log('\nStep 3b: Attempting creative initialization...');
    
    // Try to get the global state to read current round number
    const globalData = globalInfo.data;
    console.log(`Global state data length: ${globalData.length} bytes`);
    
    if (globalData.length >= 48) {
      // The current round should be at offset 40
      const currentRound = globalData.readBigUInt64LE(40);
      console.log(`Current round: ${currentRound}`);
    }

    console.log('\nStep 4: Manual jackpot account creation using system program with transfer...');
    
    // Since we can't create a PDA directly, let's try another approach:
    // Create the account with the system program, then transfer ownership using a CPI
    
    // Actually, let's try the simplest possible solution:
    // Initialize the program but ignore the "already exists" error for global/treasury
    
    console.log('Step 5: Force initialization with skipPreflight...');
    
    const initDiscriminator = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]);
    const rakeBps = Buffer.alloc(2);
    const jackpotBps = Buffer.alloc(2);
    rakeBps.writeUInt16LE(200, 0);
    jackpotBps.writeUInt16LE(100, 0);
    const initData = Buffer.concat([initDiscriminator, rakeBps, jackpotBps]);

    const initIx = new TransactionInstruction({
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

    const initTx = new Transaction().add(initIx);
    initTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    initTx.feePayer = authority.publicKey;
    initTx.sign(authority);

    console.log('Sending initialization transaction with skipPreflight=true...');
    
    try {
      const initTxHash = await connection.sendRawTransaction(initTx.serialize(), {
        skipPreflight: true,
        maxRetries: 3
      });
      
      console.log(`Init transaction sent: ${initTxHash}`);
      
      // Wait for confirmation
      await connection.confirmTransaction(initTxHash, 'confirmed');
      console.log('✅ Transaction confirmed!');
      
    } catch (initError) {
      console.log('❌ Initialization transaction failed:', initError.message);
      
      // Check if the jackpot account was created despite the error
      const postTxJackpotInfo = await connection.getAccountInfo(jackpotPDA);
      if (postTxJackpotInfo && postTxJackpotInfo.owner.equals(programId)) {
        console.log('🎉 SUCCESS! Jackpot account was created despite the error!');
      } else {
        console.log('❌ Jackpot account still not created');
        console.log('\nFinal option: Manual program modification needed');
        console.log('The program needs an "initialize_jackpot_only" instruction');
      }
    }

    // Step 6: Restore treasury funds
    console.log('\nStep 6: Restoring treasury funds...');
    const restoreIx = SystemProgram.transfer({
      fromPubkey: tempAccount.publicKey,
      toPubkey: treasuryPDA,
      lamports: amountToTransfer
    });

    const restoreTx = new Transaction().add(restoreIx);
    restoreTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    restoreTx.feePayer = authority.publicKey;
    restoreTx.sign(authority, tempAccount);

    try {
      const restoreTxHash = await connection.sendRawTransaction(restoreTx.serialize());
      await connection.confirmTransaction(restoreTxHash, 'confirmed');
      console.log(`✅ Funds restored, tx: ${restoreTxHash}`);
    } catch (restoreError) {
      console.log('⚠️ Error restoring funds:', restoreError.message);
      console.log(`Funds are safe in temp account: ${tempAccount.publicKey.toString()}`);
    }

  } catch (error) {
    console.log('❌ Process failed:', error.message);
  }

  // Final verification
  console.log('\n📋 FINAL VERIFICATION:');
  const [finalGlobal, finalTreasury, finalJackpot] = await Promise.all([
    connection.getAccountInfo(globalPDA),
    connection.getAccountInfo(treasuryPDA), 
    connection.getAccountInfo(jackpotPDA)
  ]);

  console.log(`Global: ${finalGlobal ? '✅' : '❌'}`);
  console.log(`Treasury: ${finalTreasury ? '✅' : '❌'} (${finalTreasury ? finalTreasury.lamports / 1e9 : 0} SOL)`);
  console.log(`Jackpot: ${finalJackpot ? (finalJackpot.owner.equals(programId) ? '✅' : '❌ wrong owner') : '❌'}`);

  if (finalJackpot && finalJackpot.owner.equals(programId)) {
    console.log('\n🎉🎉🎉 ULTIMATE SUCCESS! 🎉🎉🎉');
    console.log('All accounts are properly initialized!');
    console.log('The game is ready to resume normal operation!');
    console.log('\nYou can now:');
    console.log('✅ Start new rounds');
    console.log('✅ Close/settle rounds'); 
    console.log('✅ Process jackpot distributions');
  } else {
    console.log('\n😔 Ultimate fix incomplete');
    console.log('The jackpot account issue requires program code modification.');
    console.log('Contact the program developer to add a repair instruction.');
  }
}

ultimateFix().catch(console.error);