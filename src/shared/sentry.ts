// Explicitly retain Sentry v10's collection policy when using the v11 SDKs.
export function getSentryDataCollection() {
	return {
		userInfo: false,
		cookies: false,
		httpHeaders: {
			request: { deny: ["forwarded", "-ip", "remote-", "via", "-user"] },
			response: { deny: ["forwarded", "-ip", "remote-", "via", "-user"] },
		},
		httpBodies: [],
		urlQueryParams: { deny: ["forwarded", "-ip", "remote-", "via", "-user"] },
		genAI: { inputs: false, outputs: false },
		databaseQueryData: false,
		queues: false,
		graphQL: { document: false, variables: false },
	};
}
