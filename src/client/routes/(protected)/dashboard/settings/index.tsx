import { useTheme } from "@client/components/layout/ThemeProvider";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@client/components/ui/card";
import { ContentSection } from "@client/components/ui/content-section";
import i18n from "@client/lib/i18n";
import { trpc } from "@client/lib/trpc-client";
import { cn } from "@client/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";

const THEMES = [
	{
		value: "light" as const,
		labelKey: "settings.appearance.light",
		fallback: "Light",
		Icon: Sun,
	},
	{
		value: "dark" as const,
		labelKey: "settings.appearance.dark",
		fallback: "Dark",
		Icon: Moon,
	},
	{
		value: "system" as const,
		labelKey: "settings.appearance.system",
		fallback: "System",
		Icon: Monitor,
	},
];

const LANGUAGES = [
	{ code: "en", label: "English", flag: "🇺🇸" },
	{ code: "pt-BR", label: "Português (BR)", flag: "🇧🇷" },
	{ code: "es", label: "Español", flag: "🇪🇸" },
] as const;

export const Route = createFileRoute("/(protected)/dashboard/settings/")({
	component: SettingsPage,
});

function SettingsPage() {
	const { t } = useTranslation();
	const { theme, setTheme } = useTheme();
	const currentLang = i18n.language;
	const updateLocale = trpc.user.updateLocale.useMutation();

	const isLangActive = (code: string) => {
		if (code === "pt-BR") return currentLang === "pt-BR" || currentLang.startsWith("pt");
		return currentLang === code || currentLang.startsWith(code);
	};

	const handleLanguageChange = (code: string) => {
		i18n.changeLanguage(code);
		updateLocale.mutate({ locale: code });
	};

	return (
		<ContentSection
			title={t("settings.general.title", "General")}
			desc={t("settings.general.desc", "Appearance and language preferences.")}
		>
			<div className="space-y-6">
				<Card>
					<CardHeader>
						<CardTitle className="text-base">
							{t("settings.appearance.title", "Appearance")}
						</CardTitle>
						<CardDescription>
							{t(
								"settings.appearance.desc",
								"Choose how the dashboard looks to you.",
							)}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-3 gap-3">
							{THEMES.map(({ value, labelKey, fallback, Icon }) => (
								<button
									key={value}
									type="button"
									onClick={() => setTheme(value)}
									className={cn(
										"flex flex-col items-center gap-2.5 rounded-lg border p-4 text-sm font-medium transition-all",
										theme === value
											? "border-primary bg-primary/5 text-primary"
											: "border-border text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground",
									)}
								>
									<Icon className="size-5" />
									{t(labelKey, fallback)}
								</button>
							))}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">
							{t("settings.language.title", "Language")}
						</CardTitle>
						<CardDescription>
							{t(
								"settings.language.desc",
								"Select your preferred interface language.",
							)}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex flex-col gap-2 sm:flex-row">
							{LANGUAGES.map(({ code, label, flag }) => {
								const active = isLangActive(code);
								return (
									<button
										key={code}
										type="button"
										onClick={() => handleLanguageChange(code)}
										className={cn(
											"flex flex-1 items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-all",
											active
												? "border-primary bg-primary/5 font-medium text-primary"
												: "border-border text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground",
										)}
									>
										<span className="text-base leading-none">{flag}</span>
										<span>{label}</span>
										{active && <Check className="ml-auto size-4 shrink-0" />}
									</button>
								);
							})}
						</div>
					</CardContent>
				</Card>
			</div>
		</ContentSection>
	);
}
