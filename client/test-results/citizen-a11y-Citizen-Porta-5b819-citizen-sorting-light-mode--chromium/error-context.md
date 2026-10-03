# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: citizen-a11y.spec.ts >> Citizen Portal Accessibility & Data >> Accessibility check on /citizen/sorting (light mode)
- Location: tests\citizen-a11y.spec.ts:21:7

# Error details

```
Error: Empty button label found on /citizen/sorting

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: null
```

# Page snapshot

```yaml
- generic [ref=f1e4]:
  - complementary [ref=f1e5]:
    - generic [ref=f1e6]: SmartWaste
    - generic [ref=f1e10]:
      - paragraph [ref=f1e11]: Logged in as
      - paragraph [ref=f1e12]: John Doe
    - navigation [ref=f1e13]:
      - generic [ref=f1e14]: Overview
    - button "Logout" [ref=f1e19] [cursor=pointer]
  - main [ref=f1e23]:
    - generic [ref=f1e24]:
      - heading "Dashboard" [level=2] [ref=f1e25]
      - generic [ref=f1e26]: J
    - generic [ref=f1e27]:
      - generic [ref=f1e30]:
        - button [ref=f1e31] [cursor=pointer]
        - heading "Welcome to SmartWaste!" [level=2] [ref=f1e40]
        - paragraph [ref=f1e41]: Let's take a quick tour to get you started on your eco journey.
        - generic [ref=f1e42]:
          - button "Skip" [ref=f1e43] [cursor=pointer]
          - button "Next" [ref=f1e44] [cursor=pointer]
      - generic [ref=f1e47]:
        - generic [ref=f1e48]:
          - heading "Sorting Guide" [level=2] [ref=f1e49]
          - paragraph [ref=f1e50]: Not sure where it goes? Search below.
        - textbox "e.g. pizza box, battery, bottle..." [ref=f1e55]
        - generic [ref=f1e56]:
          - generic [ref=f1e57]:
            - generic [ref=f1e58]:
              - heading "pizza box" [level=3] [ref=f1e59]
              - paragraph [ref=f1e60]: Greasy boxes cannot be recycled.
            - generic [ref=f1e63]: General Waste
          - generic [ref=f1e64]:
            - generic [ref=f1e65]:
              - heading "battery" [level=3] [ref=f1e66]
              - paragraph [ref=f1e67]: Never put batteries in general waste!
            - generic [ref=f1e70]: Hazardous
          - generic [ref=f1e71]:
            - generic [ref=f1e72]:
              - heading "glass bottle" [level=3] [ref=f1e73]
              - paragraph [ref=f1e74]: Rinse before recycling.
            - generic [ref=f1e77]: Recycling
          - generic [ref=f1e78]:
            - generic [ref=f1e79]:
              - heading "syringe" [level=3] [ref=f1e80]
              - paragraph [ref=f1e81]: Must go in a sharps container.
            - generic [ref=f1e84]: Medical
          - generic [ref=f1e85]:
            - generic [ref=f1e86]:
              - heading "old phone" [level=3] [ref=f1e87]
              - paragraph [ref=f1e88]: Drop at a certified center.
            - generic [ref=f1e91]: E-Waste
          - generic [ref=f1e92]:
            - generic [ref=f1e93]:
              - heading "banana peel" [level=3] [ref=f1e94]
              - paragraph [ref=f1e95]: Great for compost.
            - generic [ref=f1e98]: Compost
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import AxeBuilder from '@axe-core/playwright';
  3  | 
  4  | const PAGES = ['/citizen', '/citizen/request', '/citizen/rewards', '/citizen/sorting'];
  5  | const MODES = ['light', 'dark'];
  6  | 
  7  | test.describe('Citizen Portal Accessibility & Data', () => {
  8  |   // Login before each test
  9  |   test.beforeEach(async ({ page }) => {
  10 |     await page.goto('http://localhost:3000/');
  11 |     // Just mock localStorage directly to bypass login UI for speed
  12 |     await page.evaluate(() => {
  13 |       localStorage.setItem('user', JSON.stringify({
  14 |         id: 1, role: 'citizen', name: 'John Doe', level: 'Sapling', eco_points: 250, token: 'mock-jwt'
  15 |       }));
  16 |     });
  17 |   });
  18 | 
  19 |   for (const mode of MODES) {
  20 |     for (const route of PAGES) {
  21 |       test(`Accessibility check on ${route} (${mode} mode)`, async ({ page }) => {
  22 |         await page.goto(`http://localhost:3000${route}`);
  23 |         
  24 |         // Force dark mode if needed
  25 |         if (mode === 'dark') {
  26 |           await page.evaluate(() => document.documentElement.classList.add('dark'));
  27 |         } else {
  28 |           await page.evaluate(() => document.documentElement.classList.remove('dark'));
  29 |         }
  30 | 
  31 |         // Wait for animation/render
  32 |         await page.waitForTimeout(1000);
  33 | 
  34 |         // Run Axe
  35 |         const accessibilityScanResults = await new AxeBuilder({ page })
  36 |           .withTags(['wcag2aa', 'wcag21aa'])
  37 |           .analyze();
  38 | 
  39 |         const colorContrastViolations = accessibilityScanResults.violations.filter(v => v.id === 'color-contrast');
  40 |         
  41 |         // Assert no color contrast issues
  42 |         expect(colorContrastViolations, `Contrast issues found on ${route} in ${mode} mode: ${JSON.stringify(colorContrastViolations, null, 2)}`).toEqual([]);
  43 |         
  44 |         // Check buttons and empty labels
  45 |         const buttons = await page.locator('button').all();
  46 |         for (const btn of buttons) {
  47 |           const text = await btn.textContent();
  48 |           const aria = await btn.getAttribute('aria-label');
  49 |           const hasLabel = (text && text.trim().length > 0) || (aria && aria.trim().length > 0);
> 50 |           expect(hasLabel, `Empty button label found on ${route}`).toBe(true);
     |                                                                    ^ Error: Empty button label found on /citizen/sorting
  51 |         }
  52 |       });
  53 |     }
  54 |   }
  55 | });
  56 | 
```