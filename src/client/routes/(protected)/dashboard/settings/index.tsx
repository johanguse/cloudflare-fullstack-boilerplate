import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@client/components/ui/alert-dialog";
import { Badge } from "@client/components/ui/badge";
import { Button } from "@client/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@client/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@client/components/ui/dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@client/components/ui/form";
import { Input } from "@client/components/ui/input";
import { Skeleton } from "@client/components/ui/skeleton";
import { authClient } from "@client/lib/auth-client";
import { trpc } from "@client/lib/trpc-client";
import { cn } from "@client/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ExternalLink, KeyRound, Loader2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/(protected)/dashboard/settings/")({
	component: SettingsPage,
});

const profileSchema = z.object({
	name: z.string().min(2, "Name must be at least 2 characters").max(100),
});
type ProfileForm = z.infer<typeof profileSchema>;

const passwordSchema = z
	.object({
		currentPassword: z.string().min(1, "Current password is required"),
		newPassword: z.string().min(8, "Password must be at least 8 characters"),
		confirmPassword: z.string(),
	})
	.refine((d) => d.newPassword === d.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	});
type PasswordForm = z.infer<typeof passwordSchema>;

function getPasswordStrength(password: string) {
	if (!password) return { score: 0, label: "", color: "" };
	const score = [
		password.length >= 8,
		password.length >= 12,
		/[A-Z]/.test(password),
		/[0-9]/.test(password),
		/[^A-Za-z0-9]/.test(password),
	].filter(Boolean).length;
	if (score <= 2) return { score, label: "Weak", color: "bg-destructive" };
	if (score <= 3) return { score, label: "Medium", color: "bg-yellow-500" };
	return { score, label: "Strong", color: "bg-green-500" };
}

function SettingsSection({
	title,
	description,
	children,
}: {
	title: string;
	description: string;
	children: React.ReactNode;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent>{children}</CardContent>
		</Card>
	);
}

function SettingsPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [passwordOpen, setPasswordOpen] = useState(false);
	const [isChangingPassword, setIsChangingPassword] = useState(false);

	const utils = trpc.useUtils();
	const { refetch: refetchSession } = authClient.useSession();
	const profileQuery = trpc.user.getProfile.useQuery();
	const updateMutation = trpc.user.updateProfile.useMutation({
		onSuccess: () => {
			toast.success(t("profile.updated", "Profile updated"));
			utils.user.getProfile.invalidate();
			// Better Auth holds the session (and the name shown in the dashboard
			// greeting) separately from tRPC — refetch it so the change is live.
			refetchSession();
		},
		onError: (err) => toast.error(err.message),
	});
	const subQuery = trpc.billing.getSubscription.useQuery();
	const deleteAccountMutation = trpc.user.deleteAccount.useMutation({
		onSuccess: () => {
			toast.success(t("settings.deleted", "Account deleted"));
			navigate({ to: "/" });
		},
		onError: (err) => toast.error(err.message),
	});

	const profileForm = useForm<ProfileForm>({
		resolver: zodResolver(profileSchema),
		defaultValues: { name: "" },
	});

	const passwordForm = useForm<PasswordForm>({
		resolver: zodResolver(passwordSchema),
		defaultValues: {
			currentPassword: "",
			newPassword: "",
			confirmPassword: "",
		},
	});

	useEffect(() => {
		if (profileQuery.data?.name) {
			profileForm.reset({ name: profileQuery.data.name });
		}
	}, [profileQuery.data, profileForm]);

	const newPassword = passwordForm.watch("newPassword");
	const strength = getPasswordStrength(newPassword);

	const handleChangePassword = async (data: PasswordForm) => {
		setIsChangingPassword(true);
		try {
			const { error } = await authClient.changePassword({
				currentPassword: data.currentPassword,
				newPassword: data.newPassword,
				revokeOtherSessions: false,
			});
			if (error) {
				toast.error(
					error.message ??
						t("profile.passwordChangeFailed", "Failed to change password"),
				);
			} else {
				toast.success(
					t("profile.passwordChanged", "Password changed successfully"),
				);
				passwordForm.reset();
				setPasswordOpen(false);
			}
		} finally {
			setIsChangingPassword(false);
		}
	};

	const sub = subQuery.data;

	return (
		<div className="w-full space-y-6">
			{/* Profile */}
			<SettingsSection
				title={t("settings.profile.title", "Profile")}
				description={t(
					"settings.profile.desc",
					"Update your personal details used across your workspace.",
				)}
			>
				{profileQuery.isPending ? (
					<div className="space-y-4">
						<Skeleton className="h-9 w-full" />
						<Skeleton className="h-9 w-full" />
						<Skeleton className="h-9 w-28" />
					</div>
				) : (
					<Form {...profileForm}>
						<form
							onSubmit={profileForm.handleSubmit((d) =>
								updateMutation.mutate({ name: d.name }),
							)}
							className="space-y-4"
						>
							<FormField
								control={profileForm.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("profile.fullName", "Name")}</FormLabel>
										<FormControl>
											<Input
												placeholder={t("profile.namePlaceholder", "Your name")}
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<div className="space-y-1.5">
								<FormLabel className="text-sm">
									{t("profile.emailAddress", "Email Address")}
								</FormLabel>
								<Input
									value={profileQuery.data?.email ?? ""}
									disabled
									className="bg-muted"
								/>
								<p className="text-muted-foreground text-xs">
									{t(
										"profile.emailNote",
										"Used for login and account notifications.",
									)}
								</p>
							</div>
							<Button
								type="submit"
								disabled={
									updateMutation.isPending || !profileForm.formState.isDirty
								}
							>
								{updateMutation.isPending && (
									<Loader2 className="mr-2 size-4 animate-spin" />
								)}
								{t("profile.save", "Save profile")}
							</Button>
						</form>
					</Form>
				)}
			</SettingsSection>

			{/* Usage & plan */}
			<SettingsSection
				title={t("settings.plan.title", "Usage & plan")}
				description={t(
					"settings.plan.desc",
					"Track your usage and manage your subscription.",
				)}
			>
				{subQuery.isPending ? (
					<div className="space-y-3">
						<Skeleton className="h-20 w-full" />
						<Skeleton className="h-9 w-48" />
					</div>
				) : (
					<div className="space-y-4">
						<div className="rounded-lg border p-4">
							<div className="flex items-center justify-between">
								<span className="text-muted-foreground text-sm">
									{t("billing.currentPlan", "Current plan")}
								</span>
								<Badge
									variant={sub?.status === "active" ? "default" : "secondary"}
									className="capitalize"
								>
									{sub?.plan ?? "Free"}
								</Badge>
							</div>
							{sub?.creditBalance !== undefined && (
								<div className="mt-2 flex items-center justify-between border-t pt-2 text-sm">
									<span className="text-muted-foreground">
										{t("billing.credits", "Credits")}
									</span>
									<span className="font-medium">
										{sub.creditBalance}{" "}
										<span className="font-normal text-muted-foreground">
											{t("billing.remaining", "remaining")}
										</span>
									</span>
								</div>
							)}
							{sub?.currentPeriodEnd && (
								<div className="mt-2 flex items-center justify-between text-sm">
									<span className="text-muted-foreground">
										{t("billing.renewsOn", "Renews on")}
									</span>
									<span className="font-medium">
										{new Date(sub.currentPeriodEnd).toLocaleDateString()}
									</span>
								</div>
							)}
						</div>
						<div className="flex flex-wrap gap-2">
							<Button
								size="sm"
								onClick={() => navigate({ to: "/dashboard/billing/upgrade" })}
							>
								{t("billing.upgradePlan", "Upgrade plan")}
							</Button>
							<Button variant="outline" size="sm" asChild>
								<Link to="/dashboard/billing">
									<ExternalLink className="mr-1.5 size-3.5" />
									{t("settings.viewBilling", "View billing")}
								</Link>
							</Button>
						</div>
					</div>
				)}
			</SettingsSection>

			{/* Account security */}
			<SettingsSection
				title={t("settings.security.title", "Account security")}
				description={t(
					"settings.security.desc",
					"Manage your password and account access.",
				)}
			>
				<div className="space-y-1">
					{/* Change password */}
					<Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
						<DialogTrigger asChild>
							<button
								type="button"
								className="flex w-full items-start gap-3 rounded-md px-3 py-3 text-left transition-colors hover:bg-muted"
							>
								<KeyRound className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
								<div>
									<p className="font-medium text-sm">
										{t("profile.changePassword", "Change password")}
									</p>
									<p className="text-muted-foreground text-xs">
										{t(
											"profile.changePasswordDesc",
											"Update your password to keep your account secure.",
										)}
									</p>
								</div>
							</button>
						</DialogTrigger>
						<DialogContent className="sm:max-w-md">
							<DialogHeader>
								<DialogTitle>
									{t("profile.changePassword", "Change password")}
								</DialogTitle>
								<DialogDescription>
									{t(
										"profile.changePasswordDesc",
										"Update your password to keep your account secure.",
									)}
								</DialogDescription>
							</DialogHeader>
							<Form {...passwordForm}>
								<form
									id="change-password-form"
									onSubmit={passwordForm.handleSubmit(handleChangePassword)}
									className="space-y-4"
								>
									<FormField
										control={passwordForm.control}
										name="currentPassword"
										render={({ field }) => (
											<FormItem>
												<FormLabel>
													{t("profile.currentPassword", "Current password")}
												</FormLabel>
												<FormControl>
													<Input
														type="password"
														placeholder="••••••••"
														autoComplete="current-password"
														{...field}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={passwordForm.control}
										name="newPassword"
										render={({ field }) => (
											<FormItem>
												<FormLabel>
													{t("profile.newPassword", "New password")}
												</FormLabel>
												<FormControl>
													<Input
														type="password"
														placeholder="••••••••"
														autoComplete="new-password"
														{...field}
													/>
												</FormControl>
												{newPassword && (
													<div className="space-y-1">
														<div className="flex gap-1">
															{[1, 2, 3, 4, 5].map((i) => (
																<div
																	key={i}
																	className={cn(
																		"h-1.5 flex-1 rounded-full transition-colors",
																		i <= strength.score
																			? strength.color
																			: "bg-muted",
																	)}
																/>
															))}
														</div>
														<p
															className={cn(
																"text-xs",
																strength.score <= 2
																	? "text-destructive"
																	: strength.score <= 3
																		? "text-yellow-600 dark:text-yellow-400"
																		: "text-green-600 dark:text-green-400",
															)}
														>
															{strength.label}
														</p>
													</div>
												)}
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={passwordForm.control}
										name="confirmPassword"
										render={({ field }) => (
											<FormItem>
												<FormLabel>
													{t("profile.confirmPassword", "Confirm new password")}
												</FormLabel>
												<FormControl>
													<Input
														type="password"
														placeholder="••••••••"
														autoComplete="new-password"
														{...field}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</form>
							</Form>
							<DialogFooter>
								<Button
									type="submit"
									form="change-password-form"
									disabled={isChangingPassword}
								>
									{isChangingPassword && (
										<Loader2 className="mr-2 size-4 animate-spin" />
									)}
									{t("profile.updatePassword", "Update password")}
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>

					{/* Delete account */}
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<button
								type="button"
								className="flex w-full items-start gap-3 rounded-md px-3 py-3 text-left transition-colors hover:bg-muted"
							>
								<Trash2 className="mt-0.5 size-4 shrink-0 text-destructive" />
								<div>
									<p className="font-medium text-destructive text-sm">
										{t("settings.deleteAccount", "Delete account")}
									</p>
									<p className="text-muted-foreground text-xs">
										{t(
											"settings.deleteAccountDesc2",
											"Permanently delete your account and all saved content.",
										)}
									</p>
								</div>
							</button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>
									{t(
										"settings.deleteAccountConfirmTitle",
										"Are you absolutely sure?",
									)}
								</AlertDialogTitle>
								<AlertDialogDescription>
									{t(
										"settings.deleteAccountConfirmDesc",
										"This action cannot be undone. Your account and all associated data will be permanently deleted.",
									)}
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>
									{t("settings.cancel", "Cancel")}
								</AlertDialogCancel>
								<AlertDialogAction
									onClick={() => deleteAccountMutation.mutate()}
									className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
								>
									{deleteAccountMutation.isPending && (
										<Loader2 className="mr-2 size-3.5 animate-spin" />
									)}
									{t("settings.deleteAccount", "Delete account")}
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			</SettingsSection>
		</div>
	);
}
