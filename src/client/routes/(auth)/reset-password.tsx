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
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

const resetSearchSchema = z.object({
	token: z.string().optional(),
	error: z.string().optional(),
});

export const Route = createFileRoute("/(auth)/reset-password")({
	validateSearch: resetSearchSchema,
	component: ResetPasswordPage,
});

function ResetPasswordPage() {
	const { t } = useTranslation();
	const { token, error: searchError } = Route.useSearch();
	const navigate = useNavigate();
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();
	const turnstileRef = useRef<TurnstileRef>(null);

	if (searchError ?? !token) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background px-4">
				<Card className="w-full max-w-sm">
					<CardHeader>
						<CardTitle>
							{t("auth.resetPassword.invalidTitle", "Invalid link")}
						</CardTitle>
						<CardDescription>
							{t("auth.resetPassword.invalidDescription", "This reset link is invalid or has expired.")}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Link to="/forgot-password">
							<Button className="w-full">
								{t("auth.resetPassword.requestNew", "Request a new link")}
							</Button>
						</Link>
					</CardContent>
				</Card>
			</div>
		);
	}

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (password !== confirm) {
			toast.error(t("auth.resetPassword.passwordsNoMatch", "Passwords do not match"));
			return;
		}
		if (password.length < 8) {
			toast.error(t("auth.resetPassword.passwordTooShort", "Password must be at least 8 characters"));
			return;
		}
		if (!turnstileToken) {
			toast.error(t("auth.resetPassword.completeVerification", "Please complete the verification"));
			return;
		}
		startTransition(async () => {
			try {
				const response = await fetch("/api/auth/reset-password", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ newPassword: password, token }),
				});
				const result = (await response.json()) as {
					error?: boolean;
					message?: string;
				};
				if (!response.ok || result.error) {
					toast.error(result.message ?? t("auth.resetPassword.failedToReset", "Failed to reset password"));
					turnstileRef.current?.reset();
					setTurnstileToken(null);
				} else {
					toast.success(t("auth.resetPassword.success", "Password updated! You can now sign in."));
					navigate({ to: "/login" });
				}
			} catch {
				toast.error(t("auth.resetPassword.unexpectedError", "An unexpected error occurred. Please try again."));
				turnstileRef.current?.reset();
				setTurnstileToken(null);
			}
		});
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-background px-4">
			<div className="w-full max-w-sm">
				<Card>
					<CardHeader>
						<CardTitle>
							{t("auth.resetPassword.title", "Set new password")}
						</CardTitle>
						<CardDescription>
							{t("auth.resetPassword.description", "Choose a strong password for your account")}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit} className="space-y-3">
							<div className="space-y-1.5">
								<Label htmlFor="password">
									{t("auth.resetPassword.newPassword", "New password")}
								</Label>
								<Input
									id="password"
									type="password"
									placeholder={t("auth.register.passwordPlaceholder", "Min. 8 characters")}
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
									minLength={8}
									autoComplete="new-password"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="confirm">
									{t("auth.resetPassword.confirmPassword", "Confirm password")}
								</Label>
								<Input
									id="confirm"
									type="password"
									placeholder={t("auth.resetPassword.repeatPassword", "Repeat password")}
									value={confirm}
									onChange={(e) => setConfirm(e.target.value)}
									required
									autoComplete="new-password"
								/>
								{confirm && password !== confirm && (
									<p className="text-destructive text-xs">
										{t("auth.resetPassword.passwordsNoMatch", "Passwords do not match")}
									</p>
								)}
							</div>
							<TurnstileWidget
								ref={turnstileRef}
								onVerify={setTurnstileToken}
								onExpire={() => setTurnstileToken(null)}
							/>
							<Button
								type="submit"
								className="w-full"
								disabled={
									isPending ||
									!turnstileToken ||
									(confirm.length > 0 && password !== confirm)
								}
							>
								{isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
								{t("auth.resetPassword.reset", "Reset password")}
							</Button>
						</form>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
