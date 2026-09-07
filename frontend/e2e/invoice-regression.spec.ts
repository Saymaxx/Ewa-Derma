import { test, expect } from '@playwright/test';

test.describe('Invoice Creation & Display (Double Wrapping Regression Guard)', () => {
  test('should load invoice list table without response wrapping errors', async ({ page }) => {
    // 1. Login as Receptionist / Admin
    await page.goto('/login');
    const adminButton = page.locator('button:has-text("Admin")').first();
    if (await adminButton.isVisible()) {
      await adminButton.click();
    }
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // 2. Navigate to Invoices
    await page.goto('/invoices');
    await page.waitForURL('**/invoices');
    await expect(page.locator('h1').filter({ hasText: /Billing & Invoices/i })).toBeVisible();

    // 3. Verify Table is rendered properly and not empty error state
    const table = page.locator('table');
    await expect(table).toBeVisible();

    // Confirm table headers exist
    await expect(page.locator('th').filter({ hasText: /Invoice/i }).first()).toBeVisible();
    await expect(page.locator('th').filter({ hasText: /Patient/i }).first()).toBeVisible();
    await expect(page.locator('th').filter({ hasText: /Status/i }).first()).toBeVisible();
  });
});
