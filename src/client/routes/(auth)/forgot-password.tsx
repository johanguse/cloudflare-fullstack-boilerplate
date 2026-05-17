import { Button } from "@client/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@client/components/ui/card";
import { Input } from "@client/components/ui/input";
import { Label } from "@client/components/ui/label";
import {
	type TurnstileRef,
	TurnstileWidget,
} from "@client/components/ui/turnstile";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export const Route = createFileRoute("/(auth)/forgot-password")({
	component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
	const { t } = useTranslation();
	const [email, setEmail] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [sent, setSent] = useState(false);
	const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
	const turnstileRef = useRef<TurnstileRef>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!turnstileToken) {
			toast.error(t("auth.forgotPassword.completeVerification", "Please complete the verification"));
			return;
		}
		setIsLoading(true);
		try {
			const response = await fetch("/api/auth/forget-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email,
					redirectTo: `${window.location.origin}/reset-password`,
				}),
			});
			const result = (await response.json()) as {
				error?: boolean;
				message?: string;
			};
			if (!response.ok || result.error) {
				toast.error(result.message ?? t("auth.forgotPassword.failedToSend", "Failed to send reset email"));
				turnstileRef.current?.reset();
				setTurnstileToken(null);
			} else {
				setSent(true);
			}
		} catch {
			toast.error(t("auth.forgotPassword.unexpectedError", "An unexpected error occurred. Please try again."));
			turnstileRef.current?.reset();
			setTurnstileToken(null);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-background px-4">
			<div className="w-full max-w-sm">
				<Card>
					<CardHeader>
						<CardTitle>{t("auth.forgotPassword.title", "Reset password")}</CardTitle>
						<CardDescription>
							{sent
								? t("auth.forgotPassword.subtitleSent", "Check your email for a reset link")
								: t("auth.forgotPassword.subtitleSend", "Enter your email and we'll send you a reset link")}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{sent ? (
							<div className="space-y-4">
								<div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-muted/50 p-4 text-center">
									<Mail className="h-8 w-8 text-primary" />
									<p className="text-foreground text-sm">
										{t("auth.forgotPassword.sentMessage", "We sent a reset link to")}{" "}
										<strong>{email}</strong>
									</p>
									<p className="text-muted-foreground text-xs">
										{t("auth.forgotPassword.expiryNote", "The link expires in 1 hour. Check your spam folder if you don't see it.")}
									</p>
								</div>
								<Button
									variant="outline"
									className="w-full"
									onClick={() => {
										setSent(false);
										setEmail("");
									}}
								>
									{t("auth.forgotPassword.sendAnother", "Send another email")}
								</Button>
							</div>
						) : (
							<form onSubmit={handleSubmit} className="space-y-3">
								<div className="space-y-1.5">
									<Label htmlFor="email">{t("common.email", "Email")}</Label>
									<Input
										id="email"
										type="email"
										placeholder={t("common.emailPlaceholder", "you@example.com")}
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										required
										autoComplete="email"
									/>
								</div>
								<TurnstileWidget
									ref={turnstileRef}
									onVerify={setTurnstileToken}
									onExpire={() => setTurnstileToken(null)}
								/>
								<Button
									type="submit"
									className="w-full"
									disabled={isLoading || !turnstileToken}
								>
									{isLoading && (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									)}
									{t("auth.forgotPassword.sendLink", "Send reset link")}
								</Button>
							</form>
						)}
						<Link
							to="/login"
							className="flex items-center justify-center gap-1 text-muted-foreground text-sm hover:text-foreground"
						>
							<ArrowLeft className="h-3.5 w-3.5" />
							{t("auth.forgotPassword.back", "Back to sign in")}
						</Link>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
