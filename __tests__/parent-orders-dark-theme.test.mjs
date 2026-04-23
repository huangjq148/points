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
  const hexMatch = backgroundColor.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
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

  const labMatch = backgroundColor.match(/lab\(\s*([0-9.]+)/);
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

async function expectNoHorizontalOverflow(locator, label) {
  await locator.waitFor({ state: 'visible' });
  const metrics = await locator.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return {
      className: element.className,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      overflowX: style.overflowX,
      text: element.textContent,
    };
  });

  assert.ok(
    metrics.scrollWidth <= metrics.clientWidth + 1,
    `${label} should not overflow horizontally, got ${JSON.stringify(metrics)}`,
  );
}

async function expectNoHorizontalScrollContainer(locator, label) {
  await locator.waitFor({ state: 'visible' });
  const metrics = await locator.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return {
      className: element.className,
      overflowX: style.overflowX,
    };
  });

  assert.notEqual(
    metrics.overflowX,
    'auto',
    `${label} should not rely on a horizontal scroll container, got ${JSON.stringify(metrics)}`,
  );
  assert.notEqual(
    metrics.overflowX,
    'scroll',
    `${label} should not rely on a horizontal scroll container, got ${JSON.stringify(metrics)}`,
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
      nickname: 'Parent Orders Dark Theme Child',
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

async function createReward(parentToken, overrides = {}) {
  return api('/api/rewards', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${parentToken}`,
    },
    body: JSON.stringify({
      name: '暗色核销测试奖品',
      description: '用于验证家长端核销页暗色样式',
      points: 30,
      type: 'physical',
      icon: '🎁',
      stock: 5,
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

async function updateOrderStatus(parentToken, orderId, action) {
  return api('/api/orders', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${parentToken}`,
    },
    body: JSON.stringify({
      orderId,
      action,
    }),
  });
}

async function createOrderScenario(prefix, finalStatus = 'pending') {
  const { parentLogin, childUsername, childId } = await createParentAndChild(prefix);
  const rewardName = `${prefix}-${finalStatus}-奖品`;

  await api('/api/points/reward', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${parentLogin.token}`,
    },
    body: JSON.stringify({
      childId,
      points: 80,
      reason: `${prefix} setup`,
    }),
  });

  const rewardData = await createReward(parentLogin.token, {
    name: rewardName,
  });

  const childLogin = await loginChild(childUsername);
  const orderData = await createOrder(childLogin.token, rewardData.reward._id);

  if (finalStatus === 'verified' || finalStatus === 'cancelled') {
    await updateOrderStatus(parentLogin.token, orderData.order._id, finalStatus === 'verified' ? 'verify' : 'cancel');
  }

  return {
    parentLogin,
    rewardName,
  };
}

async function openDarkParentOrders(user, path = '/parent/orders') {
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
  await page.goto(`${BASE_URL}${path}`, {
    waitUntil: 'networkidle',
    timeout: 30000,
  });

  return { browser, context, page };
}

test('parent orders page keeps main panels dark in dark theme', { timeout: 120000 }, async () => {
  const { parentLogin, rewardName } = await createOrderScenario('parent_orders_dark');

  const { browser, context, page } = await openDarkParentOrders({
    ...parentLogin.user,
    token: parentLogin.token,
  });

  try {
    await page.getByText(rewardName).waitFor();

    const toolbarPanel = page
      .locator('section')
      .filter({ has: page.getByPlaceholder('搜索孩子或商品') })
      .first();
    await expectDarkSurface(toolbarPanel, 'Orders toolbar panel');

    const orderCard = page
      .getByText(rewardName)
      .locator('xpath=ancestor::div[contains(@class,"group")][1]');
    await expectDarkSurface(orderCard, 'Pending order card');

    const pendingStatValue = page.locator('.reward-stat-card').first().locator('.text-3xl').first();
    await expectLightText(pendingStatValue, 'Top stat card value');
  } finally {
    await context.close();
    await browser.close();
  }
});

test('parent verified orders keep status badge readable in dark theme', { timeout: 120000 }, async () => {
  const { parentLogin, rewardName } = await createOrderScenario('parent_orders_verified_badge', 'verified');
  const { browser, context, page } = await openDarkParentOrders(
    {
      ...parentLogin.user,
      token: parentLogin.token,
    },
    '/parent/orders?status=verified',
  );

  try {
    const orderCard = page.locator('.order-card').filter({ has: page.getByText(rewardName) }).first();
    const statusBadge = orderCard.locator('span').filter({ hasText: '已核销' }).first();
    await expectReadableStatusBadge(statusBadge, 'Verified status badge');
  } finally {
    await context.close();
    await browser.close();
  }
});

test('parent cancelled orders keep status badge readable in dark theme', { timeout: 120000 }, async () => {
  const { parentLogin, rewardName } = await createOrderScenario('parent_orders_cancelled_badge', 'cancelled');
  const { browser, context, page } = await openDarkParentOrders(
    {
      ...parentLogin.user,
      token: parentLogin.token,
    },
    '/parent/orders?status=cancelled',
  );

  try {
    const orderCard = page.locator('.order-card').filter({ has: page.getByText(rewardName) }).first();
    const statusBadge = orderCard.locator('span').filter({ hasText: '已取消' }).first();
    await expectReadableStatusBadge(statusBadge, 'Cancelled status badge');
  } finally {
    await context.close();
    await browser.close();
  }
});

test('parent verified orders keep completion time fully visible in dark theme', { timeout: 120000 }, async () => {
  const { parentLogin, rewardName } = await createOrderScenario('parent_orders_verified_time', 'verified');
  const { browser, context, page } = await openDarkParentOrders(
    {
      ...parentLogin.user,
      token: parentLogin.token,
    },
    '/parent/orders?status=verified',
  );

  try {
    const orderCard = page.locator('.order-card').filter({ has: page.getByText(rewardName) }).first();
    const completionRow = orderCard
      .getByText('完成时间')
      .locator('xpath=ancestor::div[contains(@class,"rounded-[22px]")][1]');
    await expectNoHorizontalScrollContainer(completionRow, 'Verified completion time container');
    await expectNoHorizontalOverflow(completionRow, 'Verified completion time row');
  } finally {
    await context.close();
    await browser.close();
  }
});
