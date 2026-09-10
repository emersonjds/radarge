import { AlertCircle } from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

export interface QueryErrorStateProps {
  message: string;
  onRetry?: () => void;
  size?: "block" | "page";
  className?: string;
}

/**
 * Error variant of the empty-state anatomy (design-language.md §5): same layout as
 * "nothing here", sentence in `text-destructive`, always a retry action.
 */
export function QueryErrorState({
  message,
  onRetry,
  size = "block",
  className,
}: QueryErrorStateProps) {
  if (size === "page") {
    return (
      <div role="alert" className={cn("py-12 text-center", className)}>
        <AlertCircle aria-hidden="true" className="mx-auto size-10 text-gray-300" />
        <p className="mt-2 text-base font-semibold text-foreground">Não foi possível carregar</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-destructive">{message}</p>
        {onRetry && (
          <Button className="mt-6" onClick={onRetry}>
            Tentar de novo
          </Button>
        )}
      </div>
    );
  }

  return (
    <div role="alert" className={cn("py-6 text-center", className)}>
      <p className="text-sm text-destructive">{message}</p>
      {onRetry && (
        <Button size="sm" variant="outline" className="mt-3" onClick={onRetry}>
          Tentar de novo
        </Button>
      )}
    </div>
  );
}
