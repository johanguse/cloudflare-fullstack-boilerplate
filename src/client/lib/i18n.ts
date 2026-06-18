import en from "@client/locales/en/translation.json";
import es from "@client/locales/es/translation.json";
import ptBR from "@client/locales/pt-BR/translation.json";
import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

i18n
	.use(LanguageDetector)
	.use(initReactI18next)
	.init({
		resources: {
			en: { translation: en },
			"pt-BR": { translation: ptBR },
			es: { translation: es },
		},
		fallbackLng: "en",
		supportedLngs: ["en", "pt-BR", "es"],
		detection: {
			order: ["localStorage", "navigator", "htmlTag"],
			caches: ["localStorage"],
		},
		interpolation: {
			escapeValue: false,
		},
	});

export default i18n;
