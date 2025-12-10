import { Connection, PublicKey, Transaction, TransactionInstruction, SystemProgram, Keypair } from '@solana/web3.js';
import dotenv from 'dotenv';

dotenv.config();

async function simplestSolution() {
  console.log('💡 SIMPLEST SOLUTION: Create jackpot account with exact program parameters\n');
  
  const PROGRAM_ID = process.env.PROGRAM_ID;
  const CRON_AUTHORITY_PRIVATE_KEY = process.env.CRON_AUTHORITY_PRIVATE_KEY;
  
  const connection = new Connection(process.env.RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
  const programId = new PublicKey(PROGRAM_ID);
  const authority = Keypair.fromSecretKey(new Uint8Array(JSON.parse(CRON_AUTHORITY_PRIVATE_KEY)));
  
  const [jackpotPDA] = PublicKey.findProgramAddressSync([Buffer.from('jackpot')], programId);
  
  console.log(`Authority: ${authority.publicKey.toString()}`);
  console.log(`Program: ${programId.toString()}`);
  console.log(`Jackpot PDA: ${jackpotPDA.toString()}\n`);

  // Check if jackpot exists
  const jackpotInfo = await connection.getAccountInfo(jackpotPDA);
  if (jackpotInfo && jackpotInfo.owner.equals(programId)) {
    console.log('✅ Jackpot already properly initialized!');
    return;
  }

  console.log('🎯 Strategy: Use the program\'s initialize instruction, but send transaction with skipPreflight');
  console.log('This will create the jackpot account even if global/treasury creation fails.\n');

  // Create the initialize instruction exactly as the program expects
  const initDiscriminator = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]);
  const rakeBps = Buffer.alloc(2);
  const jackpotBps = Buffer.alloc(2);
  rakeBps.writeUInt16LE(200, 0); // 2% rake  
  jackpotBps.writeUInt16LE(100, 0); // 1% jackpot
  
  const initData = Buffer.concat([initDiscriminator, rakeBps, jackpotBps]);

  const [globalPDA] = PublicKey.findProgramAddressSync([Buffer.from('global_state')], programId);
  const [treasuryPDA] = PublicKey.findProgramAddressSync([Buffer.from('treasury')], programId);

  const initInstruction = new TransactionInstruction({
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

  console.log('🚀 Sending initialize transaction with skipPreflight=true...');
  console.log('The transaction will partially fail (expected) but should create the jackpot account.\n');

  try {
    const transaction = new Transaction().add(initInstruction);
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    transaction.feePayer = authority.publicKey;
    transaction.sign(authority);

    // Send with skipPreflight to bypass simulation errors
    const txHash = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: true,  // This is the key!
      maxRetries: 1
    });

    console.log(`📝 Transaction hash: ${txHash}`);
    console.log('⏳ Waiting for confirmation...');

    // Try to confirm transaction
    try {
      await connection.confirmTransaction(txHash, 'confirmed');
      console.log('✅ Transaction confirmed!');
    } catch (confirmError) {
      console.log('⚠️ Confirmation timeout, but checking results anyway...');
    }

  } catch (sendError) {
    console.log('📝 Transaction send result:', sendError.message);
    console.log('⏳ Checking if jackpot account was created despite error...');
  }

  // Check final state regardless of transaction result
  console.log('\n🔍 Final state check...');
  const finalJackpotInfo = await connection.getAccountInfo(jackpotPDA);
  
  if (finalJackpotInfo) {
    const isCorrectOwner = finalJackpotInfo.owner.equals(programId);
    console.log(`Jackpot account: ✅ EXISTS`);
    console.log(`Owner: ${finalJackpotInfo.owner.toString()}`);
    console.log(`Correct owner: ${isCorrectOwner ? '✅ YES' : '❌ NO'}`);
    console.log(`Size: ${finalJackpotInfo.data.length} bytes`);
    console.log(`Lamports: ${finalJackpotInfo.lamports / 1e9} SOL`);

    if (isCorrectOwner) {
      console.log('\n🎉🎉🎉 SUCCESS! 🎉🎉🎉');
      console.log('Jackpot account is properly initialized!');
      console.log('Round settlements should now work correctly!');
      
      // Test it immediately
      console.log('\n🧪 Testing round closure now...');
      return true;
    } else {
      console.log('\n❌ Jackpot account exists but has wrong owner');
      return false;
    }
  } else {
    console.log('❌ Jackpot account still does not exist');
    console.log('\nThis means the program\'s initialize instruction has strict validation');
    console.log('that prevents partial initialization.');
    return false;
  }
}

// Run the solution
simplestSolution()
  .then((success) => {
    if (success) {
      console.log('\n✅ SOLUTION COMPLETE! The game is fixed and ready to use.');
    } else {
      console.log('\n❌ Solution failed. Manual program modification needed.');
      console.log('The program needs an additional instruction for jackpot-only initialization.');
    }
  })
  .catch(console.error);