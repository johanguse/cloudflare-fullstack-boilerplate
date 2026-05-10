import { authClient } from "@client/lib/auth-client";
import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/(protected)")({
	component: ProtectedLayout,
});

function ProtectedLayout() {
	const { data: session, isPending } = authClient.useSession();

	if (isPending) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
			</div>
		);
	}

	if (!session?.user) {
		return <Navigate to="/login" />;
	}

	return <Outlet />;
}
