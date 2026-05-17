import { Badge } from "@client/components/ui/badge";
import { Button } from "@client/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@client/components/ui/card";
import { Progress } from "@client/components/ui/progress";
import { Skeleton } from "@client/components/ui/skeleton";
import { trpc } from "@client/lib/trpc-client";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import {
	AlertCircle,
	CheckCircle2,
	CreditCard,
	ExternalLink,
	Loader2,
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

function BillingPage() {
	const { t } = useTranslation();
	const { success, canceled } = useSearch({
		from: "/(protected)/dashboard/billing/",
	});
	const subQuery = trpc.billing.getSubscription.useQuery();
	const historyQuery = trpc.billing.getHistory.useQuery({ limit: 5, offset: 0 });
	const portalMutation = trpc.billing.getPortalUrl.useMutation({
		onSuccess: ({ url }) => {
			if (url) window.location.href = url;
		},
		onError: (err) =>
			toast.error(err.message ?? "Failed to open billing portal"),
	});

	useEffect(() => {
		if (success) toast.success(t("billing.activated", "Subscription activated! Welcome to your plan."));
		if (canceled) toast.info(t("billing.canceled", "Checkout was canceled."));
	}, [success, canceled, t]);

	const sub = subQuery.data;
	const currentPlanIdx = PLANS.findIndex((p) => p.id === (sub?.plan ?? "free"));

	return (
		<div className="space-y-6">
			<div>
				<h1 className="font-bold text-2xl tracking-tight">
					{t("billing.title", "Billing")}
				</h1>
				<p className="text-muted-foreground text-sm">
					{t("billing.subtitle", "Manage your subscription and credits")}
				</p>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="font-medium text-muted-foreground text-sm">
							{t("billing.currentPlan", "Current plan")}
						</CardTitle>
					</CardHeader>
					<CardContent className="pb-4">
						{subQuery.isLoading ? (
							<Skeleton className="h-7 w-24" />
						) : (
							<div className="flex items-center gap-2">
								<span className="font-bold text-xl capitalize">
									{sub?.plan ?? "Free"}
								</span>
								<Badge
									variant={statusVariant[sub?.status ?? "inactive"] ?? "outline"}
								>
									{sub?.status ?? "inactive"}
								</Badge>
							</div>
						)}
						{sub?.cancelAtPeriodEnd && (
							<p className="mt-1 text-destructive text-xs">
								{t("billing.cancelsAtEnd", "Cancels at end of period")}
							</p>
						)}
					</CardContent>
					<CardFooter className="border-t pt-3">
						{sub?.stripeSubscriptionId ? (
							<Button
								variant="outline"
								size="sm"
								disabled={portalMutation.isPending}
								onClick={() => portalMutation.mutate()}
							>
								{portalMutation.isPending ? (
									<Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
								) : (
									<ExternalLink className="mr-2 h-3.5 w-3.5" />
								)}
								{t("billing.manageSubscription", "Manage subscription")}
							</Button>
						) : (
							<Button
								size="sm"
								onClick={() => {
									window.location.href = "/dashboard/billing/upgrade";
								}}
							>
								<Zap className="mr-2 h-3.5 w-3.5" />
								{t("billing.upgradePlan", "Upgrade plan")}
							</Button>
						)}
					</CardFooter>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="font-medium text-muted-foreground text-sm">
							{t("billing.creditBalance", "Credit balance")}
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3 pb-4">
						{subQuery.isLoading ? (
							<Skeleton className="h-7 w-16" />
						) : (
							<>
								<span className="font-bold text-xl">
									{sub?.creditBalance ?? 0}{" "}
									<span className="font-normal text-muted-foreground text-sm">
										{t("billing.credits", "credits")}
									</span>
								</span>
								<Progress
									value={Math.min(
										((sub?.creditBalance ?? 0) /
											(PLANS[currentPlanIdx]?.credits ?? 50)) *
											100,
										100,
									)}
									className="h-2"
								/>
							</>
						)}
					</CardContent>
					<CardFooter className="border-t pt-3">
						<p className="text-muted-foreground text-xs">
							{t("billing.creditsNote", "Credits are used for site generations")}
						</p>
					</CardFooter>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">
						{t("billing.recentTransactions", "Recent transactions")}
					</CardTitle>
					<CardDescription>
						{t("billing.recentTransactionsDesc", "Your last 5 credit transactions")}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{historyQuery.isLoading ? (
						<div className="space-y-2">
							{[1, 2, 3].map((i) => (
								<Skeleton key={i} className="h-10 w-full" />
							))}
						</div>
					) : historyQuery.data?.length === 0 ? (
						<div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
							<CreditCard className="h-8 w-8 opacity-40" />
							<p className="text-sm">
								{t("billing.noTransactions", "No transactions yet")}
							</p>
						</div>
					) : (
						<div className="divide-y">
							{historyQuery.data?.map((tx) => (
								<div
									key={tx.id}
									className="flex items-center justify-between py-3"
								>
									<div>
										<p className="font-medium text-sm">{tx.description}</p>
										<p className="text-muted-foreground text-xs">
											{tx.createdAt
												? new Date(tx.createdAt).toLocaleDateString()
												: "—"}
										</p>
									</div>
									<div className="flex items-center gap-2">
										<span
											className={`font-mono font-semibold text-sm ${tx.amount > 0 ? "text-green-600" : "text-destructive"}`}
										>
											{tx.amount > 0 ? "+" : ""}
											{tx.amount}
										</span>
										{tx.amount > 0 ? (
											<CheckCircle2 className="h-4 w-4 text-green-500" />
										) : (
											<AlertCircle className="h-4 w-4 text-muted-foreground" />
										)}
									</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
				{(historyQuery.data?.length ?? 0) > 0 && (
					<CardFooter className="border-t pt-3">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => {
								window.location.href = "/dashboard/billing/history";
							}}
						>
							{t("billing.viewAll", "View all transactions")}
						</Button>
					</CardFooter>
				)}
			</Card>
		</div>
	);
}
