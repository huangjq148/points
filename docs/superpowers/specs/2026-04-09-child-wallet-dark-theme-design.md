# Child Wallet Dark Theme Design

## Background

The child shell already supports light and dark themes through `app/child/layout.tsx` and the shared child-theme tokens in `app/globals.css`.

The wallet page at `app/child/wallet/page.tsx` still contains several wallet-specific light-theme surfaces. In dark mode, the shell, sidebar, and outer panels switch correctly, but the wallet summary card, filter quick actions, pagination chip, detail modals, and the date picker popup still render as bright light blocks.

## Confirmed Direction

- Scope: child wallet page dark-theme adaptation only.
- Target page: `app/child/wallet/page.tsx`.
- Supporting styles: `app/globals.css`.
- Verification strategy: add a wallet dark-theme regression test before implementation, then update the page and global date picker styling to satisfy it.

## Goals

- Make the child wallet page visually coherent in dark mode.
- Keep the current wallet page layout and interaction model unchanged.
- Reuse existing child-theme and shared UI theme tokens instead of introducing a new theme system.
- Ensure the date picker popup respects dark theme when opened from the wallet filters.

## Non-Goals

- Do not redesign the child wallet information architecture.
- Do not change ledger fetching, pagination, filtering, or modal behavior.
- Do not expand the task into a full child-app visual refactor.
- Do not restyle unrelated child pages beyond any shared date picker fix needed for dark theme.

## Root Cause

The wallet page mixes shared themed building blocks with page-local hard-coded light utility classes:

- the points summary card uses `bg-white/82` and `ring-white`
- the quick range buttons use light borders and white backgrounds
- the loading and pagination chips rely on light backgrounds
- both wallet detail modals use white and slate light surfaces directly

In addition, `app/globals.css` still contains an older `react-datepicker` block with `!important` light backgrounds. That older block overrides the later token-based date picker styles, so the popup remains light even when the child app is in dark mode.

## Design Principles

### Shared Tokens First

Wallet-specific surfaces should use the existing child and UI theme variables wherever possible:

- `--child-surface-strong`
- `--child-surface-muted`
- `--child-border`
- `--child-text`
- `--child-text-muted`
- `--ui-panel-bg`
- `--ui-surface-*`

### Minimal JSX Changes

The page already composes `ChildPanel`, `ChildPageTitle`, `ChildStatCard`, and `ChildStatusPill`. The fix should preserve those patterns and only replace page-local bright surfaces or add a wallet page scope class where targeted overrides help.

### Localized Overrides

Dark-theme behavior should be bounded to the child app and wallet page, avoiding broad selectors that could unintentionally restyle other areas.

## Proposed Architecture

### Wallet Page Scope

Add a page-level class such as `child-wallet-page` so wallet-specific styling can be targeted cleanly from `app/globals.css` when needed.

### Page Surface Normalization

Update wallet-specific JSX surfaces to use shared tokens or wallet-specific classes for:

- points summary chip
- quick filter buttons
- loading and pagination badges
- ledger rows that still rely on bright inner icon chips
- wallet detail modal panels and nested content blocks

### Date Picker Theme Repair

Replace the older hard-coded `react-datepicker` light styling with token-driven values so the popup can inherit the correct palette in both light and dark themes.

## Page Areas To Update

### Header Summary

The available-points summary should stay prominent, but in dark mode it needs a dark surface with a sky accent rather than a bright white card.

### Filter Panel

Quick range buttons, search input framing, and date fields should visually match the child dark control system already used on other child pages.

### Result List

Ledger rows should remain readable and keep income or expense meaning clear through tinted accents, not bright white inner blocks.

### Modal Surfaces

Both the wallet detail modal and the task-detail modal should use dark-compatible containers, nested support surfaces, and close buttons in dark mode.

### Date Picker Popup

The popup calendar should use the shared token palette for panel, header, hover, and selected states so it no longer appears light inside dark theme.

## Files And Responsibilities

- `app/child/wallet/page.tsx`
  - Replace wallet-specific light surfaces with themed token-based surfaces.
  - Add any wallet page scope classes needed for bounded styling and testing.
- `app/globals.css`
  - Add wallet-page-specific dark-theme overrides only where JSX tokenization is not enough.
  - Convert the legacy `react-datepicker` styling block to token-driven values compatible with both themes.
- `__tests__/child-wallet-dark-theme.test.mjs`
  - Cover the wallet page surfaces that previously stayed bright in dark mode.

## Testing And Verification

Implementation should be verified with:

- a new wallet dark-theme regression test that checks the wallet page in dark mode
- visual checks for:
  - points summary surface
  - filter panel controls
  - date picker popup
  - wallet detail modal surfaces
- regression confirmation that child light theme styling still renders normally through the shared token system

## Risks

- Overly broad date picker overrides could unintentionally affect non-child pages.
- Keeping too many raw light utility classes in the wallet JSX would make future regressions likely.
- Modal inner surfaces may still look bright if nested blocks are missed.

## Recommended Next Step

Write the implementation plan, then execute it with TDD:

- add the failing wallet dark-theme test
- implement the minimal wallet and date picker styling changes
- rerun the targeted regression tests
