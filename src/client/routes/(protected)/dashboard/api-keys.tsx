import { Badge } from "@client/components/ui/badge";
import { Button } from "@client/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@client/components/ui/card";
import { Checkbox } from "@client/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@client/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuTrigger,
} from "@client/components/ui/dropdown-menu";
import { Input } from "@client/components/ui/input";
import { Label } from "@client/components/ui/label";
import { Pagination } from "@client/components/ui/pagination";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@client/components/ui/select";
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
import { Copy, Key, Plus, Settings2, Trash2 } from "lucide-react";
import type * as React from "react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export const Route = createFileRoute("/(protected)/dashboard/api-keys")({
	component: ApiKeysPage,
});

const COLUMNS = [
	"integration",
	"apiKey",
	"lastUsed",
	"created",
	"status",
] as const;

type ApiKeyColumn = (typeof COLUMNS)[number];

interface ApiKeyRow {
	id: string;
	name: string;
	keyPrefix: string;
	createdAt: Date | string;
	lastUsedAt: Date | string | null;
}

function ApiKeysPage() {
	const { t } = useTranslation();
	const utils = trpc.useUtils();
	const listQuery = trpc.apiKeys.list.useQuery();
	const createMutation = trpc.apiKeys.create.useMutation({
		onSuccess: (data) => {
			setCreatedKey(data.apiKey);
			setCreateOpen(false);
			setKeyName("");
			utils.apiKeys.list.invalidate();
			toast.success(t("apiKeys.create.success", "API key created"));
		},
		onError: (e) => toast.error(e.message),
	});
	const revokeMutation = trpc.apiKeys.revoke.useMutation({
		// Optimistically drop the key from the list so the row disappears
		// instantly, then reconcile with the server in onSettled.
		onMutate: async ({ id }) => {
			await utils.apiKeys.list.cancel();
			const previous = utils.apiKeys.list.getData();
			utils.apiKeys.list.setData(undefined, (old) =>
				old?.filter((key) => key.id !== id),
			);
			return { previous };
		},
		onSuccess: () => {
			toast.success(t("apiKeys.revoked", "API key revoked"));
		},
		onError: (e, _vars, context) => {
			// Roll back to the snapshot captured in onMutate.
			if (context?.previous) {
				utils.apiKeys.list.setData(undefined, context.previous);
			}
			toast.error(e.message);
		},
		onSettled: () => {
			utils.apiKeys.list.invalidate();
		},
	});

	const [createOpen, setCreateOpen] = useState(false);
	const [keyName, setKeyName] = useState("");
	const [createdKey, setCreatedKey] = useState<string | null>(null);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [visibleColumns, setVisibleColumns] = useState<Set<ApiKeyColumn>>(
		() => new Set(COLUMNS),
	);
	const [page, setPage] = useState(0);
	const [pageSize, setPageSize] = useState("10");

	const rows = listQuery.data ?? [];
	const pageSizeNumber = Number(pageSize);
	const pageCount = Math.max(1, Math.ceil(rows.length / pageSizeNumber));
	const pageRows = useMemo(
		() => rows.slice(page * pageSizeNumber, (page + 1) * pageSizeNumber),
		[page, pageSizeNumber, rows],
	);
	const allPageSelected =
		pageRows.length > 0 && pageRows.every((row) => selectedIds.has(row.id));

	const toggleColumn = (column: ApiKeyColumn) => {
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
		<>
			<div className="w-full space-y-6">
				<div>
					<h1 className="font-semibold text-2xl tracking-tight">
						{t("apiKeys.title", "API Keys")}
					</h1>
					<p className="text-muted-foreground text-sm">
						{t(
							"apiKeys.subtitle",
							"Programmatic access — store keys securely; we only store a hash",
						)}
					</p>
				</div>

				<Card>
					<CardHeader className="flex min-h-14 flex-row flex-wrap items-center justify-between gap-2.5 border-b px-5 py-0">
						<CardTitle className="text-base">
							{t("apiKeys.cardTitle", "API Integrations")}
						</CardTitle>
						<div className="flex flex-wrap items-center gap-2.5">
							<Button
								type="button"
								size="sm"
								onClick={() => setCreateOpen(true)}
							>
								<Plus className="mr-1.5 size-3.5" />
								{t("apiKeys.createKey", "Add New")}
							</Button>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button type="button" variant="outline" size="sm">
										<Settings2 className="mr-1.5 size-3.5" />
										{t("common.columns", "Columns")}
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuGroup>
										{COLUMNS.map((column) => (
											<DropdownMenuCheckboxItem
												key={column}
												checked={visibleColumns.has(column)}
												onCheckedChange={() => toggleColumn(column)}
											>
												{getApiKeyColumnLabel(column, t)}
											</DropdownMenuCheckboxItem>
										))}
									</DropdownMenuGroup>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</CardHeader>

					<CardContent className="grid grow p-0">
						{listQuery.isPending ? (
							<div className="px-5 py-10 text-center text-muted-foreground text-sm">
								{t("apiKeys.loading", "Loading…")}
							</div>
						) : rows.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-14 text-center">
								<Key className="mb-3 size-10 text-muted-foreground/40" />
								<p className="text-muted-foreground text-sm">
									{t("apiKeys.noKeys", "No API keys yet")}
								</p>
							</div>
						) : (
							<ApiKeysTable
								rows={pageRows}
								selectedIds={selectedIds}
								allPageSelected={allPageSelected}
								visibleColumns={visibleColumns}
								revokePending={revokeMutation.isPending}
								onTogglePageSelected={togglePageSelected}
								onToggleSelected={toggleSelected}
								onRevoke={(id) => revokeMutation.mutate({ id })}
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
									{rows.length === 0
										? "0"
										: `${page * pageSizeNumber + 1} - ${Math.min(
												(page + 1) * pageSizeNumber,
												rows.length,
											)} of ${rows.length}`}
								</div>
								<Pagination
									page={page}
									pageCount={pageCount}
									onPageChange={setPage}
								/>
							</div>
						</div>
					</CardFooter>
				</Card>
			</div>

			<CreateKeyDialog
				open={createOpen}
				keyName={keyName}
				isPending={createMutation.isPending}
				onOpenChange={setCreateOpen}
				onKeyNameChange={setKeyName}
				onCreate={() => createMutation.mutate({ name: keyName.trim() })}
			/>

			<CreatedKeyDialog
				createdKey={createdKey}
				onOpenChange={() => setCreatedKey(null)}
			/>
		</>
	);
}

function ApiKeysTable({
	rows,
	selectedIds,
	allPageSelected,
	visibleColumns,
	revokePending,
	onTogglePageSelected,
	onToggleSelected,
	onRevoke,
}: {
	rows: ApiKeyRow[];
	selectedIds: Set<string>;
	allPageSelected: boolean;
	visibleColumns: Set<ApiKeyColumn>;
	revokePending: boolean;
	onTogglePageSelected: () => void;
	onToggleSelected: (id: string) => void;
	onRevoke: (id: string) => void;
}) {
	const { t } = useTranslation();

	return (
		<Table className="min-w-[900px] table-fixed border-separate border-spacing-0 text-left font-normal text-sm">
			<TableHeader>
				<TableRow className="bg-muted/40 hover:bg-muted/40 [&>th]:border-b">
					<TableHead className="h-10 w-[52px] border-r px-4">
						<Checkbox
							aria-label={t("common.selectAll", "Select all")}
							checked={allPageSelected}
							onCheckedChange={onTogglePageSelected}
						/>
					</TableHead>
					{visibleColumns.has("integration") && (
						<DataGridHead className="w-[220px]">
							{t("apiKeys.headers.integration", "Integration")}
						</DataGridHead>
					)}
					{visibleColumns.has("apiKey") && (
						<DataGridHead className="w-[260px]">
							{t("apiKeys.headers.apiKey", "API Key")}
						</DataGridHead>
					)}
					{visibleColumns.has("lastUsed") && (
						<DataGridHead className="w-[180px]">
							{t("apiKeys.headers.lastUsed", "Last Used")}
						</DataGridHead>
					)}
					{visibleColumns.has("created") && (
						<DataGridHead className="w-[180px]">
							{t("apiKeys.headers.created", "Created")}
						</DataGridHead>
					)}
					{visibleColumns.has("status") && (
						<DataGridHead className="w-[120px]">
							{t("apiKeys.headers.status", "Status")}
						</DataGridHead>
					)}
					<TableHead className="h-10 w-[86px] border-r px-4" />
				</TableRow>
			</TableHeader>
			<TableBody>
				{rows.map((row) => {
					return (
						<TableRow
							key={row.id}
							className="border-b hover:bg-muted/40 data-[state=selected]:bg-muted/50 [&:not(:last-child)>td]:border-b"
							data-state={selectedIds.has(row.id) ? "selected" : undefined}
						>
							<TableCell className="border-r px-4 py-3">
								<Checkbox
									aria-label={t("common.selectRow", "Select row")}
									checked={selectedIds.has(row.id)}
									onCheckedChange={() => onToggleSelected(row.id)}
								/>
							</TableCell>
							{visibleColumns.has("integration") && (
								<TableCell className="border-r px-4 py-3 font-medium">
									{row.name}
								</TableCell>
							)}
							{visibleColumns.has("apiKey") && (
								<TableCell className="border-r px-4 py-3">
									<div className="flex items-center gap-1 font-mono text-foreground text-xs">
										<span>{row.keyPrefix}...</span>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											className="size-8 text-muted-foreground"
											aria-label={t(
												"apiKeys.copy.copyPrefix",
												"Copy key prefix",
											)}
											onClick={() => {
												void navigator.clipboard.writeText(row.keyPrefix);
												toast.success(t("apiKeys.copy.copied", "Copied"));
											}}
										>
											<Copy className="size-3.5" />
										</Button>
									</div>
								</TableCell>
							)}
							{visibleColumns.has("lastUsed") && (
								<TableCell className="border-r px-4 py-3 text-muted-foreground">
									{formatDate(row.lastUsedAt)}
								</TableCell>
							)}
							{visibleColumns.has("created") && (
								<TableCell className="border-r px-4 py-3 text-muted-foreground">
									{formatDate(row.createdAt)}
								</TableCell>
							)}
							{visibleColumns.has("status") && (
								<TableCell className="border-r px-4 py-3">
									<Badge variant="outline">
										{t("apiKeys.status.active", "Active")}
									</Badge>
								</TableCell>
							)}
							<TableCell className="border-r px-4 py-3 text-right">
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="size-8 text-destructive"
									aria-label={t("apiKeys.revoke", "Revoke key")}
									disabled={revokePending}
									onClick={() => onRevoke(row.id)}
								>
									<Trash2 className="size-4" />
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
}: {
	children: React.ReactNode;
	className?: string;
}) {
	// Sorting isn't implemented, so render a plain, non-interactive header label
	// rather than a button that looks clickable but does nothing.
	return (
		<TableHead
			className={cn(
				"h-10 border-r px-4 font-normal text-secondary-foreground",
				className,
			)}
		>
			<div className="flex h-full items-center">{children}</div>
		</TableHead>
	);
}

function CreateKeyDialog({
	open,
	keyName,
	isPending,
	onOpenChange,
	onKeyNameChange,
	onCreate,
}: {
	open: boolean;
	keyName: string;
	isPending: boolean;
	onOpenChange: (open: boolean) => void;
	onKeyNameChange: (name: string) => void;
	onCreate: () => void;
}) {
	const { t } = useTranslation();

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{t("apiKeys.create.title", "Create API key")}
					</DialogTitle>
					<DialogDescription>
						{t(
							"apiKeys.create.description",
							"Give it a label you'll recognize in audit logs.",
						)}
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-2">
					<Label htmlFor="keyName">
						{t("apiKeys.create.nameLabel", "Name")}
					</Label>
					<Input
						id="keyName"
						value={keyName}
						onChange={(e) => onKeyNameChange(e.target.value)}
						placeholder={t("apiKeys.create.namePlaceholder", "CI / production")}
					/>
				</div>
				<DialogFooter>
					<Button
						type="button"
						disabled={!keyName.trim() || isPending}
						onClick={onCreate}
					>
						{isPending
							? t("apiKeys.create.creating", "Creating…")
							: t("apiKeys.create.create", "Create")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function CreatedKeyDialog({
	createdKey,
	onOpenChange,
}: {
	createdKey: string | null;
	onOpenChange: () => void;
}) {
	const { t } = useTranslation();

	return (
		<Dialog open={createdKey !== null} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{t("apiKeys.copy.title", "Copy your API key")}
					</DialogTitle>
					<DialogDescription>
						{t(
							"apiKeys.copy.description",
							"This secret is only shown once. Store it in a password manager or secret store.",
						)}
					</DialogDescription>
				</DialogHeader>
				<pre className="overflow-x-auto break-all rounded-md bg-muted p-3 font-mono text-xs">
					{createdKey}
				</pre>
				<DialogFooter>
					<Button
						type="button"
						onClick={() => {
							if (createdKey) {
								void navigator.clipboard.writeText(createdKey);
								toast.success(t("apiKeys.copy.copied", "Copied"));
							}
						}}
					>
						{t("apiKeys.copy.copy", "Copy")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function getApiKeyColumnLabel(
	column: ApiKeyColumn,
	t: (key: string, fallback: string) => string,
) {
	const labels: Record<ApiKeyColumn, string> = {
		integration: t("apiKeys.headers.integration", "Integration"),
		apiKey: t("apiKeys.headers.apiKey", "API Key"),
		lastUsed: t("apiKeys.headers.lastUsed", "Last Used"),
		created: t("apiKeys.headers.created", "Created"),
		status: t("apiKeys.headers.status", "Status"),
	};
	return labels[column];
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
