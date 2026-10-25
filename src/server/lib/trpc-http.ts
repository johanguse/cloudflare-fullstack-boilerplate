import { trpcServer as createTrpcServer } from "@hono/trpc-server";

export function trpcServer(
	options: Parameters<typeof createTrpcServer>[0],
): ReturnType<typeof createTrpcServer> {
	const handler = createTrpcServer(options);
	return async (c, next) => {
		const response = await handler(c, next);
		// Adapter 0.4 returns a raw Response. Merge Hono's prepared headers
		// (including CORS) while preserving tRPC's status, cookies and body stream.
		return response ? c.newResponse(response.body, response) : response;
	};
}
