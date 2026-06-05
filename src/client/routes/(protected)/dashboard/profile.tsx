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
import { Input } from "@client/components/ui/input";
import { Label } from "@client/components/ui/label";
import { Skeleton } from "@client/components/ui/skeleton";
import { authClient } from "@client/lib/auth-client";
import { trpc } from "@client/lib/trpc-client";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export const Route = createFileRoute("/(protected)/dashboard/profile")({
	component: ProfilePage,
});

function ProfilePage() {
	const { t } = useTranslation();
	const navigate = useNavigate();

	const profileQuery = trpc.user.getProfile.useQuery();
	const updateMutation = trpc.user.updateProfile.useMutation({
		onSuccess: () => {
			toast.success(t("profile.updated", "Profile updated"));
			profileQuery.refetch();
		},
		onError: (err) =>
			toast.error(
				err.message ?? t("profile.failedToUpdate", "Failed to update profile"),
			),
	});

	const deleteAccountMutation = trpc.user.deleteAccount.useMutation({
		onSuccess: () => {
			toast.success(t("settings.deleted", "Account deleted"));
			navigate({ to: "/" });
		},
		onError: (err) => {
			toast.error(
				err.message ?? t("settings.failedToDelete", "Failed to delete account"),
			);
		},
	});

	const [name, setName] = useState("");
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [isChangingPassword, setIsChangingPassword] = useState(false);

	useEffect(() => {
		if (profileQuery.data?.name) {
			setName(profileQuery.data.name);
		}
	}, [profileQuery.data]);

	const handleSave = (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) {
			toast.error(t("profile.nameEmpty", "Name cannot be empty"));
			return;
		}
		updateMutation.mutate({ name: name.trim() });
	};

	const handleChangePassword = async (e: React.FormEvent) => {
		e.preventDefault();
		if (newPassword !== confirmPassword) {
			toast.error(t("profile.passwordMismatch", "Passwords do not match"));
			return;
		}
		if (newPassword.length < 8) {
			toast.error(
				t("profile.passwordTooShort", "Password must be at least 8 characters"),
			);
			return;
		}
		setIsChangingPassword(true);
		try {
			const { error } = await authClient.changePassword({
				currentPassword,
				newPassword,
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
				setCurrentPassword("");
				setNewPassword("");
				setConfirmPassword("");
			}
		} finally {
			setIsChangingPassword(false);
		}
	};

	return (
		<div className="max-w-2xl space-y-6">
			<div>
				<h1 className="font-semibold text-2xl tracking-tight">
					{t("profile.title", "Profile")}
				</h1>
				<p className="text-muted-foreground text-sm">
					{t("profile.subtitle", "Manage your personal information")}
				</p>
			</div>

			{/* Personal information */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">
						{t("profile.cardTitle", "Personal information")}
					</CardTitle>
					<CardDescription>
						{t(
							"profile.cardDescription",
							"Update your name and account details",
						)}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{profileQuery.isLoading ? (
						<div className="space-y-3">
							<Skeleton className="h-9 w-full" />
							<Skeleton className="h-9 w-full" />
							<Skeleton className="h-9 w-24" />
						</div>
					) : (
						<form onSubmit={handleSave} className="space-y-4">
							<div className="space-y-1.5">
								<Label htmlFor="name">
									{t("profile.fullName", "Full name")}
								</Label>
								<Input
									id="name"
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder={t("profile.namePlaceholder", "Your name")}
									required
								/>
							</div>
							<div className="space-y-1.5">
								<div className="flex items-center justify-between">
									<Label htmlFor="email">
										{t("profile.emailAddress", "Email address")}
									</Label>
									{profileQuery.data?.emailVerified ? (
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
								<Input
									id="email"
									value={profileQuery.data?.email ?? ""}
									disabled
									className="bg-muted"
								/>
								<p className="text-muted-foreground text-xs">
									{t(
										"profile.emailNote",
										"Email changes require verification. Contact support to update.",
									)}
								</p>
							</div>
							<Button
								type="submit"
								disabled={updateMutation.isPending || !name.trim()}
							>
								{updateMutation.isPending && (
									<Loader2 className="mr-2 size-4 animate-spin" />
								)}
								{t("profile.save", "Save changes")}
							</Button>
						</form>
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
						{t(
							"profile.changePasswordDesc",
							"Update your password to keep your account secure",
						)}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleChangePassword} className="space-y-4">
						<div className="space-y-1.5">
							<Label htmlFor="current-password">
								{t("profile.currentPassword", "Current password")}
							</Label>
							<Input
								id="current-password"
								type="password"
								value={currentPassword}
								onChange={(e) => setCurrentPassword(e.target.value)}
								placeholder="••••••••"
								required
								autoComplete="current-password"
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="new-password">
								{t("profile.newPassword", "New password")}
							</Label>
							<Input
								id="new-password"
								type="password"
								value={newPassword}
								onChange={(e) => setNewPassword(e.target.value)}
								placeholder="••••••••"
								required
								autoComplete="new-password"
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="confirm-password">
								{t("profile.confirmPassword", "Confirm new password")}
							</Label>
							<Input
								id="confirm-password"
								type="password"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								placeholder="••••••••"
								required
								autoComplete="new-password"
							/>
						</div>
						<Button
							type="submit"
							disabled={
								isChangingPassword ||
								!currentPassword ||
								!newPassword ||
								!confirmPassword
							}
						>
							{isChangingPassword && (
								<Loader2 className="mr-2 size-4 animate-spin" />
							)}
							{t("profile.updatePassword", "Update password")}
						</Button>
					</form>
				</CardContent>
			</Card>

			{/* Danger zone */}
			<Card className="border-destructive/40">
				<CardHeader>
					<CardTitle className="text-base text-destructive">
						{t("settings.dangerZone", "Danger zone")}
					</CardTitle>
					<CardDescription>
						{t(
							"settings.dangerZoneDesc",
							"Irreversible actions — proceed with caution",
						)}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex items-center justify-between">
						<div>
							<p className="font-medium text-sm">
								{t("settings.deleteAccount", "Delete account")}
							</p>
							<p className="text-muted-foreground text-xs">
								{t(
									"settings.deleteAccountDesc",
									"Permanently delete your account and all data",
								)}
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
