import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger,
} from "@client/components/ui/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@client/components/ui/sidebar";
import { Building2, ChevronsUpDown, Plus, Sparkles } from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";

const TEAMS = [
	{
		name: "My SaaS",
		logo: Sparkles,
		plan: "Professional",
	},
	{
		name: "Acme Corp",
		logo: Building2,
		plan: "Business",
	},
	{
		name: "Starter Lab",
		logo: Sparkles,
		plan: "Starter",
	},
] as const;

export function TeamSwitcher() {
	const { t } = useTranslation();
	const { isMobile } = useSidebar();
	const [activeTeam, setActiveTeam] = React.useState<(typeof TEAMS)[number]>(
		TEAMS[0],
	);

	const Logo = activeTeam.logo;

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							tooltip={activeTeam.name}
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						>
							<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
								<Logo className="size-4" />
							</div>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-medium">{activeTeam.name}</span>
								<span className="truncate text-muted-foreground text-xs">
									{activeTeam.plan}
								</span>
							</div>
							<ChevronsUpDown className="ml-auto size-4 shrink-0" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-(--anchor-width) min-w-56 rounded-lg"
						align="start"
						side={isMobile ? "bottom" : "right"}
						sideOffset={4}
					>
						<DropdownMenuGroup>
							<DropdownMenuLabel className="text-muted-foreground text-xs">
								{t("teams.label", "Teams")}
							</DropdownMenuLabel>
							{TEAMS.map((team, index) => {
								const TeamLogo = team.logo;

								return (
									<DropdownMenuItem
										key={team.name}
										onClick={() => setActiveTeam(team)}
										className="gap-2 p-2"
									>
										<div className="flex size-6 items-center justify-center rounded-md border">
											<TeamLogo className="size-3.5 shrink-0" />
										</div>
										<div className="grid min-w-0 flex-1">
											<span className="truncate">{team.name}</span>
											<span className="truncate text-muted-foreground text-xs">
												{team.plan}
											</span>
										</div>
										<DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
									</DropdownMenuItem>
								);
							})}
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuItem className="gap-2 p-2">
							<div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
								<Plus className="size-4" />
							</div>
							<div className="font-medium text-muted-foreground">
								{t("teams.add", "Add team")}
							</div>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
