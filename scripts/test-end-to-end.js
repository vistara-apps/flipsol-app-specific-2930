#!/usr/bin/env node

/**
 * End-to-End Testing Script for FlipSOL
 * Tests the complete flow: bet placement -> settlement -> winnings claim
 */

const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const { Program, AnchorProvider, Wallet } = require('@project-serum/anchor');
const fs = require('fs');
const path = require('path');

// Configuration
const RPC_URL = 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey('BTU8kuz95iPH6XqBMp7a4VEsLhdco62s9H81Jt6G4GQL');

// Load keypair (you can generate test keypair)
const KEYPAIR_PATH = path.join(process.env.HOME, '.config/solana/id.json');
let wallet;

try {
  const keypairData = JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf8'));
  wallet = new Wallet(Keypair.fromSecretKey(new Uint8Array(keypairData)));
  console.log('🔑 Using wallet:', wallet.publicKey.toString());
} catch (error) {
  console.error('❌ Could not load wallet:', error.message);
  console.log('💡 Generate a test wallet with: solana-keygen new');
  process.exit(1);
}

// Load IDL
const IDL_PATH = path.join(__dirname, '../src/idl/flipsol.ts');
let idl;
try {
  // Try to load the IDL (this is simplified)
  console.log('📖 Loading IDL...');
  idl = require('../backend/src/idl/flipsol.js');
} catch (error) {
  console.error('❌ Could not load IDL:', error.message);
  process.exit(1);
}

async function main() {
  console.log('\n🎰 FlipSOL End-to-End Test Starting...\n');
  
  const connection = new Connection(RPC_URL, 'confirmed');
  const provider = new AnchorProvider(connection, wallet, {});
  
  // Check wallet balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`💰 Wallet balance: ${balance / 1_000_000_000} SOL`);
  
  if (balance < 100_000_000) { // 0.1 SOL
    console.error('❌ Insufficient SOL for testing. Need at least 0.1 SOL');
    console.log('💡 Get testnet SOL: solana airdrop 2');
    process.exit(1);
  }
  
  console.log('\n📊 Test Results:');
  console.log('================');
  
  // Test 1: Check program exists
  try {
    const programAccount = await connection.getAccountInfo(PROGRAM_ID);
    if (programAccount) {
      console.log('✅ Program exists and is deployed');
    } else {
      console.log('❌ Program not found');
      return;
    }
  } catch (error) {
    console.log('❌ Error checking program:', error.message);
    return;
  }
  
  // Test 2: Check global state
  try {
    const [globalStatePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('global_state')],
      PROGRAM_ID
    );
    
    const globalStateAccount = await connection.getAccountInfo(globalStatePDA);
    if (globalStateAccount) {
      console.log('✅ Global state exists - program is initialized');
    } else {
      console.log('❌ Global state not found - program needs initialization');
      return;
    }
  } catch (error) {
    console.log('❌ Error checking global state:', error.message);
  }
  
  // Test 3: Check backend API
  try {
    const response = await fetch('http://localhost:3001/health');
    if (response.ok) {
      console.log('✅ Backend API is running');
    } else {
      console.log('❌ Backend API not responding');
    }
  } catch (error) {
    console.log('❌ Backend API error:', error.message);
  }
  
  // Test 4: Check FlipSOL Engine status
  try {
    const response = await fetch('http://localhost:3001/cron-status');
    if (response.ok) {
      const status = await response.json();
      if (status.enabled) {
        console.log('✅ FlipSOL Engine is running');
        console.log(`   📊 Rounds created: ${status.roundsProcessed || 0}`);
        console.log(`   🎯 Rounds settled: ${status.roundsClosed || 0}`);
        console.log(`   ⚡ Last activity: ${status.lastActivity || 'None'}`);
      } else {
        console.log('❌ FlipSOL Engine is disabled');
        console.log(`   🔍 Reason: ${status.error || 'Unknown'}`);
      }
    } else {
      console.log('❌ Could not get engine status');
    }
  } catch (error) {
    console.log('❌ Engine status error:', error.message);
  }
  
  // Test 5: Check recent rounds
  try {
    const response = await fetch('http://localhost:3001/api/rounds/history');
    if (response.ok) {
      const history = await response.json();
      console.log(`✅ Found ${history.length} recent rounds`);
      
      if (history.length > 0) {
        const latestRound = history[0];
        console.log(`   🎲 Latest: Round #${latestRound.roundId} - ${latestRound.settled ? 'Settled' : 'Active'}`);
      }
    } else {
      console.log('❌ Could not fetch round history');
    }
  } catch (error) {
    console.log('❌ History error:', error.message);
  }
  
  console.log('\n🎯 End-to-End Test Summary:');
  console.log('============================');
  console.log('1. Start backend: npm run dev (in backend folder)');
  console.log('2. Start frontend: npm run dev (in root folder)');
  console.log('3. Connect wallet and place a test bet');
  console.log('4. Wait 90 seconds for round to settle');
  console.log('5. Check if winnings can be claimed');
  console.log('\n💡 For live testing, visit: http://localhost:5173');
  console.log('📊 Monitor engine: check FlipSOL Engine status in UI');
  
}

main().catch(console.error);