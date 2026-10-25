# button

2026-10-24, engine (checked against the current base-nova registry and installed Base UI 1.8 types). Removed asChild adapters and migrated every Button consumer to render.

## Changed

- `src/client/components/ui/button.tsx:42`: Preserved styling and custom props while adopting Base UI composition.
- `src/client/routes/(protected)/dashboard/billing/index.tsx:75`: Updated consumer composition and preserved navigation/content.
- `src/client/routes/(protected)/dashboard/index.tsx:38`: Updated consumer composition and preserved navigation/content.
- `src/client/routes/(protected)/dashboard/invoices/$id.tsx:48`: Updated consumer composition and preserved navigation/content.
- `src/client/routes/(protected)/dashboard/invoices/index.tsx:58`: Updated consumer composition and preserved navigation/content.
- `src/client/routes/(protected)/dashboard/settings/index.tsx:75`: Updated consumer composition and preserved navigation/content.

TypeScript passed. Leftover scan: `grep -n "radix-ui\|@radix-ui"` on this component's changed files is clean. Consumer props were swept against consumer-props.md; existing Base UI primitives were retained.

## Left alone

Other already-migrated primitives and their styles. Sonner, cmdk, input-otp, and recharts are independent libraries and remain unchanged. Dependencies and base-nova configuration already target Base UI.

## Behavior changes

The wrapper now exposes Base UI render/nativeButton directly; link consumers explicitly use nativeButton={false}. Loading and disabled behavior are preserved.

## Verify by hand

Tab to a link button and activate with Enter; confirm its destination. Submit a form with a normal button. Confirm loading shows a spinner/text and blocks a second click.
