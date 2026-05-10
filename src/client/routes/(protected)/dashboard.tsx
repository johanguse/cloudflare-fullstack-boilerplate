import { DashboardLayout } from "@client/components/layout/DashboardLayout";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@client/components/ui/card";
import { Skeleton } from "@client/components/ui/skeleton";
import { trpc } from "@client/lib/trpc-client";
import { createFileRoute } from "@tanstack/react-router";
import { CreditCard, FileText, LayoutDashboard, Receipt } from "lucide-react";

export const Route = createFileRoute("/(protected)/dashboard")({
	component: DashboardPage,
});

function DashboardPage() {
	const profileQuery = trpc.user.getProfile.useQuery();

	return (
		<DashboardLayout>
			<div className="space-y-6">
				{/* Header */}
				<div>
					<h1 className="font-semibold text-2xl tracking-tight">Dashboard</h1>
					<p className="text-muted-foreground text-sm">
						Welcome back{profileQuery.data ? "" : ""}. Here's an overview of
						your account.
					</p>
				</div>

				{/* KPI Cards */}
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<StatCard
						title="Invoices"
						value="0"
						description="Total invoices"
						icon={Receipt}
						loading={false}
					/>
					<StatCard
						title="Revenue"
						value="R$ 0,00"
						description="This month"
						icon={CreditCard}
						loading={false}
					/>
					<StatCard
						title="Files"
						value="0"
						description="Documents stored"
						icon={FileText}
						loading={false}
					/>
					<StatCard
						title="Active Plan"
						value="Free"
						description="Current subscription"
						icon={LayoutDashboard}
						loading={false}
					/>
				</div>

				{/* Placeholder content */}
				<div className="grid gap-6 lg:grid-cols-2">
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Recent Invoices</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-muted-foreground text-sm">
								No invoices yet. Invoices will appear here after your first
								payment.
							</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="text-base">Quick Actions</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							<p className="text-muted-foreground text-sm">
								Configure NFSe settings, manage billing, and view your API keys
								from the sidebar.
							</p>
						</CardContent>
					</Card>
				</div>
			</div>
		</DashboardLayout>
	);
}

function StatCard({
	title,
	value,
	description,
	icon: Icon,
	loading,
}: {
	title: string;
	value: string;
	description: string;
	icon: React.ComponentType<{ className?: string }>;
	loading: boolean;
}) {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="font-medium text-muted-foreground text-sm">
					{title}
				</CardTitle>
				<Icon className="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				{loading ? (
					<Skeleton className="h-7 w-20" />
				) : (
					<div className="font-semibold text-2xl">{value}</div>
				)}
				<p className="mt-1 text-muted-foreground text-xs">{description}</p>
			</CardContent>
		</Card>
	);
}
