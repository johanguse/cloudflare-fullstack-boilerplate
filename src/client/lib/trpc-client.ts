import type { AppRouter } from "@server/routers/index";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = createTRPCClient<AppRouter>({
	links: [
		httpBatchLink({
			url: "/trpc",
		}),
	],
});

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 30 * 1000,
			retry: 1,
		},
	},
});

export { QueryClient, QueryClientProvider };
