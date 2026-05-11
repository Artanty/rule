import { test, expect } from '@playwright/test';

test('user can import a pre-defined producer mapping', async ({ page }) => {
  const type = 'producer'
  const localStorageKey = 'mmv3_trigger_mappings';

  await page.goto('/streambyter');

  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByTestId('map-' + type + '-import').click()
  ]);

  // Set the path to your example JSON file
  await fileChooser.setFiles('/Users/artyomantoshkin/server/rule/web/tests/fixtures/producer-mappings-2026-05-09T16_49_20.json');


  const first = page.getByTestId('map-' + type + '-mapping-edit').nth(0).click();

  // Wait for the import process to complete and rules to appear
  await expect(page.getByTestId('map-' + type + '-rule-of-editing-map')).toHaveCount(8);

  const hasLocalStorageKey = await page.evaluate(`!!window.localStorage.getItem(${JSON.stringify(localStorageKey)})`);
  expect(hasLocalStorageKey).toBeTruthy();
});


test('user can import a pre-defined consumer mapping', async ({ page }) => {
  const type = 'consumer'
  const localStorageKey = 'mmv3_consumer_mappings';

  await page.goto('/streambyter');

  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByTestId('map-' + type + '-import').click()
  ]);

  // Set the path to your example JSON file
  await fileChooser.setFiles('/Users/artyomantoshkin/server/rule/web/tests/fixtures/consumer-mappings-2026-05-09T17_25_29.json');


  const first = page.getByTestId('map-' + type + '-mapping-edit').nth(0).click();

  // Wait for the import process to complete and rules to appear
  await expect(page.getByTestId('map-' + type + '-rule-of-editing-map')).toHaveCount(28);

  const hasLocalStorageKey = await page.evaluate(`!!window.localStorage.getItem(${JSON.stringify(localStorageKey)})`);
  expect(hasLocalStorageKey).toBeTruthy();
});