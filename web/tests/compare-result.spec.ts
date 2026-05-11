import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { compareGeneratedWithGolden } from './helpers/compare-normalizer';

// Save 'gogogo' to localStorage before running the test
test.beforeEach(async ({ page }) => {
  await page.context().storageState({
    cookies: [],
    origins: [
      {
        // origin: "http://example.com", // Adjust this URL as needed
        origin: "localhost:5173",
        localStorage: [{ name: 'testValue', value: 'gogogo' }]
      }
    ]
  });
});

// Use the saved state in your test
test('user can generate script and compare with golden', async ({ page }) => {
  await page.goto('/streambyter');

  // Retrieve the value from localStorage to use it in assertions or actions
  const storageState = await page.context().storageState();
  const testValue = storageState.origins[0].localStorage.find(item => item.name === 'testValue')?.value;
  console.log(`Retrieved testValue: ${testValue}`); // Optional: Log the retrieved value for debugging

  await page.getByTestId('add-rule').click();

  await page.getByTestId('generate-script').click();

  const goldenFilePath = path.join(__dirname, '..', 'tests', 'fixtures', 'add1clean.sbr');
  await compareGeneratedWithGolden(page, goldenFilePath);
});
