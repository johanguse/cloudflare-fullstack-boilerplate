import { router } from "../lib/trpc";
import { adminRouter } from "./trpc/admin";
import { apiKeysRouter } from "./trpc/api-keys";
import { billingRouter } from "./trpc/billing";
import { invoicesRouter } from "./trpc/invoices";
import { nfseRouter } from "./trpc/nfse";
import { referralRouter } from "./trpc/referral";
import { settingsRouter } from "./trpc/settings";
import { userRouter } from "./trpc/user";

export const appRouter = router({
	user: userRouter,
	billing: billingRouter,
	invoices: invoicesRouter,
	nfse: nfseRouter,
	apiKeys: apiKeysRouter,
	settings: settingsRouter,
	referral: referralRouter,
	admin: adminRouter,
});

export type AppRouter = typeof appRouter;
