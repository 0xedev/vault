# Shadcn/UI Integration Plan

## Goal

Integrate Shadcn UI into the Vault app while preserving the current design system, wallet flows, and marketplace UX. The migration should be incremental, low-risk, and compatible with the existing CSS custom-property theme system.

## Scope

- Add Tailwind CSS and Shadcn UI primitives to the Next.js app.
- Replace the most repeated custom UI patterns with Shadcn primitives.
- Keep the existing Vault visual language by mapping current CSS variables to Shadcn theme tokens.
- Avoid rewriting the app in one pass; migrate in phases.

## Recommended stack

- Tailwind CSS
- Shadcn UI
- Radix UI primitives
- class-variance-authority
- clsx
- tailwind-merge
- lucide-react

## Phase 0 — Foundation

1. Install Tailwind + Shadcn dependencies.
2. Configure Tailwind in the Next app.
3. Add the Shadcn CLI and initialize the project.
4. Create a small design-token bridge between existing Vault CSS variables and Tailwind theme values.
5. Add a base theme provider so the app can continue using existing data-theme attributes.

### Files to add or update

- package.json
- postcss.config.mjs
- tailwind.config.ts (new)
- src/app/globals.css
- src/components/ThemeProvider.tsx

## Phase 1 — Core primitives

Introduce the following primitives first, since they will be reused across the app:

- Button
- Card
- Input
- Label
- Textarea
- Select
- Dialog
- Sheet
- Dropdown Menu
- Badge
- Separator
- Tabs
- Scroll Area
- Skeleton
- Tooltip
- Checkbox
- Switch

## Phase 2 — Shell and navigation

These components are shared across nearly every route and should be migrated first.

| Component                       | Why it needs change                           | Shadcn replacement                |
| ------------------------------- | --------------------------------------------- | --------------------------------- |
| src/components/TopBar.tsx       | Uses custom button and nav styling            | Button, Dropdown Menu, Sheet      |
| src/components/SideBar.tsx      | Needs drawer/mobile behavior and nav patterns | Sheet, Navigation menu, Separator |
| src/components/AdminTopBar.tsx  | Uses custom toolbar and action buttons        | Button, Dropdown Menu, Sheet      |
| src/components/AdminSideBar.tsx | Uses custom sidebar panels                    | Sheet, Sidebar/nav primitives     |
| src/components/AppShell.tsx     | Layout shell for the app                      | Card, Separator, Sheet            |
| src/app/(user)/layout.tsx       | Wraps the user app shell                      | Shell/layout composition updates  |
| src/app/admin/layout.tsx        | Wraps the admin shell                         | Shell/layout composition updates  |

## Phase 3 — Modal and form flows

Listing and interaction flows are the highest-value place to introduce Shadcn UI because they are used repeatedly and heavily.

| Component                           | Why it needs change                          | Shadcn replacement                               |
| ----------------------------------- | -------------------------------------------- | ------------------------------------------------ |
| src/components/ListXModal.tsx       | Custom modal and form inputs                 | Dialog, Input, Label, Button, Card               |
| src/components/ListMiniAppModal.tsx | Large form with custom layout and checkboxes | Dialog, Input, Textarea, Label, Checkbox, Button |
| src/components/ListFidModal.tsx     | Custom modal and form layout                 | Dialog, Input, Label, Button                     |
| src/components/ListBundleModal.tsx  | Complex form with nested assets and inputs   | Dialog, Input, Textarea, Select, Button, Card    |
| src/components/Dropdown.tsx         | Replaces a custom select/dropdown            | Select or Dropdown Menu                          |
| src/components/TweaksPanel.tsx      | Custom controls and settings UI              | Card, Switch, Select, Slider, Button             |

## Phase 4 — Cards and content surfaces

These components are visible throughout the marketplace and profile experience.

| Component                     | Why it needs change                                | Shadcn replacement     |
| ----------------------------- | -------------------------------------------------- | ---------------------- |
| src/components/LoanCard.tsx   | Custom marketplace card UI                         | Card, Badge, Button    |
| src/components/BundleCard.tsx | Custom bundle presentation                         | Card, Badge, Separator |
| src/components/StatusPill.tsx | Custom pill styling                                | Badge                  |
| src/components/NFTArt.tsx     | Presentational surface that can be wrapped in Card | Card, Aspect Ratio     |

## Phase 5 — Utility and supporting UI

These are lower priority but still useful to modernize.

| Component                         | Why it needs change                                            | Shadcn replacement                    |
| --------------------------------- | -------------------------------------------------------------- | ------------------------------------- |
| src/components/ThemeProvider.tsx  | Theme switching needs to integrate with shadcn theme tokens    | Theme provider + color mode utilities |
| src/components/WalletProvider.tsx | Wallet action surfaces can use better loading and alert states | Alert, Button, Skeleton               |

## Phase 6 — Global styling migration

1. Convert the current global button/input/modal classes to Tailwind-based utility classes where appropriate.
2. Keep the Vault design tokens by mapping existing CSS custom properties to Tailwind theme variables.
3. Avoid removing the existing CSS too early; migrate incrementally and keep compatibility.

### High-risk CSS areas to review

- src/app/globals.css
- modal, button, input, sidebar, badge, pill, card, and form styling selectors

## Migration order

1. Foundation and theme integration
2. Shared shell/navigation components
3. Modal/form components
4. Cards and content surfaces
5. Supporting utility UI and cleanup

## Suggested implementation checklist

- [ ] Add Tailwind and Shadcn dependencies
- [ ] Create theme token bridge
- [ ] Migrate TopBar and SideBar
- [ ] Migrate admin shell components
- [ ] Replace modal forms with Dialog + form primitives
- [ ] Replace custom cards and pills with Card/Badge
- [ ] Remove old custom UI classes only after parity is verified

## Priority components to change first

1. src/components/TopBar.tsx
2. src/components/SideBar.tsx
3. src/components/AdminSideBar.tsx
4. src/components/ListXModal.tsx
5. src/components/ListMiniAppModal.tsx
6. src/components/ListFidModal.tsx
7. src/components/ListBundleModal.tsx
8. src/components/Dropdown.tsx
9. src/components/LoanCard.tsx
10. src/components/BundleCard.tsx
