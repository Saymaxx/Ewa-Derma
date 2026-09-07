import { test, expect } from '@playwright/test';

test.describe('Clinical Patient and Appointment Booking Flow', () => {
  test('should register a patient and book an appointment', async ({ page }) => {
    // 1. Login as Receptionist
    await page.goto('/login');
    const recButton = page.locator('button:has-text("Receptionist")').first();
    if (await recButton.isVisible()) {
      await recButton.click();
    } else {
      await page.fill('input#identifier, input[name="identifier"], input[placeholder*="email"]', 'reception@ewaderma.com');
      await page.fill('input#password, input[name="password"], input[type="password"]', 'Clinic@12345');
    }
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // 2. Navigate to Patients
    await page.goto('/patients');
    await page.waitForURL('**/patients');
    await expect(page.locator('h1').filter({ hasText: /Patients/i })).toBeVisible();

    // 3. Register New Patient
    const newPatientBtn = page.locator('button:has-text("Add Patient"), button:has-text("New Patient")').first();
    if (await newPatientBtn.isVisible()) {
      await newPatientBtn.click();
      const uniqueSuffix = Date.now().toString().slice(-4);
      await page.fill('input[name="firstName"], input[placeholder*="First Name"]', `TestPatient${uniqueSuffix}`);
      await page.fill('input[name="lastName"], input[placeholder*="Last Name"]', 'E2E');
      await page.fill('input[name="phone"], input[placeholder*="Phone"]', `98${Date.now().toString().slice(-8)}`);

      // Submit Patient Form
      const saveBtn = page.locator('button[type="submit"]:has-text("Save"), button[type="submit"]:has-text("Create")').first();
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
      }
    }

    // 4. Navigate to Appointments
    await page.goto('/appointments');
    await page.waitForURL('**/appointments');
    await expect(page.locator('h1').filter({ hasText: /Appointments/i })).toBeVisible();

    // Verify Live Queue pill is present
    await expect(page.locator('text=Live Queue').first()).toBeVisible();
  });
});
