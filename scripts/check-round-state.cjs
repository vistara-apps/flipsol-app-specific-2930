const { Connection, PublicKey } = require('@solana/web3.js');

async function checkRoundState() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const programId = new PublicKey('BTU8kuz95iPH6XqBMp7a4VEsLhdco62s9H81Jt6G4GQL');
  
  // Check Round #31
  const roundId = 31;
  const [roundPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('round'), Buffer.from([roundId, 0, 0, 0, 0, 0, 0, 0])],
    programId
  );
  
  console.log('Round #31 PDA:', roundPDA.toString());
  
  try {
    const roundAccount = await connection.getAccountInfo(roundPDA);
    if (!roundAccount) {
      console.log('Round #31 does not exist');
      return;
    }
    
    console.log('Round #31 exists with', roundAccount.lamports / 1_000_000_000, 'SOL');
    console.log('Account data length:', roundAccount.data.length);
    
    // Try to read the round state
    if (roundAccount.data.length >= 32) {
      const data = roundAccount.data;
      const headsTotal = data.readBigUInt64LE(8);
      const tailsTotal = data.readBigUInt64LE(16); 
      const endsAt = data.readBigUInt64LE(24);
      const settled = data[32] === 1;
      
      console.log('Round #31 state:');
      console.log('- Heads total:', Number(headsTotal) / 1_000_000_000, 'SOL');
      console.log('- Tails total:', Number(tailsTotal) / 1_000_000_000, 'SOL');
      console.log('- Ends at:', new Date(Number(endsAt) * 1000));
      console.log('- Settled:', settled);
      console.log('- Current time:', new Date());
      
      if (!settled && Date.now() > Number(endsAt) * 1000) {
        console.log('⚠️ Round is EXPIRED and UNSETTLED - this is causing the settlement loop');
      }
    }
  } catch (error) {
    console.error('Error checking round state:', error);
  }
}

checkRoundState().catch(console.error);