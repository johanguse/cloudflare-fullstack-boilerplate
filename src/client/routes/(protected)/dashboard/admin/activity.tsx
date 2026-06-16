import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@client/components/ui/card";
import { Separator } from "@client/components/ui/separator";
import { Skeleton } from "@client/components/ui/skeleton";
import { trpc } from "@client/lib/trpc-client";
import { cn } from "@client/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import { CreditCard, LogIn } from "lucide-react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/(protected)/dashboard/admin/activity")({
	component: AdminActivityPage,
});

const TYPE_CONFIG = {
	sign_in: {
		icon: LogIn,
		label: "Signed in",
		className: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
	},
	payment: {
		icon: CreditCard,
		label: "Payment",
		className: "bg-green-500/10 text-green-600 dark:text-green-400",
	},
} as const;

function AdminActivityPage() {
	const { t } = useTranslation();
	const { data: events, isPending } = trpc.admin.getActivity.useQuery();

	const fmtDate = (d: Date | string | null | undefined) => {
		if (!d) return "—";
		return new Date(d).toLocaleString(undefined, {
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	return (
		<div className="space-y-6">
			<div>
				<h1 className="font-semibold text-2xl tracking-tight">
					{t("admin.activity.title", "Activity Logs")}
				</h1>
				<p className="text-muted-foreground text-sm">
					{t("admin.activity.subtitle", "Recent sign-ins and payment events across the platform.")}
				</p>
			</div>
			<Separator />

			<Card>
				<CardHeader>
					<CardTitle className="text-base">
						{t("admin.activity.recent", "Recent events")}
					</CardTitle>
					<CardDescription>
						{isPending
							? "..."
							: t("admin.activity.count", "{{count}} events", {
									count: events?.length ?? 0,
								})}
					</CardDescription>
				</CardHeader>
				<CardContent className="p-0">
					{isPending ? (
						<div className="divide-y">
							{Array.from({ length: 8 }).map((_, i) => (
								<div key={i} className="flex items-center gap-3 px-6 py-3">
									<Skeleton className="size-8 rounded-full" />
									<div className="flex-1 space-y-1">
										<Skeleton className="h-4 w-40" />
										<Skeleton className="h-3 w-28" />
									</div>
									<Skeleton className="h-3 w-20" />
								</div>
							))}
						</div>
					) : events?.length === 0 ? (
						<p className="px-6 py-8 text-center text-muted-foreground text-sm">
							{t("admin.activity.empty", "No recent activity found.")}
						</p>
					) : (
						<div className="divide-y">
							{events?.map((event) => {
								const cfg = TYPE_CONFIG[event.type];
								const Icon = cfg.icon;
								return (
									<div
										key={event.id}
										className="flex items-center gap-3 px-6 py-3"
									>
										<div
											className={cn(
												"flex size-8 shrink-0 items-center justify-center rounded-full",
												cfg.className,
											)}
										>
											<Icon className="size-3.5" />
										</div>
										<div className="min-w-0 flex-1">
											<p className="truncate text-sm">
												<span className="font-medium">
													{event.userName || event.userEmail}
												</span>
												{" "}
												<span className="text-muted-foreground">
													{cfg.label.toLowerCase()}
													{event.detail ? ` · ${event.detail}` : ""}
												</span>
											</p>
											<p className="truncate text-muted-foreground text-xs">
												{event.userEmail}
											</p>
										</div>
										<time className="shrink-0 text-muted-foreground text-xs tabular-nums">
											{fmtDate(event.createdAt)}
										</time>
									</div>
								);
							})}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
