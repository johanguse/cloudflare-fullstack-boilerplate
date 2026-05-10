import { DashboardLayout } from "@client/components/layout/DashboardLayout";
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
import { trpc } from "@client/lib/trpc-client";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Building2, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/(protected)/dashboard/settings")({
	component: SettingsPage,
});

function SettingsPage() {
	const navigate = useNavigate();

	const deleteAccountMutation = trpc.user.deleteAccount.useMutation({
		onSuccess: () => {
			toast.success("Account deleted");
			navigate({ to: "/" });
		},
		onError: (err) => {
			toast.error(err.message ?? "Failed to delete account");
		},
	});

	return (
		<DashboardLayout>
			<div className="max-w-2xl space-y-6">
				<div>
					<h1 className="font-semibold text-2xl tracking-tight">Settings</h1>
					<p className="text-muted-foreground text-sm">
						Manage your account settings
					</p>
				</div>

				<div className="grid gap-3 sm:grid-cols-2">
					<Card className="transition-colors hover:bg-muted/40">
						<Link
							to="/dashboard/settings/company"
							className="flex items-center justify-between p-4"
						>
							<div className="flex items-center gap-3">
								<Building2 className="h-5 w-5 text-muted-foreground" />
								<div>
									<p className="font-medium text-sm">Company & fiscal</p>
									<p className="text-muted-foreground text-xs">
										CNPJ, CNAE, NFSe defaults
									</p>
								</div>
							</div>
							<ChevronRight className="h-4 w-4 text-muted-foreground" />
						</Link>
					</Card>
					<Card className="transition-colors hover:bg-muted/40">
						<Link
							to="/dashboard/settings/notifications"
							className="flex items-center justify-between p-4"
						>
							<div>
								<p className="font-medium text-sm">Notifications</p>
								<p className="text-muted-foreground text-xs">
									Email preferences for billing and NFSe
								</p>
							</div>
							<ChevronRight className="h-4 w-4 text-muted-foreground" />
						</Link>
					</Card>
				</div>

				{/* Danger Zone */}
				<Card className="border-destructive/40">
					<CardHeader>
						<CardTitle className="text-base text-destructive">
							Danger zone
						</CardTitle>
						<CardDescription>
							Irreversible actions that affect your account permanently
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex items-center justify-between">
							<div>
								<p className="font-medium text-sm">Delete account</p>
								<p className="text-muted-foreground text-xs">
									Permanently delete your account and all data
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
										Delete account
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>
											Are you absolutely sure?
										</AlertDialogTitle>
										<AlertDialogDescription>
											This will permanently delete your account and all
											associated data. This action cannot be undone.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>Cancel</AlertDialogCancel>
										<AlertDialogAction
											onClick={() => deleteAccountMutation.mutate()}
											className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
										>
											Delete account
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						</div>
					</CardContent>
				</Card>
			</div>
		</DashboardLayout>
	);
}
