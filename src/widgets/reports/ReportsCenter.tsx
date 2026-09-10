"use client";

import { useMemo, useState } from "react";
import { useStudents } from "@/entities/student/queries";
import { useGroups } from "@/entities/group/queries";
import { useEnrollments } from "@/entities/enrollment/queries";
import { useGrades } from "@/entities/grade/queries";
import { useSubjects } from "@/entities/subject/queries";
import type { Grade } from "@/entities/grade/model";
import { areaLabels } from "@/entities/subject/model";
import {
  useAcademicSummary,
  useAttendanceRate,
  useStudentsAtRisk,
} from "@/features/analytics/queries";
import { studentSituation } from "@/features/analytics/model";
import { overallAverage, studentAptitude } from "@/features/analytics/academic";
import { messageForError } from "@/shared/lib/api/error-message";
import { formatPercent, formatScore } from "@/shared/lib/format";
import { downloadCsv, toCsv } from "@/shared/lib/csv";
import { usePageTitle } from "@/shared/providers/page-title";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { DownloadIcon } from "@tailadmin/icons";
import { ClassOverview } from "./ClassOverview";
import { StudentsReportTable, type ReportRow } from "./StudentsReportTable";

const RISK_ABSENCE_THRESHOLD = 3;
const ALL_GROUPS = "todas";

const control =
  "h-11 md:h-9 rounded-lg border border-input bg-transparent px-3 text-base text-foreground focus:border-ring focus:outline-hidden focus:ring-3 focus:ring-ring/20 md:text-sm";

export function ReportsCenter() {
  usePageTitle("Relatórios");

  const { data: students, isLoading: isLoadingStudents } = useStudents();
  const { data: groups } = useGroups();
  const { data: enrollments } = useEnrollments();
  const { data: grades, isLoading: isLoadingGrades } = useGrades();
  const { data: subjects } = useSubjects();

  const [groupId, setGroupId] = useState(ALL_GROUPS);

  const groupFilter = groupId === ALL_GROUPS ? {} : { groupId };
  const {
    data: studentsAtRisk,
    isLoading: isLoadingRisk,
    isError: hasAnalyticsError,
    error: analyticsError,
    // Threshold zero returns every student ever called. A student missing from the
    // list has no roll-call, and the report says so instead of faking a hundred percent.
  } = useStudentsAtRisk({ ...groupFilter, threshold: 0 });
  const { data: attendanceRate, isLoading: isLoadingRate } = useAttendanceRate(groupFilter);
  const { data: academicSummary, isLoading: isLoadingSummary } = useAcademicSummary(groupFilter);

  const isLoading =
    isLoadingStudents || isLoadingGrades || isLoadingRisk || isLoadingRate || isLoadingSummary;

  const report = useMemo(() => {
    const studentList = students ?? [];
    const subjectList = subjects ?? [];
    const groupById = new Map((groups ?? []).map((group) => [group.id, group]));

    const gradesByStudent = new Map<string, Grade[]>();
    for (const grade of grades ?? []) {
      gradesByStudent.set(grade.studentId, [
        ...(gradesByStudent.get(grade.studentId) ?? []),
        grade,
      ]);
    }

    // Off the risk list, the only reading available is "no absences recorded".
    const attendanceRateByStudent = new Map(
      (studentsAtRisk ?? []).map((risk) => [risk.studentId, risk.attendance]),
    );
    const absencesByStudent = new Map(
      (studentsAtRisk ?? []).map((risk) => [risk.studentId, risk.absences]),
    );

    const groupIdsByStudent = new Map<string, string[]>();
    for (const enrollment of enrollments ?? []) {
      if (!enrollment.active) continue;
      groupIdsByStudent.set(enrollment.studentId, [
        ...(groupIdsByStudent.get(enrollment.studentId) ?? []),
        enrollment.groupId,
      ]);
    }

    const scopedStudents =
      groupId === ALL_GROUPS
        ? studentList
        : studentList.filter((student) =>
            (groupIdsByStudent.get(student.id) ?? []).includes(groupId),
          );

    const rows: ReportRow[] = scopedStudents.map((student) => {
      const studentGrades = gradesByStudent.get(student.id) ?? [];
      const groupNames = (groupIdsByStudent.get(student.id) ?? [])
        .map((enrolledGroupId) => groupById.get(enrolledGroupId)?.name)
        .filter((name): name is string => Boolean(name));
      const hasAttendanceData = attendanceRateByStudent.has(student.id);
      const absences = hasAttendanceData ? (absencesByStudent.get(student.id) ?? 0) : null;
      return {
        id: student.id,
        name: student.name,
        groupNames: groupNames.join(", ") || "—",
        average: overallAverage(studentGrades),
        attendanceRate: attendanceRateByStudent.get(student.id) ?? null,
        absences,
        aptitude: studentAptitude(studentGrades, subjectList),
        situation: studentSituation(absences, RISK_ABSENCE_THRESHOLD),
      };
    });

    return { rows, totalStudents: scopedStudents.length };
  }, [students, subjects, groups, grades, enrollments, groupId, studentsAtRisk]);

  const scopeLabel =
    groupId === ALL_GROUPS
      ? "Todas as aulas"
      : ((groups ?? []).find((group) => group.id === groupId)?.name ?? "Aula");

  function exportCsv() {
    const headers = ["Aluno", "Turma", "Nota média", "Frequência", "Faltas", "Aptidão", "Situação"];
    const csvRows = report.rows.map((row) => [
      row.name,
      row.groupNames,
      formatScore(row.average),
      // Empty, not a dash: an em-dash in a spreadsheet cell poisons SUM and AVERAGE.
      row.attendanceRate === null ? "" : formatPercent(row.attendanceRate),
      row.absences === null ? "" : row.absences,
      row.aptitude ? areaLabels[row.aptitude] : "—",
      row.situation === "no-data" ? "" : row.situation === "at-risk" ? "Em risco" : "Regular",
    ]);
    const slug = scopeLabel
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    downloadCsv(`relatorio-${slug}.csv`, toCsv(headers, csvRows));
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <p className="max-w-[68ch] text-sm text-muted-foreground">
          Panorama acadêmico e de frequência por aula — clique num aluno para a ficha completa
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Aula
            <select
              aria-label="Selecionar aula"
              className={control}
              value={groupId}
              onChange={(event) => setGroupId(event.target.value)}
            >
              <option value={ALL_GROUPS}>Todas as aulas</option>
              {(groups ?? []).map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            variant="outline"
            disabled={report.rows.length === 0}
            onClick={exportCsv}
          >
            <DownloadIcon />
            Exportar CSV
          </Button>
        </div>
      </header>

      {hasAnalyticsError && (
        <p role="alert" className="text-sm text-destructive">
          {messageForError(analyticsError, "Não foi possível carregar os indicadores da aula.")}
        </p>
      )}

      {isLoading || !academicSummary ? (
        <Card className="text-sm text-muted-foreground">Carregando panorama…</Card>
      ) : (
        <ClassOverview
          scopeLabel={scopeLabel}
          totalStudents={report.totalStudents}
          avgAttendance={attendanceRate?.rate ?? 0}
          summary={academicSummary}
          subjects={subjects ?? []}
        />
      )}

      <StudentsReportTable rows={report.rows} isLoading={isLoading} />
    </div>
  );
}
