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

function getBrightness(backgroundColor) {
  const rgbMatch = backgroundColor.match(/rgba?\(([^)]+)\)/);
  if (rgbMatch) {
    const [r, g, b] = rgbMatch[1]
      .split(',')
      .slice(0, 3)
      .map((value) => Number.parseFloat(value.trim()));

    if ([r, g, b].some((value) => Number.isNaN(value))) return null;
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

  const oklabMatch = backgroundColor.match(/oklab\(\s*([0-9.]+)/);
  if (oklabMatch) {
    const lightness = Number.parseFloat(oklabMatch[1]);
    if (Number.isNaN(lightness)) return null;
    return lightness * 255;
  }

  return null;
}

async function expectDarkSurface(locator, label) {
  await locator.waitFor({ state: 'visible' });
  const surface = await locator.evaluate((element) => {
    const style = window.getComputedStyle(element);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const normalizedBackgroundColor = context
      ? (() => {
          context.fillStyle = '#000';
          context.fillStyle = style.backgroundColor;
          return context.fillStyle;
        })()
      : style.backgroundColor;
    return {
      className: element.className,
      backgroundColor: normalizedBackgroundColor,
      backgroundImage: style.backgroundImage,
    };
  });

  const surfaceBrightness = getBrightness(surface.backgroundColor);
  assert.ok(
    surfaceBrightness !== null,
    `${label} should expose a concrete background color: ${JSON.stringify(surface)}`,
  );
  assert.ok(
    surfaceBrightness < 140,
    `${label} should stay dark in dark mode, got ${surface.backgroundColor} on ${surface.className}`,
  );
}

async function createParentAndChild(prefix) {
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

  const childCreate = await api('/api/children', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${parentLogin.token}`,
    },
    body: JSON.stringify({
      username: childUsername,
      nickname: 'Dark Theme Child',
      avatar: '🧒',
      password: PASSWORD,
    }),
  });

  return {
    parentLogin,
    childUsername,
    childId: childCreate.child.id,
  };
}

async function loginChild(childUsername) {
  return api('/api/auth', {
    method: 'POST',
    body: JSON.stringify({
      username: childUsername,
      password: PASSWORD,
      action: 'login',
    }),
  });
}

async function createTask(parentToken, childId, overrides = {}) {
  return api('/api/tasks', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${parentToken}`,
    },
    body: JSON.stringify({
      childId,
      name: '夜间提交任务',
      description: '测试首页提交弹框暗色样式',
      points: 12,
      type: 'daily',
      icon: '📝',
      requirePhoto: false,
      startDate: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      ...overrides,
    }),
  });
}

async function openDarkChildHome(user) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1800 },
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
  }, { currentUser: user });

  const page = await context.newPage();
  await page.goto(`${BASE_URL}/child`, { waitUntil: 'networkidle', timeout: 30000 });
  assert.equal(page.url(), `${BASE_URL}/child`);

  return { browser, context, page };
}

test('child homepage keeps nested cards dark in dark theme', { timeout: 120000 }, async () => {
  const { childUsername } = await createParentAndChild('dark');
  const childLogin = await loginChild(childUsername);
  const { browser, context, page } = await openDarkChildHome({
    ...childLogin.user,
    token: childLogin.token,
  });

  try {
    await expectDarkSurface(page.getByText('当前积分').locator('xpath=..'), 'Current points card');
    await expectDarkSurface(page.getByText('还没有可用特权').locator('xpath=..'), 'Privilege empty state');
    await expectDarkSurface(page.getByText('今天很轻松').locator('xpath=..'), 'Task empty state');
    await expectDarkSurface(page.getByRole('button', { name: '去奖励商店' }).locator('xpath=..'), 'Reward reminder panel');
  } finally {
    await context.close();
    await browser.close();
  }
});

test('child homepage keeps submit task modal dark in dark theme', { timeout: 120000 }, async () => {
  const { parentLogin, childUsername, childId } = await createParentAndChild('task_submit');

  await createTask(parentLogin.token, childId);

  const childLogin = await loginChild(childUsername);
  const { browser, context, page } = await openDarkChildHome({
    ...childLogin.user,
    token: childLogin.token,
  });

  try {
    await page.getByRole('button', { name: /夜间提交任务/ }).click();
    await page.getByText('上传任务照片').waitFor();
    await expectDarkSurface(
      page.getByText('上传任务照片').locator('xpath=ancestor::div[contains(@class,"w-full") and contains(@class,"overflow-hidden")]').first(),
      'Task submit modal panel',
    );
    await expectDarkSurface(
      page.getByText('上传任务照片').locator('xpath=ancestor::div[contains(@class,"border-dashed")]').first(),
      'Task submit upload surface',
    );
  } finally {
    await context.close();
    await browser.close();
  }
});

test('child homepage keeps privilege reward cards dark in dark theme', { timeout: 120000 }, async () => {
  const { parentLogin, childUsername, childId } = await createParentAndChild('privilege');

  await api('/api/points/reward', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${parentLogin.token}`,
    },
    body: JSON.stringify({
      childId,
      points: 40,
      reason: 'dark theme privilege setup',
    }),
  });

  const rewardData = await api('/api/rewards', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${parentLogin.token}`,
    },
    body: JSON.stringify({
      name: '夜间平板特权',
      description: '测试首页暗色卡片',
      points: 20,
      type: 'privilege',
      icon: '📺',
      stock: 5,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      validDurationValue: 2,
      validDurationUnit: 'day',
    }),
  });

  const childLoginForOrder = await loginChild(childUsername);
  await api('/api/orders', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${childLoginForOrder.token}`,
    },
    body: JSON.stringify({
      rewardId: rewardData.reward._id,
    }),
  });

  const childLogin = await loginChild(childUsername);
  const { browser, context, page } = await openDarkChildHome({
    ...childLogin.user,
    token: childLogin.token,
  });

  try {
    const privilegeCard = page.getByRole('button', { name: /夜间平板特权/ });
    await expectDarkSurface(privilegeCard, 'Privilege reward card');
    await expectDarkSurface(privilegeCard.locator('div').nth(1), 'Privilege reward icon surface');
    await privilegeCard.click();
    await page.getByText('特权详情').waitFor();
    await expectDarkSurface(
      page.getByText('特权详情').locator('xpath=ancestor::div[contains(@class,"w-full") and contains(@class,"overflow-hidden")]').first(),
      'Privilege detail modal panel',
    );
  } finally {
    await context.close();
    await browser.close();
  }
});
