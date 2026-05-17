import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@client/components/ui/collapsible";
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
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarRail,
} from "@client/components/ui/sidebar";
import { Link, useLocation } from "@tanstack/react-router";
import {
	Bell,
	Building2,
	ChevronRight,
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

	const isExact = (to: string) =>
		path === to || path === `${to}/`;

	const isPrefixed = (to: string) =>
		path === to || path.startsWith(`${to}/`);

	// Settings sub-pages — any of these makes the parent "active"
	const settingsSubPaths = [
		"/dashboard/settings",
		"/dashboard/settings/company",
		"/dashboard/settings/notifications",
	];
	const isSettingsOpen = settingsSubPaths.some((p) => isPrefixed(p));

	return (
		<Sidebar collapsible="icon">
			{/* Brand */}
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							size="lg"
							asChild
							tooltip="My SaaS"
						>
							<Link to="/dashboard">
								<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground text-sm">
									S
								</div>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-semibold">My SaaS</span>
									<span className="truncate text-xs text-muted-foreground">Dashboard</span>
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
									<LayoutDashboard className="h-4 w-4" />
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
									<Receipt className="h-4 w-4" />
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
									<CreditCard className="h-4 w-4" />
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
									<User className="h-4 w-4" />
									<span>{t("nav.profile", "Profile")}</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>

						{/* Settings — collapsible with sub-pages */}
						<Collapsible
							asChild
							defaultOpen={isSettingsOpen}
							className="group/collapsible"
						>
							<SidebarMenuItem>
								<CollapsibleTrigger asChild>
									<SidebarMenuButton
										isActive={isSettingsOpen}
										tooltip={t("nav.settings", "Settings")}
									>
										<Settings className="h-4 w-4" />
										<span>{t("nav.settings", "Settings")}</span>
										<ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
									</SidebarMenuButton>
								</CollapsibleTrigger>
								<CollapsibleContent>
									<SidebarMenuSub>
										<SidebarMenuSubItem>
											<SidebarMenuSubButton
												asChild
												isActive={isExact("/dashboard/settings")}
											>
												<Link to="/dashboard/settings">
													<span>{t("nav.general", "General")}</span>
												</Link>
											</SidebarMenuSubButton>
										</SidebarMenuSubItem>
										<SidebarMenuSubItem>
											<SidebarMenuSubButton
												asChild
												isActive={isExact("/dashboard/settings/company")}
											>
												<Link to="/dashboard/settings/company">
													<Building2 className="h-3.5 w-3.5" />
													<span>{t("nav.company", "Company")}</span>
												</Link>
											</SidebarMenuSubButton>
										</SidebarMenuSubItem>
										<SidebarMenuSubItem>
											<SidebarMenuSubButton
												asChild
												isActive={isExact("/dashboard/settings/notifications")}
											>
												<Link to="/dashboard/settings/notifications">
													<Bell className="h-3.5 w-3.5" />
													<span>{t("nav.notifications", "Notifications")}</span>
												</Link>
											</SidebarMenuSubButton>
										</SidebarMenuSubItem>
									</SidebarMenuSub>
								</CollapsibleContent>
							</SidebarMenuItem>
						</Collapsible>

						<SidebarMenuItem>
							<SidebarMenuButton
								asChild
								isActive={isExact("/dashboard/api-keys")}
								tooltip={t("nav.apiKeys", "API Keys")}
							>
								<Link to="/dashboard/api-keys">
									<KeyRound className="h-4 w-4" />
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
			<SidebarRail />
		</Sidebar>
	);
}
