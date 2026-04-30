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
      nickname: 'Task Flow Child',
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

async function createTask(parentToken, childId, name) {
  const createdTask = await api('/api/tasks', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${parentToken}`,
    },
    body: JSON.stringify({
      childId,
      name,
      description: `${name} 描述`,
      points: 8,
      type: 'daily',
      icon: '📝',
      requirePhoto: false,
      startDate: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }),
  });

  return createdTask.task;
}

async function openChildTaskPage(user) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1400 },
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
  }, { currentUser: user });

  const page = await context.newPage();
  await page.goto(`${BASE_URL}/child/task`, {
    waitUntil: 'networkidle',
    timeout: 30000,
  });

  return { browser, context, page };
}

test('pending task card opens detail first and exposes button semantics', { timeout: 120000 }, async () => {
  const { parentLogin, childUsername, childId } = await createParentAndChild('task_flow');
  await createTask(parentLogin.token, childId, '待开始任务卡片');

  const childLogin = await loginChild(childUsername);
  const { browser, context, page } = await openChildTaskPage({
    ...childLogin.user,
    token: childLogin.token,
  });

  try {
    const taskCard = page
      .locator('[role="button"]')
      .filter({ has: page.getByRole('heading', { name: '待开始任务卡片' }) })
      .first();
    const startTaskButton = page.getByRole('button', { name: '🚀 开始任务' });

    await taskCard.waitFor({ state: 'visible' });
    await taskCard.click();

    await startTaskButton.waitFor();
    await assert.rejects(
      page.getByText('上传任务照片', { exact: true }).waitFor({ timeout: 1500 }),
    );

    await page.keyboard.press('Escape');
    await taskCard.focus();
    await page.keyboard.press('Enter');

    await startTaskButton.waitFor();
  } finally {
    await context.close();
    await browser.close();
  }
});
