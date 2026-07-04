import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "onboarding-tour:completed";
const RESTART_EVENT = "onboarding-tour:restart";

/**
 * Imperatively (re)start the onboarding tour from anywhere in the app
 * (e.g. a "Product tour" menu item). Clears the completed flag so the tour
 * runs again.
 */
export function startOnboardingTour() {
	if (typeof window === "undefined") return;
	window.localStorage.removeItem(STORAGE_KEY);
	window.dispatchEvent(new Event(RESTART_EVENT));
}

/** Whether the current user has already completed/skipped the tour. */
function hasCompletedTour() {
	if (typeof window === "undefined") return true;
	return window.localStorage.getItem(STORAGE_KEY) === "true";
}

/**
 * Drives the onboarding tour lifecycle: auto-starts once for new users,
 * listens for manual restarts, and persists completion in localStorage.
 */
export function useOnboardingTour() {
	const [run, setRun] = useState(false);

	// Auto-start once for users who haven't seen the tour yet. A short delay
	// lets the dashboard finish its first paint so every target is mounted.
	useEffect(() => {
		if (hasCompletedTour()) return;

		const timeout = window.setTimeout(() => setRun(true), 900);
		return () => window.clearTimeout(timeout);
	}, []);

	// Allow the tour to be restarted from elsewhere (see startOnboardingTour).
	useEffect(() => {
		const handleRestart = () => setRun(true);
		window.addEventListener(RESTART_EVENT, handleRestart);
		return () => window.removeEventListener(RESTART_EVENT, handleRestart);
	}, []);

	const finish = useCallback(() => {
		if (typeof window !== "undefined") {
			window.localStorage.setItem(STORAGE_KEY, "true");
		}
		setRun(false);
	}, []);

	return { run, finish };
}
