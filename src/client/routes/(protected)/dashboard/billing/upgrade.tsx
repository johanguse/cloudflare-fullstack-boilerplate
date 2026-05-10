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
import { trpc } from "@client/lib/trpc-client";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/(protected)/dashboard/billing/upgrade")({
	component: UpgradePage,
});

interface Plan {
	id: string;
	name: string;
	price: string;
	period: string;
	credits: number;
	popular?: boolean;
	features: string[];
	stripePriceId: string;
}

const PLANS: Plan[] = [
	{
		id: "starter",
		name: "Starter",
		price: "$4.99",
		period: "/month",
		credits: 200,
		features: [
			"200 credits/month",
			"3 websites",
			"Weekly auto-updates",
			"Email support",
		],
		stripePriceId: import.meta.env.VITE_STRIPE_PRICE_STARTER ?? "",
	},
	{
		id: "professional",
		name: "Professional",
		price: "$12.99",
		period: "/month",
		credits: 600,
		popular: true,
		features: [
			"600 credits/month",
			"10 websites",
			"Daily auto-updates",
			"Priority support",
			"API access",
		],
		stripePriceId: import.meta.env.VITE_STRIPE_PRICE_PROFESSIONAL ?? "",
	},
	{
		id: "business",
		name: "Business",
		price: "$29.99",
		period: "/month",
		credits: 1500,
		features: [
			"1,500 credits/month",
			"25 websites",
			"Hourly auto-updates",
			"Dedicated support",
			"Team management",
		],
		stripePriceId: import.meta.env.VITE_STRIPE_PRICE_BUSINESS ?? "",
	},
	{
		id: "agency",
		name: "Agency",
		price: "$69.99",
		period: "/month",
		credits: 4000,
		features: [
			"4,000 credits/month",
			"Unlimited websites",
			"Real-time updates",
			"Account manager",
			"White-label options",
		],
		stripePriceId: import.meta.env.VITE_STRIPE_PRICE_AGENCY ?? "",
	},
];

const PLAN_ORDER = ["free", "starter", "professional", "business", "agency"];

function UpgradePage() {
	const subQuery = trpc.billing.getSubscription.useQuery();
	const checkoutMutation = trpc.billing.createCheckoutSession.useMutation({
		onSuccess: ({ url }) => {
			if (url) window.location.href = url;
			else toast.error("No checkout URL returned");
		},
		onError: (err) => toast.error(err.message ?? "Failed to start checkout"),
	});

	const currentPlan = subQuery.data?.plan ?? "free";
	const currentPlanIdx = PLAN_ORDER.indexOf(currentPlan);

	const handleUpgrade = (stripePriceId: string) => {
		if (!stripePriceId) {
			toast.error(
				"Stripe Price ID not configured. Set VITE_STRIPE_PRICE_* in .env.",
			);
			return;
		}
		checkoutMutation.mutate({ priceId: stripePriceId });
	};

	return (
		<DashboardLayout>
			<div className="max-w-5xl space-y-6">
				<div>
					<h1 className="font-semibold text-2xl tracking-tight">
						Upgrade your plan
					</h1>
					<p className="text-muted-foreground text-sm">
						Choose the plan that fits your needs. Credits never expire.
					</p>
				</div>

				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{PLANS.map((plan) => {
						const isCurrent = currentPlan === plan.id;
						const planIdx = PLAN_ORDER.indexOf(plan.id);
						const isDowngrade = planIdx < currentPlanIdx;

						return (
							<Card
								key={plan.id}
								className={`relative flex flex-col ${plan.popular ? "border-primary shadow-md" : ""}`}
							>
								{plan.popular && (
									<div className="-top-3 -translate-x-1/2 absolute left-1/2">
										<Badge className="gap-1">
											<Zap className="h-3 w-3" />
											Most popular
										</Badge>
									</div>
								)}
								<CardHeader className="pb-2">
									<CardTitle className="text-base">{plan.name}</CardTitle>
									<CardDescription>
										<span className="font-bold text-2xl text-foreground">
											{plan.price}
										</span>
										<span className="text-muted-foreground text-sm">
											{plan.period}
										</span>
									</CardDescription>
								</CardHeader>
								<CardContent className="flex-1 space-y-2 pb-4">
									{plan.features.map((f) => (
										<div key={f} className="flex items-center gap-2 text-sm">
											<Check className="h-3.5 w-3.5 shrink-0 text-green-500" />
											{f}
										</div>
									))}
								</CardContent>
								<CardFooter>
									{isCurrent ? (
										<Button variant="outline" className="w-full" disabled>
											Current plan
										</Button>
									) : (
										<Button
											className="w-full"
											variant={plan.popular ? "default" : "outline"}
											disabled={checkoutMutation.isPending || isDowngrade}
											onClick={() => handleUpgrade(plan.stripePriceId)}
										>
											{checkoutMutation.isPending && (
												<Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
											)}
											{isDowngrade ? "Downgrade via portal" : "Upgrade"}
										</Button>
									)}
								</CardFooter>
							</Card>
						);
					})}
				</div>

				<p className="text-center text-muted-foreground text-xs">
					All plans include a 14-day free trial. Cancel anytime. No credit card
					required for Free.
				</p>
			</div>
		</DashboardLayout>
	);
}
