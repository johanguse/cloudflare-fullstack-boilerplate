import { Separator } from "@client/components/ui/separator";
import { SidebarTrigger } from "@client/components/ui/sidebar";
import { useLocation } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

export function AppHeader() {
	const { t } = useTranslation();
	const location = useLocation();

	const routeLabels: Record<string, string> = {
		"/dashboard": t("header.dashboard", "Dashboard"),
		"/dashboard/invoices": t("header.invoices", "Invoices"),
		"/dashboard/billing": t("header.billing", "Billing"),
		"/dashboard/billing/history": t("header.billingHistory", "Billing history"),
		"/dashboard/billing/upgrade": t("header.upgrade", "Upgrade plan"),
		"/dashboard/profile": t("header.profile", "Profile"),
		"/dashboard/settings": t("header.settings", "Settings"),
		"/dashboard/settings/company": t("header.nfse", "NFSe"),
		"/dashboard/settings/notifications": t(
			"header.notifications",
			"Notifications",
		),
		"/dashboard/api-keys": t("header.apiKeys", "API Keys"),
		"/dashboard/admin": t("header.adminReports", "Reports"),
		"/dashboard/admin/users": t("header.adminUsers", "All Users"),
		"/dashboard/admin/activity": t("header.adminActivity", "Activity Logs"),
	};

	const label =
		routeLabels[location.pathname] ?? t("header.dashboard", "Dashboard");

	return (
		<header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
			<SidebarTrigger className="-ml-1" />
			<Separator orientation="vertical" className="mr-2 h-4" />
			<span className="font-medium text-sm text-foreground">{label}</span>
		</header>
	);
}
