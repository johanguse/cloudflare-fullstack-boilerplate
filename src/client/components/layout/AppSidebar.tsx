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
} from "@client/components/ui/sidebar";
import { Link, useLocation } from "@tanstack/react-router";
import {
	Bell,
	Building2,
	CreditCard,
	KeyRound,
	LayoutDashboard,
	Receipt,
	Settings,
	User,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { UserMenu } from "./UserMenu";

export function AppSidebar() {
	const { t } = useTranslation();
	const location = useLocation();
	const path = location.pathname;

	const isExact = (to: string) => path === to || path === `${to}/`;

	const isPrefixed = (to: string) => path === to || path.startsWith(`${to}/`);

	return (
		<Sidebar collapsible="none">
			{/* Brand */}
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size="lg" asChild tooltip="My SaaS">
							<Link to="/dashboard">
								<div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground text-sm">
									S
								</div>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-semibold">My SaaS</span>
									<span className="truncate text-muted-foreground text-xs">
										Dashboard
									</span>
								</div>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>

			<SidebarContent>
				{/* Main navigation */}
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
									<LayoutDashboard className="size-4" />
									<span>{t("nav.dashboard", "Dashboard")}</span>
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
									<Receipt className="size-4" />
									<span>{t("nav.invoices", "Invoices")}</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>

						<SidebarMenuItem>
							<SidebarMenuButton
								asChild
								isActive={isPrefixed("/dashboard/billing")}
								tooltip={t("nav.billing", "Billing")}
							>
								<Link to="/dashboard/billing">
									<CreditCard className="size-4" />
									<span>{t("nav.billing", "Billing")}</span>
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
								isActive={isExact("/dashboard/profile")}
								tooltip={t("nav.profile", "Profile")}
							>
								<Link to="/dashboard/profile">
									<User className="size-4" />
									<span>{t("nav.profile", "Profile")}</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>

						<SidebarMenuItem>
							<SidebarMenuButton
								asChild
								isActive={isExact("/dashboard/settings")}
								tooltip={t("nav.settings", "Settings")}
							>
								<Link to="/dashboard/settings">
									<Settings className="size-4" />
									<span>{t("nav.settings", "Settings")}</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>

						<SidebarMenuItem>
							<SidebarMenuButton
								asChild
								isActive={isExact("/dashboard/settings/company")}
								tooltip={t("nav.company", "Company")}
							>
								<Link to="/dashboard/settings/company">
									<Building2 className="size-4" />
									<span>{t("nav.company", "Company")}</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>

						<SidebarMenuItem>
							<SidebarMenuButton
								asChild
								isActive={isExact("/dashboard/settings/notifications")}
								tooltip={t("nav.notifications", "Notifications")}
							>
								<Link to="/dashboard/settings/notifications">
									<Bell className="size-4" />
									<span>{t("nav.notifications", "Notifications")}</span>
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
									<KeyRound className="size-4" />
									<span>{t("nav.apiKeys", "API Keys")}</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuItem>
						<UserMenu />
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
