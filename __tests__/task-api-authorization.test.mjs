import test from 'node:test';
import assert from 'node:assert/strict';

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
  return { response, json };
}

async function login(username) {
  const { response, json } = await api('/api/auth', {
    method: 'POST',
    body: JSON.stringify({
      username,
      password: PASSWORD,
      action: 'login',
    }),
  });

  assert.equal(response.status, 200, `login failed: ${JSON.stringify(json)}`);
  assert.equal(json.success, true, `login failed: ${JSON.stringify(json)}`);
  return json;
}

async function createChild(parentToken, username, nickname) {
  const { response, json } = await api('/api/children', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${parentToken}`,
    },
    body: JSON.stringify({
      username,
      nickname,
      avatar: '🧒',
      password: PASSWORD,
    }),
  });

  assert.equal(
    response.status,
    200,
    `create child failed: ${JSON.stringify(json)}`,
  );
  assert.equal(
    json.success,
    true,
    `create child failed: ${JSON.stringify(json)}`,
  );
  return json.child;
}

async function createTask(parentToken, childId, name) {
  const { response, json } = await api('/api/tasks', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${parentToken}`,
    },
    body: JSON.stringify({
      childId,
      name,
      description: `${name} 描述`,
      points: 10,
      type: 'daily',
      icon: '📝',
      requirePhoto: false,
      startDate: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }),
  });

  assert.equal(
    response.status,
    200,
    `create task failed: ${JSON.stringify(json)}`,
  );
  assert.equal(
    json.success,
    true,
    `create task failed: ${JSON.stringify(json)}`,
  );
  return json.task;
}

test('task update and delete reject users outside the task family', { timeout: 120000 }, async () => {
  const ts = Date.now();
  const ownerParent = await login(`authz_owner_parent_${ts}`);
  const outsiderParent = await login(`authz_outsider_parent_${ts}`);

  const ownerChild = await createChild(
    ownerParent.token,
    `authz_owner_child_${ts}`,
    'Owner Child',
  );
  const outsiderChild = await createChild(
    outsiderParent.token,
    `authz_outsider_child_${ts}`,
    'Outsider Child',
  );

  const task = await createTask(
    ownerParent.token,
    ownerChild.id,
    '权限校验任务',
  );

  const outsiderChildLogin = await login(`authz_outsider_child_${ts}`);

  const updateAttempt = await api('/api/tasks', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${outsiderChildLogin.token}`,
    },
    body: JSON.stringify({
      taskId: task._id,
      status: 'submitted',
    }),
  });

  assert.equal(updateAttempt.response.status, 403);
  assert.equal(updateAttempt.json.success, false);

  const deleteAttempt = await api(`/api/tasks?taskId=${task._id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${outsiderParent.token}`,
    },
  });

  assert.equal(deleteAttempt.response.status, 403);
  assert.equal(deleteAttempt.json.success, false);

  const ownerFetch = await api(`/api/tasks?childId=${ownerChild.id}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${ownerParent.token}`,
    },
  });

  assert.equal(ownerFetch.response.status, 200);
  assert.equal(ownerFetch.json.success, true);
  assert.ok(
    ownerFetch.json.tasks.some((item) => item._id === task._id),
    'owner task should still exist after rejected delete',
  );
  assert.equal(
    ownerFetch.json.tasks.find((item) => item._id === task._id)?.status,
    'pending',
    'task status should stay unchanged after rejected update',
  );

  assert.notEqual(ownerChild.id, outsiderChild.id);
});
