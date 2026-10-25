# sidebar

2026-10-24, engine (checked against the current base-nova registry and installed Base UI 1.8 types). Replaced every custom Slot composition with Base UI useRender/mergeProps and migrated AppSidebar links.

## Changed

- `src/client/components/layout/AppSidebar.tsx:31`: Updated consumer composition and preserved navigation/content.
- `src/client/components/ui/sidebar.tsx:45`: Preserved styling and custom props while adopting Base UI composition.

TypeScript passed. Leftover scan: `grep -n "radix-ui\|@radix-ui"` on this component's changed files is clean. Consumer props were swept against consumer-props.md; existing Base UI primitives were retained.

## Left alone

Other already-migrated primitives and their styles. Sonner, cmdk, input-otp, and recharts are independent libraries and remain unchanged. Dependencies and base-nova configuration already target Base UI.

## Behavior changes

Menu-open styling responds to data-popup-open; expanded/collapsed sidebar state remains its own data-state. Render composition now merges refs and event handlers through Base UI.

## Verify by hand

Expand/collapse the sidebar, activate each navigation link, open team/user menus, verify collapsed tooltips and active highlighting. At mobile width open and dismiss the sheet and confirm focus returns.
