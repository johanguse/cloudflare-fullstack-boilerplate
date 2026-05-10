import { Separator } from "@client/components/ui/separator";
import { SidebarTrigger } from "@client/components/ui/sidebar";
import { useLocation } from "@tanstack/react-router";

const routeLabels: Record<string, string> = {
	"/dashboard": "Dashboard",
	"/dashboard/invoices": "Invoices",
	"/dashboard/billing": "Billing",
	"/dashboard/profile": "Profile",
	"/dashboard/settings": "Settings",
	"/dashboard/api-keys": "API Keys",
};

export function AppHeader() {
	const location = useLocation();
	const label = routeLabels[location.pathname] ?? "Dashboard";

	return (
		<header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
			<SidebarTrigger className="-ml-1" />
			<Separator orientation="vertical" className="mr-2 h-4" />
			<span className="font-medium text-foreground text-sm">{label}</span>
		</header>
	);
}
