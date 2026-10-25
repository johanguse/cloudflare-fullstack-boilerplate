# sheet

2026-10-24, engine (checked against the current base-nova registry and installed Base UI 1.8 types). Removed SheetTrigger/SheetClose asChild adapters; Base UI Dialog primitives retained.

## Changed

- `src/client/components/ui/sheet.tsx:8`: Preserved styling and custom props while adopting Base UI composition.

TypeScript passed. Leftover scan: `grep -n "radix-ui\|@radix-ui"` on this component's changed files is clean. Consumer props were swept against consumer-props.md; existing Base UI primitives were retained.

## Left alone

Other already-migrated primitives and their styles. Sonner, cmdk, input-otp, and recharts are independent libraries and remain unchanged. Dependencies and base-nova configuration already target Base UI.

## Behavior changes

Public composition now uses render. Existing mobile sidebar controlled-open behavior and sheet side animations are preserved.

## Verify by hand

At mobile width open the sidebar sheet, tab through controls, close with Escape and the close control; verify overlay dismissal and focus return. Check each exposed side in a preview.
