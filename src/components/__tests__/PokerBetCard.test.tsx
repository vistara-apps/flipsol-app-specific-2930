import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PokerBetCard from '../PokerBetCard'
import * as GameContext from '../../contexts/GameContext'
import * as WalletContext from '../../contexts/WalletContext'
import * as SolanaWalletAdapter from '@solana/wallet-adapter-react'
import { mockGameContext, mockWalletContext, mockUseWallet } from '../../test/mocks/solana'

// Mock modules
vi.mock('../../contexts/GameContext')
vi.mock('../../contexts/WalletContext') 
vi.mock('@solana/wallet-adapter-react')
vi.mock('canvas-confetti', () => ({
  default: vi.fn()
}))
vi.mock('../../hooks/useSound', () => ({
  useSound: () => ({
    playSound: vi.fn()
  })
}))

describe('PokerBetCard Component', () => {
  const mockUseGame = vi.mocked(GameContext.useGame)
  const mockUseCustomWallet = vi.mocked(WalletContext.useWallet)
  const mockUseSolanaWallet = vi.mocked(SolanaWalletAdapter.useWallet)

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockUseGame.mockReturnValue(mockGameContext)
    mockUseCustomWallet.mockReturnValue(mockWalletContext)
    mockUseSolanaWallet.mockReturnValue(mockUseWallet())
  })

  describe('Heads Side Betting', () => {
    it('should render heads betting card correctly', () => {
      render(<PokerBetCard side={0} />)
      
      expect(screen.getByText('Heads')).toBeInTheDocument()
      expect(screen.getByText('Place Your Bet')).toBeInTheDocument()
      expect(screen.getByText('500.00 SOL')).toBeInTheDocument() // Total pool
      expect(screen.getByRole('button', { name: /bet on heads/i })).toBeInTheDocument()
    })

    it('should show preset betting amounts when bet button is clicked', async () => {
      const user = userEvent.setup()
      render(<PokerBetCard side={0} />)
      
      const betButton = screen.getByRole('button', { name: /bet on heads/i })
      await user.click(betButton)
      
      expect(screen.getByRole('button', { name: /bet 0\.1 sol/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /bet 0\.5 sol/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /bet 1 sol/i })).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Custom amount')).toBeInTheDocument()
    })

    it('should calculate estimated payout correctly', async () => {
      const user = userEvent.setup()
      render(<PokerBetCard side={0} />)
      
      const betButton = screen.getByRole('button', { name: /bet on heads/i })
      await user.click(betButton)
      
      const customInput = screen.getByPlaceholderText('Custom amount')
      await user.type(customInput, '1')
      
      // Should show estimated payout calculation
      await waitFor(() => {
        expect(screen.getByText(/Estimated payout:/)).toBeInTheDocument()
      })
    })

    it('should place bet when confirm is clicked', async () => {
      const user = userEvent.setup()
      const mockPlaceBet = vi.fn().mockResolvedValue(undefined)
      mockUseGame.mockReturnValue({
        ...mockGameContext,
        placeBet: mockPlaceBet
      })
      
      render(<PokerBetCard side={0} />)
      
      const betButton = screen.getByRole('button', { name: /bet on heads/i })
      await user.click(betButton)
      
      const customInput = screen.getByPlaceholderText('Custom amount')
      await user.type(customInput, '1')
      
      const confirmButton = screen.getByRole('button', { name: /confirm/i })
      await user.click(confirmButton)
      
      expect(mockPlaceBet).toHaveBeenCalledWith(0, 1)
    })
  })

  describe('Tails Side Betting', () => {
    it('should render tails betting card correctly', () => {
      render(<PokerBetCard side={1} />)
      
      expect(screen.getByText('Tails')).toBeInTheDocument()
      expect(screen.getByText('Place Your Bet')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /bet on tails/i })).toBeInTheDocument()
    })

    it('should disable betting when wallet is not connected', () => {
      mockUseSolanaWallet.mockReturnValue({
        ...mockUseWallet(),
        publicKey: null,
        connected: false
      })
      
      render(<PokerBetCard side={1} />)
      
      const betButton = screen.getByRole('button', { name: /place bet on tails/i })
      expect(betButton).toBeDisabled()
      expect(betButton).toHaveTextContent(/connect wallet/i)
    })

    it('should show existing bet when user already has a bet', () => {
      mockUseGame.mockReturnValue({
        ...mockGameContext,
        userBet: {
          side: 1,
          amount: 0.5,
          claimed: false,
          roundId: 1,
          userPublicKey: 'mock-key'
        }
      })
      
      render(<PokerBetCard side={1} />)
      
      // Should show existing bet instead of button
      expect(screen.getByText('Your Bet')).toBeInTheDocument()
      expect(screen.getByText('0.50 SOL')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should show error message when bet fails', async () => {
      const user = userEvent.setup()
      const mockPlaceBet = vi.fn().mockRejectedValue(new Error('Insufficient funds'))
      mockUseGame.mockReturnValue({
        ...mockGameContext,
        placeBet: mockPlaceBet
      })
      
      // Mock alert
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
      
      render(<PokerBetCard side={0} />)
      
      const betButton = screen.getByRole('button', { name: /bet on heads/i })
      await user.click(betButton)
      
      const customInput = screen.getByPlaceholderText('Custom amount')
      await user.type(customInput, '1') // Valid amount within balance
      
      const confirmButton = screen.getByRole('button', { name: /confirm/i })
      await user.click(confirmButton)
      
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Insufficient funds')
      }, { timeout: 2000 })
      
      alertSpy.mockRestore()
    })

    it('should validate bet amount against balance', async () => {
      const user = userEvent.setup()
      render(<PokerBetCard side={0} />)
      
      const betButton = screen.getByRole('button', { name: /bet on heads/i })
      await user.click(betButton)
      
      const customInput = screen.getByPlaceholderText('Custom amount')
      await user.type(customInput, '10') // More than balance (1.5 SOL)
      
      const confirmButton = screen.getByRole('button', { name: /confirm/i })
      expect(confirmButton).toBeDisabled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<PokerBetCard side={0} />)
      
      expect(screen.getByRole('region', { name: /heads betting card/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /place bet on heads/i })).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<PokerBetCard side={0} />)
      
      const betButton = screen.getByRole('button', { name: /bet on heads/i })
      betButton.focus()
      
      // Test keyboard activation
      await user.keyboard('{Enter}')
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Custom amount')).toBeInTheDocument()
      })
    })
  })

  describe('Visual States', () => {
    it('should show existing bet when user has bet on this side', () => {
      mockUseGame.mockReturnValue({
        ...mockGameContext,
        userBet: {
          side: 0,
          amount: 1.0,
          claimed: false,
          roundId: 1,
          userPublicKey: 'mock-key'
        }
      })
      
      render(<PokerBetCard side={0} />)
      
      expect(screen.getByText('Your Bet')).toBeInTheDocument()
      expect(screen.getByText('1.00 SOL')).toBeInTheDocument()
    })

    it('should show loading state when betting is in progress', () => {
      mockUseGame.mockReturnValue({
        ...mockGameContext,
        loading: true
      })
      
      render(<PokerBetCard side={0} />)
      
      const betButton = screen.getByRole('button', { name: /place bet on heads/i })
      expect(betButton).toBeDisabled()
      expect(betButton).toHaveTextContent(/loading/i)
    })
  })
})