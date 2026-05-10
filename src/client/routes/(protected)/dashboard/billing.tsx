import { DashboardLayout } from "@client/components/layout/DashboardLayout";
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
import { toast } from "sonner";
import { z } from "zod";

const billingSearchSchema = z.object({
	success: z.string().optional(),
	canceled: z.string().optional(),
});

export const Route = createFileRoute("/(protected)/dashboard/billing")({
	validateSearch: billingSearchSchema,
	component: BillingPage,
});

const PLANS = [
	{
		id: "free",
		name: "Free",
		price: "$0",
		credits: 50,
		features: [
			"50 credits/month",
			"1 website",
			"Basic generation",
			"Community support",
		],
	},
	{
		id: "starter",
		name: "Starter",
		price: "$4.99",
		credits: 200,
		features: [
			"200 credits/month",
			"3 websites",
			"Weekly updates",
			"Email support",
		],
		priceEnvKey: "VITE_STRIPE_PRICE_STARTER",
	},
	{
		id: "professional",
		name: "Professional",
		price: "$12.99",
		credits: 600,
		popular: true,
		features: [
			"600 credits/month",
			"10 websites",
			"Daily updates",
			"Priority support",
			"API access",
		],
		priceEnvKey: "VITE_STRIPE_PRICE_PROFESSIONAL",
	},
	{
		id: "business",
		name: "Business",
		price: "$29.99",
		credits: 1500,
		features: [
			"1,500 credits/month",
			"25 websites",
			"Hourly updates",
			"Dedicated support",
			"Team management",
		],
		priceEnvKey: "VITE_STRIPE_PRICE_BUSINESS",
	},
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
	const { success, canceled } = useSearch({
		from: "/(protected)/dashboard/billing",
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
			toast.error(err.message ?? "Failed to open billing portal"),
	});

	useEffect(() => {
		if (success) toast.success("Subscription activated! Welcome to your plan.");
		if (canceled) toast.info("Checkout was canceled.");
	}, [success, canceled]);

	const sub = subQuery.data;
	const currentPlanIdx = PLANS.findIndex((p) => p.id === (sub?.plan ?? "free"));

	return (
		<DashboardLayout>
			<div className="max-w-4xl space-y-6">
				<div>
					<h1 className="font-semibold text-2xl tracking-tight">Billing</h1>
					<p className="text-muted-foreground text-sm">
						Manage your subscription and credits
					</p>
				</div>

				{/* Current plan + credit balance */}
				<div className="grid gap-4 sm:grid-cols-2">
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="font-medium text-muted-foreground text-sm">
								Current plan
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
										variant={
											statusVariant[sub?.status ?? "inactive"] ?? "outline"
										}
									>
										{sub?.status ?? "inactive"}
									</Badge>
								</div>
							)}
							{sub?.cancelAtPeriodEnd && (
								<p className="mt-1 text-destructive text-xs">
									Cancels at end of period
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
									Manage subscription
								</Button>
							) : (
								<Button
									size="sm"
									onClick={() => {
										window.location.href = "/dashboard/billing/upgrade";
									}}
								>
									<Zap className="mr-2 h-3.5 w-3.5" />
									Upgrade plan
								</Button>
							)}
						</CardFooter>
					</Card>

					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="font-medium text-muted-foreground text-sm">
								Credit balance
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
											credits
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
								Credits are used for site generations
							</p>
						</CardFooter>
					</Card>
				</div>

				{/* Recent transactions */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Recent transactions</CardTitle>
						<CardDescription>Your last 5 credit transactions</CardDescription>
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
								<p className="text-sm">No transactions yet</p>
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
								View all transactions
							</Button>
						</CardFooter>
					)}
				</Card>
			</div>
		</DashboardLayout>
	);
}
