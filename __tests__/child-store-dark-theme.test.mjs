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
  const rgbMatch = color.match(/rgba?\(([^)]+)\)/);
  if (rgbMatch) {
    const [r, g, b, a] = rgbMatch[1]
      .split(',')
      .map((value) => Number.parseFloat(value.trim()));

    if ([r, g, b].some((value) => Number.isNaN(value))) return null;
    if (!Number.isNaN(a) && a <= 0) return null;

    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

  const labMatch = color.match(/lab\(\s*([0-9.]+)/);
  if (labMatch) {
    const lightness = Number.parseFloat(labMatch[1]);
    return Number.isNaN(lightness) ? null : (lightness / 100) * 255;
  }

  const oklabMatch = color.match(/oklab\(\s*([0-9.]+)/);
  if (oklabMatch) {
    const lightness = Number.parseFloat(oklabMatch[1]);
    return Number.isNaN(lightness) ? null : lightness * 255;
  }

  const lchMatch = color.match(/lch\(\s*([0-9.]+)/);
  if (lchMatch) {
    const lightness = Number.parseFloat(lchMatch[1]);
    return Number.isNaN(lightness) ? null : (lightness / 100) * 255;
  }

  const oklchMatch = color.match(/oklch\(\s*([0-9.]+)/);
  if (oklchMatch) {
    const lightness = Number.parseFloat(oklchMatch[1]);
    return Number.isNaN(lightness) ? null : lightness * 255;
  }

  const srgbMatch = color.match(/color\(srgb\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)(?:\s*\/\s*([0-9.]+))?/);
  if (srgbMatch) {
    const [, r, g, b, a] = srgbMatch.map((value) => (value === undefined ? value : Number.parseFloat(value)));
    if ([r, g, b].some((value) => Number.isNaN(value))) return null;
    if (a !== undefined && !Number.isNaN(a) && a <= 0) return null;
    return 0.299 * r * 255 + 0.587 * g * 255 + 0.114 * b * 255;
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

    const extractColors = (value) =>
      value.match(/(?:rgba?\([^)]*\)|hsla?\([^)]*\)|lab\([^)]*\)|lch\([^)]*\)|oklab\([^)]*\)|oklch\([^)]*\)|color\([^)]*\)|#[0-9a-fA-F]{3,8})/g) ?? [];

    return {
      className: element.className,
      backgroundColor: normalizeColor(style.backgroundColor),
      backgroundImage: style.backgroundImage,
      gradientColors: extractColors(style.backgroundImage).map(normalizeColor),
    };
  });
}

async function expectDarkSurface(locator, label) {
  const surface = await readSurface(locator);
  const brightnessCandidates = [
    getBrightness(surface.backgroundColor),
    ...surface.gradientColors.map((color) => getBrightness(color)),
  ].filter((value) => value !== null);

  assert.ok(
    brightnessCandidates.length > 0,
    `${label} should expose a concrete background color: ${JSON.stringify(surface)}`,
  );

  const maxBrightness = Math.max(...brightnessCandidates);
  assert.ok(
    maxBrightness < 140,
    `${label} should stay dark in dark mode, got brightness ${maxBrightness} from ${JSON.stringify(surface)}`,
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
      nickname: 'Store Dark Theme Child',
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

async function openDarkChildStore(user) {
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
  await page.goto(`${BASE_URL}/child/store`, { waitUntil: 'networkidle', timeout: 30000 });
  assert.equal(page.url(), `${BASE_URL}/child/store`);

  return { browser, context, page };
}

test('child store keeps shop surfaces dark in dark theme', { timeout: 120000 }, async () => {
  const { parentLogin, childUsername, childId } = await createParentAndChild('child_store_dark');

  await api('/api/points/reward', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${parentLogin.token}`,
    },
    body: JSON.stringify({
      childId,
      points: 80,
      reason: 'child store dark theme setup',
    }),
  });

  const rewardData = await api('/api/rewards', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${parentLogin.token}`,
    },
    body: JSON.stringify({
      name: '暗色奖励卡',
      description: '测试孩子端商城暗色主题',
      points: 20,
      type: 'privilege',
      icon: '🎮',
      stock: 5,
      expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      validDurationValue: 2,
      validDurationUnit: 'day',
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

  const { browser, context, page } = await openDarkChildStore({
    ...childLogin.user,
    token: childLogin.token,
  });

  try {
    await expectDarkSurface(page.locator('.child-store-points-chip'), 'Store points chip');
    await expectDarkSurface(
      page.getByText('暗色奖励卡').locator('xpath=ancestor::div[contains(@class,"reward-card")]').first(),
      'Store reward card',
    );
    await expectDarkSurface(page.getByText('2天').first(), 'Store duration badge');
    await expectDarkSurface(
      page.getByText('时间').locator('xpath=ancestor::div[contains(@class,"child-store-order-meta")]').first(),
      'Store order time surface',
    );

    await page.getByRole('button', { name: '兑换' }).first().click();
    await expectDarkSurface(
      page.getByText('兑换确认').locator('xpath=ancestor::div[contains(@class,"max-w-sm")]').first(),
      'Store redeem confirm modal',
    );
  } finally {
    await context.close();
    await browser.close();
  }
});
