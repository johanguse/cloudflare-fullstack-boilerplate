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
import { authClient } from "@client/lib/auth-client";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

const verifySearchSchema = z.object({
	email: z.string().optional(),
});

export const Route = createFileRoute("/(auth)/verify-email")({
	validateSearch: verifySearchSchema,
	component: VerifyEmailPage,
});

function VerifyEmailPage() {
	const { email: emailParam } = Route.useSearch();
	const navigate = useNavigate();
	const [email, setEmail] = useState(emailParam ?? "");
	const [otp, setOtp] = useState("");
	const [isSending, setIsSending] = useState(false);
	const [isVerifying, setIsVerifying] = useState(false);
	const [otpSent, setOtpSent] = useState(false);

	const handleSendOtp = async () => {
		if (!email) {
			toast.error("Please enter your email");
			return;
		}
		setIsSending(true);
		const { error } = await authClient.emailOtp.sendVerificationOtp({
			email,
			type: "email-verification",
		});
		setIsSending(false);
		if (error) {
			toast.error(error.message ?? "Failed to send code");
			return;
		}
		setOtpSent(true);
		toast.success("Verification code sent to your email");
	};

	const handleVerify = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsVerifying(true);
		const { error } = await authClient.emailOtp.verifyEmail({ email, otp });
		setIsVerifying(false);
		if (error) {
			toast.error(error.message ?? "Invalid code");
			return;
		}
		toast.success("Email verified! Redirecting...");
		navigate({ to: "/dashboard" });
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-background px-4">
			<div className="w-full max-w-sm">
				<Card>
					<CardHeader className="text-center">
						<div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
							<Mail className="h-6 w-6 text-primary" />
						</div>
						<CardTitle>Verify your email</CardTitle>
						<CardDescription>
							{otpSent
								? "Enter the 6-digit code we sent to your email"
								: "We'll send a verification code to your email"}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{!otpSent ? (
							<>
								<div className="space-y-1.5">
									<Label htmlFor="email">Email address</Label>
									<Input
										id="email"
										type="email"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										placeholder="you@example.com"
									/>
								</div>
								<Button
									onClick={handleSendOtp}
									className="w-full"
									disabled={isSending}
								>
									{isSending && (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									)}
									Send verification code
								</Button>
							</>
						) : (
							<form onSubmit={handleVerify} className="space-y-4">
								<div className="space-y-1.5">
									<Label htmlFor="otp">Verification code</Label>
									<Input
										id="otp"
										value={otp}
										onChange={(e) => setOtp(e.target.value)}
										placeholder="123456"
										maxLength={6}
										autoComplete="one-time-code"
										className="text-center text-xl tracking-widest"
									/>
								</div>
								<Button
									type="submit"
									className="w-full"
									disabled={isVerifying || otp.length < 6}
								>
									{isVerifying && (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									)}
									Verify email
								</Button>
								<Button
									type="button"
									variant="ghost"
									className="w-full text-sm"
									onClick={() => {
										setOtpSent(false);
										setOtp("");
									}}
								>
									Use different email
								</Button>
							</form>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
