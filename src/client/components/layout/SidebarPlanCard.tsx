import { Badge } from "@client/components/ui/badge";
import { Button } from "@client/components/ui/button";
import {
	SidebarMenu,
	SidebarMenuItem,
	useSidebar,
} from "@client/components/ui/sidebar";
import { Skeleton } from "@client/components/ui/skeleton";
import { formatDate, formatNumber } from "@client/lib/formatters";
import { trpc } from "@client/lib/trpc-client";
import { cn } from "@client/lib/utils";
import { Link } from "@tanstack/react-router";
import { Calendar, Coins, CreditCard, Sparkles, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";

const FREE_CREDIT_MAX = 100;

function MiniProgress({
	value,
	className,
}: {
	value: number;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"relative h-1.5 w-full overflow-hidden rounded-full bg-muted",
				className,
			)}
		>
			<div
				className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all"
				style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
			/>
		</div>
	);
}

export function SidebarPlanCard() {
	const { state } = useSidebar();
	const { t } = useTranslation();
	const { data, isPending } = trpc.billing.getSubscription.useQuery();

	const plan = data?.plan ?? "free";
	const isPaid = plan !== "free";
	const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
	const credits = data?.creditBalance ?? 0;
	const cancelAtEnd = data?.cancelAtPeriodEnd ?? false;
	const renewDate = data?.currentPeriodEnd
		? formatDate(data.currentPeriodEnd, {
				month: "short",
				day: "numeric",
				year: "numeric",
			})
		: null;

	if (state === "collapsed") {
		return (
			<SidebarMenu>
				<SidebarMenuItem>
					<Link to="/dashboard/billing">
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8 text-muted-foreground hover:text-foreground"
							title={planLabel}
						>
							{isPaid ? (
								<CreditCard className="size-4" />
							) : (
								<Sparkles className="size-4" />
							)}
						</Button>
					</Link>
				</SidebarMenuItem>
			</SidebarMenu>
		);
	}

	if (isPending) {
		return (
			<div className="mx-2 mb-1 space-y-2 rounded-lg border p-3">
				<div className="flex items-center gap-2">
					<Skeleton className="size-7 rounded-full" />
					<div className="space-y-1">
						<Skeleton className="h-3.5 w-20" />
						<Skeleton className="h-3 w-28" />
					</div>
				</div>
				<Skeleton className="h-1.5 w-full" />
				<Skeleton className="h-8 w-full" />
			</div>
		);
	}

	if (!isPaid) {
		const creditPct = (credits / FREE_CREDIT_MAX) * 100;
		return (
			<div className="mx-2 mb-1 space-y-3 rounded-lg border bg-gradient-to-br from-primary/10 to-primary/5 p-3">
				<div className="flex items-center gap-2.5">
					<div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/20">
						<Sparkles className="size-3.5 text-primary" />
					</div>
					<div className="min-w-0">
						<p className="truncate font-medium text-sm">
							{t("sidebar.plan.freePlan", "Free Plan")}
						</p>
						<p className="truncate text-muted-foreground text-xs">
							{t("sidebar.plan.unlockMore", "Unlock more features")}
						</p>
					</div>
				</div>

				<div className="space-y-1.5">
					<div className="flex items-center justify-between text-xs">
						<span className="flex items-center gap-1.5 text-muted-foreground">
							<Coins className="size-3" />
							{t("sidebar.plan.credits", "Credits")}
						</span>
						<span className="font-medium tabular-nums">
							{credits} / {FREE_CREDIT_MAX}
						</span>
					</div>
					<MiniProgress value={creditPct} />
				</div>

				<Link to="/dashboard/billing">
					<Button size="sm" className="w-full">
						<Zap className="mr-1.5 size-3" />
						{t("sidebar.plan.upgrade", "Upgrade")}
					</Button>
				</Link>
			</div>
		);
	}

	return (
		<div className="mx-2 mb-1 space-y-3 rounded-lg border bg-card p-3">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15">
						<CreditCard className="size-3 text-primary" />
					</div>
					<span className="font-medium text-sm">{planLabel}</span>
				</div>
				<Badge
					variant={cancelAtEnd ? "destructive" : "secondary"}
					className="h-5 rounded-full px-2 font-semibold text-[10px] uppercase tracking-wider"
				>
					{cancelAtEnd ? t("sidebar.plan.canceling", "Canceling") : "Pro"}
				</Badge>
			</div>

			<div className="space-y-2">
				<div className="flex items-center justify-between text-xs">
					<span className="flex items-center gap-1.5 text-muted-foreground">
						<Coins className="size-3" />
						{t("sidebar.plan.credits", "Credits")}
					</span>
					<span className="font-semibold tabular-nums">
						{formatNumber(credits)}
					</span>
				</div>
				<MiniProgress value={Math.min((credits / 1000) * 100, 100)} />
			</div>

			{renewDate && (
				<div className="flex items-center justify-between border-t pt-2 text-muted-foreground text-xs">
					<span className="flex items-center gap-1.5">
						<Calendar className="size-3" />
						{cancelAtEnd
							? t("sidebar.plan.endsOn", "Ends on")
							: t("sidebar.plan.renewsOn", "Renews on")}
					</span>
					<span>{renewDate}</span>
				</div>
			)}

			<Link to="/dashboard/billing">
				<Button variant="outline" size="sm" className="w-full">
					{t("sidebar.plan.manage", "Manage billing")}
				</Button>
			</Link>
		</div>
	);
}
