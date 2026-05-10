import { DashboardLayout } from "@client/components/layout/DashboardLayout";
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
import { toast } from "sonner";

export const Route = createFileRoute("/(protected)/dashboard/api-keys")({
	component: ApiKeysPage,
});

function ApiKeysPage() {
	const listQuery = trpc.apiKeys.list.useQuery();
	const createMutation = trpc.apiKeys.create.useMutation({
		onSuccess: (data) => {
			setCreatedKey(data.apiKey);
			setCreateOpen(false);
			setKeyName("");
			listQuery.refetch();
			toast.success("API key created — copy it now; it won’t be shown again.");
		},
		onError: (e) => toast.error(e.message),
	});
	const revokeMutation = trpc.apiKeys.revoke.useMutation({
		onSuccess: () => {
			listQuery.refetch();
			toast.success("API key revoked");
		},
		onError: (e) => toast.error(e.message),
	});

	const [createOpen, setCreateOpen] = useState(false);
	const [keyName, setKeyName] = useState("");
	const [createdKey, setCreatedKey] = useState<string | null>(null);

	const rows = listQuery.data ?? [];

	return (
		<DashboardLayout>
			<div className="space-y-6">
				<div className="flex flex-wrap items-end justify-between gap-4">
					<div>
						<h1 className="font-semibold text-2xl tracking-tight">API Keys</h1>
						<p className="text-muted-foreground text-sm">
							Programmatic access — store keys securely; we only store a hash
						</p>
					</div>
					<Button type="button" onClick={() => setCreateOpen(true)}>
						<Plus className="mr-1.5 h-4 w-4" />
						Create key
					</Button>
				</div>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">Your keys</CardTitle>
						<CardDescription>
							Each key is shown once at creation. Revoke a key if it may be
							compromised.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{listQuery.isPending ? (
							<p className="text-muted-foreground text-sm">Loading…</p>
						) : rows.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-12 text-center">
								<Key className="mb-3 h-10 w-10 text-muted-foreground/40" />
								<p className="text-muted-foreground text-sm">No API keys yet</p>
							</div>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Name</TableHead>
										<TableHead>Prefix</TableHead>
										<TableHead>Created</TableHead>
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
													<Trash2 className="h-4 w-4" />
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
						<DialogTitle>Create API key</DialogTitle>
						<DialogDescription>
							Give it a label you’ll recognize in audit logs.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-2">
						<Label htmlFor="keyName">Name</Label>
						<Input
							id="keyName"
							value={keyName}
							onChange={(e) => setKeyName(e.target.value)}
							placeholder="CI / production"
						/>
					</div>
					<DialogFooter>
						<Button
							type="button"
							disabled={!keyName.trim() || createMutation.isPending}
							onClick={() => createMutation.mutate({ name: keyName.trim() })}
						>
							{createMutation.isPending ? "Creating…" : "Create"}
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
						<DialogTitle>Copy your API key</DialogTitle>
						<DialogDescription>
							This secret is only shown once. Store it in a password manager or
							secret store.
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
									toast.success("Copied");
								}
							}}
						>
							Copy
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</DashboardLayout>
	);
}
