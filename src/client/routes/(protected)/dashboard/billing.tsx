import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/(protected)/dashboard/billing")({
	component: () => <Outlet />,
});
