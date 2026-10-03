import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = ['/citizen', '/citizen/request', '/citizen/rewards', '/citizen/sorting'];
const MODES = ['light', 'dark'];

test.describe('Citizen Portal Accessibility & Data', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/');
    // Just mock localStorage directly to bypass login UI for speed
    await page.evaluate(() => {
      localStorage.setItem('user', JSON.stringify({
        id: 1, role: 'citizen', name: 'John Doe', level: 'Sapling', eco_points: 250, token: 'mock-jwt'
      }));
    });
  });

  for (const mode of MODES) {
    for (const route of PAGES) {
      test(`Accessibility check on ${route} (${mode} mode)`, async ({ page }) => {
        await page.goto(`http://localhost:3000${route}`);
        
        // Force dark mode if needed
        if (mode === 'dark') {
          await page.evaluate(() => document.documentElement.classList.add('dark'));
        } else {
          await page.evaluate(() => document.documentElement.classList.remove('dark'));
        }

        // Wait for animation/render
        await page.waitForTimeout(1000);

        // Run Axe
        const accessibilityScanResults = await new AxeBuilder({ page })
          .withTags(['wcag2aa', 'wcag21aa'])
          .analyze();

        const colorContrastViolations = accessibilityScanResults.violations.filter(v => v.id === 'color-contrast');
        
        // Assert no color contrast issues
        expect(colorContrastViolations, `Contrast issues found on ${route} in ${mode} mode: ${JSON.stringify(colorContrastViolations, null, 2)}`).toEqual([]);
        
        // Check buttons and empty labels
        const buttons = await page.locator('button').all();
        for (const btn of buttons) {
          const text = await btn.textContent();
          const aria = await btn.getAttribute('aria-label');
          const hasLabel = (text && text.trim().length > 0) || (aria && aria.trim().length > 0);
          expect(hasLabel, `Empty button label found on ${route}`).toBe(true);
        }
      });
    }
  }
});
