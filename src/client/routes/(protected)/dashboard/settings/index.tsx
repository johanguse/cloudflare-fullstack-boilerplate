import { ContentSection } from "@client/components/ui/content-section";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/(protected)/dashboard/settings/")({
	component: SettingsPage,
});

function SettingsPage() {
	const { t } = useTranslation();

	return (
		<ContentSection
			title={t("settings.general.title", "General")}
			desc={t(
				"settings.general.desc",
				"Manage your account settings and preferences.",
			)}
		>
			<span />
		</ContentSection>
	);
}
