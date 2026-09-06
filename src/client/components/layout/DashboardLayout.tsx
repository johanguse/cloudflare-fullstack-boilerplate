import { OnboardingTour } from "@client/components/onboarding/OnboardingTour";
import { SidebarInset, SidebarProvider } from "@client/components/ui/sidebar";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";

interface DashboardLayoutProps {
	children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
	return (
		<SidebarProvider>
			<a
				href="#main-content"
				className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow focus:ring-2 focus:ring-ring"
			>
				Skip to content
			</a>
			<OnboardingTour />
			<AppSidebar />
			<SidebarInset className="flex h-svh flex-col overflow-hidden bg-background">
				<AppHeader />
				<main
					id="main-content"
					tabIndex={-1}
					className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8"
				>
					<div className="mx-auto w-full max-w-7xl">{children}</div>
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
