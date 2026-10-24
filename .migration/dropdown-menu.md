# dropdown-menu

2026-10-24, engine (checked against the current base-nova registry and installed Base UI 1.8 types). Removed trigger/item asChild adapters, converted consumers, and fixed menu-open styling hooks.

## Changed

- `src/client/components/layout/TeamSwitcher.tsx:39`: Updated consumer composition and preserved navigation/content.
- `src/client/components/layout/UserMenu.tsx:48`: Updated consumer composition and preserved navigation/content.
- `src/client/components/ui/dropdown-menu.tsx:6`: Preserved styling and custom props while adopting Base UI composition.
- `src/client/routes/(protected)/dashboard/admin/activity.tsx:100`: Updated consumer composition and preserved navigation/content.
- `src/client/routes/(protected)/dashboard/api-keys.tsx:75`: Updated consumer composition and preserved navigation/content.

TypeScript passed. Leftover scan: `grep -n "radix-ui\|@radix-ui"` on this component's changed files is clean. Consumer props were swept against consumer-props.md; existing Base UI primitives were retained.

## Left alone

Other already-migrated primitives and their styles. Sonner, cmdk, input-otp, and recharts are independent libraries and remain unchanged. Dependencies and base-nova configuration already target Base UI.

## Behavior changes

Checkbox/radio menu items keep Base UI closeOnClick defaults (false); plain items close by default. This behavior was already present before this completion pass. Trigger open styling now responds to data-popup-open.

## Verify by hand

Open team/user/action menus with mouse and Enter. Navigate using arrows and typeahead, activate settings/billing links, inspect submenu alignment, and press Escape to confirm focus returns.
