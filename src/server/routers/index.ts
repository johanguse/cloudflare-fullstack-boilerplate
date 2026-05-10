import { router } from "../lib/trpc";
import { apiKeysRouter } from "./trpc/api-keys";
import { billingRouter } from "./trpc/billing";
import { invoicesRouter } from "./trpc/invoices";
import { nfseRouter } from "./trpc/nfse";
import { settingsRouter } from "./trpc/settings";
import { userRouter } from "./trpc/user";

export const appRouter = router({
	user: userRouter,
	billing: billingRouter,
	invoices: invoicesRouter,
	nfse: nfseRouter,
	apiKeys: apiKeysRouter,
	settings: settingsRouter,
});

export type AppRouter = typeof appRouter;
