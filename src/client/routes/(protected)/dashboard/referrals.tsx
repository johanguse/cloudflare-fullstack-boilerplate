import { Badge } from "@client/components/ui/badge";
import { Button } from "@client/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@client/components/ui/card";
import { Input } from "@client/components/ui/input";
import { Label } from "@client/components/ui/label";
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
import { buildReferralLink } from "@shared/referral";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Gift, Loader2, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export const Route = createFileRoute("/(protected)/dashboard/referrals")({
	component: ReferralsPage,
});

const LIST_INPUT = { limit: 50, offset: 0 };

function ReferralsPage() {
	const { t } = useTranslation();
	const utils = trpc.useUtils();
	const dashboardQuery = trpc.referral.getDashboard.useQuery();
	const listQuery = trpc.referral.list.useQuery(LIST_INPUT);

	const [slug, setSlug] = useState("");
	const [copied, setCopied] = useState(false);

	const code = dashboardQuery.data?.code ?? "";
	useEffect(() => {
		if (code) setSlug(code);
	}, [code]);

	const origin = typeof window !== "undefined" ? window.location.origin : "";
	const referralLink = code ? buildReferralLink(origin, code) : "";

	const updateSlug = trpc.referral.updateSlug.useMutation({
		onSuccess: () => {
			utils.referral.getDashboard.invalidate();
			toast.success(t("referral.slugUpdated", "Referral link updated"));
		},
		onError: (e) => toast.error(e.message),
	});

	const referrerReward = dashboardQuery.data?.rewardCredits.referrer ?? 50;
	const referredReward = dashboardQuery.data?.rewardCredits.referred ?? 50;

	const copyLink = async () => {
		if (!referralLink) return;
		try {
			await navigator.clipboard.writeText(referralLink);
			setCopied(true);
			toast.success(t("referral.linkCopied", "Referral link copied"));
			setTimeout(() => setCopied(false), 2000);
		} catch {
			toast.error(t("referral.copyFailed", "Could not copy link"));
		}
	};

	const slugChanged = slug !== code && slug.trim().length > 0;

	return (
		<div className="w-full space-y-6">
			<div>
				<h1 className="font-semibold text-2xl tracking-tight">
					{t("referral.title", "Refer & earn")}
				</h1>
				<p className="text-muted-foreground text-sm">
					{t(
						"referral.subtitle",
						"Give {{referred}} credits, get {{referrer}} credits when a friend subscribes.",
						{ referred: referredReward, referrer: referrerReward },
					)}
				</p>
			</div>

			<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-base">
							<Gift className="size-4 text-primary" />
							{t("referral.shareTitle", "Your referral link")}
						</CardTitle>
						<CardDescription>
							{t(
								"referral.shareDescription",
								"Share this link. When someone signs up through it and makes their first subscription payment, you both get credits.",
							)}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-5">
						<div className="space-y-2">
							<Label htmlFor="referral-link">
								{t("referral.linkLabel", "Referral link")}
							</Label>
							<div className="flex gap-2">
								<Input
									id="referral-link"
									readOnly
									value={
										dashboardQuery.isPending
											? t("referral.loading", "Loading…")
											: referralLink
									}
									className="font-mono text-xs"
								/>
								<Button
									type="button"
									variant="outline"
									size="icon"
									aria-label={t("referral.copy", "Copy link")}
									disabled={!referralLink}
									onClick={copyLink}
								>
									{copied ? (
										<Check className="size-4 text-green-600" />
									) : (
										<Copy className="size-4" />
									)}
								</Button>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="referral-slug">
								{t("referral.customizeLabel", "Customize your link")}
							</Label>
							<div className="flex flex-wrap gap-2">
								<div className="flex flex-1 items-center rounded-md border pl-3 text-muted-foreground text-sm focus-within:ring-1 focus-within:ring-ring">
									<span className="shrink-0 select-none">/r/</span>
									<Input
										id="referral-slug"
										value={slug}
										onChange={(e) =>
											setSlug(e.target.value.toLowerCase().replace(/\s+/g, ""))
										}
										className="border-0 pl-1 shadow-none focus-visible:ring-0"
										placeholder="your-name"
										maxLength={32}
									/>
								</div>
								<Button
									type="button"
									disabled={!slugChanged || updateSlug.isPending}
									onClick={() => updateSlug.mutate({ slug: slug.trim() })}
								>
									{updateSlug.isPending && (
										<Loader2 className="mr-2 size-4 animate-spin" />
									)}
									{t("referral.save", "Save")}
								</Button>
							</div>
							<p className="text-muted-foreground text-xs">
								{t(
									"referral.slugHint",
									"4–32 lowercase letters, numbers, or hyphens.",
								)}
							</p>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-base">
							{t("referral.statsTitle", "Your rewards")}
						</CardTitle>
						<CardDescription>
							{t("referral.statsDescription", "Referral activity summary")}
						</CardDescription>
					</CardHeader>
					<CardContent className="grid grid-cols-2 gap-4">
						<Stat
							label={t("referral.stats.total", "Referred")}
							value={dashboardQuery.data?.stats.total ?? 0}
							loading={dashboardQuery.isPending}
						/>
						<Stat
							label={t("referral.stats.rewarded", "Qualified")}
							value={dashboardQuery.data?.stats.rewarded ?? 0}
							loading={dashboardQuery.isPending}
						/>
						<Stat
							label={t("referral.stats.pending", "Pending")}
							value={dashboardQuery.data?.stats.pending ?? 0}
							loading={dashboardQuery.isPending}
						/>
						<Stat
							label={t("referral.stats.creditsEarned", "Credits earned")}
							value={dashboardQuery.data?.stats.creditsEarned ?? 0}
							loading={dashboardQuery.isPending}
						/>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-base">
						{t("referral.listTitle", "Your referrals")}
					</CardTitle>
					<CardDescription>
						{t(
							"referral.listDescription",
							"People who signed up with your link.",
						)}
					</CardDescription>
				</CardHeader>
				<CardContent className="p-0">
					{listQuery.isPending ? (
						<div className="space-y-3 p-6">
							{Array.from({ length: 3 }).map((_, i) => (
								<Skeleton key={i} className="h-10 w-full" />
							))}
						</div>
					) : (listQuery.data?.length ?? 0) === 0 ? (
						<div className="flex flex-col items-center justify-center py-14 text-center">
							<Users className="mb-3 size-10 text-muted-foreground/40" />
							<p className="font-medium text-sm">
								{t("referral.empty", "No referrals yet")}
							</p>
							<p className="mt-1 max-w-xs text-muted-foreground text-sm">
								{t(
									"referral.emptyHint",
									"Share your link to start earning credits.",
								)}
							</p>
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>{t("referral.table.user", "User")}</TableHead>
									<TableHead>{t("referral.table.status", "Status")}</TableHead>
									<TableHead className="text-right">
										{t("referral.table.date", "Joined")}
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{listQuery.data?.map((row) => (
									<TableRow key={row.id}>
										<TableCell>
											<div className="font-medium">{row.name ?? "—"}</div>
											<div className="text-muted-foreground text-xs">
												{row.email}
											</div>
										</TableCell>
										<TableCell>
											<ReferralStatusBadge status={row.status} />
										</TableCell>
										<TableCell className="text-right text-muted-foreground text-sm">
											{new Date(row.createdAt).toLocaleDateString(undefined, {
												year: "numeric",
												month: "short",
												day: "numeric",
											})}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

function Stat({
	label,
	value,
	loading,
}: {
	label: string;
	value: number;
	loading: boolean;
}) {
	return (
		<div>
			{loading ? (
				<Skeleton className="h-8 w-14" />
			) : (
				<div className="font-semibold text-2xl tabular-nums">{value}</div>
			)}
			<p className="mt-1 text-muted-foreground text-xs">{label}</p>
		</div>
	);
}

function ReferralStatusBadge({ status }: { status: string }) {
	const { t } = useTranslation();
	const variant = useMemo(() => {
		if (status === "rewarded") return "default" as const;
		if (status === "rejected") return "destructive" as const;
		return "secondary" as const;
	}, [status]);
	return (
		<Badge variant={variant}>{t(`referral.status.${status}`, status)}</Badge>
	);
}
