import { ScrollArea } from "@client/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@client/components/ui/select";
import { Separator } from "@client/components/ui/separator";
import { cn } from "@client/lib/utils";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Bell, Building2, CreditCard, FileText, Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface NavItem {
	href: string;
	titleKey: string;
	fallback: string;
	icon: React.ReactNode;
}

interface NavGroup {
	labelKey: string;
	fallback: string;
	items: NavItem[];
}

const navGroups: NavGroup[] = [
	{
		labelKey: "settings.navGroup.preferences",
		fallback: "Preferences",
		items: [
			{
				href: "/dashboard/settings",
				titleKey: "settings.nav.general",
				fallback: "General",
				icon: <Settings2 size={15} />,
			},
			{
				href: "/dashboard/settings/notifications",
				titleKey: "settings.nav.notifications",
				fallback: "Notifications",
				icon: <Bell size={15} />,
			},
		],
	},
	{
		labelKey: "settings.navGroup.billing",
		fallback: "Billing",
		items: [
			{
				href: "/dashboard/billing",
				titleKey: "settings.nav.billing",
				fallback: "Billing",
				icon: <CreditCard size={15} />,
			},
			{
				href: "/dashboard/invoices",
				titleKey: "settings.nav.invoices",
				fallback: "Invoices",
				icon: <FileText size={15} />,
			},
		],
	},
	{
		labelKey: "settings.navGroup.integrations",
		fallback: "Integrations",
		items: [
			{
				href: "/dashboard/settings/company",
				titleKey: "settings.nav.company",
				fallback: "NFSe",
				icon: <Building2 size={15} />,
			},
		],
	},
];

const allNavItems = navGroups.flatMap((g) => g.items);

interface SettingsLayoutProps {
	children: React.ReactNode;
}

export function SettingsLayout({ children }: SettingsLayoutProps) {
	const { t } = useTranslation();
	const { pathname } = useLocation();
	const navigate = useNavigate();

	const isActive = (href: string) =>
		pathname === href || pathname === `${href}/`;

	return (
		<div className="mx-auto w-full max-w-4xl space-y-0.5">
			<h1 className="font-semibold text-2xl tracking-tight">
				{t("settings.title", "Settings")}
			</h1>
			<p className="text-muted-foreground text-sm">
				{t(
					"settings.subtitle",
					"Manage your account settings and preferences.",
				)}
			</p>
			<Separator className="my-4 lg:my-6" />

			<div className="flex flex-1 flex-col space-y-2 md:space-y-2 lg:flex-row lg:space-x-12 lg:space-y-0">
				{/* Mobile: dropdown */}
				<div className="p-1 md:hidden">
					<Select
						value={pathname}
						onValueChange={(href) => href && navigate({ to: href })}
					>
						<SelectTrigger className="h-12">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{allNavItems.map((item) => (
								<SelectItem key={item.href} value={item.href}>
									<div className="flex items-center gap-3 px-1 py-0.5">
										<span>{item.icon}</span>
										<span>{t(item.titleKey, item.fallback)}</span>
									</div>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{/* Desktop: sidebar nav with groups */}
				<aside className="top-0 hidden md:block lg:sticky lg:w-44 lg:shrink-0 lg:self-start">
					<ScrollArea className="w-full bg-background px-1 py-1">
						<nav className="flex flex-col gap-5">
							{navGroups.map((group) => (
								<div key={group.fallback} className="flex flex-col gap-0.5">
									<p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
										{t(group.labelKey, group.fallback)}
									</p>
									{group.items.map((item) => {
										const active = isActive(item.href);
										return (
											<Link
												key={item.href}
												to={item.href}
												className={cn(
													"flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
													active
														? "bg-muted font-medium text-foreground"
														: "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
												)}
											>
												<span
													className={cn(
														"shrink-0",
														active ? "text-foreground" : "text-muted-foreground",
													)}
												>
													{item.icon}
												</span>
												{t(item.titleKey, item.fallback)}
											</Link>
										);
									})}
								</div>
							))}
						</nav>
					</ScrollArea>
				</aside>

				{/* Content */}
				<div className="flex-1 pb-8">{children}</div>
			</div>
		</div>
	);
}
