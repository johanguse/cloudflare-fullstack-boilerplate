import { Alert, AlertDescription } from "@client/components/ui/alert";

export function AuthErrorAlert({ message }: { message: string | null }) {
	if (!message) return null;

	return (
		<Alert variant="destructive" role="alert">
			<AlertDescription>{message}</AlertDescription>
		</Alert>
	);
}
