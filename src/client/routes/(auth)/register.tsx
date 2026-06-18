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

export const Route = createFileRoute("/(auth)/register")({
	component: RegisterPage,
});

type PasswordStrength = "weak" | "fair" | "strong" | "very-strong";

function getPasswordStrength(pw: string): {
	level: PasswordStrength;
	score: number;
} {
	if (pw.length === 0) return { level: "weak", score: 0 };
	let score = 0;
	if (pw.length >= 8) score++;
	if (pw.length >= 12) score++;
	if (/[A-Z]/.test(pw)) score++;
	if (/[0-9]/.test(pw)) score++;
	if (/[^A-Za-z0-9]/.test(pw)) score++;
	const level: PasswordStrength =
		score <= 1
			? "weak"
			: score <= 2
				? "fair"
				: score <= 3
					? "strong"
					: "very-strong";
	return { level, score };
}

const strengthColor: Record<PasswordStrength, string> = {
	weak: "bg-destructive",
	fair: "bg-orange-400",
	strong: "bg-yellow-400",
	"very-strong": "bg-green-500",
};

const strengthFallback: Record<string, string> = {
	weak: "Weak",
	fair: "Fair",
	strong: "Strong",
	veryStrong: "Very strong",
};

function PasswordStrengthBar({ password }: { password: string }) {
	const { t } = useTranslation();
	if (!password) return null;
	const { level, score } = getPasswordStrength(password);
	const color = strengthColor[level];
	const filled = Math.min(score, 4);
	const labelKey = level === "very-strong" ? "veryStrong" : level;

	return (
		<div className="space-y-1">
			<div className="flex gap-1">
				{[1, 2, 3, 4].map((i) => (
					<div
						key={i}
						className={`h-1 flex-1 rounded-full transition-all ${i <= filled ? color : "bg-muted"}`}
					/>
				))}
			</div>
			<p
				className={`font-medium text-xs ${filled <= 1 ? "text-destructive" : filled <= 2 ? "text-orange-500" : "text-green-600"}`}
			>
				{t(
					`auth.register.strength.${labelKey}`,
					strengthFallback[labelKey] ?? labelKey,
				)}
			</p>
		</div>
	);
}

function RegisterPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();
	const turnstileRef = useRef<TurnstileRef>(null);

	const handleRegister = (e: React.FormEvent) => {
		e.preventDefault();
		if (password.length < 8) {
			toast.error(
				t(
					"auth.register.passwordTooShort",
					"Password must be at least 8 characters",
				),
			);
			return;
		}
		if (!turnstileToken) {
			toast.error(
				t(
					"auth.register.completeVerification",
					"Please complete the verification",
				),
			);
			return;
		}
		startTransition(async () => {
			const { error } = await authClient.signUp.email({
				name,
				email,
				password,
				callbackURL: "/verify-email",
			});
			if (error) {
				toast.error(
					error.message ??
						t(
							"auth.register.passwordTooShort",
							"Password must be at least 8 characters",
						),
				);
				turnstileRef.current?.reset();
				setTurnstileToken(null);
				return;
			}
			toast.success(
				t(
					"auth.register.accountCreated",
					"Account created! Check your email to verify.",
				),
			);
			navigate({ to: "/verify-email" });
		});
	};

	const handleGoogleSignup = async () => {
		await authClient.signIn.social({
			provider: "google",
			callbackURL: "/dashboard",
		});
	};

	const handleGithubSignup = async () => {
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
						{t("auth.register.title", "Create account")}
					</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						{t("auth.register.subtitle", "Start your free trial today")}
					</p>
				</div>

				<Card>
					<CardHeader className="pb-4">
						<CardTitle className="text-base">
							{t("auth.register.cardTitle", "Sign up")}
						</CardTitle>
						<CardDescription>
							{t(
								"auth.register.cardDescription",
								"Create your account to get started",
							)}
						</CardDescription>
					</CardHeader>

					<CardContent className="space-y-4">
						<div className="grid grid-cols-2 gap-3">
							<Button
								variant="outline"
								onClick={handleGoogleSignup}
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
								{t("common.google", "Google")}
							</Button>
							<Button
								variant="outline"
								onClick={handleGithubSignup}
								className="w-full gap-2"
							>
								<Github className="size-4" />
								{t("common.github", "GitHub")}
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

						<form onSubmit={handleRegister} className="space-y-3">
							<div className="space-y-1.5">
								<Label htmlFor="name">{t("common.name", "Name")}</Label>
								<Input
									id="name"
									placeholder={t("auth.register.namePlaceholder", "Your name")}
									value={name}
									onChange={(e) => setName(e.target.value)}
									required
									autoComplete="name"
								/>
							</div>
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
								<Label htmlFor="password">
									{t("common.password", "Password")}
								</Label>
								<Input
									id="password"
									type="password"
									placeholder={t(
										"auth.register.passwordPlaceholder",
										"Min. 8 characters",
									)}
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
									autoComplete="new-password"
									minLength={8}
								/>
								<PasswordStrengthBar password={password} />
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
								{t("auth.register.createAccount", "Create account")}
							</Button>
						</form>
					</CardContent>

					<CardFooter className="justify-center pt-0">
						<p className="text-muted-foreground text-sm">
							{t(
								"auth.register.alreadyHaveAccount",
								"Already have an account?",
							)}{" "}
							<Link
								to="/login"
								className="font-medium text-foreground hover:underline"
							>
								{t("auth.register.signIn", "Sign in")}
							</Link>
						</p>
					</CardFooter>
				</Card>
			</div>
		</div>
	);
}
