import { Badge } from "@client/components/ui/badge";
import { Button } from "@client/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@client/components/ui/card";
import { Skeleton } from "@client/components/ui/skeleton";
import { authClient } from "@client/lib/auth-client";
import { trpc } from "@client/lib/trpc-client";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
	ArrowRight,
	CreditCard,
	Key,
	Receipt,
	Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/(protected)/dashboard/")({
	component: DashboardPage,
});

function DashboardPage() {
	const { t } = useTranslation();
	const { data: session } = authClient.useSession();
	const subscriptionQuery = trpc.billing.getSubscription.useQuery();
	const invoicesQuery = trpc.invoices.list.useQuery({ limit: 5 });

	const userName = session?.user?.name?.split(" ")[0] ?? t("dashboard.user", "User");
	const rawPlan = subscriptionQuery.data?.plan ?? "free";
	const plan = rawPlan.charAt(0).toUpperCase() + rawPlan.slice(1);
	const planLoading = subscriptionQuery.isPending;
	const invoiceCount = invoicesQuery.data?.total ?? 0;
	const invoiceLoading = invoicesQuery.isPending;
	const recentInvoices = invoicesQuery.data?.rows ?? [];

	return (
		<div className="space-y-6">
			{/* Page header */}
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<h1 className="font-bold text-2xl tracking-tight">
						{t("dashboard.greeting", "Hello, {{name}}", { name: userName })} 👋
					</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						{t("dashboard.subtitle", "Here's what's happening with your account.")}
					</p>
				</div>
				<Button asChild size="sm">
					<Link to="/dashboard/invoices">
						{t("dashboard.createInvoice", "New invoice")}
						<ArrowRight className="ml-1.5 h-3.5 w-3.5" />
					</Link>
				</Button>
			</div>

			{/* Stat cards */}
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<StatCard
					title={t("dashboard.stats.invoices", "Total Invoices")}
					value={String(invoiceCount)}
					description={t("dashboard.stats.allTime", "All time")}
					icon={Receipt}
					loading={invoiceLoading}
					href="/dashboard/invoices"
				/>
				<StatCard
					title={t("dashboard.stats.activePlan", "Current Plan")}
					value={plan}
					description={t("dashboard.stats.subscription", "Active subscription")}
					icon={Sparkles}
					loading={planLoading}
					href="/dashboard/billing"
				/>
				<StatCard
					title={t("dashboard.stats.apiKeys", "API Keys")}
					value={"—"}
					description={t("dashboard.stats.programmaticAccess", "Programmatic access")}
					icon={Key}
					loading={false}
					href="/dashboard/api-keys"
				/>
			</div>

			{/* Content grid */}
			<div className="grid gap-6 lg:grid-cols-2">
				{/* Recent invoices */}
				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-3">
						<CardTitle className="text-base">
							{t("dashboard.recentInvoices", "Recent Invoices")}
						</CardTitle>
						<Button variant="ghost" size="sm" asChild className="h-7 text-xs">
							<Link to="/dashboard/invoices">
								{t("dashboard.viewAll", "View all")}
								<ArrowRight className="ml-1 h-3 w-3" />
							</Link>
						</Button>
					</CardHeader>
					<CardContent>
						{invoiceLoading ? (
							<div className="space-y-3">
								{Array.from({ length: 3 }).map((_, i) => (
									// biome-ignore lint/suspicious/noArrayIndexKey: skeleton list
									<div key={i} className="flex items-center justify-between">
										<div className="space-y-1.5">
											<Skeleton className="h-4 w-32" />
											<Skeleton className="h-3 w-20" />
										</div>
										<Skeleton className="h-5 w-16" />
									</div>
								))}
							</div>
						) : recentInvoices.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-8 text-center">
								<Receipt className="mb-2 h-8 w-8 text-muted-foreground/30" />
								<p className="text-muted-foreground text-sm">
									{t("dashboard.noInvoicesYet", "No invoices yet.")}
								</p>
							</div>
						) : (
							<div className="space-y-3">
								{recentInvoices.map((inv) => (
									<div key={inv.id} className="flex items-center justify-between">
										<div>
											<p className="font-medium text-sm leading-none">
												{inv.customerName}
											</p>
											<p className="mt-1 text-muted-foreground text-xs">
												{inv.number}
											</p>
										</div>
										<Badge variant="secondary" className="text-xs">
											{inv.status}
										</Badge>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>

				{/* Quick actions */}
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-base">
							{t("dashboard.quickActions", "Quick Actions")}
						</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-2">
						<QuickAction
							icon={CreditCard}
							label={t("dashboard.actions.billing", "Manage billing & plan")}
							href="/dashboard/billing"
						/>
						<QuickAction
							icon={Key}
							label={t("dashboard.actions.apiKeys", "Create an API key")}
							href="/dashboard/api-keys"
						/>
						<QuickAction
							icon={Receipt}
							label={t("dashboard.actions.invoices", "View all invoices")}
							href="/dashboard/invoices"
						/>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

function StatCard({
	title,
	value,
	description,
	icon: Icon,
	loading,
	href,
}: {
	title: string;
	value: string;
	description: string;
	icon: React.ComponentType<{ className?: string }>;
	loading: boolean;
	href: string;
}) {
	return (
		<Link to={href} className="block">
			<Card className="transition-colors hover:bg-muted/40">
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="font-medium text-muted-foreground text-sm">
						{title}
					</CardTitle>
					<Icon className="h-4 w-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					{loading ? (
						<>
							<Skeleton className="h-7 w-24" />
							<Skeleton className="mt-2 h-3 w-32" />
						</>
					) : (
						<>
							<div className="font-bold text-2xl">{value}</div>
							<p className="mt-1 text-muted-foreground text-xs">{description}</p>
						</>
					)}
				</CardContent>
			</Card>
		</Link>
	);
}

function QuickAction({
	icon: Icon,
	label,
	href,
}: {
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	href: string;
}) {
	return (
		<Link
			to={href}
			className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-muted"
		>
			<Icon className="h-4 w-4 text-muted-foreground" />
			<span>{label}</span>
			<ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
		</Link>
	);
}
