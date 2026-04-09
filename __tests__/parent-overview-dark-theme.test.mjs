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
  const rawBody = await response.text();
  let json;

  try {
    json = rawBody ? JSON.parse(rawBody) : null;
  } catch (error) {
    throw new Error(
      `${path} returned non-JSON response (status ${response.status}): ${rawBody.slice(0, 300)}`,
    );
  }

  if (!response.ok || json?.success === false) {
    throw new Error(
      `${path} failed (status ${response.status}): ${rawBody.slice(0, 300)}`,
    );
  }

  return json;
}

function getBrightness(color) {
  const hexMatch = color.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    const normalizedHex =
      hex.length === 3
        ? hex
            .split('')
            .map((value) => value + value)
            .join('')
        : hex;
    const r = Number.parseInt(normalizedHex.slice(0, 2), 16);
    const g = Number.parseInt(normalizedHex.slice(2, 4), 16);
    const b = Number.parseInt(normalizedHex.slice(4, 6), 16);
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

  const rgbMatch = color.match(/rgba?\(([^)]+)\)/);
  if (rgbMatch) {
    const [r, g, b] = rgbMatch[1]
      .split(',')
      .slice(0, 3)
      .map((value) => Number.parseFloat(value.trim()));

    if ([r, g, b].some((value) => Number.isNaN(value))) return null;
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

  const oklabMatch = color.match(/oklab\(\s*([0-9.]+)/);
  if (oklabMatch) {
    const lightness = Number.parseFloat(oklabMatch[1]);
    if (Number.isNaN(lightness)) return null;
    return lightness * 255;
  }

  const labMatch = color.match(/lab\(\s*([0-9.]+)/);
  if (labMatch) {
    const lightness = Number.parseFloat(labMatch[1]);
    if (Number.isNaN(lightness)) return null;
    return (lightness / 100) * 255;
  }

  return null;
}

function getGradientBrightness(backgroundImage) {
  if (!backgroundImage || backgroundImage === 'none') return null;

  const rgbMatches = Array.from(backgroundImage.matchAll(/rgba?\(([^)]+)\)/g));
  const rgbBrightness = rgbMatches
    .map((match) =>
      match[1]
        .split(',')
        .slice(0, 3)
        .map((value) => Number.parseFloat(value.trim())),
    )
    .filter((rgb) => rgb.every((value) => !Number.isNaN(value)))
    .map(([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b);

  if (rgbBrightness.length > 0) {
    return Math.max(...rgbBrightness);
  }

  const labMatches = Array.from(backgroundImage.matchAll(/(?:ok)?lab\(\s*([0-9.]+)/g));
  const labBrightness = labMatches
    .map((match) => Number.parseFloat(match[1]))
    .filter((value) => !Number.isNaN(value))
    .map((value) => (value > 1 ? (value / 100) * 255 : value * 255));

  if (labBrightness.length > 0) {
    return Math.max(...labBrightness);
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

  const colorBrightness = getBrightness(surface.backgroundColor);
  const gradientBrightness = getGradientBrightness(surface.backgroundImage);
  const brightness = Math.max(colorBrightness ?? 0, gradientBrightness ?? 0);
  assert.ok(
    colorBrightness !== null || gradientBrightness !== null,
    `${label} should expose a concrete background color: ${JSON.stringify(surface)}`,
  );
  assert.ok(
    brightness < 140,
    `${label} should stay dark in dark mode, got ${surface.backgroundColor} on ${surface.className}`,
  );
}

async function expectLightText(locator, label) {
  await locator.waitFor({ state: 'visible' });
  const textColor = await locator.evaluate((element) => {
    const style = window.getComputedStyle(element);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const normalizedColor = context
      ? (() => {
          context.fillStyle = '#000';
          context.fillStyle = style.color;
          return context.fillStyle;
        })()
      : style.color;

    return {
      className: element.className,
      color: normalizedColor,
    };
  });

  const brightness = getBrightness(textColor.color);
  assert.ok(
    brightness !== null,
    `${label} should expose a concrete text color: ${JSON.stringify(textColor)}`,
  );
  assert.ok(
    brightness > 150,
    `${label} should stay readable in dark mode, got ${textColor.color} on ${textColor.className}`,
  );
}

async function expectReadableStatusBadge(locator, label) {
  await locator.waitFor({ state: 'visible' });
  const badgeStyle = await locator.evaluate((element) => {
    const style = window.getComputedStyle(element);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const normalize = (value) => {
      if (!context) return value;
      context.fillStyle = '#000';
      context.fillStyle = value;
      return context.fillStyle;
    };

    return {
      className: element.className,
      color: normalize(style.color),
      backgroundColor: normalize(style.backgroundColor),
      backgroundImage: style.backgroundImage,
    };
  });

  const textBrightness = getBrightness(badgeStyle.color);
  const colorBrightness = getBrightness(badgeStyle.backgroundColor);
  const gradientBrightness = getGradientBrightness(badgeStyle.backgroundImage);
  const backgroundBrightness = Math.max(colorBrightness ?? 0, gradientBrightness ?? 0);

  assert.ok(
    textBrightness !== null,
    `${label} should expose a concrete text color: ${JSON.stringify(badgeStyle)}`,
  );
  assert.ok(
    colorBrightness !== null || gradientBrightness !== null,
    `${label} should expose a concrete background color: ${JSON.stringify(badgeStyle)}`,
  );
  assert.ok(
    textBrightness > 140,
    `${label} should keep readable text in dark mode, got ${badgeStyle.color} on ${badgeStyle.className}`,
  );
  assert.ok(
    backgroundBrightness < 150,
    `${label} should avoid a washed-out light badge background in dark mode, got ${badgeStyle.backgroundColor} on ${badgeStyle.className}`,
  );
}

async function expectClassContains(locator, expectedClassName, label) {
  await locator.waitFor({ state: 'visible' });
  const className = await locator.evaluate((element) => element.className);
  assert.match(
    className,
    new RegExp(`\\b${expectedClassName}\\b`),
    `${label} should use ${expectedClassName}, got ${className}`,
  );
}

function getSectionByHeading(page, heading) {
  return page
    .getByRole('heading', { name: heading })
    .locator(`xpath=ancestor::div[.//h3[normalize-space()="${heading}"]][1]`);
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
      nickname: 'Overview Dark Theme Child',
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
      name: '深色概览任务',
      description: '用于验证家长概览页暗色状态卡片',
      points: 20,
      type: 'daily',
      icon: '📝',
      requirePhoto: false,
      startDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      ...overrides,
    }),
  });
}

async function updateTaskStatus(parentToken, taskId, status) {
  return api('/api/tasks', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${parentToken}`,
    },
    body: JSON.stringify({
      taskId,
      status,
    }),
  });
}

async function createReward(parentToken, overrides = {}) {
  return api('/api/rewards', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${parentToken}`,
    },
    body: JSON.stringify({
      name: '概览暗色测试奖品',
      description: '用于验证家长概览页待核销状态',
      points: 30,
      type: 'physical',
      icon: '🎁',
      stock: 5,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      validDurationValue: 2,
      validDurationUnit: 'day',
      ...overrides,
    }),
  });
}

async function createOrder(childToken, rewardId) {
  return api('/api/orders', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${childToken}`,
    },
    body: JSON.stringify({
      rewardId,
    }),
  });
}

async function seedOverviewScenario(parentLogin, childId, childUsername) {
  const pendingTask = await createTask(parentLogin.token, childId, {
    name: '待完成概览任务',
    deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  });

  const submittedTask = await createTask(parentLogin.token, childId, {
    name: '待审核概览任务',
    deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  });

  await updateTaskStatus(parentLogin.token, submittedTask.task._id, 'submitted');

  const onTimeTask = await createTask(parentLogin.token, childId, {
    name: '按时完成概览任务',
    deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  });
  await updateTaskStatus(parentLogin.token, onTimeTask.task._id, 'approved');

  const overdueTask = await createTask(parentLogin.token, childId, {
    name: '逾期完成概览任务',
    deadline: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  });
  await updateTaskStatus(parentLogin.token, overdueTask.task._id, 'approved');

  await api('/api/points/reward', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${parentLogin.token}`,
    },
    body: JSON.stringify({
      childId,
      points: 120,
      reason: 'overview dark theme setup',
    }),
  });

  const rewardData = await createReward(parentLogin.token, {
    name: '概览待核销奖品',
  });

  const childLogin = await loginChild(childUsername);
  await createOrder(childLogin.token, rewardData.reward._id);

  return {
    pendingTaskId: pendingTask.task._id,
    submittedTaskId: submittedTask.task._id,
    onTimeTaskId: onTimeTask.task._id,
    overdueTaskId: overdueTask.task._id,
  };
}

async function openDarkParentOverview(user) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1800 },
  });

  await context.addInitScript(({ currentUser }) => {
    localStorage.setItem('little_achievers_user', JSON.stringify(currentUser));
    localStorage.setItem('little_achievers_mode', 'parent');
    localStorage.setItem('little_achievers_active_session', currentUser.id);
    localStorage.setItem(
      'little_achievers_sessions',
      JSON.stringify([
        {
          user: currentUser,
          token: currentUser.token,
          lastUsedAt: new Date().toISOString(),
        },
      ]),
    );
    localStorage.setItem('access_token', currentUser.token);
    localStorage.setItem('little_achievers_parent_theme', 'dark');
  }, { currentUser: user });

  const page = await context.newPage();
  await page.goto(`${BASE_URL}/parent/overview`, {
    waitUntil: 'networkidle',
    timeout: 30000,
  });

  return { browser, context, page };
}

test('parent overview result cards and child status chips stay dark in dark theme', { timeout: 120000 }, async () => {
  const { parentLogin, childUsername, childId } = await createParentAndChild('parent_overview_dark');

  await seedOverviewScenario(parentLogin, childId, childUsername);

  const { browser, context, page } = await openDarkParentOverview({
    ...parentLogin.user,
    token: parentLogin.token,
  });

  try {
    await page.getByRole('heading', { name: '关键结果看板' }).waitFor({ state: 'visible' });
    await page.getByText(childUsername).waitFor({ state: 'visible' });
    await page.getByRole('heading', { name: '行动建议' }).waitFor({ state: 'visible' });
    await page.getByRole('heading', { name: '任务状态分布' }).waitFor({ state: 'visible' });
    await page.getByRole('heading', { name: '完成趋势' }).waitFor({ state: 'visible' });

    const suggestionBoard = getSectionByHeading(page, '行动建议');
    const suggestionRow = suggestionBoard.locator(
      'xpath=.//p[contains(normalize-space(), "先处理 1 条待审核任务")]/ancestor::div[1]',
    );
    await expectDarkSurface(suggestionRow, 'Overview suggestion row');

    const totalTasksCard = page.getByText('家庭总任务', { exact: true }).locator('xpath=ancestor::div[contains(@class, "card")][1]');
    const totalTasksBadge = totalTasksCard.locator('xpath=.//div[contains(@class, "rounded-xl")][1]');
    await expectClassContains(totalTasksBadge, 'overview-icon-badge', 'Core metric icon badge');
    await expectDarkSurface(totalTasksBadge, 'Core metric icon badge');

    const statusDistribution = getSectionByHeading(page, '任务状态分布');
    const distributionTrack = statusDistribution.locator('xpath=.//span[normalize-space()="进行中"]/following-sibling::div[1]');
    await expectClassContains(distributionTrack, 'overview-track', 'Distribution rail');
    await expectDarkSurface(distributionTrack, 'Distribution rail');

    const trendCard = page
      .getByRole('heading', { name: '完成趋势' })
      .locator('xpath=ancestor::div[contains(@class, "card")][1]');
    const trendTrack = trendCard.locator('.overview-trend-track').first();
    await expectClassContains(trendTrack, 'overview-trend-track', 'Trend track');
    await expectDarkSurface(trendTrack, 'Trend track');

    const resultBoard = getSectionByHeading(page, '关键结果看板');
    const resultCards = [
      { label: '按时完成', value: 1 },
      { label: '逾期完成', value: 1 },
      { label: '待审核', value: 1 },
      { label: '已完成', value: 2 },
    ];

    for (const { label, value } of resultCards) {
      const resultCard = resultBoard.locator(
        `xpath=.//span[normalize-space()="${label}"]/ancestor::div[2][1]`,
      );
      await expectDarkSurface(resultCard, `${label} result card`);
      await expectLightText(resultCard.getByText(String(value), { exact: true }), `${label} result value`);
    }

    await expectReadableStatusBadge(
      page.getByText('待完成 1', { exact: true }),
      'Child pending status chip',
    );
    await expectReadableStatusBadge(
      page.getByText('待审核 1', { exact: true }),
      'Child submitted status chip',
    );
    await expectReadableStatusBadge(
      page.getByText('待核销 1', { exact: true }),
      'Child pending-order status chip',
    );
  } finally {
    await context.close();
    await browser.close();
  }
});
