"use client";

import { areaLabels } from "@/entities/subject/model";
import type { Grade } from "@/entities/grade/model";
import type { Subject } from "@/entities/subject/model";
import {
  areaAffinity,
  averageBySubject,
  overallAverage,
  studentAptitude,
} from "@/features/analytics/academic";
import { formatScore } from "@/shared/lib/format";
import { Badge } from "@/shared/ui/badge";

export interface AcademicPanelProps {
  grades: Grade[];
  subjects: Subject[];
}

function Bar({ label, value, isTop }: { label: string; value: number; isTop: boolean }) {
  return (
    <li className="flex items-center gap-3">
      <span className="w-24 shrink-0 truncate text-sm text-muted-foreground">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${isTop ? "bg-primary" : "bg-primary/50"}`}
          style={{ width: `${value * 10}%` }}
        />
      </div>
      <span className="w-10 shrink-0 text-right text-sm font-medium text-foreground">
        {formatScore(value)}
      </span>
    </li>
  );
}

export function AcademicPanel({ grades, subjects }: AcademicPanelProps) {
  if (grades.length === 0) {
    return (
      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Desempenho acadêmico</h2>
        <p className="mt-2 text-sm text-muted-foreground">Sem notas lançadas.</p>
      </section>
    );
  }

  const average = overallAverage(grades);
  const aptitude = studentAptitude(grades, subjects);
  const areas = areaAffinity(grades, subjects);
  const subjectAverages = averageBySubject(grades, subjects);
  const topAreaAverage = areas[0]?.average ?? 0;
  const topSubjectScore = subjectAverages[0]?.score ?? 0;

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Desempenho acadêmico</h2>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Nota geral</p>
            <p className="text-xl font-bold text-foreground">{formatScore(average)}</p>
          </div>
          {aptitude && <Badge variant="success">Aptidão: {areaLabels[aptitude]}</Badge>}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <p className="mb-3 text-sm font-medium text-foreground">Notas por matéria</p>
          <ul className="flex flex-col gap-2">
            {subjectAverages.map((item) => (
              <Bar
                key={item.subject.id}
                label={item.subject.name}
                value={item.score}
                isTop={item.score === topSubjectScore}
              />
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-medium text-foreground">Aptidão por área</p>
          <ul className="flex flex-col gap-2">
            {areas.map((item) => (
              <Bar
                key={item.area}
                label={areaLabels[item.area]}
                value={item.average}
                isTop={item.average === topAreaAverage}
              />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
