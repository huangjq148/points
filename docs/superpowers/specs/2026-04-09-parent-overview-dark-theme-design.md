# Parent Overview Dark Theme Design

## Background

The parent overview page already supports light and dark themes at the shell level, but the page content is not fully aligned with the dark-theme surface system.

The main issue is that several overview modules still rely on light-theme utility classes such as `bg-green-50`, `bg-red-50`, `bg-yellow-50`, `bg-blue-50`, `bg-orange-100`, and `bg-indigo-100`. When the parent shell switches to dark mode, those blocks remain visually bright and disconnected from the rest of the page.

This creates the exact mismatch visible in the reported screenshot: the navigation, header, and main cards are dark, while a subset of status panels and tags still look like light-theme badges.

## Confirmed Direction

- Scope: parent overview page dark-theme adaptation only.
- Target page: `app/parent/overview/page.tsx`.
- Theme strategy: keep light theme visually unchanged and make dark theme coherent.
- Recommended implementation approach: replace overview-specific hard-coded light status styles with overview semantic classes plus centralized dark-theme mappings.

## Goals

- Eliminate bright light-theme blocks from the parent overview page in dark mode.
- Keep status meaning clear in both themes without relying on pale backgrounds.
- Reuse the existing parent dark-theme token system instead of adding scattered one-off overrides.
- Keep the fix contained to the overview page and its related global styles.

## Non-Goals

- Do not redesign the parent dashboard shell, sidebar, or header.
- Do not expand this task into a full parent-app theme refactor.
- Do not change overview data flow, routing behavior, or business logic.
- Do not materially restyle unrelated parent pages such as tasks, orders, rewards, audit, or users.

## Root Cause

The current parent dark theme is driven mainly by `.parent-theme-dark` overrides in `app/globals.css`. That mechanism works well for shared container surfaces such as the sidebar, top header, `card`, and `card-parent`.

However, the overview page also contains several inner blocks that bypass those shared surfaces and directly encode light-theme utility colors in JSX:

- `关键结果看板` status cards use light semantic backgrounds.
- `孩子表现面板` status labels use light semantic pill backgrounds.
- `行动建议`, empty states, loading placeholders, distribution bars, and trend blocks still depend on light utility color combinations in a few places.

Because those blocks are not expressed through overview-specific semantic classes, the current dark-theme overrides cannot consistently remap them without either missing cases or becoming too broad and risky.

## Design Principles

### Semantic First

Overview-specific status UI should be expressed with semantic class names rather than raw light-theme utility combinations. The goal is to make the page define meaning first and let the theme define appearance.

### Three Surface Levels

The overview page should use only three perceived brightness levels in dark mode:

- Page background
- Main cards
- Inner status or support blocks

This avoids the current visual jump where some inner blocks suddenly look like light-theme cards.

### Status Color As Accent, Not Canvas

Dark mode should keep semantic color identity through icons, numbers, borders, and subtle tinted backgrounds. Large pale backgrounds should not be used for status emphasis in dark mode.

## Proposed Architecture

### Overview Semantic Classes

Introduce a small overview-specific style vocabulary used only by the overview page:

- Overview suggestion item class
- Overview status card class
- Overview child status tag class
- Overview support surface class for inner bars or neutral blocks

These classes should be applied from `app/parent/overview/page.tsx` and styled in `app/globals.css`.

### Theme Mapping Strategy

In light theme:

- Preserve the current visual intent and approximate appearance.
- Use semantic classes to map back to existing light surfaces and accent colors.

In dark theme:

- Map overview semantic classes to darker surfaces.
- Keep semantic differentiation through text color, icon color, subtle border tint, and restrained background tint.
- Ensure text contrast remains readable across all overview modules.

### Bounded Styling

All new theme overrides should be scoped to `.overview-page` and `.parent-theme-dark` combinations where practical. This keeps the change local and avoids accidental regressions on other parent pages.

## Page Areas To Update

### Action Suggestions

Suggestion rows should use a shared inner-surface treatment instead of `bg-white/90` and generic light hover behavior. In dark mode they should look like embedded cards rather than bright floating strips.

### KPI And Supporting Metrics

Existing main cards can continue using the shared `card` treatment, but any nested neutral blocks should align with the overview semantic support surface language.

### Distribution Blocks

Task distribution and type distribution should keep their bar colors, but the neutral rail/background and adjacent text colors must match the dark surface system.

### Trend Chart

The trend area can keep the current blue bar emphasis, but the bar container and labels must not rely on overly bright light backgrounds in dark mode.

### Child Performance Panel

The child row container should remain a dark-compatible embedded panel in dark mode. Its three status pills should switch to semantic status tag classes so each state remains identifiable without pale light-theme fills.

### Key Result Board

The four result cards should switch from hard-coded light status backgrounds to semantic status card classes. In dark mode each card should use:

- dark tinted background
- soft semantic border
- bright semantic icon/text accent

This is the highest-priority visual fix because it is the most obvious mismatch in the screenshot.

### Empty, Error, And Loading States

Overview empty, error, and loading placeholders should inherit the same overview surface rules so they do not become isolated bright blocks in dark mode.

## Visual Rules

### Dark Theme

- Status cards use dark tinted surfaces with restrained glow or shadow.
- Status tags use low-elevation dark pills with semantic text and border color.
- Neutral support surfaces use `parent-theme-dark` tokens rather than raw slate utility assumptions.
- Headings remain high-contrast; helper text remains muted but readable.

### Light Theme

- Preserve the current airy dashboard feel.
- Keep existing status color recognition.
- Do not introduce a noticeably heavier or darker visual tone.

## Files And Responsibilities

- `app/parent/overview/page.tsx`
  - Replace hard-coded light status utility combinations with overview semantic classes.
  - Keep existing component structure and navigation behavior.
- `app/globals.css`
  - Define overview semantic class styling for light theme.
  - Add bounded `.parent-theme-dark .overview-page ...` overrides for dark theme.

## Testing And Verification

Implementation should be verified with:

- Build/type validation for the current app.
- Manual checks on `/parent/overview` in light theme.
- Manual checks on `/parent/overview` in dark theme.
- Interaction checks for clickable suggestion rows, child panel tags, and result/status cards.
- Visual checks that:
  - no obvious pale light-theme blocks remain in dark mode
  - status meaning remains clear
  - hover states remain visible but not overly bright
  - light theme remains effectively unchanged

## Risks

- A too-global dark-theme override could unintentionally restyle other parent pages.
- Keeping raw utility classes in JSX would make future overview additions likely to regress.
- Over-tinting dark status cards could reduce readability if accent contrast is not tuned carefully.

## Recommended Next Step

Write an implementation plan that:

- introduces overview semantic classes in a minimal, reviewable way
- updates the highest-risk overview sections first
- verifies light and dark theme behavior before closing the task
