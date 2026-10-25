import { expect, test, type Page } from '@playwright/test';

async function start(page: Page) {
  await page.goto('/');
  await page.getByLabel('What should we call you?').fill('Ada');
  await page.getByLabel('One thing you want to grow toward').fill('Draw from life');
  await page.getByLabel('A small daily habit to help you get there').fill('Sketch a leaf');
  await page.getByRole('button', { name: 'Meet your companion' }).click();
  await expect(page.getByRole('heading', { name: 'Who’s growing with you?' })).toBeFocused();
  await page.getByRole('button', { name: 'Back to my intention' }).click();
  await expect(page.getByLabel('What should we call you?')).toHaveValue('Ada');
  await page.getByRole('button', { name: 'Meet your companion' }).click();
  await page.getByRole('button', { name: 'Start growing' }).click();
  await expect(page.getByRole('heading', { name: 'Hey, Ada. Good to see you.' })).toBeVisible();
}
async function tab(page: Page, name: string) { await page.getByRole('button', { name, exact: true }).filter({ visible: true }).first().click(); }

test('companion interactions are local and the next-step action rewards only once', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: 'Greet Babu' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.companion-speech')).toHaveText('Happy to see you, too ♡');
  await page.getByRole('button', { name: 'Switch scene to daylight' }).click();
  await expect(page.getByRole('img', { name: /A peaceful sunlit garden/ })).toBeVisible();
  await expect(page.getByText('0 / 150 XP', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Switch scene to moonlight' }).click();
  await page.getByRole('button', { name: /I did this/ }).click();
  await expect(page.locator('.companion-speech')).toHaveText('Look at you grow! +25 XP');
  await expect(page.getByRole('button', { name: 'Complete Sketch a leaf', exact: true })).toBeDisabled();
  await page.reload();
  await expect(page.getByText('25 / 150 XP', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Say hello', exact: true }).click();
  await expect(page.getByText('25 / 150 XP', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Add habit', exact: true }).click();
  await page.getByLabel('New daily habit').fill('Read two pages');
  await page.getByRole('dialog').getByRole('button', { name: 'Add habit', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Your next step' })).toContainText('Read two pages');
  await page.getByRole('button', { name: 'New goal', exact: true }).click();
  await page.getByRole('dialog').getByRole('textbox', { name: 'New goal', exact: true }).fill('Fill a sketchbook');
  await page.getByRole('dialog').getByRole('button', { name: 'Add goal' }).click();
  await expect(page.getByRole('button', { name: 'Complete goal Fill a sketchbook' })).toBeVisible();
  await page.getByRole('button', { name: 'Our home', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Your home', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('the companion welcomes arrivals and returns without awarding progress', async ({ page }) => {
  await page.clock.install();
  await start(page);
  const speech = page.locator('.companion-speech');
  const wave = page.locator('.scene-character .mascot-wave');
  await expect(speech).toHaveText('You’re here. Hi, you ♡');
  await expect(wave).toHaveCSS('animation-name', 'wave-hello');
  await expect(page.getByText('Tap me to say hello.')).toHaveCount(0);
  await page.clock.runFor(3300);
  await expect(speech).toBeEmpty();
  await expect(wave).toHaveCount(0);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator('.living-companion')).toHaveClass(/animation-paused/);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(speech).toHaveText('You’re here. Hi, you ♡');
  await expect(wave).toHaveCSS('animation-name', 'wave-hello');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(wave).toHaveCSS('animation-name', 'none');
  await expect(page.getByText('0 / 150 XP', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '0 Growth Coins. Open progress.' })).toBeVisible();
  await page.reload();
  await expect(speech).toHaveText('You’re here. Hi, you ♡');
  await expect(page.getByText('0 / 150 XP', { exact: true })).toBeVisible();
});

test('library search and all expanded views remain usable on a narrow screen', async ({ page }) => {
  test.setTimeout(90_000);
  await start(page);
  await page.setViewportSize({ width: 320, height: 850 });
  async function fits() { expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320); }
  await tab(page, 'Learn');
  await page.getByRole('button', { name: /^Library / }).click();
  await page.getByRole('button', { name: 'Save a resource', exact: true }).click();
  await page.getByLabel('Give it a name').fill('Drawing leaves');
  await page.getByLabel('Video link').fill('https://youtu.be/dQw4w9WgXcQ');
  await page.getByRole('button', { name: 'Save resource', exact: true }).click();
  await page.getByLabel('My notes').fill('Look at the edges first.');
  await page.getByLabel('Search your library').fill('missing');
  await expect(page.getByRole('heading', { name: 'Nothing matches just yet.' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear search' }).click();
  await expect(page.getByLabel('My notes')).toHaveValue('Look at the edges first.');
  await page.getByRole('button', { name: /^Practice / }).click();
  await page.getByRole('button', { name: /^Library / }).click();
  await expect(page.getByLabel('My notes')).toHaveValue('Look at the edges first.');
  await page.getByRole('button', { name: 'Save notes' }).click();
  await fits();
  await tab(page, 'Progress');
  for (const name of ['Your home', 'Activity', 'Journey']) { await page.getByRole('button', { name, exact: true }).click(); await fits(); }
  await tab(page, 'Settings');
  await page.locator('.settings-section > summary').first().waitFor({ state: 'visible' });
  for (const summary of await page.locator('.settings-section > summary').all()) { await summary.click(); await fits(); }
  await page.getByText('Tracking exclusions', { exact: true }).click();
  await page.getByLabel('Use gentle, reduced motion').click();
  await expect(page.getByLabel('Use gentle, reduced motion')).toBeChecked();
  await expect(page.locator('html')).toHaveClass(/reduce-motion/);
  await page.evaluate(() => { document.documentElement.style.fontSize = '32px'; });
  await fits();
  await tab(page, 'Today');
  await expect(page.locator('.scene-character .mascot-art')).toHaveCSS('animation-name', 'none');
  await fits();
});

test('choosing a habit changes the next action without earning rewards', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: 'Add habit', exact: true }).click();
  await page.getByLabel('New daily habit').fill('Read two pages');
  await page.getByRole('dialog').getByRole('button', { name: 'Add habit', exact: true }).click();
  const next = page.getByRole('region', { name: 'Your next step' });
  await expect(next).toContainText('Sketch a leaf');
  await page.getByRole('button', { name: 'Make Read two pages my next step', exact: true }).click();
  await expect(next).toContainText('Read two pages');
  await expect(next).toBeFocused();
  await expect(page.getByText('0 / 150 XP', { exact: true })).toBeVisible();
  await expect(page.locator('.win-burst')).toHaveCount(0);
  await next.getByRole('button', { name: /I did this/ }).click();
  await expect(page.getByRole('button', { name: 'Complete Read two pages', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Complete Sketch a leaf', exact: true })).toBeEnabled();
  await expect(next).toContainText('Sketch a leaf');
  await expect(page.getByText('25 / 150 XP', { exact: true })).toBeVisible();
  await expect(page.locator('.world-celebrating')).toBeVisible();
  await page.reload();
  await expect(page.getByText('25 / 150 XP', { exact: true })).toBeVisible();
  await expect(page.locator('.win-burst')).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await next.getByRole('button', { name: /I did this/ }).click();
  await expect(page.getByText('50 / 150 XP', { exact: true })).toBeVisible();
  await expect(page.locator('.world-celebrating')).toBeVisible();
  await expect(page.locator('.win-burst')).toBeHidden();
});
