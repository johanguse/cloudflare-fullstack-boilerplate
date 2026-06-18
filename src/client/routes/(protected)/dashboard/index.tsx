import { Badge } from "@client/components/ui/badge";
import { Button } from "@client/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@client/components/ui/card";
import { Progress } from "@client/components/ui/progress";
import { Skeleton } from "@client/components/ui/skeleton";
import { authClient } from "@client/lib/auth-client";
import { trpc } from "@client/lib/trpc-client";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	BadgeCheck,
	CalendarClock,
	CreditCard,
	FileWarning,
	Key,
	Loader2,
	Plus,
	Receipt,
	Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/(protected)/dashboard/")({
	component: DashboardPage,
});

const RECENT_INVOICES_INPUT = { limit: 5, offset: 0 };
const ONE_MINUTE = 60 * 1000;

function DashboardPage() {
	const { t } = useTranslation();
	const { data: session } = authClient.useSession();
	const subscriptionQuery = trpc.billing.getSubscription.useQuery(undefined, {
		staleTime: ONE_MINUTE,
	});
	const invoicesQuery = trpc.invoices.list.useQuery(RECENT_INVOICES_INPUT, {
		staleTime: 30 * 1000,
	});
	const apiKeysQuery = trpc.apiKeys.list.useQuery(undefined, {
		staleTime: ONE_MINUTE,
		select: (keys) => ({
			total: keys.length,
			recent: keys[0] ?? null,
		}),
	});

	const userName =
		session?.user?.name?.split(" ")[0] ?? t("dashboard.user", "User");
	const rawPlan = subscriptionQuery.data?.plan ?? "free";
	const plan = rawPlan.charAt(0).toUpperCase() + rawPlan.slice(1);
	const creditBalance = subscriptionQuery.data?.creditBalance ?? 0;
	const subscriptionStatus = subscriptionQuery.data?.status ?? "inactive";
	const recentInvoices = invoicesQuery.data?.rows ?? [];
	const invoiceCount = invoicesQuery.data?.total ?? 0;
	const paidInvoices = recentInvoices.filter(
		(invoice) => invoice.status === "paid",
	).length;
	const overdueInvoices = recentInvoices.filter(
		(invoice) => invoice.status === "overdue",
	).length;
	const apiKeyCount = apiKeysQuery.data?.total ?? 0;
	const hasDashboardError =
		subscriptionQuery.isError || invoicesQuery.isError || apiKeysQuery.isError;
	const isRefreshing =
		(subscriptionQuery.isFetching && !subscriptionQuery.isPending) ||
		(invoicesQuery.isFetching && !invoicesQuery.isPending) ||
		(apiKeysQuery.isFetching && !apiKeysQuery.isPending);

	return (
		<div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
			<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
				<section className="rounded-lg border bg-card p-5 sm:p-6">
					<div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
						<div className="max-w-2xl">
							<Badge variant="secondary" className="mb-3 rounded-md">
								{t("dashboard.overview", "Account overview")}
							</Badge>
							{isRefreshing ? (
								<span className="mb-3 ml-2 inline-flex items-center gap-1.5 text-muted-foreground text-xs">
									<Loader2 className="size-3 animate-spin" />
									{t("dashboard.refreshing", "Refreshing")}
								</span>
							) : null}
							<h1 className="font-semibold text-2xl tracking-tight sm:text-3xl">
								{t("dashboard.greeting", "Hello, {{name}}", { name: userName })}
							</h1>
							<p className="mt-2 text-muted-foreground text-sm leading-6">
								{t(
									"dashboard.subtitle",
									"Monitor billing, invoices, and API access from one focused workspace.",
								)}
							</p>
						</div>
						<div className="flex flex-wrap gap-2">
							<Button asChild variant="outline" size="sm">
								<Link to="/dashboard/api-keys">
									<Key className="mr-2 size-4" />
									{t("dashboard.createApiKey", "New API key")}
								</Link>
							</Button>
							<Button asChild size="sm">
								<Link to="/dashboard/invoices">
									<Plus className="mr-2 size-4" />
									{t("dashboard.createInvoice", "New invoice")}
								</Link>
							</Button>
						</div>
					</div>
				</section>

				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-base">
							{t("dashboard.planSnapshot", "Plan snapshot")}
						</CardTitle>
						<CardDescription>
							{t(
								"dashboard.planSnapshotDescription",
								"Current access and credits",
							)}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{subscriptionQuery.isPending ? (
							<div className="space-y-3">
								<Skeleton className="h-8 w-32" />
								<Skeleton className="h-3 w-full" />
								<Skeleton className="h-4 w-40" />
							</div>
						) : (
							<>
								<div className="flex items-center justify-between gap-3">
									<div>
										<p className="font-semibold text-2xl leading-none">
											{plan}
										</p>
										<p className="mt-1 text-muted-foreground text-xs">
											{t("dashboard.subscriptionStatus", "{{status}} status", {
												status: subscriptionStatus,
											})}
										</p>
									</div>
									<BadgeCheck className="size-8 text-primary" />
								</div>
								<div>
									<div className="mb-2 flex items-center justify-between text-sm">
										<span className="text-muted-foreground">
											{t("dashboard.credits", "Credits")}
										</span>
										<span className="font-medium tabular-nums">
											{creditBalance}
										</span>
									</div>
									<Progress value={Math.min(100, creditBalance)} />
								</div>
								<Button asChild variant="outline" size="sm" className="w-full">
									<Link to="/dashboard/billing">
										{t("dashboard.managePlan", "Manage plan")}
										<ArrowRight className="ml-2 size-4" />
									</Link>
								</Button>
							</>
						)}
					</CardContent>
				</Card>
			</div>

			{hasDashboardError ? (
				<div className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
					<div className="flex gap-3">
						<FileWarning className="mt-0.5 size-4 shrink-0 text-destructive" />
						<p>
							{t(
								"dashboard.loadError",
								"Some dashboard data could not be loaded. Try refreshing the affected panels.",
							)}
						</p>
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							subscriptionQuery.refetch();
							invoicesQuery.refetch();
							apiKeysQuery.refetch();
						}}
					>
						{t("dashboard.retry", "Retry")}
					</Button>
				</div>
			) : null}

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<StatCard
					title={t("dashboard.stats.invoices", "Total invoices")}
					value={String(invoiceCount)}
					description={t("dashboard.stats.allTime", "All time")}
					icon={Receipt}
					loading={invoicesQuery.isPending}
					href="/dashboard/invoices"
				/>
				<StatCard
					title={t("dashboard.stats.paidInvoices", "Paid recent")}
					value={String(paidInvoices)}
					description={t(
						"dashboard.stats.lastFiveInvoices",
						"From the latest 5",
					)}
					icon={BadgeCheck}
					loading={invoicesQuery.isPending}
					href="/dashboard/invoices"
				/>
				<StatCard
					title={t("dashboard.stats.overdue", "Overdue recent")}
					value={String(overdueInvoices)}
					description={t("dashboard.stats.needsAttention", "Needs attention")}
					icon={CalendarClock}
					loading={invoicesQuery.isPending}
					href="/dashboard/invoices"
				/>
				<StatCard
					title={t("dashboard.stats.apiKeys", "API keys")}
					value={String(apiKeyCount)}
					description={t(
						"dashboard.stats.programmaticAccess",
						"Programmatic access",
					)}
					icon={Key}
					loading={apiKeysQuery.isPending}
					href="/dashboard/api-keys"
				/>
			</div>

			<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
				<Card>
					<CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
						<div>
							<CardTitle className="text-base">
								{t("dashboard.recentInvoices", "Recent invoices")}
							</CardTitle>
							<CardDescription>
								{t(
									"dashboard.recentInvoicesDescription",
									"Latest billing activity",
								)}
							</CardDescription>
						</div>
						<Button variant="ghost" size="sm" asChild className="h-8">
							<Link to="/dashboard/invoices">
								{t("dashboard.viewAll", "View all")}
								<ArrowRight className="ml-2 size-4" />
							</Link>
						</Button>
					</CardHeader>
					<CardContent>
						{invoicesQuery.isPending ? (
							<div className="space-y-3">
								{Array.from({ length: 5 }).map((_, i) => (
									<div key={i} className="grid grid-cols-[1fr_auto] gap-4 py-1">
										<div className="space-y-2">
											<Skeleton className="h-4 w-44 max-w-full" />
											<Skeleton className="h-3 w-28 max-w-full" />
										</div>
										<Skeleton className="h-6 w-20" />
									</div>
								))}
							</div>
						) : recentInvoices.length === 0 ? (
							<div className="flex min-h-40 flex-col items-center justify-center rounded-md border border-dashed text-center">
								<Receipt className="mb-3 size-8 text-muted-foreground/40" />
								<p className="font-medium text-sm">
									{t("dashboard.noInvoicesYet", "No invoices yet")}
								</p>
								<p className="mt-1 max-w-64 text-muted-foreground text-sm">
									{t(
										"dashboard.noInvoicesDescription",
										"Create your first invoice to start tracking billing activity.",
									)}
								</p>
							</div>
						) : (
							<div className="divide-y">
								{recentInvoices.map((invoice) => (
									<Link
										key={invoice.id}
										to="/dashboard/invoices/$id"
										params={{ id: invoice.id }}
										className="grid gap-3 rounded-md py-3 outline-none transition-colors hover:bg-muted/40 focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[minmax(0,1fr)_120px_96px]"
									>
										<div className="min-w-0 px-1">
											<p className="truncate font-medium text-sm">
												{invoice.customerName}
											</p>
											<p className="mt-1 truncate text-muted-foreground text-xs">
												{invoice.number}
											</p>
										</div>
										<div className="px-1 text-muted-foreground text-sm tabular-nums">
											{formatCurrency(invoice.amountTotal, invoice.currency)}
										</div>
										<div className="px-1 sm:text-right">
											<StatusBadge status={invoice.status} />
										</div>
									</Link>
								))}
							</div>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-base">
							{t("dashboard.quickActions", "Quick actions")}
						</CardTitle>
						<CardDescription>
							{t("dashboard.quickActionsDescription", "Common account tasks")}
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-2">
						<QuickAction
							icon={Receipt}
							label={t("dashboard.actions.invoices", "Review invoices")}
							description={t(
								"dashboard.actions.invoicesDescription",
								"Open invoice history",
							)}
							href="/dashboard/invoices"
						/>
						<QuickAction
							icon={CreditCard}
							label={t("dashboard.actions.billing", "Manage billing")}
							description={t(
								"dashboard.actions.billingDescription",
								"Plan, portal, and credits",
							)}
							href="/dashboard/billing"
						/>
						<QuickAction
							icon={Key}
							label={t("dashboard.actions.apiKeys", "Create an API key")}
							description={t(
								"dashboard.actions.apiKeysDescription",
								"Connect external systems",
							)}
							href="/dashboard/api-keys"
						/>
						<QuickAction
							icon={Sparkles}
							label={t("dashboard.actions.company", "Company settings")}
							description={t(
								"dashboard.actions.companyDescription",
								"Fiscal and NFSe setup",
							)}
							href="/dashboard/settings/company"
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
		<Link
			to={href}
			className="group block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
		>
			<Card className="h-full transition-colors group-hover:bg-muted/40">
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="font-medium text-muted-foreground text-sm">
						{title}
					</CardTitle>
					<Icon className="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					{loading ? (
						<>
							<Skeleton className="h-8 w-20" />
							<Skeleton className="mt-2 h-3 w-28" />
						</>
					) : (
						<>
							<div className="font-semibold text-2xl tabular-nums">{value}</div>
							<p className="mt-1 text-muted-foreground text-xs">
								{description}
							</p>
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
	description,
	href,
}: {
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	description: string;
	href: string;
}) {
	return (
		<Link
			to={href}
			className="flex min-h-14 items-center gap-3 rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
		>
			<span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
				<Icon className="size-4" />
			</span>
			<span className="min-w-0 flex-1">
				<span className="block truncate font-medium">{label}</span>
				<span className="block truncate text-muted-foreground text-xs">
					{description}
				</span>
			</span>
			<ArrowRight className="size-4 shrink-0 text-muted-foreground" />
		</Link>
	);
}

function StatusBadge({ status }: { status: string }) {
	const { t } = useTranslation();
	const variant =
		status === "paid"
			? "default"
			: status === "overdue" || status === "cancelled"
				? "destructive"
				: status === "issued"
					? "outline"
					: "secondary";

	const label = t(`invoices.status.${status}`, status);

	return <Badge variant={variant}>{label}</Badge>;
}

function formatCurrency(cents: number, currency: string) {
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: currency || "BRL",
	}).format(cents / 100);
}
