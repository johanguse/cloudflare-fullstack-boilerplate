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
import { Button } from "@client/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@client/components/ui/card";
import { ContentSection } from "@client/components/ui/content-section";
import { trpc } from "@client/lib/trpc-client";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export const Route = createFileRoute("/(protected)/dashboard/settings/")({
	component: SettingsPage,
});

function SettingsPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();

	const deleteAccountMutation = trpc.user.deleteAccount.useMutation({
		onSuccess: () => {
			toast.success(t("settings.deleted", "Account deleted"));
			navigate({ to: "/" });
		},
		onError: (err) => {
			toast.error(err.message ?? t("settings.failedToDelete", "Failed to delete account"));
		},
	});

	return (
		<ContentSection
			title={t("settings.general.title", "General")}
			desc={t("settings.general.desc", "Manage your account settings and preferences.")}
		>
			{/* Danger Zone */}
			<Card className="border-destructive/40">
				<CardHeader>
					<CardTitle className="text-base text-destructive">
						{t("settings.dangerZone", "Danger zone")}
					</CardTitle>
					<CardDescription>
						{t("settings.dangerZoneDesc", "Irreversible actions — proceed with caution")}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex items-center justify-between">
						<div>
							<p className="font-medium text-sm">
								{t("settings.deleteAccount", "Delete account")}
							</p>
							<p className="text-muted-foreground text-xs">
								{t("settings.deleteAccountDesc", "Permanently delete your account and all data")}
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
										<Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
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
		</ContentSection>
	);
}
