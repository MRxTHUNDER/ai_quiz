import { Button } from "@/components/ui/button";
import { getPaginationItems } from "@/lib/pagination";

interface QuestionPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  placement?: "top" | "bottom";
}

export default function QuestionPagination({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
  placement = "bottom",
}: QuestionPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const items = getPaginationItems(currentPage, totalPages);

  const placementClass =
    placement === "top"
      ? "pb-3 border-b"
      : "pt-4 border-t";

  return (
    <nav
      className={`flex flex-wrap items-center justify-end gap-1 w-full ${placementClass}`}
      aria-label="Questions pagination"
    >
      {items.map((item, index) =>
        item === "ellipsis" ? (
          <span
            key={`ellipsis-${index}`}
            className="px-2 text-muted-foreground select-none"
          >
            …
          </span>
        ) : (
          <Button
            key={item}
            type="button"
            variant={item === currentPage ? "default" : "outline"}
            size="sm"
            className="min-w-9"
            disabled={disabled || item === currentPage}
            onClick={() => onPageChange(item)}
            aria-label={`Page ${item}`}
            aria-current={item === currentPage ? "page" : undefined}
          >
            {item}
          </Button>
        ),
      )}
    </nav>
  );
};
