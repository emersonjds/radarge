import { Check, Clock, FileCheck, X, type LucideIcon } from "lucide-react";
import type { Student } from "@/entities/student/model";
import type { AttendanceStatus } from "@/entities/attendance-record/model";
import { AvatarText } from "@/shared/ui/avatar-text";
import { Card } from "@/shared/ui/card";
import { cn } from "@/shared/lib/utils";

export const STATUS_OPTIONS: Array<{
  value: AttendanceStatus;
  label: string;
  icon: LucideIcon;
  active: string;
}> = [
  { value: "present", label: "Presente", icon: Check, active: "bg-success-500 text-white" },
  { value: "late", label: "Atrasado", icon: Clock, active: "bg-warning-500 text-white" },
  { value: "absent", label: "Ausente", icon: X, active: "bg-error-500 text-white" },
  {
    value: "excused",
    label: "Justificado",
    icon: FileCheck,
    active: "bg-primary text-primary-foreground",
  },
];

export interface StudentRowProps {
  student: Student;
  status: AttendanceStatus | undefined;
  onSelectStatus: (status: AttendanceStatus) => void;
}

export function StudentRow({ student, status, onSelectStatus }: StudentRowProps) {
  return (
    <Card
      className={cn(
        "flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between",
        status === "absent" && "opacity-70",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <AvatarText name={student.name} />
        <span className="line-clamp-2 min-w-0 flex-1 font-medium break-words text-foreground">
          {student.name}
        </span>
      </div>

      <div
        className="grid grid-cols-2 gap-2 md:flex md:shrink-0"
        role="group"
        aria-label={`Status de presença de ${student.name}`}
      >
        {STATUS_OPTIONS.map((option) => {
          const isActive = status === option.value;
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isActive}
              aria-label={option.label}
              title={option.label}
              className={cn(
                "flex h-11 items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition md:h-10 md:w-10",
                isActive
                  ? option.active
                  : "border border-input text-muted-foreground hover:bg-muted",
              )}
              onClick={() => onSelectStatus(option.value)}
            >
              <Icon className="size-4 shrink-0 md:size-5" aria-hidden="true" />
              <span className="md:hidden">{option.label}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
