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
import { authClient } from "@client/lib/auth-client";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Github, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/(auth)/login")({
	component: LoginPage,
});

function LoginPage() {
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const handleEmailLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		const { error } = await authClient.signIn.email({
			email,
			password,
			callbackURL: "/dashboard",
		});
		setIsLoading(false);
		if (error) {
			toast.error(error.message ?? "Sign in failed");
			return;
		}
		navigate({ to: "/dashboard" });
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
					<h1 className="font-bold text-2xl text-foreground tracking-tight">
						Welcome back
					</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						Sign in to your account
					</p>
				</div>

				<Card>
					<CardHeader className="pb-4">
						<CardTitle className="text-base">Sign in</CardTitle>
						<CardDescription>Enter your credentials below</CardDescription>
					</CardHeader>

					<CardContent className="space-y-4">
						{/* OAuth Buttons */}
						<div className="grid grid-cols-2 gap-3">
							<Button
								variant="outline"
								onClick={handleGoogleLogin}
								className="w-full gap-2"
							>
								<svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
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
								<Github className="h-4 w-4" />
								GitHub
							</Button>
						</div>

						<div className="relative">
							<div className="absolute inset-0 flex items-center">
								<Separator />
							</div>
							<div className="relative flex justify-center text-xs uppercase">
								<span className="bg-card px-2 text-muted-foreground">or</span>
							</div>
						</div>

						{/* Email/Password Form */}
						<form onSubmit={handleEmailLogin} className="space-y-3">
							<div className="space-y-1.5">
								<Label htmlFor="email">Email</Label>
								<Input
									id="email"
									type="email"
									placeholder="you@example.com"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
									autoComplete="email"
								/>
							</div>
							<div className="space-y-1.5">
								<div className="flex items-center justify-between">
									<Label htmlFor="password">Password</Label>
									<Link
										to="/forgot-password"
										className="text-muted-foreground text-xs hover:text-foreground"
									>
										Forgot password?
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
							<Button type="submit" className="w-full" disabled={isLoading}>
								{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
								Sign in
							</Button>
						</form>
					</CardContent>

					<CardFooter className="justify-center pt-0">
						<p className="text-muted-foreground text-sm">
							Don&apos;t have an account?{" "}
							<Link
								to="/register"
								className="font-medium text-foreground hover:underline"
							>
								Sign up
							</Link>
						</p>
					</CardFooter>
				</Card>
			</div>
		</div>
	);
}
