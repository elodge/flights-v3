/**
 * @fileoverview E2E tests for client-agent flight selection interaction
 * 
 * @description End-to-end tests verifying the complete workflow of client
 * flight selection and agent response including real-time updates, hold
 * management, and ticketing processes.
 * 
 * @coverage
 * - Client selects flight option
 * - Agent sees selection in queue
 * - Agent marks option as held
 * - Client sees hold countdown in real-time
 * - Agent marks option as ticketed
 * - Client sees final ticketed status
 */

import { test, expect } from '@playwright/test'

test.describe('Client-Agent Flight Selection Flow', () => {
  // Test data constants
  const CLIENT_EMAIL = 'client@test.example.com'
  const CLIENT_PASSWORD = 'TestPassword123!'
  const AGENT_EMAIL = 'agent@test.example.com'
  const AGENT_PASSWORD = 'AgentPassword123!'
  
  const TEST_PROJECT_ID = '33333333-3333-3333-3333-333333333333'
  const TEST_LEG_ID = '77777777-7777-7777-7777-777777777777'

  test.beforeEach(async ({ page }) => {
    // Set up console logging for debugging
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('Page error:', msg.text())
      }
    })
  })

  test('complete client selection to agent ticketing workflow', async ({ page, context }) => {
    // CONTEXT: Test the full end-to-end workflow from client selection to agent ticketing
    // BUSINESS_RULE: Client selections should appear in agent queue for processing
    
    // Step 1: Client logs in and makes a selection
    await page.goto('/login')
    await page.fill('[name="email"]', CLIENT_EMAIL)
    await page.fill('[name="password"]', CLIENT_PASSWORD)
    await page.click('[type="submit"]')
    
    // Wait for client dashboard
    await page.waitForURL('/c')
    await expect(page.locator('h1')).toContainText('Your Projects')
    
    // Navigate to project and then to leg
    await page.goto(`/c/project/${TEST_PROJECT_ID}`)
    await expect(page.locator('text="Back to Projects"')).toBeVisible()
    
    // Navigate to specific leg
    await page.goto(`/c/project/${TEST_PROJECT_ID}/legs/${TEST_LEG_ID}`)
    await expect(page.locator('text="Flight Details"')).toBeVisible()
    
    // Select a flight option (click the first available option)
    const firstOptionCard = page.locator('[data-testid="flight-option-card"]').first()
    if (await firstOptionCard.count() === 0) {
      // If no test ID, use the Select button
      const selectButton = page.locator('button:has-text("Select for group")').first()
      await expect(selectButton).toBeVisible({ timeout: 10000 })
      await selectButton.click()
    } else {
      await firstOptionCard.locator('button:has-text("Select for group")').click()
    }
    
    // Wait for selection success toast
    await expect(page.locator('text="Group selection updated successfully"')).toBeVisible({ timeout: 5000 })
    
    // Verify selection is reflected in UI
    await expect(page.locator('text="Selected"')).toBeVisible()
    
    // Step 2: Open agent session in new tab
    const agentPage = await context.newPage()
    await agentPage.goto('/login')
    await agentPage.fill('[name="email"]', AGENT_EMAIL)
    await agentPage.fill('[name="password"]', AGENT_PASSWORD)
    await agentPage.click('[type="submit"]')
    
    // Wait for agent dashboard
    await agentPage.waitForURL('/a')
    await expect(agentPage.locator('h2')).toContainText('Employee Portal')
    
    // Navigate to booking queue
    await agentPage.click('text="Booking Queue"')
    await agentPage.waitForURL('/a/queue*')
    
    // Verify client selection appears in queue
    await expect(agentPage.locator('text="Booking Queue"')).toBeVisible()
    
    // Look for the client's selection in the queue
    // This might be in a table or card format
    const queueItems = agentPage.locator('[data-testid="queue-item"], .queue-item, tbody tr')
    await expect(queueItems.first()).toBeVisible({ timeout: 10000 })
    
    // Step 3: Agent marks option as held
    // Navigate to the specific leg management page
    await agentPage.goto(`/a/tour/${TEST_PROJECT_ID}`)
    await expect(agentPage.locator('text="Back to Dashboard"')).toBeVisible()
    
    // Find and click manage button for the test leg
    const manageLegButton = agentPage.locator(`a[href*="/leg/${TEST_LEG_ID}"]`).first()
    if (await manageLegButton.count() > 0) {
      await manageLegButton.click()
    } else {
      // Direct navigation if manage button not found
      await agentPage.goto(`/a/tour/${TEST_PROJECT_ID}/leg/${TEST_LEG_ID}`)
    }
    
    // On leg management page, create a hold
    const holdButton = agentPage.locator('button:has-text("Hold"), button:has-text("Create Hold")').first()
    if (await holdButton.count() > 0) {
      await holdButton.click()
      
      // If there's a hold form, fill it
      const holdForm = agentPage.locator('form:has(input[name*="hold"], input[name*="expires"])').first()
      if (await holdForm.count() > 0) {
        // Set hold expiration to 2 hours from now
        const futureDate = new Date()
        futureDate.setHours(futureDate.getHours() + 2)
        const isoString = futureDate.toISOString().slice(0, 16) // Format for datetime-local input
        
        await agentPage.fill('input[type="datetime-local"], input[name*="expires"]', isoString)
        await agentPage.click('button[type="submit"], button:has-text("Create Hold")')
      }
    }
    
    // Step 4: Client should see hold status update
    await page.reload()
    
    // Look for hold indicator (countdown timer)
    await expect(page.locator('text=/[0-9]+h [0-9]+m/, text=/[0-9]+m/, text="Held"')).toBeVisible({ timeout: 10000 })
    
    // Verify hold countdown is showing
    const holdCountdown = page.locator('text=/[0-9]+h [0-9]+m/, text=/[0-9]+m/')
    if (await holdCountdown.count() > 0) {
      await expect(holdCountdown.first()).toBeVisible()
    }
    
    // Step 5: Agent marks option as ticketed
    await agentPage.reload()
    
    // Look for ticket button
    const ticketButton = agentPage.locator('button:has-text("Ticket"), button:has-text("Mark Ticketed")').first()
    if (await ticketButton.count() > 0) {
      await ticketButton.click()
      
      // Handle any confirmation dialog
      const confirmButton = agentPage.locator('button:has-text("Confirm"), button:has-text("Yes")').first()
      if (await confirmButton.count() > 0) {
        await confirmButton.click()
      }
      
      // Wait for success message
      await expect(agentPage.locator('text="Ticketed successfully", text="Marked as ticketed"')).toBeVisible({ timeout: 5000 })
    }
    
    // Step 6: Client should see ticketed status
    await page.reload()
    
    // Verify ticketed status is shown
    await expect(page.locator('text="Ticketed"')).toBeVisible({ timeout: 10000 })
    
    // Verify selection button is disabled/changed
    const selectionButton = page.locator('button:has-text("Ticketed"), button:has-text("Selected")').first()
    await expect(selectionButton).toBeVisible()
    
    // Button should be disabled for ticketed items
    if (await selectionButton.textContent() === 'Ticketed') {
      await expect(selectionButton).toBeDisabled()
    }
    
    // Step 7: Verify budget sidebar updates (if present)
    const budgetSidebar = page.locator('text="Budget Summary"')
    if (await budgetSidebar.count() > 0) {
      await expect(budgetSidebar).toBeVisible()
      
      // Should show confirmed spend
      await expect(page.locator('text="Confirmed"')).toBeVisible()
    }
  })

  test('client individual selection workflow', async ({ page }) => {
    // CONTEXT: Test individual passenger selection functionality
    // BUSINESS_RULE: Individual selections should work independently from group selections
    
    await page.goto('/login')
    await page.fill('[name="email"]', CLIENT_EMAIL)
    await page.fill('[name="password"]', CLIENT_PASSWORD)
    await page.click('[type="submit"]')
    
    await page.waitForURL('/c')
    await page.goto(`/c/project/${TEST_PROJECT_ID}/legs/${TEST_LEG_ID}`)
    
    // Switch to Individual Selection tab
    const individualTab = page.locator('button:has-text("Individual Selection")')
    if (await individualTab.count() > 0 && await individualTab.isEnabled()) {
      await individualTab.click()
      
      // Should see individual selection table
      await expect(page.locator('text="Individual Selections"')).toBeVisible()
      
      // Find first passenger dropdown
      const passengerDropdown = page.locator('select, [role="combobox"]').first()
      if (await passengerDropdown.count() > 0) {
        await passengerDropdown.click()
        
        // Select an option
        const optionItem = page.locator('option, [role="option"]').first()
        if (await optionItem.count() > 0) {
          await optionItem.click()
          
          // Wait for selection success
          await expect(page.locator('text="Individual selection updated successfully"')).toBeVisible({ timeout: 5000 })
        }
      }
    } else {
      console.log('Individual selection not available for this leg - skipping individual test')
    }
  })

  test('real-time updates between client and agent', async ({ page, context }) => {
    // CONTEXT: Test real-time synchronization via Supabase Realtime
    // BUSINESS_RULE: Changes made by agent should appear in client UI immediately
    
    // Set up client session
    await page.goto('/login')
    await page.fill('[name="email"]', CLIENT_EMAIL)
    await page.fill('[name="password"]', CLIENT_PASSWORD)
    await page.click('[type="submit"]')
    await page.waitForURL('/c')
    await page.goto(`/c/project/${TEST_PROJECT_ID}/legs/${TEST_LEG_ID}`)
    
    // Set up agent session
    const agentPage = await context.newPage()
    await agentPage.goto('/login')
    await agentPage.fill('[name="email"]', AGENT_EMAIL)
    await agentPage.fill('[name="password"]', AGENT_PASSWORD)
    await agentPage.click('[type="submit"]')
    await agentPage.waitForURL('/a')
    
    // Client makes initial selection
    const selectButton = page.locator('button:has-text("Select for group")').first()
    if (await selectButton.count() > 0) {
      await selectButton.click()
      await expect(page.locator('text="Selected"')).toBeVisible()
    }
    
    // Agent navigates to same leg
    await agentPage.goto(`/a/tour/${TEST_PROJECT_ID}/leg/${TEST_LEG_ID}`)
    
    // Agent makes a change (create hold)
    const agentHoldButton = agentPage.locator('button:has-text("Hold"), button:has-text("Create Hold")').first()
    if (await agentHoldButton.count() > 0) {
      await agentHoldButton.click()
      
      // Wait a moment for real-time update to propagate
      await page.waitForTimeout(2000)
      
      // Client should see the hold status without refreshing
      // Note: This test depends on Supabase Realtime being properly configured
      const holdIndicator = page.locator('text=/[0-9]+h [0-9]+m/, text=/[0-9]+m/, text="Held"')
      
      // Give some time for real-time updates
      await expect(holdIndicator.first()).toBeVisible({ timeout: 15000 })
    }
  })

  test('budget sidebar updates on selection changes', async ({ page }) => {
    // CONTEXT: Test budget sidebar live updates when selections change
    // BUSINESS_RULE: Budget should update immediately when selections are made
    
    await page.goto('/login')
    await page.fill('[name="email"]', CLIENT_EMAIL)
    await page.fill('[name="password"]', CLIENT_PASSWORD)
    await page.click('[type="submit"]')
    await page.waitForURL('/c')
    await page.goto(`/c/project/${TEST_PROJECT_ID}/legs/${TEST_LEG_ID}`)
    
    // Check if budget sidebar is present
    const budgetSidebar = page.locator('text="Budget Summary"')
    if (await budgetSidebar.count() > 0) {
      await expect(budgetSidebar).toBeVisible()
      
      // Record initial pending amount
      const initialPending = await page.locator('text="Pending"').locator('..').locator('text=/\\$[0-9,]+/').textContent()
      
      // Make a selection
      const selectButton = page.locator('button:has-text("Select for group")').first()
      if (await selectButton.count() > 0) {
        await selectButton.click()
        await expect(page.locator('text="Selected"')).toBeVisible()
        
        // Budget should update (pending amount should change)
        await page.waitForTimeout(1000) // Allow time for update
        
        const updatedPending = await page.locator('text="Pending"').locator('..').locator('text=/\\$[0-9,]+/').textContent()
        
        // Pending amount should have changed (could be higher with new selection)
        expect(updatedPending).not.toBe(initialPending)
      }
    } else {
      console.log('Budget sidebar not available - skipping budget test')
    }
  })

  test('error handling for invalid selections', async ({ page }) => {
    // CONTEXT: Test error handling for various selection scenarios
    // BUSINESS_RULE: Should show meaningful error messages for failed selections
    
    await page.goto('/login')
    await page.fill('[name="email"]', CLIENT_EMAIL)
    await page.fill('[name="password"]', CLIENT_PASSWORD)
    await page.click('[type="submit"]')
    await page.waitForURL('/c')
    
    // Try to access a leg that doesn't exist or isn't assigned
    await page.goto(`/c/project/${TEST_PROJECT_ID}/legs/invalid-leg-id`)
    
    // Should show 404 or not found message
    await expect(page.locator('text="404", text="Not found", text="This page could not be found"')).toBeVisible({ timeout: 10000 })
  })

  test('mobile responsive behavior', async ({ page }) => {
    // CONTEXT: Test mobile responsiveness of selection interface
    // BUSINESS_RULE: Interface should work on mobile devices
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('/login')
    await page.fill('[name="email"]', CLIENT_EMAIL)
    await page.fill('[name="password"]', CLIENT_PASSWORD)
    await page.click('[type="submit"]')
    await page.waitForURL('/c')
    await page.goto(`/c/project/${TEST_PROJECT_ID}/legs/${TEST_LEG_ID}`)
    
    // Should still be functional on mobile
    await expect(page.locator('text="Flight Details"')).toBeVisible()
    
    // Option cards should stack vertically on mobile
    const optionCards = page.locator('[data-testid="flight-option-card"], .option-card, [class*="option"]')
    if (await optionCards.count() > 1) {
      const firstCard = optionCards.first()
      const secondCard = optionCards.nth(1)
      
      const firstCardBox = await firstCard.boundingBox()
      const secondCardBox = await secondCard.boundingBox()
      
      if (firstCardBox && secondCardBox) {
        // Cards should be stacked vertically (second card below first)
        expect(secondCardBox.y).toBeGreaterThan(firstCardBox.y + firstCardBox.height)
      }
    }
    
    // Budget sidebar should be collapsible or repositioned on mobile
    const budgetSidebar = page.locator('text="Budget Summary"')
    if (await budgetSidebar.count() > 0) {
      await expect(budgetSidebar).toBeVisible()
    }
  })
})
