import { Separator } from "@client/components/ui/separator";
import { useTranslation } from "react-i18next";

interface SettingsLayoutProps {
	children: React.ReactNode;
}

export function SettingsLayout({ children }: SettingsLayoutProps) {
	const { t } = useTranslation();

	return (
		<div className="w-full">
			<h1 className="font-semibold text-2xl tracking-tight">
				{t("settings.title", "Settings")}
			</h1>
			<p className="mt-1 text-muted-foreground text-sm">
				{t(
					"settings.subtitle",
					"Manage your account settings and preferences.",
				)}
			</p>
			<Separator className="my-4 lg:my-6" />

			<div className="pb-8">{children}</div>
		</div>
	);
}
