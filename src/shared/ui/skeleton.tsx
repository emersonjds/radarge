import * as React from "react";

import { cn } from "@/shared/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-accent", className)}
      {...props}
    />
  );
}

export interface RowsSkeletonProps {
  rows?: number;
  avatar?: boolean;
  className?: string;
}

/** Row shape matching the identifier + two label pairs anatomy used by every table and card list (design-language.md §7). */
function RowsSkeleton({ rows = 5, avatar = true, className }: RowsSkeletonProps) {
  return (
    <div className={cn("flex flex-col divide-y divide-border", className)} aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3 p-4">
          {avatar && <Skeleton className="size-9 shrink-0 rounded-full" />}
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export { Skeleton, RowsSkeleton };
