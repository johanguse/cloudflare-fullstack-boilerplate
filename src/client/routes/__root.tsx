import { ThemeProvider } from "@client/components/layout/ThemeProvider";
import { queryClient, trpc, trpcClient } from "@client/lib/trpc-client";
import { QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { Toaster } from "sonner";

export const Route = createRootRoute({
	component: RootComponent,
});

function RootComponent() {
	return (
		<trpc.Provider client={trpcClient} queryClient={queryClient}>
			<QueryClientProvider client={queryClient}>
				<ThemeProvider>
					<Outlet />
					<Toaster richColors position="top-right" />
				</ThemeProvider>
			</QueryClientProvider>
		</trpc.Provider>
	);
}
