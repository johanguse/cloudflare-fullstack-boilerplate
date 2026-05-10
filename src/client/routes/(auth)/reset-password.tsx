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
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState } from "react";
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
	const { token, error: searchError } = Route.useSearch();
	const navigate = useNavigate();
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	if (searchError ?? !token) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background px-4">
				<Card className="w-full max-w-sm">
					<CardHeader>
						<CardTitle>Invalid link</CardTitle>
						<CardDescription>
							This reset link is invalid or has expired.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Link to="/forgot-password">
							<Button className="w-full">Request a new link</Button>
						</Link>
					</CardContent>
				</Card>
			</div>
		);
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (password !== confirm) {
			toast.error("Passwords do not match");
			return;
		}
		if (password.length < 8) {
			toast.error("Password must be at least 8 characters");
			return;
		}
		setIsLoading(true);
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
				toast.error(result.message ?? "Failed to reset password");
			} else {
				toast.success("Password updated! You can now sign in.");
				navigate({ to: "/login" });
			}
		} catch {
			toast.error("An unexpected error occurred. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-background px-4">
			<div className="w-full max-w-sm">
				<Card>
					<CardHeader>
						<CardTitle>Set new password</CardTitle>
						<CardDescription>
							Choose a strong password for your account
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit} className="space-y-3">
							<div className="space-y-1.5">
								<Label htmlFor="password">New password</Label>
								<Input
									id="password"
									type="password"
									placeholder="Min. 8 characters"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
									minLength={8}
									autoComplete="new-password"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="confirm">Confirm password</Label>
								<Input
									id="confirm"
									type="password"
									placeholder="Repeat password"
									value={confirm}
									onChange={(e) => setConfirm(e.target.value)}
									required
									autoComplete="new-password"
								/>
								{confirm && password !== confirm && (
									<p className="text-destructive text-xs">
										Passwords do not match
									</p>
								)}
							</div>
							<Button
								type="submit"
								className="w-full"
								disabled={
									isLoading || (confirm.length > 0 && password !== confirm)
								}
							>
								{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
								Reset password
							</Button>
						</form>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
