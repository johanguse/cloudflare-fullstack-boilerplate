# form

2026-10-24, engine (checked against the current base-nova registry and installed Base UI 1.8 types). Replaced custom Slot in FormControl with Base UI useRender/mergeProps; migrated settings fields to render.

## Changed

- `src/client/components/ui/form.tsx:73`: Preserved styling and custom props while adopting Base UI composition.
- `src/client/routes/(protected)/dashboard/settings/index.tsx:75`: Updated consumer composition and preserved navigation/content.

TypeScript passed. Leftover scan: `grep -n "radix-ui\|@radix-ui"` on this component's changed files is clean. Consumer props were swept against consumer-props.md; existing Base UI primitives were retained.

## Left alone

Other already-migrated primitives and their styles. Sonner, cmdk, input-otp, and recharts are independent libraries and remain unchanged. Dependencies and base-nova configuration already target Base UI.

## Behavior changes

React Hook Form remains the form state library. FormControl now takes render instead of a slotted child; labels, error associations, refs and handlers pass through Base UI composition.

## Verify by hand

Click a field label and confirm the input gains focus. Submit invalid values and inspect aria-invalid/aria-describedby; correct the input and verify errors clear and submission still works.
