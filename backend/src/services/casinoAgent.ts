import { Connection, Keypair, PublicKey, SystemProgram, TransactionInstruction, Transaction } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { logger } from './logger.js';
import BN from 'bn.js';
import * as crypto from 'crypto';

interface RoundState {
  roundId: number;
  headsTotal: number;
  tailsTotal: number;
  endsAt: number;
  settled: boolean;
  winningSide: number;
}

interface GlobalState {
  authority: PublicKey;
  currentRound: number;
  rakeBps: number;
  jackpotBps: number;
}

export class FlipSOLEngine {
  private connection: Connection;
  private authority: Keypair;
  private program: Program | null = null;
  private programId: PublicKey;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private lastActivity: string = 'Initializing...';
  private lastCheck: number = 0;
  private roundsProcessed: number = 0;
  private roundsClosed: number = 0;
  private errors: string[] = [];
  private eventListeners: Set<(event: any) => void> = new Set();

  private readonly ROUND_DURATION = 60000; // 60 seconds total (continuous betting, no break)
  private readonly BETTING_WINDOW = 60000; // 60 seconds betting
  private readonly CHECK_INTERVAL = 30000;  // Check every 30 seconds - less spam

  constructor(
    rpcUrl: string = 'https://api.devnet.solana.com',
    programIdString: string,
    authorityPrivateKey: string
  ) {
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.programId = new PublicKey(programIdString);

    try {
      // Parse the private key more carefully
      let privateKeyArray;
      if (typeof authorityPrivateKey === 'string') {
        privateKeyArray = JSON.parse(authorityPrivateKey);
      } else {
        privateKeyArray = authorityPrivateKey;
      }

      this.authority = Keypair.fromSecretKey(new Uint8Array(privateKeyArray));

      logger.info('🚀 FlipSOL Engine initialized', {
        programId: this.programId.toString(),
        authority: this.authority.publicKey.toString(),
        roundDuration: this.ROUND_DURATION,
        bettingWindow: this.BETTING_WINDOW,
        checkInterval: this.CHECK_INTERVAL,
      });
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to initialize Casino Agent System', {
        error: err.message,
        authorityKeyType: typeof authorityPrivateKey,
        authorityKeyLength: authorityPrivateKey?.length
      });
      throw error;
    }
  }

  private async getCurrentGlobalState(): Promise<GlobalState | null> {
    try {
      const globalPDA = PublicKey.findProgramAddressSync(
        [Buffer.from('global_state')],
        this.programId
      )[0];

      const accountInfo = await this.connection.getAccountInfo(globalPDA);
      if (!accountInfo) return null;

      // Parse global state manually with error checking
      const data = accountInfo.data;
      if (data.length < 52) {
        logger.error('Global state account data too small', { length: data.length });
        return null;
      }

      const authority = new PublicKey(data.slice(8, 40)); // Skip discriminator
      const currentRoundBN = data.readBigUInt64LE(40);
      const currentRound = Number(currentRoundBN);
      const rakeBps = data.readUInt16LE(48);
      const jackpotBps = data.readUInt16LE(50);

      return {
        authority,
        currentRound,
        rakeBps,
        jackpotBps,
      };
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to get global state', {
        error: err.message,
        stack: err.stack
      });
      return null;
    }
  }

  private async getRoundState(roundId: number): Promise<RoundState | null> {
    try {
      const roundIdBuffer = Buffer.alloc(8);
      roundIdBuffer.writeUInt32LE(roundId, 0);

      const roundPDA = PublicKey.findProgramAddressSync(
        [Buffer.from('round'), roundIdBuffer],
        this.programId
      )[0];

      const accountInfo = await this.connection.getAccountInfo(roundPDA);
      if (!accountInfo) return null;

      // Parse round state manually with error checking
      const data = accountInfo.data;
      if (data.length < 42) {
        logger.error('Round state account data too small', {
          roundId,
          length: data.length
        });
        return null;
      }

      // Parse round state data
      const parsedRoundId = Number(data.readBigUInt64LE(8)); // Skip 8-byte discriminator
      const headsTotal = Number(data.readBigUInt64LE(16));
      const tailsTotal = Number(data.readBigUInt64LE(24));
      const endsAt = Number(data.readBigInt64LE(32));
      const settled = data.readUInt8(40) === 1;
      const winningSide = data.readUInt8(41);

      return {
        roundId: parsedRoundId,
        headsTotal,
        tailsTotal,
        endsAt,
        settled,
        winningSide,
      };
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to get round state', {
        roundId,
        error: err.message
      });
      return null; // Round doesn't exist
    }
  }

  private async hasActiveDeposits(roundId: number): Promise<boolean> {
    const roundState = await this.getRoundState(roundId);
    if (!roundState) return false;

    const totalDeposits = roundState.headsTotal + roundState.tailsTotal;
    return totalDeposits > 0;
  }

  private async startNewRound(roundId: number): Promise<string | null> {
    try {
      // Check if there's already an active round before starting a new one
      const globalState = await this.getCurrentGlobalState();
      if (!globalState) {
        logger.error('Cannot start round - global state not found');
        return null;
      }

      // Check if the requested round is already the current round
      if (globalState.currentRound === roundId) {
        logger.info(`Round ${roundId} is already the current active round`);
        return null; // Already active, don't start again
      }

      // Check if there's an active unsettled round
      if (globalState.currentRound > 0) {
        const currentRoundState = await this.getRoundState(globalState.currentRound);
        if (currentRoundState && !currentRoundState.settled) {
          const totalPot = currentRoundState.headsTotal + currentRoundState.tailsTotal;
          logger.warn(`Cannot start round ${roundId} - Round ${globalState.currentRound} is still active with ${(totalPot / 1_000_000_000).toFixed(3)} SOL`);
          return null; // Don't start new round if current one is still active
        }
      }

      logger.info(`🚀 Starting round ${roundId}...`);

      const globalPDA = PublicKey.findProgramAddressSync([Buffer.from('global_state')], this.programId)[0];

      const roundIdBuffer = Buffer.alloc(8);
      roundIdBuffer.writeUInt32LE(roundId, 0);
      const roundPDA = PublicKey.findProgramAddressSync(
        [Buffer.from('round'), roundIdBuffer],
        this.programId
      )[0];

      // Create start_round instruction
      const discriminator = Buffer.from([0x90, 0x90, 0x2b, 0x07, 0xc1, 0x2a, 0xd9, 0xd7]);
      const durationBuffer = Buffer.alloc(8);
      durationBuffer.writeBigInt64LE(BigInt(60), 0); // 60 seconds betting
      const instructionData = Buffer.concat([discriminator, durationBuffer]);

      const instruction = new TransactionInstruction({
        programId: this.programId,
        keys: [
          { pubkey: globalPDA, isSigner: false, isWritable: true },
          { pubkey: roundPDA, isSigner: false, isWritable: true },
          { pubkey: this.authority.publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: instructionData,
      });

      const transaction = new Transaction().add(instruction);
      transaction.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
      transaction.feePayer = this.authority.publicKey;
      transaction.sign(this.authority);

      const txHash = await this.connection.sendRawTransaction(transaction.serialize());
      await this.connection.confirmTransaction(txHash, 'confirmed');

      logger.info(`✅ Round ${roundId} started`, { txHash });

      // Emit round started event
      this.emitEvent({
        type: 'round_started',
        roundId: roundId,
        transactionHash: txHash,
        timestamp: new Date().toISOString()
      });

      return txHash;
    } catch (error) {
      const err = error as Error;
      logger.error(`Failed to start round ${roundId}`, { error: err.message });
      return null;
    }
  }


  private async closeRound(roundId: number): Promise<string | null> {
    try {
      logger.info(`🎯 Closing round ${roundId}...`);

      const roundIdBuffer = Buffer.alloc(8);
      roundIdBuffer.writeUInt32LE(roundId, 0);
      const roundPDA = PublicKey.findProgramAddressSync(
        [Buffer.from('round'), roundIdBuffer],
        this.programId
      )[0];

      const globalPDA = PublicKey.findProgramAddressSync([Buffer.from('global_state')], this.programId)[0];
      const treasuryPDA = PublicKey.findProgramAddressSync([Buffer.from('treasury')], this.programId)[0];
      const jackpotPDA = PublicKey.findProgramAddressSync([Buffer.from('jackpot')], this.programId)[0];

      // Jackpot check removed as it's no longer used in the program
      // const jackpotInfo = await this.connection.getAccountInfo(jackpotPDA); ...

      // Close round instruction (requires treasury + jackpot for payouts)
      logger.info(`✅ Closing round - using treasury and jackpot PDAs`);

      const discriminator = Buffer.from([149, 14, 81, 88, 230, 226, 234, 37]);

      const instruction = new TransactionInstruction({
        programId: this.programId,
        keys: [
          { pubkey: globalPDA, isSigner: false, isWritable: false },
          { pubkey: roundPDA, isSigner: false, isWritable: true },
          { pubkey: treasuryPDA, isSigner: false, isWritable: true },
          // Jackpot account removed from program
          // { pubkey: jackpotPDA, isSigner: false, isWritable: true },
          { pubkey: this.authority.publicKey, isSigner: true, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: discriminator,
      });

      const transaction = new Transaction().add(instruction);
      transaction.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
      transaction.feePayer = this.authority.publicKey;
      transaction.sign(this.authority);

      // Attempt to send and confirm transaction
      // If jackpot account is wrong, this will fail with a clear error
      let txHash: string;
      try {
        txHash = await this.connection.sendRawTransaction(transaction.serialize());
        await this.connection.confirmTransaction(txHash, 'confirmed');
        logger.info(`✅ Round ${roundId} closed successfully`, { txHash });
      } catch (txError: any) {
        const errorMsg = txError?.message || String(txError);

        // Check if error is related to jackpot account
        if (errorMsg.includes('jackpot') ||
          errorMsg.includes('AccountNotInitialized') ||
          errorMsg.includes('0xbc4') ||
          errorMsg.includes('expected this account to be already initialized')) {

          logger.error(`❌ Round closing failed - jackpot account issue`, {
            jackpotPDA: jackpotPDA.toString(),
            error: errorMsg
          });
          logger.error(`💡 Run the jackpot initialize/fix script, then retry settlement.`);
          return null;
        }

        // Re-throw if it's a different error
        throw txError;
      }

      // Get the round result for logging
      const roundState = await this.getRoundState(roundId);
      const winner = roundState?.winningSide === 0 ? 'HEADS' : 'TAILS';
      const totalPot = (roundState?.headsTotal || 0) + (roundState?.tailsTotal || 0);

      logger.info(`🎉 Round ${roundId} closed - ${winner} wins!`, {
        txHash,
        winner,
        totalPot: totalPot / 1_000_000_000, // Convert to SOL
        headsTotal: (roundState?.headsTotal || 0) / 1_000_000_000,
        tailsTotal: (roundState?.tailsTotal || 0) / 1_000_000_000,
      });

      // Emit real-time settlement event immediately
      const settlementEvent = {
        type: 'round_settled',
        roundId: roundId,
        transactionHash: txHash,
        pot: totalPot / 1_000_000_000,
        headsTotal: (roundState?.headsTotal || 0) / 1_000_000_000,
        tailsTotal: (roundState?.tailsTotal || 0) / 1_000_000_000,
        winningSide: roundState?.winningSide || 0,
        winner: winner,
        timestamp: new Date().toISOString()
      };

      logger.info('🎯 Emitting SSE settlement event:', settlementEvent);
      this.emitEvent(settlementEvent);

      return txHash;
    } catch (error) {
      const err = error as Error;
      logger.error(`Failed to close round ${roundId}`, { error: err.message });
      return null;
    }
  }

  private async distributeRoundWinnings(roundId: number): Promise<void> {
    try {
      logger.info(`💰 Starting credit distribution for round ${roundId}...`);
      
      // Get round state to find winning side
      const roundState = await this.getRoundState(roundId);
      if (!roundState || !roundState.settled) {
        logger.warn(`Round ${roundId} not settled yet, skipping distribution`);
        return;
      }

      const winningSide = roundState.winningSide;
      logger.info(`🎯 Round ${roundId} winning side: ${winningSide === 0 ? 'HEADS' : 'TAILS'}`);

      // Fetch all user bets for this round
      const programAccounts = await this.connection.getProgramAccounts(this.programId, {
        filters: [
          {
            memcmp: {
              offset: 8, // Skip discriminator (8 bytes)
              bytes: Buffer.from('user_bet').slice(0, 8), // Match user_bet discriminator
            },
          },
        ],
      });

      // Filter winners (bets on winning side)
      const winners: PublicKey[] = [];
      for (const account of programAccounts) {
        try {
          // Parse user bet account (user: Pubkey, round_id: u64, side: u8, amount: u64, claimed: bool, bump: u8)
          const data = account.account.data;
          const user = new PublicKey(data.slice(8, 40)); // Skip discriminator
          const roundIdFromAccount = data.readBigUInt64LE(40);
          const side = data[48];
          
          // Check if this bet is for our round and on winning side
          if (Number(roundIdFromAccount) === roundId && side === winningSide) {
            winners.push(user);
          }
        } catch (err) {
          // Skip invalid accounts
          continue;
        }
      }

      logger.info(`💰 Found ${winners.length} winners for round ${roundId}`);

      if (winners.length === 0) {
        logger.info(`No winners found for round ${roundId}`);
        return;
      }

      // Distribute to each winner (parallel execution)
      const distributionPromises = winners.map(async (user) => {
        try {
          return await this.distributeToCredit(roundId, user);
        } catch (error) {
          const err = error as Error;
          logger.error(`Failed to distribute to user ${user.toString()}:`, err.message);
          return null;
        }
      });

      const results = await Promise.allSettled(distributionPromises);
      const succeeded = results.filter(r => r.status === 'fulfilled' && r.value !== null).length;
      const failed = results.filter(r => r.status === 'rejected' || r.value === null).length;

      logger.info(`✅ Credit distribution complete for round ${roundId}: ${succeeded} succeeded, ${failed} failed`);
    } catch (error) {
      const err = error as Error;
      logger.error(`Failed to distribute round ${roundId} winnings:`, err.message);
    }
  }

  private async distributeToCredit(roundId: number, user: PublicKey): Promise<string | null> {
    try {
      // Initialize Anchor program if not already done
      if (!this.program) {
        const wallet = {
          publicKey: this.authority.publicKey,
          signTransaction: async (tx: Transaction) => {
            tx.partialSign(this.authority);
            return tx;
          },
          signAllTransactions: async (txs: Transaction[]) => {
            return txs.map(tx => {
              tx.partialSign(this.authority);
              return tx;
            });
          },
        };
        const provider = new AnchorProvider(this.connection, wallet as any, { commitment: 'confirmed' });
        
        // Import IDL - we'll need to import it
        // For now, use raw transaction approach but we need correct discriminator
        // TODO: Import IDL and use program.methods.distributeToCredit()
      }

      const roundIdBuffer = Buffer.alloc(8);
      roundIdBuffer.writeUInt32LE(roundId, 0);
      
      const globalPDA = PublicKey.findProgramAddressSync([Buffer.from('global_state')], this.programId)[0];
      const roundPDA = PublicKey.findProgramAddressSync([Buffer.from('round'), roundIdBuffer], this.programId)[0];
      const userBetPDA = PublicKey.findProgramAddressSync(
        [Buffer.from('user_bet'), user.toBuffer(), roundIdBuffer],
        this.programId
      )[0];
      const userCreditPDA = PublicKey.findProgramAddressSync(
        [Buffer.from('user_credit'), user.toBuffer()],
        this.programId
      )[0];

      // Use Anchor's discriminator calculation
      // distribute_to_credit discriminator = first 8 bytes of sha256("global:distribute_to_credit")
      const hash = crypto.createHash('sha256').update('global:distribute_to_credit').digest();
      const discriminator = hash.slice(0, 8);

      const instruction = new TransactionInstruction({
        programId: this.programId,
        keys: [
          { pubkey: globalPDA, isSigner: false, isWritable: false },
          { pubkey: roundPDA, isSigner: false, isWritable: true },
          { pubkey: userBetPDA, isSigner: false, isWritable: true },
          { pubkey: userCreditPDA, isSigner: false, isWritable: true },
          { pubkey: this.authority.publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: discriminator,
      });

      const transaction = new Transaction().add(instruction);
      transaction.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
      transaction.feePayer = this.authority.publicKey;
      transaction.sign(this.authority);

      const txHash = await this.connection.sendRawTransaction(transaction.serialize());
      await this.connection.confirmTransaction(txHash, 'confirmed');

      logger.info(`✅ Distributed credits to user ${user.toString()} for round ${roundId}`, { txHash });
      return txHash;
    } catch (error) {
      const err = error as Error;
      logger.error(`Failed to distribute to credit for user ${user.toString()}:`, err.message);
      return null;
    }
  }

  private async processRoundCycle(): Promise<void> {
    try {
      const now = Date.now();
      const timestamp = new Date(now).toISOString();
      logger.info('🔄 processRoundCycle CALLED at', timestamp);
      this.lastCheck = now;
      this.lastActivity = '🔍 Checking global state...';

      const globalState = await this.getCurrentGlobalState();
      if (!globalState) {
        this.lastActivity = '⚠️ Program not initialized';
        logger.warn('Global state not found - program not initialized');
        return;
      }

      // Only log in development
      if (process.env.NODE_ENV !== 'production') {
        logger.info('Global state loaded:', {
          currentRound: globalState.currentRound,
          currentTimeSlot: Math.floor(now / this.ROUND_DURATION)
        });
      }

      const currentTimeRound = Math.floor(now / this.ROUND_DURATION);
      const currentProgramRound = globalState.currentRound;

      this.lastActivity = `📊 Monitoring: Program round ${currentProgramRound}, Time round ${currentTimeRound}`;

      // Check settlement for current round only
      if (currentProgramRound > 0) {
        this.lastActivity = `🕵️ Checking current round ${currentProgramRound}...`;
        const roundState = await this.getRoundState(currentProgramRound);

        // Emit round status update
        if (roundState) {
          this.emitEvent({
            type: 'round_status',
            roundId: currentProgramRound,
            settled: roundState.settled,
            headsTotal: roundState.headsTotal / 1_000_000_000,
            tailsTotal: roundState.tailsTotal / 1_000_000_000,
            totalPot: (roundState.headsTotal + roundState.tailsTotal) / 1_000_000_000,
            winningSide: roundState.winningSide,
            endsAt: roundState.endsAt,
            timestamp: new Date().toISOString()
          });
        }

        if (roundState) {
          const totalPot = roundState.headsTotal + roundState.tailsTotal;
          logger.info('🔍 Round state details:', {
            roundId: roundState.roundId,
            settled: roundState.settled,
            totalPot: totalPot / 1_000_000_000,
            headsTotal: roundState.headsTotal / 1_000_000_000,
            tailsTotal: roundState.tailsTotal / 1_000_000_000,
            endsAt: roundState.endsAt,
            endsAtDate: new Date(roundState.endsAt * 1000).toISOString(),
            winningSide: roundState.winningSide
          });

          // Skip rounds with corrupted timestamps from old program versions
          if (roundState.endsAt < 1000000000) {
            this.lastActivity = `⏭️ Round #${currentProgramRound} has invalid timestamp (${roundState.endsAt}) - skipping`;
            logger.warn(`Skipping Round #${currentProgramRound} with corrupted timestamp`);
            return; // Don't process anything else this cycle
          }

          // Check if round is expired and needs settlement
          // Use smart contract's ends_at timestamp (this is the authoritative expiration time)
          const roundExpirationTime = roundState.endsAt * 1000; // Convert to milliseconds
          const isRoundExpired = now >= roundExpirationTime;

          logger.info('🕵️ Settlement check:', {
            roundId: currentProgramRound,
            settled: roundState.settled,
            isRoundExpired,
            totalPot: totalPot / 1_000_000_000,
            roundExpirationTime,
            now,
            timeUntilExpiry: (roundExpirationTime - now) / 1000
          });

          if (!roundState.settled && isRoundExpired && totalPot > 0) {
            this.lastActivity = `🎯 SETTLING Round ${currentProgramRound} - ${(totalPot / 1_000_000_000).toFixed(3)} SOL`;
            logger.info(`🎯 SETTLING Round ${currentProgramRound} with ${(totalPot / 1_000_000_000).toFixed(3)} SOL pot`);

            const txHash = await this.closeRound(currentProgramRound);
            if (txHash) {
              this.roundsClosed++;
              this.lastActivity = `✅ SETTLED Round ${currentProgramRound} - TX: ${txHash.slice(0, 8)}...`;
              logger.info(`✅ Round ${currentProgramRound} settled - TX: ${txHash}`);

              // Settlement event is already emitted in closeRound() method
              
              // Distribute winnings to credit accounts (async, don't block)
              setTimeout(() => {
                this.distributeRoundWinnings(currentProgramRound).catch(err => {
                  logger.error(`Failed to distribute credits for round ${currentProgramRound}:`, err);
                });
              }, 3000); // Wait 3s for round_state to be confirmed
            } else {
              this.lastActivity = `❌ Failed to settle Round ${currentProgramRound}`;
              logger.error(`Failed to settle Round ${currentProgramRound}`);
            }
          } else if (!roundState.settled && totalPot === 0 && isRoundExpired) {
            this.lastActivity = `⏭️ Round ${currentProgramRound} expired with no bets - skipping settlement`;
            logger.info(`⏭️ Round ${currentProgramRound} expired with no bets (${(totalPot / 1_000_000_000).toFixed(3)} SOL) - skipping settlement`);
          } else if (!roundState.settled) {
            const timeLeft = Math.max(0, roundExpirationTime - now) / 1000;
            this.lastActivity = `⏱️ Round ${currentProgramRound} active - ${timeLeft.toFixed(0)}s left, ${(totalPot / 1_000_000_000).toFixed(3)} SOL`;
          } else {
            this.lastActivity = `✅ Round ${currentProgramRound} settled - ${(totalPot / 1_000_000_000).toFixed(3)} SOL pot`;
            logger.info(`✅ Round ${currentProgramRound} was settled with ${(totalPot / 1_000_000_000).toFixed(3)} SOL pot`);
          }
        } else {
          this.lastActivity = `❓ Round ${currentProgramRound} not found on-chain`;
        }
      } else {
        this.lastActivity = `⭐ No rounds created yet - waiting for first bet`;
      }

      // 🎰 CASINO MODE: Backend only settles rounds, doesn't create them
      // Rounds are created on-demand when users place the first bet
      // Continuous 60-second rounds with no break phase
      const currentSlot = Math.floor(now / this.ROUND_DURATION);
      const slotStartTime = currentSlot * this.ROUND_DURATION;
      const bettingEndTime = slotStartTime + this.BETTING_WINDOW;
      const slotEndTime = slotStartTime + this.ROUND_DURATION;

      const isBettingWindow = now >= slotStartTime && now < bettingEndTime;

      if (isBettingWindow) {
        if (currentProgramRound === 0) {
          this.lastActivity = `🎰 Waiting for first bet to start Round #1`;
        } else {
          const currentRoundState = await this.getRoundState(currentProgramRound);
          if (currentRoundState && !currentRoundState.settled) {
            const timeLeft = Math.ceil((bettingEndTime - now) / 1000);
            const totalPot = (currentRoundState.headsTotal + currentRoundState.tailsTotal) / 1_000_000_000;
            this.lastActivity = `🎲 Round ${currentProgramRound} active - ${timeLeft}s left to bet, ${totalPot.toFixed(3)} SOL pot`;
          } else {
            this.lastActivity = `🎰 Waiting for bets to start Round #${currentProgramRound + 1}`;
          }
        }
      } else {
        // Round ended, transitioning to next (no break phase)
        this.lastActivity = `⏳ Transitioning to next round...`;
      }

    } catch (error) {
      const err = error as Error;
      this.lastActivity = `❌ Error: ${err.message}`;
      this.errors.push(`${new Date().toISOString()}: ${err.message}`);
      if (this.errors.length > 10) this.errors = this.errors.slice(-10); // Keep last 10 errors
      logger.error('Error in round cycle processing', { error: err.message });
    }
  }

  // Event system for real-time updates
  public addListener(callback: (event: any) => void): void {
    this.eventListeners.add(callback);
  }

  public removeListener(callback: (event: any) => void): void {
    this.eventListeners.delete(callback);
  }

  private emitEvent(event: any): void {
    this.eventListeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        logger.error('Event listener error:', error);
      }
    });
  }

  public start(): void {
    if (this.isRunning) {
      logger.warn('Cron is already running');
      return;
    }

    this.isRunning = true;

    logger.info('🤖 Starting Casino Agent System...', {
      checkInterval: this.CHECK_INTERVAL,
      roundDuration: this.ROUND_DURATION,
      bettingWindow: this.BETTING_WINDOW,
    });

    // Process immediately on start
    this.processRoundCycle();

    // Set up interval for continuous monitoring
    this.intervalId = setInterval(() => {
      this.processRoundCycle();
    }, this.CHECK_INTERVAL);

    logger.info('✅ Casino Agent System started - monitoring for deposits and managing rounds');
  }

  public stop(): void {
    if (!this.isRunning) {
      logger.warn('Cron is not running');
      return;
    }

    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    logger.info('🛑 Casino Agent System stopped');
  }

  public getStatus(): object {
    return {
      isRunning: this.isRunning,
      programId: this.programId.toString(),
      authority: this.authority.publicKey.toString(),
      lastActivity: this.lastActivity,
      lastCheck: this.lastCheck,
      roundsProcessed: this.roundsProcessed,
      roundsClosed: this.roundsClosed,
      errors: this.errors,
      config: {
        roundDuration: this.ROUND_DURATION,
        bettingWindow: this.BETTING_WINDOW,
        breakDuration: this.BREAK_DURATION,
        checkInterval: this.CHECK_INTERVAL,
      }
    };
  }
}
