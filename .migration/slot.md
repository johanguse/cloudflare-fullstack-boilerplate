# slot

2026-10-24, engine (checked against the current base-nova registry and installed Base UI 1.8 types). Removed the now-unused hand-rolled Slot compatibility implementation.

## Changed

- `src/client/components/ui/slot.tsx`: Removed the unused custom Slot compatibility helper.

TypeScript passed. Leftover scan: `grep -n "radix-ui\|@radix-ui"` on this component's changed files is clean. Consumer props were swept against consumer-props.md; existing Base UI primitives were retained.

## Left alone

Other already-migrated primitives and their styles. Sonner, cmdk, input-otp, and recharts are independent libraries and remain unchanged. Dependencies and base-nova configuration already target Base UI.

## Behavior changes

Composition now relies on Base UI useRender and render props; no Slot consumers remain.

## Verify by hand

Confirm badge, sidebar, forms, dialog triggers, and menu triggers retain focus, refs, click handlers, and classes when composed.
