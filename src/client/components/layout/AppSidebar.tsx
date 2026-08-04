import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarSeparator,
} from "@client/components/ui/sidebar";
import { trpc } from "@client/lib/trpc-client";
import { Link, useLocation } from "@tanstack/react-router";
import {
	ActivitySquare,
	CreditCard,
	Gift,
	KeyRound,
	LayoutDashboard,
	ScrollText,
	Settings2,
	ShieldCheck,
	Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { SidebarPlanCard } from "./SidebarPlanCard";
import { TeamSwitcher } from "./TeamSwitcher";
import { UserMenu } from "./UserMenu";

export function AppSidebar() {
	const { t } = useTranslation();
	const location = useLocation();
	const path = location.pathname;

	const isExact = (to: string) => path === to || path === `${to}/`;
	const isPrefixed = (to: string) => path === to || path.startsWith(`${to}/`);

	const { data: roleData } = trpc.user.getRole.useQuery();
	const isAdmin = roleData?.role === "admin";

	return (
		<Sidebar collapsible="icon">
			<SidebarHeader>
				<TeamSwitcher />
			</SidebarHeader>

			<SidebarContent data-tour="sidebar-nav">
				{/* Main */}
				<SidebarGroup>
					<SidebarGroupLabel>{t("nav.main", "Main")}</SidebarGroupLabel>
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton
								asChild
								isActive={isExact("/dashboard")}
								tooltip={t("nav.dashboard", "Dashboard")}
							>
								<Link to="/dashboard">
									<LayoutDashboard />
									<span>{t("nav.dashboard", "Dashboard")}</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarGroup>

				{/* Account */}
				<SidebarGroup>
					<SidebarGroupLabel>{t("nav.account", "Account")}</SidebarGroupLabel>
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton
								asChild
								isActive={isPrefixed("/dashboard/billing")}
								tooltip={t("nav.billing", "Billing")}
							>
								<Link to="/dashboard/billing">
									<CreditCard />
									<span>{t("nav.billing", "Billing")}</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>

						<SidebarMenuItem>
							<SidebarMenuButton
								asChild
								isActive={isPrefixed("/dashboard/invoices")}
								tooltip={t("nav.invoices", "Invoices")}
							>
								<Link to="/dashboard/invoices">
									<ScrollText />
									<span>{t("nav.invoices", "Invoices")}</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>

						<SidebarMenuItem>
							<SidebarMenuButton
								asChild
								isActive={isExact("/dashboard/api-keys")}
								tooltip={t("nav.apiKeys", "API Keys")}
							>
								<Link to="/dashboard/api-keys">
									<KeyRound />
									<span>{t("nav.apiKeys", "API Keys")}</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>

						<SidebarMenuItem>
							<SidebarMenuButton
								asChild
								isActive={isExact("/dashboard/referrals")}
								tooltip={t("nav.referrals", "Refer & earn")}
							>
								<Link to="/dashboard/referrals">
									<Gift />
									<span>{t("nav.referrals", "Refer & earn")}</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>

						<SidebarMenuItem>
							<SidebarMenuButton
								asChild
								isActive={isPrefixed("/dashboard/settings")}
								tooltip={t("nav.settings", "Settings")}
							>
								<Link to="/dashboard/settings">
									<Settings2 />
									<span>{t("nav.settings", "Settings")}</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarGroup>

				{/* Admin — only shown for admin users */}
				{isAdmin && (
					<>
						<SidebarSeparator />
						<SidebarGroup>
							<SidebarGroupLabel className="flex items-center gap-1.5">
								<ShieldCheck className="size-3" />
								{t("nav.admin", "Admin")}
							</SidebarGroupLabel>
							<SidebarMenu>
								<SidebarMenuItem>
									<SidebarMenuButton
										asChild
										isActive={isExact("/dashboard/admin")}
										tooltip={t("nav.adminReports", "Reports")}
									>
										<Link to="/dashboard/admin">
											<ScrollText />
											<span>{t("nav.adminReports", "Reports")}</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>

								<SidebarMenuItem>
									<SidebarMenuButton
										asChild
										isActive={isExact("/dashboard/admin/users")}
										tooltip={t("nav.adminUsers", "All Users")}
									>
										<Link to="/dashboard/admin/users">
											<Users />
											<span>{t("nav.adminUsers", "All Users")}</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>

								<SidebarMenuItem>
									<SidebarMenuButton
										asChild
										isActive={isExact("/dashboard/admin/activity")}
										tooltip={t("nav.adminActivity", "Activity Logs")}
									>
										<Link to="/dashboard/admin/activity">
											<ActivitySquare />
											<span>{t("nav.adminActivity", "Activity Logs")}</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							</SidebarMenu>
						</SidebarGroup>
					</>
				)}
			</SidebarContent>

			<SidebarFooter>
				<SidebarPlanCard />
				<SidebarMenu>
					<SidebarMenuItem>
						<UserMenu />
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
