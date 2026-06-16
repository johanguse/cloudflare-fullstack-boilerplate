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
	Monitor,
	Moon,
	Settings2,
	Sun,
	User,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const LANGUAGES = [
	{ code: "en", label: "English", flag: "🇺🇸" },
	{ code: "pt-BR", label: "Português (BR)", flag: "🇧🇷" },
	{ code: "es", label: "Español", flag: "🇪🇸" },
] as const;

const THEMES = [
	{ value: "light" as const, label: "Light", Icon: Sun },
	{ value: "dark" as const, label: "Dark", Icon: Moon },
	{ value: "system" as const, label: "System", Icon: Monitor },
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

	const currentLang = i18n.language;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<SidebarMenuButton
					size="lg"
					className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
				>
					<Avatar className="size-8 shrink-0 rounded-lg">
						{user.image && (
							<AvatarImage src={user.image} alt={user.name ?? user.email} />
						)}
						<AvatarFallback className="rounded-lg text-xs">
							{initials}
						</AvatarFallback>
					</Avatar>
					<div className="grid flex-1 text-left text-sm leading-tight">
						<span className="truncate font-semibold">
							{user.name ?? "User"}
						</span>
						<span className="truncate text-muted-foreground text-xs">
							{user.email}
						</span>
					</div>
					<ChevronsUpDown className="ml-auto size-4 shrink-0" />
				</SidebarMenuButton>
			</DropdownMenuTrigger>

			<DropdownMenuContent
				align="end"
				side="top"
				className="w-60 rounded-xl"
				sideOffset={4}
			>
				{/* User info header — plain div, not a GroupLabel */}
				<div className="flex flex-col gap-0.5 px-2 py-1.5">
					<p className="truncate font-medium text-sm leading-none">
						{user.name ?? "User"}
					</p>
					<p className="truncate text-muted-foreground text-xs leading-none">
						{user.email}
					</p>
				</div>

				<DropdownMenuSeparator />

				<DropdownMenuItem asChild>
					<Link to="/dashboard/profile">
						<User className="size-4" />
						{t("userMenu.profile", "Profile")}
					</Link>
				</DropdownMenuItem>
				<DropdownMenuItem asChild>
					<Link to="/dashboard/settings">
						<Settings2 className="size-4" />
						{t("userMenu.settings", "Settings")}
					</Link>
				</DropdownMenuItem>
				<DropdownMenuItem asChild>
					<Link to="/dashboard/billing">
						<CreditCard className="size-4" />
						{t("userMenu.billing", "Billing")}
					</Link>
				</DropdownMenuItem>

				<DropdownMenuSeparator />

				{/* Theme submenu */}
				<DropdownMenuSub>
					<DropdownMenuSubTrigger>
						{theme === "dark" ? (
							<Moon className="size-4" />
						) : theme === "light" ? (
							<Sun className="size-4" />
						) : (
							<Monitor className="size-4" />
						)}
						{t("userMenu.appearance", "Appearance")}
					</DropdownMenuSubTrigger>
					<DropdownMenuSubContent>
						{THEMES.map(({ value, label, Icon }) => (
							<DropdownMenuItem
								key={value}
								onClick={() => setTheme(value)}
							>
								<Icon className="size-4" />
								{t(`userMenu.theme.${value}`, label)}
								{theme === value && <Check className="ml-auto size-3.5" />}
							</DropdownMenuItem>
						))}
					</DropdownMenuSubContent>
				</DropdownMenuSub>

				{/* Language submenu */}
				<DropdownMenuSub>
					<DropdownMenuSubTrigger>
						<Languages className="size-4" />
						{t("userMenu.language", "Language")}
					</DropdownMenuSubTrigger>
					<DropdownMenuSubContent>
						{LANGUAGES.map((lang) => (
							<DropdownMenuItem
								key={lang.code}
								onClick={() => i18n.changeLanguage(lang.code)}
							>
								<span>{lang.flag}</span>
								<span>{lang.label}</span>
								{(currentLang === lang.code ||
									currentLang.startsWith(lang.code.split("-")[0])) && (
									<Check className="ml-auto size-3.5" />
								)}
							</DropdownMenuItem>
						))}
					</DropdownMenuSubContent>
				</DropdownMenuSub>

				<DropdownMenuSeparator />

				<DropdownMenuItem
					onClick={handleSignOut}
					className="text-destructive focus:text-destructive"
				>
					<LogOut className="size-4" />
					{t("userMenu.signOut", "Sign out")}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
