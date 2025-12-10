/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Mock wallet connection for testing
       */
      mockWalletConnection(): Chainable<void>
      
      /**
       * Mock Solana program interactions
       */
      mockSolanaProgram(): Chainable<void>
      
      /**
       * Wait for poker table to be fully rendered
       */
      waitForPokerTable(): Chainable<void>
      
      /**
       * Place a test bet on specified side
       */
      placeBet(side: 'heads' | 'tails', amount: number): Chainable<void>
      
      /**
       * Check accessibility with axe-core
       */
      checkA11y(): Chainable<void>
    }
  }
}

// Mock wallet connection
Cypress.Commands.add('mockWalletConnection', () => {
  cy.window().then((window) => {
    // Mock Solana wallet adapter
    const mockWallet = {
      publicKey: {
        toString: () => 'mock-public-key-for-cypress-testing'
      },
      connected: true,
      signTransaction: cy.stub().resolves({}),
      signAllTransactions: cy.stub().resolves([]),
    }
    
    // Override wallet context
    window.solana = {
      isPhantom: true,
      connect: cy.stub().resolves(mockWallet.publicKey),
      disconnect: cy.stub().resolves(),
      signTransaction: mockWallet.signTransaction,
      signAllTransactions: mockWallet.signAllTransactions,
    }
  })
})

// Mock Solana program interactions
Cypress.Commands.add('mockSolanaProgram', () => {
  cy.intercept('POST', '**/api/**', {
    statusCode: 200,
    body: {
      success: true,
      signature: 'mock-transaction-signature',
    }
  }).as('solanaTransaction')
  
  cy.window().then((window) => {
    // Mock program responses
    const mockProgram = {
      account: {
        globalState: {
          fetch: cy.stub().resolves({
            isInitialized: true,
            currentRoundId: 1,
            jackpotAmount: 100
          })
        },
        roundState: {
          fetch: cy.stub().resolves({
            roundId: 1,
            headsTotal: 50,
            tailsTotal: 50,
            settled: false,
            bettingOpen: true
          })
        }
      },
      methods: {
        placeBet: cy.stub().returns({
          rpc: cy.stub().resolves('mock-signature')
        })
      }
    }
    
    window.mockProgram = mockProgram
  })
})

// Wait for poker table to render
Cypress.Commands.add('waitForPokerTable', () => {
  cy.get('.poker-table-container', { timeout: 10000 }).should('be.visible')
  cy.get('.poker-felt').should('be.visible')
  cy.get('.betting-positions').should('be.visible')
})

// Place a bet
Cypress.Commands.add('placeBet', (side: 'heads' | 'tails', amount: number) => {
  cy.get(`[aria-label*="Place bet on ${side}"]`).click()
  cy.get('input[placeholder="Custom amount"]').type(amount.toString())
  cy.get('button').contains(/confirm/i).click()
})

// Accessibility checking
Cypress.Commands.add('checkA11y', () => {
  cy.injectAxe()
  cy.checkA11y(null, {
    rules: {
      'color-contrast': { enabled: false }, // Disabled due to casino theme colors
    }
  })
})