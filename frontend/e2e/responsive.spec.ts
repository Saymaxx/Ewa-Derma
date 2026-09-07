import { test, expect } from '@playwright/test';

test.describe('Responsive Navigation & Mobile Drawer', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // Mobile Viewport

  test('should display hamburger menu and open/close drawer on mobile', async ({ page }) => {
    await page.goto('/login');
    const adminButton = page.locator('button:has-text("Admin")').first();
    if (await adminButton.isVisible()) {
      await adminButton.click();
    }
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // On mobile, desktop sidebar should be hidden
    const desktopSidebar = page.locator('aside.hidden.lg\\:flex');
    await expect(desktopSidebar).toBeHidden();

    // Hamburger button should be visible in Navbar
    const hamburgerBtn = page.locator('button[aria-label*="navigation menu"]');
    await expect(hamburgerBtn).toBeVisible();

    // Click hamburger button to open mobile drawer
    await hamburgerBtn.click();

    // Mobile drawer should now be visible
    const mobileDrawer = page.locator('aside.relative.z-50');
    await expect(mobileDrawer).toBeVisible();

    // Close button should be visible in mobile drawer
    const closeBtn = page.locator('button[aria-label="Close menu"]');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    // Drawer should close
    await expect(mobileDrawer).toBeHidden();
  });
});
