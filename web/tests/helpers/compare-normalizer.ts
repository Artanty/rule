import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * remove name and date (2 strings, starting with <string>):
 * <string># add1clean
   # Generated: 09.05.2026, 11:55:59
 * */
function extractAndNormalizeScript(xmlContent: string): string {
  const match = xmlContent.match(/<string>([\s\S]*?)<\/string>/);
  if (!match) return '';
  
  const lines = match[1].split('\n');
  
  // Skip first 2 lines (title and generated timestamp)
  const remainingLines = lines.slice(2);
  
  return remainingLines.join('\n').trim();
}

// Helper function to download the generated script and compare it with a golden file
export async function compareGeneratedWithGolden(page, goldenFilePath) {
  // Generate script
  await page.getByTestId('generate-script').click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('export-sbr').click();
  const downloadedFile = await downloadPromise;
  
  // Ensure the downloads directory exists
  const downloadsDir = path.join(__dirname, '..', './downloads');
  if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir);
  }

  const generatedFilePath = path.join(downloadsDir, downloadedFile.suggestedFilename());
  await downloadedFile.saveAs(generatedFilePath);

  // Read golden file and generated script
  const goldenContent = await readFile(goldenFilePath, 'utf8');
  const generatedContent = await readFile(generatedFilePath, 'utf8');

  const normalizedGoldenContent = extractAndNormalizeScript(goldenContent);
  const normalizedGeneratedContent = extractAndNormalizeScript(generatedContent);
  
  // localStorage.setItem('testItem', 'gogogo');
  
  expect(normalizedGoldenContent).toBe(normalizedGeneratedContent);
}

// Helper function to read files as text
async function readFile(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}
