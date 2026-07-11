import i18n from "./i18n";

type DateValue = Date | string | number;

function currentLocale() {
	return i18n.resolvedLanguage ?? i18n.language ?? "en";
}

export function formatDate(
	value: DateValue,
	options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
) {
	return new Intl.DateTimeFormat(currentLocale(), options).format(
		new Date(value),
	);
}

export function formatDateTime(
	value: DateValue,
	options: Intl.DateTimeFormatOptions = {
		dateStyle: "medium",
		timeStyle: "short",
	},
) {
	return new Intl.DateTimeFormat(currentLocale(), options).format(
		new Date(value),
	);
}

export function formatNumber(value: number) {
	return new Intl.NumberFormat(currentLocale()).format(value);
}

export function formatCurrency(cents: number, currency = "BRL") {
	return new Intl.NumberFormat(currentLocale(), {
		style: "currency",
		currency,
	}).format(cents / 100);
}
