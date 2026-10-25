import { expect, test, type Page } from '@playwright/test';

async function openTab(page: Page, name: string) {
  await page.getByRole('button', { name, exact: true }).filter({ visible: true }).first().click();
}
async function start(page: Page) {
  await page.goto('/');
  await page.getByLabel('What should we call you?').fill('Ada');
  await page.getByLabel('One thing you want to grow toward').fill('Learn to draw');
  await page.getByLabel('A small daily habit to help you get there').fill('Sketch one object');
  await page.getByRole('button', { name: 'Meet your companion' }).click();
  await page.getByRole('button', { name: 'Start growing' }).click();
  await expect(page.getByRole('heading', { name: 'Hey, Ada. Good to see you.' })).toBeVisible();
}
async function fits(page: Page) {
  const result = await page.evaluate(() => ({
    width: innerWidth, content: document.documentElement.scrollWidth,
    clipped: [...document.querySelectorAll('button, input:not([type=file]), select, textarea')].filter((el) => {
      const box = el.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && (box.left < -1 || box.right > innerWidth + 1);
    }).map((el) => el.getAttribute('aria-label') ?? el.textContent?.slice(0, 70)),
  }));
  expect(result.content, JSON.stringify(result)).toBeLessThanOrEqual(result.width);
  expect(result.clipped, JSON.stringify(result)).toEqual([]);
}
test('all tabs fit phone, tablet and desktop widths with reachable dialogs', async ({ page }) => {
  test.setTimeout(90_000);
  await start(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 850 });
    for (const name of ['Today', 'Learn', 'Progress', 'Settings']) {
      await openTab(page, name); await fits(page);
    }
    await openTab(page, 'Today');
    if (width === 390 || width === 768 || width === 1440) await page.screenshot({ fullPage: true, path: `test-results/responsive-${width}-${test.info().project.name}.png` });
    await page.getByRole('button', { name: 'Assistant', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible(); await fits(page);
    await page.getByRole('button', { name: 'Close dialog' }).click();
    const install = page.getByRole('button', { name: 'Keep your world close' });
    await install.click();
    await expect(page.getByRole('dialog', { name: 'Install on this device' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'On a phone or tablet' })).toBeVisible();
    await fits(page);
    await page.keyboard.press('Escape');
    await expect(install).toBeFocused();
  }
  await page.setViewportSize({ width: 640, height: 360 });
  await page.getByRole('button', { name: 'Assistant', exact: true }).click();
  const box = await page.getByRole('dialog').boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(0); expect(box!.y + box!.height).toBeLessThanOrEqual(361);
  await page.getByRole('button', { name: 'Close dialog' }).click();
});
test('appearance choice persists and enlarged text remains usable on a small phone', async ({ page }) => {
  test.setTimeout(60_000);
  await start(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Switch to light appearance' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Switch to dark appearance' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.setViewportSize({ width: 360, height: 800 });
  await page.evaluate(() => { document.documentElement.style.fontSize = '32px'; });
  for (const name of ['Today', 'Learn', 'Progress', 'Settings']) { await openTab(page, name); await fits(page); }
  await openTab(page, 'Today');
  await page.getByRole('button', { name: 'Our story', exact: true }).click();
  await fits(page);
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; window.scrollTo(0, 0); });
  await page.screenshot({ fullPage: true, path: `test-results/responsive-dark-${test.info().project.name}.png` });
});
