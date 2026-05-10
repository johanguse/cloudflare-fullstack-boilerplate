import { authClient } from "@client/lib/auth-client";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/(auth)")({
	component: AuthLayout,
});

function AuthLayout() {
	const { data: session, isPending } = authClient.useSession();
	const navigate = useNavigate();

	useEffect(() => {
		if (!isPending && session?.user) {
			navigate({ to: "/dashboard" });
		}
	}, [session, isPending, navigate]);

	if (isPending || session?.user) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
			</div>
		);
	}

	return <Outlet />;
}
