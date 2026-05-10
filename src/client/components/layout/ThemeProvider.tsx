import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
	theme: Theme;
	setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
	theme: "system",
	setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
	const [theme, setThemeState] = useState<Theme>(() => {
		return (localStorage.getItem("theme") as Theme) ?? "system";
	});

	useEffect(() => {
		const root = document.documentElement;
		const isDark =
			theme === "dark" ||
			(theme === "system" &&
				window.matchMedia("(prefers-color-scheme: dark)").matches);
		root.classList.toggle("dark", isDark);
	}, [theme]);

	const setTheme = (newTheme: Theme) => {
		localStorage.setItem("theme", newTheme);
		setThemeState(newTheme);
	};

	return (
		<ThemeContext.Provider value={{ theme, setTheme }}>
			{children}
		</ThemeContext.Provider>
	);
}

export function useTheme() {
	return useContext(ThemeContext);
}
