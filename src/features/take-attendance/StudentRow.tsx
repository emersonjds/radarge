import type { Student } from "@/entities/student/model";
import type { AttendanceStatus } from "@/entities/attendance-record/model";
import { AvatarText } from "@/shared/ui/avatar-text";
import { Card } from "@/shared/ui/card";
import { cn } from "@/shared/lib/utils";

// `short` follows the Brazilian class-register convention: P/A/F/J.
export const STATUS_OPTIONS: Array<{
  value: AttendanceStatus;
  label: string;
  short: string;
  active: string;
}> = [
  { value: "present", label: "Presente", short: "P", active: "bg-success-500 text-white" },
  { value: "late", label: "Atrasado", short: "A", active: "bg-warning-500 text-white" },
  { value: "absent", label: "Ausente", short: "F", active: "bg-error-500 text-white" },
  {
    value: "excused",
    label: "Justificado",
    short: "J",
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
        "flex items-center justify-between gap-3 px-4 py-3",
        status === "absent" && "opacity-70",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <AvatarText name={student.name} />
        <span className="truncate font-medium text-foreground">{student.name}</span>
      </div>

      <div
        className="flex shrink-0 gap-1.5"
        role="group"
        aria-label={`Status de presença de ${student.name}`}
      >
        {STATUS_OPTIONS.map((option) => {
          const isActive = status === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isActive}
              aria-label={option.label}
              title={option.label}
              className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-semibold transition ${
                isActive
                  ? option.active
                  : "border border-input text-muted-foreground hover:bg-muted"
              }`}
              onClick={() => onSelectStatus(option.value)}
            >
              {option.short}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
