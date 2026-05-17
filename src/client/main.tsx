import * as Sentry from "@sentry/react";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import posthog from "posthog-js";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { routeTree } from "./routeTree.gen";
import "./lib/i18n";
import "./index.css";

const viteEnv = import.meta.env.VITE_ENVIRONMENT ?? "local";
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
	Sentry.init({
		dsn: sentryDsn,
		environment: viteEnv,
		integrations: [Sentry.browserTracingIntegration()],
		tracesSampleRate: viteEnv === "production" ? 0.2 : 1.0,
	});
}

const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
if (posthogKey) {
	posthog.init(posthogKey, {
		api_host: import.meta.env.VITE_POSTHOG_HOST ?? "https://us.i.posthog.com",
		person_profiles: "identified_only",
	});
}

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("#root element not found");

const appTree = (
	<StrictMode>
		<RouterProvider router={router} />
	</StrictMode>
);

ReactDOM.createRoot(rootElement).render(
	sentryDsn ? (
		<Sentry.ErrorBoundary fallback={<p>Something went wrong.</p>}>
			{appTree}
		</Sentry.ErrorBoundary>
	) : (
		appTree
	),
);
