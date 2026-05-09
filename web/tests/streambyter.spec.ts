// tests/streambyter.spec.ts

import { test, expect } from '@playwright/test';

test('user can add a rule', async ({ page }) => {
  await page.goto('/streambyter');

  await page.getByTestId('add-rule').click();

  await expect(
    page.getByTestId('rule-row')
  ).toHaveCount(1);
});

test('user can duplicate rule', async ({ page }) => {
  await page.goto('/streambyter');

  await page.getByTestId('add-rule').click();

  await expect(
    page.getByTestId('rule-row')
  ).toHaveCount(1);

  await page
    .getByTestId('duplicate-rule')
    .first()
    .click();

  await expect(
    page.getByTestId('rule-row')
  ).toHaveCount(2);
});

test('user can generate script', async ({ page }) => {
  await page.goto('/streambyter');

  await page.getByTestId('add-rule').click();

  await page.getByTestId('generate-script').click();

  await expect(
    page.getByTestId('generated-script')
  ).not.toBeEmpty();
});

test('user can delete rule', async ({ page }) => {
  await page.goto('/streambyter');

  await page.getByTestId('add-rule').click();

  await expect(
    page.getByTestId('rule-row')
  ).toHaveCount(1);

  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('confirm');
    await dialog.accept();
  });

  const rule = page.getByTestId('rule-row').first();

  await rule
    .getByTestId('delete-rule')
    .click();

  await expect(
    page.getByTestId('rule-row')
  ).toHaveCount(0);
});

test('user can import config', async ({ page }) => {
  await page.goto('/streambyter');

  await page.setInputFiles(
    'input[type="file"]',
    'tests/fixtures/example.json'
  );

  await expect(
    page.getByTestId('rule-row')
  ).toHaveCount(3);
});

test('user can export json', async ({ page }) => {
  await page.goto('/streambyter');

  await page.getByTestId('add-rule').click();

  const downloadPromise =
    page.waitForEvent('download');

  await page.getByTestId('export-json').click();

  const download = await downloadPromise;

  expect(download.suggestedFilename())
    .toContain('.json');
});

test('user can reorder rules', async ({ page }) => {
  await page.goto('/streambyter');

  await page.getByTestId('add-rule').click();
  await page.getByTestId('add-rule').click();

  const first = page.getByTestId('rule-row').nth(0);
  const second = page.getByTestId('rule-row').nth(1);

  await first.dragTo(second);

  await expect(
    page.getByTestId('rule-row').nth(0)
  ).toBeVisible();
});