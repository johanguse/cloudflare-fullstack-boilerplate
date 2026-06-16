import { trpc } from "@client/lib/trpc-client";
import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/(protected)/dashboard/admin")({
	component: AdminRoute,
});

function AdminRoute() {
	const { data, isPending } = trpc.user.getRole.useQuery();

	if (isPending) return null;
	if (data?.role !== "admin") return <Navigate to="/dashboard" />;

	return <Outlet />;
}
