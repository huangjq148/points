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

function getBrightness(color) {
  const hexMatch = color.match(/^#([0-9a-f]{3,8})$/i);
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

  const rgbMatch = color.match(/rgba?\(([^)]+)\)/);
  if (rgbMatch) {
    const [r, g, b, a] = rgbMatch[1]
      .split(',')
      .map((value) => Number.parseFloat(value.trim()));

    if ([r, g, b].some((value) => Number.isNaN(value))) return null;
    if (!Number.isNaN(a) && a <= 0) return null;

    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

  return null;
}

async function readSurface(locator) {
  await locator.waitFor({ state: 'visible' });
  return locator.evaluate((element) => {
    const style = window.getComputedStyle(element);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    const normalizeColor = (value) => {
      if (!context) return value;
      context.fillStyle = '#000';
      context.fillStyle = value;
      return context.fillStyle;
    };

    return {
      className: element.className,
      color: normalizeColor(style.color),
      backgroundColor: normalizeColor(style.backgroundColor),
    };
  });
}

async function expectTextAlign(locator, expected, label) {
  await locator.waitFor({ state: 'visible' });
  const textAlign = await locator.evaluate((element) => window.getComputedStyle(element).textAlign);
  assert.equal(textAlign, expected, `${label} should use ${expected} alignment, got ${textAlign}`);
}

async function expectInlineText(locator, label) {
  await locator.waitFor({ state: 'visible' });
  const positions = await locator.evaluate((element) => {
    const children = Array.from(element.children);
    return children.slice(0, 2).map((child) => child.getBoundingClientRect().top);
  });
  assert.equal(positions.length, 2, `${label} should contain two text rows`);
  assert.ok(Math.abs(positions[1] - positions[0]) <= 3, `${label} should keep label and value on one line, got positions ${positions.join(', ')}`);
}

async function expectBlocksStacked(topLocator, bottomLocator, label) {
  await topLocator.waitFor({ state: 'visible' });
  await bottomLocator.waitFor({ state: 'visible' });
  const [topBottom, bottomTop] = await Promise.all([
    topLocator.evaluate((element) => element.getBoundingClientRect().bottom),
    bottomLocator.evaluate((element) => element.getBoundingClientRect().top),
  ]);
  assert.ok(bottomTop >= topBottom, `${label} should stack in separate rows, got ${topBottom} then ${bottomTop}`);
}

async function expectDarkSurface(locator, label) {
  const surface = await readSurface(locator);
  const brightness = getBrightness(surface.backgroundColor);

  assert.notEqual(
    brightness,
    null,
    `${label} should expose a concrete background color: ${JSON.stringify(surface)}`,
  );

  assert.ok(
    brightness < 140,
    `${label} should stay dark in dark mode, got brightness ${brightness} from ${JSON.stringify(surface)}`,
  );
}

async function expectLightText(locator, label, minBrightness = 150) {
  const surface = await readSurface(locator);
  const brightness = getBrightness(surface.color);

  assert.notEqual(
    brightness,
    null,
    `${label} should expose a concrete text color: ${JSON.stringify(surface)}`,
  );

  assert.ok(
    brightness > minBrightness,
    `${label} should stay readable in dark mode, got brightness ${brightness} from ${JSON.stringify(surface)}`,
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
      nickname: 'Gift Dark Theme Child',
      avatar: '🎁',
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

async function openDarkChildGift(user) {
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
  }, { currentUser: user });

  const page = await context.newPage();
  await page.goto(`${BASE_URL}/child/gift`, { waitUntil: 'networkidle', timeout: 30000 });
  assert.equal(page.url(), `${BASE_URL}/child/gift`);

  return { browser, context, page };
}

test('child gift date picker popup stays readable in dark theme', { timeout: 120000 }, async () => {
  const { childUsername } = await createParentAndChild('child_gift_dark');
  const childLogin = await loginChild(childUsername);

  const { browser, context, page } = await openDarkChildGift({
    ...childLogin.user,
    token: childLogin.token,
  });

  try {
    await page.getByPlaceholder('兑换日期').click();
    await expectDarkSurface(page.locator('.react-datepicker').last(), 'Gift date picker popup');
    await expectLightText(page.locator('.react-datepicker__day-name').first(), 'Gift date picker weekday header');
    await expectLightText(
      page
        .locator('.react-datepicker__day:not(.react-datepicker__day--outside-month):not(.react-datepicker__day--selected):not(.react-datepicker__day--keyboard-selected)')
        .first(),
      'Gift date picker day text',
    );
  } finally {
    await context.close();
    await browser.close();
  }
});

test('child gift shows kid-friendly collection sections', { timeout: 120000 }, async () => {
  const { parentLogin, childUsername, childId } = await createParentAndChild('child_gift_story');

  await api('/api/points/reward', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${parentLogin.token}`,
    },
    body: JSON.stringify({
      childId,
      points: 80,
      reason: 'child gift storytelling setup',
    }),
  });

  const rewardData = await api('/api/rewards', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${parentLogin.token}`,
    },
    body: JSON.stringify({
      name: '星星枕头',
      description: '测试孩子端奖品页',
      points: 18,
      type: 'physical',
      icon: '🛏️',
      stock: 6,
    }),
  });

  const childLogin = await loginChild(childUsername);
  await api('/api/orders', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${childLogin.token}`,
    },
    body: JSON.stringify({
      rewardId: rewardData.reward._id,
    }),
  });

  const { browser, context, page } = await openDarkChildGift({
    ...childLogin.user,
    token: childLogin.token,
  });

  try {
    await page.getByText('我的奖品收藏册').waitFor();
    await page.getByText(/待领取宝贝\s+\d+/).waitFor();
    await page.getByText(/已经带回家\s+\d+/).waitFor();
    await page.getByText('奖品展示墙').waitFor();
  } finally {
    await context.close();
    await browser.close();
  }
});

test('child gift exchange time block aligns with card content', { timeout: 120000 }, async () => {
  const { parentLogin, childUsername, childId } = await createParentAndChild('child_gift_align');

  await api('/api/points/reward', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${parentLogin.token}`,
    },
    body: JSON.stringify({
      childId,
      points: 80,
      reason: 'child gift alignment setup',
    }),
  });

  const rewardData = await api('/api/rewards', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${parentLogin.token}`,
    },
    body: JSON.stringify({
      name: '对齐测试礼物',
      description: '测试奖品墙时间对齐',
      points: 12,
      type: 'physical',
      icon: '🧸',
      stock: 3,
    }),
  });

  const childLogin = await loginChild(childUsername);
  await api('/api/orders', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${childLogin.token}`,
    },
    body: JSON.stringify({
      rewardId: rewardData.reward._id,
    }),
  });

  const { browser, context, page } = await openDarkChildGift({
    ...childLogin.user,
    token: childLogin.token,
  });

  try {
    const timeBlock = page.locator('.child-gift-card-note').first();
    const statusBlock = page.locator('.child-gift-card-status').first();
    await expectTextAlign(timeBlock, 'left', 'Gift exchange time block');
    await expectTextAlign(statusBlock, 'left', 'Gift exchange status block');
    await expectInlineText(timeBlock, 'Gift exchange time block');
    await expectInlineText(statusBlock, 'Gift exchange status block');
    await expectBlocksStacked(timeBlock, statusBlock, 'Gift exchange info blocks');
  } finally {
    await context.close();
    await browser.close();
  }
});

test('child gift detail modal stays dark in dark theme', { timeout: 120000 }, async () => {
  const { parentLogin, childUsername, childId } = await createParentAndChild('child_gift_modal');

  await api('/api/points/reward', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${parentLogin.token}`,
    },
    body: JSON.stringify({
      childId,
      points: 80,
      reason: 'child gift modal setup',
    }),
  });

  const rewardData = await api('/api/rewards', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${parentLogin.token}`,
    },
    body: JSON.stringify({
      name: '暗色弹框礼物',
      description: '测试奖品详情弹框暗色主题',
      points: 16,
      type: 'physical',
      icon: '🎮',
      stock: 4,
    }),
  });

  const childLogin = await loginChild(childUsername);
  await api('/api/orders', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${childLogin.token}`,
    },
    body: JSON.stringify({
      rewardId: rewardData.reward._id,
    }),
  });

  const { browser, context, page } = await openDarkChildGift({
    ...childLogin.user,
    token: childLogin.token,
  });

  try {
    await page.getByText('暗色弹框礼物').first().click();
    await page.getByText('兑换详情').waitFor();
    await expectDarkSurface(
      page.locator('.modal-content').filter({ has: page.getByText('兑换详情') }).first(),
      'Gift detail modal panel',
    );
    await expectDarkSurface(page.locator('.child-gift-detail-modal').first(), 'Gift detail modal inner surface');
  } finally {
    await context.close();
    await browser.close();
  }
});
