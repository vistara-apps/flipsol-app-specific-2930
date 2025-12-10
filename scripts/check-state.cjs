const { Connection, PublicKey } = require('@solana/web3.js');

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const programId = new PublicKey('BTU8kuz95iPH6XqBMp7a4VEsLhdco62s9H81Jt6G4GQL');

async function checkState() {
  console.log('🔍 Checking FlipSOL State...\n');
  
  const [globalPDA] = PublicKey.findProgramAddressSync([Buffer.from('global_state')], programId);
  const account = await connection.getAccountInfo(globalPDA);
  if (!account) {
    console.log('❌ Program not initialized');
    return;
  }
  
  const currentRound = Number(account.data.readBigUInt64LE(40));
  console.log('📊 Current round on-chain:', currentRound);
  
  // Check treasury and jackpot
  const [treasuryPDA] = PublicKey.findProgramAddressSync([Buffer.from('treasury')], programId);
  const [jackpotPDA] = PublicKey.findProgramAddressSync([Buffer.from('jackpot')], programId);
  
  const treasuryAccount = await connection.getAccountInfo(treasuryPDA);
  const jackpotAccount = await connection.getAccountInfo(jackpotPDA);
  
  console.log('💰 Treasury balance:', treasuryAccount ? (treasuryAccount.lamports / 1e9).toFixed(4) : '0', 'SOL');
  console.log('🎰 Jackpot balance:', jackpotAccount ? (jackpotAccount.lamports / 1e9).toFixed(4) : '0', 'SOL');
  
  // Check if current round exists
  if (currentRound > 0) {
    console.log('\n📍 Checking Round', currentRound, '...');
    
    const roundIdBuffer = Buffer.alloc(8);
    roundIdBuffer.writeUInt32LE(currentRound, 0);
    const [roundPDA] = PublicKey.findProgramAddressSync([Buffer.from('round'), roundIdBuffer], programId);
    const roundAccount = await connection.getAccountInfo(roundPDA);
    
    if (roundAccount) {
      const data = roundAccount.data;
      const endsAt = Number(data.readBigInt64LE(32));
      const settled = data[40] === 1;
      const winningSide = data[41];
      const headsTotal = Number(data.readBigUInt64LE(16));
      const tailsTotal = Number(data.readBigUInt64LE(24));
      
      console.log('  Status:', settled ? '✅ SETTLED' : '🎲 ACTIVE');
      console.log('  Ends at:', new Date(endsAt * 1000).toISOString());
      console.log('  HEADS:', (headsTotal / 1e9).toFixed(3), 'SOL');
      console.log('  TAILS:', (tailsTotal / 1e9).toFixed(3), 'SOL');
      console.log('  Total pot:', ((headsTotal + tailsTotal) / 1e9).toFixed(3), 'SOL');
      
      if (settled) {
        console.log('  Winner:', winningSide === 0 ? '👑 HEADS' : '👾 TAILS');
      } else if (Date.now() > endsAt * 1000) {
        console.log('  ⚠️ Round expired but not settled!');
        console.log('  ⏰ Expired', Math.floor((Date.now() - endsAt * 1000) / 1000), 'seconds ago');
      } else {
        console.log('  ⏱️ Time left:', Math.floor((endsAt * 1000 - Date.now()) / 1000), 'seconds');
      }
      
      console.log('  Balance:', (roundAccount.lamports / 1e9).toFixed(6), 'SOL');
    } else {
      console.log('  ❌ Round account not found');
    }
  } else {
    console.log('\n⭐ No rounds created yet');
  }
  
  // Check last few rounds
  if (currentRound > 1) {
    console.log('\n📜 Recent Rounds:');
    for (let i = Math.max(1, currentRound - 4); i <= currentRound; i++) {
      const roundIdBuffer = Buffer.alloc(8);
      roundIdBuffer.writeUInt32LE(i, 0);
      const [roundPDA] = PublicKey.findProgramAddressSync([Buffer.from('round'), roundIdBuffer], programId);
      const roundAccount = await connection.getAccountInfo(roundPDA);
      
      if (roundAccount) {
        const data = roundAccount.data;
        const settled = data[40] === 1;
        const winningSide = data[41];
        const headsTotal = Number(data.readBigUInt64LE(16));
        const tailsTotal = Number(data.readBigUInt64LE(24));
        const totalPot = (headsTotal + tailsTotal) / 1e9;
        
        console.log(`  Round #${i}: ${settled ? '✅' : '🎲'} ${totalPot.toFixed(3)} SOL ${settled ? (winningSide === 0 ? '→ HEADS' : '→ TAILS') : ''}`);
      }
    }
  }
}

checkState().catch(console.error);