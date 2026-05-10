import { DashboardLayout } from "@client/components/layout/DashboardLayout";
import { Alert, AlertDescription } from "@client/components/ui/alert";
import { Badge } from "@client/components/ui/badge";
import { Button } from "@client/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@client/components/ui/card";
import { Separator } from "@client/components/ui/separator";
import { Skeleton } from "@client/components/ui/skeleton";
import { trpc } from "@client/lib/trpc-client";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	AlertCircle,
	ArrowLeft,
	CheckCircle2,
	Clock,
	Download,
	ExternalLink,
	Loader2,
	Mail,
	Receipt,
	RefreshCw,
	XCircle,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/(protected)/dashboard/invoices/$id")({
	component: InvoiceDetailPage,
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

const STATUS_LABELS: Record<InvoiceStatus, string> = {
	draft: "Draft",
	issued: "Issued",
	paid: "Paid",
	cancelled: "Cancelled",
	overdue: "Overdue",
};

function fmt(cents: number, currency: string) {
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: currency || "BRL",
	}).format(cents / 100);
}

function fmtDate(d: Date | string | null | undefined) {
	if (!d) return "—";
	return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(
		new Date(d),
	);
}

// ---------------------------------------------------------------------------
// NFSe Status Widget
// ---------------------------------------------------------------------------

type NfseStatus = "pending" | "processing" | "issued" | "error" | "cancelled";

const NFSE_STATUS_CONFIG: Record<
	NfseStatus,
	{
		label: string;
		variant: "default" | "secondary" | "destructive" | "outline";
		icon: React.ComponentType<{ className?: string }>;
	}
> = {
	pending: { label: "Pending", variant: "secondary", icon: Clock },
	processing: { label: "Processing", variant: "outline", icon: Loader2 },
	issued: { label: "Issued", variant: "default", icon: CheckCircle2 },
	error: { label: "Error", variant: "destructive", icon: AlertCircle },
	cancelled: { label: "Cancelled", variant: "destructive", icon: XCircle },
};

function NfseStatusWidget({ invoiceId }: { invoiceId: string }) {
	const nfseQuery = trpc.nfse.getStatus.useQuery({ invoiceId });
	const reEmitMutation = trpc.nfse.reEmit.useMutation({
		onSuccess: () => {
			toast.success("NFSe re-emission queued");
			nfseQuery.refetch();
		},
		onError: (e) => toast.error(e.message),
	});
	const cancelMutation = trpc.nfse.cancel.useMutation({
		onSuccess: () => {
			toast.success("NFSe cancelled");
			nfseQuery.refetch();
		},
		onError: (e) => toast.error(e.message),
	});

	if (nfseQuery.isPending) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="text-base">NFSe</CardTitle>
				</CardHeader>
				<CardContent>
					<Skeleton className="h-6 w-32" />
				</CardContent>
			</Card>
		);
	}

	const record = nfseQuery.data;

	if (!record) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="text-base">NFSe</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground text-sm">
						No NFSe record found for this invoice.
					</p>
					<Button
						size="sm"
						variant="outline"
						className="mt-3"
						onClick={() => reEmitMutation.mutate({ invoiceId })}
						disabled={reEmitMutation.isPending}
					>
						<RefreshCw className="mr-1.5 h-3.5 w-3.5" />
						Request emission
					</Button>
				</CardContent>
			</Card>
		);
	}

	const status = record.status as NfseStatus;
	const cfg = NFSE_STATUS_CONFIG[status];
	const Icon = cfg.icon;

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle className="text-base">NFSe</CardTitle>
					<Badge variant={cfg.variant} className="gap-1">
						<Icon className="h-3 w-3" />
						{cfg.label}
					</Badge>
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				{record.nfseNumber && (
					<div className="text-sm">
						<span className="text-muted-foreground">Number: </span>
						<span className="font-medium font-mono">{record.nfseNumber}</span>
					</div>
				)}
				{record.nfseVerificationCode && (
					<div className="text-sm">
						<span className="text-muted-foreground">Code: </span>
						<span className="font-mono text-xs">
							{record.nfseVerificationCode}
						</span>
					</div>
				)}
				{record.emittedAt && (
					<div className="text-sm">
						<span className="text-muted-foreground">Issued: </span>
						<span>
							{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
								new Date(record.emittedAt),
							)}
						</span>
					</div>
				)}

				{status === "error" && record.errorMessage && (
					<Alert variant="destructive" className="py-2">
						<AlertCircle className="h-4 w-4" />
						<AlertDescription className="text-xs">
							{record.errorMessage}
						</AlertDescription>
					</Alert>
				)}

				<div className="flex flex-wrap gap-2 pt-1">
					{record.pdfUrl && (
						<Button size="sm" variant="outline" asChild>
							<a href={record.pdfUrl} target="_blank" rel="noreferrer">
								<ExternalLink className="mr-1.5 h-3.5 w-3.5" />
								View PDF
							</a>
						</Button>
					)}
					{record.xmlUrl && (
						<Button size="sm" variant="outline" asChild>
							<a href={record.xmlUrl} target="_blank" rel="noreferrer">
								<Download className="mr-1.5 h-3.5 w-3.5" />
								XML
							</a>
						</Button>
					)}
					{(status === "error" || status === "cancelled") && (
						<Button
							size="sm"
							variant="outline"
							onClick={() => reEmitMutation.mutate({ invoiceId })}
							disabled={reEmitMutation.isPending}
						>
							<RefreshCw className="mr-1.5 h-3.5 w-3.5" />
							Re-emit
						</Button>
					)}
					{status === "issued" && (
						<Button
							size="sm"
							variant="ghost"
							className="text-destructive"
							onClick={() => cancelMutation.mutate({ nfseRecordId: record.id })}
							disabled={cancelMutation.isPending}
						>
							<XCircle className="mr-1.5 h-3.5 w-3.5" />
							Cancel NFSe
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

function InvoiceDetailPage() {
	const { id } = Route.useParams();

	const invoiceQuery = trpc.invoices.getById.useQuery({ id });

	const downloadMutation = trpc.invoices.downloadPdf.useMutation({
		onSuccess: (data) => {
			window.open(data.downloadUrl, "_blank");
		},
		onError: (e) => toast.error(e.message),
	});

	const resendMutation = trpc.invoices.resendEmail.useMutation({
		onSuccess: () => toast.success("Email queued for delivery"),
		onError: (e) => toast.error(e.message),
	});

	const issueMutation = trpc.invoices.issue.useMutation({
		onSuccess: () => {
			toast.success("Invoice issued");
			invoiceQuery.refetch();
		},
		onError: (e) => toast.error(e.message),
	});

	const cancelMutation = trpc.invoices.cancel.useMutation({
		onSuccess: () => {
			toast.success("Invoice cancelled");
			invoiceQuery.refetch();
		},
		onError: (e) => toast.error(e.message),
	});

	if (invoiceQuery.isPending) {
		return (
			<DashboardLayout>
				<div className="max-w-2xl space-y-4">
					<Skeleton className="h-6 w-48" />
					<Skeleton className="h-64 w-full" />
				</div>
			</DashboardLayout>
		);
	}

	const invoice = invoiceQuery.data;

	if (!invoice) {
		return (
			<DashboardLayout>
				<div className="flex flex-col items-center justify-center py-24 text-center">
					<Receipt className="mb-3 h-10 w-10 text-muted-foreground/40" />
					<p className="font-medium">Invoice not found</p>
					<Button variant="link" asChild>
						<Link to="/dashboard/invoices">Back to invoices</Link>
					</Button>
				</div>
			</DashboardLayout>
		);
	}

	const status = invoice.status as InvoiceStatus;
	const currency = invoice.currency ?? "BRL";

	return (
		<DashboardLayout>
			<div className="max-w-2xl space-y-6">
				{/* Header */}
				<div className="flex items-start justify-between">
					<div className="flex items-center gap-3">
						<Button variant="ghost" size="icon" asChild>
							<Link to="/dashboard/invoices">
								<ArrowLeft className="h-4 w-4" />
							</Link>
						</Button>
						<div>
							<div className="flex items-center gap-2">
								<h1 className="font-semibold text-xl tracking-tight">
									Invoice #{invoice.number}
								</h1>
								<Badge variant={STATUS_VARIANT[status]}>
									{STATUS_LABELS[status]}
								</Badge>
							</div>
							<p className="text-muted-foreground text-sm">
								Issued {fmtDate(invoice.issuedAt)}
							</p>
						</div>
					</div>

					<div className="flex gap-2">
						{status === "draft" && (
							<Button
								size="sm"
								onClick={() => issueMutation.mutate({ id: invoice.id })}
								disabled={issueMutation.isPending}
							>
								Issue invoice
							</Button>
						)}
						{(status === "issued" || status === "paid") &&
							invoice.customerEmail && (
								<Button
									size="sm"
									variant="outline"
									onClick={() => resendMutation.mutate({ id: invoice.id })}
									disabled={resendMutation.isPending}
								>
									<Mail className="mr-1.5 h-3.5 w-3.5" />
									{resendMutation.isPending ? "Sending…" : "Resend"}
								</Button>
							)}
						<Button
							size="sm"
							variant="outline"
							onClick={() => downloadMutation.mutate({ id: invoice.id })}
							disabled={downloadMutation.isPending}
						>
							<Download className="mr-1.5 h-3.5 w-3.5" />
							Download
						</Button>
						{status !== "cancelled" && status !== "paid" && (
							<Button
								size="sm"
								variant="destructive"
								onClick={() => cancelMutation.mutate({ id: invoice.id })}
								disabled={cancelMutation.isPending}
							>
								<XCircle className="mr-1.5 h-3.5 w-3.5" />
								Cancel
							</Button>
						)}
					</div>
				</div>

				{/* Customer */}
				<Card>
					<CardHeader>
						<CardTitle className="font-medium text-muted-foreground text-sm">
							Bill to
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="font-medium">{invoice.customerName ?? "—"}</p>
						{invoice.customerEmail && (
							<p className="text-muted-foreground text-sm">
								{invoice.customerEmail}
							</p>
						)}
						{invoice.customerDocument && (
							<p className="text-muted-foreground text-sm">
								{invoice.customerDocument}
							</p>
						)}
					</CardContent>
				</Card>

				{/* Dates */}
				<div className="grid grid-cols-2 gap-4">
					<Card>
						<CardContent className="pt-4">
							<p className="text-muted-foreground text-xs">Issue date</p>
							<p className="font-medium text-sm">{fmtDate(invoice.issuedAt)}</p>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="pt-4">
							<p className="text-muted-foreground text-xs">Due date</p>
							<p className="font-medium text-sm">{fmtDate(invoice.dueDate)}</p>
						</CardContent>
					</Card>
					{invoice.paidAt && (
						<Card className="col-span-2 border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
							<CardContent className="pt-4">
								<p className="text-green-700 text-xs dark:text-green-400">
									Paid on
								</p>
								<p className="font-medium text-green-800 text-sm dark:text-green-300">
									{fmtDate(invoice.paidAt)}
								</p>
							</CardContent>
						</Card>
					)}
				</div>

				{/* Line items */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Items</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-0">
							{/* Header row */}
							<div className="grid grid-cols-[1fr_4rem_6rem_6rem] gap-2 pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
								<span>Description</span>
								<span className="text-center">Qty</span>
								<span className="text-right">Unit</span>
								<span className="text-right">Total</span>
							</div>
							<Separator className="mb-2" />
							{invoice.items.length === 0 ? (
								<p className="py-4 text-center text-muted-foreground text-sm">
									No items
								</p>
							) : (
								invoice.items.map((item) => (
									<div
										key={item.id}
										className="grid grid-cols-[1fr_4rem_6rem_6rem] gap-2 border-b py-2 text-sm last:border-0"
									>
										<span>{item.description}</span>
										<span className="text-center">{item.quantity}</span>
										<span className="text-right">
											{fmt(item.unitAmount, currency)}
										</span>
										<span className="text-right font-medium">
											{fmt(item.total, currency)}
										</span>
									</div>
								))
							)}
						</div>

						{/* Totals */}
						<div className="mt-4 space-y-1 text-sm">
							<Separator />
							<div className="flex justify-between pt-2">
								<span className="text-muted-foreground">Subtotal</span>
								<span>{fmt(invoice.amountSubtotal, currency)}</span>
							</div>
							{invoice.amountTax > 0 && (
								<div className="flex justify-between">
									<span className="text-muted-foreground">Tax</span>
									<span>{fmt(invoice.amountTax, currency)}</span>
								</div>
							)}
							<Separator />
							<div className="flex justify-between pt-1 font-semibold text-base">
								<span>Total</span>
								<span>{fmt(invoice.amountTotal, currency)}</span>
							</div>
						</div>
					</CardContent>
				</Card>

				{invoice.description && (
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Notes</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-muted-foreground text-sm">
								{invoice.description}
							</p>
						</CardContent>
					</Card>
				)}

				{/* NFSe status — only show for paid/issued invoices */}
				{(status === "paid" || status === "issued") && (
					<NfseStatusWidget invoiceId={invoice.id} />
				)}
			</div>
		</DashboardLayout>
	);
}
