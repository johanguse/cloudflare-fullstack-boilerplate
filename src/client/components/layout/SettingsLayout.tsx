import { buttonVariants } from "@client/components/ui/button";
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
import { Bell, Building2, Settings, UserCog } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const navItems = [
	{
		href: "/dashboard/settings",
		titleKey: "settings.nav.general",
		fallback: "General",
		icon: <Settings size={16} />,
	},
	{
		href: "/dashboard/settings/company",
		titleKey: "settings.nav.company",
		fallback: "Company",
		icon: <Building2 size={16} />,
	},
	{
		href: "/dashboard/settings/notifications",
		titleKey: "settings.nav.notifications",
		fallback: "Notifications",
		icon: <Bell size={16} />,
	},
	{
		href: "/dashboard/profile",
		titleKey: "settings.nav.profile",
		fallback: "Profile",
		icon: <UserCog size={16} />,
	},
] as const;

interface SettingsLayoutProps {
	children: React.ReactNode;
}

export function SettingsLayout({ children }: SettingsLayoutProps) {
	const { t } = useTranslation();
	const { pathname } = useLocation();
	const navigate = useNavigate();
	const [selectVal, setSelectVal] = useState(pathname);

	const handleSelect = (href: string) => {
		setSelectVal(href);
		navigate({ to: href });
	};

	return (
		<div className="space-y-0.5">
			<h1 className="font-bold text-2xl tracking-tight">
				{t("settings.title", "Settings")}
			</h1>
			<p className="text-muted-foreground text-sm">
				{t("settings.subtitle", "Manage your account settings and preferences.")}
			</p>
			<Separator className="my-4 lg:my-6" />

			<div className="flex flex-1 flex-col space-y-2 md:space-y-2 lg:flex-row lg:space-x-12 lg:space-y-0">
				{/* Mobile: dropdown select */}
				<div className="p-1 md:hidden">
					<Select value={selectVal} onValueChange={handleSelect}>
						<SelectTrigger className="h-12">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{navItems.map((item) => (
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

				{/* Desktop: sidebar nav */}
				<aside className="top-0 hidden md:block lg:sticky lg:w-1/5 lg:self-start">
					<ScrollArea
						orientation="horizontal"
						className="w-full min-w-36 bg-background px-1 py-2"
					>
						<nav className="flex space-x-2 py-1 lg:flex-col lg:space-x-0 lg:space-y-1">
							{navItems.map((item) => (
								<Link
									key={item.href}
									to={item.href}
									className={cn(
										buttonVariants({ variant: "ghost" }),
										pathname === item.href || pathname === `${item.href}/`
											? "bg-muted hover:bg-accent"
											: "hover:bg-accent hover:underline",
										"justify-start gap-2",
									)}
								>
									{item.icon}
									{t(item.titleKey, item.fallback)}
								</Link>
							))}
						</nav>
					</ScrollArea>
				</aside>

				{/* Content area */}
				<div className="flex-1 pb-8">{children}</div>
			</div>
		</div>
	);
}
