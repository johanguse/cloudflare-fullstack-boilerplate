import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	baseURL:
		typeof window !== "undefined"
			? window.location.origin
			: "http://localhost:8787",
	plugins: [emailOTPClient()],
});

export const { useSession, signIn, signOut, signUp } = authClient;
