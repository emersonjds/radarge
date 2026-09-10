import { cn } from "@/shared/lib/utils";

interface AvatarTextProps {
  name: string;
  className?: string;
}

export function AvatarText({ name, className }: AvatarTextProps) {
  const initials = name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const getColorClass = (name: string) => {
    const colors = [
      "bg-brand-100 text-brand-600",
      "bg-theme-pink-500/10 text-theme-pink-500",
      "bg-blue-light-100 text-blue-light-600",
      "bg-orange-100 text-orange-600",
      "bg-success-100 text-success-700",
      "bg-theme-purple-500/10 text-theme-purple-500",
      "bg-warning-100 text-warning-700",
      "bg-error-100 text-error-600",
    ];

    const index = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  return (
    <div
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full",
        getColorClass(name),
        className,
      )}
    >
      <span className="text-sm font-medium">{initials}</span>
    </div>
  );
}
