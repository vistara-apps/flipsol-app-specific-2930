// Import commands.js using ES2015 syntax
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Global configuration
Cypress.on('uncaught:exception', (err, runnable) => {
  // Prevent Cypress from failing the test on unhandled promise rejections
  // that are common in Web3 applications
  if (err.message.includes('Non-Error promise rejection captured')) {
    return false
  }
  if (err.message.includes('ChunkLoadError')) {
    return false
  }
  if (err.message.includes('Loading chunk')) {
    return false
  }
  // Don't fail on wallet connection errors during testing
  if (err.message.includes('wallet')) {
    return false
  }
  return true
})