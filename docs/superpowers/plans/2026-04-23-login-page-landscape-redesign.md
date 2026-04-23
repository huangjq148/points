# Login Page Landscape Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/login` into a unified, landscape-first split layout that removes role-selection UI while preserving existing auto-register login behavior.

**Architecture:** Keep the current login data flow and theme utilities, but simplify the page state and JSX in `app/login/page.tsx` so the screen becomes one shared login form with a brand panel and a form panel. Move the new split-layout presentation into login-scoped CSS in `app/globals.css`, and protect the redesign with a dedicated Playwright-style page regression test.

**Tech Stack:** Next.js App Router, React 19, TypeScript, global CSS, existing UI components (`Button`, `Input`, `PasswordInput`, `ThemeToggle`), Node test runner, Playwright

---

## Execution Notes

- Review the approved spec first: `docs/superpowers/specs/2026-04-23-login-page-landscape-redesign-design.md`
- Before implementation, use `@superpowers:test-driven-development`
- While editing layout and theme behavior, use `@style-theme-reuse-guard`
- Before claiming completion, use `@superpowers:verification-before-completion`
- The plan assumes a local dev server is available at `http://127.0.0.1:3000` for browser-based tests
- The repository already has Playwright-based `node --test` files under `__tests__/`; follow that pattern instead of introducing a new test framework

## File Map

- Modify: `app/login/page.tsx:1-285`
  Responsibility: remove role/register UI state, keep shared login submission, render the new split layout and concise copy.
- Modify: `app/globals.css:1745-1852`
  Responsibility: replace the portrait-oriented login surface rules with split-card, responsive fallback, and dark-theme-compatible login styles.
- Create: `__tests__/login-page-landscape.test.mjs`
  Responsibility: verify shared-login copy, absence of role toggle/register UI, landscape split layout behavior, and portrait fallback presence at the DOM/style level.

### Task 1: Add Login Page Regression Test

**Files:**
- Create: `__tests__/login-page-landscape.test.mjs`
- Modify: none
- Test: `__tests__/login-page-landscape.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000';

async function openLogin(viewport) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 });
  return { browser, context, page };
}

test('login page exposes a shared login flow without role toggles', async () => {
  const { browser, context, page } = await openLogin({ width: 1440, height: 900 });
  try {
    await page.getByRole('heading', { name: '欢迎登录' }).waitFor();
    await page.getByText('账号统一登录，系统会自动进入对应身份页面').waitFor();
    assert.equal(await page.getByRole('button', { name: '家长登录' }).count(), 0);
    assert.equal(await page.getByRole('button', { name: '孩子登录' }).count(), 0);
    assert.equal(await page.getByRole('button', { name: /点击注册|已有账号/ }).count(), 0);
  } finally {
    await context.close();
    await browser.close();
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `BASE_URL=http://127.0.0.1:3000 node --test __tests__/login-page-landscape.test.mjs`

Expected: FAIL because the current page still renders role-toggle buttons and registration-switch text.

- [ ] **Step 3: Extend the failing test for responsive layout expectations**

```js
test('login page uses split layout in landscape and stacks in portrait', async () => {
  const landscape = await openLogin({ width: 1440, height: 900 });
  const portrait = await openLogin({ width: 430, height: 932 });

  try {
    const landscapeGrid = await landscape.page.locator('.login-shell').evaluate((element) => getComputedStyle(element).gridTemplateColumns);
    assert.notEqual(landscapeGrid, 'none');

    const portraitGrid = await portrait.page.locator('.login-shell').evaluate((element) => getComputedStyle(element).gridTemplateColumns);
    assert.ok(portraitGrid === 'none' || portraitGrid.startsWith('1fr'));
  } finally {
    await landscape.context.close();
    await landscape.browser.close();
    await portrait.context.close();
    await portrait.browser.close();
  }
});
```

- [ ] **Step 4: Run test again to keep the suite red**

Run: `BASE_URL=http://127.0.0.1:3000 node --test __tests__/login-page-landscape.test.mjs`

Expected: FAIL because `.login-shell` does not exist yet and the role-toggle assertions still fail.

- [ ] **Step 5: Commit**

```bash
git add __tests__/login-page-landscape.test.mjs
git commit -m "test: add login landscape regression coverage"
```

### Task 2: Simplify Login Page State And Markup

**Files:**
- Modify: `app/login/page.tsx:1-285`
- Test: `__tests__/login-page-landscape.test.mjs`

- [ ] **Step 1: Remove obsolete role/register state and theme branching**

Replace the current state block:

```tsx
type LoginMode = 'parent' | 'child';
const [mode, setMode] = useState<LoginMode>('parent');
const [isRegister, setIsRegister] = useState(false);
const [newChildName, setNewChildName] = useState('');
```

With the reduced shape:

```tsx
const [theme, setTheme] = useState<ThemeMode>(() => resolvePreferredTheme('parent'));
const [username, setUsername] = useState('');
const [password, setPassword] = useState('');
const [error, setError] = useState('');
const [loading, setLoading] = useState(false);
```

- [ ] **Step 2: Keep submit logic minimal and shared**

Replace mode-specific post-submit branches with:

```tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');

  if (!username.trim() || !password.trim()) {
    setError('请输入账号和密码');
    return;
  }

  setLoading(true);
  const result = await login(username.trim(), password);
  setLoading(false);

  if (!result.success) {
    setError(result.message || '登录失败：账号不存在或密码错误');
  }
};
```

- [ ] **Step 3: Replace the current JSX with shared split-layout markup**

Use a structure shaped like:

```tsx
<div className={`login-container ${isDark ? 'login-theme-dark' : 'login-theme-light'}`}>
  <div className="login-shell">
    <section className="login-brand-panel">
      <p className="login-brand-kicker">LITTLE ACHIEVERS</p>
      <h1 className="login-brand-title">小小奋斗者</h1>
      <p className="login-brand-subtitle">Little Achievers</p>
      <div className="login-rule-list">
        <div className="login-rule-chip">首次家长登录自动注册</div>
        <div className="login-rule-chip">孩子账号由家长创建</div>
      </div>
    </section>

    <section className="login-form-panel">
      <div className="login-theme-toggle">...</div>
      <div className="login-form-header">
        <h2>欢迎登录</h2>
        <p>账号统一登录，系统会自动进入对应身份页面</p>
      </div>
      <form onSubmit={handleSubmit}>...</form>
    </section>
  </div>
</div>
```

- [ ] **Step 4: Reuse existing controls and remove obsolete UI**

Inside the form, keep:

```tsx
<Input label="账号" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="请输入账号" />
<PasswordInput label="密码" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="请输入密码" />
<Button type="submit" fullWidth size="lg" disabled={loading}>
  {loading ? '登录中...' : '登录'}
</Button>
```

Delete all of these from `app/login/page.tsx`:

- role toggle buttons
- mode-based title/subtitle branches
- registration-switch button
- nickname input
- child-only hint panel

- [ ] **Step 5: Run the targeted test to verify the page logic and copy**

Run: `BASE_URL=http://127.0.0.1:3000 node --test __tests__/login-page-landscape.test.mjs`

Expected: still FAIL on layout/style assertions until the CSS task is complete, but role-toggle-related assertions should be moving toward green.

- [ ] **Step 6: Commit**

```bash
git add app/login/page.tsx __tests__/login-page-landscape.test.mjs
git commit -m "refactor: simplify shared login page flow"
```

### Task 3: Add Split Layout And Theme-Safe Login Styles

**Files:**
- Modify: `app/globals.css:1745-1852`
- Modify: `app/login/page.tsx:145-245`
- Test: `__tests__/login-page-landscape.test.mjs`

- [ ] **Step 1: Replace the single-card login rules with split-shell classes**

Add CSS like:

```css
.login-shell {
  position: relative;
  z-index: var(--z-login-card);
  display: grid;
  grid-template-columns: minmax(320px, 0.92fr) minmax(420px, 1.08fr);
  width: min(1080px, 100%);
  min-height: 560px;
  border-radius: 32px;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow: 0 28px 80px rgba(15, 23, 42, 0.18);
}
```

- [ ] **Step 2: Style the brand panel, rule chips, and form panel**

Add focused login-only classes:

```css
.login-brand-panel { ... }
.login-brand-title { ... }
.login-rule-list { display: grid; gap: 12px; }
.login-rule-chip { ... }
.login-form-panel { ... }
.login-form-header h2 { ... }
.login-error { ... }
```

Keep the left panel visually stronger and the right panel calmer. Do not put long paragraph copy back into the CSS-driven layout.

- [ ] **Step 3: Add portrait fallback and landscape compaction**

Add responsive rules like:

```css
@media (max-width: 900px) {
  .login-shell {
    grid-template-columns: 1fr;
    min-height: auto;
  }

  .login-brand-panel {
    min-height: 220px;
  }
}
```

Also tune desktop spacing so the page is visibly shorter than the current portrait card.

- [ ] **Step 4: Add dark-theme overrides for the new classes**

Extend the existing login dark theme section with:

```css
.login-container.login-theme-dark .login-shell { ... }
.login-container.login-theme-dark .login-brand-panel { ... }
.login-container.login-theme-dark .login-form-panel { ... }
.login-container.login-theme-dark .login-rule-chip { ... }
.login-container.login-theme-dark .login-error { ... }
```

The form controls should continue inheriting the existing dark input styles already scoped to `.login-container.login-theme-dark`.

- [ ] **Step 5: Run the targeted regression test until it passes**

Run: `BASE_URL=http://127.0.0.1:3000 node --test __tests__/login-page-landscape.test.mjs`

Expected: PASS, confirming shared-login copy and responsive shell behavior.

- [ ] **Step 6: Run full verification for build health**

Run: `npm run build`

Expected: PASS with a successful Next.js production build.

- [ ] **Step 7: Commit**

```bash
git add app/globals.css app/login/page.tsx __tests__/login-page-landscape.test.mjs
git commit -m "refactor: redesign login page for landscape layout"
```

### Task 4: Manual QA And Cleanup

**Files:**
- Modify: none unless fixes are needed
- Test: `__tests__/login-page-landscape.test.mjs`

- [ ] **Step 1: Manually verify desktop landscape light theme**

Run:

```bash
npm run dev
```

Check `/login` at approximately `1440x900`:

- left brand panel is present
- two short rule chips only
- no role toggle buttons
- no register switch
- no extra nickname field
- form remains vertically compact

- [ ] **Step 2: Manually verify dark theme**

In the same page, toggle dark theme and confirm:

- title/subtitle remain readable
- brand-panel chips remain readable
- input borders and placeholder text remain legible
- error state remains distinct from the background

- [ ] **Step 3: Manually verify portrait fallback**

Check `/login` at approximately `430x932`:

- `.login-shell` stacks vertically
- brand panel compresses into the top section
- form remains the primary focus
- no horizontal overflow

- [ ] **Step 4: Manually verify interaction paths**

Check all of these:

- empty submit shows `请输入账号和密码`
- existing parent account can log in
- existing child account can log in
- first-time parent account auto-registers through existing backend behavior
- wrong password shows an inline error

- [ ] **Step 5: Commit only if manual-fix changes were required**

```bash
git add app/login/page.tsx app/globals.css __tests__/login-page-landscape.test.mjs
git commit -m "fix: polish login page landscape qa issues"
```
