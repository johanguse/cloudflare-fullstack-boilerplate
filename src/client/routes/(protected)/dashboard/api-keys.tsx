import { Button } from "@client/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@client/components/ui/card";
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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@client/components/ui/table";
import { trpc } from "@client/lib/trpc-client";
import { createFileRoute } from "@tanstack/react-router";
import { Key, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export const Route = createFileRoute("/(protected)/dashboard/api-keys")({
	component: ApiKeysPage,
});

function ApiKeysPage() {
	const { t } = useTranslation();
	const listQuery = trpc.apiKeys.list.useQuery();
	const createMutation = trpc.apiKeys.create.useMutation({
		onSuccess: (data) => {
			setCreatedKey(data.apiKey);
			setCreateOpen(false);
			setKeyName("");
			listQuery.refetch();
			toast.success(t("apiKeys.create.success", "API key created"));
		},
		onError: (e) => toast.error(e.message),
	});
	const revokeMutation = trpc.apiKeys.revoke.useMutation({
		onSuccess: () => {
			listQuery.refetch();
			toast.success(t("apiKeys.revoked", "API key revoked"));
		},
		onError: (e) => toast.error(e.message),
	});

	const [createOpen, setCreateOpen] = useState(false);
	const [keyName, setKeyName] = useState("");
	const [createdKey, setCreatedKey] = useState<string | null>(null);

	const rows = listQuery.data ?? [];

	return (
		<>
			<div className="mx-auto w-full max-w-5xl space-y-6">
				<div className="flex flex-wrap items-end justify-between gap-4">
					<div>
						<h1 className="font-semibold text-2xl tracking-tight">
							{t("apiKeys.title", "API Keys")}
						</h1>
						<p className="text-muted-foreground text-sm">
							{t(
								"apiKeys.subtitle",
								"Manage your API keys for programmatic access",
							)}
						</p>
					</div>
					<Button type="button" onClick={() => setCreateOpen(true)}>
						<Plus className="mr-1.5 size-4" />
						{t("apiKeys.createKey", "Create key")}
					</Button>
				</div>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">
							{t("apiKeys.cardTitle", "Your API keys")}
						</CardTitle>
						<CardDescription>
							{t(
								"apiKeys.cardDescription",
								"Keys grant full access to the API — keep them secret",
							)}
						</CardDescription>
					</CardHeader>
					<CardContent>
						{listQuery.isPending ? (
							<p className="text-muted-foreground text-sm">
								{t("apiKeys.loading", "Loading…")}
							</p>
						) : rows.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-12 text-center">
								<Key className="mb-3 size-10 text-muted-foreground/40" />
								<p className="text-muted-foreground text-sm">
									{t(
										"apiKeys.noKeys",
										"No API keys yet. Create one to get started.",
									)}
								</p>
							</div>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>{t("apiKeys.headers.name", "Name")}</TableHead>
										<TableHead>
											{t("apiKeys.headers.prefix", "Prefix")}
										</TableHead>
										<TableHead>
											{t("apiKeys.headers.created", "Created")}
										</TableHead>
										<TableHead className="w-[100px]" />
									</TableRow>
								</TableHeader>
								<TableBody>
									{rows.map((row) => (
										<TableRow key={row.id}>
											<TableCell className="font-medium">{row.name}</TableCell>
											<TableCell className="font-mono text-xs">
												{row.keyPrefix}…
											</TableCell>
											<TableCell className="text-muted-foreground text-sm">
												{row.createdAt
													? new Date(row.createdAt).toLocaleDateString()
													: "—"}
											</TableCell>
											<TableCell className="text-right">
												<Button
													type="button"
													variant="ghost"
													size="icon"
													className="text-destructive"
													aria-label="Revoke key"
													onClick={() => revokeMutation.mutate({ id: row.id })}
													disabled={revokeMutation.isPending}
												>
													<Trash2 className="size-4" />
												</Button>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</CardContent>
				</Card>
			</div>

			<Dialog open={createOpen} onOpenChange={setCreateOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{t("apiKeys.create.title", "Create API key")}
						</DialogTitle>
						<DialogDescription>
							{t(
								"apiKeys.create.description",
								"Give your key a memorable name",
							)}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-2">
						<Label htmlFor="keyName">
							{t("apiKeys.create.nameLabel", "Key name")}
						</Label>
						<Input
							id="keyName"
							value={keyName}
							onChange={(e) => setKeyName(e.target.value)}
							placeholder={t("apiKeys.create.namePlaceholder", "My app")}
						/>
					</div>
					<DialogFooter>
						<Button
							type="button"
							disabled={!keyName.trim() || createMutation.isPending}
							onClick={() => createMutation.mutate({ name: keyName.trim() })}
						>
							{createMutation.isPending
								? t("apiKeys.create.creating", "Creating…")
								: t("apiKeys.create.create", "Create")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={createdKey !== null}
				onOpenChange={() => setCreatedKey(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{t("apiKeys.copy.title", "Copy your API key")}
						</DialogTitle>
						<DialogDescription>
							{t(
								"apiKeys.copy.description",
								"This key will only be shown once. Copy it now and store it safely.",
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
									toast.success(
										t("apiKeys.copy.copied", "Copied to clipboard"),
									);
								}
							}}
						>
							{t("apiKeys.copy.copy", "Copy key")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
