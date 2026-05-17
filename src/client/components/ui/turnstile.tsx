import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { forwardRef, useImperativeHandle, useRef } from "react";

const TEST_SITE_KEY_PASS = "1x00000000000000000000AA";
const TEST_SITE_KEY_FAIL = "2x00000000000000000000AB";

interface TurnstileProps {
	onVerify: (token: string) => void;
	onError?: (error: string) => void;
	onExpire?: () => void;
	className?: string;
}

export interface TurnstileRef {
	reset: () => void;
	remove: () => void;
	render: () => void;
}

export const TurnstileWidget = forwardRef<TurnstileRef, TurnstileProps>(
	({ onVerify, onError, onExpire, className }, ref) => {
		const turnstileRef = useRef<TurnstileInstance>(null);

		useImperativeHandle(ref, () => ({
			reset: () => turnstileRef.current?.reset(),
			remove: () => turnstileRef.current?.remove(),
			render: () => turnstileRef.current?.render(),
		}));

		const isDevelopment = import.meta.env.DEV;

		const siteKey = isDevelopment
			? (import.meta.env.VITE_TURNSTILE_SITE_KEY ?? TEST_SITE_KEY_PASS)
			: import.meta.env.VITE_TURNSTILE_SITE_KEY;

		if (!siteKey && !isDevelopment) {
			console.error("VITE_TURNSTILE_SITE_KEY is not configured for production");
			return (
				<div className={className}>
					<div className="flex h-16 items-center justify-center rounded border border-destructive/20 bg-destructive/10">
						<p className="text-destructive text-sm">
							Verification service not configured
						</p>
					</div>
				</div>
			);
		}

		const isTestCredentials =
			siteKey === TEST_SITE_KEY_PASS || siteKey === TEST_SITE_KEY_FAIL;

		return (
			<div className={className}>
				<Turnstile
					ref={turnstileRef}
					siteKey={siteKey}
					onSuccess={onVerify}
					onError={onError}
					onExpire={onExpire}
					options={{ theme: "auto", size: "flexible" }}
				/>
				{isDevelopment && (
					<p className="mt-2 text-center text-muted-foreground text-xs">
						Development mode{" "}
						{isTestCredentials
							? `- ${siteKey === TEST_SITE_KEY_PASS ? "test credentials (always passes)" : "test credentials (always fails)"}`
							: "- using configured site key"}
					</p>
				)}
			</div>
		);
	},
);

TurnstileWidget.displayName = "TurnstileWidget";
