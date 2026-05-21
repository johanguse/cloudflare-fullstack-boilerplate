import { authClient } from "@client/lib/auth-client";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/")({
	component: HomePage,
});

function HomePage() {
	const { t } = useTranslation();
	const { data: session } = authClient.useSession();
	const navigate = useNavigate();

	useEffect(() => {
		if (session?.user) {
			navigate({ to: "/dashboard" });
		}
	}, [session, navigate]);

	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-8">
			<div className="text-center">
				<h1 className="font-semibold text-4xl text-foreground tracking-tight">
					{t("home.title", "Cloudflare SaaS Boilerplate")}
				</h1>
				<p className="mt-3 text-lg text-muted-foreground">
					{t("home.subtitle", "Auth · Dashboard · Billing · Invoices · NFSe")}
				</p>
			</div>
			<div className="flex gap-4">
				<Link
					to="/login"
					className="rounded-md bg-primary px-6 py-2.5 font-semibold text-primary-foreground text-sm hover:bg-primary/90"
				>
					{t("home.signIn", "Sign in")}
				</Link>
				<Link
					to="/register"
					className="rounded-md border border-input bg-background px-6 py-2.5 font-semibold text-foreground text-sm hover:bg-accent"
				>
					{t("home.createAccount", "Create account")}
				</Link>
			</div>
		</div>
	);
}
