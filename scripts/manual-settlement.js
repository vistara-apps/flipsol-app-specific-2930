// Manual settlement script for testing
import { Connection, PublicKey, Keypair, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet } from '@project-serum/anchor';
import { getProgram } from '../src/lib/anchor.js';

const RPC_URL = 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey('BTU8kuz95iPH6XqBMp7a4VEsLhdco62s9H81Jt6G4GQL');

// This is your authority private key - you'll need to add it
// DO NOT COMMIT THIS! Use environment variables instead
const AUTHORITY_PRIVATE_KEY = process.env.AUTHORITY_PRIVATE_KEY ? JSON.parse(process.env.AUTHORITY_PRIVATE_KEY) : [];

async function settleCurrentRound() {
  try {
    console.log('🎯 Starting manual settlement...');
    
    const connection = new Connection(RPC_URL, 'confirmed');
    const authority = Keypair.fromSecretKey(new Uint8Array(AUTHORITY_PRIVATE_KEY));
    
    console.log('Authority:', authority.publicKey.toString());
    
    // Get global state to find current round
    const globalPDA = PublicKey.findProgramAddressSync(
      [Buffer.from('global_state')], 
      PROGRAM_ID
    )[0];
    
    const globalStateInfo = await connection.getAccountInfo(globalPDA);
    if (!globalStateInfo) {
      throw new Error('Global state not found');
    }
    
    // Read current round from global state
    const currentRound = Number(globalStateInfo.data.readBigUInt64LE(40));
    console.log('Current round:', currentRound);
    
    // Get round PDA for current round
    const roundIdBuffer = Buffer.alloc(8);
    roundIdBuffer.writeUInt32LE(currentRound, 0);
    const roundPDA = PublicKey.findProgramAddressSync(
      [Buffer.from('round'), roundIdBuffer],
      PROGRAM_ID
    )[0];
    
    console.log('Round PDA:', roundPDA.toString());
    
    // Check if round exists and needs settlement
    const roundInfo = await connection.getAccountInfo(roundPDA);
    if (!roundInfo) {
      console.log('❌ Round does not exist on-chain');
      return;
    }
    
    // Read round state to check if settled
    const isSettled = roundInfo.data.readUInt8(24); // settled flag at offset 24
    if (isSettled) {
      console.log('✅ Round already settled');
      return;
    }
    
    const endsAt = Number(roundInfo.data.readBigInt64LE(16)); // endsAt at offset 16
    const now = Math.floor(Date.now() / 1000);
    
    console.log('Round ends at:', new Date(endsAt * 1000));
    console.log('Current time:', new Date(now * 1000));
    
    if (now < endsAt) {
      console.log('⏰ Round still active, waiting...');
      return;
    }
    
    // Create wallet and program instance
    const wallet = {
      publicKey: authority.publicKey,
      signTransaction: async (tx) => {
        tx.partialSign(authority);
        return tx;
      },
      signAllTransactions: async (txs) => txs.map(tx => {
        tx.partialSign(authority);
        return tx;
      })
    };
    
    const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
    const program = getProgram(connection, wallet);
    
    // Get required PDAs
    const treasuryPDA = PublicKey.findProgramAddressSync([Buffer.from('treasury')], PROGRAM_ID)[0];
    const jackpotPDA = PublicKey.findProgramAddressSync([Buffer.from('jackpot')], PROGRAM_ID)[0];
    
    console.log('🎲 Settling round...');
    
    // Call close_round instruction
    const tx = await program.methods
      .closeRound()
      .accounts({
        globalState: globalPDA,
        roundState: roundPDA,
        treasury: treasuryPDA,
        jackpot: jackpotPDA,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    await connection.confirmTransaction(tx, 'confirmed');
    
    console.log('✅ Round settled successfully!');
    console.log('Transaction:', tx);
    console.log('🎉 Check the frontend - coin toss should appear!');
    
  } catch (error) {
    console.error('❌ Settlement failed:', error);
  }
}

settleCurrentRound();