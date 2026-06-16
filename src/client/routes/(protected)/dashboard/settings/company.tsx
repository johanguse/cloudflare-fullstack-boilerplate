import { Alert, AlertDescription } from "@client/components/ui/alert";
import { Button } from "@client/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@client/components/ui/card";
import { ContentSection } from "@client/components/ui/content-section";
import { Input } from "@client/components/ui/input";
import { Label } from "@client/components/ui/label";
import { Skeleton } from "@client/components/ui/skeleton";
import { trpc } from "@client/lib/trpc-client";
import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export const Route = createFileRoute("/(protected)/dashboard/settings/company")(
	{
		component: CompanySettingsPage,
	},
);

function CompanySettingsPage() {
	const { t } = useTranslation();
	const settingsQuery = trpc.nfse.getSettings.useQuery();
	const updateMutation = trpc.nfse.updateSettings.useMutation({
		onSuccess: () => {
			toast.success(t("company.saved", "Settings saved"));
			settingsQuery.refetch();
		},
		onError: (e) => toast.error(e.message),
	});

	const [form, setForm] = useState({
		serviceDescription: "",
		productName: "",
	});

	useEffect(() => {
		if (settingsQuery.data) {
			setForm({
				serviceDescription: settingsQuery.data.serviceDescription ?? "",
				productName: settingsQuery.data.productName ?? "",
			});
		}
	}, [settingsQuery.data]);

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		updateMutation.mutate({
			serviceDescription: form.serviceDescription || undefined,
			productName: form.productName || undefined,
		});
	}

	if (settingsQuery.isPending) {
		return (
			<ContentSection
				title={t("company.title", "NFSe defaults")}
				desc={t("company.subtitle", "Default descriptions sent with each NFSe request")}
			>
				<div className="space-y-4">
					<Skeleton className="h-8 w-48" />
					<Skeleton className="h-40 w-full" />
				</div>
			</ContentSection>
		);
	}

	return (
		<ContentSection
			title={t("company.title", "NFSe defaults")}
			desc={t("company.subtitle", "Default descriptions sent with each NFSe request")}
		>
			<div className="space-y-6">
				<Alert>
					<ExternalLink className="h-4 w-4" />
					<AlertDescription>
						{t(
							"company.alert",
							"CNPJ, ISS rate, and service codes are configured in your Fiscal Nacional project dashboard — not here.",
						)}
					</AlertDescription>
				</Alert>

				<form onSubmit={handleSubmit} className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle className="text-base">
								{t("company.serviceDefaults", "Description defaults")}
							</CardTitle>
							<CardDescription>
								{t(
									"company.serviceDefaultsDesc",
									"These fall back to your Fiscal Nacional project defaults if left blank.",
								)}
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-1.5">
								<Label htmlFor="serviceDescription">
									{t("company.fields.serviceDescription", "Service description (Portuguese)")}
								</Label>
								<textarea
									id="serviceDescription"
									rows={3}
									className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[60px] w-full rounded-md border px-3 py-2 text-sm shadow-sm focus-visible:ring-1 focus-visible:outline-none"
									value={form.serviceDescription}
									onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
										setForm((prev) => ({ ...prev, serviceDescription: e.target.value }))
									}
									placeholder="Licença de uso de software SaaS — Plano Pro"
								/>
								<p className="text-muted-foreground text-xs">
									{t(
										"company.fields.serviceDescriptionHint",
										"Used in the NFS-e XML submitted to the municipality. Must be in Portuguese.",
									)}
								</p>
							</div>

							<div className="space-y-1.5">
								<Label htmlFor="productName">
									{t("company.fields.productName", "Product name (English)")}
								</Label>
								<Input
									id="productName"
									value={form.productName}
									onChange={(e) =>
										setForm((prev) => ({ ...prev, productName: e.target.value }))
									}
									placeholder="Pro Plan"
								/>
								<p className="text-muted-foreground text-xs">
									{t(
										"company.fields.productNameHint",
										"Shown on the commercial invoice PDF for international customers.",
									)}
								</p>
							</div>
						</CardContent>
					</Card>

					<div className="flex justify-end">
						<Button type="submit" disabled={updateMutation.isPending}>
							{updateMutation.isPending
								? t("company.saving", "Saving…")
								: t("company.save", "Save")}
						</Button>
					</div>
				</form>
			</div>
		</ContentSection>
	);
}
