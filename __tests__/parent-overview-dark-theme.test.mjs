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

function getOverviewSection(page, sectionName) {
  return page.locator(`[data-overview-section="${sectionName}"]`);
}

function getOverviewSurface(page, surfaceName) {
  return page.locator(`[data-overview-surface="${surfaceName}"]`);
}

function getOverviewSkeleton(page, skeletonName) {
  return page.locator(`[data-overview-skeleton="${skeletonName}"]`);
}

async function createChild(parentToken, username, avatar = '🧒') {
  return api('/api/children', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${parentToken}`,
    },
    body: JSON.stringify({
      username,
      nickname: username,
      avatar,
      password: PASSWORD,
    }),
  });
}

async function createParentAndChildren(prefix, childCount = 1) {
  const ts = Date.now();
  const parentUsername = `${prefix}_parent_${ts}`;

  const parentLogin = await api('/api/auth', {
    method: 'POST',
    body: JSON.stringify({
      username: parentUsername,
      password: PASSWORD,
      action: 'login',
    }),
  });

  const children = [];
  for (let index = 0; index < childCount; index += 1) {
    const childUsername = `${prefix}_child_${index + 1}_${ts}`;
    const childCreate = await createChild(
      parentLogin.token,
      childUsername,
      index === 0 ? '🧒' : '🦊',
    );

    children.push({
      childId: childCreate.child.id,
      childUsername,
    });
  }

  return {
    parentLogin,
    children,
  };
}

async function createParentAndChild(prefix) {
  const { parentLogin, children } = await createParentAndChildren(prefix, 1);
  const [child] = children;

  return {
    parentLogin,
    childUsername: child.childUsername,
    childId: child.childId,
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

async function seedComparisonChild(parentLogin, childId) {
  const approvedTask = await createTask(parentLogin.token, childId, {
    name: '对比概览任务',
    deadline: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    type: 'daily',
    icon: '📘',
  });

  await updateTaskStatus(parentLogin.token, approvedTask.task._id, 'approved');
}

async function openDarkParentOverview(user, options = {}) {
  const { beforeGoto, waitUntil = 'networkidle' } = options;
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
  if (beforeGoto) {
    await beforeGoto(page, context);
  }

  await page.goto(`${BASE_URL}/parent/overview`, {
    waitUntil,
    timeout: 30000,
  });

  return { browser, context, page };
}

test('parent overview loading placeholders stay dark in dark theme', { timeout: 120000 }, async () => {
  const { parentLogin } = await createParentAndChild('parent_overview_loading_dark');

  const { browser, context, page } = await openDarkParentOverview(
    {
      ...parentLogin.user,
      token: parentLogin.token,
    },
    {
      waitUntil: 'domcontentloaded',
      beforeGoto: async (page) => {
        await page.route('**/api/tasks*', async (route) => {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          await route.continue();
        });
        await page.route('**/api/orders*', async (route) => {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          await route.continue();
        });
      },
    },
  );

  try {
    const loadingChecks = [
      { locator: getOverviewSkeleton(page, 'action-suggestions').first(), label: 'Action suggestions loading skeleton' },
      { locator: getOverviewSkeleton(page, 'summary-cards').first(), label: 'Summary cards loading skeleton' },
      { locator: getOverviewSkeleton(page, 'trend-chart').first(), label: 'Trend chart loading skeleton' },
      { locator: getOverviewSkeleton(page, 'child-performance').first(), label: 'Child performance loading skeleton' },
      { locator: getOverviewSkeleton(page, 'result-board').first(), label: 'Result board loading skeleton' },
      { locator: getOverviewSkeleton(page, 'points-flow-metric').first(), label: 'Points flow loading skeleton' },
      { locator: getOverviewSkeleton(page, 'habit-tracking-stat').first(), label: 'Habit tracking loading skeleton' },
      { locator: getOverviewSkeleton(page, 'comparison-chart').first(), label: 'Comparison chart loading skeleton' },
    ];

    for (const { locator, label } of loadingChecks) {
      await expectClassContains(locator, 'overview-skeleton-surface', label);
      await expectDarkSurface(locator, label);
    }
  } finally {
    await context.close();
    await browser.close();
  }
});

test('parent overview keeps semantic dark surfaces across loaded overview panels', { timeout: 120000 }, async () => {
  const { parentLogin, children } = await createParentAndChildren('parent_overview_dark_loaded', 2);
  const [primaryChild, comparisonChild] = children;

  await seedOverviewScenario(parentLogin, primaryChild.childId, primaryChild.childUsername);
  await seedComparisonChild(parentLogin, comparisonChild.childId);

  const { browser, context, page } = await openDarkParentOverview({
    ...parentLogin.user,
    token: parentLogin.token,
  });

  try {
    await page.getByRole('heading', { name: '关键结果看板' }).waitFor({ state: 'visible' });
    await page.getByRole('heading', { name: '行动建议' }).waitFor({ state: 'visible' });
    await page.getByRole('heading', { name: '任务状态分布' }).waitFor({ state: 'visible' });
    await page.getByRole('heading', { name: '完成趋势' }).waitFor({ state: 'visible' });

    const suggestionRow = getOverviewSurface(page, 'action-suggestion-row').first();
    await expectDarkSurface(suggestionRow, 'Overview suggestion row');

    const totalTasksCard = getOverviewSurface(page, 'core-metric-family-total');
    const totalTasksBadge = totalTasksCard.locator('[data-overview-surface="core-metric-icon"]');
    await expectClassContains(totalTasksBadge, 'overview-icon-badge', 'Core metric icon badge');
    await expectDarkSurface(totalTasksBadge, 'Core metric icon badge');

    const statusDistribution = getOverviewSection(page, 'status-distribution');
    const distributionTrack = statusDistribution.locator('[data-overview-surface="distribution-track-info"]').first();
    await expectClassContains(distributionTrack, 'overview-track', 'Distribution rail');
    await expectDarkSurface(distributionTrack, 'Distribution rail');

    const trendTrack = getOverviewSection(page, 'trend-chart').locator('[data-overview-surface="trend-track"]').first();
    await expectClassContains(trendTrack, 'overview-trend-track', 'Trend track');
    await expectDarkSurface(trendTrack, 'Trend track');

    const resultBoard = getOverviewSection(page, 'result-board');
    const resultCardLabels = ['按时完成', '逾期完成', '待审核', '已完成'];

    for (const label of resultCardLabels) {
      const resultCard = resultBoard.locator(`[data-overview-surface="result-card-${label}"]`);
      await expectDarkSurface(resultCard, `${label} result card`);
      await expectLightText(resultCard.locator('.overview-status-card__value'), `${label} result value`);
    }

    const childPanel = getOverviewSection(page, 'child-performance').locator(
      `[data-overview-child-id="${primaryChild.childId}"]`,
    );
    await childPanel.waitFor({ state: 'visible' });
    await expectDarkSurface(childPanel, 'Child performance panel');
    await expectReadableStatusBadge(
      childPanel.locator('[data-overview-surface="child-chip-pending"]'),
      'Child pending status chip',
    );
    await expectReadableStatusBadge(
      childPanel.locator('[data-overview-surface="child-chip-submitted"]'),
      'Child submitted status chip',
    );
    await expectReadableStatusBadge(
      childPanel.locator('[data-overview-surface="child-chip-pending-order"]'),
      'Child pending-order status chip',
    );

    const pointsFlow = getOverviewSection(page, 'points-flow');
    const pointsMetric = pointsFlow.locator('[data-overview-surface="points-metric-issued"]').first();
    const pointsTopTask = pointsFlow.locator('[data-overview-surface="points-top-task"]').first();
    await expectDarkSurface(pointsMetric, 'Points flow metric tile');
    await expectDarkSurface(pointsTopTask, 'Points flow top task row');

    const comparisonSection = getOverviewSection(page, 'comparison-chart');
    const comparisonTrack = comparisonSection.locator('[data-overview-surface="comparison-track-approvedTasks"]').first();
    const comparisonRankRow = comparisonSection.locator('[data-overview-surface="comparison-rank-row"]').first();
    const comparisonRankBadge = comparisonRankRow.locator('[data-overview-surface="comparison-rank-badge"]').first();
    await expectDarkSurface(comparisonTrack, 'Comparison metric track');
    await expectDarkSurface(comparisonRankRow, 'Comparison ranking row');
    await expectReadableStatusBadge(comparisonRankBadge, 'Comparison ranking badge');
  } finally {
    await context.close();
    await browser.close();
  }
});
