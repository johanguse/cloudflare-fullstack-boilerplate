import { DashboardLayout } from "@client/components/layout/DashboardLayout";
import { Button } from "@client/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@client/components/ui/card";
import { Label } from "@client/components/ui/label";
import { Skeleton } from "@client/components/ui/skeleton";
import { Switch } from "@client/components/ui/switch";
import { trpc } from "@client/lib/trpc-client";
import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute(
	"/(protected)/dashboard/settings/notifications",
)({
	component: NotificationsSettingsPage,
});

function NotificationsSettingsPage() {
	const query = trpc.settings.getNotifications.useQuery();
	const mutation = trpc.settings.updateNotifications.useMutation({
		onSuccess: () => {
			toast.success("Notification preferences saved");
			query.refetch();
		},
		onError: (e) => toast.error(e.message),
	});

	const [prefs, setPrefs] = useState({
		notifyPaymentReceipt: true,
		notifyInvoice: true,
		notifyNfseIssued: true,
		notifyLowBalance: true,
		notifySubscriptionChanged: true,
	});

	useEffect(() => {
		if (query.data) setPrefs(query.data);
	}, [query.data]);

	if (query.isPending) {
		return (
			<DashboardLayout>
				<div className="max-w-lg space-y-4">
					<Skeleton className="h-8 w-56" />
					<Skeleton className="h-48 w-full" />
				</div>
			</DashboardLayout>
		);
	}

	function toggle<K extends keyof typeof prefs>(key: K, value: boolean) {
		setPrefs((p) => ({ ...p, [key]: value }));
	}

	return (
		<DashboardLayout>
			<div className="max-w-lg space-y-6">
				<div className="flex items-center gap-3">
					<Bell className="h-6 w-6 text-muted-foreground" />
					<div>
						<h1 className="font-semibold text-2xl tracking-tight">
							Notifications
						</h1>
						<p className="text-muted-foreground text-sm">
							Choose which product emails we send (excluding security emails
							like password reset)
						</p>
					</div>
				</div>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">Email</CardTitle>
						<CardDescription>
							Auth-related messages (verification, OTP, password reset) are
							always sent when enabled in production.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="flex items-center justify-between gap-4">
							<Label htmlFor="pay" className="flex flex-col gap-0.5">
								<span className="font-medium">Payment receipts</span>
								<span className="font-normal text-muted-foreground text-xs">
									When a charge succeeds
								</span>
							</Label>
							<Switch
								id="pay"
								checked={prefs.notifyPaymentReceipt}
								onCheckedChange={(v) => toggle("notifyPaymentReceipt", v)}
							/>
						</div>
						<div className="flex items-center justify-between gap-4">
							<Label htmlFor="inv" className="flex flex-col gap-0.5">
								<span className="font-medium">Invoice copy</span>
								<span className="font-normal text-muted-foreground text-xs">
									Sent to the billing contact on the invoice
								</span>
							</Label>
							<Switch
								id="inv"
								checked={prefs.notifyInvoice}
								onCheckedChange={(v) => toggle("notifyInvoice", v)}
							/>
						</div>
						<div className="flex items-center justify-between gap-4">
							<Label htmlFor="nfse" className="flex flex-col gap-0.5">
								<span className="font-medium">NFSe issued</span>
								<span className="font-normal text-muted-foreground text-xs">
									Brazilian service invoice (NFS-e) ready
								</span>
							</Label>
							<Switch
								id="nfse"
								checked={prefs.notifyNfseIssued}
								onCheckedChange={(v) => toggle("notifyNfseIssued", v)}
							/>
						</div>
						<div className="flex items-center justify-between gap-4">
							<Label htmlFor="low" className="flex flex-col gap-0.5">
								<span className="font-medium">Low credit balance</span>
								<span className="font-normal text-muted-foreground text-xs">
									When credits drop below the alert threshold
								</span>
							</Label>
							<Switch
								id="low"
								checked={prefs.notifyLowBalance}
								onCheckedChange={(v) => toggle("notifyLowBalance", v)}
							/>
						</div>
						<div className="flex items-center justify-between gap-4">
							<Label htmlFor="sub" className="flex flex-col gap-0.5">
								<span className="font-medium">Subscription changes</span>
								<span className="font-normal text-muted-foreground text-xs">
									Plan updates, cancellation notices
								</span>
							</Label>
							<Switch
								id="sub"
								checked={prefs.notifySubscriptionChanged}
								onCheckedChange={(v) => toggle("notifySubscriptionChanged", v)}
							/>
						</div>

						<Button
							type="button"
							disabled={mutation.isPending}
							onClick={() => mutation.mutate(prefs)}
						>
							{mutation.isPending ? "Saving…" : "Save preferences"}
						</Button>
					</CardContent>
				</Card>
			</div>
		</DashboardLayout>
	);
}
