/** Returns true when the invoice-number unique index rejected a concurrent insert. */
export function isDuplicateNumberError(err: unknown): boolean {
	const message = err instanceof Error ? err.message : String(err);
	return /UNIQUE constraint failed:\s*invoices\.number/i.test(message);
}
