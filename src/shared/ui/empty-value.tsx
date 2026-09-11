import { cn } from "@/shared/lib/utils";

export interface EmptyValueProps {
  label?: string;
  className?: string;
}

export function EmptyValue({ label = "sem dados", className }: EmptyValueProps) {
  return (
    <span
      className={cn("text-sm font-normal text-gray-400 tabular-nums", className)}
      aria-label={label}
    >
      —
    </span>
  );
}
