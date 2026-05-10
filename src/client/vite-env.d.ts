/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_ENVIRONMENT: string;
	readonly VITE_SENTRY_DSN?: string;
	readonly VITE_POSTHOG_KEY?: string;
	readonly VITE_POSTHOG_HOST?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
