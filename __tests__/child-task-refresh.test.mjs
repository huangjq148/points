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
      nickname: 'Task Refresh Child',
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
      points: 12,
      type: 'daily',
      icon: '📝',
      requirePhoto: false,
      startDate: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }),
  });

  await api('/api/tasks', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${parentToken}`,
    },
    body: JSON.stringify({
      taskId: createdTask.task._id,
      status: 'in_progress',
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
  await page.goto(`${BASE_URL}/child/task`, { waitUntil: 'networkidle', timeout: 30000 });
  assert.equal(page.url(), `${BASE_URL}/child/task`);

  return { browser, context, page };
}

test('child task page can refresh task list manually', { timeout: 120000 }, async () => {
  const { parentLogin, childUsername, childId } = await createParentAndChild('task_refresh');
  await createTask(parentLogin.token, childId, '刷新前任务');

  const childLogin = await loginChild(childUsername);
  const { browser, context, page } = await openChildTaskPage({
    ...childLogin.user,
    token: childLogin.token,
  });

  try {
    await page.getByText('共 1 个任务').waitFor();

    await createTask(parentLogin.token, childId, '刷新后任务');

    await page.getByRole('button', { name: '刷新' }).click();

    await page.getByText('共 2 个任务').waitFor();
    await page.getByRole('heading', { name: '刷新后任务' }).waitFor();
  } finally {
    await context.close();
    await browser.close();
  }
});
