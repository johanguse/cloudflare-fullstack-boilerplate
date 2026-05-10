export interface PaginatedResponse<T> {
	data: T[];
	total: number;
	page: number;
	pageSize: number;
	hasMore: boolean;
}

export interface ApiError {
	error: string;
	message: string;
	code?: string;
}

export type UserPlan =
	| "free"
	| "starter"
	| "professional"
	| "business"
	| "agency";
