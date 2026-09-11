import { useState } from "react";
import type { AttendanceStatus } from "@/entities/attendance-record/model";
import type { SchoolEventType } from "@/entities/school-event/model";
import { formatDateLong } from "@/shared/lib/format";
import { ChevronLeftIcon } from "@tailadmin/icons";

export interface DayEvent {
  type: SchoolEventType;
  title: string;
}

export interface AttendanceCalendarProps {
  month: string;
  statusByDate: Map<string, AttendanceStatus>;
  eventsByDate?: Map<string, DayEvent[]>;
}

const WEEKDAY_INITIALS = ["D", "S", "T", "Q", "Q", "S", "S"];

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "Presente",
  late: "Atrasado",
  absent: "Ausente",
  excused: "Justificado",
};

const EVENT_LABELS: Record<DayEvent["type"], string> = {
  vacation: "Férias",
  makeup: "Recuperação",
  event: "Evento",
};

const STATUS_BG: Record<AttendanceStatus, string> = {
  present: "bg-success-500 text-white",
  late: "bg-warning-500 text-white",
  absent: "bg-error-500 text-white",
  excused: "bg-primary text-primary-foreground",
};

const EVENT_DOT: Record<DayEvent["type"], string> = {
  vacation: "bg-primary",
  makeup: "bg-warning-500",
  event: "bg-muted-foreground",
};

function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

const navBtn =
  "flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted";

export function AttendanceCalendar({ month, statusByDate, eventsByDate }: AttendanceCalendarProps) {
  const [visibleMonth, setVisibleMonth] = useState(month);
  const [year, monthNumber] = visibleMonth.split("-").map(Number);
  const monthIndex = monthNumber - 1;
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const firstColumn = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const monthTitle = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthIndex, 1)));

  const emptyCells = Array.from({ length: firstColumn });
  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">Resumo de presença</h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={navBtn}
            aria-label="Mês anterior"
            onClick={() => setVisibleMonth((current) => shiftMonth(current, -1))}
          >
            <ChevronLeftIcon />
          </button>
          <span className="min-w-32 text-center text-sm font-medium text-foreground">
            {monthTitle.charAt(0).toUpperCase() + monthTitle.slice(1)}
          </span>
          <button
            type="button"
            className={navBtn}
            aria-label="Próximo mês"
            onClick={() => setVisibleMonth((current) => shiftMonth(current, 1))}
          >
            <span className="rotate-180">
              <ChevronLeftIcon />
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_INITIALS.map((initial, index) => (
          <span
            key={`${initial}-${index}`}
            className="text-xs font-medium text-muted-foreground"
            aria-hidden="true"
          >
            {initial}
          </span>
        ))}
        {emptyCells.map((_, index) => (
          <span key={`empty-${index}`} aria-hidden="true" />
        ))}
        {days.map((day) => {
          const isoDate = `${year}-${String(monthNumber).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const status = statusByDate.get(isoDate);
          const events = eventsByDate?.get(isoDate) ?? [];
          const labelParts = [
            formatDateLong(isoDate),
            status ? STATUS_LABELS[status] : "Sem aula",
            ...events.map((event) => `${EVENT_LABELS[event.type]}: ${event.title}`),
          ];
          const label = labelParts.join(" — ");
          return (
            <span
              key={isoDate}
              className="flex flex-col items-center gap-0.5 py-0.5"
              title={label}
              aria-label={label}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                  status ? STATUS_BG[status] : "text-foreground"
                }`}
              >
                {day}
              </span>
              {events.length > 0 && (
                <span className="flex gap-0.5" aria-hidden="true">
                  {events.slice(0, 3).map((event, index) => (
                    <span
                      key={`${event.type}-${index}`}
                      className={`h-1 w-1 rounded-full ${EVENT_DOT[event.type]}`}
                    />
                  ))}
                </span>
              )}
            </span>
          );
        })}
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-success-500" aria-hidden="true" />
          Presente
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-warning-500" aria-hidden="true" />
          Atrasado
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-error-500" aria-hidden="true" />
          Ausente
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
          Férias
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-warning-500" aria-hidden="true" />
          Recuperação
        </li>
      </ul>
    </div>
  );
}
