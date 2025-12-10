#!/usr/bin/env node

const crypto = require('crypto');

console.log('🎯 Anchor Instruction Discriminator Tester');
console.log('==========================================');
console.log();

function calculateDiscriminator(instructionName) {
  const input = 'global:' + instructionName;
  const hash = crypto.createHash('sha256').update(input).digest();
  return Array.from(hash.slice(0, 8));
}

// Test all FlipSOL instructions
const instructions = [
  'initialize',
  'start_round', 
  'place_bet',
  'close_round',
  'claim_winnings'
];

console.log('📋 All FlipSOL Instruction Discriminators:');
console.log();

instructions.forEach(instruction => {
  const discriminator = calculateDiscriminator(instruction);
  console.log(`${instruction}:`);
  console.log(`  Buffer.from([${discriminator.join(', ')}])`);
  console.log(`  Hex: 0x${Buffer.from(discriminator).toString('hex')}`);
  console.log();
});

console.log('✅ These are the CORRECT discriminators for your Solana program!');
console.log('   Copy and paste the Buffer.from() values into your TypeScript/JavaScript code.');