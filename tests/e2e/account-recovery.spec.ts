import { expect, test } from '@playwright/test';
import { loadEnv } from 'vite';
const publicConfig = loadEnv('production', process.cwd(), 'VITE_');
const configured = Boolean(publicConfig.VITE_SUPABASE_URL && publicConfig.VITE_SUPABASE_ANON_KEY && publicConfig.VITE_API_URL);

test('password reset requests use a recovery redirect and show provider failures', async ({ page }) => {
  test.skip(!configured, 'Public auth configuration is required for this simulated auth journey.');
  let requests = 0;
  await page.route('**/auth/v1/recover**', async (route) => {
    requests++;
    expect(new URL(route.request().url()).searchParams.get('redirect_to')).toBe('http://localhost:4173/?recovery=1');
    expect(route.request().postDataJSON().email).toBe('ada@example.test');
    await route.fulfill({ status: requests === 1 ? 200 : 429, contentType: 'application/json', body: requests === 1 ? '{}' : JSON.stringify({ msg: 'Email limit reached', error_code: 'over_email_send_rate_limit' }) });
  });
  await page.goto('/');
  await page.getByLabel('What should we call you?').fill('Ada');
  await page.getByLabel('One thing you want to grow toward').fill('Draw');
  await page.getByLabel('A small daily habit to help you get there').fill('Sketch');
  await page.getByRole('button', { name: 'Meet your companion' }).click();
  await page.getByRole('button', { name: 'Start growing' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).filter({ visible: true }).first().click();
  await page.locator('.settings-section > summary').filter({ hasText: 'Account and synchronization' }).click();
  await page.getByLabel('Email', { exact: true }).fill('ada@example.test');
  await page.getByRole('button', { name: 'Send password reset email' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'password-reset email will arrive' })).toBeVisible();
  await page.getByRole('button', { name: 'Send password reset email' }).click();
  await expect(page.getByRole('alert')).toContainText('Email limit reached');
  expect(requests).toBe(2);
});

test('recovery form is available before profile loading and checks confirmation', async ({ page }) => {
  test.skip(!configured, 'Public auth configuration is required for this simulated auth journey.');
  const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'ada@example.test', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
  const expiry = Math.floor(Date.now() / 1000) + 3600;
  const token = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url') + '.' + Buffer.from(JSON.stringify({ sub: user.id, exp: expiry })).toString('base64url') + '.fixture';
  const key = `sb-${new URL(publicConfig.VITE_SUPABASE_URL).hostname.split('.')[0]}-auth-token`;
  await page.addInitScript(({ key, session }) => localStorage.setItem(key, JSON.stringify(session)), { key, session: { access_token: token, refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600, expires_at: expiry, user } });
  let updates = 0;
  await page.route('**/auth/v1/**', async (route) => {
    if (route.request().method() === 'PUT') { updates++; expect(route.request().postDataJSON().password).toBe('new-password-123'); }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(user) });
  });
  await page.route('**/sync', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Fixture backend unavailable' }) }));
  await page.goto('/?recovery=1');
  await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible();
  await page.getByLabel('New password', { exact: true }).fill('new-password-123');
  await page.getByLabel('Confirm new password').fill('different-password');
  await page.getByRole('button', { name: 'Update password', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('must match'); expect(updates).toBe(0);
  await page.getByLabel('Confirm new password').fill('new-password-123');
  await page.getByRole('button', { name: 'Update password', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Choose a new password' })).toHaveCount(0);
  expect(updates).toBe(1); await expect(page).not.toHaveURL(/recovery=1/);
});

test('an existing user can reach sign-in and recovery before guest onboarding', async ({ page }) => {
  test.skip(!configured, 'Public auth configuration is required for this simulated auth journey.');
  await page.route('**/auth/v1/recover**', (route) => route.fulfill({ contentType: 'application/json', body: '{}' }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign in to an existing account' }).click();
  const dialog = page.getByRole('dialog', { name: 'Your account' });
  await expect(dialog.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  await dialog.getByLabel('Email', { exact: true }).fill('ada@example.test');
  await dialog.getByRole('button', { name: 'Send password reset email' }).click();
  await expect(dialog.getByRole('status')).toContainText('password-reset email will arrive');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await expect(page.getByLabel('What should we call you?')).toBeVisible();
});
