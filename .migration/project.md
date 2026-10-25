# Project migration

2026-10-24. Completed the remaining Radix-style composition adapters on branch `codex/finish-base-ui-migration` in a clean managed worktree. The original checkout and its staged skill additions were preserved.

## Dependency and configuration audit

`bunx --bun shadcn@latest info --json` confirmed Vite, Tailwind 4, base-nova, Base UI, and `@client/components/ui`. `@base-ui/react` 1.8 was already installed alongside no direct Radix dependencies, and components.json already targeted base-nova. No dependency swap, preset change, or lockfile change was needed. Worktree dependencies were installed with `bun install --frozen-lockfile`.

The Bun lockfile still contains transitive Radix packages required by cmdk. Per the migration skill, cmdk and other independent libraries (sonner, input-otp, recharts) were intentionally left alone. This migration does not claim a Radix-free dependency graph.

## Component and consumer sweep

Finished button, badge, dropdown-menu, dialog, alert-dialog, sheet, tooltip, form, and sidebar composition; removed the unused custom Slot helper. Each component has its own report and commit. Existing classes, loading states, navigation destinations, validation logic and primitive anatomy were retained. Current base-nova registry sources and installed Base UI declarations guided the transformations. Because the source files were already partially migrated/customized, the engine was applied to the existing files instead of overwriting them with registry code.

All app consumers were swept for asChild, legacy tooltip timing props, selection callbacks, positioning props, autofocus callbacks and other changes listed in consumer-props.md. No asChild, delayDuration, Radix import, Radix CSS variable, or IconPlaceholder remains in src. Sidebar expanded/collapsed data-state and table selected data-state are application-owned and intentionally remain.

Menu trigger styling now uses data-popup-open. Base UI checkbox/radio menu items retain their existing closeOnClick defaults; ordinary items close after activation. Alert actions remain ordinary buttons and require explicit asynchronous dismissal. Tabs were already Base UI and keep their existing manual activation default. No behavior defaults were silently changed to imitate Radix.

## Validation

- Before changes: `bun run build` passed all 15 tests across 4 files, TypeScript project builds and Vite worker/client production builds.
- During migration: TypeScript passed after each component conversion.
- After changes: `bun run build` again passed all 15 tests, TypeScript and production builds. Biome check passed for all 19 surviving changed TSX files. `git diff --check` passed.
- Browser QA used an isolated local preview of the actual migrated wrappers, with the application stylesheet. It exercised link-button Enter activation, disabled/loading state, badge child/parent click-handler composition, menu typeahead and arrow navigation, nested submenu activation and dismissal, dialog Escape/focus return, alert action/cancel behavior, sheet close/focus return, form label/error associations and invalid/valid submission, sidebar menu composition and collapsed tooltips, and mobile sidebar open/Escape/focus return at 390px width.
- Composition inspection found zero nested button elements. Form errors set aria-invalid and associate both description and error IDs; successful submission preserved input handlers and refs.
- Preview hot reload briefly created duplicate roots in the temporary harness during source updates; the preview was reloaded before final mobile verification. This was isolated to the disposable harness, outside the repository.
- The same pre-existing Stripe source-map and large-bundle warnings remain. No new build failures.

Browser verification covers primitive composition, not authenticated end-to-end billing/account/invoice operations. Full product visual comparison and provider-backed operations were not exercised.

Sources: [Base UI composition](https://base-ui.com/react/handbook/composition), [shadcn Base UI button](https://ui.shadcn.com/docs/components/base/button), and the current `https://ui.shadcn.com/r/styles/base-nova/<component>.json` registries.

0 wrappers remain on Radix.
