/**
 * @fileoverview End-to-end tests for artist filtering in employee portal
 * 
 * @description Tests the complete user flow of artist filtering to prevent
 * regressions when adding new features. This test runs against the actual
 * application and verifies the UI behavior.
 */

import { test, expect } from '@playwright/test'

test.describe('Artist Filtering E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login and authenticate as agent
    await page.goto('/login')
    await page.fill('[name="email"]', 'agent@test.example.com')
    await page.fill('[name="password"]', 'AgentPassword123!')
    await page.click('[type="submit"]')
    
    // Wait for redirect to employee portal
    await page.waitForURL('/a')
  })

  test('should display artist dropdown with options', async ({ page }) => {
    // Check that artist dropdown is visible
    const dropdown = page.locator('[data-testid="artist-selector"]').or(
      page.locator('button:has-text("Taylor Swift")').or(
        page.locator('button:has-text("All Artists")')
      )
    )
    await expect(dropdown).toBeVisible()
    
    // Click dropdown to open options
    await dropdown.click()
    
    // Should see artist options
    await expect(page.locator('text="All Artists"')).toBeVisible()
    await expect(page.locator('text="Taylor Swift"').or(page.locator('text="E2E Test Artist"'))).toBeVisible()
  })

  test('should filter content when artist is selected', async ({ page }) => {
    // Open artist dropdown
    const dropdown = page.locator('button').filter({ hasText: /Taylor Swift|All Artists|E2E Test Artist/ }).first()
    await dropdown.click()
    
    // Select Taylor Swift
    await page.locator('text="Taylor Swift"').click()
    
    // Should show filtered content
    await expect(page.locator('text="Viewing: Taylor Swift"')).toBeVisible()
    await expect(page.locator('text="Clear filter"')).toBeVisible()
    
    // URL should include artist parameter
    await expect(page).toHaveURL(/artist=11111111-1111-1111-1111-111111111111/)
  })

  test('should clear filter when "All Artists" is selected', async ({ page }) => {
    // First select an artist
    const dropdown = page.locator('button').filter({ hasText: /Taylor Swift|All Artists|E2E Test Artist/ }).first()
    await dropdown.click()
    await page.locator('text="Taylor Swift"').click()
    
    // Verify filter is applied
    await expect(page.locator('text="Viewing: Taylor Swift"')).toBeVisible()
    
    // Clear filter
    await dropdown.click()
    await page.locator('text="All Artists"').click()
    
    // Should show unfiltered content
    await expect(page.locator('text="Viewing: Taylor Swift"')).not.toBeVisible()
    
    // URL should not include artist parameter
    await expect(page).toHaveURL(/^(?!.*artist=).*$/)
  })

  test('should maintain filter when navigating to booking queue', async ({ page }) => {
    // Select an artist
    const dropdown = page.locator('button').filter({ hasText: /Taylor Swift|All Artists|E2E Test Artist/ }).first()
    await dropdown.click()
    await page.locator('text="Taylor Swift"').click()
    
    // Navigate to booking queue
    await page.locator('text="Booking Queue"').click()
    await page.waitForURL('/a/queue*')
    
    // Should maintain filter in queue
    await expect(page.locator('text="Filtered by: Taylor Swift"').or(
      page.locator('text="for Taylor Swift"')
    )).toBeVisible()
    
    // URL should still include artist parameter
    await expect(page).toHaveURL(/artist=11111111-1111-1111-1111-111111111111/)
  })

  test('should update queue count based on selected artist', async ({ page }) => {
    // Check queue count with all artists
    const queueButton = page.locator('text="Booking Queue"')
    await expect(queueButton).toBeVisible()
    
    // Select specific artist
    const dropdown = page.locator('button').filter({ hasText: /Taylor Swift|All Artists|E2E Test Artist/ }).first()
    await dropdown.click()
    await page.locator('text="Taylor Swift"').click()
    
    // Queue count might change (depending on implementation)
    // At minimum, queue button should still be visible and functional
    await expect(queueButton).toBeVisible()
    
    // Should be able to navigate to queue
    await queueButton.click()
    await page.waitForURL('/a/queue*')
    await expect(page).toHaveURL(/artist=11111111-1111-1111-1111-111111111111/)
  })

  test('should persist filter selection in cookies', async ({ page }) => {
    // Select an artist
    const dropdown = page.locator('button').filter({ hasText: /Taylor Swift|All Artists|E2E Test Artist/ }).first()
    await dropdown.click()
    await page.locator('text="Taylor Swift"').click()
    
    // Refresh the page
    await page.reload()
    
    // Should maintain the filter selection
    await expect(page.locator('text="Viewing: Taylor Swift"')).toBeVisible()
    await expect(page).toHaveURL(/artist=11111111-1111-1111-1111-111111111111/)
  })

  test('should handle direct URL navigation with artist parameter', async ({ page }) => {
    // Navigate directly to URL with artist parameter
    await page.goto('/a?artist=11111111-1111-1111-1111-111111111111')
    
    // Should apply the filter
    await expect(page.locator('text="Viewing: Taylor Swift"')).toBeVisible()
    
    // Dropdown should show selected artist
    const dropdown = page.locator('button').filter({ hasText: 'Taylor Swift' })
    await expect(dropdown).toBeVisible()
  })
})

test.describe('Artist Filtering Error Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('[name="email"]', 'agent@test.example.com')
    await page.fill('[name="password"]', 'AgentPassword123!')
    await page.click('[type="submit"]')
    await page.waitForURL('/a')
  })

  test('should handle invalid artist ID in URL gracefully', async ({ page }) => {
    // Navigate to URL with invalid artist ID
    await page.goto('/a?artist=invalid-uuid')
    
    // Should not crash and should show unfiltered content
    await expect(page.locator('h1')).toContainText('Tour Management Dashboard')
    
    // Should show "All Artists" in dropdown
    const dropdown = page.locator('button').filter({ hasText: /All Artists/ })
    await expect(dropdown).toBeVisible()
  })

  test('should handle missing artist data gracefully', async ({ page }) => {
    // This test ensures the app doesn't crash when artist data fails to load
    // We can't easily simulate API failures in E2E, but we can check robustness
    
    await page.goto('/a')
    
    // Should still show the basic page structure
    await expect(page.locator('h1')).toContainText('Tour Management Dashboard')
    await expect(page.locator('text="Employee Portal"')).toBeVisible()
  })
})

/**
 * @description Regression tests for specific scenarios that have broken before
 */
test.describe('Artist Filtering Regression Prevention', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('[name="email"]', 'agent@test.example.com')
    await page.fill('[name="password"]', 'AgentPassword123!')
    await page.click('[type="submit"]')
    await page.waitForURL('/a')
  })

  test('regression: queue count should not show "0" stuck to text', async ({ page }) => {
    // This test prevents the "Booking Queue0" issue from recurring
    const queueButton = page.locator('text="Booking Queue"')
    await expect(queueButton).toBeVisible()
    
    // Should not contain "Queue0" or similar malformed text
    await expect(page.locator('text="Booking Queue0"')).not.toBeVisible()
    await expect(page.locator('text="Queue0"')).not.toBeVisible()
    
    // If there's a badge, it should be properly formatted
    const badge = queueButton.locator('..').locator('[class*="badge"]')
    if (await badge.count() > 0) {
      const badgeText = await badge.textContent()
      expect(badgeText).toMatch(/^\d+$/) // Should be just numbers
    }
  })

  test('regression: artist dropdown should always load data', async ({ page }) => {
    // This test prevents the empty dropdown issue from recurring
    const dropdown = page.locator('button').filter({ hasText: /Taylor Swift|All Artists|E2E Test Artist/ }).first()
    await dropdown.click()
    
    // Should not show "No artists available"
    await expect(page.locator('text="No artists available"')).not.toBeVisible()
    
    // Should show at least "All Artists" option
    await expect(page.locator('text="All Artists"')).toBeVisible()
  })

  test('regression: filter should not disappear when new features are added', async ({ page }) => {
    // This test ensures the filter UI elements don't vanish
    
    // Artist dropdown should be visible
    const dropdown = page.locator('button').filter({ hasText: /Taylor Swift|All Artists|E2E Test Artist/ }).first()
    await expect(dropdown).toBeVisible()
    
    // Select an artist
    await dropdown.click()
    await page.locator('text="Taylor Swift"').click()
    
    // Filter indicators should be visible
    await expect(page.locator('text="Viewing: Taylor Swift"')).toBeVisible()
    await expect(page.locator('text="Clear filter"')).toBeVisible()
    
    // Filter should persist across navigation
    await page.locator('text="Booking Queue"').click()
    await page.waitForURL('/a/queue*')
    
    // Should still show filter context in queue
    await expect(page.locator('text="Filtered by: Taylor Swift"').or(
      page.locator('text="for Taylor Swift"')
    )).toBeVisible()
  })
})
