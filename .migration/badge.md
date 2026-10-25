# badge

2026-10-24, engine (checked against the current base-nova registry and installed Base UI 1.8 types). Replaced custom Slot with Base UI useRender/mergeProps; existing badge styling retained.

## Changed

- `src/client/components/ui/badge.tsx:27`: Preserved styling and custom props while adopting Base UI composition.

TypeScript passed. Leftover scan: `grep -n "radix-ui\|@radix-ui"` on this component's changed files is clean. Consumer props were swept against consumer-props.md; existing Base UI primitives were retained.

## Left alone

Other already-migrated primitives and their styles. Sonner, cmdk, input-otp, and recharts are independent libraries and remain unchanged. Dependencies and base-nova configuration already target Base UI.

## Behavior changes

The polymorphic API is render; no existing Badge consumer used asChild.

## Verify by hand

Check badge colors and sizes. Render a badge as an anchor and confirm focus, click handler, and destination survive composition.
