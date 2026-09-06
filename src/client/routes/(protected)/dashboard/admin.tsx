import { trpc } from "@client/lib/trpc-client";
import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/(protected)/dashboard/admin")({
	component: AdminRoute,
});

function AdminRoute() {
	const { data, isPending } = trpc.user.getRole.useQuery();

	if (isPending) {
		return (
			<div className="flex min-h-[40vh] items-center justify-center">
				<div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
				<span className="sr-only">Loading…</span>
			</div>
		);
	}
	if (data?.role !== "admin") return <Navigate to="/dashboard" />;

	return <Outlet />;
}
