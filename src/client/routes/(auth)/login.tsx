import { Button } from "@client/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@client/components/ui/card";
import { Input } from "@client/components/ui/input";
import { Label } from "@client/components/ui/label";
import { Separator } from "@client/components/ui/separator";
import {
	type TurnstileRef,
	TurnstileWidget,
} from "@client/components/ui/turnstile";
import { authClient } from "@client/lib/auth-client";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Github, Loader2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export const Route = createFileRoute("/(auth)/login")({
	component: LoginPage,
});

function LoginPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();
	const turnstileRef = useRef<TurnstileRef>(null);

	const handleEmailLogin = (e: React.FormEvent) => {
		e.preventDefault();
		if (!turnstileToken) {
			toast.error(
				t(
					"auth.login.completeVerification",
					"Please complete the verification",
				),
			);
			return;
		}
		startTransition(async () => {
			const { error } = await authClient.signIn.email({
				email,
				password,
				callbackURL: "/dashboard",
			});
			if (error) {
				toast.error(
					error.message ?? t("auth.login.signInFailed", "Sign in failed"),
				);
				turnstileRef.current?.reset();
				setTurnstileToken(null);
				return;
			}
			navigate({ to: "/dashboard" });
		});
	};

	const handleGoogleLogin = async () => {
		await authClient.signIn.social({
			provider: "google",
			callbackURL: "/dashboard",
		});
	};

	const handleGithubLogin = async () => {
		await authClient.signIn.social({
			provider: "github",
			callbackURL: "/dashboard",
		});
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-background px-4">
			<div className="w-full max-w-sm">
				<div className="mb-8 text-center">
					<h1 className="font-semibold text-2xl text-foreground tracking-tight">
						{t("auth.login.title", "Welcome back")}
					</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						{t("auth.login.subtitle", "Sign in to your account")}
					</p>
				</div>

				<Card>
					<CardHeader className="pb-4">
						<CardTitle className="text-base">
							{t("auth.login.cardTitle", "Sign in")}
						</CardTitle>
						<CardDescription>
							{t("auth.login.cardDescription", "Enter your credentials below")}
						</CardDescription>
					</CardHeader>

					<CardContent className="space-y-4">
						{/* OAuth Buttons */}
						<div className="grid grid-cols-2 gap-3">
							<Button
								variant="outline"
								onClick={handleGoogleLogin}
								className="w-full gap-2"
							>
								<svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
									<path
										fill="currentColor"
										d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
									/>
									<path
										fill="currentColor"
										d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
									/>
									<path
										fill="currentColor"
										d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
									/>
									<path
										fill="currentColor"
										d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
									/>
								</svg>
								Google
							</Button>
							<Button
								variant="outline"
								onClick={handleGithubLogin}
								className="w-full gap-2"
							>
								<Github className="size-4" />
								GitHub
							</Button>
						</div>

						<div className="relative">
							<div className="absolute inset-0 flex items-center">
								<Separator />
							</div>
							<div className="relative flex justify-center text-xs uppercase">
								<span className="bg-card px-2 text-muted-foreground">
									{t("common.or", "or")}
								</span>
							</div>
						</div>

						{/* Email/Password Form */}
						<form onSubmit={handleEmailLogin} className="space-y-3">
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
							<div className="space-y-1.5">
								<div className="flex items-center justify-between">
									<Label htmlFor="password">
										{t("common.password", "Password")}
									</Label>
									<Link
										to="/forgot-password"
										className="text-muted-foreground text-xs hover:text-foreground"
									>
										{t("common.forgotPassword", "Forgot password?")}
									</Link>
								</div>
								<Input
									id="password"
									type="password"
									placeholder="••••••••"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
									autoComplete="current-password"
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
								disabled={isPending || !turnstileToken}
							>
								{isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
								{t("auth.login.cardTitle", "Sign in")}
							</Button>
						</form>
					</CardContent>

					<CardFooter className="justify-center pt-0">
						<p className="text-muted-foreground text-sm">
							{t("auth.login.noAccount", "Don't have an account?")}{" "}
							<Link
								to="/register"
								className="font-medium text-foreground hover:underline"
							>
								{t("auth.login.signUp", "Sign up")}
							</Link>
						</p>
					</CardFooter>
				</Card>
			</div>
		</div>
	);
}
