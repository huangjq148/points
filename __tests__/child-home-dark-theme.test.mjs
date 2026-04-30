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
  const hexMatch = backgroundColor.match(/^#([0-9a-f]{3,8})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    const expand = (value) => value.split('').map((char) => char + char).join('');
    const normalizedHex =
      hex.length === 3 || hex.length === 4 ? expand(hex) : hex;

    const hasAlpha = normalizedHex.length === 8;
    const rgbHex = hasAlpha ? normalizedHex.slice(0, 6) : normalizedHex;
    const alphaHex = hasAlpha ? normalizedHex.slice(6, 8) : null;
    const r = Number.parseInt(rgbHex.slice(0, 2), 16);
    const g = Number.parseInt(rgbHex.slice(2, 4), 16);
    const b = Number.parseInt(rgbHex.slice(4, 6), 16);
    const alpha = alphaHex ? Number.parseInt(alphaHex, 16) / 255 : 1;

    if ([r, g, b].some((value) => Number.isNaN(value)) || alpha <= 0) return null;

    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

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

  const srgbMatch = backgroundColor.match(/color\(srgb\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)(?:\s*\/\s*([0-9.]+))?/);
  if (srgbMatch) {
    const [, r, g, b, a] = srgbMatch.map((value) => (value === undefined ? value : Number.parseFloat(value)));
    if ([r, g, b].some((value) => Number.isNaN(value))) return null;
    if (a !== undefined && !Number.isNaN(a) && a <= 0) return null;
    return 0.299 * r * 255 + 0.587 * g * 255 + 0.114 * b * 255;
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

async function createPrivilegeRewardOrder(parentLogin, childToken, childId, nameSuffix, points = 5) {
  await api('/api/points/reward', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${parentLogin.token}`,
    },
    body: JSON.stringify({
      childId,
      points: 10,
      reason: `dark theme privilege setup ${nameSuffix}`,
    }),
  });

  const rewardData = await api('/api/rewards', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${parentLogin.token}`,
    },
    body: JSON.stringify({
      name: `折叠特权 ${nameSuffix}`,
      description: '测试首页特权折叠',
      points,
      type: 'privilege',
      icon: '📺',
      stock: 5,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      validDurationValue: 2,
      validDurationUnit: 'day',
    }),
  });

  return api('/api/orders', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${childToken}`,
    },
    body: JSON.stringify({
      rewardId: rewardData.reward._id,
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
    assert.equal(await page.getByText('还没有可用特权').count(), 0);
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

test('child homepage keeps task detail modal dark in dark theme', { timeout: 120000 }, async () => {
  const { parentLogin, childUsername, childId } = await createParentAndChild('task_detail');

  const task = await createTask(parentLogin.token, childId, {
    name: '夜间任务详情',
    description: '测试任务详情弹窗暗色样式',
  });

  const childLogin = await loginChild(childUsername);
  await api('/api/tasks', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${childLogin.token}`,
    },
    body: JSON.stringify({
      taskId: task.task._id,
      status: 'submitted',
    }),
  });

  const { browser, context, page } = await openDarkChildHome({
    ...childLogin.user,
    token: childLogin.token,
  });

  try {
    await page.getByRole('button', { name: /夜间任务详情/ }).click();
    await page.getByText('测试任务详情弹窗暗色样式').waitFor();
    await expectDarkSurface(
      page.getByText('测试任务详情弹窗暗色样式').locator('xpath=ancestor::div[contains(@class,"modal-content")]').first(),
      'Task detail modal panel',
    );
    await expectDarkSurface(
      page.getByText('任务描述').locator('xpath=ancestor::div[contains(@class,"rounded-2xl")]').first(),
      'Task detail content block',
    );
  } finally {
    await context.close();
    await browser.close();
  }
});

test('child homepage keeps privilege reward cards dark in dark theme', { timeout: 120000 }, async () => {
  const { parentLogin, childUsername, childId } = await createParentAndChild('privilege');
  const childLoginForOrders = await loginChild(childUsername);

  await createPrivilegeRewardOrder(parentLogin, childLoginForOrders.token, childId, '1');
  await createPrivilegeRewardOrder(parentLogin, childLoginForOrders.token, childId, '2');
  await createPrivilegeRewardOrder(parentLogin, childLoginForOrders.token, childId, '3');
  await createPrivilegeRewardOrder(parentLogin, childLoginForOrders.token, childId, '4');

  const childLogin = await loginChild(childUsername);
  const { browser, context, page } = await openDarkChildHome({
    ...childLogin.user,
    token: childLogin.token,
  });

  try {
    const privilegePanel = page.locator('section.child-panel').filter({ hasText: '特权奖励' }).first();
    await expectDarkSurface(privilegePanel, 'Privilege reward panel');
    assert.equal(await privilegePanel.getByRole('button', { name: /折叠特权/ }).count(), 2);
    await privilegePanel.getByRole('button', { name: '展开剩余 2 个特权奖励' }).waitFor();

    const privilegeCard = privilegePanel.getByRole('button', { name: /折叠特权 1|折叠特权 2|折叠特权 3|折叠特权 4/ }).first();
    await expectDarkSurface(privilegeCard, 'Privilege reward card');
    await expectDarkSurface(privilegeCard.locator('div').nth(1), 'Privilege reward icon surface');
    await page.getByRole('button', { name: '展开剩余 2 个特权奖励' }).click();
    assert.equal(await privilegePanel.getByRole('button', { name: /折叠特权/ }).count(), 4);
    assert.equal(await privilegePanel.getByRole('button', { name: '收起特权奖励，当前显示 4 个' }).count(), 1);
    await page.getByRole('button', { name: '收起特权奖励，当前显示 4 个' }).click();
    assert.equal(await privilegePanel.getByRole('button', { name: /折叠特权/ }).count(), 2);

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

test('child homepage keeps child switcher and child sign-in modals dark in dark theme', { timeout: 120000 }, async () => {
  const { childUsername } = await createParentAndChild('child_switcher');
  const childLogin = await loginChild(childUsername);
  const { browser, context, page } = await openDarkChildHome({
    ...childLogin.user,
    token: childLogin.token,
  });

  try {
    await page.getByRole('button', { name: '切换孩子' }).click();
    await page.getByText('选择要切换的孩子').waitFor();
    await expectDarkSurface(
      page.getByText('选择要切换的孩子').locator('xpath=ancestor::div[contains(@class,"max-w-sm")]').first(),
      'Child switcher modal panel',
    );

    await page.getByRole('button', { name: '添加/切换孩子账号' }).click();
    await page.getByText('登录后会保留之前已登录的孩子账号').waitFor();
    await expectDarkSurface(
      page.getByText('登录后会保留之前已登录的孩子账号').locator('xpath=ancestor::div[contains(@class,"max-w-sm")]').first(),
      'Child sign-in modal panel',
    );
  } finally {
    await context.close();
    await browser.close();
  }
});
