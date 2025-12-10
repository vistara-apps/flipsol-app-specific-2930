import { PublicKey } from '@solana/web3.js';

// Program ID - Deployed to devnet
export const PROGRAM_ID = new PublicKey('BTU8kuz95iPH6XqBMp7a4VEsLhdco62s9H81Jt6G4GQL');

// Network configuration
export const NETWORK = import.meta.env.VITE_SOLANA_NETWORK || 'devnet';
export const RPC_URL = import.meta.env.VITE_RPC_URL || 'https://api.devnet.solana.com';

// Default round duration (seconds)
export const DEFAULT_ROUND_DURATION = 60;

// API endpoints
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// PDA seeds
export const GLOBAL_STATE_SEED = 'global_state';
export const TREASURY_SEED = 'treasury';
export const JACKPOT_SEED = 'jackpot';
export const ROUND_SEED = 'round';
export const USER_BET_SEED = 'user_bet';
