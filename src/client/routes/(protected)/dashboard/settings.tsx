import { SettingsLayout } from "@client/components/layout/SettingsLayout";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/(protected)/dashboard/settings")({
	component: SettingsRoute,
});

function SettingsRoute() {
	return (
		<SettingsLayout>
			<Outlet />
		</SettingsLayout>
	);
}
