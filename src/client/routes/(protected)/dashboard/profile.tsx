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
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@client/components/ui/avatar";
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
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@client/components/ui/form";
import { Input } from "@client/components/ui/input";
import { Separator } from "@client/components/ui/separator";
import { Skeleton } from "@client/components/ui/skeleton";
import { authClient } from "@client/lib/auth-client";
import { trpc } from "@client/lib/trpc-client";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/(protected)/dashboard/profile")({
	component: ProfilePage,
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

function ProfilePage() {
	const { t } = useTranslation();
	const navigate = useNavigate();

	const profileQuery = trpc.user.getProfile.useQuery();
	const updateMutation = trpc.user.updateProfile.useMutation({
		onSuccess: () => {
			toast.success(t("profile.updated", "Profile updated"));
			profileQuery.refetch();
		},
		onError: (err) => toast.error(err.message),
	});
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

	const [isChangingPassword, setIsChangingPassword] = useState(false);

	useEffect(() => {
		if (profileQuery.data?.name) {
			profileForm.reset({ name: profileQuery.data.name });
		}
	}, [profileQuery.data, profileForm]);

	const user = profileQuery.data;
	const initials = user?.name
		? user.name
				.split(" ")
				.map((n) => n[0])
				.join("")
				.toUpperCase()
				.slice(0, 2)
		: user?.email?.[0]?.toUpperCase() ?? "?";

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
				toast.success(t("profile.passwordChanged", "Password changed"));
				passwordForm.reset();
			}
		} finally {
			setIsChangingPassword(false);
		}
	};

	return (
		<div className="mx-auto w-full max-w-2xl space-y-6">
			<div>
				<h1 className="font-semibold text-2xl tracking-tight">
					{t("profile.title", "Profile")}
				</h1>
				<p className="text-muted-foreground text-sm">
					{t("profile.subtitle", "Manage your personal information and security.")}
				</p>
			</div>
			<Separator />

			{/* Avatar + info */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">
						{t("profile.cardTitle", "Personal information")}
					</CardTitle>
					<CardDescription>
						{t("profile.cardDescription", "Update your display name and review account details.")}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Avatar row */}
					<div className="flex items-center gap-4">
						{profileQuery.isPending ? (
							<Skeleton className="size-16 rounded-full" />
						) : (
							<Avatar size="lg" className="size-16 text-lg">
								{user?.image && (
									<AvatarImage src={user.image} alt={user.name ?? ""} />
								)}
								<AvatarFallback>{initials}</AvatarFallback>
							</Avatar>
						)}
						<div className="min-w-0">
							{profileQuery.isPending ? (
								<>
									<Skeleton className="mb-1 h-5 w-32" />
									<Skeleton className="h-4 w-44" />
								</>
							) : (
								<>
									<p className="truncate font-semibold">{user?.name ?? "—"}</p>
									<p className="truncate text-muted-foreground text-sm">
										{user?.email ?? "—"}
									</p>
								</>
							)}
						</div>
					</div>

					{profileQuery.isPending ? (
						<div className="space-y-3">
							<Skeleton className="h-9 w-full" />
							<Skeleton className="h-9 w-full" />
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
											<FormLabel>{t("profile.fullName", "Full name")}</FormLabel>
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
									<div className="flex items-center justify-between">
										<FormLabel>{t("profile.emailAddress", "Email address")}</FormLabel>
										{user?.emailVerified ? (
											<Badge
												variant="secondary"
												className="gap-1 text-green-700 text-xs dark:text-green-400"
											>
												<CheckCircle2 className="size-3" />
												{t("profile.verified", "Verified")}
											</Badge>
										) : (
											<Badge variant="destructive" className="gap-1 text-xs">
												<XCircle className="size-3" />
												{t("profile.notVerified", "Not verified")}
											</Badge>
										)}
									</div>
									<Input value={user?.email ?? ""} disabled className="bg-muted" />
									<p className="text-muted-foreground text-xs">
										{t("profile.emailNote", "Contact support to update your email.")}
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
									{t("profile.save", "Save changes")}
								</Button>
							</form>
						</Form>
					)}
				</CardContent>
			</Card>

			{/* Change password */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">
						{t("profile.changePassword", "Change password")}
					</CardTitle>
					<CardDescription>
						{t("profile.changePasswordDesc", "Keep your account secure with a strong password.")}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Form {...passwordForm}>
						<form
							onSubmit={passwordForm.handleSubmit(handleChangePassword)}
							className="space-y-4"
						>
							<FormField
								control={passwordForm.control}
								name="currentPassword"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("profile.currentPassword", "Current password")}</FormLabel>
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
										<FormLabel>{t("profile.newPassword", "New password")}</FormLabel>
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
							<FormField
								control={passwordForm.control}
								name="confirmPassword"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("profile.confirmPassword", "Confirm new password")}</FormLabel>
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
							<Button
								type="submit"
								disabled={isChangingPassword || !passwordForm.formState.isDirty}
							>
								{isChangingPassword && (
									<Loader2 className="mr-2 size-4 animate-spin" />
								)}
								{t("profile.updatePassword", "Update password")}
							</Button>
						</form>
					</Form>
				</CardContent>
			</Card>

			{/* Danger zone */}
			<Card className="border-destructive/40">
				<CardHeader>
					<CardTitle className="text-base text-destructive">
						{t("settings.dangerZone", "Danger zone")}
					</CardTitle>
					<CardDescription>
						{t("settings.dangerZoneDesc", "Irreversible actions — proceed with caution.")}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex items-center justify-between">
						<div>
							<p className="font-medium text-sm">
								{t("settings.deleteAccount", "Delete account")}
							</p>
							<p className="text-muted-foreground text-xs">
								{t("settings.deleteAccountDesc", "Permanently delete your account and all data.")}
							</p>
						</div>
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button
									variant="destructive"
									size="sm"
									disabled={deleteAccountMutation.isPending}
								>
									{deleteAccountMutation.isPending && (
										<Loader2 className="mr-2 size-3.5 animate-spin" />
									)}
									{t("settings.deleteAccount", "Delete account")}
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>
										{t("settings.deleteAccountConfirmTitle", "Are you absolutely sure?")}
									</AlertDialogTitle>
									<AlertDialogDescription>
										{t(
											"settings.deleteAccountConfirmDesc",
											"This action cannot be undone. Your account and all associated data will be permanently deleted.",
										)}
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>{t("settings.cancel", "Cancel")}</AlertDialogCancel>
									<AlertDialogAction
										onClick={() => deleteAccountMutation.mutate()}
										className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
									>
										{t("settings.deleteAccount", "Delete account")}
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
