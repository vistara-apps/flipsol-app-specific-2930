import { Program, AnchorProvider, Wallet, BN } from '@project-serum/anchor';
import { Connection, PublicKey, Keypair, SystemProgram } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { PROGRAM_ID, RPC_URL, NETWORK } from '../config/constants';
import { IDL } from '../idl/flipsol';

export interface FlipSolProgram extends Program<any> { }

export const getProgram = (connection: Connection, wallet: Wallet): FlipSolProgram => {
  // Create new instance each time to ensure fresh provider with current wallet
  const provider = new AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  });

  if (!PROGRAM_ID) {
    throw new Error("PROGRAM_ID is not defined in constants");
  }

  // console.log("Initializing Program with ID:", PROGRAM_ID.toString());

  // For @project-serum/anchor, pass program ID as second parameter
  try {
    const program = new Program(IDL as any, PROGRAM_ID, provider);
    return program;
  } catch (error) {
    console.error('Program initialization error:', error);
    console.error('IDL:', IDL);
    console.error('PROGRAM_ID:', PROGRAM_ID);
    console.error('Provider:', provider);
    throw error;
  }
};

export const getConnection = (): Connection => {
  return new Connection(RPC_URL, 'confirmed');
};

export const getPDA = async (
  seeds: (Buffer | Uint8Array)[],
  programId: PublicKey
): Promise<[PublicKey, number]> => {
  return PublicKey.findProgramAddress(seeds, programId);
};

export const getGlobalStatePDA = async (): Promise<[PublicKey, number]> => {
  return getPDA([Buffer.from('global_state')], PROGRAM_ID);
};

export const getRoundStatePDA = async (roundId: number): Promise<[PublicKey, number]> => {
  const roundIdBuffer = Buffer.allocUnsafe(8);
  roundIdBuffer.writeBigUInt64LE(BigInt(roundId), 0);
  return PublicKey.findProgramAddress(
    [Buffer.from('round'), roundIdBuffer],
    PROGRAM_ID
  );
};

export const getUserBetPDA = async (
  user: PublicKey,
  roundId: number
): Promise<[PublicKey, number]> => {
  const roundIdBuffer = Buffer.allocUnsafe(8);
  roundIdBuffer.writeBigUInt64LE(BigInt(roundId), 0);
  return PublicKey.findProgramAddress(
    [Buffer.from('user_bet'), user.toBuffer(), roundIdBuffer],
    PROGRAM_ID
  );
};

export const getTreasuryPDA = async (): Promise<[PublicKey, number]> => {
  return getPDA([Buffer.from('treasury')], PROGRAM_ID);
};

export const getJackpotPDA = async (): Promise<[PublicKey, number]> => {
  return getPDA([Buffer.from('jackpot')], PROGRAM_ID);
};

export const LAMPORTS_PER_SOL = 1_000_000_000;

export const solToLamports = (sol: number): number => {
  return Math.floor(sol * LAMPORTS_PER_SOL);
};

export const lamportsToSol = (lamports: number): number => {
  return lamports / LAMPORTS_PER_SOL;
};

// Re-export BN for use in other files
export { BN };
