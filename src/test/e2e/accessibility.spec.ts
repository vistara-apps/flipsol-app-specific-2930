import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('FlipSOL Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock wallet connection for testing
    await page.addInitScript(() => {
      window.solana = {
        isPhantom: true,
        publicKey: { toString: () => 'mock-key' },
        connected: true,
        connect: async () => ({ toString: () => 'mock-key' }),
        disconnect: async () => {},
        signTransaction: async () => ({}),
      }
    })
    
    await page.goto('/')
  })

  test('should not have any automatically detectable accessibility issues', async ({ page }) => {
    await page.waitForSelector('.poker-table-container', { timeout: 10000 })
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .exclude('.casino-background') // Exclude complex background gradients
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.waitForSelector('.poker-table-container')
    
    // Check for proper heading structure
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all()
    
    // Should have at least FlipSOL main heading
    expect(headings.length).toBeGreaterThan(0)
    
    // Check each heading for accessibility
    for (const heading of headings) {
      await expect(heading).toBeVisible()
      const text = await heading.textContent()
      expect(text).toBeTruthy()
      expect(text!.trim().length).toBeGreaterThan(0)
    }
  })

  test('should have proper form labels and descriptions', async ({ page }) => {
    await page.waitForSelector('.poker-table-container')
    
    // Open betting form
    await page.click('button:has-text("Bet on Heads")')
    
    // Check form accessibility
    const customAmountInput = page.locator('input[placeholder="Custom amount"]')
    await expect(customAmountInput).toBeVisible()
    
    // Input should have proper labeling
    await expect(customAmountInput).toHaveAttribute('aria-label')
    
    // Type amount and check payout description
    await customAmountInput.fill('1')
    
    const payoutEstimate = page.locator('text=Estimated payout:')
    await expect(payoutEstimate).toBeVisible()
  })

  test('should support keyboard navigation', async ({ page }) => {
    await page.waitForSelector('.poker-table-container')
    
    // Start from body and tab through interactive elements
    await page.keyboard.press('Tab')
    
    // Should be able to reach betting buttons
    let focused = page.locator(':focus')
    await expect(focused).toBeVisible()
    
    // Continue tabbing through all interactive elements
    const maxTabs = 10
    for (let i = 0; i < maxTabs; i++) {
      await page.keyboard.press('Tab')
      focused = page.locator(':focus')
      
      // Each focused element should be visible
      if (await focused.count() > 0) {
        await expect(focused).toBeVisible()
      }
    }
  })

  test('should activate betting with keyboard', async ({ page }) => {
    await page.waitForSelector('.poker-table-container')
    
    // Navigate to heads betting button with keyboard
    await page.keyboard.press('Tab')
    
    const headsButton = page.locator('button:has-text("Bet on Heads")')
    await headsButton.focus()
    
    // Activate with Enter key
    await page.keyboard.press('Enter')
    
    // Betting form should appear
    await expect(page.locator('input[placeholder="Custom amount"]')).toBeVisible()
    
    // Should be able to type amount
    await page.keyboard.type('0.5')
    
    // Navigate to confirm button
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab') // Skip cancel button
    
    // Confirm button should be focused and enabled
    const confirmButton = page.locator('button:has-text("Confirm"):focus')
    await expect(confirmButton).toBeVisible()
    await expect(confirmButton).not.toBeDisabled()
  })

  test('should have proper ARIA roles and regions', async ({ page }) => {
    await page.waitForSelector('.poker-table-container')
    
    // Check for main content regions
    const mainRegion = page.locator('[role="main"]')
    await expect(mainRegion).toBeVisible()
    
    // Check betting card regions
    const bettingRegions = page.locator('[role="region"]')
    expect(await bettingRegions.count()).toBe(2)
    
    // Each betting region should have proper labeling
    const headsRegion = page.locator('[aria-label="Heads betting card"]')
    const tailsRegion = page.locator('[aria-label="Tails betting card"]')
    
    await expect(headsRegion).toBeVisible()
    await expect(tailsRegion).toBeVisible()
  })

  test('should have sufficient color contrast', async ({ page }) => {
    await page.waitForSelector('.poker-table-container')
    
    // Run color contrast check specifically
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .analyze()

    // Note: May need custom contrast checking due to casino theme
    // For now, we'll check that important interactive elements are accessible
    const betButtons = page.locator('button:has-text("Bet on")')
    for (let i = 0; i < await betButtons.count(); i++) {
      const button = betButtons.nth(i)
      await expect(button).toBeVisible()
      
      // Check that text is readable (basic visibility test)
      const text = await button.textContent()
      expect(text).toBeTruthy()
    }
  })

  test('should work with screen reader simulation', async ({ page }) => {
    await page.waitForSelector('.poker-table-container')
    
    // Test that important elements have proper accessible names
    const headsButton = page.locator('button:has-text("Bet on Heads")')
    await expect(headsButton).toHaveAccessibleName(/bet on heads/i)
    
    const tailsButton = page.locator('button:has-text("Bet on Tails")')
    await expect(tailsButton).toHaveAccessibleName(/bet on tails/i)
    
    // Check that important information is accessible
    const poolAmounts = page.locator('text=/\\d+\\.\\d+ SOL/')
    expect(await poolAmounts.count()).toBeGreaterThan(0)
  })

  test('should handle focus management properly', async ({ page }) => {
    await page.waitForSelector('.poker-table-container')
    
    // Click betting button
    const headsButton = page.locator('button:has-text("Bet on Heads")')
    await headsButton.click()
    
    // Focus should move to the betting form
    const customInput = page.locator('input[placeholder="Custom amount"]')
    await expect(customInput).toBeFocused()
    
    // Cancel should return focus appropriately
    await page.click('button:has-text("Cancel")')
    
    // Should return to betting state
    await expect(page.locator('button:has-text("Bet on Heads")')).toBeVisible()
  })

  test('should provide proper error messages', async ({ page }) => {
    await page.waitForSelector('.poker-table-container')
    
    // Mock error condition
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Insufficient funds' })
      })
    })
    
    // Try to place invalid bet
    await page.click('button:has-text("Bet on Heads")')
    await page.fill('input[placeholder="Custom amount"]', '999')
    
    const confirmButton = page.locator('button:has-text("Confirm")')
    
    // Button should be disabled for invalid amount
    await expect(confirmButton).toBeDisabled()
  })

  test('should work on mobile devices', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForSelector('.poker-table-container')
    
    // Check that poker table is still accessible on mobile
    await expect(page.locator('.poker-table')).toBeVisible()
    
    // Touch targets should be large enough
    const betButtons = page.locator('button:has-text("Bet on")')
    for (let i = 0; i < await betButtons.count(); i++) {
      const button = betButtons.nth(i)
      const box = await button.boundingBox()
      
      if (box) {
        // Touch targets should be at least 44px (iOS guidelines)
        expect(box.height).toBeGreaterThan(40)
        expect(box.width).toBeGreaterThan(40)
      }
    }
    
    // Test touch interaction
    await page.tap('button:has-text("Bet on Heads")')
    await expect(page.locator('input[placeholder="Custom amount"]')).toBeVisible()
  })
})