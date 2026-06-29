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
