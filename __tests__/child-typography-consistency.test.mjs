import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000';
const PASSWORD = '123456';

async function api(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });
  const json = await response.json();

  if (!response.ok || json.success === false) {
    throw new Error(`${path} failed: ${JSON.stringify(json)}`);
  }

  return json;
}

async function createChild(prefix) {
  const ts = Date.now();
  const parentUsername = `${prefix}_parent_${ts}`;
  const childUsername = `${prefix}_child_${ts}`;

  const parentLogin = await api('/api/auth', {
    method: 'POST',
    body: JSON.stringify({
      username: parentUsername,
      password: PASSWORD,
      action: 'login',
    }),
  });

  await api('/api/children', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${parentLogin.token}`,
    },
    body: JSON.stringify({
      username: childUsername,
      nickname: 'Typography Child',
      avatar: '🧒',
      password: PASSWORD,
    }),
  });

  return api('/api/auth', {
    method: 'POST',
    body: JSON.stringify({
      username: childUsername,
      password: PASSWORD,
      action: 'login',
    }),
  });
}

async function getFontSize(page, text) {
  const locator = page.getByText(text, { exact: true }).first();
  await locator.waitFor({ state: 'visible' });
  return locator.evaluate((element) => window.getComputedStyle(element).fontSize);
}

test('child pages keep section heading font sizes consistent', { timeout: 120000 }, async () => {
  const childLogin = await createChild('child_typography');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
  });

  await context.addInitScript(({ currentUser }) => {
    localStorage.setItem('little_achievers_user', JSON.stringify(currentUser));
    localStorage.setItem('little_achievers_mode', 'child');
    localStorage.setItem('little_achievers_active_session', currentUser.id);
    localStorage.setItem(
      'little_achievers_sessions',
      JSON.stringify([{ user: currentUser, token: currentUser.token, lastUsedAt: new Date().toISOString() }]),
    );
    localStorage.setItem('access_token', currentUser.token);
    localStorage.setItem('little_achievers_theme', 'dark');
  }, { currentUser: { ...childLogin.user, token: childLogin.token } });

  const page = await context.newPage();

  try {
    const checks = [
      { path: '/child', text: '今天要做' },
      { path: '/child/task', text: '任务列表' },
      { path: '/child/wallet', text: '积分冒险记录' },
      { path: '/child/gift', text: '奖品展示墙' },
      { path: '/child/store', text: '商品列表' },
    ];

    const fontSizes = [];
    for (const check of checks) {
      await page.goto(`${BASE_URL}${check.path}`, { waitUntil: 'networkidle', timeout: 30000 });
      fontSizes.push(await getFontSize(page, check.text));
    }

    const uniqueSizes = [...new Set(fontSizes)];
    assert.equal(
      uniqueSizes.length,
      1,
      `Expected all child section titles to share one font size, got ${fontSizes.join(', ')}`,
    );
  } finally {
    await context.close();
    await browser.close();
  }
});
