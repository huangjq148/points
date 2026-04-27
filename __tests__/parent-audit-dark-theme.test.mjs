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

  const childCreation = await api('/api/children', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${parentLogin.token}`,
    },
    body: JSON.stringify({
      username: childUsername,
      nickname: childUsername,
      avatar: '🧒',
      password: PASSWORD,
    }),
  });

  return {
    parentLogin,
    childId: childCreation.child.id,
  };
}

async function createTask(parentToken, childId, overrides = {}) {
  return api('/api/tasks', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${parentToken}`,
    },
    body: JSON.stringify({
      childId,
      name: '暗色审核详情任务',
      description: '用于验证父母审核页详情弹框的暗色兼容表现',
      points: 28,
      type: 'daily',
      icon: '🧾',
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

async function openDarkParentAudit(currentUser) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1400 },
  });

  await context.addInitScript(({ user }) => {
    localStorage.setItem('little_achievers_user', JSON.stringify(user));
    localStorage.setItem('little_achievers_mode', 'parent');
    localStorage.setItem('little_achievers_active_session', user.id);
    localStorage.setItem(
      'little_achievers_sessions',
      JSON.stringify([
        {
          user,
          token: user.token,
          lastUsedAt: new Date().toISOString(),
        },
      ]),
    );
    localStorage.setItem('access_token', user.token);
    localStorage.setItem('little_achievers_parent_theme', 'dark');
  }, { user: currentUser });

  const page = await context.newPage();
  await page.goto(`${BASE_URL}/parent/audit`, {
    waitUntil: 'networkidle',
    timeout: 30000,
  });

  return { browser, context, page };
}

test('parent audit detail modal keeps key sections dark in dark theme', { timeout: 120000 }, async () => {
  const { parentLogin, childId } = await createParentAndChild('parent_audit_dark');
  const taskName = `暗色审核详情_${Date.now()}`;
  const createdTask = await createTask(parentLogin.token, childId, {
    name: taskName,
  });
  await updateTaskStatus(parentLogin.token, createdTask.task._id, 'submitted');

  const { browser, context, page } = await openDarkParentAudit({
    ...parentLogin.user,
    token: parentLogin.token,
  });

  try {
    await page.getByText(taskName).click();

    const modal = page.locator('.modal-content').last();
    await expectDarkSurface(modal, 'Audit detail modal shell');

    const headerCard = page
      .getByText(taskName)
      .locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]');
    await expectDarkSurface(headerCard, 'Audit detail header card');

    const historyCard = page
      .getByText('第 1 次操作 · 提交')
      .locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]');
    await expectDarkSurface(historyCard, 'Audit detail history card');

    const auditNoteInput = page.getByPlaceholder('请输入审核通过或驳回的原因（选填）');
    await expectDarkSurface(auditNoteInput, 'Audit detail audit note input');

    await expectLightText(page.getByRole('heading', { name: taskName }), 'Audit detail task title');
    await expectLightText(page.getByRole('heading', { name: '历史操作记录' }), 'Audit detail history heading');
    await expectLightText(page.getByRole('heading', { name: '本次审核意见' }), 'Audit detail audit note heading');
  } finally {
    await context.close();
    await browser.close();
  }
});
