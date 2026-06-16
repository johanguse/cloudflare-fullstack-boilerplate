import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@client/components/ui/card";
import { Separator } from "@client/components/ui/separator";
import { Skeleton } from "@client/components/ui/skeleton";
import { trpc } from "@client/lib/trpc-client";
import { createFileRoute } from "@tanstack/react-router";
import { CreditCard, DollarSign, FileText, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/(protected)/dashboard/admin/")({
	component: AdminReportsPage,
});

function StatCard({
	title,
	value,
	icon: Icon,
	sub,
	isPending,
}: {
	title: string;
	value: string;
	icon: React.ElementType;
	sub?: string;
	isPending: boolean;
}) {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between pb-2">
				<CardTitle className="text-sm font-medium text-muted-foreground">
					{title}
				</CardTitle>
				<Icon className="size-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				{isPending ? (
					<Skeleton className="h-8 w-24" />
				) : (
					<p className="font-bold text-2xl tabular-nums">{value}</p>
				)}
				{sub && (
					<p className="mt-1 text-muted-foreground text-xs">{sub}</p>
				)}
			</CardContent>
		</Card>
	);
}

function AdminReportsPage() {
	const { t } = useTranslation();
	const { data, isPending } = trpc.admin.getStats.useQuery();

	const fmt = (n: number) =>
		new Intl.NumberFormat(undefined, {
			style: "currency",
			currency: "USD",
			maximumFractionDigits: 0,
		}).format(n / 100);

	return (
		<div className="space-y-6">
			<div>
				<h1 className="font-semibold text-2xl tracking-tight">
					{t("admin.reports.title", "Reports")}
				</h1>
				<p className="text-muted-foreground text-sm">
					{t("admin.reports.subtitle", "Platform-wide statistics and revenue overview.")}
				</p>
			</div>
			<Separator />

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<StatCard
					title={t("admin.stats.totalUsers", "Total users")}
					value={(data?.totalUsers ?? 0).toLocaleString()}
					icon={Users}
					isPending={isPending}
				/>
				<StatCard
					title={t("admin.stats.paidUsers", "Active subscriptions")}
					value={(data?.paidUsers ?? 0).toLocaleString()}
					icon={CreditCard}
					isPending={isPending}
				/>
				<StatCard
					title={t("admin.stats.totalInvoices", "Paid invoices")}
					value={(data?.totalInvoices ?? 0).toLocaleString()}
					icon={FileText}
					isPending={isPending}
				/>
				<StatCard
					title={t("admin.stats.totalRevenue", "Total revenue")}
					value={fmt(data?.totalRevenue ?? 0)}
					icon={DollarSign}
					isPending={isPending}
				/>
			</div>
		</div>
	);
}
