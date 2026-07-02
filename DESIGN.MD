@/Users/ayobamiadefolalu/.codex/RTK.md

# Project Design & Coding Guidelines

This document provides project-wide context, design principles, and coding standards that the AI coding agent must follow when generating code, answering questions, or reviewing changes.

## 1. General Principles

- Prioritize clarity, correctness, and maintainability.
- Prefer simple, explicit solutions over overly abstract or clever ones.
- Follow existing project patterns and conventions before introducing new ones.
- Avoid unnecessary dependencies.
- Code should be production-ready, not pseudo-code.
- For questions, make them elaborate: explain why the question matters and what it is meant to clarify in this project.

## 2. UI / UX Design Guidelines

When designing or modifying the user interface, follow these rules strictly.

### Layout & Density

- Use compact layouts to fit more information on screen.
- Prefer smaller font sizes on mobile over large, spacious typography.
- Minimize excessive padding and margins.
- Group related information closely.
- Avoid oversized cards, modals, or buttons unless necessary.
- Use icons instead of emojis for a professional look.

### Typography

- Default to small font sizes on mobile screens and base font sizes on larger screens.
- Headings should be subtle and not dominate the layout.
- Avoid large hero-style text.
- Text should be readable but space-efficient.

### Components

- Favor tables, lists, and grids over large visual blocks.
- Buttons should be compact and clearly labeled.
- Icons may be used to reduce text where appropriate.
- Avoid unnecessary animations or visual noise.

### Overall Feel

- Information-dense but not cluttered.
- Functional, clean, and developer-oriented.
- UX should favor power users over marketing-style design.

## 3. Frontend Coding Guidelines

- Prefer reusable, composable components.
- Keep components small and focused.
- Avoid inline styles unless necessary.
- Use existing styling systems, such as Tailwind or CSS modules, consistently.
- Do not introduce new UI libraries unless explicitly required.

## 4. Backend / Logic Guidelines

- Validate inputs thoroughly.
- Fail fast with clear error messages.
- Prefer explicit state machines or enums over magic values.
- Avoid hidden side effects.
- Write code that is easy to test.

## 4.1. Blockchain Transaction Guidelines

### Always Use Batch Transactions With useSendCalls

Critical rule: for all contract interactions, use wagmi's `useSendCalls` to batch transactions into a single atomic operation.

Why this matters:

- User experience: users sign one transaction instead of multiple transactions.
- Speed: faster execution because the app does not wait between sequential transactions.
- Safety: atomic execution, so all calls succeed or all calls fail.
- Cost: better gas efficiency through a single base fee.

Required pattern:

```typescript
import { useSendCalls } from "wagmi";

const { sendCallsAsync } = useSendCalls();

// Never do this for dependent contract writes.
await sendTransaction({ to: TOKEN, data: approveData });
await sendTransaction({ to: CONTRACT, data: stakeData });

// Always batch related contract writes.
await sendCallsAsync({
  calls: [
    { to: TOKEN as `0x${string}`, data: approveData as `0x${string}` },
    { to: CONTRACT as `0x${string}`, data: stakeData as `0x${string}` },
  ],
});
```

Batch these operations:

- Token approvals plus action, such as approve plus stake, swap, or deposit.
- NFT approvals plus action, such as approve plus stake or list.
- Multi-step operations, such as claim plus restake or vote plus execute.
- Any sequential dependent transactions.

Implementation checklist:

- Import `useSendCalls` from `wagmi`, not `useWallet`.
- Use `sendCallsAsync` for all contract writes.
- Build a `calls` array for related operations.
- Cast addresses to `0x${string}`.
- Cast encoded data to `0x${string}`.
- Check allowances before adding approval calls, so approval calls are conditionally batched.

Reference:

- Full guide: `/docs/BATCH_TRANSACTIONS.md`
- Quick ref: `/docs/BATCH_TX_QUICKREF.md`
- Example: `/miniapp-frontend/src/lib/useStaking.ts`

## 5. AI Behavior Expectations

When acting as a coding agent, the AI should:

- Respect all rules in this document.
- Avoid making assumptions about product requirements.
- Ask for clarification only when absolutely necessary.
- Prefer incremental changes over large refactors.
- Explain reasoning when suggesting non-obvious solutions.
- Make the plan extremely clear before implementing complex features; sacrifice grammar for concision if needed.
- At the end of each plan, give a list of unresolved implementation questions, if any.
- Make a global note of mistakes and the user's design or architecture choices after every session so they are not repeated.

## 6. What to Avoid

- Over-designed or overly spacious UIs.
- Large fonts and excessive whitespace.
- Premature optimization.
- Unnecessary abstraction layers.
- Introducing patterns that do not already exist in the project.
- Multiple sequential transactions; use batch transactions instead.
- Using `useWallet` for contract writes; use `useSendCalls` instead.

This file is authoritative. If there is a conflict between this document and a generated suggestion, this document takes precedence.

---

name: Baseshire Hethaway Vault
colors:
surface: '#faf8ff'
surface-dim: '#d2d9f4'
surface-bright: '#faf8ff'
surface-container-lowest: '#ffffff'
surface-container-low: '#f2f3ff'
surface-container: '#eaedff'
surface-container-high: '#e2e7ff'
surface-container-highest: '#dae2fd'
on-surface: '#131b2e'
on-surface-variant: '#444653'
inverse-surface: '#283044'
inverse-on-surface: '#eef0ff'
outline: '#747685'
outline-variant: '#c4c5d5'
surface-tint: '#3255c6'
primary: '#002275'
on-primary: '#ffffff'
primary-container: '#0035a8'
on-primary-container: '#94aaff'
inverse-primary: '#b7c4ff'
secondary: '#005fac'
on-secondary: '#ffffff'
secondary-container: '#2c95fe'
on-secondary-container: '#002d56'
tertiary: '#392900'
on-tertiary: '#ffffff'
tertiary-container: '#543e00'
on-tertiary-container: '#daa600'
error: '#ba1a1a'
on-error: '#ffffff'
error-container: '#ffdad6'
on-error-container: '#93000a'
primary-fixed: '#dce1ff'
primary-fixed-dim: '#b7c4ff'
on-primary-fixed: '#001551'
on-primary-fixed-variant: '#0d3bad'
secondary-fixed: '#d4e3ff'
secondary-fixed-dim: '#a4c9ff'
on-secondary-fixed: '#001c39'
on-secondary-fixed-variant: '#004883'
tertiary-fixed: '#ffdf9a'
tertiary-fixed-dim: '#f7be1d'
on-tertiary-fixed: '#251a00'
on-tertiary-fixed-variant: '#5a4300'
background: '#faf8ff'
on-background: '#131b2e'
surface-variant: '#dae2fd'
canvas: '#FFFFFF'
surface-muted: '#F8FAFC'
surface-slate: '#F1F5F9'
border-subtle: rgba(0, 82, 255, 0.08)
ink-secondary: '#1E293B'
ink-muted: '#475569'
ink-subdued: '#64748B'
risk-red: '#EF4444'
warning-amber: '#F59E0B'
info-cobalt: '#3B82F6'
admin-coral: '#FF6B6B'
typography:
display-lg:
fontFamily: Newsreader
fontSize: 48px
fontWeight: '400'
lineHeight: 48px
letterSpacing: -0.02em
display-lg-mobile:
fontFamily: Newsreader
fontSize: 32px
fontWeight: '400'
lineHeight: 34px
letterSpacing: -0.02em
headline-md:
fontFamily: Geist
fontSize: 24px
fontWeight: '600'
lineHeight: 32px
letterSpacing: -0.01em
body-base:
fontFamily: Geist
fontSize: 14px
fontWeight: '400'
lineHeight: 22px
body-sm:
fontFamily: Geist
fontSize: 13px
fontWeight: '400'
lineHeight: 20px
data-mono:
fontFamily: JetBrains Mono
fontSize: 13px
fontWeight: '400'
lineHeight: 18px
letterSpacing: -0.01em
label-caps:
fontFamily: JetBrains Mono
fontSize: 11px
fontWeight: '500'
lineHeight: 16px
letterSpacing: 0.08em
input-mobile:
fontFamily: Geist
fontSize: 16px
fontWeight: '400'
lineHeight: 24px
rounded:
sm: 0.125rem
DEFAULT: 0.25rem
md: 0.375rem
lg: 0.5rem
xl: 0.75rem
full: 9999px
spacing:
base: 4px
pad-xs: 8px
pad-sm: 12px
pad-md: 16px
pad-lg: 24px
row-sm: 36px
row-md: 44px
row-lg: 52px

---

## Brand & Style

The design system is built on the narrative of **Editorial Fintech**—a hybrid aesthetic that blends the prestigious, academic weight of traditional financial institutions with the high-velocity precision of modern Web3 engineering. The goal is to evoke an immediate sense of institutional security, regulatory sophistication, and on-chain permanence.

The chosen style is **Modern Corporate with a Tonal Layering approach**. It utilizes a strict, high-density layout that favors information transparency over decorative whitespace. Visual interest is generated through sophisticated typographic pairings—pairing a high-contrast serif for narrative elements with a geometric sans-serif for functional UI and a technical monospace for financial data. The interface feels robust, authoritative, and developer-oriented, avoiding the "friendly SaaS" tropes in favor of a professional, "power-user" environment.

## Colors

The palette is anchored by **Baseshire Royal Blue**, a color chosen to communicate stability and institutional trust. The primary canvas is a pure white, occasionally softened by dual-layer radial gradients in subtle blue tones to reduce glare and add depth.

- **Primary & Secondary:** Used for high-priority interactive states, focus rings, and primary action backdrops.
- **Tonal Neutrals:** A sophisticated range of slates (from `#F1F5F9` to `#0F172A`) defines the hierarchy of information. Surfaces use cool slates to group content without heavy borders.
- **Functional Semantics:** Standardized red, amber, and cobalt are used for risk, warnings, and system info. A "Conglomerate Gold" is reserved for high-value assets and VIP tiering.
- **Interactive Tints:** Use `color-mix` with white or transparency for hover and active states to maintain the core hue while providing tactile feedback.

## Typography

The typographic strategy is three-tiered to ensure clarity across different types of information:

1.  **Narrative (Serif):** `Newsreader` (or Instrument Serif) is used for high-level headings and display moments. It should be styled with tight line-heights and occasionally italicized to evoke an editorial, financial-journal aesthetic.
2.  **Functional (Sans):** `Geist` handles the majority of the UI. It is chosen for its geometric precision and readability at small scales. On mobile, all inputs must use 16px font size to prevent iOS browser zooming.
3.  **Technical (Mono):** `JetBrains Mono` is strictly reserved for financial figures, wallet addresses, and status labels. It uses tabular figures (`tnum`) to ensure columns stay aligned during real-time data updates.

## Layout & Spacing

The layout utilizes a **Fixed Grid** model for desktop and a highly condensed **Fluid Grid** for mobile to maximize information density.

- **Grid System:** A 12-column grid on desktop collapses to a 2-column grid on tablets (820px - 1100px) and a single-column stack on mobile (<820px).
- **Rhythm:** All spacing is based on a 4px increment. A "standard density" uses 16px padding, while "compact" modes for data-heavy tables reduce this to 12px.
- **Mobile Adjustments:** Navigation transitions from a desktop sidebar (232px) to a floating bottom dock on mobile. Margins on mobile are reduced to 12px–16px to ensure complex financial tables remain legible.

## Elevation & Depth

Visual hierarchy is primarily established through **Tonal Layering** rather than heavy shadows.

- **Surface Tiers:** The canvas is white (`#FFFFFF`). Secondary containers use Slate (`#F1F5F9`). Active or elevated panels use "Glassmorphic" properties: 70% white opacity with a 14px backdrop blur.
- **Shadows:** When used for floating elements (like the mobile bottom nav), shadows should be extra-diffused and low-opacity (`rgba(0, 0, 0, 0.1)`), often tinted with a hint of the brand blue.
- **Borders:** Hairline borders (1px) are the primary separator. Use a translucent brand blue (`rgba(0, 82, 255, 0.08)`) to create crisp, subtle boundaries that feel architectural rather than heavy.

## Shapes

The shape language is **Professional and Structured**.

- **Standard Radius:** 8px (`rounded-sm`) for buttons and input fields to maintain a crisp, efficient look.
- **Container Radius:** 14px (`rounded-lg`) for cards and modals, providing a slightly softer frame for content blocks.
- **Full Radius:** Reserved exclusively for status pills and tags to distinguish them from interactive buttons.

## Components

- **Buttons:** Compact 36px height for standard actions. Primary buttons use the Royal Blue background with white text. Secondary buttons use a Slate background with a hairline Royal Blue border. Use a 1px vertical transform on the active state for tactile feedback.
- **Inputs:** 36px height with 8px radius. Use JetBrains Mono for the text to emphasize technical precision. On focus, the border should illuminate to Royal Blue.
- **Status Pills:** 22px height, full-rounded. They must include a 6px status dot (e.g., cobalt for "Open", amber for "Pending"). Text is uppercase 11px Monospace.
- **Mobile Bottom Nav:** A floating dock inset by 10px from screen edges. Features a glassmorphic background (86% white, 16px blur) and an elevated shadow. Icons are 16px placed directly above 10px labels.
- **Cards:** Utilize a "Precision Metrics" style—high-density data points, monospaced numbers, and secondary labels in 11px uppercase Geist Sans.
- **Chat Bubbles:** For P2P communication, use 12px rounded corners. Sender bubbles use a 22% opacity Royal Blue tint; recipient bubbles use solid Light Slate.
