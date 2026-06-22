import type { AppRouter } from "@server/routers/index";
import {
	QueryCache,
	QueryClient,
	QueryClientProvider,
} from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { toast } from "sonner";

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = createTRPCClient<AppRouter>({
	links: [
		httpBatchLink({
			url: "/trpc",
		}),
	],
});

export const queryClient = new QueryClient({
	queryCache: new QueryCache({
		onError: (error, query) => {
			// Only surface *background* refetch failures globally — initial-load
			// errors are already handled by each page's own error UI (e.g. the
			// dashboard retry banner), so toasting them here would double-signal.
			if (query.state.data !== undefined) {
				toast.error(
					error instanceof Error
						? error.message
						: "Something went wrong while refreshing data.",
				);
			}
		},
	}),
	defaultOptions: {
		queries: {
			staleTime: 30 * 1000,
			retry: 1,
		},
	},
});

export { QueryClient, QueryClientProvider };
