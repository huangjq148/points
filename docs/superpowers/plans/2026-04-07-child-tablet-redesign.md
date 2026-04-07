# Child Tablet Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the child-facing experience into a unified sunny, landscape-tablet-first learning island across home, task, store, gift, and wallet pages.

**Architecture:** Keep the existing Next.js routes and business logic, but introduce a child-specific visual shell and shared child UI primitives. The shell owns the left navigation rail, compact status bar, theme state, account/settings modals, and scrollable content stage; individual pages reuse shared sunny panels, stat tiles, empty states, and status badges.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS v4 utility classes, existing `Button`, `Input`, `DatePicker`, `Modal`, `ConfirmModal`, `ThemeToggle`, `Pagination`, `request`, `dayjs`, `framer-motion`, and `lucide-react`.

---

## Reference Inputs

- Approved design spec: `docs/superpowers/specs/2026-04-07-child-tablet-redesign-design.md`
- Existing dirty files to preserve and intentionally integrate: `app/child/layout.tsx`, `app/child/page.tsx`
- Local visual-companion artifacts to keep out of implementation commits: `.superpowers/`

## File Map

- Modify: `.gitignore`
  - Add `.superpowers/` so browser brainstorming artifacts stay untracked.
- Modify: `app/globals.css`
  - Add child sunny design tokens, layout classes, reusable child panel/card classes, child dark theme overrides, reduced-motion handling, and shared scroll helpers.
- Create: `components/child/ChildUI.tsx`
  - Export reusable child-specific UI helpers for panels, page headings, stat cards, status pills, and empty states.
- Modify: `app/child/layout.tsx`
  - Replace top header + bottom nav with child learning-island shell using a left rail on tablet/desktop and bottom dock fallback on narrow screens.
  - Preserve account switching, settings, logout confirmation, theme toggle, reduced motion, and clipboard support.
- Modify: `app/child/components/FeatureGrid.tsx`
  - Convert dark gradient cards to sunny learning-island feature cards and remove mouse-only transform logic.
- Modify: `app/child/page.tsx`
  - Remove deep-space/star styling and reorganize home into sunny overview, today's task list, reward/privilege preview, and feature area.
- Modify: `app/child/task/page.tsx`
  - Restyle filters, task list, status cards, pagination, and task modals with child UI primitives.
- Modify: `app/child/store/page.tsx`
  - Restyle store summary, filters, reward grid, order history, and redemption confirmation in the sunny system.
- Modify: `app/child/gift/page.tsx`
  - Restyle gift filters, pending-first gift cards, empty state, and order detail modal.
- Modify: `app/child/wallet/page.tsx`
  - Restyle wallet summary, ledger filters, ledger cards, ledger detail, and task detail overlays.

## Task 1: Protect Local Brainstorming Artifacts

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Check current status**

Run: `git status --short`

Expected: It may show `app/child/layout.tsx`, `app/child/page.tsx`, and `.superpowers/`. Do not revert any of them.

- [ ] **Step 2: Add `.superpowers/` to `.gitignore`**

Add this line near the existing misc/debug ignores:

```gitignore
.superpowers/
```

- [ ] **Step 3: Verify artifacts are ignored**

Run: `git status --short`

Expected: `.superpowers/` no longer appears. Existing child page modifications may still appear.

- [ ] **Step 4: Commit this guard**

Run:

```bash
git add .gitignore
git commit -m "chore: 忽略本地头脑风暴预览文件"
```

Expected: One small commit that only changes `.gitignore`.

## Task 2: Add Child Sunny Design Tokens And Shared CSS

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Add child design variables near `:root` variables**

Append these variables inside `:root` after the existing UI variables:

```css
  --child-bg: #e0f7ff;
  --child-bg-soft: #f0fdfa;
  --child-bg-accent: #eef2ff;
  --child-surface: rgba(255, 255, 255, 0.86);
  --child-surface-strong: rgba(255, 255, 255, 0.96);
  --child-surface-muted: rgba(240, 249, 255, 0.82);
  --child-border: rgba(125, 211, 252, 0.36);
  --child-border-strong: rgba(14, 165, 233, 0.32);
  --child-text: #0f172a;
  --child-text-muted: #64748b;
  --child-primary: #0ea5e9;
  --child-primary-strong: #0284c7;
  --child-secondary: #14b8a6;
  --child-sun: #facc15;
  --child-shadow-soft: 0 18px 44px rgba(14, 116, 144, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.9);
  --child-shadow-card: 0 12px 30px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.88);
```

- [ ] **Step 2: Add child shell and component classes**

Append this block after the existing `.card-child` section:

```css
.child-app {
  min-height: 100dvh;
  color: var(--child-text);
  background:
    radial-gradient(circle at 12% 10%, rgba(250, 204, 21, 0.34), transparent 18rem),
    radial-gradient(circle at 88% 18%, rgba(56, 189, 248, 0.28), transparent 18rem),
    linear-gradient(135deg, var(--child-bg-soft) 0%, var(--child-bg) 48%, var(--child-bg-accent) 100%);
  overflow: hidden;
}

.child-shell {
  display: grid;
  min-height: 100dvh;
  grid-template-columns: 96px minmax(0, 1fr);
  gap: 18px;
  padding: 18px;
}

.child-nav-rail {
  display: flex;
  min-height: 0;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--child-border);
  border-radius: 32px;
  background: var(--child-surface);
  box-shadow: var(--child-shadow-soft);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  padding: 14px 10px;
}

.child-nav-item {
  display: flex;
  min-height: 64px;
  width: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 24px;
  color: var(--child-text-muted);
  transition: transform 180ms ease, background 180ms ease, color 180ms ease, box-shadow 180ms ease;
}

.child-nav-item:hover,
.child-nav-item:focus-visible {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.82);
  color: var(--child-primary-strong);
  outline: none;
  box-shadow: var(--child-shadow-card);
}

.child-nav-item-active {
  background: linear-gradient(135deg, #38bdf8 0%, #14b8a6 100%);
  color: white;
  box-shadow: 0 14px 30px rgba(14, 165, 233, 0.26);
}

.child-workspace {
  display: grid;
  min-width: 0;
  min-height: 0;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 14px;
}

.child-topbar,
.child-panel,
.child-card {
  border: 1px solid var(--child-border);
  background: var(--child-surface);
  box-shadow: var(--child-shadow-card);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
}

.child-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  border-radius: 32px;
  padding: 12px 16px;
}

.child-main {
  min-height: 0;
  overflow: hidden;
  border-radius: 34px;
  border: 1px solid rgba(255, 255, 255, 0.62);
  background: rgba(255, 255, 255, 0.34);
}

.child-main-scroll {
  height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 18px;
}

.child-panel {
  border-radius: 30px;
  padding: 18px;
}

.child-card {
  border-radius: 24px;
  padding: 16px;
}

.child-filter-panel {
  border-radius: 30px;
  border: 1px solid var(--child-border);
  background: var(--child-surface-strong);
  box-shadow: var(--child-shadow-card);
  padding: 16px;
}

.child-page-grid {
  display: grid;
  gap: 16px;
}

.child-two-column {
  grid-template-columns: minmax(0, 1.25fr) minmax(320px, 0.75fr);
}

.child-status-pill {
  display: inline-flex;
  min-height: 28px;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 800;
}

.hide-scrollbar::-webkit-scrollbar {
  display: none;
}

.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
```

- [ ] **Step 3: Add dark theme and reduced-motion support**

Append this block after the child shell classes:

```css
.child-app.child-app-dark {
  --child-bg: #0f172a;
  --child-bg-soft: #111827;
  --child-bg-accent: #1e293b;
  --child-surface: rgba(15, 23, 42, 0.86);
  --child-surface-strong: rgba(15, 23, 42, 0.96);
  --child-surface-muted: rgba(30, 41, 59, 0.82);
  --child-border: rgba(148, 163, 184, 0.26);
  --child-border-strong: rgba(125, 211, 252, 0.28);
  --child-text: #f8fafc;
  --child-text-muted: #cbd5e1;
  --child-shadow-soft: 0 18px 44px rgba(2, 6, 23, 0.42), inset 0 1px 0 rgba(148, 163, 184, 0.12);
  --child-shadow-card: 0 12px 30px rgba(2, 6, 23, 0.36), inset 0 1px 0 rgba(148, 163, 184, 0.1);
}

.child-app.child-reduced-motion *,
.child-app.child-reduced-motion *::before,
.child-app.child-reduced-motion *::after {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  scroll-behavior: auto !important;
  transition-duration: 0.01ms !important;
}

@media (max-width: 767px) {
  .child-shell {
    display: block;
    overflow-y: auto;
    padding: 12px;
  }

  .child-nav-rail {
    position: fixed;
    left: 12px;
    right: 12px;
    bottom: 12px;
    z-index: 50;
    min-height: auto;
    flex-direction: row;
    border-radius: 28px;
    padding: 8px;
  }

  .child-nav-item {
    min-height: 56px;
  }

  .child-workspace {
    min-height: calc(100dvh - 24px);
    padding-bottom: 88px;
  }

  .child-two-column {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 4: Run build to catch CSS syntax issues**

Run: `npm run build`

Expected: Build completes. If it fails, capture the exact TypeScript or CSS error and fix only the files changed in this task.

- [ ] **Step 5: Commit shared CSS**

Run:

```bash
git add app/globals.css
git commit -m "style: 添加孩子端阳光主题样式基础"
```

Expected: Commit includes only `app/globals.css`.

## Task 3: Create Child UI Primitives

**Files:**
- Create: `components/child/ChildUI.tsx`

- [ ] **Step 1: Create the child UI component file**

Create `components/child/ChildUI.tsx` with this content:

```tsx
"use client";

import type { ReactNode } from "react";
import { Gift } from "lucide-react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export type ChildTone = "sky" | "teal" | "amber" | "rose" | "emerald" | "slate" | "violet";

const toneClassMap: Record<ChildTone, string> = {
  sky: "bg-sky-50 text-sky-700 ring-sky-100",
  teal: "bg-teal-50 text-teal-700 ring-teal-100",
  amber: "bg-amber-50 text-amber-700 ring-amber-100",
  rose: "bg-rose-50 text-rose-700 ring-rose-100",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  slate: "bg-slate-100 text-slate-700 ring-slate-200/70",
  violet: "bg-violet-50 text-violet-700 ring-violet-100",
};

const dotClassMap: Record<ChildTone, string> = {
  sky: "bg-sky-500",
  teal: "bg-teal-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  emerald: "bg-emerald-500",
  slate: "bg-slate-500",
  violet: "bg-violet-500",
};

export function ChildPageTitle({
  icon,
  title,
  description,
  action,
  className = "",
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {icon && (
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/90 text-xl shadow-sm ring-1 ring-white">
              {icon}
            </span>
          )}
          <h1 className="text-2xl font-black tracking-tight text-[var(--child-text)] md:text-3xl">{title}</h1>
        </div>
        {description && <p className="mt-1 text-sm font-semibold text-[var(--child-text-muted)]">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ChildPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={cx("child-panel", className)}>{children}</section>;
}

export function ChildCard({
  children,
  className = "",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick) return;
        if (event.key === "Enter" || event.key === " ") onClick();
      }}
      className={cx(
        "child-card transition hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(14,116,144,0.14)]",
        onClick && "cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ChildStatCard({
  label,
  value,
  hint,
  icon,
  tone = "sky",
  onClick,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  tone?: ChildTone;
  onClick?: () => void;
}) {
  return (
    <ChildCard onClick={onClick} className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div className={`rounded-2xl px-2.5 py-1 text-xs font-black ring-1 ${toneClassMap[tone]}`}>{label}</div>
        {icon && <div className="text-[var(--child-text-muted)]">{icon}</div>}
      </div>
      <div className="mt-3 text-3xl font-black text-[var(--child-text)]">{value}</div>
      {hint && <div className="mt-1 text-xs font-semibold text-[var(--child-text-muted)]">{hint}</div>}
    </ChildCard>
  );
}

export function ChildStatusPill({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: ChildTone;
}) {
  return (
    <span className={`child-status-pill ring-1 ${toneClassMap[tone]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotClassMap[tone]}`} />
      {children}
    </span>
  );
}

export function ChildEmptyState({
  title,
  hint,
  icon,
  action,
}: {
  title: string;
  hint: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-dashed border-[var(--child-border-strong)] bg-white/70 px-6 py-12 text-center shadow-sm">
      <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-[24px] bg-sky-50 text-3xl text-sky-500 ring-1 ring-sky-100">
        {icon ?? <Gift size={34} />}
      </div>
      <p className="text-base font-black text-[var(--child-text)]">{title}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--child-text-muted)]">{hint}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Run TypeScript/build check**

Run: `npm run build`

Expected: Build completes. If the import path or JSX typing fails, fix `components/child/ChildUI.tsx` before continuing.

- [ ] **Step 3: Commit child primitives**

Run:

```bash
git add components/child/ChildUI.tsx
git commit -m "feat: 添加孩子端共享界面组件"
```

Expected: Commit includes only `components/child/ChildUI.tsx`.

## Task 4: Convert Child Layout To Learning-Island Shell

**Files:**
- Modify: `app/child/layout.tsx`

- [ ] **Step 1: Preserve existing dirty changes**

Run: `git diff -- app/child/layout.tsx`

Expected: Review the existing nav polish diff and integrate it into the new shell. Do not run checkout/reset commands.

- [ ] **Step 2: Add dark/reduced-motion shell classes**

Update the outermost wrapper in `ChildLayout` to use child classes:

```tsx
<div className={`child-app ${isDarkMode ? "child-app-dark" : "child-app-light"} ${reducedMotion ? "child-reduced-motion" : ""}`}>
```

Remove the old inline `shellBackground` use from the outer wrapper after the new shell is in place.

- [ ] **Step 3: Replace top header and bottom nav with shell structure**

Keep all modal blocks before the shell and settings modal after the shell. Replace the visible header/main/nav block with this structure:

```tsx
<div className="child-shell">
  <aside className="child-nav-rail" aria-label="孩子端导航">
    <button
      type="button"
      onClick={() => setShowChildSwitcher(true)}
      className="mb-2 flex h-16 w-full items-center justify-center rounded-[24px] bg-white/90 text-3xl shadow-sm ring-1 ring-white"
      aria-label="切换孩子"
    >
      {currentUser?.avatar || "👦"}
    </button>
    {[
      { href: "/child", icon: Home, label: "首页", isActive: isHomePage },
      { href: "/child/task", icon: ClipboardList, label: "任务", isActive: isTaskPage },
      { href: "/child/store", icon: ShoppingBag, label: "商城", isActive: isStorePage },
      { href: "/child/gift", icon: Gift, label: "奖品", isActive: isGiftPage },
      { href: "/child/wallet", icon: Wallet, label: "钱包", isActive: isWalletPage },
    ].map((item) => (
      <button
        key={item.href}
        type="button"
        onClick={() => router.push(item.href)}
        className={`child-nav-item ${item.isActive ? "child-nav-item-active" : ""}`}
      >
        <item.icon size={22} strokeWidth={2.5} />
        <span className="text-[11px] font-black">{item.label}</span>
      </button>
    ))}
    <div className="mt-auto flex w-full flex-col gap-2">
      <button type="button" onClick={() => setShowSettingsModal(true)} className="child-nav-item min-h-[52px]" aria-label="设置">
        <Settings size={21} />
        <span className="text-[11px] font-black">设置</span>
      </button>
    </div>
  </aside>

  <div className="child-workspace">
    <header className="child-topbar">
      <button type="button" onClick={() => setShowChildSwitcher(true)} className="flex min-w-0 items-center gap-3 text-left">
        <span className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-white text-3xl shadow-sm ring-1 ring-white">
          {currentUser?.avatar || "👦"}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-xl font-black text-[var(--child-text)]">{currentUser?.username || "小探险家"}</span>
          <span className="mt-1 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">在线学习中</span>
        </span>
      </button>

      <div className="flex items-center gap-2">
        <div className="rounded-2xl bg-yellow-50 px-4 py-2 text-sm font-black text-yellow-800 ring-1 ring-yellow-100">
          积分 {currentUser?.availablePoints || 0}
        </div>
        <ThemeToggle
          theme={isDarkMode ? "dark" : "light"}
          onToggle={() => {
            const next = !isDarkMode;
            setIsDarkMode(next);
            toast.success(next ? "已切换到深色主题" : "已切换到浅色主题");
          }}
          variant="pill"
          className="border-[var(--child-border)] bg-white/80 text-[var(--child-text)]"
        />
        <button type="button" onClick={handleLogout} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80 text-[var(--child-text-muted)] shadow-sm ring-1 ring-white transition hover:text-rose-600">
          <LogOut size={20} />
        </button>
      </div>
    </header>

    <main className="child-main">
      <div className="child-main-scroll hide-scrollbar">
        <div className="mx-auto max-w-6xl">{children}</div>
      </div>
    </main>
  </div>
</div>
```

- [ ] **Step 4: Remove obsolete decorative shell pieces**

Remove these from `app/child/layout.tsx` after the shell works:

```tsx
<StarsBackground />
```

Remove `shellBackground` if it is no longer referenced.

- [ ] **Step 5: Verify layout compiles**

Run: `npm run build`

Expected: Build passes with no unused import errors. If `Sparkles`, `Home`, or other icons become unused, remove the unused imports.

- [ ] **Step 6: Commit child shell**

Run:

```bash
git add app/child/layout.tsx
git commit -m "feat: 重做孩子端横屏导航布局"
```

Expected: Commit includes only intentional `app/child/layout.tsx` shell changes.

## Task 5: Redesign Feature Grid And Home Page

**Files:**
- Modify: `app/child/components/FeatureGrid.tsx`
- Modify: `app/child/page.tsx`

- [ ] **Step 1: Replace `FeatureGrid` card hover behavior**

In `app/child/components/FeatureGrid.tsx`, remove `onMouseEnter`, `onMouseLeave`, inline `transformStyle`, and dark gradient card backgrounds. Use this `FeatureCard` body shape:

```tsx
function FeatureCard({ icon, title, description, badge, variant = "default", span = "single", onClick }: FeatureCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`child-card group min-h-[128px] text-left transition hover:-translate-y-0.5 ${span === "double" ? "md:col-span-2" : ""}`}
    >
      <div className="flex h-full flex-col justify-between gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className={`flex h-14 w-14 items-center justify-center rounded-[22px] bg-white text-3xl shadow-sm ring-1 ring-white ${variant === "time" ? "text-amber-500" : ""}`}>
            {icon}
          </div>
          {badge && (
            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-black text-sky-700 ring-1 ring-sky-100">
              {badge}
            </span>
          )}
        </div>
        <div>
          <h3 className="text-lg font-black tracking-tight text-[var(--child-text)]">{title}</h3>
          <p className="mt-1 text-xs font-semibold leading-5 text-[var(--child-text-muted)]">{description}</p>
        </div>
      </div>
    </button>
  );
}
```

- [ ] **Step 2: Update `FeatureGrid` data labels**

Use child-friendly labels:

```tsx
{ icon: "🛒", title: "奖励商店", description: "看看能兑换什么", badge: "商店", path: "/child/store" }
{ icon: "🎈", title: "特权专区", description: hasUrgentPrivileges ? `${urgentPrivilegeRewards.length} 个快截止` : `有 ${privilegedCount} 个特权`, badge: hasUrgentPrivileges ? "提醒" : "特权", variant: "time", span: "double", path: "/child/store?category=privilege" }
{ icon: "📘", title: "任务记录", description: `完成 ${completedTasksCount} 项任务`, path: "/child/task?filter=thisWeek" }
{ icon: "🪙", title: "积分钱包", description: "查看积分变化", path: "/child/wallet" }
{ icon: "🎁", title: "我的奖品", description: "查看已兑换礼物", badge: "礼物", path: "/child/gift" }
```

- [ ] **Step 3: Remove home star DOM generation**

In `app/child/page.tsx`, remove the `starsContainer` DOM manipulation from the `useEffect` that currently calls `fetchTasks()` and `fetchRewardSummary()`. Keep the fetch calls:

```tsx
useEffect(() => {
  fetchTasks();
  fetchRewardSummary();
}, [fetchRewardSummary, fetchTasks]);
```

- [ ] **Step 4: Import child UI helpers and icons**

Update imports in `app/child/page.tsx`:

```tsx
import { CheckCircle2, Clock3, Gift, ListChecks, Sparkles, WalletCards } from "lucide-react";
import { ChildEmptyState, ChildPanel, ChildPageTitle, ChildStatCard, ChildStatusPill } from "@/components/child/ChildUI";
```

Keep `ArrowRight` if it remains used by privilege call-to-action content.

- [ ] **Step 5: Replace the old dark home content area**

Keep all existing state, memoized values, handlers, task detail modal, and submit modal logic. Replace the content before the first `Modal` with this sunny structure:

```tsx
<div className="child-page-grid">
  <ChildPanel className="overflow-hidden bg-[linear-gradient(135deg,rgba(255,255,255,0.92)_0%,rgba(224,242,254,0.82)_52%,rgba(220,252,231,0.78)_100%)]">
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] lg:items-center">
      <div>
        <ChildPageTitle icon="🌤️" title="今天的学习岛" description="完成一点点，也是在变厉害。" />
        <div className="mt-5 grid grid-cols-3 gap-3">
          <ChildStatCard label="总任务" value={totalTasks} hint="今天看到的任务" tone="sky" onClick={() => router.push(buildTaskListUrl("all"))} />
          <ChildStatCard label="已完成" value={completedTaskCount} hint={`${completionRate}% 完成`} tone="emerald" onClick={() => router.push(buildTaskListUrl("approved"))} />
          <ChildStatCard label="待完成" value={pendingVisibleCount} hint="继续加油" tone="amber" onClick={() => router.push(buildTaskListUrl("pending"))} />
        </div>
      </div>
      <div className="rounded-[30px] bg-white/80 p-5 text-center shadow-sm ring-1 ring-white">
        <div className="text-sm font-black text-[var(--child-text-muted)]">当前积分</div>
        <div className="mt-2 text-5xl font-black text-sky-700">🪙 {displayPoints.toLocaleString()}</div>
        <div className="mt-3 rounded-full bg-sky-50 px-4 py-2 text-sm font-black text-sky-700 ring-1 ring-sky-100">完成任务就能兑换奖励</div>
      </div>
    </div>
  </ChildPanel>

  <div className="child-page-grid child-two-column">
    <ChildPanel>
      <div className="mb-4 flex items-center justify-between gap-3">
        <ChildPageTitle icon={<ListChecks size={22} />} title="今天要做" description="点开任务，完成后提交给家长。" />
        <button type="button" onClick={() => router.push("/child/task")} className="rounded-full bg-white/80 px-4 py-2 text-sm font-black text-sky-700 ring-1 ring-sky-100">全部任务</button>
      </div>
      <div className="space-y-3">
        {visibleTasks.length > 0 ? (
          visibleTasks.map((task) => (
            <button key={task._id} type="button" onClick={() => openTaskDetail(task)} className="child-card flex w-full items-center gap-4 text-left">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] bg-sky-50 text-3xl ring-1 ring-sky-100">{task.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-black text-[var(--child-text)]">{task.name}</span>
                <span className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--child-text-muted)]">
                  <ChildStatusPill tone={task.status === "approved" ? "emerald" : task.status === "submitted" ? "amber" : task.status === "rejected" ? "rose" : "sky"}>
                    {task.status === "approved" ? "已完成" : task.status === "submitted" ? "审核中" : task.status === "rejected" ? "需修改" : "进行中"}
                  </ChildStatusPill>
                  <span>+{task.points} 分</span>
                </span>
              </span>
              <span className="rounded-full bg-sky-500 px-4 py-2 text-sm font-black text-white">查看</span>
            </button>
          ))
        ) : (
          <ChildEmptyState title="今天很轻松" hint="现在没有待做任务，可以去看看奖励。" icon="🎉" />
        )}
      </div>
    </ChildPanel>

    <ChildPanel>
      <ChildPageTitle icon={<Gift size={22} />} title="奖励提醒" description="看看有没有想兑换的奖励。" />
      <div className="mt-4 rounded-[26px] bg-white/75 p-4 ring-1 ring-white">
        <div className="text-sm font-black text-[var(--child-text)]">{privilegeRewards.length > 0 ? "特权奖励开放中" : "奖励商店等你来逛"}</div>
        <p className="mt-1 text-sm font-semibold text-[var(--child-text-muted)]">
          {urgentPrivilegeRewards.length > 0 ? `${urgentPrivilegeRewards.length} 个特权快截止了。` : privilegeRewards.length > 0 ? `现在有 ${privilegeRewards.length} 个特权奖励。` : "完成任务获得积分后，就能兑换喜欢的奖励。"}
        </p>
        <button type="button" onClick={() => handleNavigate("/child/store")} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-teal-500 px-4 py-2 text-sm font-black text-white">
          去奖励商店
          <ArrowRight size={16} />
        </button>
      </div>
      <div className="mt-4">
        <FeatureGrid completedTasksCount={completedTaskCount} privilegedCount={privilegeRewards.length} urgentPrivilegeRewards={urgentPrivilegeRewards} onNavigate={handleNavigate} />
      </div>
    </ChildPanel>
  </div>
</div>
```

- [ ] **Step 6: Fix task click behavior for pending/rejected cards**

If the home task card should preserve the old "pending/rejected opens submit modal" behavior, use this click handler instead of `openTaskDetail(task)`:

```tsx
onClick={() => {
  if (task.status === "pending" || task.status === "rejected") {
    openSubmitModal(task);
  } else {
    openTaskDetail(task);
  }
}}
```

- [ ] **Step 7: Run build**

Run: `npm run build`

Expected: Build passes. Fix unused imports and JSX type errors in `FeatureGrid.tsx` and `app/child/page.tsx`.

- [ ] **Step 8: Commit home redesign**

Run:

```bash
git add app/child/components/FeatureGrid.tsx app/child/page.tsx
git commit -m "feat: 重做孩子端首页学习岛概览"
```

Expected: Commit includes home and feature-grid changes only.

## Task 6: Redesign Task Workbench

**Files:**
- Modify: `app/child/task/page.tsx`

- [ ] **Step 1: Add child UI imports**

Add:

```tsx
import { ChildEmptyState, ChildPanel, ChildPageTitle, ChildStatusPill } from "@/components/child/ChildUI";
```

- [ ] **Step 2: Replace the page wrapper and filter panel classes**

Replace the outer page wrapper:

```tsx
<div className="child-page-grid">
```

Replace the search/filter container with:

```tsx
<ChildPanel className="child-filter-panel">
  <ChildPageTitle icon={<Filter size={22} />} title="任务工作台" description="筛选任务，找到今天要完成的事情。" />
  <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(220px,1.2fr)_180px_180px] xl:grid-cols-[minmax(240px,1.4fr)_180px_180px_minmax(280px,1fr)]">
    <Input labelPosition="left" allowClear isSearch value={searchName} onChange={(e) => setSearchName(e.target.value)} placeholder="搜索任务名称..." />
    <div className="flex items-center gap-2 rounded-[18px] border border-slate-200/80 bg-white/95 px-3 py-2.5 shadow-sm">
      <Filter size={16} className="shrink-0 text-slate-400" />
      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full bg-transparent text-sm text-slate-700 focus:outline-none">
        {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </div>
    <div className="flex items-center gap-2 rounded-[18px] border border-slate-200/80 bg-white/95 px-3 py-2.5 shadow-sm">
      <span className="shrink-0 text-sm font-bold text-slate-400">类型</span>
      <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full bg-transparent text-sm text-slate-700 focus:outline-none">
        {TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </div>
    <div className="flex items-center gap-2 rounded-[18px] border border-slate-200/80 bg-white/95 px-3 py-2.5 shadow-sm xl:col-span-1">
      <Calendar size={16} className="shrink-0 text-slate-400" />
      <div className="grid flex-1 grid-cols-2 gap-2">
        <DatePicker selected={startDate} onChange={(date) => setStartDate(date)} placeholderText="开始日期" className="border-0 bg-white/80" />
        <DatePicker selected={endDate} onChange={(date) => setEndDate(date)} placeholderText="结束日期" className="border-0 bg-white/80" />
      </div>
    </div>
  </div>
  <div className="mt-4 flex gap-2">
    <Button onClick={handleSearch} className="min-w-[120px] rounded-full">搜索</Button>
    <Button onClick={handleReset} variant="secondary" className="rounded-full">重置</Button>
  </div>
</ChildPanel>
```

- [ ] **Step 3: Update `getStatusInfo` to include child tones**

Extend each returned status object with `tone`:

```tsx
tone: "sky" as const
```

Use this mapping:

```tsx
in_progress -> "teal"
approved -> "emerald"
submitted -> "amber"
pending -> "slate"
rejected -> "rose"
default -> "slate"
```

- [ ] **Step 4: Restyle task cards**

Change each task card to start with:

```tsx
className={`child-card group cursor-pointer transition hover:-translate-y-0.5 md:p-5 ${statusInfo.card}`}
```

Replace status label markup with:

```tsx
<ChildStatusPill tone={statusInfo.tone}>{statusInfo.label}</ChildStatusPill>
```

- [ ] **Step 5: Replace empty/loading section**

Use:

```tsx
{loading ? (
  <div className="flex items-center justify-center py-12">
    <div className="h-9 w-9 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
  </div>
) : tasks.length === 0 ? (
  <ChildEmptyState title="没有找到任务" hint="换个筛选条件，或者晚一点再看看。" icon="📭" />
) : null}
```

After this loading/empty block, keep the current `tasks.map((task, index) => ...)` branch from the page and apply the task-card/status changes from Step 4 to that branch.

- [ ] **Step 6: Restyle detail and submit modals only through classes**

Keep modal data and handlers unchanged. Use white sunny panels in content blocks:

```tsx
className="rounded-[1.5rem] border border-[var(--child-border)] bg-white/90 p-5 shadow-sm"
```

Use primary modal footer buttons with minimum touch height:

```tsx
className="w-full min-h-12 rounded-2xl bg-gradient-to-r from-sky-500 to-teal-500 py-3 text-lg font-black text-white shadow-lg"
```

- [ ] **Step 7: Run build**

Run: `npm run build`

Expected: Build passes. Fix any `tone` type mismatch by adding `as const` to the status objects.

- [ ] **Step 8: Commit task page**

Run:

```bash
git add app/child/task/page.tsx
git commit -m "feat: 重做孩子端任务工作台"
```

Expected: Commit includes only `app/child/task/page.tsx`.

## Task 7: Redesign Reward Shop

**Files:**
- Modify: `app/child/store/page.tsx`

- [ ] **Step 1: Add child UI imports**

Add:

```tsx
import { ChildEmptyState, ChildPanel, ChildPageTitle } from "@/components/child/ChildUI";
```

Remove `EmptyState` from the `@/components/store/RewardUI` import, but keep `RewardCard` and `SectionTitle` if still used.

- [ ] **Step 2: Replace store wrapper**

Use:

```tsx
<div className="child-page-grid">
```

- [ ] **Step 3: Replace search/filter section with a child panel**

Use:

```tsx
<ChildPanel className="child-filter-panel">
  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
    <ChildPageTitle icon={<Gift size={22} />} title="奖励商店" description={`你现在有 ${displayedPoints} 积分，可以看看喜欢的奖励。`} />
    <div className="rounded-[24px] bg-yellow-50 px-5 py-3 text-lg font-black text-yellow-800 ring-1 ring-yellow-100">🪙 {displayedPoints}</div>
  </div>
  <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(260px,1fr)_auto]">
    <div className="relative min-w-0">
      <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
      <input type="text" placeholder="搜索奖励名字..." value={rewardSearchQuery} onChange={(e) => setRewardSearchQuery(e.target.value)} className="w-full rounded-[18px] border border-slate-200/80 bg-white/95 px-11 py-3 text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-sky-300 focus:ring-4 focus:ring-sky-100" />
    </div>
    <div className="flex flex-wrap items-center gap-2">
      {["all", "sold-out", "in-stock"].map((key) => (
        <button key={key} type="button" onClick={() => setActiveCategory(key as typeof activeCategory)} className={`rounded-full px-4 py-2 text-sm font-black transition ${activeCategory === key ? "bg-sky-500 text-white shadow-sm" : "bg-white/85 text-slate-600 ring-1 ring-slate-200/70"}`}>
          {key === "all" ? "全部" : key === "sold-out" ? "已售罄" : "有库存"}
        </button>
      ))}
    </div>
  </div>
  <div className="mt-4 flex flex-wrap items-center gap-2">
    {[
      { key: "points-asc", label: "积分从低到高" },
      { key: "points-desc", label: "积分从高到低" },
      { key: "stock-desc", label: "库存最多" },
    ].map((item) => (
      <button key={item.key} type="button" onClick={() => setSortKey(item.key as typeof sortKey)} className={`rounded-full px-4 py-2 text-sm font-black transition ${sortKey === item.key ? "bg-teal-50 text-teal-700 ring-1 ring-teal-100" : "bg-white/85 text-slate-600 ring-1 ring-slate-200/70"}`}>{item.label}</button>
    ))}
    <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200/70">共 {filteredRewards.length} 件奖励</span>
  </div>
</ChildPanel>
```

- [ ] **Step 4: Update reward grid**

Use:

```tsx
<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
```

Keep `RewardCard` props and redemption logic unchanged.

- [ ] **Step 5: Replace empty state**

Use:

```tsx
<ChildEmptyState title="没有找到奖励" hint="换个分类、关键词或者排序试试。" icon="🎁" />
```

- [ ] **Step 6: Restyle order history section**

Wrap history in:

```tsx
<ChildPanel>
  <div className="flex items-center justify-between gap-3">
    <SectionTitle icon={<History size={16} className="text-violet-500" />} title="我的兑换记录" description="最近 5 条记录，方便查看爸妈是否已经处理。" titleClassName="text-[var(--child-text)] text-lg font-extrabold" descriptionClassName="text-[var(--child-text-muted)]" />
    <Button variant="secondary" size="sm" onClick={() => void fetchOrders()} loading={ordersLoading}>刷新记录</Button>
  </div>
  <div className="mt-4 space-y-3">{orders.length > 0 ? orders.map((order) => <div key={order._id} className="child-card">{order.rewardName}</div>) : <ChildEmptyState title="还没有兑换记录" hint="兑换奖励后会显示在这里。" icon="🎁" />}</div>
</ChildPanel>
```

Use the existing order record inner markup in place of the one-line `{order.rewardName}` body, while keeping `fetchOrders` and status labels unchanged.

- [ ] **Step 7: Run build**

Run: `npm run build`

Expected: Build passes. If `EmptyState` import is unused, remove it.

- [ ] **Step 8: Commit store page**

Run:

```bash
git add app/child/store/page.tsx
git commit -m "feat: 重做孩子端奖励商店"
```

Expected: Commit includes only `app/child/store/page.tsx`.

## Task 8: Redesign Gifts Page

**Files:**
- Modify: `app/child/gift/page.tsx`

- [ ] **Step 1: Add child UI imports**

Add:

```tsx
import { ChildEmptyState, ChildPanel, ChildPageTitle, ChildStatusPill } from "@/components/child/ChildUI";
```

- [ ] **Step 2: Sort pending orders first**

After `filteredOrders` is computed, add:

```tsx
const displayedOrders = useMemo(() => {
  return [...filteredOrders].sort((a, b) => {
    const rank = { pending: 0, verified: 1, cancelled: 2 };
    return rank[a.status] - rank[b.status];
  });
}, [filteredOrders]);
```

Use `displayedOrders` in the render list.

- [ ] **Step 3: Replace title and filter panels**

Use:

```tsx
<div className="child-page-grid">
  <ChildPanel>
    <ChildPageTitle
      icon="🎁"
      title="我的奖品"
      description="待核销的奖品会排在最前面。"
      action={<Button onClick={() => navigateTo("wallet")} variant="secondary" size="sm" className="rounded-full border-none bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 hover:bg-emerald-100"><Wallet size={16} className="mr-1" />钱包</Button>}
    />
  </ChildPanel>
  <ChildPanel className="child-filter-panel">
    <div className="grid gap-2 lg:grid-cols-[minmax(0,1.6fr)_220px]">
      <div className="relative min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input type="text" placeholder="搜索奖品..." value={giftSearchQuery} onChange={(e) => setGiftSearchQuery(e.target.value)} className="h-11 w-full rounded-[18px] border border-slate-200/80 bg-white/95 py-0 pl-10 pr-4 text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-sky-300 focus:ring-4 focus:ring-sky-100" />
      </div>
      <DatePicker selected={giftDate} onChange={(date: Date | null) => setGiftDate(date)} placeholderText="兑换日期" wrapperClassName="w-full" className="h-11 rounded-[18px] border-slate-200/80 text-slate-700" popperPlacement="top-end" portalId="datepicker-portal" />
    </div>
    <div className="mt-3 flex overflow-x-auto rounded-[18px] border border-slate-200/70 bg-white/80 p-1 backdrop-blur">
      {(["all", "pending", "verified", "cancelled"] as const).map((status) => (
        <Button key={status} onClick={() => setGiftStatusFilter(status)} variant="secondary" className={`flex-1 whitespace-nowrap rounded-[1rem] border-none py-2 text-xs font-bold transition md:text-sm ${giftStatusFilter === status ? "bg-sky-500 text-white shadow-sm" : "bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}>
          {status === "all" ? "全部" : status === "pending" ? "未核销" : status === "verified" ? "已核销" : "已取消"}
        </Button>
      ))}
    </div>
  </ChildPanel>
  <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">{displayedOrders.map((order) => <div key={order._id} className="child-card">{order.rewardName}</div>)}</div>
</div>
```

Use the existing gift card inner markup in place of the one-line `{order.rewardName}` body.

- [ ] **Step 4: Restyle gift grid cards**

Use:

```tsx
className={`child-card group relative flex min-h-[150px] cursor-pointer flex-col items-center justify-between gap-3 text-center transition active:scale-[0.98] ${
  order.status === "pending" ? "ring-2 ring-amber-200" : ""
}`}
```

Use `ChildStatusPill`:

```tsx
<ChildStatusPill tone={order.status === "verified" ? "emerald" : order.status === "cancelled" ? "slate" : "amber"}>
  {order.status === "verified" ? "已核销" : order.status === "cancelled" ? "已取消" : "待核销"}
</ChildStatusPill>
```

- [ ] **Step 5: Replace empty state**

Use:

```tsx
<ChildEmptyState
  title="还没有奖品"
  hint="去奖励商店看看，兑换后就会出现在这里。"
  icon="🎁"
  action={<Button onClick={() => navigateTo("store")} variant="secondary">去商店看看</Button>}
/>
```

- [ ] **Step 6: Restyle order detail modal**

Keep modal logic unchanged. For pending verification code, use:

```tsx
<div className="rounded-[1.5rem] border border-amber-100 bg-amber-50/90 p-5 text-center">
  <p className="mb-2 text-sm font-black text-amber-800">请向家长出示核销码</p>
  <p className="font-mono text-4xl font-black tracking-[0.28em] text-amber-900">{showOrderDetail.verificationCode}</p>
</div>
```

- [ ] **Step 7: Run build**

Run: `npm run build`

Expected: Build passes.

- [ ] **Step 8: Commit gift page**

Run:

```bash
git add app/child/gift/page.tsx
git commit -m "feat: 重做孩子端奖品页面"
```

Expected: Commit includes only `app/child/gift/page.tsx`.

## Task 9: Redesign Wallet Page

**Files:**
- Modify: `app/child/wallet/page.tsx`

- [ ] **Step 1: Add child UI imports**

Add:

```tsx
import { ChildEmptyState, ChildPanel, ChildPageTitle, ChildStatCard, ChildStatusPill } from "@/components/child/ChildUI";
```

- [ ] **Step 2: Replace wallet hero**

Use:

```tsx
<ChildPanel className="overflow-hidden bg-[linear-gradient(135deg,rgba(255,255,255,0.94)_0%,rgba(224,242,254,0.86)_52%,rgba(220,252,231,0.82)_100%)]">
  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.75fr)] lg:items-center">
    <ChildPageTitle icon={<Wallet size={24} />} title="积分钱包" description="看看积分从哪里来，又花到哪里去。" />
    <div className="rounded-[30px] bg-white/82 p-5 text-center shadow-sm ring-1 ring-white">
      <div className="text-sm font-black text-[var(--child-text-muted)]">当前可用积分</div>
      <div className="mt-2 text-5xl font-black text-sky-700">🪙 {currentUser?.availablePoints || 0}</div>
    </div>
  </div>
  <div className="mt-5 grid grid-cols-3 gap-3">
    <ChildStatCard label="收入" value={`+${summary.income}`} hint="最近记录" tone="emerald" />
    <ChildStatCard label="支出" value={`-${summary.expense}`} hint="兑换和扣除" tone="rose" />
    <ChildStatCard label="记录" value={ledgerTotal} hint="账本条数" tone="sky" />
  </div>
</ChildPanel>
```

- [ ] **Step 3: Restyle filters**

Wrap date and search controls in:

```tsx
<ChildPanel className="child-filter-panel">
  <ChildPageTitle icon={<CalendarDays size={22} />} title="筛选记录" description={`当前页 ${ledgerData.length} 条记录`} />
  <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
    {quickRanges.map((item) => <button key={item.label} onClick={item.onClick} className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700">{item.label}</button>)}
  </div>
  <div className="mt-3 grid gap-2 sm:grid-cols-2">
    <DatePicker selected={ledgerStartDate} onChange={(date: Date | null) => setLedgerStartDate(date)} placeholderText="开始日期" className="border-slate-200 bg-slate-50 text-gray-800" />
    <DatePicker selected={ledgerEndDate} onChange={(date: Date | null) => setLedgerEndDate(date)} placeholderText="结束日期" className="border-slate-200 bg-slate-50 text-gray-800" />
  </div>
  <div className="relative mt-3">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
    <input type="text" placeholder="搜索记录..." value={ledgerKeyword} onChange={(e) => handleKeywordSearch(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-9 py-3 text-sm text-gray-800 shadow-sm outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100" />
  </div>
</ChildPanel>
```

- [ ] **Step 4: Restyle ledger list**

Use:

```tsx
<ChildPanel>
  <div className="mb-4 flex items-center justify-between gap-3">
    <ChildPageTitle title={ledgerLoading ? "正在更新结果" : "结果列表"} description={`共 ${ledgerTotal} 条记录`} />
  </div>
  <div className={`space-y-3 transition-opacity duration-150 ${ledgerLoading ? "opacity-90" : "opacity-100"}`}>
    {hasLedgerData ? ledgerData.map((item) => <div key={item._id} className="child-card">{item.name}</div>) : <ChildEmptyState title="暂无记录" hint="换个筛选条件，或者完成任务后再回来看看。" icon="🪙" />}
  </div>
</ChildPanel>
```

Use the current ledger card inner markup in place of the one-line `{item.name}` body and keep the current pagination controls under the list.

Change each ledger card class to:

```tsx
className={`child-card group flex cursor-pointer items-center gap-4 transition hover:-translate-y-0.5 ${ledgerLoading ? "opacity-90" : ""}`}
```

Use `ChildStatusPill` for the income/expense badge.

- [ ] **Step 5: Replace wallet empty state**

Use:

```tsx
<ChildEmptyState title="暂无记录" hint="换个筛选条件，或者完成任务后再回来看看。" icon="🪙" />
```

- [ ] **Step 6: Restyle overlay panels**

For `selectedLedgerItem` and `showTaskDetailModal` overlays, keep data logic unchanged and use:

```tsx
className="flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col overflow-hidden rounded-t-[2rem] bg-white text-slate-800 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-[2rem]"
```

Ensure inner scroll containers keep `hide-scrollbar`.

- [ ] **Step 7: Run build**

Run: `npm run build`

Expected: Build passes.

- [ ] **Step 8: Commit wallet page**

Run:

```bash
git add app/child/wallet/page.tsx
git commit -m "feat: 重做孩子端积分钱包"
```

Expected: Commit includes only `app/child/wallet/page.tsx`.

## Task 10: Cross-Page Theme, Responsive, And Regression Pass

**Files:**
- Modify only files already touched by Tasks 2-9 if verification reveals issues.

- [ ] **Step 1: Run full build**

Run: `npm run build`

Expected: Build passes.

- [ ] **Step 2: Run lint if available**

Run: `npm run lint`

Expected: Lint completes. If it reports pre-existing unrelated errors, capture them and do not fix unrelated files.

- [ ] **Step 3: Manual route check**

Start the app if needed:

```bash
npm run dev
```

Open and inspect:

```text
/child
/child/task
/child/store
/child/gift
/child/wallet
```

Expected:

```text
Left navigation rail is visible on landscape tablet width.
Main content scrolls inside the content stage.
Top status bar shows avatar, username, points, theme toggle, and logout.
Primary touch targets are at least 44px tall.
No page still shows the old deep-space starfield as its main background.
```

- [ ] **Step 4: Theme toggle check**

Use the child settings/theme control to switch light and dark.

Expected:

```text
Light theme: sunny sky/island background, readable slate text, visible card boundaries.
Dark theme: no white text on white panels, no slate text on dark panels, nav active state remains readable.
```

- [ ] **Step 5: Modal flow check**

Verify:

```text
Task detail modal opens and closes.
Submit task modal opens, photo upload preview still works, and required photo disabled state remains.
Store redeem confirmation opens and closes.
Gift detail modal shows pending verification code.
Wallet ledger detail opens and task detail drill-down still opens.
Settings modal still scrolls on small viewport heights.
```

- [ ] **Step 6: Commit verification fixes**

If any verification fixes were required, run:

```bash
git add app/globals.css components/child/ChildUI.tsx app/child/layout.tsx app/child/components/FeatureGrid.tsx app/child/page.tsx app/child/task/page.tsx app/child/store/page.tsx app/child/gift/page.tsx app/child/wallet/page.tsx
git commit -m "fix: 完善孩子端平板重设计细节"
```

Expected: Commit contains only fixes discovered during verification.

## Self-Review Checklist

- Spec coverage: This plan covers the sunny visual direction, deep redesign scope, 7-10 age range, landscape tablet layout, left navigation rail, all child pages, shared components, light/dark theme, touch targets, reduced motion, and verification.
- Ambiguity scan: No plan step uses open-ended filler instructions.
- Type consistency: `ChildTone` values in `ChildUI.tsx` match task status tone usage in the task, gift, and wallet pages.
- Scope guard: Parent pages are not modified. Shared `components/store/RewardUI.tsx` is intentionally not changed because it is used by parent rewards/orders pages.
- Dirty worktree guard: Existing changes in `app/child/layout.tsx` and `app/child/page.tsx` must be integrated rather than reverted.
