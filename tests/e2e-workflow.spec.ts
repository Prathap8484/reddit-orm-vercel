import { test, expect } from '@playwright/test';

// Target URL for the application environment
const APP_URL = 'https://scriptio.in'; 

test.describe('Web Application UI & Workflow Automation Suite', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the base URL before each test
    await page.goto(APP_URL);
  });

  test('Navigation Integrity: Main menu and routing', async ({ page }) => {
    // Target common navigation items (adjust text to match your header links)
    const pricingLink = page.getByRole('link', { name: /Pricing|Pass/i });
    
    if (await pricingLink.isVisible()) {
      await pricingLink.click();
      await expect(page).toHaveURL(/.*pricing|.*pass/);
    }
  });

  test('Button Interactivity: Primary Call to Action', async ({ page }) => {
    // Target the main onboarding or entrance button
    const mainCta = page.getByRole('button', { name: /Get Started|Try Now|Sign In/i });
    
    if (await mainCta.isVisible()) {
      await expect(mainCta).toBeEnabled();
      await mainCta.click();
    }
  });

  test('The Core Workflow: Input Submission and Generation', async ({ page }) => {
    // Simulate a user entering data into the core input field
    const mainInput = page.getByPlaceholder(/Enter topic|prompt|video/i).first();
    
    if (await mainInput.isVisible()) {
      await mainInput.fill('Testing automated generation workflow');
      
      // Click the submission trigger
      const submitBtn = page.getByRole('button', { name: /Generate|Submit|Create/i });
      await submitBtn.click();
      
      // Verify a loading element or output area displays
      const progressIndicator = page.locator('.spinner, .loading, #output-container').first();
      await expect(progressIndicator).toBeVisible({ timeout: 10000 });
    }
  });

  test('Error Handling: Empty form validation', async ({ page }) => {
    const submitBtn = page.getByRole('button', { name: /Generate|Submit|Create/i }).first();
    
    if (await submitBtn.isVisible()) {
      // Intentionally trigger an empty submission to test validation mechanics
      await submitBtn.click();
      
      // Assert that an error alert or validation styling appears
      const validationAlert = page.locator('.error, .warning, .text-red-500, [role="alert"]').first();
      await expect(validationAlert).toBeVisible();
    }
  });
});
