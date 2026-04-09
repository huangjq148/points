# Parent Overview Dark Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the parent overview page visually coherent in dark mode by removing the remaining light-theme status surfaces while keeping light mode effectively unchanged.

**Architecture:** Add a small overview-specific semantic surface layer for the parent overview route instead of continuing to hard-code light utility colors inside JSX. Cover the visible regressions with a new browser-based dark-theme regression test, then update the overview page and its visible nested components to use shared semantic classes that map cleanly in both light and dark themes.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS v4 utilities, global CSS in `app/globals.css`, existing parent overview route/components, Node `node:test`, and Playwright.

---

## Reference Inputs

- Approved design spec: `docs/superpowers/specs/2026-04-09-parent-overview-dark-theme-design.md`
- Existing related regression test: `__tests__/parent-orders-dark-theme.test.mjs`
- Primary route under test: `/parent/overview`

## File Map

- Create: `__tests__/parent-overview-dark-theme.test.mjs`
  - Browser regression coverage for overview dark-theme status cards, child chips, suggestion rows, and nested insight surfaces.
- Modify: `app/parent/overview/page.tsx`
  - Replace overview-page light-theme-only status styling with overview semantic classes for suggestions, tracks, child chips, and key result cards.
- Modify: `app/parent/overview/components/PointsFlow.tsx`
  - Move visible nested metric tiles onto the same semantic overview surface system.
- Modify: `app/parent/overview/components/ComparisonChart.tsx`
  - Move ranking badges and ranking rows onto the same semantic overview surface system.
- Modify: `app/globals.css`
  - Add light-theme semantic overview classes and bounded `.parent-theme-dark .overview-page ...` overrides.

## Task 1: Add The First Failing Overview Dark-Theme Regression Test

**Files:**
- Create: `__tests__/parent-overview-dark-theme.test.mjs`

- [ ] **Step 1: Write the failing test file**

Create `__tests__/parent-overview-dark-theme.test.mjs` with this content:

```js
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

async function createChild(parentToken, username, nickname, avatar) {
  const childCreate = await api('/api/children', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${parentToken}`,
    },
    body: JSON.stringify({
      username,
      nickname,
      avatar,
      password: PASSWORD,
    }),
  });

  return childCreate.child;
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

async function rewardPoints(parentToken, childId, points, reason) {
  return api('/api/points/reward', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${parentToken}`,
    },
    body: JSON.stringify({
      childId,
      points,
      reason,
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
      name: '总览暗色主题任务',
      description: '验证家长端总览页暗色状态块',
      points: 12,
      type: 'daily',
      icon: '📝',
      requirePhoto: false,
      startDate: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      ...overrides,
    }),
  });
}

async function updateTaskStatus(parentToken, taskId, status, extra = {}) {
  return api('/api/tasks', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${parentToken}`,
    },
    body: JSON.stringify({
      taskId,
      status,
      ...extra,
    }),
  });
}

async function createReward(parentToken, name) {
  return api('/api/rewards', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${parentToken}`,
    },
    body: JSON.stringify({
      name,
      description: '家长端总览深色主题兑换物品',
      points: 30,
      type: 'physical',
      icon: '🎁',
      stock: 5,
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

async function createOverviewScenario(prefix) {
  const parentLogin = await createParent(prefix);
  const ts = Date.now();
  const childAUsername = `${prefix}_child_a_${ts}`;
  const childBUsername = `${prefix}_child_b_${ts}`;

  const childA = await createChild(parentLogin.token, childAUsername, 'Overview Dark A', '🦊');
  const childB = await createChild(parentLogin.token, childBUsername, 'Overview Dark B', '🐼');

  await rewardPoints(parentLogin.token, childA.id, 120, `${prefix} setup A`);
  await rewardPoints(parentLogin.token, childB.id, 80, `${prefix} setup B`);

  const pendingTask = await createTask(parentLogin.token, childA.id, {
    name: '待完成任务',
  });

  const submittedTask = await createTask(parentLogin.token, childA.id, {
    name: '待审核任务',
  });
  await updateTaskStatus(parentLogin.token, submittedTask.task._id, 'submitted');

  const approvedOnTimeTask = await createTask(parentLogin.token, childA.id, {
    name: '按时完成任务',
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });
  await updateTaskStatus(parentLogin.token, approvedOnTimeTask.task._id, 'approved');

  const approvedOverdueTask = await createTask(parentLogin.token, childB.id, {
    name: '逾期完成任务',
    deadline: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  });
  await updateTaskStatus(parentLogin.token, approvedOverdueTask.task._id, 'approved');

  const reward = await createReward(parentLogin.token, `${prefix}-overview-奖品`);
  const childALogin = await loginChild(childAUsername);
  await createOrder(childALogin.token, reward.reward._id);

  return {
    parentLogin,
    childAUsername,
    childBUsername,
    pendingTaskId: pendingTask.task._id,
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

test('parent overview keeps result cards and child status chips dark in dark theme', { timeout: 120000 }, async () => {
  const { parentLogin } = await createOverviewScenario('parent_overview_dark_cards');
  const { browser, context, page } = await openDarkParentOverview({
    ...parentLogin.user,
    token: parentLogin.token,
  });

  try {
    const onTimeCard = page
      .getByText('按时完成')
      .locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]');
    const overdueCard = page
      .getByText('逾期完成')
      .locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]');
    const submittedCard = page
      .getByText('待审核')
      .last()
      .locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]');
    const approvedCard = page
      .getByText('已完成')
      .last()
      .locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]');
    const suggestionRow = page
      .getByText('先处理 1 条待审核任务，孩子反馈会更及时。')
      .locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]');
    const childCard = page
      .getByText('Overview Dark A')
      .locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]');
    const pendingTag = childCard.getByText('待完成 1');
    const submittedTag = childCard.getByText('待审核 1');
    const orderTag = childCard.getByText('待核销 1');

    await expectDarkSurface(onTimeCard, 'On-time result card');
    await expectDarkSurface(overdueCard, 'Overdue result card');
    await expectDarkSurface(submittedCard, 'Submitted result card');
    await expectDarkSurface(approvedCard, 'Approved result card');
    await expectDarkSurface(suggestionRow, 'Overview suggestion row');
    await expectReadableStatusBadge(pendingTag, 'Child pending tag');
    await expectReadableStatusBadge(submittedTag, 'Child submitted tag');
    await expectReadableStatusBadge(orderTag, 'Child pending order tag');
    await expectLightText(onTimeCard.locator('p').last(), 'On-time result value');
  } finally {
    await context.close();
    await browser.close();
  }
});
```

- [ ] **Step 2: Run the new test to verify it fails**

Run:

```bash
node --test --test-name-pattern "result cards and child status chips" __tests__/parent-overview-dark-theme.test.mjs
```

Expected: FAIL because the overview result cards, child status chips, or suggestion row still resolve to light backgrounds in dark mode.

## Task 2: Make The Page-Level Overview Surfaces Pass The First Test

**Files:**
- Modify: `app/parent/overview/page.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Replace the overview page card metadata with semantic tones**

In `app/parent/overview/page.tsx`, add this type above `export default function OverviewPage()`:

```tsx
type OverviewTone = "info" | "warning" | "accent" | "success" | "danger";
```

Then replace the current `coreCards` definition with:

```tsx
  const coreCards = data
    ? [
        {
          label: "家庭总任务",
          value: data.pulse.totalTasks,
          icon: ListChecks,
          tone: "info" as const,
          href: "/parent/tasks",
        },
        {
          label: "待审核",
          value: data.pulse.submitted,
          icon: Clock,
          tone: "warning" as const,
          href: "/parent/audit",
        },
        {
          label: "待核销",
          value: data.pulse.pendingOrders,
          icon: Star,
          tone: "accent" as const,
          href: "/parent/orders?status=pending",
        },
        {
          label: "可用总积分",
          value: data.pulse.totalAvailablePoints,
          icon: Sparkles,
          tone: "success" as const,
        },
      ]
    : [];
```

Add this `resultCards` block under `const urgentLevel = ...`:

```tsx
  const resultCards = data
    ? [
        {
          label: "按时完成",
          value: data.pulse.onTimeCount,
          icon: CheckCircle,
          tone: "success" as const,
        },
        {
          label: "逾期完成",
          value: data.pulse.overdueCount,
          icon: XCircle,
          tone: "danger" as const,
        },
        {
          label: "待审核",
          value: data.pulse.submitted,
          icon: Clock,
          tone: "warning" as const,
        },
        {
          label: "已完成",
          value: data.pulse.approved,
          icon: Trophy,
          tone: "info" as const,
        },
      ]
    : [];
```

- [ ] **Step 2: Replace the visible overview page blocks with semantic classes**

In `app/parent/overview/page.tsx`, make these exact JSX replacements.

Replace the empty-state icon surface:

```tsx
        <div className="overview-soft-surface overview-soft-surface-icon w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ListChecks size={32} className="text-slate-400" />
        </div>
```

Replace the error banner:

```tsx
      {error && <div className="overview-alert overview-alert-danger text-sm">{error}</div>}
```

Replace each suggestion row with:

```tsx
              <div
                key={index}
                className={`overview-soft-surface overview-soft-surface-interactive p-3 rounded-2xl flex items-start gap-3 ${
                  tip.href ? "cursor-pointer transition-colors" : ""
                }`}
                onClick={() => tip.href && router.push(tip.href)}
              >
                <div className="overview-icon-badge overview-icon-badge-info w-7 h-7 rounded-full text-sm font-bold flex items-center justify-center shrink-0">
                  {index + 1}
                </div>
                <p className="text-sm text-slate-700 leading-6">{tip.text}</p>
              </div>
```

Replace the core card icon wrapper with:

```tsx
                <div
                  className={`overview-icon-badge overview-icon-badge-${item.tone} w-10 h-10 rounded-xl flex items-center justify-center mb-3`}
                >
                  <item.icon size={20} />
                </div>
```

Replace both distribution tracks:

```tsx
                      <div className="overview-track flex-1 h-4 rounded-full overflow-hidden">
```

Replace the trend bar background:

```tsx
                  <div className="overview-trend-track w-full rounded-xl overflow-hidden h-24 flex items-end">
```

Replace each child panel row with:

```tsx
                <div
                  key={child.id}
                  className="overview-soft-surface overview-soft-surface-interactive p-3 rounded-2xl cursor-pointer transition-colors"
                  onClick={() => router.push(`/parent/tasks?childId=${child.id}`)}
                >
```

Replace the three child status tags with:

```tsx
                    <div
                      className="overview-status-chip overview-status-chip-warning rounded-xl px-2 py-1 text-center cursor-pointer transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/parent/tasks?status=uncompleted&childId=${child.id}`);
                      }}
                    >
                      待完成 {child.pendingCount}
                    </div>
                    <div
                      className="overview-status-chip overview-status-chip-info rounded-xl px-2 py-1 text-center cursor-pointer transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/parent/audit?childId=${child.id}`);
                      }}
                    >
                      待审核 {child.submittedCount}
                    </div>
                    <div
                      className="overview-status-chip overview-status-chip-accent rounded-xl px-2 py-1 text-center cursor-pointer transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/parent/orders?status=pending&childId=${child.id}`);
                      }}
                    >
                      待核销 {child.orderCount}
                    </div>
```

Replace the key result board grid with:

```tsx
            <div className="grid grid-cols-2 gap-3">
              {resultCards.map((item) => (
                <div key={item.label} className={`overview-status-card overview-status-card-${item.tone} p-3 rounded-xl`}>
                  <div className="overview-status-card-head flex items-center gap-2 mb-1">
                    <item.icon size={16} />
                    <span className="text-xs font-medium">{item.label}</span>
                  </div>
                  <p className="overview-status-card-value text-xl font-bold">{item.value}</p>
                </div>
              ))}
            </div>
```

- [ ] **Step 3: Add the page-level overview semantic CSS**

In `app/globals.css`, add this block near the existing overview/parent shared card styles, before the `.parent-theme-dark .overview-page .card` override section:

```css
.overview-alert {
  border-radius: 20px;
  border: 1px solid transparent;
  padding: 14px 16px;
}

.overview-alert-danger {
  background: rgba(254, 242, 242, 0.92);
  border-color: rgba(252, 165, 165, 0.5);
  color: #b91c1c;
}

.overview-soft-surface {
  border: 1px solid rgba(226, 232, 240, 0.92);
  background: rgba(255, 255, 255, 0.88);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.78);
}

.overview-soft-surface-icon {
  background: rgba(248, 250, 252, 0.96);
}

.overview-soft-surface-interactive {
  transition:
    transform 180ms ease,
    background 180ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease;
}

.overview-soft-surface-interactive:hover {
  transform: translateY(-1px);
  background: rgba(248, 250, 252, 0.98);
  border-color: rgba(191, 219, 254, 0.9);
  box-shadow:
    0 12px 24px rgba(148, 163, 184, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.84);
}

.overview-icon-badge {
  border: 1px solid transparent;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.52);
}

.overview-icon-badge-info {
  background: rgba(219, 234, 254, 0.96);
  border-color: rgba(147, 197, 253, 0.72);
  color: #1d4ed8;
}

.overview-icon-badge-warning {
  background: rgba(254, 243, 199, 0.96);
  border-color: rgba(252, 211, 77, 0.7);
  color: #b45309;
}

.overview-icon-badge-accent {
  background: rgba(224, 231, 255, 0.96);
  border-color: rgba(165, 180, 252, 0.7);
  color: #4338ca;
}

.overview-icon-badge-success {
  background: rgba(209, 250, 229, 0.96);
  border-color: rgba(110, 231, 183, 0.72);
  color: #047857;
}

.overview-status-chip {
  border: 1px solid transparent;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
}

.overview-status-chip-warning {
  background: rgba(255, 237, 213, 0.96);
  border-color: rgba(253, 186, 116, 0.72);
  color: #c2410c;
}

.overview-status-chip-info {
  background: rgba(219, 234, 254, 0.96);
  border-color: rgba(147, 197, 253, 0.72);
  color: #1d4ed8;
}

.overview-status-chip-accent {
  background: rgba(224, 231, 255, 0.96);
  border-color: rgba(165, 180, 252, 0.72);
  color: #4338ca;
}

.overview-status-card {
  border: 1px solid transparent;
  box-shadow:
    0 10px 22px rgba(15, 23, 42, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.65);
}

.overview-status-card-head {
  color: inherit;
}

.overview-status-card-value {
  color: inherit;
}

.overview-status-card-success {
  background: linear-gradient(135deg, rgba(236, 253, 245, 0.96) 0%, rgba(209, 250, 229, 0.9) 100%);
  border-color: rgba(110, 231, 183, 0.72);
  color: #047857;
}

.overview-status-card-danger {
  background: linear-gradient(135deg, rgba(255, 241, 242, 0.96) 0%, rgba(254, 205, 211, 0.9) 100%);
  border-color: rgba(251, 113, 133, 0.56);
  color: #be123c;
}

.overview-status-card-warning {
  background: linear-gradient(135deg, rgba(254, 252, 232, 0.96) 0%, rgba(254, 243, 199, 0.9) 100%);
  border-color: rgba(252, 211, 77, 0.62);
  color: #a16207;
}

.overview-status-card-info {
  background: linear-gradient(135deg, rgba(239, 246, 255, 0.96) 0%, rgba(219, 234, 254, 0.9) 100%);
  border-color: rgba(147, 197, 253, 0.62);
  color: #1d4ed8;
}

.overview-track {
  background: rgba(226, 232, 240, 0.96);
}

.overview-trend-track {
  background: linear-gradient(180deg, rgba(219, 234, 254, 0.92) 0%, rgba(224, 231, 255, 0.88) 100%);
  border: 1px solid rgba(191, 219, 254, 0.72);
}

.parent-theme-dark .overview-page .overview-alert-danger {
  background: rgba(127, 29, 29, 0.28);
  border-color: rgba(248, 113, 113, 0.3);
  color: #fecaca;
}

.parent-theme-dark .overview-page .overview-soft-surface {
  background: rgba(15, 23, 42, 0.78);
  border-color: rgba(71, 85, 105, 0.78);
  box-shadow:
    0 12px 24px rgba(2, 6, 23, 0.2),
    inset 0 1px 0 rgba(148, 163, 184, 0.08);
}

.parent-theme-dark .overview-page .overview-soft-surface-icon {
  background: rgba(30, 41, 59, 0.88);
}

.parent-theme-dark .overview-page .overview-soft-surface-interactive:hover {
  background: rgba(30, 41, 59, 0.92);
  border-color: rgba(96, 165, 250, 0.34);
  box-shadow:
    0 16px 28px rgba(2, 6, 23, 0.24),
    inset 0 1px 0 rgba(148, 163, 184, 0.08);
}

.parent-theme-dark .overview-page .overview-icon-badge {
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.parent-theme-dark .overview-page .overview-icon-badge-info {
  background: rgba(30, 64, 175, 0.24);
  border-color: rgba(96, 165, 250, 0.3);
  color: #bfdbfe;
}

.parent-theme-dark .overview-page .overview-icon-badge-warning {
  background: rgba(146, 64, 14, 0.28);
  border-color: rgba(251, 191, 36, 0.3);
  color: #fde68a;
}

.parent-theme-dark .overview-page .overview-icon-badge-accent {
  background: rgba(67, 56, 202, 0.24);
  border-color: rgba(129, 140, 248, 0.3);
  color: #c7d2fe;
}

.parent-theme-dark .overview-page .overview-icon-badge-success {
  background: rgba(6, 95, 70, 0.26);
  border-color: rgba(52, 211, 153, 0.3);
  color: #a7f3d0;
}

.parent-theme-dark .overview-page .overview-status-chip-warning {
  background: rgba(146, 64, 14, 0.28);
  border-color: rgba(251, 191, 36, 0.3);
  color: #fde68a;
}

.parent-theme-dark .overview-page .overview-status-chip-info {
  background: rgba(30, 64, 175, 0.24);
  border-color: rgba(96, 165, 250, 0.3);
  color: #bfdbfe;
}

.parent-theme-dark .overview-page .overview-status-chip-accent {
  background: rgba(67, 56, 202, 0.24);
  border-color: rgba(129, 140, 248, 0.3);
  color: #c7d2fe;
}

.parent-theme-dark .overview-page .overview-status-card {
  box-shadow:
    0 16px 30px rgba(2, 6, 23, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.parent-theme-dark .overview-page .overview-status-card-success {
  background: linear-gradient(135deg, rgba(6, 95, 70, 0.34) 0%, rgba(15, 23, 42, 0.94) 100%);
  border-color: rgba(52, 211, 153, 0.3);
  color: #a7f3d0;
}

.parent-theme-dark .overview-page .overview-status-card-danger {
  background: linear-gradient(135deg, rgba(159, 18, 57, 0.32) 0%, rgba(15, 23, 42, 0.94) 100%);
  border-color: rgba(244, 114, 182, 0.28);
  color: #fecdd3;
}

.parent-theme-dark .overview-page .overview-status-card-warning {
  background: linear-gradient(135deg, rgba(146, 64, 14, 0.32) 0%, rgba(15, 23, 42, 0.94) 100%);
  border-color: rgba(251, 191, 36, 0.28);
  color: #fde68a;
}

.parent-theme-dark .overview-page .overview-status-card-info {
  background: linear-gradient(135deg, rgba(30, 64, 175, 0.32) 0%, rgba(15, 23, 42, 0.94) 100%);
  border-color: rgba(96, 165, 250, 0.28);
  color: #bfdbfe;
}

.parent-theme-dark .overview-page .overview-track {
  background: rgba(51, 65, 85, 0.7);
}

.parent-theme-dark .overview-page .overview-trend-track {
  background: linear-gradient(180deg, rgba(30, 41, 59, 0.94) 0%, rgba(15, 23, 42, 0.92) 100%);
  border-color: rgba(71, 85, 105, 0.68);
}
```

- [ ] **Step 4: Run the first targeted test to verify it passes**

Run:

```bash
node --test --test-name-pattern "result cards and child status chips" __tests__/parent-overview-dark-theme.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit the page-level fix**

Run:

```bash
git add __tests__/parent-overview-dark-theme.test.mjs app/parent/overview/page.tsx app/globals.css
git commit -m "fix: 优化家长端总览核心暗色卡片"
```

Expected: One commit containing the new regression test plus the page-level semantic dark-theme fix.

## Task 3: Add A Second Failing Test For Nested Overview Insight Surfaces

**Files:**
- Modify: `__tests__/parent-overview-dark-theme.test.mjs`

- [ ] **Step 1: Extend the test file with a nested-surface regression**

Append this second test to `__tests__/parent-overview-dark-theme.test.mjs`:

```js
test('parent overview keeps nested insight surfaces dark in dark theme', { timeout: 120000 }, async () => {
  const { parentLogin } = await createOverviewScenario('parent_overview_nested_surfaces');
  const { browser, context, page } = await openDarkParentOverview({
    ...parentLogin.user,
    token: parentLogin.token,
  });

  try {
    await page.getByText('积分流转').waitFor();

    const currentBalanceCard = page
      .getByText('当前余额')
      .locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]');
    const currentBalanceIconSurface = currentBalanceCard.locator('xpath=.//div[contains(@class,"w-8") and contains(@class,"h-8")][1]');
    const rankingBadge = page
      .getByText('综合排名')
      .locator('xpath=following-sibling::div[1]//div[contains(@class,"w-6") and contains(@class,"h-6")][1]');

    await expectDarkSurface(currentBalanceIconSurface, 'Points flow current balance icon surface');
    await expectReadableStatusBadge(rankingBadge, 'Comparison top ranking badge');
  } finally {
    await context.close();
    await browser.close();
  }
});
```

- [ ] **Step 2: Run the new nested-surface test to verify it fails**

Run:

```bash
node --test --test-name-pattern "nested insight surfaces" __tests__/parent-overview-dark-theme.test.mjs
```

Expected: FAIL because the points-flow icon surface or comparison ranking badge still uses light-theme-only styling in dark mode.

## Task 4: Make Nested Overview Components Pass The Second Test

**Files:**
- Modify: `app/parent/overview/components/PointsFlow.tsx`
- Modify: `app/parent/overview/components/ComparisonChart.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Replace `PointsFlow` nested tiles with overview semantic surfaces**

In `app/parent/overview/components/PointsFlow.tsx`, replace the current `metrics` definition with:

```tsx
  const metrics = [
    {
      label: "本周发放",
      value: data.issuedThisWeek,
      icon: TrendingUp,
      tone: "success" as const,
      prefix: "",
    },
    {
      label: "本周消耗",
      value: data.redeemedThisWeek,
      icon: TrendingDown,
      tone: "danger" as const,
      prefix: "",
    },
    {
      label: "净流量",
      value: Math.abs(netFlow),
      icon: isPositive ? TrendingUp : TrendingDown,
      tone: isPositive ? ("info" as const) : ("warning" as const),
      prefix: isPositive ? "+" : "-",
    },
    {
      label: "当前余额",
      value: data.currentBalance,
      icon: Wallet,
      tone: "accent" as const,
      prefix: "",
    },
  ];
```

Replace each metric tile with:

```tsx
          <div key={item.label} className="overview-soft-surface p-3 rounded-xl">
            <div className={`overview-icon-badge overview-icon-badge-${item.tone} w-8 h-8 rounded-xl flex items-center justify-center mb-2`}>
              <item.icon size={16} />
            </div>
            <p className="text-xl font-bold text-slate-800">
              {item.prefix}{item.value}
            </p>
            <p className="text-xs text-slate-500">{item.label}</p>
          </div>
```

Replace the top-task row wrapper with:

```tsx
              <div
                key={index}
                className="overview-soft-surface flex items-center justify-between p-2 rounded-xl"
              >
```

- [ ] **Step 2: Replace `ComparisonChart` ranking rows and medals with overview semantic surfaces**

In `app/parent/overview/components/ComparisonChart.tsx`, replace the ranking card and medal markup with:

```tsx
              <div
                key={child.childId}
                className="overview-soft-surface flex items-center gap-3 p-2 rounded-xl"
              >
                <div
                  className={`overview-medal ${
                    index === 0
                      ? "overview-medal-gold"
                      : index === 1
                      ? "overview-medal-silver"
                      : "overview-medal-bronze"
                  } w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold`}
                >
                  {index + 1}
                </div>
                <span className="text-lg">{child.avatar || "👶"}</span>
                <span className="flex-1 font-medium text-slate-800">
                  {child.name}
                </span>
                <div className="text-right">
                  <span className="text-sm font-bold text-slate-700">
                    {child.approvedTasks}
                  </span>
                  <span className="text-xs text-slate-500 ml-1">任务</span>
                </div>
              </div>
```

- [ ] **Step 3: Add the nested overview semantic CSS**

In `app/globals.css`, append these rules right after the overview semantic block added in Task 2:

```css
.overview-medal {
  border: 1px solid transparent;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.48);
}

.overview-medal-gold {
  background: rgba(254, 243, 199, 0.96);
  border-color: rgba(252, 211, 77, 0.72);
  color: #a16207;
}

.overview-medal-silver {
  background: rgba(241, 245, 249, 0.98);
  border-color: rgba(203, 213, 225, 0.88);
  color: #475569;
}

.overview-medal-bronze {
  background: rgba(255, 237, 213, 0.96);
  border-color: rgba(253, 186, 116, 0.72);
  color: #c2410c;
}

.parent-theme-dark .overview-page .overview-medal {
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.parent-theme-dark .overview-page .overview-medal-gold {
  background: rgba(146, 64, 14, 0.32);
  border-color: rgba(251, 191, 36, 0.3);
  color: #fde68a;
}

.parent-theme-dark .overview-page .overview-medal-silver {
  background: rgba(71, 85, 105, 0.34);
  border-color: rgba(148, 163, 184, 0.3);
  color: #e2e8f0;
}

.parent-theme-dark .overview-page .overview-medal-bronze {
  background: rgba(154, 52, 18, 0.3);
  border-color: rgba(251, 146, 60, 0.28);
  color: #fdba74;
}
```

- [ ] **Step 4: Run the full new overview dark-theme test file**

Run:

```bash
node --test __tests__/parent-overview-dark-theme.test.mjs
```

Expected: PASS for both overview dark-theme tests.

- [ ] **Step 5: Commit the nested-surface fix**

Run:

```bash
git add __tests__/parent-overview-dark-theme.test.mjs app/parent/overview/components/PointsFlow.tsx app/parent/overview/components/ComparisonChart.tsx app/globals.css
git commit -m "fix: 补齐家长端总览深色主题细节"
```

Expected: One commit containing the nested overview surface fixes.

## Task 5: Run Final Verification Against Related Dark-Theme Surfaces

**Files:**
- Modify: none

- [ ] **Step 1: Re-run the new overview regression tests**

Run:

```bash
node --test __tests__/parent-overview-dark-theme.test.mjs
```

Expected: PASS.

- [ ] **Step 2: Re-run the existing parent dark-theme regression that is closest in scope**

Run:

```bash
node --test __tests__/parent-orders-dark-theme.test.mjs
```

Expected: PASS.

- [ ] **Step 3: Run the production build**

Run:

```bash
npm run build
```

Expected: PASS with a successful Next.js production build.

- [ ] **Step 4: Manually verify `/parent/overview` in both themes**

Check these exact areas:

```text
Light theme:
- 行动建议 rows stay airy and readable
- 孩子表现面板 tags still look like quick actions
- 关键结果看板 remains clearly color-coded

Dark theme:
- 关键结果看板 no longer shows pale green/red/yellow/blue tiles
- 孩子表现面板 quick tags are dark, tinted, and readable
- 行动建议 row background stays dark
- 积分流转 and 综合排名 no longer leak bright light-mode chips
```

Expected: All four dark-theme checks pass and light theme remains visually close to the current design.
