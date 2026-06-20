import { Badge } from "@client/components/ui/badge";
import { Button } from "@client/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
} from "@client/components/ui/card";
import { Checkbox } from "@client/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuTrigger,
} from "@client/components/ui/dropdown-menu";
import { Input } from "@client/components/ui/input";
import { Label } from "@client/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@client/components/ui/select";
import { Skeleton } from "@client/components/ui/skeleton";
import { Switch } from "@client/components/ui/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@client/components/ui/table";
import { trpc } from "@client/lib/trpc-client";
import { cn } from "@client/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import {
	ArrowDown,
	ChevronLeft,
	ChevronRight,
	ChevronsUpDown,
	CreditCard,
	KeyRound,
	LogIn,
	NotepadText,
	Search,
	Settings2,
} from "lucide-react";
import type * as React from "react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/(protected)/dashboard/admin/activity")({
	component: AdminActivityPage,
});

const ACTIVITY_COLUMNS = [
	"timestamp",
	"eventType",
	"action",
	"sourceIp",
	"destinationIp",
	"severity",
] as const;

type ActivityColumn = (typeof ACTIVITY_COLUMNS)[number];
type SeverityFilter = "all" | "low" | "medium" | "high" | "critical";
type ActivityType = "sign_in" | "payment" | "api_key_created";

interface ActivityEvent {
	id: string;
	type: ActivityType;
	eventType: string;
	action: string;
	severity: Exclude<SeverityFilter, "all">;
	sourceIp: string;
	destinationIp: string;
	userName: string;
	userEmail: string;
	detail: string;
	createdAt: Date | string;
}

const TYPE_CONFIG = {
	sign_in: {
		icon: LogIn,
		className: "text-blue-600 dark:text-blue-400",
	},
	payment: {
		icon: CreditCard,
		className: "text-green-600 dark:text-green-400",
	},
	api_key_created: {
		icon: KeyRound,
		className: "text-yellow-600 dark:text-yellow-400",
	},
} as const;

function AdminActivityPage() {
	const { t } = useTranslation();
	const { data: events, isPending } = trpc.admin.getActivity.useQuery();
	const [query, setQuery] = useState("");
	const [severity, setSeverity] = useState<SeverityFilter>("all");
	const [pushAlerts, setPushAlerts] = useState(true);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [visibleColumns, setVisibleColumns] = useState<Set<ActivityColumn>>(
		() => new Set(ACTIVITY_COLUMNS),
	);
	const [page, setPage] = useState(0);
	const [pageSize, setPageSize] = useState("10");

	const filteredEvents = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase();
		return (events ?? []).filter((event) => {
			const matchesSeverity = severity === "all" || event.severity === severity;
			const searchable = [
				event.eventType,
				event.action,
				event.userName,
				event.userEmail,
				event.sourceIp,
				event.destinationIp,
				event.detail,
			]
				.join(" ")
				.toLowerCase();

			return matchesSeverity && searchable.includes(normalizedQuery);
		});
	}, [events, query, severity]);

	const pageSizeNumber = Number(pageSize);
	const pageCount = Math.max(
		1,
		Math.ceil(filteredEvents.length / pageSizeNumber),
	);
	const pageRows = filteredEvents.slice(
		page * pageSizeNumber,
		(page + 1) * pageSizeNumber,
	);
	const allPageSelected =
		pageRows.length > 0 && pageRows.every((row) => selectedIds.has(row.id));

	const toggleColumn = (column: ActivityColumn) => {
		setVisibleColumns((current) => {
			const next = new Set(current);
			if (next.has(column)) next.delete(column);
			else next.add(column);
			return next.size === 0 ? current : next;
		});
	};

	const toggleSelected = (id: string) => {
		setSelectedIds((current) => {
			const next = new Set(current);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const togglePageSelected = () => {
		setSelectedIds((current) => {
			const next = new Set(current);
			if (allPageSelected) {
				for (const row of pageRows) next.delete(row.id);
			} else {
				for (const row of pageRows) next.add(row.id);
			}
			return next;
		});
	};

	return (
		<div className="w-full space-y-6">
			<div>
				<h1 className="font-semibold text-2xl tracking-tight">
					{t("admin.activity.title", "Activity Logs")}
				</h1>
				<p className="text-muted-foreground text-sm">
					{t(
						"admin.activity.subtitle",
						"Recent sign-ins, payments, and API key events across the platform.",
					)}
				</p>
			</div>

			<Card>
				<CardHeader className="flex min-h-14 flex-row flex-wrap items-center justify-between gap-2.5 border-b px-5 py-0">
					<div className="flex flex-wrap items-center gap-2.5">
						<div className="relative">
							<Search className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
							<Input
								value={query}
								onChange={(event) => {
									setQuery(event.target.value);
									setPage(0);
								}}
								className="h-8.5 w-44 pl-9 text-[0.8125rem]"
								placeholder={t("admin.activity.search", "Search Logs...")}
							/>
						</div>
						<Select
							value={severity}
							onValueChange={(value) => {
								setSeverity(value as SeverityFilter);
								setPage(0);
							}}
						>
							<SelectTrigger size="sm" className="w-[132px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">
									{t("admin.activity.severity.all", "Severity")}
								</SelectItem>
								{(["low", "medium", "high", "critical"] as const).map(
									(level) => (
										<SelectItem key={level} value={level}>
											{getSeverityLabel(level, t)}
										</SelectItem>
									),
								)}
							</SelectContent>
						</Select>
					</div>

					<div className="flex flex-wrap items-center gap-2.5">
						<div className="flex items-center gap-2">
							<Label htmlFor="push-alerts" className="text-sm">
								{t("admin.activity.pushAlerts", "Push Alerts")}
							</Label>
							<Switch
								id="push-alerts"
								checked={pushAlerts}
								onCheckedChange={setPushAlerts}
							/>
						</div>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button type="button" variant="outline" size="sm">
									<Settings2 className="mr-1.5 size-3.5" />
									{t("common.columns", "Columns")}
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuGroup>
									{ACTIVITY_COLUMNS.map((column) => (
										<DropdownMenuCheckboxItem
											key={column}
											checked={visibleColumns.has(column)}
											onCheckedChange={() => toggleColumn(column)}
										>
											{getActivityColumnLabel(column, t)}
										</DropdownMenuCheckboxItem>
									))}
								</DropdownMenuGroup>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</CardHeader>

				<CardContent className="grid grow p-0">
					{isPending ? (
						<div className="space-y-2 p-5">
							{Array.from({ length: 8 }).map((_, i) => (
								<Skeleton key={i} className="h-10 w-full" />
							))}
						</div>
					) : filteredEvents.length === 0 ? (
						<p className="px-6 py-10 text-center text-muted-foreground text-sm">
							{t("admin.activity.empty", "No recent activity found.")}
						</p>
					) : (
						<ActivityTable
							rows={pageRows}
							visibleColumns={visibleColumns}
							selectedIds={selectedIds}
							allPageSelected={allPageSelected}
							onToggleSelected={toggleSelected}
							onTogglePageSelected={togglePageSelected}
						/>
					)}
				</CardContent>

				<CardFooter className="min-h-14 border-t px-5">
					<div className="flex grow flex-col flex-wrap items-center justify-between gap-2.5 py-2.5 sm:flex-row sm:py-0">
						<div className="order-2 flex items-center gap-2.5 sm:order-1">
							<span className="text-muted-foreground text-sm">
								{t("common.rowsPerPage", "Rows per page")}
							</span>
							<Select
								value={pageSize}
								onValueChange={(value) => {
									setPageSize(value ?? "10");
									setPage(0);
								}}
							>
								<SelectTrigger size="sm" className="w-[72px]">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{["5", "10", "20"].map((size) => (
										<SelectItem key={size} value={size}>
											{size}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="order-1 flex flex-col items-center gap-2.5 sm:order-2 sm:flex-row">
							<div className="text-nowrap text-muted-foreground text-sm">
								{filteredEvents.length === 0
									? "0"
									: `${page * pageSizeNumber + 1} - ${Math.min(
											(page + 1) * pageSizeNumber,
											filteredEvents.length,
										)} of ${filteredEvents.length}`}
							</div>
							<div className="flex items-center gap-1">
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="size-7"
									disabled={page === 0}
									onClick={() => setPage((p) => Math.max(0, p - 1))}
								>
									<ChevronLeft className="size-4" />
								</Button>
								{Array.from({ length: pageCount }).map((_, i) => (
									<Button
										key={i}
										type="button"
										variant={page === i ? "secondary" : "ghost"}
										size="icon"
										className="size-7"
										onClick={() => setPage(i)}
									>
										{i + 1}
									</Button>
								))}
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="size-7"
									disabled={page >= pageCount - 1}
									onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
								>
									<ChevronRight className="size-4" />
								</Button>
							</div>
						</div>
					</div>
				</CardFooter>
			</Card>
		</div>
	);
}

function ActivityTable({
	rows,
	visibleColumns,
	selectedIds,
	allPageSelected,
	onToggleSelected,
	onTogglePageSelected,
}: {
	rows: ActivityEvent[];
	visibleColumns: Set<ActivityColumn>;
	selectedIds: Set<string>;
	allPageSelected: boolean;
	onToggleSelected: (id: string) => void;
	onTogglePageSelected: () => void;
}) {
	const { t } = useTranslation();

	return (
		<Table className="min-w-[1100px] table-fixed border-separate border-spacing-0 text-left font-normal text-sm">
			<TableHeader>
				<TableRow className="bg-muted/40 hover:bg-muted/40 [&>th]:border-b">
					<TableHead className="h-10 w-[52px] border-r px-4">
						<Checkbox
							aria-label={t("common.selectAll", "Select all")}
							checked={allPageSelected}
							onCheckedChange={onTogglePageSelected}
						/>
					</TableHead>
					{visibleColumns.has("timestamp") && (
						<DataGridHead className="w-[190px]" sorted>
							{t("admin.activity.headers.timestamp", "Timestamp")}
						</DataGridHead>
					)}
					{visibleColumns.has("eventType") && (
						<DataGridHead className="w-[210px]">
							{t("admin.activity.headers.eventType", "Event Type")}
						</DataGridHead>
					)}
					{visibleColumns.has("action") && (
						<DataGridHead className="w-[230px]">
							{t("admin.activity.headers.action", "Action Taken")}
						</DataGridHead>
					)}
					{visibleColumns.has("sourceIp") && (
						<DataGridHead className="w-[150px]">
							{t("admin.activity.headers.sourceIp", "Source IP")}
						</DataGridHead>
					)}
					{visibleColumns.has("destinationIp") && (
						<DataGridHead className="w-[160px]">
							{t("admin.activity.headers.destinationIp", "Destination IP")}
						</DataGridHead>
					)}
					{visibleColumns.has("severity") && (
						<DataGridHead className="w-[120px]">
							{t("admin.activity.headers.severity", "Severity")}
						</DataGridHead>
					)}
					<TableHead className="h-10 w-[72px] border-r px-4" />
				</TableRow>
			</TableHeader>
			<TableBody>
				{rows.map((event) => {
					const typeConfig = TYPE_CONFIG[event.type] ?? TYPE_CONFIG.sign_in;
					const Icon = typeConfig.icon;

					return (
						<TableRow
							key={event.id}
							className="border-b hover:bg-muted/40 data-[state=selected]:bg-muted/50 [&:not(:last-child)>td]:border-b"
							data-state={selectedIds.has(event.id) ? "selected" : undefined}
						>
							<TableCell className="border-r px-4 py-3">
								<Checkbox
									aria-label={t("common.selectRow", "Select row")}
									checked={selectedIds.has(event.id)}
									onCheckedChange={() => onToggleSelected(event.id)}
								/>
							</TableCell>
							{visibleColumns.has("timestamp") && (
								<TableCell className="border-r px-4 py-3 text-muted-foreground">
									{formatDate(event.createdAt)}
								</TableCell>
							)}
							{visibleColumns.has("eventType") && (
								<TableCell className="border-r px-4 py-3">
									<div className="flex items-center gap-1.5">
										<Icon className={cn("size-4", typeConfig.className)} />
										<span className="font-semibold text-secondary-foreground">
											{event.eventType}
										</span>
									</div>
								</TableCell>
							)}
							{visibleColumns.has("action") && (
								<TableCell className="border-r px-4 py-3 text-secondary-foreground">
									<div className="truncate">{event.action}</div>
									{event.detail && (
										<div className="truncate text-muted-foreground text-xs">
											{event.detail}
										</div>
									)}
								</TableCell>
							)}
							{visibleColumns.has("sourceIp") && (
								<TableCell className="border-r px-4 py-3 text-secondary-foreground">
									{event.sourceIp}
								</TableCell>
							)}
							{visibleColumns.has("destinationIp") && (
								<TableCell className="border-r px-4 py-3 text-secondary-foreground">
									{event.destinationIp}
								</TableCell>
							)}
							{visibleColumns.has("severity") && (
								<TableCell className="border-r px-4 py-3">
									<SeverityBadge severity={event.severity} />
								</TableCell>
							)}
							<TableCell className="border-r px-4 py-3 text-right">
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="size-8"
								>
									<NotepadText className="size-4" />
								</Button>
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</Table>
	);
}

function DataGridHead({
	children,
	className,
	sorted = false,
}: {
	children: React.ReactNode;
	className?: string;
	sorted?: boolean;
}) {
	return (
		<TableHead
			className={cn(
				"h-10 border-r px-4 font-normal text-accent-foreground",
				className,
			)}
		>
			<div className="-ml-2 flex h-full items-center">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-7 px-2 font-normal text-secondary-foreground hover:text-foreground"
				>
					{children}
					{sorted ? (
						<ArrowDown className="ml-1 size-3" />
					) : (
						<ChevronsUpDown className="ml-1 size-3" />
					)}
				</Button>
			</div>
		</TableHead>
	);
}

function SeverityBadge({ severity }: { severity: ActivityEvent["severity"] }) {
	const { t } = useTranslation();
	const className = {
		low: "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400",
		medium:
			"border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400",
		high: "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-400",
		critical:
			"border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
	}[severity];

	return (
		<Badge variant="outline" className={className}>
			{getSeverityLabel(severity, t)}
		</Badge>
	);
}

function getActivityColumnLabel(
	column: ActivityColumn,
	t: (key: string, fallback: string) => string,
) {
	const labels: Record<ActivityColumn, string> = {
		timestamp: t("admin.activity.headers.timestamp", "Timestamp"),
		eventType: t("admin.activity.headers.eventType", "Event Type"),
		action: t("admin.activity.headers.action", "Action Taken"),
		sourceIp: t("admin.activity.headers.sourceIp", "Source IP"),
		destinationIp: t("admin.activity.headers.destinationIp", "Destination IP"),
		severity: t("admin.activity.headers.severity", "Severity"),
	};
	return labels[column];
}

function getSeverityLabel(
	severity: Exclude<SeverityFilter, "all">,
	t: (key: string, fallback: string) => string,
) {
	const labels: Record<Exclude<SeverityFilter, "all">, string> = {
		low: t("admin.activity.severity.low", "Low"),
		medium: t("admin.activity.severity.medium", "Medium"),
		high: t("admin.activity.severity.high", "High"),
		critical: t("admin.activity.severity.critical", "Critical"),
	};
	return labels[severity];
}

function formatDate(value: Date | string | null | undefined) {
	if (!value) return "—";
	return new Date(value).toLocaleString(undefined, {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}
