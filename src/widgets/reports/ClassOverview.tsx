"use client";

import { areaLabels } from "@/entities/subject/model";
import type { Subject } from "@/entities/subject/model";
import type { AcademicSummary } from "@/features/analytics/api";
import { formatPercent, formatScore } from "@/shared/lib/format";
import { Badge } from "@/shared/ui/badge";

export interface ClassOverviewProps {
  scopeLabel: string;
  totalStudents: number;
  avgAttendance: number;
  summary: AcademicSummary;
  subjects: Subject[];
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

export function ClassOverview({
  scopeLabel,
  totalStudents,
  avgAttendance,
  summary,
  subjects,
}: ClassOverviewProps) {
  const topAverage = summary.areaAffinity[0]?.average ?? 0;
  const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">Panorama — {scopeLabel}</h2>
        <span className="text-sm text-muted-foreground">
          {totalStudents} aluno{totalStudents === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Frequência média" value={formatPercent(avgAttendance)} />
        <Stat label="Nota média" value={formatScore(summary.averageScore)} />
        <div className="rounded-xl bg-muted p-4">
          <p className="text-xs text-muted-foreground">Área forte</p>
          <p className="mt-1 text-lg font-bold text-foreground">
            {summary.topArea ? areaLabels[summary.topArea] : "—"}
          </p>
        </div>
        <div className="rounded-xl bg-muted p-4">
          <p className="text-xs text-muted-foreground">Matérias de destaque</p>
          <p className="mt-1 flex flex-wrap gap-1">
            {summary.topSubjects.length === 0 ? (
              <span className="text-sm text-muted-foreground">—</span>
            ) : (
              summary.topSubjects.map((item) => {
                const subject = subjectById.get(item.subjectId);
                return (
                  subject && (
                    <Badge key={item.subjectId} variant="success">
                      {subject.name}
                    </Badge>
                  )
                );
              })
            )}
          </p>
        </div>
      </div>

      {summary.areaAffinity.length > 0 && (
        <div className="mt-6">
          <p className="mb-3 text-sm font-medium text-foreground">Média por área</p>
          <ul className="flex flex-col gap-2">
            {summary.areaAffinity.map((item) => (
              <li key={item.area} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-sm text-muted-foreground">
                  {areaLabels[item.area]}
                </span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${
                      item.average === topAverage ? "bg-primary" : "bg-primary/50"
                    }`}
                    style={{ width: `${item.average * 10}%` }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right text-sm font-medium text-foreground">
                  {formatScore(item.average)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
