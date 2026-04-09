# Child Wallet Dark Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the child wallet page and its calendar popup render with dark-compatible surfaces when the child app theme is dark.

**Architecture:** Add a wallet-page regression test first, then update wallet-local JSX surfaces to use the existing child and UI theme tokens. Repair the legacy `react-datepicker` global styling so the popup respects shared token colors in both themes without introducing a parallel theme path.

**Tech Stack:** Next.js App Router, React 19, Tailwind utility classes, token-driven global CSS, Playwright via `node:test`

---

## File Structure

- Modify: `app/child/wallet/page.tsx`
  - Scope the wallet page and replace wallet-local bright surfaces with token-based classes.
- Modify: `app/globals.css`
  - Keep wallet-specific overrides bounded and convert the legacy date picker block to token-driven colors.
- Create: `__tests__/child-wallet-dark-theme.test.mjs`
  - Reproduce dark-theme wallet rendering and assert critical surfaces stay dark.

### Task 1: Add the failing wallet dark-theme regression test

**Files:**
- Create: `__tests__/child-wallet-dark-theme.test.mjs`
- Reference: `__tests__/child-store-dark-theme.test.mjs`
- Reference: `app/child/wallet/page.tsx`

- [ ] **Step 1: Write the failing test**

```javascript
test('child wallet keeps wallet surfaces dark in dark theme', { timeout: 120000 }, async () => {
  const { parentLogin, childUsername, childId } = await createParentAndChild('child_wallet_dark');

  await api('/api/points/reward', {
    method: 'POST',
    headers: { Authorization: `Bearer ${parentLogin.token}` },
    body: JSON.stringify({
      childId,
      points: 80,
      reason: 'child wallet dark theme setup',
    }),
  });

  const rewardData = await api('/api/rewards', {
    method: 'POST',
    headers: { Authorization: `Bearer ${parentLogin.token}` },
    body: JSON.stringify({
      name: '暗色钱包奖励',
      description: '测试孩子端钱包暗色主题',
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
    headers: { Authorization: `Bearer ${childLogin.token}` },
    body: JSON.stringify({ rewardId: rewardData.reward._id }),
  });

  const { browser, context, page } = await openDarkChildWallet({
    ...childLogin.user,
    token: childLogin.token,
  });

  try {
    await expectDarkSurface(page.locator('.child-wallet-points-card').first(), 'Wallet points summary');
    await expectDarkSurface(page.locator('.child-wallet-range-button').first(), 'Wallet range button');

    await page.getByPlaceholder('结束日期').click();
    await expectDarkSurface(page.locator('.react-datepicker').last(), 'Wallet date picker popup');

    await page.getByText('暗色钱包奖励').click();
    await page.getByText('账单详情').waitFor();
    await expectDarkSurface(page.locator('.child-wallet-detail-modal').first(), 'Wallet detail modal');
    await expectDarkSurface(page.locator('.child-wallet-detail-surface').first(), 'Wallet detail inner surface');
  } finally {
    await context.close();
    await browser.close();
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --test __tests__/child-wallet-dark-theme.test.mjs
```

Expected: FAIL because the wallet page does not yet expose the scoped classes or still renders at least one bright light-theme surface in dark mode.

- [ ] **Step 3: Write minimal implementation**

```tsx
<div className="child-page-grid child-wallet-page">
  <div className="child-wallet-points-card" />
  <button className="child-wallet-range-button" />
</div>
```

```css
.child-wallet-detail-modal {
  background: var(--ui-panel-bg);
  color: var(--ui-text-primary);
}

.child-wallet-detail-surface {
  background: var(--child-surface-muted);
  border: 1px solid var(--child-border);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
node --test __tests__/child-wallet-dark-theme.test.mjs
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add __tests__/child-wallet-dark-theme.test.mjs app/child/wallet/page.tsx app/globals.css
git commit -m "refactor: support child wallet dark theme"
```

### Task 2: Tokenize wallet-local bright surfaces

**Files:**
- Modify: `app/child/wallet/page.tsx`
- Reference: `components/child/ChildUI.tsx`

- [ ] **Step 1: Write the failing test**

Extend the same wallet regression test to cover any remaining bright surfaces that still fail after the first pass:

```javascript
await expectDarkSurface(page.locator('.child-wallet-pagination-chip').first(), 'Wallet pagination chip');
await expectDarkSurface(page.locator('.child-wallet-detail-close').first(), 'Wallet detail close button');
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --test __tests__/child-wallet-dark-theme.test.mjs
```

Expected: FAIL on the newly asserted wallet-local surface.

- [ ] **Step 3: Write minimal implementation**

Update `app/child/wallet/page.tsx` to move these surfaces onto shared variables:

```tsx
<span className="child-wallet-pagination-chip rounded-full px-4 py-2 text-sm font-semibold">
  {ledgerPage} / {totalPages}
</span>

<button className="child-wallet-detail-close flex h-10 w-10 items-center justify-center rounded-full">
  <X size={18} />
</button>
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
node --test __tests__/child-wallet-dark-theme.test.mjs
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add __tests__/child-wallet-dark-theme.test.mjs app/child/wallet/page.tsx app/globals.css
git commit -m "refactor: tune child wallet dark surfaces"
```

### Task 3: Repair the shared date picker popup theming

**Files:**
- Modify: `app/globals.css`
- Reference: `components/ui/DatePicker.tsx`

- [ ] **Step 1: Write the failing test**

Use the existing wallet test popup assertion as the failing proof:

```javascript
await page.getByPlaceholder('结束日期').click();
await expectDarkSurface(page.locator('.react-datepicker').last(), 'Wallet date picker popup');
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --test __tests__/child-wallet-dark-theme.test.mjs
```

Expected: FAIL because the legacy `.react-datepicker` styles still force light backgrounds with `!important`.

- [ ] **Step 3: Write minimal implementation**

Convert the older global date picker block from hard-coded light colors to shared token values:

```css
.react-datepicker {
  border: 1px solid var(--ui-border) !important;
  box-shadow: var(--ui-shadow-md) !important;
  background: var(--ui-panel-bg) !important;
}

.react-datepicker__header {
  background: var(--ui-surface-2) !important;
  border-bottom: 1px solid var(--ui-border) !important;
}

.react-datepicker__current-month,
.react-datepicker-time__header {
  color: var(--ui-text-primary) !important;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
node --test __tests__/child-wallet-dark-theme.test.mjs
```

Expected: PASS and the popup stays dark in child dark theme.

- [ ] **Step 5: Commit**

```bash
git add __tests__/child-wallet-dark-theme.test.mjs app/globals.css
git commit -m "refactor: align date picker with shared theme tokens"
```

## Self-Review

- Spec coverage: the plan covers wallet summary, filter controls, popup calendar, modal surfaces, and bounded global CSS changes.
- Placeholder scan: no TBD or implicit “write tests later” steps remain.
- Type consistency: the scoped CSS class names are reused consistently between the test plan and implementation targets.
