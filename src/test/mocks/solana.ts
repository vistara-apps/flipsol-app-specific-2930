import { vi } from 'vitest'
import type { PublicKey } from '@solana/web3.js'

// Mock Solana Web3 components
export const mockPublicKey = {
  toString: () => 'mock-public-key',
  toBase58: () => 'mock-base58-key',
  equals: vi.fn(() => false),
  toBuffer: () => Buffer.from('mock-buffer')
} as unknown as PublicKey

export const mockConnection = {
  getBalance: vi.fn().mockResolvedValue(1000000000), // 1 SOL in lamports
  getAccountInfo: vi.fn().mockResolvedValue(null),
  getTransaction: vi.fn().mockResolvedValue(null),
  sendTransaction: vi.fn().mockResolvedValue('mock-transaction-signature'),
  confirmTransaction: vi.fn().mockResolvedValue({ value: { err: null } }),
  getLatestBlockhash: vi.fn().mockResolvedValue({ blockhash: 'mock-blockhash', lastValidBlockHeight: 1000 }),
  simulateTransaction: vi.fn().mockResolvedValue({ value: { err: null, logs: [] } })
}

// Mock Wallet Adapter
export const mockWallet = {
  publicKey: mockPublicKey,
  connected: true,
  connecting: false,
  disconnecting: false,
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  signTransaction: vi.fn().mockResolvedValue({}),
  signAllTransactions: vi.fn().mockResolvedValue([]),
  sendTransaction: vi.fn().mockResolvedValue('mock-signature')
}

export const mockUseWallet = () => ({
  publicKey: mockPublicKey,
  connected: true,
  connecting: false,
  disconnecting: false,
  wallet: mockWallet,
  connect: vi.fn(),
  disconnect: vi.fn(),
  select: vi.fn()
})

// Mock Anchor Program
export const mockProgram = {
  account: {
    globalState: {
      fetch: vi.fn().mockResolvedValue({
        isInitialized: true,
        authority: mockPublicKey,
        totalVolume: 1000,
        totalFees: 50,
        jackpotAmount: 100,
        currentRoundId: 1
      }),
      fetchNullable: vi.fn().mockResolvedValue(null)
    },
    roundState: {
      fetch: vi.fn().mockResolvedValue({
        roundId: 1,
        headsTotal: 500,
        tailsTotal: 500,
        settled: false,
        winningSide: null,
        startTime: Date.now() / 1000,
        bettingOpen: true
      }),
      fetchNullable: vi.fn().mockResolvedValue(null)
    }
  },
  methods: {
    initializeProgram: vi.fn().mockReturnValue({
      rpc: vi.fn().mockResolvedValue('mock-signature')
    }),
    placeBet: vi.fn().mockReturnValue({
      rpc: vi.fn().mockResolvedValue('mock-signature')
    }),
    claimWinnings: vi.fn().mockReturnValue({
      rpc: vi.fn().mockResolvedValue('mock-signature')
    }),
    settleRound: vi.fn().mockReturnValue({
      rpc: vi.fn().mockResolvedValue('mock-signature')
    })
  }
}

// Mock Game Context
export const mockGameContext = {
  globalState: {
    isInitialized: true,
    authority: mockPublicKey,
    totalVolume: 1000,
    totalFees: 50,
    jackpotAmount: 100,
    currentRoundId: 1
  },
  roundState: {
    roundId: 1,
    headsTotal: 500,
    tailsTotal: 500,
    settled: false,
    winningSide: null,
    startTime: Date.now() / 1000,
    bettingOpen: true
  },
  userBet: null,
  loading: false,
  error: null,
  placeBet: vi.fn().mockResolvedValue(undefined),
  claimWinnings: vi.fn().mockResolvedValue(undefined),
  initializeProgram: vi.fn().mockResolvedValue(undefined),
  getCurrentRoundInfo: vi.fn().mockReturnValue({
    bettingOpen: true,
    isBettingPhase: true,
    isBreakPhase: false,
    timeLeftToBet: 30000,
    nextRoundStartsIn: 0
  }),
  lastBetTx: null
}

// Mock Wallet Context
export const mockWalletContext = {
  balance: 1.5,
  balanceLoading: false,
  updateBalance: vi.fn().mockResolvedValue(undefined),
  formatBalance: vi.fn((balance: number) => `${balance.toFixed(2)} SOL`)
}