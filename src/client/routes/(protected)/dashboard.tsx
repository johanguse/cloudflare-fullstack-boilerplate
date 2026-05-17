import { DashboardLayout } from "@client/components/layout/DashboardLayout";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/(protected)/dashboard")({
	component: DashboardRoute,
});

function DashboardRoute() {
	return (
		<DashboardLayout>
			<Outlet />
		</DashboardLayout>
	);
}
