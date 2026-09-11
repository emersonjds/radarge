"use client";

import { pageCount, pageRangeLabel, TABLE_PAGE_SIZE } from "@/shared/lib/pagination";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/shared/ui/pagination";

interface TablePaginationProps {
  page: number;
  totalRows: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
}

export function TablePagination({
  page,
  totalRows,
  pageSize = TABLE_PAGE_SIZE,
  onPageChange,
}: TablePaginationProps) {
  const totalPages = pageCount(totalRows, pageSize);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
      <p className="text-xs text-muted-foreground">{pageRangeLabel(page, totalRows, pageSize)}</p>
      {totalPages > 1 && (
        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                aria-disabled={page === 1}
                className={page === 1 ? "pointer-events-none opacity-50" : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  if (page > 1) onPageChange(page - 1);
                }}
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href="#"
                aria-disabled={page === totalPages}
                className={page === totalPages ? "pointer-events-none opacity-50" : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  if (page < totalPages) onPageChange(page + 1);
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
