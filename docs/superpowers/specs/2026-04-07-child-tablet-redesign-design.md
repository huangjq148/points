# Child Tablet Redesign Design

## Background

The child-facing pages currently mix several visual languages: a dark "space adventure" home page, lighter glass cards on task/store/gift pages, and wallet panels closer to an admin dashboard. The target user is a 7-10 year old child using a tablet primarily in landscape orientation.

This redesign should make the child experience feel like one coherent tablet app, while preserving the current task submission, reward redemption, gift verification, and wallet history business flows.

## Confirmed Direction

- Visual direction: "Sunny Learning Island" with bright, calm, low-stimulation colors.
- Scope: deep redesign of the child shell and all child pages.
- Primary device: landscape tablet.
- Target age: 7-10 years old.
- Navigation model: left-side learning-island navigation.
- Recommended implementation approach: learning-island shell plus page-level information reorganization.

## Goals

- Create a unified child-page style across home, task, store, gift, and wallet.
- Optimize layout density and touch targets for landscape tablet use.
- Keep text short, direct, and readable for 7-10 year old children.
- Reuse existing business logic and API calls wherever possible.
- Centralize reusable child visual patterns instead of duplicating long Tailwind class lists in each page.
- Keep light theme excellent and dark theme usable.

## Non-Goals

- Do not change core task, reward, order, ledger, authentication, or upload data models.
- Do not introduce network font loading.
- Do not turn the task workflow into a new game mechanic that changes statuses or approval rules.
- Do not rewrite parent pages.
- Do not remove existing settings such as theme switching, reduced motion, account switching, or logout.

## Global Architecture

### Child Shell

The child layout should become a landscape-tablet shell:

- Left side: fixed navigation rail for Home, Tasks, Store, Gifts, and Wallet.
- Top of right side: compact child status bar with avatar, username, current points, settings, logout, and account switching entry points.
- Main content: scrollable child content stage with a calm sky/island gradient background and consistent page panels.

The shell should leave more vertical space for content than the current large top header plus bottom navigation. On narrower screens, it may fall back to a bottom dock or stacked layout, but the primary optimized layout is landscape tablet.

### Main Content Scrolling

The page should avoid whole-screen layout jumps. The navigation rail and top status bar remain visually stable, while each child page controls its own main content scrolling.

### Existing Flow Preservation

The redesign should keep these flows intact:

- Home links into task filters and store.
- Task detail, task start, submit for review, recall submitted task.
- Reward redemption and confirmation.
- Gift detail and pending verification code.
- Wallet ledger filters and ledger detail.

## Page Design

### Home: Learning Island Overview

The home page becomes a dashboard for the day:

- A hero "today's growth" card showing completion rate, pending visible tasks, completed tasks, and available points.
- A primary "today's tasks" section with large child-friendly task cards and one main action per task.
- A secondary "rewards to explore" section showing redeemable rewards or soon-expiring privilege rewards.
- A small feature entry area for store, gifts, and wallet, but it should not duplicate the global navigation.

Home should feel encouraging and calm rather than dark or visually intense.

### Task: Task Workbench

The task page becomes a workbench:

- Filter panel at the top of the content area, laid out horizontally where tablet width allows.
- Larger task cards that show icon, name, short description, points, status, start/deadline, and one primary action.
- Status color language:
  - Pending: soft slate/blue.
  - In progress: sky/teal.
  - Submitted: amber.
  - Rejected: rose.
  - Approved: emerald.
- Detail and submit modals should share the same child modal language as other pages.

### Store: Reward Shop

The store page becomes a reward shop:

- Top summary panel showing available points, search, category filters, and sort controls.
- Reward grid with two or three columns on landscape tablet.
- Reward cards prioritize reward icon, name, points, stock, type, deadline for privilege rewards, and redeem action.
- Privilege warnings remain visible but should use softer tones than the current high-intensity purple/pink feature banner.

### Gifts: My Prizes

The gift page becomes a prize collection:

- Pending verification orders are visually prioritized.
- Search/date/status filters use the shared child filter panel style.
- Gift cards show reward icon, status, points spent, date, and a clear entry into detail.
- Detail modal should make the verification code highly readable for pending orders.

### Wallet: Points Ledger

The wallet page becomes a points ledger:

- Top wallet summary card uses the sunny visual language and shows available points, recent income, expense, and total records.
- Filters and quick ranges use shared child filter controls.
- Ledger list cards remain clickable and preserve task/order detail drill-down.
- Ledger detail and task detail overlays use the shared modal/panel language.

## Visual System

### Color

- Primary: sky blue and cyan/teal.
- Support: soft yellow, mint, and light indigo.
- Success: emerald.
- Warning/submitted/urgent: amber.
- Error/rejected: rose.
- Background: light sky/island gradients rather than the current deep space gradient.

All important text must maintain readable contrast in both light and dark modes.

### Surface And Cards

Use a unified card language:

- White or translucent white surfaces.
- 24-32px rounded corners for major panels and 16-24px for inner cards.
- Soft border and shadow, avoiding harsh glow or heavy dark shadows.
- Consistent spacing between cards, especially for touch use.

### Typography

- Use the existing system font stack.
- Avoid new web font loading.
- Use short headings and direct labels.
- Use bold weight for page titles, points, and primary actions.

### Touch And Interaction

- Primary touch targets should be at least 44px high and wide where practical.
- Adjacent touch targets should have at least 8px spacing.
- Important actions must not depend on hover.
- Hover may remain as enhancement for desktop/mouse use.

### Motion

- Remove or reduce large continuous decorative animation such as dense infinite stars.
- Keep subtle transitions for button press, card hover/tap, modal entry, and success feedback.
- Preserve the "reduced motion" preference and avoid introducing new constant motion that ignores it.

### Theme Handling

- Light theme is the primary experience.
- Dark theme must remain usable:
  - Navigation rail, top status bar, cards, filters, and modals must keep readable contrast.
  - Avoid white text on white surfaces or dark text on dark surfaces.
  - Use CSS variables or centralized classes where feasible.

## Component And Style Strategy

Prioritize reusable child patterns:

- Child shell classes or component sections for nav rail, status bar, and content stage.
- Shared child panel/card classes for filters, hero cards, task cards, reward cards, empty states, and modal panels.
- Continue using existing `Button`, `Modal`, `DatePicker`, `Input`, `Pagination`, `ThemeToggle`, `ConfirmModal`, and `RewardCard` where they fit.
- Add a small child-specific UI helper component only if existing components cause repeated class duplication or cannot express the needed layout cleanly.

## Data Flow

No major data-flow changes are required.

- Home continues fetching tasks and reward summary.
- Task page continues fetching and mutating tasks through existing task API calls.
- Store continues fetching rewards and orders, and redeems through existing order API calls.
- Gift page continues fetching orders and cancelling pending orders.
- Wallet continues fetching ledger data and using task detail data already returned by the ledger endpoint.

## Error Handling

Preserve existing toast and console error behavior initially. Where visible error states are already present, restyle them using the shared child status colors. Avoid introducing new silent failures.

## Testing And Verification

Implementation should be verified with:

- TypeScript/build check.
- Manual visual checks for the child routes:
  - `/child`
  - `/child/task`
  - `/child/store`
  - `/child/gift`
  - `/child/wallet`
- Light and dark theme checks for navigation, top status bar, cards, filters, buttons, and modals.
- Responsive checks around tablet landscape width, tablet portrait/narrow width fallback, and desktop width.
- Touch-target pass for navigation, primary card actions, filter controls, and modal actions.

## Risks

- The current worktree already contains edits in `app/child/layout.tsx` and `app/child/page.tsx`; implementation must preserve and intentionally integrate those changes rather than reverting them.
- A deep shell change can affect every child route, so the implementation should be staged carefully and verified page by page.
- `.superpowers/` visual-companion files are local brainstorming artifacts and should not be included in implementation commits.

