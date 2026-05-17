import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/(protected)/dashboard/invoices")({
	component: () => <Outlet />,
});
