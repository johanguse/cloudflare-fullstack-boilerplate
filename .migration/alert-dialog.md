# alert-dialog

2026-10-24, engine (checked against the current base-nova registry and installed Base UI 1.8 types). Removed AlertDialogTrigger asChild adapter and migrated account-deletion trigger.

## Changed

- `src/client/components/ui/alert-dialog.tsx:9`: Preserved styling and custom props while adopting Base UI composition.
- `src/client/routes/(protected)/dashboard/settings/index.tsx:75`: Updated consumer composition and preserved navigation/content.

TypeScript passed. Leftover scan: `grep -n "radix-ui\|@radix-ui"` on this component's changed files is clean. Consumer props were swept against consumer-props.md; existing Base UI primitives were retained.

## Left alone

Other already-migrated primitives and their styles. Sonner, cmdk, input-otp, and recharts are independent libraries and remain unchanged. Dependencies and base-nova configuration already target Base UI.

## Behavior changes

Action remains an ordinary Button (already the case), so asynchronous success is responsible for dismissal. Cancel uses Base UI Close. No automatic action-close behavior was added.

## Verify by hand

Open the alert, verify title/description and focus trap, cancel and check focus returns. Use a harmless preview action to verify the action handler runs without implicitly closing.
