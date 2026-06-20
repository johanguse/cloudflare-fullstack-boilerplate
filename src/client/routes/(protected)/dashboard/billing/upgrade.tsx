import { Alert, AlertDescription } from "@client/components/ui/alert";
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
import { Label } from "@client/components/ui/label";
import { Switch } from "@client/components/ui/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableRow,
} from "@client/components/ui/table";
import { trpc } from "@client/lib/trpc-client";
import { cn } from "@client/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Check, Loader2, Zap } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export const Route = createFileRoute("/(protected)/dashboard/billing/upgrade")({
	component: UpgradePage,
});

interface Plan {
	id: string;
	name: string;
	description: string;
	monthlyPrice: string;
	annualPrice: string;
	credits: number;
	popular?: boolean;
	websites: string;
	updateFrequency: string;
	support: string;
	apiAccess: boolean;
	teamManagement: boolean;
	features: string[];
	monthlyStripePriceId: string;
	annualStripePriceId: string;
}

type BillingCycle = "monthly" | "annual";

const PLANS: Plan[] = [
	{
		id: "free",
		name: "Free",
		description: "Essential features to get started",
		monthlyPrice: "$0",
		annualPrice: "$0",
		credits: 50,
		websites: "1",
		updateFrequency: "Manual only",
		support: "Community",
		apiAccess: false,
		teamManagement: false,
		features: [
			"50 credits/month",
			"1 website",
			"Manual regeneration only",
			"Community support",
		],
		monthlyStripePriceId: "",
		annualStripePriceId: "",
	},
	{
		id: "starter",
		name: "Starter",
		description: "Simple tools for small projects",
		monthlyPrice: "$4.99",
		annualPrice: "$3.99",
		credits: 200,
		websites: "3",
		updateFrequency: "Weekly",
		support: "Email",
		apiAccess: false,
		teamManagement: false,
		features: [
			"200 credits/month",
			"3 websites",
			"Weekly auto-updates",
			"Email support",
		],
		monthlyStripePriceId: import.meta.env.VITE_STRIPE_PRICE_STARTER ?? "",
		annualStripePriceId: import.meta.env.VITE_STRIPE_PRICE_STARTER_ANNUAL ?? "",
	},
	{
		id: "professional",
		name: "Professional",
		description: "Advanced tools for growing teams",
		monthlyPrice: "$12.99",
		annualPrice: "$9.99",
		credits: 600,
		popular: true,
		websites: "10",
		updateFrequency: "Daily",
		support: "Priority",
		apiAccess: true,
		teamManagement: false,
		features: [
			"600 credits/month",
			"10 websites",
			"Daily auto-updates",
			"Priority support",
			"API access",
		],
		monthlyStripePriceId: import.meta.env.VITE_STRIPE_PRICE_PROFESSIONAL ?? "",
		annualStripePriceId:
			import.meta.env.VITE_STRIPE_PRICE_PROFESSIONAL_ANNUAL ?? "",
	},
	{
		id: "business",
		name: "Business",
		description: "Higher limits for business operations",
		monthlyPrice: "$29.99",
		annualPrice: "$24.99",
		credits: 1500,
		websites: "25",
		updateFrequency: "Hourly",
		support: "Dedicated",
		apiAccess: true,
		teamManagement: true,
		features: [
			"1,500 credits/month",
			"25 websites",
			"Hourly auto-updates",
			"Dedicated support",
			"Team management",
		],
		monthlyStripePriceId: import.meta.env.VITE_STRIPE_PRICE_BUSINESS ?? "",
		annualStripePriceId:
			import.meta.env.VITE_STRIPE_PRICE_BUSINESS_ANNUAL ?? "",
	},
];

const PLAN_ORDER = ["free", "starter", "professional", "business"];

const stripeUnconfigured = PLANS.filter((p) => p.id !== "free").every(
	(p) => !p.monthlyStripePriceId && !p.annualStripePriceId,
);

const getPlanPrice = (plan: Plan, billingCycle: BillingCycle) =>
	billingCycle === "annual" ? plan.annualPrice : plan.monthlyPrice;

const getPlanStripePriceId = (plan: Plan, billingCycle: BillingCycle) =>
	billingCycle === "annual"
		? plan.annualStripePriceId
		: plan.monthlyStripePriceId;

function UpgradePage() {
	const { t } = useTranslation();
	const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
	const subQuery = trpc.billing.getSubscription.useQuery();
	const checkoutMutation = trpc.billing.createCheckoutSession.useMutation({
		onSuccess: ({ url }) => {
			if (url) window.location.href = url;
			else toast.error(t("upgrade.noCheckoutUrl", "No checkout URL returned"));
		},
		onError: (err) =>
			toast.error(
				err.message ??
					t("upgrade.failedToStartCheckout", "Failed to start checkout"),
			),
	});

	const currentPlan = subQuery.data?.plan ?? "free";
	const currentPlanIdx = PLAN_ORDER.includes(currentPlan)
		? PLAN_ORDER.indexOf(currentPlan)
		: PLAN_ORDER.length;

	const handleUpgrade = (plan: Plan) => {
		const stripePriceId = getPlanStripePriceId(plan, billingCycle);

		if (!stripePriceId) {
			toast.error(
				t(
					"upgrade.priceNotConfigured",
					"Stripe Price ID not configured. Set VITE_STRIPE_PRICE_* in .env.",
				),
			);
			return;
		}
		checkoutMutation.mutate({ priceId: stripePriceId });
	};

	const getPlanActionState = (plan: Plan) => {
		const isCurrent = currentPlan === plan.id;
		const planIdx = PLAN_ORDER.indexOf(plan.id);
		const isDowngrade = planIdx < currentPlanIdx;
		const isPaid = plan.id !== "free";
		const stripePriceId = getPlanStripePriceId(plan, billingCycle);
		const isDisabled =
			isPaid && !stripePriceId
				? true
				: checkoutMutation.isPending || isDowngrade;

		return { isCurrent, isDowngrade, isPaid, isDisabled };
	};

	return (
		<div className="w-full space-y-6">
			<div>
				<h1 className="font-semibold text-2xl tracking-tight">
					{t("upgrade.title", "Upgrade your plan")}
				</h1>
				<p className="text-muted-foreground text-sm">
					{t(
						"upgrade.subtitle",
						"Choose the plan that fits your needs. Credits never expire.",
					)}
				</p>
			</div>

			{stripeUnconfigured && (
				<Alert>
					<AlertTriangle className="size-4" />
					<AlertDescription>
						{t(
							"upgrade.stripeNotConfigured",
							"Stripe is not configured. Set VITE_STRIPE_PRICE_STARTER, VITE_STRIPE_PRICE_PROFESSIONAL, and VITE_STRIPE_PRICE_BUSINESS in your .env to enable paid plans.",
						)}
					</AlertDescription>
				</Alert>
			)}

			<div className="flex justify-end">
				<BillingCycleToggle
					id="cards-annual-billing"
					billingCycle={billingCycle}
					setBillingCycle={setBillingCycle}
				/>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				{PLANS.map((plan) => {
					const { isCurrent, isDowngrade, isPaid, isDisabled } =
						getPlanActionState(plan);

					return (
						<Card
							key={plan.id}
							className={`relative flex flex-col ${plan.popular ? "border-primary shadow-md" : ""} ${isCurrent ? "bg-muted/30" : ""}`}
						>
							{plan.popular && (
								<div className="-top-3 -translate-x-1/2 absolute left-1/2">
									<Badge className="gap-1">
										<Zap className="size-3" />
										{t("upgrade.mostPopular", "Most popular")}
									</Badge>
								</div>
							)}
							<CardHeader className="pb-2">
								<CardTitle className="text-base">{plan.name}</CardTitle>
								<CardDescription>
									<span className="font-bold text-2xl text-foreground">
										{getPlanPrice(plan, billingCycle)}
									</span>
									{plan.id !== "free" && (
										<span className="text-muted-foreground text-sm">
											{t("upgrade.perMonth", "/month")}
										</span>
									)}
								</CardDescription>
							</CardHeader>
							<CardContent className="flex-1 space-y-2 pb-4">
								{plan.features.map((f) => (
									<div key={f} className="flex items-center gap-2 text-sm">
										<Check className="size-3.5 shrink-0 text-green-500" />
										{f}
									</div>
								))}
							</CardContent>
							<CardFooter>
								{isCurrent ? (
									<Button variant="outline" className="w-full" disabled>
										{t("upgrade.currentPlan", "Current plan")}
									</Button>
								) : (
									<Button
										className="w-full"
										variant={plan.popular ? "default" : "outline"}
										disabled={isDisabled}
										onClick={() => handleUpgrade(plan)}
									>
										{checkoutMutation.isPending && (
											<Loader2 className="mr-2 size-3.5 animate-spin" />
										)}
										{isPaid && !getPlanStripePriceId(plan, billingCycle)
											? t("upgrade.notConfigured", "Not configured")
											: isDowngrade
												? t("upgrade.downgrade", "Downgrade via portal")
												: t("upgrade.upgrade", "Upgrade")}
									</Button>
								)}
							</CardFooter>
						</Card>
					);
				})}
			</div>

			<PricingComparisonTable
				billingCycle={billingCycle}
				setBillingCycle={setBillingCycle}
				getPlanActionState={getPlanActionState}
				handleUpgrade={handleUpgrade}
				isPending={checkoutMutation.isPending}
			/>

			<p className="text-center text-muted-foreground text-xs">
				{t(
					"upgrade.footer",
					"All plans include a 14-day free trial. Cancel anytime. No credit card required for Free.",
				)}
			</p>
		</div>
	);
}

function BillingCycleToggle({
	id,
	billingCycle,
	setBillingCycle,
}: {
	id: string;
	billingCycle: BillingCycle;
	setBillingCycle: (billingCycle: BillingCycle) => void;
}) {
	const { t } = useTranslation();
	const annual = billingCycle === "annual";

	return (
		<div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 shadow-xs">
			<Switch
				id={id}
				checked={annual}
				onCheckedChange={(checked) =>
					setBillingCycle(checked ? "annual" : "monthly")
				}
			/>
			<Label htmlFor={id} className="font-medium text-sm">
				{t("upgrade.annualBilling", "Annual billing")}
			</Label>
			<Badge variant="secondary" className="ml-1">
				{t("upgrade.save", "Save")}
			</Badge>
		</div>
	);
}

function PricingComparisonTable({
	billingCycle,
	setBillingCycle,
	getPlanActionState,
	handleUpgrade,
	isPending,
}: {
	billingCycle: BillingCycle;
	setBillingCycle: (billingCycle: BillingCycle) => void;
	getPlanActionState: (plan: Plan) => {
		isCurrent: boolean;
		isDowngrade: boolean;
		isPaid: boolean;
		isDisabled: boolean;
	};
	handleUpgrade: (plan: Plan) => void;
	isPending: boolean;
}) {
	const { t } = useTranslation();

	return (
		<Card>
			<CardContent className="p-0">
				<Table className="mt-3 min-w-[1000px] table-fixed border-separate border-spacing-0 rounded-xl text-foreground">
					<TableBody>
						<TableRow className="*:border-border hover:bg-transparent">
							<TableCell className="border-b-0 p-5 pt-7 align-bottom">
								<BillingCycleToggle
									id="table-annual-billing"
									billingCycle={billingCycle}
									setBillingCycle={setBillingCycle}
								/>
							</TableCell>
							{PLANS.map((plan) => (
								<PlanHeaderCell
									key={plan.id}
									plan={plan}
									billingCycle={billingCycle}
									getPlanActionState={getPlanActionState}
									handleUpgrade={handleUpgrade}
									isPending={isPending}
								/>
							))}
						</TableRow>
						<ComparisonRow
							label={t("upgrade.credits", "Credits per month")}
							values={PLANS.map((plan) => plan.credits.toLocaleString())}
							getPlanActionState={getPlanActionState}
						/>
						<ComparisonRow
							label={t("upgrade.websites", "Websites")}
							values={PLANS.map((plan) => plan.websites)}
							getPlanActionState={getPlanActionState}
						/>
						<ComparisonRow
							label={t("upgrade.autoUpdates", "Auto-updates")}
							values={PLANS.map((plan) => plan.updateFrequency)}
							getPlanActionState={getPlanActionState}
						/>
						<ComparisonRow
							label={t("upgrade.support", "Support")}
							values={PLANS.map((plan) => plan.support)}
							getPlanActionState={getPlanActionState}
						/>
						<ComparisonRow
							label={t("upgrade.apiAccess", "API access")}
							values={PLANS.map((plan) => plan.apiAccess)}
							getPlanActionState={getPlanActionState}
						/>
						<ComparisonRow
							label={t("upgrade.teamManagement", "Team management")}
							values={PLANS.map((plan) => plan.teamManagement)}
							getPlanActionState={getPlanActionState}
						/>
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}

function PlanHeaderCell({
	plan,
	billingCycle,
	getPlanActionState,
	handleUpgrade,
	isPending,
}: {
	plan: Plan;
	billingCycle: BillingCycle;
	getPlanActionState: (plan: Plan) => {
		isCurrent: boolean;
		isDowngrade: boolean;
		isPaid: boolean;
		isDisabled: boolean;
	};
	handleUpgrade: (plan: Plan) => void;
	isPending: boolean;
}) {
	const { t } = useTranslation();
	const { isCurrent, isDowngrade, isPaid, isDisabled } =
		getPlanActionState(plan);

	return (
		<TableCell
			className={cn(
				"relative border-t border-b-0 border-l p-5 pt-7 align-middle",
				isCurrent && "bg-muted/40",
				plan.id === PLANS[0]?.id && "rounded-tl-xl",
				plan.id === PLANS[PLANS.length - 1]?.id && "rounded-tr-xl border-r",
			)}
		>
			{isCurrent && (
				<Badge className="-translate-x-1/2 -translate-y-1/2 absolute top-0 left-1/2">
					{t("upgrade.currentPlan", "Current plan")}
				</Badge>
			)}
			<div className="space-y-4">
				<div>
					<div className="flex items-center gap-2">
						<h3 className="font-medium text-lg text-mono">{plan.name}</h3>
						{plan.popular && !isCurrent && (
							<Badge variant="secondary">
								{t("upgrade.mostPopular", "Most popular")}
							</Badge>
						)}
					</div>
					<p className="mt-1 min-h-10 text-muted-foreground text-sm">
						{plan.description}
					</p>
				</div>
				<div>
					<span className="font-semibold text-2xl text-mono leading-none">
						{getPlanPrice(plan, billingCycle)}
					</span>
					{plan.id !== "free" && (
						<span className="ml-1.5 text-muted-foreground text-xs">
							{t("upgrade.perMonthLabel", "per month")}
						</span>
					)}
				</div>
				{isCurrent ? (
					<Button variant="outline" size="sm" className="w-full" disabled>
						{t("upgrade.currentPlan", "Current plan")}
					</Button>
				) : (
					<Button
						size="sm"
						className="w-full"
						variant={plan.popular ? "default" : "outline"}
						disabled={isDisabled}
						onClick={() => handleUpgrade(plan)}
					>
						{isPending && <Loader2 className="mr-2 size-3.5 animate-spin" />}
						{isPaid && !getPlanStripePriceId(plan, billingCycle)
							? t("upgrade.notConfigured", "Not configured")
							: isDowngrade
								? t("upgrade.downgrade", "Downgrade via portal")
								: t("upgrade.upgrade", "Upgrade")}
					</Button>
				)}
			</div>
		</TableCell>
	);
}

function ComparisonRow({
	label,
	values,
	getPlanActionState,
}: {
	label: string;
	values: Array<string | boolean>;
	getPlanActionState: (plan: Plan) => {
		isCurrent: boolean;
		isDowngrade: boolean;
		isPaid: boolean;
		isDisabled: boolean;
	};
}) {
	return (
		<TableRow className="hover:bg-transparent">
			<TableCell className="border-b border-l px-5 py-3.5 font-medium text-mono text-sm">
				{label}
			</TableCell>
			{values.map((value, index) => (
				<TableCell
					key={`${label}-${PLANS[index]?.id ?? index}`}
					className={cn(
						"border-b border-l px-5 py-3.5 text-foreground text-sm",
						PLANS[index] && getPlanActionState(PLANS[index]).isCurrent
							? "bg-muted/40"
							: "",
						index === values.length - 1 && "border-r",
					)}
				>
					{typeof value === "boolean" ? (
						value ? (
							<Check className="mx-auto size-4 text-green-500" />
						) : (
							<span className="text-muted-foreground">-</span>
						)
					) : (
						value
					)}
				</TableCell>
			))}
		</TableRow>
	);
}
