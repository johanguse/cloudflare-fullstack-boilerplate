import { Badge } from "@client/components/ui/badge";
import { Button } from "@client/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@client/components/ui/card";
import { Progress } from "@client/components/ui/progress";
import { Skeleton } from "@client/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@client/components/ui/table";
import { trpc } from "@client/lib/trpc-client";
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import {
	AlertCircle,
	BadgePercent,
	CheckCircle2,
	CreditCard,
	ExternalLink,
	Loader2,
	Package2,
	ReceiptText,
	Zap,
} from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

const billingSearchSchema = z.object({
	success: z.string().optional(),
	canceled: z.string().optional(),
});

export const Route = createFileRoute("/(protected)/dashboard/billing/")({
	validateSearch: billingSearchSchema,
	component: BillingPage,
});

const PLANS = [
	{ id: "free", name: "Free", price: "$0", credits: 50 },
	{ id: "starter", name: "Starter", price: "$4.99", credits: 200 },
	{ id: "professional", name: "Professional", price: "$12.99", credits: 600 },
	{ id: "business", name: "Business", price: "$29.99", credits: 1500 },
] as const;

const statusVariant: Record<
	string,
	"default" | "secondary" | "destructive" | "outline"
> = {
	active: "default",
	trialing: "secondary",
	past_due: "destructive",
	canceled: "outline",
	inactive: "outline",
};

const txTypeColor: Record<string, string> = {
	purchase: "text-green-600 dark:text-green-400",
	subscription_grant: "text-green-600 dark:text-green-400",
	usage: "text-muted-foreground",
	refund: "text-green-600 dark:text-green-400",
	adjustment: "text-muted-foreground",
};

function BillingPage() {
	const { t } = useTranslation();
	const { success, canceled } = useSearch({
		from: "/(protected)/dashboard/billing/",
	});
	const subQuery = trpc.billing.getSubscription.useQuery();
	const historyQuery = trpc.billing.getHistory.useQuery({
		limit: 5,
		offset: 0,
	});
	const portalMutation = trpc.billing.getPortalUrl.useMutation({
		onSuccess: ({ url }) => {
			if (url) window.location.href = url;
		},
		onError: (err) =>
			toast.error(
				err.message ??
					t("billing.failedToOpenPortal", "Failed to open billing portal"),
			),
	});

	useEffect(() => {
		if (success)
			toast.success(
				t("billing.activated", "Subscription activated! Welcome to your plan."),
			);
		if (canceled) toast.info(t("billing.canceled", "Checkout was canceled."));
	}, [success, canceled, t]);

	const sub = subQuery.data;
	const currentPlanIdx = PLANS.findIndex((p) => p.id === (sub?.plan ?? "free"));
	const maxCredits = PLANS[currentPlanIdx]?.credits ?? 50;
	const creditPct = Math.min(
		((sub?.creditBalance ?? 0) / maxCredits) * 100,
		100,
	);

	return (
		<div className="w-full">
			<div className="mb-6">
				<h1 className="font-semibold text-2xl tracking-tight">
					{t("billing.title", "Billing")}
				</h1>
				<p className="text-muted-foreground text-sm">
					{t("billing.subtitle", "Manage your subscription and credits")}
				</p>
			</div>

			<div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
				{/* Main column */}
				<div className="col-span-1 flex flex-col gap-5 xl:col-span-2">
					{/* Plan card */}
					<Card>
						<CardContent className="p-5">
							{subQuery.isLoading ? (
								<div className="space-y-4">
									<Skeleton className="h-7 w-40" />
									<Skeleton className="h-4 w-56" />
									<Skeleton className="h-9 w-48" />
								</div>
							) : (
								<div className="flex flex-col gap-5">
									<div className="flex flex-wrap items-center justify-between gap-4">
										<div className="flex flex-col gap-1">
											<div className="flex items-center gap-2.5">
												<h2 className="font-semibold text-xl capitalize">
													{sub?.plan ?? "Free"} {t("billing.plan", "Plan")}
												</h2>
												<Badge
													variant={
														statusVariant[sub?.status ?? "inactive"] ??
														"outline"
													}
													className="capitalize"
												>
													{sub?.status ?? "inactive"}
												</Badge>
											</div>
											<p className="text-muted-foreground text-sm">
												{t(
													"billing.planDesc",
													"Your current subscription plan",
												)}
											</p>
										</div>
										<div className="flex gap-2">
											{sub?.stripeSubscriptionId ? (
												<Button
													variant="outline"
													size="sm"
													disabled={portalMutation.isPending}
													onClick={() => portalMutation.mutate()}
												>
													{portalMutation.isPending ? (
														<Loader2 className="mr-1.5 size-3.5 animate-spin" />
													) : (
														<ExternalLink className="mr-1.5 size-3.5" />
													)}
													{t(
														"billing.manageSubscription",
														"Manage subscription",
													)}
												</Button>
											) : (
												<Button
													size="sm"
													onClick={() => {
														window.location.href = "/dashboard/billing/upgrade";
													}}
												>
													<Zap className="mr-1.5 size-3.5" />
													{t("billing.upgradePlan", "Upgrade plan")}
												</Button>
											)}
										</div>
									</div>

									{/* Stats */}
									<div className="flex flex-wrap gap-3">
										<div className="grid min-w-28 content-between gap-1.5 rounded-md border border-dashed px-3.5 py-2">
											<span className="font-medium text-base leading-none">
												{sub?.creditBalance ?? 0}
											</span>
											<span className="text-muted-foreground text-sm">
												{t("billing.creditsBalance", "Credits left")}
											</span>
										</div>
										<div className="grid min-w-28 content-between gap-1.5 rounded-md border border-dashed px-3.5 py-2">
											<span className="font-medium text-base leading-none">
												{maxCredits}
											</span>
											<span className="text-muted-foreground text-sm">
												{t("billing.planLimit", "Plan limit")}
											</span>
										</div>
										{sub?.currentPeriodEnd && (
											<div className="grid min-w-28 content-between gap-1.5 rounded-md border border-dashed px-3.5 py-2">
												<span className="font-medium text-base leading-none">
													{new Date(sub.currentPeriodEnd).toLocaleDateString(
														"en-US",
														{
															day: "numeric",
															month: "short",
															year: "2-digit",
														},
													)}
												</span>
												<span className="text-muted-foreground text-sm">
													{t("billing.renewalDate", "Renewal date")}
												</span>
											</div>
										)}
									</div>

									{/* Usage bar */}
									<div className="flex flex-col gap-2">
										<span className="text-muted-foreground text-sm">
											{t("billing.usage", "Usage")} ({sub?.creditBalance ?? 0} /{" "}
											{maxCredits} {t("billing.credits", "credits")})
										</span>
										<Progress value={creditPct} className="h-1.5" />
									</div>

									{sub?.cancelAtPeriodEnd && (
										<p className="text-destructive text-xs">
											{t(
												"billing.cancelsAtEnd",
												"Your subscription will be canceled at the end of the billing period.",
											)}
										</p>
									)}
								</div>
							)}
						</CardContent>
					</Card>

					{/* Transaction history */}
					<Card>
						<CardHeader className="flex flex-row items-center justify-between border-b px-5 py-3.5">
							<CardTitle className="font-semibold text-base">
								{t("billing.recentTransactions", "Recent transactions")}
							</CardTitle>
							{sub?.stripeSubscriptionId && (
								<Button
									variant="outline"
									size="sm"
									disabled={portalMutation.isPending}
									onClick={() => portalMutation.mutate()}
								>
									{portalMutation.isPending ? (
										<Loader2 className="mr-1.5 size-3.5 animate-spin" />
									) : (
										<ExternalLink className="mr-1.5 size-3.5" />
									)}
									{t("billing.managePortal", "Manage billing")}
								</Button>
							)}
						</CardHeader>
						<CardContent className="p-0">
							{historyQuery.isLoading ? (
								<div className="space-y-2 p-5">
									{[1, 2, 3].map((i) => (
										<Skeleton key={i} className="h-10 w-full" />
									))}
								</div>
							) : (historyQuery.data?.length ?? 0) === 0 ? (
								<div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
									<CreditCard className="size-8 opacity-30" />
									<p className="text-sm">
										{t("billing.noTransactions", "No transactions yet")}
									</p>
								</div>
							) : (
								<Table>
									<TableHeader>
										<TableRow className="bg-muted/40">
											<TableHead className="h-10 px-4">
												{t("history.headers.description", "Description")}
											</TableHead>
											<TableHead className="h-10 px-4 text-right">
												{t("billing.status", "Status")}
											</TableHead>
											<TableHead className="h-10 px-4 text-right">
												{t("history.headers.date", "Date")}
											</TableHead>
											<TableHead className="h-10 px-4 text-right">
												{t("history.headers.credits", "Credits")}
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{historyQuery.data?.map((tx) => (
											<TableRow key={tx.id}>
												<TableCell className="px-4 py-3 text-sm">
													{tx.description}
												</TableCell>
												<TableCell className="px-4 py-3 text-right">
													<Badge
														variant="outline"
														className="text-xs capitalize"
													>
														{tx.type.replace(/_/g, " ")}
													</Badge>
												</TableCell>
												<TableCell className="px-4 py-3 text-right text-muted-foreground text-sm">
													{tx.createdAt
														? new Date(tx.createdAt).toLocaleDateString(
																"en-US",
																{
																	day: "numeric",
																	month: "short",
																	year: "numeric",
																},
															)
														: "—"}
												</TableCell>
												<TableCell className="px-4 py-3 text-right">
													<div className="flex items-center justify-end gap-1.5">
														<span
															className={`font-mono font-semibold text-sm ${txTypeColor[tx.type] ?? ""}`}
														>
															{tx.amount > 0 ? "+" : ""}
															{tx.amount}
														</span>
														{tx.amount > 0 ? (
															<CheckCircle2 className="size-3.5 text-green-500" />
														) : (
															<AlertCircle className="size-3.5 text-muted-foreground" />
														)}
													</div>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</CardContent>
						{(historyQuery.data?.length ?? 0) > 0 && (
							<CardFooter className="flex justify-center border-t py-3">
								<Button variant="link" size="sm" asChild>
									<Link to="/dashboard/billing/history">
										{t("billing.viewAll", "View all transactions")}
									</Link>
								</Button>
							</CardFooter>
						)}
					</Card>
				</div>

				{/* Sidebar */}
				<div className="col-span-1">
					<Card className="h-full">
						<CardContent className="flex flex-col gap-6 p-5">
							<SidebarItem
								icon={<BadgePercent className="size-6 text-orange-400" />}
								title={t(
									"billing.sidebar.plansTitle",
									"Flexible Plans for Every Need",
								)}
								description={t(
									"billing.sidebar.plansDesc",
									"Select the perfect plan for your needs with straightforward, user-friendly billing.",
								)}
								href="/dashboard/billing/upgrade"
							/>
							<div className="border-t" />
							<SidebarItem
								icon={<Package2 className="size-6 text-orange-400" />}
								title={t(
									"billing.sidebar.creditsTitle",
									"Simple Credit-Based Usage",
								)}
								description={t(
									"billing.sidebar.creditsDesc",
									"Credits are consumed as you use the service. Top up anytime by upgrading your plan.",
								)}
								href="/dashboard/billing/upgrade"
							/>
							<div className="border-t" />
							<SidebarItem
								icon={<ReceiptText className="size-6 text-orange-400" />}
								title={t(
									"billing.sidebar.historyTitle",
									"Full Transaction History",
								)}
								description={t(
									"billing.sidebar.historyDesc",
									"View a complete log of all credit transactions for transparency and auditing.",
								)}
								href="/dashboard/billing/history"
							/>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}

function SidebarItem({
	icon,
	title,
	description,
	href,
}: {
	icon: React.ReactNode;
	title: string;
	description: string;
	href: string;
}) {
	const { t } = useTranslation();
	return (
		<div className="flex flex-col gap-2.5">
			<div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-950/30">
				{icon}
			</div>
			<p className="font-semibold text-sm">{title}</p>
			<p className="text-muted-foreground text-sm">{description}</p>
			<Link
				to={href}
				className="font-medium text-primary text-sm underline decoration-dashed underline-offset-4 hover:text-primary/80"
			>
				{t("billing.learnMore", "Learn more")}
			</Link>
		</div>
	);
}
