import { Button } from "@client/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@client/components/ui/card";
import { ContentSection } from "@client/components/ui/content-section";
import { Label } from "@client/components/ui/label";
import { Skeleton } from "@client/components/ui/skeleton";
import { Switch } from "@client/components/ui/switch";
import { trpc } from "@client/lib/trpc-client";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export const Route = createFileRoute(
	"/(protected)/dashboard/settings/notifications",
)({
	component: NotificationsSettingsPage,
});

function NotificationsSettingsPage() {
	const { t } = useTranslation();
	const query = trpc.settings.getNotifications.useQuery();
	const mutation = trpc.settings.updateNotifications.useMutation({
		onSuccess: () => {
			toast.success(t("notifications.saved", "Notification preferences saved"));
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
			<ContentSection
				title={t("notifications.title", "Notifications")}
				desc={t("notifications.subtitle", "Choose which emails you receive")}
			>
				<div className="space-y-4">
					<Skeleton className="h-8 w-56" />
					<Skeleton className="h-48 w-full" />
				</div>
			</ContentSection>
		);
	}

	function toggle<K extends keyof typeof prefs>(key: K, value: boolean) {
		setPrefs((p) => ({ ...p, [key]: value }));
	}

	return (
		<ContentSection
			title={t("notifications.title", "Notifications")}
			desc={t("notifications.subtitle", "Choose which emails you receive")}
		>
			<Card>
				<CardHeader>
					<CardTitle className="text-base">
						{t("notifications.email", "Email notifications")}
					</CardTitle>
					<CardDescription>
						{t("notifications.emailDesc", "Sent to your account email address")}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="flex items-center justify-between gap-4">
						<Label htmlFor="pay" className="flex flex-col gap-0.5">
							<span className="font-medium">
								{t("notifications.paymentReceipts", "Payment receipts")}
							</span>
							<span className="font-normal text-muted-foreground text-xs">
								{t(
									"notifications.paymentReceiptsDesc",
									"Receive a confirmation after each payment",
								)}
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
							<span className="font-medium">
								{t("notifications.invoiceCopy", "Invoice copies")}
							</span>
							<span className="font-normal text-muted-foreground text-xs">
								{t(
									"notifications.invoiceCopyDesc",
									"Get a copy of every invoice sent to customers",
								)}
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
							<span className="font-medium">
								{t("notifications.nfseIssued", "NFSe issued")}
							</span>
							<span className="font-normal text-muted-foreground text-xs">
								{t(
									"notifications.nfseIssuedDesc",
									"Notify when a service invoice is successfully issued",
								)}
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
							<span className="font-medium">
								{t("notifications.lowBalance", "Low credit balance")}
							</span>
							<span className="font-normal text-muted-foreground text-xs">
								{t(
									"notifications.lowBalanceDesc",
									"Alert when your credit balance falls below the threshold",
								)}
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
							<span className="font-medium">
								{t("notifications.subscriptionChanges", "Subscription changes")}
							</span>
							<span className="font-normal text-muted-foreground text-xs">
								{t(
									"notifications.subscriptionChangesDesc",
									"Notify on plan upgrades, downgrades, or cancellations",
								)}
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
						{mutation.isPending
							? t("notifications.saving", "Saving…")
							: t("notifications.save", "Save preferences")}
					</Button>
				</CardContent>
			</Card>
		</ContentSection>
	);
}
