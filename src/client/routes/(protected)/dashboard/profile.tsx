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
import { Input } from "@client/components/ui/input";
import { Label } from "@client/components/ui/label";
import { Skeleton } from "@client/components/ui/skeleton";
import { trpc } from "@client/lib/trpc-client";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/(protected)/dashboard/profile")({
	component: ProfilePage,
});

function ProfilePage() {
	const profileQuery = trpc.user.getProfile.useQuery();
	const updateMutation = trpc.user.updateProfile.useMutation({
		onSuccess: () => {
			toast.success("Profile updated");
			profileQuery.refetch();
		},
		onError: (err) => toast.error(err.message ?? "Failed to update profile"),
	});

	const [name, setName] = useState("");

	useEffect(() => {
		if (profileQuery.data?.name) {
			setName(profileQuery.data.name);
		}
	}, [profileQuery.data]);

	const handleSave = (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) {
			toast.error("Name cannot be empty");
			return;
		}
		updateMutation.mutate({ name: name.trim() });
	};

	return (
		<DashboardLayout>
			<div className="max-w-2xl space-y-6">
				<div>
					<h1 className="font-semibold text-2xl tracking-tight">Profile</h1>
					<p className="text-muted-foreground text-sm">
						Manage your personal information
					</p>
				</div>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">Personal information</CardTitle>
						<CardDescription>
							Update your name and account details
						</CardDescription>
					</CardHeader>
					<CardContent>
						{profileQuery.isLoading ? (
							<div className="space-y-3">
								<Skeleton className="h-9 w-full" />
								<Skeleton className="h-9 w-full" />
								<Skeleton className="h-9 w-24" />
							</div>
						) : (
							<form onSubmit={handleSave} className="space-y-4">
								<div className="space-y-1.5">
									<Label htmlFor="name">Full name</Label>
									<Input
										id="name"
										value={name}
										onChange={(e) => setName(e.target.value)}
										placeholder="Your name"
										required
									/>
								</div>
								<div className="space-y-1.5">
									<div className="flex items-center justify-between">
										<Label htmlFor="email">Email address</Label>
										{profileQuery.data?.emailVerified ? (
											<Badge
												variant="secondary"
												className="gap-1 text-green-700 text-xs dark:text-green-400"
											>
												<CheckCircle2 className="h-3 w-3" />
												Verified
											</Badge>
										) : (
											<Badge variant="destructive" className="gap-1 text-xs">
												<XCircle className="h-3 w-3" />
												Not verified
											</Badge>
										)}
									</div>
									<Input
										id="email"
										value={profileQuery.data?.email ?? ""}
										disabled
										className="bg-muted"
									/>
									<p className="text-muted-foreground text-xs">
										Email changes require verification. Contact support to
										update.
									</p>
								</div>
								<Button
									type="submit"
									disabled={updateMutation.isPending || !name.trim()}
								>
									{updateMutation.isPending && (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									)}
									Save changes
								</Button>
							</form>
						)}
					</CardContent>
				</Card>
			</div>
		</DashboardLayout>
	);
}
