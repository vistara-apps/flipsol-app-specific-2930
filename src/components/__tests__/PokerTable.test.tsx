import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import PokerTable from '../PokerTable'
import * as GameContext from '../../contexts/GameContext'
import { mockGameContext } from '../../test/mocks/solana'

// Mock modules
vi.mock('../../contexts/GameContext')
vi.mock('../PokerCoinFlip', () => ({
  default: ({ winner, onComplete, isActive }: any) => (
    <div data-testid="poker-coin-flip">
      {isActive ? `Active - Winner: ${winner}` : 'Idle'}
      {onComplete && (
        <button onClick={onComplete} data-testid="complete-flip">
          Complete
        </button>
      )}
    </div>
  )
}))

describe('PokerTable Component', () => {
  const mockUseGame = vi.mocked(GameContext.useGame)

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseGame.mockReturnValue(mockGameContext)
  })

  describe('Table Structure', () => {
    it('should render poker table with proper structure', () => {
      render(
        <PokerTable>
          <div data-testid="test-child">Test Child</div>
        </PokerTable>
      )

      expect(screen.getByTestId('test-child')).toBeInTheDocument()
      
      // Check for main table elements
      const tableContainer = document.querySelector('.poker-table-container')
      expect(tableContainer).toBeInTheDocument()
      
      const pokerTable = document.querySelector('.poker-table')
      expect(pokerTable).toBeInTheDocument()
      
      const pokerFelt = document.querySelector('.poker-felt')
      expect(pokerFelt).toBeInTheDocument()
    })

    it('should render children in betting positions area', () => {
      render(
        <PokerTable>
          <div data-testid="bet-card-1">Bet Card 1</div>
          <div data-testid="bet-card-2">Bet Card 2</div>
        </PokerTable>
      )

      expect(screen.getByTestId('bet-card-1')).toBeInTheDocument()
      expect(screen.getByTestId('bet-card-2')).toBeInTheDocument()
    })
  })

  describe('Center Area States', () => {
    it('should show idle coin flip when no active round', () => {
      render(<PokerTable><div /></PokerTable>)
      
      const coinFlip = screen.getByTestId('poker-coin-flip')
      expect(coinFlip).toHaveTextContent('Idle')
      expect(screen.getByText('FlipSOL')).toBeInTheDocument()
    })

    it('should show active coin flip when round is settled', async () => {
      // Mock a settled round
      mockUseGame.mockReturnValue({
        ...mockGameContext,
        roundState: {
          ...mockGameContext.roundState!,
          settled: true,
          winningSide: 0, // Heads wins
          roundId: 2,
          headsTotal: 100,
          tailsTotal: 50
        }
      })

      const { rerender } = render(<PokerTable><div /></PokerTable>)
      
      // Initially should be idle
      expect(screen.getByTestId('poker-coin-flip')).toHaveTextContent('Idle')
      
      // Simulate round state change (initial load sets lastSettledRound)
      rerender(<PokerTable><div /></PokerTable>)
      
      // Then simulate a new settled round
      mockUseGame.mockReturnValue({
        ...mockGameContext,
        roundState: {
          ...mockGameContext.roundState!,
          settled: true,
          winningSide: 0,
          roundId: 3, // New round ID
          headsTotal: 200,
          tailsTotal: 100
        }
      })
      
      rerender(<PokerTable><div /></PokerTable>)
      
      await waitFor(() => {
        const coinFlip = screen.getByTestId('poker-coin-flip')
        expect(coinFlip).toHaveTextContent('Active - Winner: 0')
      })
    })

    it('should handle coin flip completion', async () => {
      // Start with settled round to trigger flip
      mockUseGame.mockReturnValue({
        ...mockGameContext,
        roundState: {
          ...mockGameContext.roundState!,
          settled: true,
          winningSide: 1, // Tails wins
          roundId: 2,
          headsTotal: 50,
          tailsTotal: 100
        }
      })

      const { rerender } = render(<PokerTable><div /></PokerTable>)
      
      // Simulate the flip triggering
      rerender(<PokerTable><div /></PokerTable>)
      
      // Mock new round to trigger flip
      mockUseGame.mockReturnValue({
        ...mockGameContext,
        roundState: {
          ...mockGameContext.roundState!,
          settled: true,
          winningSide: 1,
          roundId: 3,
          headsTotal: 50,
          tailsTotal: 150
        }
      })
      
      rerender(<PokerTable><div /></PokerTable>)
      
      await waitFor(() => {
        const completeButton = screen.queryByTestId('complete-flip')
        if (completeButton) {
          completeButton.click()
        }
      })
      
      // Should return to idle state
      await waitFor(() => {
        const coinFlip = screen.getByTestId('poker-coin-flip')
        expect(coinFlip).toHaveTextContent('Idle')
      })
    })
  })

  describe('Round State Management', () => {
    it('should not trigger flip animation on initial page load with settled round', () => {
      mockUseGame.mockReturnValue({
        ...mockGameContext,
        roundState: {
          ...mockGameContext.roundState!,
          settled: true,
          winningSide: 0,
          roundId: 1,
          headsTotal: 100,
          tailsTotal: 50
        }
      })

      render(<PokerTable><div /></PokerTable>)
      
      // Should be idle on initial load even with settled round
      const coinFlip = screen.getByTestId('poker-coin-flip')
      expect(coinFlip).toHaveTextContent('Idle')
    })

    it('should not trigger flip for rounds without bets', async () => {
      const { rerender } = render(<PokerTable><div /></PokerTable>)
      
      // Simulate round with no bets
      mockUseGame.mockReturnValue({
        ...mockGameContext,
        roundState: {
          ...mockGameContext.roundState!,
          settled: true,
          winningSide: 0,
          roundId: 2,
          headsTotal: 0, // No bets
          tailsTotal: 0
        }
      })
      
      rerender(<PokerTable><div /></PokerTable>)
      
      // Should remain idle
      const coinFlip = screen.getByTestId('poker-coin-flip')
      expect(coinFlip).toHaveTextContent('Idle')
    })

    it('should handle missing round state gracefully', () => {
      mockUseGame.mockReturnValue({
        ...mockGameContext,
        roundState: null
      })

      render(<PokerTable><div /></PokerTable>)
      
      // Should still render without errors
      const coinFlip = screen.getByTestId('poker-coin-flip')
      expect(coinFlip).toHaveTextContent('Idle')
      expect(screen.getByText('FlipSOL')).toBeInTheDocument()
    })
  })

  describe('Visual Elements', () => {
    it('should render all required table visual elements', () => {
      render(<PokerTable><div /></PokerTable>)
      
      // Check for CSS classes that define table appearance
      expect(document.querySelector('.poker-table-container')).toBeInTheDocument()
      expect(document.querySelector('.poker-table')).toBeInTheDocument()
      expect(document.querySelector('.poker-felt')).toBeInTheDocument()
      expect(document.querySelector('.poker-center-area')).toBeInTheDocument()
      expect(document.querySelector('.betting-positions')).toBeInTheDocument()
      expect(document.querySelector('.table-edge')).toBeInTheDocument()
      expect(document.querySelector('.table-shadow')).toBeInTheDocument()
    })

    it('should maintain responsive design structure', () => {
      render(
        <PokerTable>
          <div data-testid="responsive-child-1">Child 1</div>
          <div data-testid="responsive-child-2">Child 2</div>
        </PokerTable>
      )

      const bettingPositions = document.querySelector('.betting-positions')
      expect(bettingPositions).toBeInTheDocument()
      
      // Children should be rendered within betting positions
      expect(screen.getByTestId('responsive-child-1')).toBeInTheDocument()
      expect(screen.getByTestId('responsive-child-2')).toBeInTheDocument()
    })
  })

  describe('Casino Branding', () => {
    it('should display FlipSOL branding in center when idle', () => {
      render(<PokerTable><div /></PokerTable>)
      
      const logo = screen.getByText('FlipSOL')
      expect(logo).toBeInTheDocument()
      
      // Should be in casino logo area
      const logoArea = document.querySelector('.casino-logo-area')
      expect(logoArea).toBeInTheDocument()
    })

    it('should hide branding during active coin flip', async () => {
      const { rerender } = render(<PokerTable><div /></PokerTable>)
      
      // Trigger coin flip
      mockUseGame.mockReturnValue({
        ...mockGameContext,
        roundState: {
          ...mockGameContext.roundState!,
          settled: true,
          winningSide: 0,
          roundId: 2,
          headsTotal: 100,
          tailsTotal: 50
        }
      })
      
      rerender(<PokerTable><div /></PokerTable>)
      
      // Simulate new round for flip trigger
      mockUseGame.mockReturnValue({
        ...mockGameContext,
        roundState: {
          ...mockGameContext.roundState!,
          settled: true,
          winningSide: 0,
          roundId: 3,
          headsTotal: 150,
          tailsTotal: 75
        }
      })
      
      rerender(<PokerTable><div /></PokerTable>)
      
      await waitFor(() => {
        const coinFlip = screen.getByTestId('poker-coin-flip')
        expect(coinFlip).toHaveTextContent('Active - Winner: 0')
      })
      
      // FlipSOL text should not be visible during flip
      expect(screen.queryByText('FlipSOL')).not.toBeInTheDocument()
    })
  })
})