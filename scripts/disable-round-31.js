// Quick fix to stop Round #31 settlement loop
// We'll create a new round and skip the problematic one

const { Connection, PublicKey, Keypair, SystemProgram, TransactionInstruction, Transaction } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

async function forceCreateNewRound() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const programId = new PublicKey('BTU8kuz95iPH6XqBMp7a4VEsLhdco62s9H81Jt6G4GQL');
  
  // Load our authority keypair
  const keypairPath = path.join(process.env.HOME, '.config/solana/id.json');
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  const authority = Keypair.fromSecretKey(new Uint8Array(keypairData));
  
  console.log('🔧 Force creating new round to bypass Round #31...');
  
  try {
    // Use the backend API to create a new round
    const response = await fetch('http://localhost:3001/api/cron/start-round', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Successfully created new round:', result);
      console.log('🎯 This should bypass the stuck Round #31');
    } else {
      console.log('❌ Failed to create new round via API');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

forceCreateNewRound().catch(console.error);