import { SidebarInset, SidebarProvider } from "@client/components/ui/sidebar";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";

interface DashboardLayoutProps {
	children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset className="flex h-svh flex-col overflow-hidden bg-background">
				<AppHeader />
				<main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
