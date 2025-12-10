import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useConnection, useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { Program } from '@project-serum/anchor';
import { useReferral } from './ReferralContext';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useSSE } from '../hooks/useSSE';
import {
  getProgram,
  getGlobalStatePDA,
  getRoundStatePDA,
  getUserBetPDA,
  getTreasuryPDA,
  getJackpotPDA,
  solToLamports,
  lamportsToSol,
  LAMPORTS_PER_SOL,
  BN
} from '../lib/anchor';
import { DEFAULT_ROUND_DURATION, API_BASE_URL, PROGRAM_ID } from '../config/constants';
import axios from 'axios';

const GameContext = createContext(null);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
};

export const GameProvider = ({ children }) => {
  const { connection } = useConnection();
  const walletAdapter = useSolanaWallet();
  const { publicKey, connected, signTransaction, signAllTransactions } = walletAdapter;
  const { referredBy, recordReferral } = useReferral();

  // Convex mutations for tracking game data
  const recordBet = useMutation(api.gameData.recordBet);
  const recordRoundSettlement = useMutation(api.gameData.recordRoundSettlement);

  const [program, setProgram] = useState(null);
  const [globalState, setGlobalState] = useState(null);
  const [currentRound, setCurrentRound] = useState(null);
  const [roundState, setRoundState] = useState(null);
  const [userBet, setUserBet] = useState(null);
  const [jackpotPool, setJackpotPool] = useState(0);
  const [treasuryBalance, setTreasuryBalance] = useState(0);
  const [history, setHistory] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastBetTx, setLastBetTx] = useState(null);
  const [lastClaimTx, setLastClaimTx] = useState(null);
  const [usersOnline, setUsersOnline] = useState(0);

  // Initialize SSE connection for real-time updates
  const { isConnected: sseConnected, addEventListener: addSSEListener } = useSSE();

  // Initialize program
  useEffect(() => {
    // Only initialize if connection exists and wallet is connected
    if (!connection) {
      console.log('No connection, skipping program initialization');
      return;
    }

    if (!connected || !publicKey) {
      console.log('Wallet not connected, skipping program initialization');
      setProgram(null);
      return;
    }

    // Only initialize if we have the required wallet methods
    if (!signTransaction || !signAllTransactions) {
      console.log('Wallet methods not available yet, skipping program initialization');
      return;
    }

    try {
      // Create Anchor-compatible wallet object
      // Anchor Wallet interface requires: publicKey, signTransaction, signAllTransactions
      const anchorWallet = {
        publicKey: publicKey,
        signTransaction: signTransaction,
        signAllTransactions: signAllTransactions,
      };

      console.log('Initializing program with:', {
        programId: PROGRAM_ID.toString(),
        wallet: publicKey.toString(),
      });

      const programInstance = getProgram(connection, anchorWallet);
      setProgram(programInstance);
      console.log('✅ Program initialized successfully:', programInstance.programId.toString());
    } catch (err) {
      console.error('❌ Error initializing program:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        connection: !!connection,
        publicKey: publicKey?.toString(),
        hasSignTransaction: !!signTransaction,
        hasSignAllTransactions: !!signAllTransactions,
      });
      setError(`Failed to initialize program: ${err.message}`);
    }
  }, [connection, connected, publicKey, signTransaction, signAllTransactions, walletAdapter]);

  // Fetch global state
  const fetchGlobalState = useCallback(async () => {
    if (!program) {
      console.log('No program instance, skipping global state fetch');
      return;
    }

    try {
      console.log('Fetching global state...');
      const [globalStatePDA] = await getGlobalStatePDA();
      console.log('GlobalState PDA:', globalStatePDA.toString());

      const state = await program.account.globalState.fetch(globalStatePDA);
      const roundId = state.currentRound.toNumber();

      console.log('GlobalState fetched:', {
        authority: state.authority.toString(),
        currentRound: roundId,
        rakeBps: state.rakeBps,
        jackpotBps: state.jackpotBps,
      });

      setGlobalState({
        authority: state.authority.toString(),
        currentRound: roundId,
        rakeBps: state.rakeBps,
        jackpotBps: state.jackpotBps,
      });
      setCurrentRound(roundId);

      // If roundId is 0, no rounds have been started yet
      if (roundId === 0) {
        console.log('No rounds started yet (currentRound = 0)');
        setRoundState(null);
      }
    } catch (err) {
      console.error('Error fetching global state:', err);
      // Global state might not exist yet - set to null to show "No Active Round"
      setGlobalState(null);
      setCurrentRound(null);
    }
  }, [program]);

  // Fetch round state
  const fetchRoundState = useCallback(async (roundId) => {
    if (!program || !roundId) return null;

    try {
      const [roundStatePDA] = await getRoundStatePDA(roundId);
      const state = await program.account.roundState.fetch(roundStatePDA);

      const now = Math.floor(Date.now() / 1000);
      const endsAt = state.endsAt.toNumber();
      const remaining = Math.max(0, endsAt - now);

      const roundStateData = {
        roundId: state.roundId.toNumber(),
        headsTotal: state.headsTotal.toNumber(),
        tailsTotal: state.tailsTotal.toNumber(),
        endsAt: endsAt * 1000, // Convert to milliseconds
        settled: state.settled,
        winningSide: state.winningSide,
      };

      setRoundState(current => {
        // Prevent reverting settled state due to lagging polling or simulation
        if (current &&
          current.roundId === roundStateData.roundId &&
          current.settled &&
          !roundStateData.settled) {
          console.log('🛡️ Preserving settled state (ignoring lagging poll)');
          return current;
        }
        return roundStateData;
      });
      setTimeLeft(remaining);

      // Auto-settle if expired
      if (remaining === 0 && !state.settled) {
        // Round should be settled by admin, but we can check
      }

      return roundStateData;
    } catch (err) {
      console.error('Error fetching round state:', err);
      setRoundState(null);
      return null;
    }
  }, [program]);

  // Fetch user bet
  const fetchUserBet = useCallback(async (roundId) => {
    if (!program || !publicKey || !roundId) {
      setUserBet(null);
      return;
    }

    try {
      const [userBetPDA] = await getUserBetPDA(publicKey, roundId);
      const bet = await program.account.userBet.fetch(userBetPDA);

      // CRITICAL: Only set bet if it's for the current active round
      const activeRoundId = globalState?.currentRound || currentRound;
      if (roundId !== activeRoundId) {
        console.log(`🧹 Not setting bet from old round ${roundId} (current: ${activeRoundId})`);
        setUserBet(null);
        return;
      }; console.log('✅ User bet fetched:', bet);

      setUserBet({
        side: bet.side,
        amount: lamportsToSol(bet.amount.toNumber()),
        claimed: bet.claimed,
        roundId: roundId,
      });
    } catch (err) {
      // User hasn't bet yet
      setUserBet(null);
    }
  }, [program, publicKey, globalState, currentRound]);

  // Fetch jackpot and treasury balances
  const fetchBalances = useCallback(async () => {
    if (!connection) return;

    try {
      const [jackpotPDA] = await getJackpotPDA();
      const [treasuryPDA] = await getTreasuryPDA();

      const jackpotBalance = await connection.getBalance(jackpotPDA);
      const treasuryBalance = await connection.getBalance(treasuryPDA);

      setJackpotPool(lamportsToSol(jackpotBalance));
      setTreasuryBalance(lamportsToSol(treasuryBalance));
    } catch (err) {
      console.error('Error fetching balances:', err);
    }
  }, [connection]);

  // Fetch history from API
  const fetchHistory = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/rounds/history`);
      const rawHistory = response.data || [];

      // Parse numeric strings to actual numbers for frontend compatibility
      const parsedHistory = rawHistory.map(round => ({
        ...round,
        roundId: round.roundId.toString(),
        headsTotal: parseFloat(round.headsTotal) || 0,
        tailsTotal: parseFloat(round.tailsTotal) || 0,
        totalPot: parseFloat(round.totalPot) || 0
      }));

      setHistory(parsedHistory);
    } catch (err) {
      console.error('Error fetching history:', err);
      setHistory([]);
    }
  }, []);

  // Fetch leaderboard from API
  const fetchLeaderboard = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/leaderboard`);
      setLeaderboard(response.data || []);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setLeaderboard([]);
    }
  }, []);

  // Load initial data
  useEffect(() => {
    if (program) {
      const loadData = async () => {
        try {
          await fetchGlobalState();
          await fetchBalances();
          await fetchHistory();
          await fetchLeaderboard();
        } catch (err) {
          console.error('Error loading initial data:', err);
        }
      };
      loadData();
    }
  }, [program, fetchGlobalState, fetchBalances, fetchHistory, fetchLeaderboard]);

  // Load current round data
  useEffect(() => {
    if (currentRound !== null && currentRound > 0) {
      fetchRoundState(currentRound);
      if (publicKey) {
        fetchUserBet(currentRound);
      }
    } else {
      // No rounds started yet
      setRoundState(null);
      setUserBet(null);
    }
  }, [currentRound, publicKey, fetchRoundState, fetchUserBet]);

  // AGGRESSIVE: Clear stale bet state when round state changes
  useEffect(() => {
    if (roundState && userBet) {
      // Clear bet if it's from a different round
      if (userBet.roundId !== roundState.roundId) {
        console.log(`🧹 Clearing stale bet from round ${userBet.roundId} (current: ${roundState.roundId})`);
        setUserBet(null);
      }
      // Clear bet if it's from a settled round
      else if (roundState.settled && !userBet.claimed) {
        console.log(`🧹 Round ${roundState.roundId} is settled, keeping unclaimed bet for claim`);
      }
    }
  }, [roundState?.roundId, roundState?.settled, userBet?.roundId]);

  // Timer countdown
  useEffect(() => {
    if (!roundState || roundState.settled) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((roundState.endsAt - Date.now()) / 1000));
      setTimeLeft(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [roundState]);

  // Get current round info based on casino timing (60s betting + 60s break)
  const getCurrentRoundInfo = useCallback(() => {
    const now = Date.now();
    const ROUND_DURATION = 120000; // 120 seconds total
    const BETTING_WINDOW = 60000; // 60 seconds betting
    const BREAK_DURATION = 60000; // 60 seconds break

    // Calculate current time-based round (matches backend exactly)
    const currentTimeRound = Math.floor(now / ROUND_DURATION);
    const roundStartTime = currentTimeRound * ROUND_DURATION;
    const bettingEndTime = roundStartTime + BETTING_WINDOW;
    const roundEndTime = roundStartTime + ROUND_DURATION;

    const timeLeftTotal = Math.max(0, roundEndTime - now) / 1000;
    const timeLeftToBet = Math.max(0, bettingEndTime - now) / 1000;
    const isBettingPhase = now >= roundStartTime && now < bettingEndTime;
    const isBreakPhase = now >= bettingEndTime && now < roundEndTime;
    const nextRoundStartsIn = Math.max(0, roundEndTime - now) / 1000;

    return {
      currentRoundId: currentTimeRound,
      roundStartTime,
      roundEndTime,
      bettingEndTime,
      timeLeftTotal,
      timeLeftToBet,
      isBettingPhase,
      isBreakPhase,
      nextRoundStartsIn: isBreakPhase ? nextRoundStartsIn : 0,
      bettingOpen: isBettingPhase,
      phase: isBettingPhase ? 'betting' : isBreakPhase ? 'break' : 'waiting',
    };
  }, []);

  // Auto-create round state on first bet (continuous time-based rounds)
  const placeBet = useCallback(async (side, amount) => {
    if (!program || !publicKey) {
      throw new Error('Wallet not connected');
    }

    if (!globalState) {
      throw new Error('Program not initialized');
    }

    setLoading(true);
    setError(null);

    try {
      // Get current time-based round info
      const roundInfo = getCurrentRoundInfo();

      // Check if betting window is still open (60-second window)
      if (!roundInfo.bettingOpen || !roundInfo.isBettingPhase) {
        if (roundInfo.isBreakPhase) {
          throw new Error(`Casino break time! Next betting round starts in ${Math.ceil(roundInfo.nextRoundStartsIn)}s`);
        } else {
          throw new Error('Betting window closed for this round. Next round starting soon!');
        }
      }

      const [globalStatePDA] = await getGlobalStatePDA();

      // Use program's sequential round system, but create new rounds as needed
      let programRoundId = globalState.currentRound || 0;

      // Check if we need to create a new program round
      let needsNewRound = false;
      if (programRoundId === 0) {
        needsNewRound = true;
      } else {
        // Check if current program round is expired
        try {
          const [currentRoundPDA] = await getRoundStatePDA(programRoundId);
          const currentRoundState = await program.account.roundState.fetch(currentRoundPDA);
          const now = Math.floor(Date.now() / 1000);
          if (now >= currentRoundState.endsAt.toNumber() || currentRoundState.settled) {
            needsNewRound = true;
          }
        } catch (err) {
          // Round doesn't exist, need new one
          needsNewRound = true;
        }
      }

      // Start new program round if needed (via backend cron service)
      if (needsNewRound) {
        console.log('🔄 Requesting new round from backend...');

        try {
          const response = await fetch(`${API_BASE_URL}/cron/start-round`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error || 'Failed to start new round');
          }

          console.log('✅ Backend started new round:', result);

          // Refresh global state to get updated currentRound
          await fetchGlobalState();

          programRoundId = result.roundId || (globalState.currentRound + 1);
        } catch (err) {
          console.error('❌ Backend round creation failed:', err);
          throw new Error('Backend cron service not running. Start the backend server first.');
        }
      }

      // Now place the bet on the active program round
      const [roundStatePDA] = await getRoundStatePDA(programRoundId);
      const [userBetPDA] = await getUserBetPDA(publicKey, programRoundId);

      const amountLamports = solToLamports(amount);
      const tx = await program.methods
        .placeBet(side, new BN(amountLamports))
        .accounts({
          globalState: globalStatePDA,
          roundState: roundStatePDA,
          userBet: userBetPDA,
          user: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await connection.confirmTransaction(tx, 'confirmed');
      console.log('✅ Bet placed:', tx);

      // Store transaction hash for display
      setLastBetTx({
        txHash: tx,
        roundId: programRoundId,
        side,
        amount,
        timestamp: Date.now(),
      });

      // Record bet in Convex for analytics
      try {
        await recordBet({
          userWallet: publicKey.toString(),
          roundId: programRoundId,
          side,
          amount,
          txSignature: tx,
          referrerWallet: referredBy || undefined,
        });
      } catch (error) {
        console.error('Failed to record bet in Convex:', error);
      }

      // Record referral if user was referred
      if (referredBy && recordReferral) {
        await recordReferral(amount, referredBy);
      }

      // Refresh data
      await fetchRoundState(programRoundId);
      await fetchUserBet(programRoundId);
      await fetchBalances();

      return tx;
    } catch (err) {
      console.error('Error placing bet:', err);
      setError(err.message || 'Failed to place bet');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [program, publicKey, globalState, connection, fetchRoundState, fetchUserBet, fetchBalances, fetchGlobalState, getCurrentRoundInfo]);

  // SSE Event Listeners for real-time updates
  useEffect(() => {
    if (!addSSEListener) return;

    // Listen for round settlements
    const unsubscribeSettlement = addSSEListener('round_settled', (event) => {
      // console.log('🎯 FRONTEND RECEIVED SETTLEMENT EVENT:', event);

      setLastClaimTx(event.transactionHash);

      // Trigger coin toss animation with complete round data
      if (event.pot > 0) {
        // console.log('🎰 TRIGGERING COIN TOSS - Updating roundState with pot:', event.pot);
        // Update round state with complete settlement data
        const newRoundState = {
          roundId: event.roundId,
          settled: true,
          winningSide: event.winningSide,
          headsTotal: Math.round(event.headsTotal * 1_000_000_000), // Convert to lamports
          tailsTotal: Math.round(event.tailsTotal * 1_000_000_000),
          endsAt: Math.floor(Date.now() / 1000) // Current timestamp as fallback
        };

        // console.log('🎰 New round state for animation:', newRoundState);
        setRoundState(newRoundState);
      }

      // Refresh user bet data immediately to enable claim button
      if (publicKey) {
        // console.log('🔄 Fetching user bet for round', event.roundId, 'to enable claiming...');
        fetchUserBet(event.roundId);
      }

      // Refresh global data after settlement
      setTimeout(() => {
        // console.log('🔄 Refreshing global data after settlement...');
        fetchGlobalState();
        fetchBalances();
      }, 1000); // Reduced delay for faster refresh
    });

    // Listen for round status updates  
    const unsubscribeStatus = addSSEListener('round_status', (event) => {
      // console.log('📊 Round status via SSE:', event);

      const newRoundState = {
        roundId: event.roundId,
        headsTotal: Math.round(event.headsTotal * 1_000_000_000), // Convert back to lamports for consistency
        tailsTotal: Math.round(event.tailsTotal * 1_000_000_000),
        endsAt: event.endsAt,
        settled: event.settled,
        winningSide: event.winningSide
      };

      // Check if this is a new settlement (was not settled before, now is settled)
      setRoundState(prev => {
        const wasSettled = prev?.settled;
        const isNowSettled = event.settled;
        const totalPot = event.headsTotal + event.tailsTotal;

        // Trigger coin toss animation if newly settled with bets
        if (!wasSettled && isNowSettled && totalPot > 0) {
          // console.log('🎰 Triggering coin toss animation for Round', event.roundId);
          // The coin toss animation will be triggered by BettingArea useEffect watching roundState changes
        }

        return newRoundState;
      });
    });

    // Listen for bet placement events
    const unsubscribeBetPlaced = addSSEListener('bet_placed', (event) => {
      console.log('💰 FRONTEND RECEIVED BET PLACED EVENT:', event);
      console.log('💰 Bet details:', {
        roundId: event.roundId,
        userWallet: event.userWallet,
        side: event.sideName,
        amount: event.amount
      });

      // Refresh round state to show updated totals
      if (event.roundId === roundState?.roundId) {
        console.log('🔄 Refreshing round state after new bet...');
        fetchRoundState(event.roundId);
      }

      // Refresh global state to update pot
      setTimeout(() => {
        fetchGlobalState();
      }, 500);
    });

    // Listen for round started events
    const unsubscribeRoundStarted = addSSEListener('round_started', (event) => {
      console.log('🚀 FRONTEND RECEIVED ROUND STARTED EVENT:', event);
      console.log('🚀 Round started:', {
        roundId: event.roundId,
        transactionHash: event.transactionHash
      });

      // Refresh global state to get new round
      setTimeout(() => {
        fetchGlobalState();
      }, 1000);
    });

    // Listen for users online count
    const unsubscribeUsers = addSSEListener('users_online', (event) => {
      console.log('👥 Users online via SSE:', event.count);
      setUsersOnline(event.count);
    });

    return () => {
      unsubscribeSettlement();
      unsubscribeStatus();
      unsubscribeBetPlaced();
      unsubscribeRoundStarted();
      unsubscribeUsers();
    };
  }, [addSSEListener, fetchGlobalState, fetchBalances, roundState, fetchRoundState]);

  // Auto-fetch current round state based on global state
  const fetchCurrentRound = useCallback(async () => {
    if (!program || !globalState) return;

    const activeRoundId = globalState.currentRound;
    const previousRoundId = currentRound;

    // Get current time-based round info
    const roundInfo = getCurrentRoundInfo();
    const timeBasedRoundId = roundInfo.currentRoundId;

    // Clear bet state when round changes
    if (activeRoundId !== previousRoundId && previousRoundId !== null) {
      console.log(`🔄 Round changed from ${previousRoundId} to ${activeRoundId}, clearing bet state`);
      setUserBet(null);
    }

    // CRITICAL: Clear bet state if user bet is from a settled round
    if (userBet && roundState && roundState.settled && userBet.roundId === roundState.roundId) {
      console.log(`🧹 Clearing bet from settled round ${userBet.roundId}`);
      setUserBet(null);
    }

    if (activeRoundId && activeRoundId > 0) {
      try {
        const roundStateData = await fetchRoundState(activeRoundId);

        // If the round is settled, we should transition to showing time-based round
        if (roundStateData && roundStateData.settled) {
          console.log(`🎰 Round ${activeRoundId} is settled, transitioning to time-based round ${timeBasedRoundId}`);
          // Set a virtual round state for the current time slot
          setRoundState({
            roundId: timeBasedRoundId, // Use time-based round ID
            headsTotal: 0,
            tailsTotal: 0,
            endsAt: roundInfo.roundEndTime,
            settled: false,
            winningSide: null,
            virtual: true, // Mark this as a virtual round
          });
          // Clear any stale user bets
          setUserBet(null);
        } else {
          // Round is still active, use the real round state
          if (publicKey) {
            await fetchUserBet(activeRoundId);
          }
        }
        setCurrentRound(activeRoundId);
      } catch (err) {
        console.log('Current round not found on-chain yet:', activeRoundId);
        // This is normal - round gets created on first bet
        // Use virtual time-based round
        setRoundState({
          roundId: timeBasedRoundId,
          headsTotal: 0,
          tailsTotal: 0,
          endsAt: roundInfo.roundEndTime,
          settled: false,
          winningSide: null,
          virtual: true,
        });
        setUserBet(null);
        setCurrentRound(activeRoundId);
      }
    } else {
      // No rounds started yet - use time-based round
      setRoundState({
        roundId: timeBasedRoundId,
        headsTotal: 0,
        tailsTotal: 0,
        endsAt: roundInfo.roundEndTime,
        settled: false,
        winningSide: null,
        virtual: true,
      });
      setUserBet(null);
      setCurrentRound(0);
    }
  }, [program, globalState, publicKey, fetchRoundState, fetchUserBet, currentRound, getCurrentRoundInfo]);

  // Auto-refresh current round every 30 seconds (reduced from 5s to stop RPC spam)
  useEffect(() => {
    if (!program) return;

    fetchCurrentRound();

    const interval = setInterval(() => {
      fetchCurrentRound();
    }, 30000);

    return () => clearInterval(interval);
  }, [program, fetchCurrentRound]);

  // Claim winnings
  const claimWinnings = useCallback(async (roundIdOverride) => {
    const targetRoundId = roundIdOverride || roundState?.roundId;
    if (!program || !publicKey || !targetRoundId) {
      throw new Error('Cannot claim winnings');
    }

    setLoading(true);
    setError(null);

    try {
      const [globalStatePDA] = await getGlobalStatePDA();
      const [roundStatePDA] = await getRoundStatePDA(targetRoundId);
      const [userBetPDA] = await getUserBetPDA(publicKey, targetRoundId);

      const tx = await program.methods
        .claimWinnings()
        .accounts({
          globalState: globalStatePDA,
          roundState: roundStatePDA,
          userBet: userBetPDA,
          user: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await connection.confirmTransaction(tx, 'confirmed');

      // Store transaction hash for display
      setLastClaimTx({
        txHash: tx,
        roundId: targetRoundId,
        timestamp: Date.now(),
      });

      // Refresh data after claiming
      await fetchGlobalState(); // This will refresh everything including current round
      await fetchBalances();
      await fetchHistory();
      await fetchLeaderboard();

      // console.log(`🎯 Claim completed for round ${targetRoundId}, clearing bet state for new rounds`);

      // CRITICAL: Always clear bet state FIRST to allow new bets
      setUserBet(null);

      // Force immediate refresh of user bet data to ensure consistency
      const newCurrentRound = globalState?.currentRound || currentRound;
      if (newCurrentRound && publicKey) {
        await fetchUserBet(newCurrentRound);
      }

      return tx;
    } catch (err) {
      console.error('Error claiming winnings:', err);
      setError(err.message || 'Failed to claim winnings');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [program, publicKey, roundState, userBet, connection, fetchUserBet, fetchBalances, fetchHistory, fetchLeaderboard, fetchGlobalState]);

  // Initialize program (one-time setup)
  const initializeProgram = useCallback(async (rakeBps = 200, jackpotBps = 100) => {
    if (!program || !publicKey) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const [globalStatePDA] = await getGlobalStatePDA();
      const [treasuryPDA] = await getTreasuryPDA();
      const [jackpotPDA] = await getJackpotPDA();

      console.log('Initializing program with PDAs:', {
        globalState: globalStatePDA.toString(),
        treasury: treasuryPDA.toString(),
        jackpot: jackpotPDA.toString(),
        authority: publicKey.toString(),
        rakeBps,
        jackpotBps,
      });

      const tx = await program.methods
        .initialize(rakeBps, jackpotBps)
        .accounts({
          globalState: globalStatePDA,
          treasury: treasuryPDA,
          jackpot: jackpotPDA,
          authority: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await connection.confirmTransaction(tx, 'confirmed');
      console.log('✅ Program initialized successfully:', tx);

      // Refresh global state
      await fetchGlobalState();
      await fetchBalances();

      return tx;
    } catch (err) {
      console.error('Error initializing program:', err);
      const errorMsg = err.message || 'Failed to initialize program';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [program, publicKey, connection, fetchGlobalState, fetchBalances]);

  // Start new round (admin only)
  const startNewRound = useCallback(async (durationSeconds = DEFAULT_ROUND_DURATION) => {
    if (!program || !publicKey) {
      throw new Error('Wallet not connected');
    }

    if (!globalState) {
      throw new Error('Program not initialized');
    }

    // Check if user is authority (temporarily disabled for testing)
    // TODO: Re-enable this check in production
    /* 
    if (globalState.authority !== publicKey.toString()) {
      throw new Error('Only the authority can start rounds');
    }
    */

    setLoading(true);
    setError(null);

    try {
      const [globalStatePDA] = await getGlobalStatePDA();
      const nextRoundId = (currentRound || 0) + 1;
      const [roundStatePDA] = await getRoundStatePDA(nextRoundId);

      console.log('Starting round:', {
        roundId: nextRoundId,
        duration: durationSeconds,
        authority: publicKey.toString(),
      });

      const tx = await program.methods
        .startRound(new BN(durationSeconds))
        .accounts({
          globalState: globalStatePDA,
          roundState: roundStatePDA,
          authority: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('Round started! Transaction:', tx);
      await connection.confirmTransaction(tx, 'confirmed');

      // Refresh data
      await fetchGlobalState();
      await fetchRoundState(nextRoundId);
      await fetchBalances();

      return tx;
    } catch (err) {
      console.error('Error starting round:', err);
      const errorMsg = err.message || 'Failed to start round';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [program, publicKey, globalState, currentRound, connection, fetchGlobalState, fetchRoundState, fetchBalances]);

  // Close round (admin only)
  const closeRound = useCallback(async () => {
    if (!program || !publicKey || !roundState) {
      throw new Error('Cannot close round');
    }

    setLoading(true);
    setError(null);

    try {
      const [globalStatePDA] = await getGlobalStatePDA();
      const [roundStatePDA] = await getRoundStatePDA(roundState.roundId);
      const [treasuryPDA] = await getTreasuryPDA();
      const [jackpotPDA] = await getJackpotPDA();

      const tx = await program.methods
        .closeRound()
        .accounts({
          globalState: globalStatePDA,
          roundState: roundStatePDA,
          treasury: treasuryPDA,
          jackpot: jackpotPDA,
          authority: publicKey,
        })
        .rpc();

      await connection.confirmTransaction(tx, 'confirmed');

      // Refresh data
      await fetchRoundState(roundState.roundId);
      await fetchBalances();
      await fetchHistory();

      return tx;
    } catch (err) {
      console.error('Error closing round:', err);
      setError(err.message || 'Failed to close round');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [program, publicKey, roundState, connection, fetchRoundState, fetchBalances, fetchHistory]);

  return (
    <GameContext.Provider
      value={{
        program,
        connection,
        globalState,
        currentRound,
        roundState,
        userBet,
        jackpotPool,
        treasuryBalance,
        history,
        leaderboard,
        timeLeft,
        loading,
        error,
        lastBetTx,
        lastClaimTx,
        usersOnline,
        placeBet,
        claimWinnings,
        startNewRound,
        closeRound,
        initializeProgram,
        getCurrentRoundInfo,
        refresh: () => {
          if (currentRound) {
            fetchRoundState(currentRound);
            fetchUserBet(currentRound);
          }
          fetchBalances();
          fetchHistory();
          fetchLeaderboard();
        },
      }}
    >
      {children}
    </GameContext.Provider>
  );
};
