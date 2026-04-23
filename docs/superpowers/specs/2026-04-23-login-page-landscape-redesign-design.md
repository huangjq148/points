# Login Page Landscape Redesign Design

## Background

The current login page mixes several concerns into one card:

- Parent vs child role selection.
- Login vs registration mode switching.
- A taller, portrait-oriented layout that uses vertical space inefficiently on landscape devices.

The product requirement is now simpler:

- Remove explicit role selection from the login page.
- Keep the existing backend behavior where a first-time parent login can auto-register.
- Let the post-login user type determine which area the user enters.
- Optimize the page primarily for landscape usage, while keeping portrait fallback usable.

This redesign should reduce cognitive load, shorten the first-screen height, and make the login page feel intentional on desktop and horizontal tablet screens without changing the underlying authentication contract.

## Confirmed Direction

- Primary layout: landscape-first split card.
- Chosen structure: left brand panel plus right login form.
- Left-side density: concise brand block with only two short rule hints.
- Visual tone: simple geometric background accents, no character illustration.
- Mobile/portrait behavior: fall back to a compact stacked layout.
- Registration behavior: preserve the current auto-register path for first-time parent accounts.
- Role handling: frontend no longer asks the user to pick a role before login.

## Goals

- Replace the current portrait-heavy login card with a layout that uses horizontal space well.
- Remove parent/child toggle UI and registration-mode toggle UI.
- Keep the login flow understandable with very little explanatory copy.
- Preserve light and dark theme support.
- Reuse existing UI components and theme primitives where possible.
- Keep the page centered and avoid unnecessary page-height growth or full-page scrolling.

## Non-Goals

- Do not redesign the underlying authentication API.
- Do not change the backend rule that a missing account creates a parent user.
- Do not add a new onboarding flow, wizard, or separate registration page.
- Do not introduce a new illustration system, external fonts, or marketing-style long-form copy.
- Do not change post-login routing logic outside what is already derived from the authenticated user role.

## Page Architecture

### Unified Login Entry

The page becomes a single login entry point:

- One username field.
- One password field.
- One primary submit action.
- One concise explanation that the system will enter the correct area automatically after login.

The user no longer sees separate "parent login" and "child login" actions. The page should communicate that one account form serves both account types.

### Split Card Structure

On landscape-oriented screens, the main card should use a two-column structure:

- Left panel: brand area.
- Right panel: interactive login area.

The card should be wider than the current implementation but shorter in height, so it reads as a horizontal surface rather than a tall portrait card.

### Left Brand Panel

The left panel should contain only essential branding and two short rules:

- Brand title:
  - `小小奋斗者`
- Supporting English label:
  - `Little Achievers`
- Short rule hints:
  - `首次家长登录自动注册`
  - `孩子账号由家长创建`

This panel should support atmosphere and orientation, not act as a documentation block.

### Right Login Panel

The right panel should contain:

- Theme toggle near the top edge.
- Main title:
  - `欢迎登录`
- Supporting line:
  - `账号统一登录，系统会自动进入对应身份页面`
- Username field.
- Password field.
- Inline error state area.
- Primary action button:
  - idle: `登录`
  - loading: `登录中...`

No extra nickname field, registration panel, or child-specific advisory card remains on the page.

## Responsive Layout Behavior

### Landscape/Desktop

Landscape is the primary target:

- Use a side-by-side card with a stable left/right balance.
- Keep the form column readable rather than overly stretched.
- Reduce unused vertical spacing compared with the current layout.
- Avoid whole-page scroll in normal desktop and landscape tablet cases.

### Portrait/Narrow Width

On narrower screens, the split card should stack:

- Brand panel compresses into a top section.
- Form panel remains the main action section below it.
- Copy stays short so the portrait layout still feels compact.

The stacked layout is a fallback, not the primary composition.

## Content And Interaction Design

### Form Behavior

The interaction model stays minimal:

- Empty username or password:
  - show `请输入账号和密码`
- Failed login:
  - show the backend message returned by the current login action
- Successful auto-registration:
  - do not show a special registration step
  - proceed through the existing successful login path

This keeps the page focused on one action: account entry.

### Role Determination

The frontend no longer infers or switches role before submission. Role-specific entry remains backend-driven and session-driven:

- User submits shared credentials.
- Backend returns authenticated user data including role.
- Existing app/session logic decides the resulting user mode and route behavior.

### Copy Strategy

All copy should remain short and operational:

- no marketing paragraphs
- no split explanatory blocks for parent vs child
- no separate "go register" or "switch to login" text actions

The page should communicate rules through placement and concise labels, not lengthy text.

## Visual System

### Style Direction

The page should keep a polished, app-oriented visual language:

- soft geometric gradients
- clean surface separation
- restrained decorative accents
- no mascot or character illustration

The goal is to feel modern and intentional without looking like a landing page.

### Left Panel Look

The left panel should carry the strongest visual identity:

- blue-led gradient or equivalent theme-safe branded surface
- subtle geometric shapes or highlight blocks
- strong title contrast
- short supporting hints in translucent rule chips/cards

### Right Panel Look

The right panel should be calmer and more operational:

- brighter or more neutral surface
- clear focus on inputs and primary action
- strong spacing rhythm between title, fields, error state, and submit button

### Theme Handling

Preserve both light and dark theme support:

- do not introduce a separate parent/child theme branch for the login page
- reuse existing theme storage and apply-document-theme logic
- verify contrast for:
  - left panel hints
  - right panel title/subtitle
  - inputs
  - error state
  - primary button

## Component And Style Strategy

Implementation should prefer reuse over new component creation.

Reuse:

- existing `Input`
- existing `PasswordInput`
- existing `Button`
- existing `ThemeToggle`
- existing theme utilities and login container styling hooks

Expected implementation shape:

- simplify [app/login/page.tsx](/Volumes/hjq/github/points/app/login/page.tsx)
- extend or adjust the login-specific styles in [app/globals.css](/Volumes/hjq/github/points/app/globals.css)

Avoid creating a separate login design system unless the existing page becomes unreadable without it.

## Data Flow And Logic Constraints

No major data-flow change is needed.

- Keep using the current `login(username, password)` app-context action.
- Preserve backend auto-register behavior for unknown parent accounts.
- Remove local page state that only existed for role mode switching and registration-mode UI.
- Keep successful authentication flowing through the current app session logic.

## Error Handling

Visible feedback remains inline and concise:

- required-field validation stays local
- backend login errors display in the page-level error block
- loading state stays on the primary button

Avoid adding modals, toasts, or extra success messages for standard login.

## Testing And Verification

Implementation should be verified with:

- build/type check
- manual visual check of `/login`
- light and dark theme pass
- responsive checks for:
  - desktop landscape
  - tablet landscape
  - narrow portrait/mobile fallback
- interaction checks for:
  - empty form validation
  - valid existing parent login
  - valid existing child login
  - first-time parent auto-register path
  - wrong password error

## Risks

- Removing role selection changes the mental model of the page, so the shared-entry copy must stay clear even after the explanatory text is reduced.
- If the left panel becomes too decorative, the page will drift back toward a marketing layout that does not match the product.
- If the card width grows without constraining the form column, the form can feel visually loose on large desktop screens.
- Theme work must be checked in both light and dark modes because the new split layout introduces more custom login-specific surfaces than the current page.
