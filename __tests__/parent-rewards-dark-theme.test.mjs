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
  } catch {
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

async function createParent(prefix) {
  const ts = Date.now();
  const parentUsername = `${prefix}_parent_${ts}`;

  return api('/api/auth', {
    method: 'POST',
    body: JSON.stringify({
      username: parentUsername,
      password: PASSWORD,
      action: 'login',
    }),
  });
}

async function openDarkParentRewards(user) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1600 },
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
  await page.goto(`${BASE_URL}/parent/rewards`, {
    waitUntil: 'networkidle',
    timeout: 30000,
  });

  return { browser, context, page };
}

test('parent rewards add modal keeps key surfaces dark in dark theme', { timeout: 120000 }, async () => {
  const parentLogin = await createParent('parent_rewards_dark');
  const { browser, context, page } = await openDarkParentRewards({
    ...parentLogin.user,
    token: parentLogin.token,
  });

  try {
    await page.getByRole('button', { name: '添加奖励' }).click();

    const modal = page
      .getByRole('heading', { name: '添加新奖励' })
      .locator('xpath=ancestor::div[contains(@class,"overflow-hidden")][1]');
    await expectDarkSurface(modal, 'Add reward modal');

    const selectedIcon = modal.locator('button').filter({ hasText: '🎁' }).first();
    await expectDarkSurface(selectedIcon, 'Selected reward icon button');

    const selectedRewardType = modal.getByRole('button', { name: /实物奖励/ });
    await expectDarkSurface(selectedRewardType, 'Selected reward type button');

    await modal.getByRole('button', { name: /特权奖励/ }).click();
    const selectedPrivilegeType = modal.getByRole('button', { name: /特权奖励/ });
    await expectDarkSurface(selectedPrivilegeType, 'Selected privilege reward type button');
  } finally {
    await context.close();
    await browser.close();
  }
});
