import { Connection, PublicKey, Transaction, TransactionInstruction, SystemProgram, Keypair } from '@solana/web3.js';
import dotenv from 'dotenv';

dotenv.config();

async function initializeProgram() {
  console.log('🚀 Initializing FlipSOL program properly...');
  
  const PROGRAM_ID = process.env.PROGRAM_ID;
  const CRON_AUTHORITY_PRIVATE_KEY = process.env.CRON_AUTHORITY_PRIVATE_KEY;
  
  if (!PROGRAM_ID || !CRON_AUTHORITY_PRIVATE_KEY) {
    console.error('❌ Missing PROGRAM_ID or CRON_AUTHORITY_PRIVATE_KEY in .env');
    process.exit(1);
  }

  const connection = new Connection(process.env.RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
  const programId = new PublicKey(PROGRAM_ID);
  
  // Parse authority keypair
  let authorityPrivateKey;
  try {
    if (typeof CRON_AUTHORITY_PRIVATE_KEY === 'string') {
      authorityPrivateKey = JSON.parse(CRON_AUTHORITY_PRIVATE_KEY);
    } else {
      authorityPrivateKey = CRON_AUTHORITY_PRIVATE_KEY;
    }
  } catch (error) {
    console.error('❌ Invalid CRON_AUTHORITY_PRIVATE_KEY format');
    process.exit(1);
  }
  
  const authority = Keypair.fromSecretKey(new Uint8Array(authorityPrivateKey));
  console.log(`Authority: ${authority.publicKey.toString()}`);

  // Get PDAs
  const [globalPDA] = await PublicKey.findProgramAddress([Buffer.from('global_state')], programId);
  const [treasuryPDA] = await PublicKey.findProgramAddress([Buffer.from('treasury')], programId);
  const [jackpotPDA] = await PublicKey.findProgramAddress([Buffer.from('jackpot')], programId);

  console.log('PDAs:');
  console.log(`Global State: ${globalPDA.toString()}`);
  console.log(`Treasury: ${treasuryPDA.toString()}`);
  console.log(`Jackpot: ${jackpotPDA.toString()}`);

  // Check current account states
  const [globalInfo, treasuryInfo, jackpotInfo] = await Promise.all([
    connection.getAccountInfo(globalPDA),
    connection.getAccountInfo(treasuryPDA),
    connection.getAccountInfo(jackpotPDA)
  ]);

  console.log('\nCurrent account states:');
  console.log(`Global State: ${globalInfo ? `exists, owner: ${globalInfo.owner.toString()}` : 'does not exist'}`);
  console.log(`Treasury: ${treasuryInfo ? `exists, owner: ${treasuryInfo.owner.toString()}` : 'does not exist'}`);
  console.log(`Jackpot: ${jackpotInfo ? `exists, owner: ${jackpotInfo.owner.toString()}` : 'does not exist'}`);

  // Initialize the program
  console.log('\n🔧 Initializing program...');
  
  const initDiscriminator = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]); // initialize discriminator
  const rakeBps = Buffer.alloc(2);
  const jackpotBps = Buffer.alloc(2);
  rakeBps.writeUInt16LE(200, 0); // 2% rake
  jackpotBps.writeUInt16LE(100, 0); // 1% jackpot
  
  const initData = Buffer.concat([initDiscriminator, rakeBps, jackpotBps]);
  
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
  
  const transaction = new Transaction().add(instruction);
  transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  transaction.feePayer = authority.publicKey;
  transaction.sign(authority);
  
  try {
    console.log('Sending transaction...');
    const txHash = await connection.sendRawTransaction(transaction.serialize());
    console.log(`Transaction sent: ${txHash}`);
    
    console.log('Confirming transaction...');
    await connection.confirmTransaction(txHash, 'confirmed');
    
    console.log('✅ Program initialized successfully!');
    console.log(`Transaction: ${txHash}`);
    
    // Verify initialization
    console.log('\n🔍 Verifying initialization...');
    const [newGlobalInfo, newTreasuryInfo, newJackpotInfo] = await Promise.all([
      connection.getAccountInfo(globalPDA),
      connection.getAccountInfo(treasuryPDA),
      connection.getAccountInfo(jackpotPDA)
    ]);

    console.log('After initialization:');
    console.log(`Global State: ${newGlobalInfo ? `✅ exists, owner: ${newGlobalInfo.owner.toString()}` : '❌ does not exist'}`);
    console.log(`Treasury: ${newTreasuryInfo ? `✅ exists, owner: ${newTreasuryInfo.owner.toString()}` : '❌ does not exist'}`);
    console.log(`Jackpot: ${newJackpotInfo ? `✅ exists, owner: ${newJackpotInfo.owner.toString()}` : '❌ does not exist'}`);
    
    const jackpotCorrectlyOwned = newJackpotInfo && newJackpotInfo.owner.equals(programId);
    console.log(`\n🎯 Jackpot account properly owned by program: ${jackpotCorrectlyOwned ? '✅ YES' : '❌ NO'}`);
    
    if (jackpotCorrectlyOwned) {
      console.log('\n🎉 SUCCESS! Round settlements should now work properly.');
    }
    
  } catch (error) {
    console.error('❌ Failed to initialize program:', error.message);
    if (error.logs) {
      console.log('Transaction logs:', error.logs);
    }
    process.exit(1);
  }
}

initializeProgram().catch(console.error);