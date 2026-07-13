import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { STATUS, useJoyride } from "react-joyride";
import { TourTooltip } from "./TourTooltip";
import { getTourSteps } from "./tour-steps";
import { useOnboardingTour } from "./use-onboarding-tour";

/**
 * Dashboard onboarding tour. Mounted once inside the dashboard shell; it
 * auto-runs the first time a user reaches the dashboard and can be restarted
 * from the account menu via `startOnboardingTour()`.
 */
export function OnboardingTour() {
	const { t } = useTranslation();
	const { run, finish } = useOnboardingTour();

	const steps = useMemo(() => getTourSteps(t), [t]);

	const { Tour } = useJoyride({
		steps,
		run,
		continuous: true,
		scrollToFirstStep: true,
		tooltipComponent: TourTooltip,
		options: {
			zIndex: 1000,
			arrowColor: "var(--popover)",
			overlayColor: "color-mix(in oklab, var(--foreground) 45%, transparent)",
			spotlightPadding: 8,
			// The "Close tour" (X) should end the tour and persist completion. The
			// default "close" action instead advances to the next step's beacon on
			// non-final steps, so the tour re-runs next visit and finish() never
			// fires. "skip" emits STATUS.SKIPPED → finish().
			closeButtonAction: "skip",
			// ESC and backdrop clicks can't emit SKIPPED (dismissKeyAction has no
			// "skip"), so disable them rather than leaving the beacon behavior.
			dismissKeyAction: false,
			overlayClickAction: false,
		},
		onEvent: (data) => {
			if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
				finish();
			}
		},
	});

	return <>{Tour}</>;
}
