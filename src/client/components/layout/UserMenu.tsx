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
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@client/components/ui/dropdown-menu";
import { authClient } from "@client/lib/auth-client";
import { Link, useNavigate } from "@tanstack/react-router";
import { CreditCard, LogOut, Moon, Settings, Sun, User } from "lucide-react";

export function UserMenu() {
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

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className="flex items-center gap-2 rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
				>
					<Avatar className="h-8 w-8">
						{user.image && (
							<AvatarImage src={user.image} alt={user.name ?? user.email} />
						)}
						<AvatarFallback className="text-xs">{initials}</AvatarFallback>
					</Avatar>
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
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
						Profile
					</Link>
				</DropdownMenuItem>
				<DropdownMenuItem asChild>
					<Link
						to="/dashboard/settings"
						className="flex cursor-pointer items-center"
					>
						<Settings className="mr-2 h-4 w-4" />
						Settings
					</Link>
				</DropdownMenuItem>
				<DropdownMenuItem asChild>
					<Link
						to="/dashboard/billing"
						className="flex cursor-pointer items-center"
					>
						<CreditCard className="mr-2 h-4 w-4" />
						Billing
					</Link>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
					{theme === "dark" ? (
						<Sun className="mr-2 h-4 w-4" />
					) : (
						<Moon className="mr-2 h-4 w-4" />
					)}
					{theme === "dark" ? "Light mode" : "Dark mode"}
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onClick={handleSignOut}
					className="cursor-pointer text-destructive focus:text-destructive"
				>
					<LogOut className="mr-2 h-4 w-4" />
					Sign out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
