import { useTheme } from "@client/components/layout/ThemeProvider";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@client/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuPortal,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@client/components/ui/dropdown-menu";
import { SidebarMenuButton } from "@client/components/ui/sidebar";
import { authClient } from "@client/lib/auth-client";
import i18n from "@client/lib/i18n";
import { Link, useNavigate } from "@tanstack/react-router";
import {
	Check,
	ChevronsUpDown,
	CreditCard,
	Languages,
	LogOut,
	Moon,
	Settings,
	Sun,
	User,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const LANGUAGES = [
	{ code: "en", label: "English", flag: "🇺🇸" },
	{ code: "pt-BR", label: "Português (BR)", flag: "🇧🇷" },
	{ code: "es", label: "Español", flag: "🇪🇸" },
] as const;

export function UserMenu() {
	const { t } = useTranslation();
	const { data: session } = authClient.useSession();
	const { theme, setTheme } = useTheme();
	const navigate = useNavigate();

	const user = session?.user;
	if (!user) return null;

	const initials = user.name
		? user.name
				.split(" ")
				.map((n) => n[0])
				.join("")
				.toUpperCase()
				.slice(0, 2)
		: user.email[0].toUpperCase();

	const handleSignOut = async () => {
		await authClient.signOut();
		navigate({ to: "/login" });
	};

	const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

	const currentLang = i18n.language;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<SidebarMenuButton
					size="lg"
					className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
				>
					<Avatar className="h-8 w-8 shrink-0 rounded-lg">
						{user.image && (
							<AvatarImage src={user.image} alt={user.name ?? user.email} />
						)}
						<AvatarFallback className="rounded-lg text-xs">{initials}</AvatarFallback>
					</Avatar>
					<div className="grid flex-1 text-left text-sm leading-tight">
						<span className="truncate font-semibold">
							{user.name ?? "User"}
						</span>
						<span className="truncate text-xs text-muted-foreground">
							{user.email}
						</span>
					</div>
					<ChevronsUpDown className="ml-auto size-4 shrink-0" />
				</SidebarMenuButton>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" side="top" className="w-60 rounded-xl" sideOffset={4}>
				<DropdownMenuLabel className="font-normal">
					<div className="flex flex-col space-y-1">
						<p className="font-medium text-sm leading-none">
							{user.name ?? "User"}
						</p>
						<p className="text-muted-foreground text-xs leading-none">
							{user.email}
						</p>
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<Link
						to="/dashboard/profile"
						className="flex cursor-pointer items-center"
					>
						<User className="mr-2 h-4 w-4" />
						{t("userMenu.profile", "Profile")}
					</Link>
				</DropdownMenuItem>
				<DropdownMenuItem asChild>
					<Link
						to="/dashboard/settings"
						className="flex cursor-pointer items-center"
					>
						<Settings className="mr-2 h-4 w-4" />
						{t("userMenu.settings", "Settings")}
					</Link>
				</DropdownMenuItem>
				<DropdownMenuItem asChild>
					<Link
						to="/dashboard/billing"
						className="flex cursor-pointer items-center"
					>
						<CreditCard className="mr-2 h-4 w-4" />
						{t("userMenu.billing", "Billing")}
					</Link>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
					{theme === "dark" ? (
						<Sun className="mr-2 h-4 w-4" />
					) : (
						<Moon className="mr-2 h-4 w-4" />
					)}
					{theme === "dark"
						? t("userMenu.lightMode", "Light mode")
						: t("userMenu.darkMode", "Dark mode")}
				</DropdownMenuItem>
				<DropdownMenuSub>
					<DropdownMenuSubTrigger className="cursor-pointer">
						<Languages className="mr-2 h-4 w-4" />
						{t("userMenu.language", "Language")}
					</DropdownMenuSubTrigger>
					<DropdownMenuPortal>
						<DropdownMenuSubContent>
							{LANGUAGES.map((lang) => (
								<DropdownMenuItem
									key={lang.code}
									className="cursor-pointer gap-2"
									onClick={() => i18n.changeLanguage(lang.code)}
								>
									<span>{lang.flag}</span>
									<span>{lang.label}</span>
									{currentLang === lang.code && (
										<Check className="ml-auto h-3.5 w-3.5" />
									)}
								</DropdownMenuItem>
							))}
						</DropdownMenuSubContent>
					</DropdownMenuPortal>
				</DropdownMenuSub>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onClick={handleSignOut}
					className="cursor-pointer text-destructive focus:text-destructive"
				>
					<LogOut className="mr-2 h-4 w-4" />
					{t("userMenu.signOut", "Sign out")}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
