// Simple round starter using raw Solana transactions
const { Connection, Keypair, PublicKey, TransactionInstruction, Transaction, SystemProgram } = require('@solana/web3.js');

async function startRound() {
  try {
    const RPC_URL = 'https://api.devnet.solana.com';
    const PROGRAM_ID = new PublicKey('BTU8kuz95iPH6XqBMp7a4VEsLhdco62s9H81Jt6G4GQL');
    
    // Load authority keypair
    const PRIVATE_KEY = [155,244,131,214,15,28,141,123,91,249,176,139,147,131,164,61,15,185,36,74,24,63,211,194,47,253,35,79,171,105,132,92,107,197,239,176,33,94,114,187,227,254,168,25,133,152,132,100,139,160,132,237,125,32,163,151,239,196,110,116,176,142,10,48];
    
    const connection = new Connection(RPC_URL, 'confirmed');
    const authority = Keypair.fromSecretKey(new Uint8Array(PRIVATE_KEY));
    
    console.log('Authority:', authority.publicKey.toString());
    console.log('Balance:', await connection.getBalance(authority.publicKey) / 1e9, 'SOL');
    
    // Create PDAs
    const [globalStatePDA] = PublicKey.findProgramAddressSync([Buffer.from('global_state')], PROGRAM_ID);
    
    console.log('Global State PDA:', globalStatePDA.toString());
    
    // Try to fetch global state to see current round
    try {
      const globalStateInfo = await connection.getAccountInfo(globalStatePDA);
      if (globalStateInfo) {
        console.log('Global state exists, data length:', globalStateInfo.data.length);
        
        // Authority is stored at offset 8-40 (32 bytes)
        const authorityBytes = globalStateInfo.data.slice(8, 40);
        const storedAuthority = new PublicKey(authorityBytes);
        console.log('Stored authority:', storedAuthority.toString());
        console.log('Our authority:   ', authority.publicKey.toString());
        console.log('Authorities match:', storedAuthority.equals(authority.publicKey));
        
        // The current round is stored at offset 40 (after authority pubkey)
        const currentRound = globalStateInfo.data.readBigUInt64LE(40);
        console.log('Current round:', currentRound.toString());
        
        const nextRound = currentRound + 1n;
        console.log('Next round will be:', nextRound.toString());
        
        return {
          success: true,
          currentRound: currentRound.toString(),
          nextRound: nextRound.toString(),
          globalStatePDA: globalStatePDA.toString(),
          authority: authority.publicKey.toString()
        };
      } else {
        console.log('Global state does not exist - program not initialized');
        return { error: 'Program not initialized' };
      }
    } catch (err) {
      console.error('Error fetching global state:', err);
      return { error: err.message };
    }
    
  } catch (err) {
    console.error('Error:', err);
    return { error: err.message };
  }
}

// Export for use in other files
module.exports = { startRound };

// Run if called directly
if (require.main === module) {
  startRound().then(result => {
    console.log('Result:', JSON.stringify(result, null, 2));
  });
}