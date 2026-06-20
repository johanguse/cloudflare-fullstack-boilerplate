import { Badge } from "@client/components/ui/badge";
import { Button } from "@client/components/ui/button";
import { Card, CardContent } from "@client/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@client/components/ui/dialog";
import { Input } from "@client/components/ui/input";
import { Label } from "@client/components/ui/label";
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
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ChevronLeft,
	ChevronRight,
	Download,
	FileText,
	Plus,
	Receipt,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export const Route = createFileRoute("/(protected)/dashboard/invoices/")({
	component: InvoicesPage,
});

type InvoiceStatus = "draft" | "issued" | "paid" | "cancelled" | "overdue";

const STATUS_VARIANT: Record<
	InvoiceStatus,
	"default" | "secondary" | "destructive" | "outline"
> = {
	draft: "secondary",
	issued: "outline",
	paid: "default",
	cancelled: "destructive",
	overdue: "destructive",
};

const PAGE_SIZE = 20;

const _numFmtCache = new Map<string, Intl.NumberFormat>();
function fmt(cents: number, currency: string) {
	const key = currency || "BRL";
	let f = _numFmtCache.get(key);
	if (!f) {
		f = new Intl.NumberFormat("pt-BR", { style: "currency", currency: key });
		_numFmtCache.set(key, f);
	}
	return f.format(cents / 100);
}

const _mediumDateFmt = new Intl.DateTimeFormat("pt-BR", {
	dateStyle: "medium",
});
function fmtDate(d: Date | string | null | undefined) {
	if (!d) return "—";
	return _mediumDateFmt.format(new Date(d));
}

// ---------------------------------------------------------------------------
// Create Invoice Dialog
// ---------------------------------------------------------------------------

interface NewItemRow {
	id: string;
	description: string;
	quantity: number;
	unitAmount: string;
}

function CreateInvoiceDialog({
	open,
	onClose,
	onSuccess,
}: {
	open: boolean;
	onClose: () => void;
	onSuccess: () => void;
}) {
	const { t } = useTranslation();
	const [customerName, setCustomerName] = useState("");
	const [customerEmail, setCustomerEmail] = useState("");
	const [customerDocument, setCustomerDocument] = useState("");
	const [description, setDescription] = useState("");
	const [dueDate, setDueDate] = useState("");
	const [items, setItems] = useState<NewItemRow[]>([
		{ id: crypto.randomUUID(), description: "", quantity: 1, unitAmount: "" },
	]);

	const createMutation = trpc.invoices.create.useMutation({
		onSuccess: () => {
			toast.success(t("invoices.create.created", "Invoice created"));
			onSuccess();
			onClose();
		},
		onError: (e) => toast.error(e.message),
	});

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const validItems = items.filter(
			(i) => i.description.trim() && Number(i.unitAmount) > 0,
		);
		if (validItems.length === 0) {
			toast.error(t("invoices.create.noItems", "Add at least one line item"));
			return;
		}
		createMutation.mutate({
			customerName,
			customerEmail,
			customerDocument: customerDocument || undefined,
			description: description || undefined,
			dueDate: dueDate || undefined,
			items: validItems.map((i) => ({
				description: i.description,
				quantity: i.quantity,
				unitAmount: Math.round(Number(i.unitAmount) * 100),
			})),
		});
	}

	function addItem() {
		setItems((prev) => [
			...prev,
			{ id: crypto.randomUUID(), description: "", quantity: 1, unitAmount: "" },
		]);
	}

	function removeItem(idx: number) {
		setItems((prev) => prev.filter((_, i) => i !== idx));
	}

	function updateItem<K extends keyof NewItemRow>(
		idx: number,
		field: K,
		value: NewItemRow[K],
	) {
		setItems((prev) =>
			prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)),
		);
	}

	const subtotal = items.reduce(
		(acc, i) => acc + i.quantity * (Number(i.unitAmount) || 0),
		0,
	);

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>{t("invoices.create.title", "New invoice")}</DialogTitle>
					<DialogDescription>
						{t(
							"invoices.create.description",
							"Fill in the details to create a new invoice",
						)}
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-5">
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1.5">
							<Label>
								{t("invoices.create.customerName", "Customer name")}
							</Label>
							<Input
								required
								value={customerName}
								onChange={(e) => setCustomerName(e.target.value)}
								placeholder="Acme Corp"
							/>
						</div>
						<div className="space-y-1.5">
							<Label>
								{t("invoices.create.customerEmail", "Customer email")}
							</Label>
							<Input
								required
								type="email"
								value={customerEmail}
								onChange={(e) => setCustomerEmail(e.target.value)}
								placeholder="billing@acme.com"
							/>
						</div>
						<div className="space-y-1.5">
							<Label>
								{t("invoices.create.document", "Document (CNPJ/CPF)")}
							</Label>
							<Input
								value={customerDocument}
								onChange={(e) => setCustomerDocument(e.target.value)}
								placeholder="12.345.678/0001-99"
							/>
						</div>
						<div className="space-y-1.5">
							<Label>{t("invoices.create.dueDate", "Due date")}</Label>
							<Input
								type="date"
								value={dueDate}
								onChange={(e) => setDueDate(e.target.value)}
							/>
						</div>
						<div className="col-span-2 space-y-1.5">
							<Label>{t("invoices.create.description2", "Description")}</Label>
							<Input
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder={t(
									"invoices.create.notePlaceholder",
									"Optional internal note",
								)}
							/>
						</div>
					</div>

					{/* Line items */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<Label>{t("invoices.create.items", "Line items")}</Label>
							<Button type="button" variant="ghost" size="sm" onClick={addItem}>
								<Plus className="mr-1 size-3.5" />
								{t("invoices.create.addItem", "Add item")}
							</Button>
						</div>
						<div className="space-y-2">
							{items.map((item, idx) => (
								<div key={item.id} className="flex gap-2">
									<Input
										className="flex-1"
										placeholder={t(
											"invoices.create.descriptionPlaceholder",
											"Service description",
										)}
										value={item.description}
										onChange={(e) =>
											updateItem(idx, "description", e.target.value)
										}
									/>
									<Input
										className="w-20"
										type="number"
										min={1}
										placeholder={t("invoices.create.qtyPlaceholder", "Qty")}
										value={item.quantity}
										onChange={(e) =>
											updateItem(idx, "quantity", Number(e.target.value))
										}
									/>
									<Input
										className="w-28"
										type="number"
										min={0}
										step="0.01"
										placeholder={t(
											"invoices.create.unitPlaceholder",
											"Unit price",
										)}
										value={item.unitAmount}
										onChange={(e) =>
											updateItem(idx, "unitAmount", e.target.value)
										}
									/>
									{items.length > 1 && (
										<Button
											type="button"
											variant="ghost"
											size="icon"
											onClick={() => removeItem(idx)}
										>
											✕
										</Button>
									)}
								</div>
							))}
						</div>
						{subtotal > 0 && (
							<p className="text-right font-medium text-sm">
								{t("invoices.create.subtotal", {
									amount: fmt(Math.round(subtotal * 100), "BRL"),
									defaultValue: "Subtotal: {{amount}}",
								})}
							</p>
						)}
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={onClose}>
							{t("invoices.create.cancel", "Cancel")}
						</Button>
						<Button type="submit" disabled={createMutation.isPending}>
							{createMutation.isPending
								? t("invoices.create.creating", "Creating…")
								: t("invoices.create.submit", "Create invoice")}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

function InvoicesPage() {
	const { t } = useTranslation();
	const [page, setPage] = useState(0);
	const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">(
		"all",
	);
	const [showCreate, setShowCreate] = useState(false);

	const statusLabels: Record<InvoiceStatus, string> = {
		draft: t("invoices.status.draft", "Draft"),
		issued: t("invoices.status.issued", "Issued"),
		paid: t("invoices.status.paid", "Paid"),
		cancelled: t("invoices.status.cancelled", "Cancelled"),
		overdue: t("invoices.status.overdue", "Overdue"),
	};

	const invoicesQuery = trpc.invoices.list.useQuery({
		limit: PAGE_SIZE,
		offset: page * PAGE_SIZE,
		status: statusFilter === "all" ? undefined : statusFilter,
	});

	const downloadMutation = trpc.invoices.downloadPdf.useMutation({
		onSuccess: (data) => {
			window.open(data.downloadUrl, "_blank");
		},
		onError: (e) => toast.error(e.message),
	});

	const utils = trpc.useUtils();
	const rows = invoicesQuery.data?.rows ?? [];
	const total = invoicesQuery.data?.total ?? 0;
	const totalPages = Math.ceil(total / PAGE_SIZE);

	function handleExportCsv() {
		window.location.href = "/api/invoices/export";
	}

	return (
		<div className="w-full space-y-6">
			<div className="flex items-start justify-between">
				<div>
					<h1 className="font-semibold text-2xl tracking-tight">
						{t("invoices.title", "Invoices")}
					</h1>
					<p className="text-muted-foreground text-sm">
						{t("invoices.subtitle", "Manage and track your invoices")}
					</p>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" size="sm" onClick={handleExportCsv}>
						<Download className="mr-1.5 size-3.5" />
						{t("invoices.exportCsv", "Export CSV")}
					</Button>
					<Button size="sm" onClick={() => setShowCreate(true)}>
						<Plus className="mr-1.5 size-3.5" />
						{t("invoices.newInvoice", "New invoice")}
					</Button>
				</div>
			</div>

			{/* Filters */}
			<div className="flex items-center gap-3">
				<Select
					value={statusFilter}
					onValueChange={(v) => {
						setStatusFilter(v as InvoiceStatus | "all");
						setPage(0);
					}}
				>
					<SelectTrigger className="w-40">
						<SelectValue
							placeholder={t("invoices.allStatuses", "All statuses")}
						/>
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">
							{t("invoices.allStatuses", "All statuses")}
						</SelectItem>
						{(Object.keys(statusLabels) as InvoiceStatus[]).map((s) => (
							<SelectItem key={s} value={s}>
								{statusLabels[s]}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<Card>
				{invoicesQuery.isPending ? (
					<CardContent className="py-12 text-center text-muted-foreground text-sm">
						{t("invoices.loading", "Loading…")}
					</CardContent>
				) : rows.length === 0 ? (
					<CardContent className="flex flex-col items-center justify-center py-16 text-center">
						<Receipt className="mb-3 size-10 text-muted-foreground/40" />
						<p className="font-medium text-sm">
							{t("invoices.noInvoices", "No invoices found")}
						</p>
						<p className="text-muted-foreground text-sm">
							{statusFilter !== "all"
								? t(
										"invoices.noInvoicesFilter",
										"No invoices match the selected filter",
									)
								: t(
										"invoices.noInvoicesFirst",
										"Create your first invoice to get started",
									)}
						</p>
					</CardContent>
				) : (
					<>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>{t("invoices.headers.number", "#")}</TableHead>
									<TableHead>
										{t("invoices.headers.customer", "Customer")}
									</TableHead>
									<TableHead>{t("invoices.headers.date", "Date")}</TableHead>
									<TableHead>{t("invoices.headers.due", "Due")}</TableHead>
									<TableHead>
										{t("invoices.headers.amount", "Amount")}
									</TableHead>
									<TableHead>
										{t("invoices.headers.status", "Status")}
									</TableHead>
									<TableHead className="text-right">
										{t("invoices.headers.actions", "Actions")}
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{rows.map((inv) => (
									<TableRow key={inv.id}>
										<TableCell className="font-mono text-sm">
											{inv.number}
										</TableCell>
										<TableCell>
											<div className="font-medium text-sm">
												{inv.customerName ?? "—"}
											</div>
											<div className="text-muted-foreground text-xs">
												{inv.customerEmail ?? ""}
											</div>
										</TableCell>
										<TableCell className="text-sm">
											{fmtDate(inv.issuedAt)}
										</TableCell>
										<TableCell className="text-sm">
											{fmtDate(inv.dueDate)}
										</TableCell>
										<TableCell className="font-medium text-sm">
											{fmt(inv.amountTotal, inv.currency ?? "BRL")}
										</TableCell>
										<TableCell>
											<Badge
												variant={STATUS_VARIANT[inv.status as InvoiceStatus]}
											>
												{statusLabels[inv.status as InvoiceStatus] ??
													inv.status}
											</Badge>
										</TableCell>
										<TableCell className="text-right">
											<div className="flex justify-end gap-1">
												<Button variant="ghost" size="icon" asChild>
													<Link to={`/dashboard/invoices/${inv.id}` as never}>
														<FileText className="size-4" />
													</Link>
												</Button>
												<Button
													variant="ghost"
													size="icon"
													onClick={() =>
														downloadMutation.mutate({ id: inv.id })
													}
													disabled={downloadMutation.isPending}
												>
													<Download className="size-4" />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>

						{totalPages > 1 && (
							<div className="flex items-center justify-between border-t px-4 py-3">
								<p className="text-muted-foreground text-sm">
									{t("invoices.showing", {
										from: page * PAGE_SIZE + 1,
										to: Math.min((page + 1) * PAGE_SIZE, total),
										total,
										defaultValue: "Showing {{from}}–{{to}} of {{total}}",
									})}
								</p>
								<div className="flex gap-1">
									<Button
										variant="outline"
										size="icon"
										onClick={() => setPage((p) => p - 1)}
										disabled={page === 0}
									>
										<ChevronLeft className="size-4" />
									</Button>
									<Button
										variant="outline"
										size="icon"
										onClick={() => setPage((p) => p + 1)}
										disabled={page >= totalPages - 1}
									>
										<ChevronRight className="size-4" />
									</Button>
								</div>
							</div>
						)}
					</>
				)}
			</Card>

			<CreateInvoiceDialog
				open={showCreate}
				onClose={() => setShowCreate(false)}
				onSuccess={() => utils.invoices.list.invalidate()}
			/>
		</div>
	);
}
