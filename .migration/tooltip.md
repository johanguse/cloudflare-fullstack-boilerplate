# tooltip

2026-10-24, engine (checked against the current base-nova registry and installed Base UI 1.8 types). Removed legacy asChild/delayDuration API and stale delayed-open classes; migrated sidebar tooltip consumer.

## Changed

- `src/client/components/ui/sidebar.tsx:44`: Preserved styling and custom props while adopting Base UI composition.
- `src/client/components/ui/tooltip.tsx:4`: Preserved styling and custom props while adopting Base UI composition.

TypeScript passed. Leftover scan: `grep -n "radix-ui\|@radix-ui"` on this component's changed files is clean. Consumer props were swept against consumer-props.md; existing Base UI primitives were retained.

## Left alone

Other already-migrated primitives and their styles. Sonner, cmdk, input-otp, and recharts are independent libraries and remain unchanged. Dependencies and base-nova configuration already target Base UI.

## Behavior changes

Provider uses delay with the existing zero-delay default. Popup positioning and arrow classes match the current base-nova registry; no tooltip delay change was introduced.

## Verify by hand

Collapse the sidebar, hover and keyboard-focus a link, verify the tooltip appears beside it and closes on Escape/activation. Inspect arrow placement at each exposed side.
