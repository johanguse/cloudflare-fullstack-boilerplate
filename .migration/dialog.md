# dialog

2026-10-24, engine (checked against the current base-nova registry and installed Base UI 1.8 types). Removed DialogTrigger/DialogClose asChild adapters and migrated the settings trigger.

## Changed

- `src/client/components/ui/dialog.tsx:8`: Preserved styling and custom props while adopting Base UI composition.
- `src/client/routes/(protected)/dashboard/settings/index.tsx:75`: Updated consumer composition and preserved navigation/content.

TypeScript passed. Leftover scan: `grep -n "radix-ui\|@radix-ui"` on this component's changed files is clean. Consumer props were swept against consumer-props.md; existing Base UI primitives were retained.

## Left alone

Other already-migrated primitives and their styles. Sonner, cmdk, input-otp, and recharts are independent libraries and remain unchanged. Dependencies and base-nova configuration already target Base UI.

## Behavior changes

Public composition now uses render. Base UI focus trapping, initialFocus/finalFocus and open callbacks remain unchanged.

## Verify by hand

Open the password dialog with keyboard, tab through its fields, close using Escape and the close button, and verify focus returns to its trigger.
