import { DashboardLayout } from "@client/components/layout/DashboardLayout";
import { Badge } from "@client/components/ui/badge";
import { Button } from "@client/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@client/components/ui/card";
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
import { createFileRoute } from "@tanstack/react-router";
import { CreditCard } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/(protected)/dashboard/billing/history")({
	component: BillingHistoryPage,
});

const PAGE_SIZE = 20;

const txTypeVariant: Record<
	string,
	"default" | "secondary" | "destructive" | "outline"
> = {
	purchase: "default",
	subscription_grant: "secondary",
	usage: "outline",
	refund: "default",
	adjustment: "secondary",
};

const txTypeLabel: Record<string, string> = {
	purchase: "Purchase",
	subscription_grant: "Plan grant",
	usage: "Usage",
	refund: "Refund",
	adjustment: "Adjustment",
};

function BillingHistoryPage() {
	const [page, setPage] = useState(0);
	const historyQuery = trpc.billing.getHistory.useQuery({
		limit: PAGE_SIZE,
		offset: page * PAGE_SIZE,
	});

	const rows = historyQuery.data ?? [];

	return (
		<DashboardLayout>
			<div className="max-w-3xl space-y-6">
				<div>
					<h1 className="font-semibold text-2xl tracking-tight">
						Credit history
					</h1>
					<p className="text-muted-foreground text-sm">
						All your credit transactions
					</p>
				</div>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">Transactions</CardTitle>
						<CardDescription>
							Credits added and deducted from your account
						</CardDescription>
					</CardHeader>
					<CardContent>
						{historyQuery.isLoading ? (
							<div className="space-y-2">
								{[1, 2, 3, 4, 5].map((i) => (
									<Skeleton key={i} className="h-12 w-full" />
								))}
							</div>
						) : rows.length === 0 ? (
							<div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
								<CreditCard className="h-10 w-10 opacity-30" />
								<p className="text-sm">No transactions yet</p>
								<p className="text-xs">
									Credits will appear here after purchases or usage
								</p>
							</div>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Description</TableHead>
										<TableHead>Type</TableHead>
										<TableHead>Date</TableHead>
										<TableHead className="text-right">Credits</TableHead>
										<TableHead className="text-right">Balance after</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{rows.map((tx) => (
										<TableRow key={tx.id}>
											<TableCell className="max-w-[200px] truncate text-sm">
												{tx.description}
											</TableCell>
											<TableCell>
												<Badge
													variant={txTypeVariant[tx.type] ?? "outline"}
													className="text-xs"
												>
													{txTypeLabel[tx.type] ?? tx.type}
												</Badge>
											</TableCell>
											<TableCell className="text-muted-foreground text-xs">
												{tx.createdAt
													? new Date(tx.createdAt).toLocaleDateString()
													: "—"}
											</TableCell>
											<TableCell className="text-right">
												<span
													className={`font-mono font-semibold text-sm ${tx.amount > 0 ? "text-green-600" : "text-destructive"}`}
												>
													{tx.amount > 0 ? "+" : ""}
													{tx.amount}
												</span>
											</TableCell>
											<TableCell className="text-right font-mono text-muted-foreground text-sm">
												{tx.balanceAfter}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</CardContent>
					{rows.length === PAGE_SIZE && (
						<div className="flex justify-between border-t px-4 py-3">
							<Button
								variant="outline"
								size="sm"
								disabled={page === 0}
								onClick={() => setPage((p) => p - 1)}
							>
								Previous
							</Button>
							<Button
								variant="outline"
								size="sm"
								disabled={rows.length < PAGE_SIZE}
								onClick={() => setPage((p) => p + 1)}
							>
								Next
							</Button>
						</div>
					)}
				</Card>
			</div>
		</DashboardLayout>
	);
}
