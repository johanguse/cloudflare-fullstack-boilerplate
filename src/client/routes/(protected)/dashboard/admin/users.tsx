import { Avatar, AvatarFallback } from "@client/components/ui/avatar";
import { Badge } from "@client/components/ui/badge";
import { Button } from "@client/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@client/components/ui/card";
import { Separator } from "@client/components/ui/separator";
import { Skeleton } from "@client/components/ui/skeleton";
import { trpc } from "@client/lib/trpc-client";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export const Route = createFileRoute("/(protected)/dashboard/admin/users")({
	component: AdminUsersPage,
});

function AdminUsersPage() {
	const { t } = useTranslation();
	const utils = trpc.useUtils();
	const { data: users, isPending } = trpc.admin.listUsers.useQuery();
	const updateRoleMutation = trpc.admin.updateUserRole.useMutation({
		onSuccess: () => {
			toast.success(t("admin.users.roleUpdated", "Role updated"));
			utils.admin.listUsers.invalidate();
		},
		onError: (e) => toast.error(e.message),
	});

	const planBadgeVariant = (plan: string) => {
		if (plan === "free") return "secondary";
		return "default";
	};

	return (
		<div className="w-full space-y-6">
			<div>
				<h1 className="font-semibold text-2xl tracking-tight">
					{t("admin.users.title", "All Users")}
				</h1>
				<p className="text-muted-foreground text-sm">
					{t("admin.users.subtitle", "View and manage all registered users.")}
				</p>
			</div>
			<Separator />

			<Card>
				<CardHeader>
					<CardTitle className="text-base">
						{t("admin.users.list", "User list")}
					</CardTitle>
					<CardDescription>
						{isPending
							? "..."
							: t("admin.users.count", "{{count}} users total", {
									count: users?.length ?? 0,
								})}
					</CardDescription>
				</CardHeader>
				<CardContent className="p-0">
					{isPending ? (
						<div className="divide-y">
							{Array.from({ length: 5 }).map((_, i) => (
								<div key={i} className="flex items-center gap-3 px-6 py-4">
									<Skeleton className="size-9 rounded-full" />
									<div className="flex-1 space-y-1">
										<Skeleton className="h-4 w-32" />
										<Skeleton className="h-3 w-48" />
									</div>
									<Skeleton className="h-5 w-16 rounded-full" />
								</div>
							))}
						</div>
					) : (
						<div className="divide-y">
							{users?.map((user) => {
								const initials = user.name
									? user.name
											.split(" ")
											.map((n) => n[0])
											.join("")
											.toUpperCase()
											.slice(0, 2)
									: user.email[0].toUpperCase();
								return (
									<div
										key={user.id}
										className="flex items-center gap-3 px-6 py-3"
									>
										<Avatar>
											<AvatarFallback className="text-xs">
												{initials}
											</AvatarFallback>
										</Avatar>
										<div className="min-w-0 flex-1">
											<p className="truncate font-medium text-sm">
												{user.name || "—"}
											</p>
											<p className="truncate text-muted-foreground text-xs">
												{user.email}
											</p>
										</div>
										<div className="flex shrink-0 items-center gap-2">
											{user.emailVerified ? (
												<span
													className="flex items-center"
													title="Email verified"
												>
													<CheckCircle2
														aria-hidden="true"
														className="size-3.5 text-green-500"
													/>
													<span className="sr-only">Email verified</span>
												</span>
											) : (
												<span
													className="flex items-center"
													title="Email not verified"
												>
													<XCircle
														aria-hidden="true"
														className="size-3.5 text-muted-foreground"
													/>
													<span className="sr-only">Email not verified</span>
												</span>
											)}
											<Badge
												variant={planBadgeVariant(user.plan)}
												className="capitalize"
											>
												{user.plan}
											</Badge>
											{user.role === "admin" ? (
												<Button
													variant="ghost"
													size="sm"
													className="h-6 px-2 text-muted-foreground text-xs"
													disabled={updateRoleMutation.isPending}
													onClick={() =>
														updateRoleMutation.mutate({
															userId: user.id,
															role: "user",
														})
													}
												>
													{t("admin.users.removeAdmin", "Remove admin")}
												</Button>
											) : (
												<Button
													variant="ghost"
													size="sm"
													className="h-6 px-2 text-xs"
													disabled={updateRoleMutation.isPending}
													onClick={() =>
														updateRoleMutation.mutate({
															userId: user.id,
															role: "admin",
														})
													}
												>
													{t("admin.users.makeAdmin", "Make admin")}
												</Button>
											)}
										</div>
									</div>
								);
							})}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
