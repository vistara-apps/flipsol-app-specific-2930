import { Connection, PublicKey, Transaction, TransactionInstruction, SystemProgram, Keypair } from '@solana/web3.js';
import dotenv from 'dotenv';

dotenv.config();

async function fixJackpotAccount() {
  console.log('🔧 FlipSOL Jackpot Account Diagnostic & Fix Tool\n');
  
  const PROGRAM_ID = process.env.PROGRAM_ID;
  const CRON_AUTHORITY_PRIVATE_KEY = process.env.CRON_AUTHORITY_PRIVATE_KEY;
  
  if (!PROGRAM_ID || !CRON_AUTHORITY_PRIVATE_KEY) {
    console.error('❌ Missing required environment variables:');
    console.error('   PROGRAM_ID and CRON_AUTHORITY_PRIVATE_KEY must be set in .env');
    process.exit(1);
  }

  const connection = new Connection(process.env.RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
  const programId = new PublicKey(PROGRAM_ID);
  const authority = Keypair.fromSecretKey(new Uint8Array(JSON.parse(CRON_AUTHORITY_PRIVATE_KEY)));
  
  console.log('🔍 DIAGNOSTIC INFORMATION:');
  console.log(`Program ID: ${programId.toString()}`);
  console.log(`Authority: ${authority.publicKey.toString()}`);
  console.log(`RPC URL: ${connection.rpcEndpoint}\n`);

  // Get all PDAs
  const [globalPDA] = PublicKey.findProgramAddressSync([Buffer.from('global_state')], programId);
  const [treasuryPDA] = PublicKey.findProgramAddressSync([Buffer.from('treasury')], programId);
  const [jackpotPDA] = PublicKey.findProgramAddressSync([Buffer.from('jackpot')], programId);

  console.log('📍 ACCOUNT ADDRESSES:');
  console.log(`Global State: ${globalPDA.toString()}`);
  console.log(`Treasury:     ${treasuryPDA.toString()}`);
  console.log(`Jackpot:      ${jackpotPDA.toString()}\n`);

  // Check all account states
  console.log('🔎 ACCOUNT STATUS CHECK:');
  const [globalInfo, treasuryInfo, jackpotInfo] = await Promise.all([
    connection.getAccountInfo(globalPDA),
    connection.getAccountInfo(treasuryPDA),
    connection.getAccountInfo(jackpotPDA)
  ]);

  const systemProgram = new PublicKey('11111111111111111111111111111111');
  
  // Global State Analysis
  if (globalInfo) {
    const isCorrectOwner = globalInfo.owner.equals(programId);
    console.log(`✅ Global State: EXISTS`);
    console.log(`   Owner: ${globalInfo.owner.toString()} ${isCorrectOwner ? '✅' : '❌'}`);
    console.log(`   Size: ${globalInfo.data.length} bytes`);
    console.log(`   Balance: ${globalInfo.lamports / 1e9} SOL`);
    
    if (globalInfo.data.length >= 48) {
      try {
        const currentRound = globalInfo.data.readBigUInt64LE(40);
        console.log(`   Current Round: ${currentRound}`);
      } catch (e) {
        console.log(`   Current Round: Unable to read (data format issue)`);
      }
    }
  } else {
    console.log(`❌ Global State: DOES NOT EXIST`);
  }

  // Treasury Analysis
  if (treasuryInfo) {
    const isCorrectOwner = treasuryInfo.owner.equals(programId);
    console.log(`✅ Treasury: EXISTS`);
    console.log(`   Owner: ${treasuryInfo.owner.toString()} ${isCorrectOwner ? '✅' : '❌'}`);
    console.log(`   Size: ${treasuryInfo.data.length} bytes`);
    console.log(`   Balance: ${treasuryInfo.lamports / 1e9} SOL`);
  } else {
    console.log(`❌ Treasury: DOES NOT EXIST`);
  }

  // Jackpot Analysis (the problematic one)
  if (jackpotInfo) {
    const isCorrectOwner = jackpotInfo.owner.equals(programId);
    const isSystemOwned = jackpotInfo.owner.equals(systemProgram);
    console.log(`⚠️ Jackpot: EXISTS BUT PROBLEMATIC`);
    console.log(`   Owner: ${jackpotInfo.owner.toString()} ${isCorrectOwner ? '✅' : '❌'}`);
    console.log(`   Size: ${jackpotInfo.data.length} bytes`);
    console.log(`   Balance: ${jackpotInfo.lamports / 1e9} SOL`);
    
    if (isSystemOwned) {
      console.log(`   🚨 ISSUE: Account owned by System Program instead of FlipSOL program!`);
      console.log(`   📝 This means the account was created incorrectly.`);
    } else if (!isCorrectOwner) {
      console.log(`   🚨 ISSUE: Account owned by unknown program!`);
      console.log(`   📝 Expected: ${programId.toString()}`);
      console.log(`   📝 Actual: ${jackpotInfo.owner.toString()}`);
    }
  } else {
    console.log(`❌ Jackpot: DOES NOT EXIST`);
    console.log(`   🚨 This is the root cause of round settlement failures!`);
  }

  console.log('\n🎯 PROBLEM DIAGNOSIS:');
  
  if (!globalInfo || !treasuryInfo) {
    console.log('❌ CRITICAL: Global state or treasury missing');
    console.log('   This requires full program reinitialization');
    console.log('   All game state will be lost');
    console.log('\n💡 SOLUTION: Run full initialization');
    console.log('   npm run init-program');
    return;
  }

  if (!jackpotInfo) {
    console.log('✅ IDENTIFIED: Missing jackpot account');
    console.log('   This is why round settlements are failing');
    console.log('   The program\'s closeRound instruction requires jackpot account');
    
    console.log('\n🔧 ATTEMPTED FIX: Create jackpot account via program initialization...');
    
    // Try to initialize just to create the jackpot account
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

    try {
      console.log('   Attempting initialization transaction...');
      const transaction = new Transaction().add(initIx);
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      transaction.feePayer = authority.publicKey;
      transaction.sign(authority);

      const txHash = await connection.sendRawTransaction(transaction.serialize(), {
        skipPreflight: true,
        maxRetries: 1
      });

      console.log(`   Transaction sent: ${txHash}`);
      await connection.confirmTransaction(txHash, 'confirmed');
      console.log('   ✅ Transaction confirmed!');

      // Check if jackpot was created
      const newJackpotInfo = await connection.getAccountInfo(jackpotPDA);
      if (newJackpotInfo && newJackpotInfo.owner.equals(programId)) {
        console.log('\n🎉 SUCCESS! Jackpot account created!');
        console.log('   Round settlements should now work normally.');
        return;
      }

    } catch (error) {
      console.log(`   ❌ Initialization failed: ${error.message}`);
      
      if (error.message.includes('already in use')) {
        console.log('   📝 This confirms that global/treasury accounts prevent reinitialization');
      }
    }
  }

  if (jackpotInfo && !jackpotInfo.owner.equals(programId)) {
    console.log('✅ IDENTIFIED: Jackpot account has wrong owner');
    console.log('   The account exists but is owned by the wrong program');
    console.log('   This is why round settlements fail with "AccountOwnedByWrongProgram"');
  }

  console.log('\n🔧 AVAILABLE SOLUTIONS:');
  console.log('\n1. 🚀 IMMEDIATE WORKAROUND (Recommended):');
  console.log('   - Backend is already implementing jackpot error handling');
  console.log('   - Rounds will work but without jackpot functionality');
  console.log('   - Game remains playable while planning permanent fix');
  console.log('   ✅ This is the fastest way to get your game running');

  console.log('\n2. 🔄 FULL REINITIALIZATION (Nuclear option):');
  console.log('   - Transfer treasury funds to safe account');
  console.log('   - Close all program accounts (if possible)');
  console.log('   - Run fresh initialization');
  console.log('   - Restore treasury funds');
  console.log('   ⚠️ This resets all game state (round counter, etc.)');

  console.log('\n3. 🛠️ PROGRAM MODIFICATION (Long-term):');
  console.log('   - Add "repair_jackpot" or "init_jackpot_only" instruction');
  console.log('   - Allows fixing jackpot without affecting other accounts');
  console.log('   - Requires Rust development and redeployment');
  console.log('   ✅ Best long-term solution');

  console.log('\n📊 CURRENT RECOMMENDATION:');
  console.log('Based on your situation (game was working, only jackpot missing):');
  console.log('👉 Use IMMEDIATE WORKAROUND while planning permanent fix');
  console.log('👉 Backend modifications are already in progress');
  console.log('👉 This gets your game running in minutes instead of hours/days');

  console.log('\n🎮 NEXT STEPS:');
  console.log('1. Test the current backend with jackpot error handling');
  console.log('2. Verify rounds can start and settle (without jackpot)');
  console.log('3. Plan permanent fix based on your priorities');
  console.log('4. Monitor game performance and user experience');

  // Final status
  const hasCriticalAccounts = globalInfo && treasuryInfo;
  const needsJackpotFix = !jackpotInfo || !jackpotInfo.owner.equals(programId);
  
  console.log(`\n🎯 DIAGNOSIS COMPLETE:`);
  console.log(`   Core accounts: ${hasCriticalAccounts ? '✅ Healthy' : '❌ Missing'}`);
  console.log(`   Jackpot issue: ${needsJackpotFix ? '⚠️ Needs fix' : '✅ Good'}`);
  console.log(`   Game playable: ${hasCriticalAccounts ? '✅ With workaround' : '❌ Requires full init'}`);
}

fixJackpotAccount().catch(console.error);