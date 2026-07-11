import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "./button";

interface PaginationProps {
	page: number;
	pageCount: number;
	onPageChange: (page: number) => void;
}

export function Pagination({ page, pageCount, onPageChange }: PaginationProps) {
	const { t } = useTranslation();
	const lastPage = Math.max(0, pageCount - 1);
	const pages = [...new Set([0, page - 1, page, page + 1, lastPage])]
		.filter((index) => index >= 0 && index <= lastPage)
		.sort((a, b) => a - b);

	return (
		<nav
			aria-label={t("common.pagination", "Pagination")}
			className="flex gap-1"
		>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="size-7"
				disabled={page === 0}
				onClick={() => onPageChange(page - 1)}
			>
				<ChevronLeft aria-hidden="true" className="size-4" />
				<span className="sr-only">
					{t("common.previousPage", "Go to previous page")}
				</span>
			</Button>
			{pages.map((index, position) => (
				<Fragment key={index}>
					{position > 0 && index - pages[position - 1] > 1 && (
						<span
							key={`ellipsis-${index}`}
							aria-hidden="true"
							className="flex size-7 items-center justify-center text-muted-foreground"
						>
							<MoreHorizontal className="size-4" />
						</span>
					)}
					<Button
						type="button"
						variant={page === index ? "secondary" : "ghost"}
						size="icon"
						className="size-7"
						aria-current={page === index ? "page" : undefined}
						aria-label={t("common.goToPage", "Go to page {{page}}", {
							page: index + 1,
						})}
						onClick={() => onPageChange(index)}
					>
						{index + 1}
					</Button>
				</Fragment>
			))}
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="size-7"
				disabled={page >= lastPage}
				onClick={() => onPageChange(page + 1)}
			>
				<ChevronRight aria-hidden="true" className="size-4" />
				<span className="sr-only">
					{t("common.nextPage", "Go to next page")}
				</span>
			</Button>
		</nav>
	);
}
