import type { TFunction } from "i18next";
import type { Step } from "react-joyride";

/**
 * Guided onboarding tour steps for the dashboard.
 *
 * Targets rely on `data-tour="…"` attributes rendered by the dashboard shell
 * (sidebar, header, and the dashboard index page). Keep the attribute names in
 * sync with the components that render them.
 */
export function getTourSteps(t: TFunction): Step[] {
	return [
		{
			target: "body",
			placement: "center",
			title: t("tour.welcome.title", "Welcome aboard 👋"),
			content: t(
				"tour.welcome.content",
				"Take a quick 60-second tour to learn where everything lives. You can restart it any time from your account menu.",
			),
		},
		{
			target: '[data-tour="sidebar-nav"]',
			placement: "right",
			title: t("tour.navigation.title", "Navigation"),
			content: t(
				"tour.navigation.content",
				"Jump between billing, invoices, API keys, and settings from the sidebar. It collapses to icons when you need more room.",
			),
		},
		{
			target: '[data-tour="plan-card"]',
			placement: "left",
			title: t("tour.plan.title", "Your plan at a glance"),
			content: t(
				"tour.plan.content",
				"Track your current plan, subscription status, and remaining credits here. Upgrade or manage billing in one click.",
			),
		},
		{
			target: '[data-tour="stats"]',
			placement: "bottom",
			title: t("tour.stats.title", "Account metrics"),
			content: t(
				"tour.stats.content",
				"A snapshot of invoices, payments, and API keys. Each card links straight to the full view.",
			),
		},
		{
			target: '[data-tour="quick-actions"]',
			placement: "left",
			title: t("tour.quickActions.title", "Quick actions"),
			content: t(
				"tour.quickActions.content",
				"Shortcuts to the tasks you'll do most — reviewing invoices, managing billing, and creating API keys.",
			),
		},
		{
			target: '[data-tour="create-invoice"]',
			placement: "bottom",
			title: t("tour.createInvoice.title", "Create your first invoice"),
			content: t(
				"tour.createInvoice.content",
				"Ready to bill a customer? Start a new invoice here whenever you need one.",
			),
		},
		{
			target: '[data-tour="user-menu"]',
			placement: "right",
			title: t("tour.account.title", "Account & preferences"),
			content: t(
				"tour.account.content",
				"Switch theme or language, open settings, and restart this tour from your account menu. You're all set!",
			),
		},
	];
}
