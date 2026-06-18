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
import { useTranslation } from "react-i18next";
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

const _longDateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" });
const _mediumDateFmt = new Intl.DateTimeFormat("pt-BR", {
	dateStyle: "medium",
});

function fmtDate(d: Date | string | null | undefined) {
	if (!d) return "—";
	return _longDateFmt.format(new Date(d));
}

// ---------------------------------------------------------------------------
// NFSe Status Widget
// ---------------------------------------------------------------------------

type NfseStatus = "pending" | "processing" | "issued" | "error" | "cancelled" | "invoice_only";

const NFSE_STATUS_ICONS: Record<
	NfseStatus,
	{
		variant: "default" | "secondary" | "destructive" | "outline";
		icon: React.ComponentType<{ className?: string }>;
	}
> = {
	pending: { variant: "secondary", icon: Clock },
	processing: { variant: "outline", icon: Loader2 },
	issued: { variant: "default", icon: CheckCircle2 },
	error: { variant: "destructive", icon: AlertCircle },
	cancelled: { variant: "destructive", icon: XCircle },
	invoice_only: { variant: "secondary", icon: Receipt },
};

function NfseStatusWidget({ invoiceId }: { invoiceId: string }) {
	const { t } = useTranslation();
	const nfseQuery = trpc.nfse.getStatus.useQuery({ invoiceId });
	const reEmitMutation = trpc.nfse.reEmit.useMutation({
		onSuccess: () => {
			toast.success(t("invoiceDetail.nfse.reEmitQueued", "Re-emission queued"));
			nfseQuery.refetch();
		},
		onError: (e) => toast.error(e.message),
	});
	const cancelMutation = trpc.nfse.cancel.useMutation({
		onSuccess: () => {
			toast.success(t("invoiceDetail.nfse.cancelled", "NFSe cancelled"));
			nfseQuery.refetch();
		},
		onError: (e) => toast.error(e.message),
	});

	if (nfseQuery.isPending) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="text-base">
						{t("invoiceDetail.nfse.title", "NFSe")}
					</CardTitle>
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
					<CardTitle className="text-base">
						{t("invoiceDetail.nfse.title", "NFSe")}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground text-sm">
						{t("invoiceDetail.nfse.noRecord", "No NFSe record found")}
					</p>
					<Button
						size="sm"
						variant="outline"
						className="mt-3"
						onClick={() => reEmitMutation.mutate({ invoiceId })}
						disabled={reEmitMutation.isPending}
					>
						<RefreshCw className="mr-1.5 size-3.5" />
						{t("invoiceDetail.nfse.requestEmission", "Request emission")}
					</Button>
				</CardContent>
			</Card>
		);
	}

	const status = record.status as NfseStatus;
	const cfg = NFSE_STATUS_ICONS[status];
	const Icon = cfg.icon;
	const statusLabel = t(`invoiceDetail.nfse.status.${status}`, status);

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle className="text-base">
						{t("invoiceDetail.nfse.title", "NFSe")}
					</CardTitle>
					<Badge variant={cfg.variant} className="gap-1">
						<Icon className="size-3" />
						{statusLabel}
					</Badge>
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				{record.nfseNumber && (
					<div className="text-sm">
						<span className="text-muted-foreground">
							{t("invoiceDetail.nfse.number", "NFSe number: ")}
						</span>
						<span className="font-medium font-mono">{record.nfseNumber}</span>
					</div>
				)}
				{record.emittedAt && (
					<div className="text-sm">
						<span className="text-muted-foreground">
							{t("invoiceDetail.nfse.issuedAt", "Issued at: ")}
						</span>
						<span>{_mediumDateFmt.format(new Date(record.emittedAt))}</span>
					</div>
				)}

				{status === "error" && record.errorMessage && (
					<Alert variant="destructive" className="py-2">
						<AlertCircle className="size-4" />
						<AlertDescription className="text-xs">
							{record.errorMessage}
						</AlertDescription>
					</Alert>
				)}

				<div className="flex flex-wrap gap-2 pt-1">
					{record.pdfUrl && (
						<Button size="sm" variant="outline" asChild>
							<a href={record.pdfUrl} target="_blank" rel="noreferrer">
								<ExternalLink className="mr-1.5 size-3.5" />
								{t("invoiceDetail.nfse.viewPdf", "View PDF")}
							</a>
						</Button>
					)}
					{record.xmlUrl && (
						<Button size="sm" variant="outline" asChild>
							<a href={record.xmlUrl} target="_blank" rel="noreferrer">
								<Download className="mr-1.5 size-3.5" />
								{t("invoiceDetail.nfse.xml", "Download XML")}
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
							<RefreshCw className="mr-1.5 size-3.5" />
							{t("invoiceDetail.nfse.reEmit", "Re-emit")}
						</Button>
					)}
					{status === "issued" && (
						<Button
							size="sm"
							variant="ghost"
							className="text-destructive"
							onClick={() =>
								cancelMutation.mutate({
									nfseRecordId: record.id,
									reason: "Cancelled by customer request",
								})
							}
							disabled={cancelMutation.isPending}
						>
							<XCircle className="mr-1.5 size-3.5" />
							{t("invoiceDetail.nfse.cancelNfse", "Cancel NFSe")}
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
	const { t } = useTranslation();
	const { id } = Route.useParams();

	const invoiceQuery = trpc.invoices.getById.useQuery({ id });

	const downloadMutation = trpc.invoices.downloadPdf.useMutation({
		onSuccess: (data) => {
			window.open(data.downloadUrl, "_blank");
		},
		onError: (e) => toast.error(e.message),
	});

	const resendMutation = trpc.invoices.resendEmail.useMutation({
		onSuccess: () =>
			toast.success(
				t("invoiceDetail.emailQueued", "Email queued for delivery"),
			),
		onError: (e) => toast.error(e.message),
	});

	const issueMutation = trpc.invoices.issue.useMutation({
		onSuccess: () => {
			toast.success(t("invoiceDetail.invoiceIssued", "Invoice issued"));
			invoiceQuery.refetch();
		},
		onError: (e) => toast.error(e.message),
	});

	const cancelMutation = trpc.invoices.cancel.useMutation({
		onSuccess: () => {
			toast.success(t("invoiceDetail.invoiceCancelled", "Invoice cancelled"));
			invoiceQuery.refetch();
		},
		onError: (e) => toast.error(e.message),
	});

	const statusLabels: Record<InvoiceStatus, string> = {
		draft: t("invoiceDetail.status.draft", "Draft"),
		issued: t("invoiceDetail.status.issued", "Issued"),
		paid: t("invoiceDetail.status.paid", "Paid"),
		cancelled: t("invoiceDetail.status.cancelled", "Cancelled"),
		overdue: t("invoiceDetail.status.overdue", "Overdue"),
	};

	if (invoiceQuery.isPending) {
		return (
			<div className="max-w-2xl space-y-4">
				<Skeleton className="h-6 w-48" />
				<Skeleton className="h-64 w-full" />
			</div>
		);
	}

	const invoice = invoiceQuery.data;

	if (!invoice) {
		return (
			<div className="flex flex-col items-center justify-center py-24 text-center">
				<Receipt className="mb-3 size-10 text-muted-foreground/40" />
				<p className="font-medium">
					{t("invoiceDetail.notFound", "Invoice not found")}
				</p>
				<Button variant="link" asChild>
					<Link to="/dashboard/invoices">
						{t("invoiceDetail.back", "Back to invoices")}
					</Link>
				</Button>
			</div>
		);
	}

	const status = invoice.status as InvoiceStatus;
	const currency = invoice.currency ?? "BRL";

	return (
		<div className="mx-auto w-full max-w-3xl space-y-6">
			{/* Header */}
			<div className="flex items-start justify-between">
				<div className="flex items-center gap-3">
					<Button variant="ghost" size="icon" asChild>
						<Link to="/dashboard/invoices">
							<ArrowLeft className="size-4" />
						</Link>
					</Button>
					<div>
						<div className="flex items-center gap-2">
							<h1 className="font-semibold text-xl tracking-tight">
								{t("invoiceDetail.invoiceNumber", { number: invoice.number, defaultValue: "Invoice #{{number}}" })}
							</h1>
							<Badge variant={STATUS_VARIANT[status]}>
								{statusLabels[status]}
							</Badge>
						</div>
						<p className="text-muted-foreground text-sm">
							{t("invoiceDetail.issued", {
								date: fmtDate(invoice.issuedAt),
								defaultValue: "Issued {{date}}",
							})}
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
							{t("invoiceDetail.issueInvoice", "Issue invoice")}
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
								<Mail className="mr-1.5 size-3.5" />
								{resendMutation.isPending
									? t("invoiceDetail.sending", "Sending…")
									: t("invoiceDetail.resend", "Resend email")}
							</Button>
						)}
					<Button
						size="sm"
						variant="outline"
						onClick={() => downloadMutation.mutate({ id: invoice.id })}
						disabled={downloadMutation.isPending}
					>
						<Download className="mr-1.5 size-3.5" />
						{t("invoiceDetail.download", "Download PDF")}
					</Button>
					{status !== "cancelled" && status !== "paid" && (
						<Button
							size="sm"
							variant="destructive"
							onClick={() => cancelMutation.mutate({ id: invoice.id })}
							disabled={cancelMutation.isPending}
						>
							<XCircle className="mr-1.5 size-3.5" />
							{t("invoiceDetail.cancel", "Cancel invoice")}
						</Button>
					)}
				</div>
			</div>

			{/* Customer */}
			<Card>
				<CardHeader>
					<CardTitle className="font-medium text-muted-foreground text-sm">
						{t("invoiceDetail.billTo", "Bill to")}
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
						<p className="text-muted-foreground text-xs">
							{t("invoiceDetail.issueDate", "Issue date")}
						</p>
						<p className="font-medium text-sm">{fmtDate(invoice.issuedAt)}</p>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-4">
						<p className="text-muted-foreground text-xs">
							{t("invoiceDetail.dueDate", "Due date")}
						</p>
						<p className="font-medium text-sm">{fmtDate(invoice.dueDate)}</p>
					</CardContent>
				</Card>
				{invoice.paidAt && (
					<Card className="col-span-2 border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
						<CardContent className="pt-4">
							<p className="text-green-700 text-xs dark:text-green-400">
								{t("invoiceDetail.paidOn", "Paid on")}
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
					<CardTitle className="text-base">
						{t("invoiceDetail.items", "Line items")}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-0">
						{/* Header row */}
						<div className="grid grid-cols-[1fr_4rem_6rem_6rem] gap-2 pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
							<span>
								{t("invoiceDetail.itemsHeader.description", "Description")}
							</span>
							<span className="text-center">
								{t("invoiceDetail.itemsHeader.qty", "Qty")}
							</span>
							<span className="text-right">
								{t("invoiceDetail.itemsHeader.unit", "Unit")}
							</span>
							<span className="text-right">
								{t("invoiceDetail.itemsHeader.total", "Total")}
							</span>
						</div>
						<Separator className="mb-2" />
						{invoice.items.length === 0 ? (
							<p className="py-4 text-center text-muted-foreground text-sm">
								{t("invoiceDetail.noItems", "No line items")}
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
							<span className="text-muted-foreground">
								{t("invoiceDetail.subtotal", "Subtotal")}
							</span>
							<span>{fmt(invoice.amountSubtotal, currency)}</span>
						</div>
						{invoice.amountTax > 0 && (
							<div className="flex justify-between">
								<span className="text-muted-foreground">
									{t("invoiceDetail.tax", "Tax")}
								</span>
								<span>{fmt(invoice.amountTax, currency)}</span>
							</div>
						)}
						<Separator />
						<div className="flex justify-between pt-1 font-semibold text-base">
							<span>{t("invoiceDetail.total", "Total")}</span>
							<span>{fmt(invoice.amountTotal, currency)}</span>
						</div>
					</div>
				</CardContent>
			</Card>

			{invoice.description && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">
							{t("invoiceDetail.notes", "Notes")}
						</CardTitle>
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
	);
}
