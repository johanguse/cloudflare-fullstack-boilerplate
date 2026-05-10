import { DashboardLayout } from "@client/components/layout/DashboardLayout";
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
import { toast } from "sonner";

export const Route = createFileRoute("/(protected)/dashboard/invoices")({
	component: InvoicesPage,
});

type InvoiceStatus = "draft" | "issued" | "paid" | "cancelled" | "overdue";

const STATUS_LABELS: Record<InvoiceStatus, string> = {
	draft: "Draft",
	issued: "Issued",
	paid: "Paid",
	cancelled: "Cancelled",
	overdue: "Overdue",
};

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

function fmt(cents: number, currency: string) {
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: currency || "BRL",
	}).format(cents / 100);
}

function fmtDate(d: Date | string | null | undefined) {
	if (!d) return "—";
	return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
		new Date(d),
	);
}

// ---------------------------------------------------------------------------
// Create Invoice Dialog
// ---------------------------------------------------------------------------

interface NewItemRow {
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
	const [customerName, setCustomerName] = useState("");
	const [customerEmail, setCustomerEmail] = useState("");
	const [customerDocument, setCustomerDocument] = useState("");
	const [description, setDescription] = useState("");
	const [dueDate, setDueDate] = useState("");
	const [items, setItems] = useState<NewItemRow[]>([
		{ description: "", quantity: 1, unitAmount: "" },
	]);

	const createMutation = trpc.invoices.create.useMutation({
		onSuccess: () => {
			toast.success("Invoice created");
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
			toast.error("Add at least one item");
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
			{ description: "", quantity: 1, unitAmount: "" },
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
					<DialogTitle>Create Invoice</DialogTitle>
					<DialogDescription>
						Fill in the details for a new draft invoice.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-5">
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1.5">
							<Label>Customer name *</Label>
							<Input
								required
								value={customerName}
								onChange={(e) => setCustomerName(e.target.value)}
								placeholder="Acme Corp"
							/>
						</div>
						<div className="space-y-1.5">
							<Label>Customer email *</Label>
							<Input
								required
								type="email"
								value={customerEmail}
								onChange={(e) => setCustomerEmail(e.target.value)}
								placeholder="billing@acme.com"
							/>
						</div>
						<div className="space-y-1.5">
							<Label>Document (CNPJ / CPF)</Label>
							<Input
								value={customerDocument}
								onChange={(e) => setCustomerDocument(e.target.value)}
								placeholder="12.345.678/0001-99"
							/>
						</div>
						<div className="space-y-1.5">
							<Label>Due date</Label>
							<Input
								type="date"
								value={dueDate}
								onChange={(e) => setDueDate(e.target.value)}
							/>
						</div>
						<div className="col-span-2 space-y-1.5">
							<Label>Description</Label>
							<Input
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="Optional internal note"
							/>
						</div>
					</div>

					{/* Line items */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<Label>Items</Label>
							<Button type="button" variant="ghost" size="sm" onClick={addItem}>
								<Plus className="mr-1 h-3.5 w-3.5" />
								Add item
							</Button>
						</div>
						<div className="space-y-2">
							{items.map((item, idx) => (
								<div key={idx} className="flex gap-2">
									<Input
										className="flex-1"
										placeholder="Description"
										value={item.description}
										onChange={(e) =>
											updateItem(idx, "description", e.target.value)
										}
									/>
									<Input
										className="w-20"
										type="number"
										min={1}
										placeholder="Qty"
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
										placeholder="Unit (R$)"
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
								Subtotal: {fmt(Math.round(subtotal * 100), "BRL")}
							</p>
						)}
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={onClose}>
							Cancel
						</Button>
						<Button type="submit" disabled={createMutation.isPending}>
							{createMutation.isPending ? "Creating…" : "Create invoice"}
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
	const [page, setPage] = useState(0);
	const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">(
		"all",
	);
	const [showCreate, setShowCreate] = useState(false);

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
		<DashboardLayout>
			<div className="space-y-6">
				<div className="flex items-start justify-between">
					<div>
						<h1 className="font-semibold text-2xl tracking-tight">Invoices</h1>
						<p className="text-muted-foreground text-sm">
							View, download, and manage your invoices
						</p>
					</div>
					<div className="flex gap-2">
						<Button variant="outline" size="sm" onClick={handleExportCsv}>
							<Download className="mr-1.5 h-3.5 w-3.5" />
							Export CSV
						</Button>
						<Button size="sm" onClick={() => setShowCreate(true)}>
							<Plus className="mr-1.5 h-3.5 w-3.5" />
							New invoice
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
							<SelectValue placeholder="All statuses" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All statuses</SelectItem>
							{(Object.keys(STATUS_LABELS) as InvoiceStatus[]).map((s) => (
								<SelectItem key={s} value={s}>
									{STATUS_LABELS[s]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<Card>
					{invoicesQuery.isPending ? (
						<CardContent className="py-12 text-center text-muted-foreground text-sm">
							Loading invoices…
						</CardContent>
					) : rows.length === 0 ? (
						<CardContent className="flex flex-col items-center justify-center py-16 text-center">
							<Receipt className="mb-3 h-10 w-10 text-muted-foreground/40" />
							<p className="font-medium text-sm">No invoices yet</p>
							<p className="text-muted-foreground text-sm">
								{statusFilter !== "all"
									? "No invoices match the selected filter."
									: "Invoices will appear here after your first payment."}
							</p>
						</CardContent>
					) : (
						<>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Number</TableHead>
										<TableHead>Customer</TableHead>
										<TableHead>Date</TableHead>
										<TableHead>Due</TableHead>
										<TableHead>Amount</TableHead>
										<TableHead>Status</TableHead>
										<TableHead className="text-right">Actions</TableHead>
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
													{STATUS_LABELS[inv.status as InvoiceStatus] ??
														inv.status}
												</Badge>
											</TableCell>
											<TableCell className="text-right">
												<div className="flex justify-end gap-1">
													<Button variant="ghost" size="icon" asChild>
														<Link to={`/dashboard/invoices/${inv.id}` as never}>
															<FileText className="h-4 w-4" />
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
														<Download className="h-4 w-4" />
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
										Showing {page * PAGE_SIZE + 1}–
										{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
									</p>
									<div className="flex gap-1">
										<Button
											variant="outline"
											size="icon"
											onClick={() => setPage((p) => p - 1)}
											disabled={page === 0}
										>
											<ChevronLeft className="h-4 w-4" />
										</Button>
										<Button
											variant="outline"
											size="icon"
											onClick={() => setPage((p) => p + 1)}
											disabled={page >= totalPages - 1}
										>
											<ChevronRight className="h-4 w-4" />
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
		</DashboardLayout>
	);
}
