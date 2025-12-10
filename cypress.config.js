import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    env: {
      // Test wallet configuration
      TEST_WALLET_PRIVATE_KEY: 'test-private-key',
      SOLANA_NETWORK: 'devnet'
    }
  },
  component: {
    devServer: {
      framework: 'create-react-app',
      bundler: 'vite',
    },
    setupNodeEvents(on, config) {
      // component test node events
    },
  },
  retries: {
    runMode: 2,
    openMode: 0
  },
  defaultCommandTimeout: 10000,
  requestTimeout: 10000,
  responseTimeout: 10000
})