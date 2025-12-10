const { Keypair } = require('@solana/web3.js');

// Generate a new keypair for the cron service
const keypair = Keypair.generate();

console.log('Generated new cron authority keypair:');
console.log('Public Key:', keypair.publicKey.toString());
console.log('Private Key (for .env):', JSON.stringify([...keypair.secretKey]));
console.log('\nAdd this to your backend/.env file:');
console.log(`CRON_AUTHORITY_PRIVATE_KEY=${JSON.stringify([...keypair.secretKey])}`);
console.log('\nThis keypair needs to be funded with SOL to pay for transaction fees.');
console.log('You can fund it at: https://faucet.solana.com (for devnet)');