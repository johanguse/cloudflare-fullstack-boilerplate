import { Button } from "@client/components/ui/button";
import { cn } from "@client/lib/utils";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TooltipRenderProps } from "react-joyride";

/**
 * Custom Joyride tooltip that matches the app's shadcn/ui design language
 * (popover surface, muted copy, primary button) instead of the default theme.
 */
export function TourTooltip({
	backProps,
	closeProps,
	index,
	isLastStep,
	primaryProps,
	size,
	skipProps,
	step,
	tooltipProps,
}: TooltipRenderProps) {
	const { t } = useTranslation();

	return (
		<div
			{...tooltipProps}
			className="w-[min(360px,calc(100vw-2rem))] rounded-xl border bg-popover text-popover-foreground shadow-lg"
		>
			<div className="flex items-start justify-between gap-3 px-5 pt-5">
				<div className="min-w-0">
					{step.title ? (
						<h2 className="font-semibold text-base leading-tight tracking-tight">
							{step.title}
						</h2>
					) : null}
					<p className="mt-1 text-muted-foreground text-xs">
						{t("tour.progress", "Step {{current}} of {{total}}", {
							current: index + 1,
							total: size,
						})}
					</p>
				</div>
				<button
					type="button"
					{...closeProps}
					aria-label={t("tour.close", "Close tour")}
					className="-mr-1 -mt-1 rounded-md p-1 text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
				>
					<X className="size-4" />
				</button>
			</div>

			<div className="text-pretty px-5 py-3 text-muted-foreground text-sm leading-6">
				{step.content}
			</div>

			<div className="flex items-center justify-between gap-3 border-t px-5 py-3">
				<div className="flex items-center gap-1.5">
					{Array.from({ length: size }).map((_, dot) => (
						<span
							key={dot}
							className={cn(
								"size-1.5 rounded-full transition-colors",
								dot === index ? "bg-primary" : "bg-muted-foreground/25",
							)}
						/>
					))}
				</div>

				<div className="flex items-center gap-2">
					{!isLastStep ? (
						<Button
							{...skipProps}
							variant="ghost"
							size="sm"
							className="text-muted-foreground"
						>
							{t("tour.skip", "Skip")}
						</Button>
					) : null}
					{index > 0 ? (
						<Button {...backProps} variant="outline" size="sm">
							{t("tour.back", "Back")}
						</Button>
					) : null}
					<Button {...primaryProps} size="sm">
						{isLastStep ? t("tour.finish", "Finish") : t("tour.next", "Next")}
					</Button>
				</div>
			</div>
		</div>
	);
}
