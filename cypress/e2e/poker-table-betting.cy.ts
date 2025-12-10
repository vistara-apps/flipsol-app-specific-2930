describe('Poker Table Betting Flow', () => {
  beforeEach(() => {
    // Mock wallet and program before visiting
    cy.mockWalletConnection()
    cy.mockSolanaProgram()
    cy.visit('/')
  })

  describe('Initial Poker Table Load', () => {
    it('should render poker table with professional casino aesthetic', () => {
      cy.waitForPokerTable()
      
      // Check main table structure
      cy.get('.poker-table').should('be.visible')
      cy.get('.poker-felt').should('be.visible')
      cy.get('.poker-center-area').should('be.visible')
      
      // Verify casino branding
      cy.contains('FlipSOL').should('be.visible')
      
      // Check betting cards are positioned correctly
      cy.get('.betting-positions').within(() => {
        cy.get('[role="region"]').should('have.length', 2)
        cy.contains('Heads').should('be.visible')
        cy.contains('Tails').should('be.visible')
      })
    })

    it('should display betting cards with proper styling', () => {
      cy.waitForPokerTable()
      
      // Check heads betting card
      cy.get('[aria-label="Heads betting card"]').within(() => {
        cy.contains('Heads').should('be.visible')
        cy.contains('Place Your Bet').should('be.visible')
        cy.contains('Total Pool').should('be.visible')
        cy.get('.poker-chip.heads').should('be.visible')
      })
      
      // Check tails betting card
      cy.get('[aria-label="Tails betting card"]').within(() => {
        cy.contains('Tails').should('be.visible')
        cy.contains('Place Your Bet').should('be.visible')
        cy.contains('Total Pool').should('be.visible')
        cy.get('.poker-chip:not(.heads)').should('be.visible')
      })
    })

    it('should show idle coin animation in center', () => {
      cy.waitForPokerTable()
      
      cy.get('.poker-center-area').within(() => {
        cy.get('.casino-coin').should('be.visible')
        cy.contains('FlipSOL').should('be.visible')
      })
    })
  })

  describe('Betting Interaction', () => {
    it('should handle heads betting flow', () => {
      cy.waitForPokerTable()
      
      // Click heads betting button
      cy.get('[aria-label="Heads betting card"]').within(() => {
        cy.get('button').contains(/bet on heads/i).click()
        
        // Betting form should appear
        cy.get('input[placeholder="Custom amount"]').should('be.visible')
        cy.get('button').contains('0.1 SOL').should('be.visible')
        cy.get('button').contains('0.5 SOL').should('be.visible')
        cy.get('button').contains('1 SOL').should('be.visible')
      })
    })

    it('should handle preset amount selection', () => {
      cy.waitForPokerTable()
      
      cy.get('[aria-label="Heads betting card"]').within(() => {
        cy.get('button').contains(/bet on heads/i).click()
        
        // Click preset amount
        cy.get('button').contains('0.5 SOL').click()
        
        // Input should be populated
        cy.get('input[placeholder="Custom amount"]').should('have.value', '0.5')
        
        // Estimated payout should appear
        cy.contains('Estimated payout:').should('be.visible')
      })
    })

    it('should validate custom bet amounts', () => {
      cy.waitForPokerTable()
      
      cy.get('[aria-label="Tails betting card"]').within(() => {
        cy.get('button').contains(/bet on tails/i).click()
        
        // Enter valid amount
        cy.get('input[placeholder="Custom amount"]').type('1.0')
        cy.get('button').contains(/confirm/i).should('not.be.disabled')
        
        // Clear and enter invalid amount
        cy.get('input[placeholder="Custom amount"]').clear().type('0')
        cy.get('button').contains(/confirm/i).should('be.disabled')
        
        // Enter amount exceeding balance
        cy.get('input[placeholder="Custom amount"]').clear().type('999')
        cy.get('button').contains(/confirm/i).should('be.disabled')
      })
    })

    it('should complete betting transaction', () => {
      cy.waitForPokerTable()
      
      // Place bet on heads
      cy.placeBet('heads', 1)
      
      // Should trigger transaction
      cy.wait('@solanaTransaction')
      
      // Should show bet confirmation (mocked)
      cy.get('[aria-label="Heads betting card"]').within(() => {
        cy.contains('Your Bet').should('be.visible')
        cy.contains('1.00 SOL').should('be.visible')
      })
    })

    it('should handle bet cancellation', () => {
      cy.waitForPokerTable()
      
      cy.get('[aria-label="Heads betting card"]').within(() => {
        cy.get('button').contains(/bet on heads/i).click()
        cy.get('input[placeholder="Custom amount"]').type('0.5')
        
        // Cancel bet
        cy.get('button').contains('Cancel').click()
        
        // Should return to initial state
        cy.get('button').contains(/bet on heads/i).should('be.visible')
        cy.get('input[placeholder="Custom amount"]').should('not.exist')
      })
    })
  })

  describe('Round States', () => {
    it('should handle betting phase', () => {
      cy.waitForPokerTable()
      
      // Both betting cards should be available
      cy.get('button').contains(/bet on heads/i).should('be.visible')
      cy.get('button').contains(/bet on tails/i).should('be.visible')
      
      // Timer should be visible
      cy.get('[data-testid="round-timer"]', { timeout: 5000 }).should('be.visible')
    })

    it('should handle casino break phase', () => {
      // Mock break phase
      cy.window().then((window) => {
        window.mockRoundInfo = {
          bettingOpen: false,
          isBettingPhase: false,
          isBreakPhase: true,
          nextRoundStartsIn: 30
        }
      })
      
      cy.reload()
      cy.waitForPokerTable()
      
      // Should show break message
      cy.contains('Casino Break').should('be.visible')
      cy.contains('Next round in').should('be.visible')
      
      // Betting should still be available for next round
      cy.get('button').contains(/bet on heads/i).should('be.visible')
    })
  })

  describe('Responsive Design', () => {
    it('should work on mobile devices', () => {
      cy.viewport('iphone-x')
      cy.waitForPokerTable()
      
      // Table should still be visible and functional
      cy.get('.poker-table').should('be.visible')
      cy.get('.betting-positions').should('be.visible')
      
      // Betting cards should be accessible
      cy.get('[aria-label="Heads betting card"]').should('be.visible')
      cy.get('[aria-label="Tails betting card"]').should('be.visible')
    })

    it('should work on tablet devices', () => {
      cy.viewport('ipad-2')
      cy.waitForPokerTable()
      
      // Check responsive layout
      cy.get('.poker-table-container').should('be.visible')
      cy.get('.betting-positions').should('be.visible')
      
      // Betting interaction should work
      cy.get('button').contains(/bet on heads/i).click()
      cy.get('input[placeholder="Custom amount"]').should('be.visible')
    })
  })

  describe('Accessibility', () => {
    it('should meet accessibility standards', () => {
      cy.waitForPokerTable()
      cy.checkA11y()
    })

    it('should support keyboard navigation', () => {
      cy.waitForPokerTable()
      
      // Tab through betting cards
      cy.get('body').tab()
      cy.focused().should('contain', 'Bet on')
      
      // Activate with keyboard
      cy.focused().type('{enter}')
      cy.get('input[placeholder="Custom amount"]').should('be.visible')
    })

    it('should have proper ARIA labels', () => {
      cy.waitForPokerTable()
      
      // Check ARIA regions
      cy.get('[role="region"]').should('have.length', 2)
      cy.get('[aria-label="Heads betting card"]').should('exist')
      cy.get('[aria-label="Tails betting card"]').should('exist')
      
      // Check button labels
      cy.get('[aria-label*="Place bet on"]').should('have.length', 2)
    })
  })

  describe('Error Handling', () => {
    it('should handle wallet connection errors gracefully', () => {
      // Mock wallet connection failure
      cy.window().then((window) => {
        window.solana = {
          connect: cy.stub().rejects(new Error('User rejected connection'))
        }
      })
      
      cy.reload()
      cy.waitForPokerTable()
      
      // Should show wallet connection prompt
      cy.contains('Connect Your Wallet').should('be.visible')
    })

    it('should handle transaction failures', () => {
      cy.waitForPokerTable()
      
      // Mock transaction failure
      cy.intercept('POST', '**/api/**', {
        statusCode: 500,
        body: { error: 'Insufficient funds' }
      }).as('failedTransaction')
      
      // Attempt to place bet
      cy.placeBet('heads', 1)
      
      // Should handle error gracefully (mocked alert)
      cy.wait('@failedTransaction')
    })
  })

  describe('Performance', () => {
    it('should load within acceptable time', () => {
      const start = performance.now()
      
      cy.visit('/').then(() => {
        cy.waitForPokerTable().then(() => {
          const loadTime = performance.now() - start
          expect(loadTime).to.be.lessThan(3000) // 3 second max load time
        })
      })
    })

    it('should handle animations smoothly', () => {
      cy.waitForPokerTable()
      
      // Test hover animations
      cy.get('.poker-bet-card').first().trigger('mouseover')
      cy.wait(300) // Wait for animation
      cy.get('.poker-bet-card').first().trigger('mouseout')
      
      // Test betting form transitions
      cy.get('button').contains(/bet on heads/i).click()
      cy.wait(300) // Wait for transition
      cy.get('button').contains('Cancel').click()
      cy.wait(300) // Wait for transition back
    })
  })
})