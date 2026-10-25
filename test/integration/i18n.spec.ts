import i18n from "@client/lib/i18n";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider, useTranslation } from "react-i18next";
import { describe, expect, it } from "vitest";

function TranslatedGreeting() {
	const { t } = useTranslation();
	return createElement(
		"p",
		null,
		t("dashboard.greeting", { name: "Ada & Lin" }),
	);
}

describe("i18next 26 and react-i18next 17", () => {
	it.each([
		["en", "Welcome back", "Hello, Ada & Lin", "Step 2 of 5"],
		["pt-BR", "Bem-vindo de volta", "Olá, Ada & Lin", "Passo 2 de 5"],
		["es", "Bienvenido de nuevo", "Hola, Ada & Lin", "Paso 2 de 5"],
	])(
		"resolves %s resources, interpolation and React hooks",
		async (language, title, greeting, progress) => {
			await i18n.changeLanguage(language);
			expect(i18n.t("auth.login.title")).toBe(title);
			expect(i18n.t("dashboard.greeting", { name: "Ada & Lin" })).toBe(
				greeting,
			);
			expect(i18n.t("tour.progress", { current: 2, total: 5 })).toBe(progress);
			const markup = renderToStaticMarkup(
				createElement(
					I18nextProvider,
					{ i18n },
					createElement(TranslatedGreeting),
				),
			);
			expect(markup).toBe(`<p>${greeting.replace("&", "&amp;")}</p>`);
		},
	);

	it("switches languages repeatedly and falls back to English for unsupported locales", async () => {
		for (const [language, expected] of [
			["pt-BR", "Bem-vindo de volta"],
			["es", "Bienvenido de nuevo"],
			["en", "Welcome back"],
			["fr", "Welcome back"],
		]) {
			await i18n.changeLanguage(language);
			expect(i18n.t("auth.login.title")).toBe(expected);
		}
	});

	it("retains the string-key and default-value overload used by the app", async () => {
		await i18n.changeLanguage("es");
		expect(
			i18n.t("upgrade.missing-key", "Default {{name}}", { name: "Ada" }),
		).toBe("Default Ada");
	});
});
