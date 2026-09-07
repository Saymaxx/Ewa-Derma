import { test, expect } from '@playwright/test';

test.describe('Authentication and RBAC Flow', () => {
  test('should login with admin credentials and reach dashboard', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/Ewa Derma Clinic/i);

    // Click Admin quick-role button or fill form
    const adminButton = page.locator('button:has-text("Admin")').first();
    if (await adminButton.isVisible()) {
      await adminButton.click();
    } else {
      await page.fill('input#identifier, input[name="identifier"], input[placeholder*="email"]', 'admin@ewaderma.com');
      await page.fill('input#password, input[name="password"], input[type="password"]', 'Clinic@12345');
    }

    await page.click('button[type="submit"]');

    // Should navigate to dashboard
    await page.waitForURL('**/dashboard');
    await expect(page.locator('h1, h2, span').filter({ hasText: /Dashboard/i }).first()).toBeVisible();

    // Verify user role badge in header
    await expect(page.locator('text=ADMIN').first()).toBeVisible();
  });

  test('should navigate to clinic settings as Admin', async ({ page }) => {
    await page.goto('/login');
    const adminButton = page.locator('button:has-text("Admin")').first();
    if (await adminButton.isVisible()) {
      await adminButton.click();
    }
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Click Clinic Settings in Sidebar
    await page.click('a[href="/settings"]');
    await page.waitForURL('**/settings');
    await expect(page.locator('h1').filter({ hasText: /Clinic Settings/i })).toBeVisible();
  });

  test('should navigate to audit logs as Admin', async ({ page }) => {
    await page.goto('/login');
    const adminButton = page.locator('button:has-text("Admin")').first();
    if (await adminButton.isVisible()) {
      await adminButton.click();
    }
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Click Audit Logs in Sidebar
    await page.click('a[href="/audit-logs"]');
    await page.waitForURL('**/audit-logs');
    await expect(page.locator('h1').filter({ hasText: /System Audit Logs/i })).toBeVisible();
  });
});
