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
import { UserMenu } from "./UserMenu";

const navMain = [
	{ title: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
	{ title: "Invoices", to: "/dashboard/invoices", icon: Receipt },
	{ title: "Billing", to: "/dashboard/billing", icon: CreditCard },
];

const navSettings = [
	{ title: "Profile", to: "/dashboard/profile", icon: User },
	{ title: "Settings", to: "/dashboard/settings", icon: Settings },
	{ title: "Company", to: "/dashboard/settings/company", icon: Building2 },
	{
		title: "Notifications",
		to: "/dashboard/settings/notifications",
		icon: Bell,
	},
	{ title: "API Keys", to: "/dashboard/api-keys", icon: KeyRound },
];

export function AppSidebar() {
	const location = useLocation();

	const isActive = (path: string) =>
		path === "/dashboard"
			? location.pathname === "/dashboard"
			: location.pathname.startsWith(path);

	return (
		<Sidebar collapsible="icon">
			<SidebarHeader>
				<div className="flex items-center gap-2 px-2 py-1">
					<div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary font-bold text-primary-foreground text-sm">
						S
					</div>
					<span className="font-semibold text-sm group-data-[collapsible=icon]:hidden">
						My SaaS
					</span>
				</div>
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Main</SidebarGroupLabel>
					<SidebarMenu>
						{navMain.map((item) => (
							<SidebarMenuItem key={item.to}>
								<SidebarMenuButton
									asChild
									isActive={isActive(item.to)}
									tooltip={item.title}
								>
									<Link to={item.to} className="flex items-center gap-2">
										<item.icon className="h-4 w-4" />
										<span>{item.title}</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
						))}
					</SidebarMenu>
				</SidebarGroup>

				<SidebarSeparator />

				<SidebarGroup>
					<SidebarGroupLabel>Account</SidebarGroupLabel>
					<SidebarMenu>
						{navSettings.map((item) => (
							<SidebarMenuItem key={item.to}>
								<SidebarMenuButton
									asChild
									isActive={isActive(item.to)}
									tooltip={item.title}
								>
									<Link to={item.to} className="flex items-center gap-2">
										<item.icon className="h-4 w-4" />
										<span>{item.title}</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
						))}
					</SidebarMenu>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter>
				<div className="flex items-center justify-between px-2 pb-2">
					<UserMenu />
				</div>
			</SidebarFooter>
		</Sidebar>
	);
}
