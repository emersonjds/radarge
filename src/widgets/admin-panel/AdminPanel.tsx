"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useStudents } from "@/entities/student/queries";
import { useProfiles } from "@/entities/profile/queries";
import { useGroups } from "@/entities/group/queries";
import { useEnrollments } from "@/entities/enrollment/queries";
import {
  useAbsenteeismTrend,
  useAttendanceRate,
  useAttendanceRateByGroup,
  useStudentsAtRisk,
} from "@/features/analytics/queries";
import { messageForError } from "@/shared/lib/api/error-message";
import { formatPercent } from "@/shared/lib/format";
import { AvatarText } from "@/shared/ui/avatar-text";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { QueryErrorState } from "@/shared/ui/query-error";
import { RowsSkeleton } from "@/shared/ui/skeleton";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  GroupIcon,
  UserCircleIcon,
  CheckCircleIcon,
} from "@tailadmin/icons";
import { AttendanceBarChart } from "./AttendanceBarChart";
import { TrendLineChart } from "./TrendLineChart";

const RISK_ABSENCE_THRESHOLD = 3;
const MAX_ALERTS = 3;

interface KpiCardProps {
  label: string;
  value: string;
  icon: ReactNode;
  badge?: ReactNode;
}

function KpiCard({ label, value, icon, badge }: KpiCardProps) {
  return (
    <Card>
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-primary">
        {icon}
      </div>
      <div className="mt-5 flex items-end justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
        </div>
        {badge}
      </div>
    </Card>
  );
}

export function AdminPanel() {
  const students = useStudents();
  const groups = useGroups();
  const enrollments = useEnrollments();
  const profiles = useProfiles();
  const attendanceRate = useAttendanceRate();
  const absenteeismTrend = useAbsenteeismTrend();
  // Threshold zero returns every student who has ever been called, with their rate.
  // A student missing from the list has no roll-call at all, which is not the same
  // as a perfect attendance rate.
  const studentsAtRisk = useStudentsAtRisk({ threshold: 0 });
  const groupAttendanceRates = useAttendanceRateByGroup(
    (groups.data ?? []).map((group) => group.id),
  );

  const totalStudents = students.data?.length ?? 0;
  const activeStudents = students.data?.filter((student) => student.active).length ?? 0;
  const totalTeachers = profiles.data?.filter((profile) => profile.role === "teacher").length ?? 0;
  const analyticsError = attendanceRate.error ?? absenteeismTrend.error ?? studentsAtRisk.error;
  const hasAnalyticsError =
    attendanceRate.isError || absenteeismTrend.isError || studentsAtRisk.isError;
  const hasIdentityError =
    students.isError || groups.isError || enrollments.isError || profiles.isError;
  const identityError = students.error ?? groups.error ?? enrollments.error ?? profiles.error;
  const retryIdentity = () => {
    if (students.isError) students.refetch();
    if (groups.isError) groups.refetch();
    if (enrollments.isError) enrollments.refetch();
    if (profiles.isError) profiles.refetch();
  };
  const retryAnalytics = () => {
    if (attendanceRate.isError) attendanceRate.refetch();
    if (absenteeismTrend.isError) absenteeismTrend.refetch();
    if (studentsAtRisk.isError) studentsAtRisk.refetch();
  };

  const trendPoints = absenteeismTrend.data ?? [];
  const attendanceTrendDelta =
    trendPoints.length >= 2
      ? Math.round(
          100 -
            trendPoints[trendPoints.length - 1].absenceRate -
            (100 - trendPoints[0].absenceRate),
        )
      : null;

  const studentById = new Map((students.data ?? []).map((student) => [student.id, student]));
  const groupById = new Map((groups.data ?? []).map((group) => [group.id, group]));

  const groupIdsByStudent = new Map<string, string[]>();
  for (const enrollment of enrollments.data ?? []) {
    if (!enrollment.active) continue;
    groupIdsByStudent.set(enrollment.studentId, [
      ...(groupIdsByStudent.get(enrollment.studentId) ?? []),
      enrollment.groupId,
    ]);
  }

  // A group with no roll-call yet gets no bar: zero percent would be as false as a
  // hundred, and the chart compares groups that have actually been called.
  const attendanceRateByGroup = groupAttendanceRates.data
    .filter((group) => group.total > 0)
    .map((group) => ({
      groupId: group.groupId,
      // Full name, not the part before "—": two groups sharing a subject
      // ("Reforço de Matemática — Segunda" / "— Terça") only differ after it.
      label: groupById.get(group.groupId)?.name ?? "",
      attendance: group.rate,
    }));

  const alerts = (studentsAtRisk.data ?? [])
    .filter((risk) => risk.absences >= RISK_ABSENCE_THRESHOLD)
    .slice(0, MAX_ALERTS)
    .map((risk) => {
      const student = studentById.get(risk.studentId);
      const groupIds = groupIdsByStudent.get(risk.studentId) ?? [];
      const groupNames = groupIds
        .map((groupId) => groupById.get(groupId)?.name)
        .filter((name): name is string => Boolean(name));
      return {
        ...risk,
        name: student?.name ?? "Aluno",
        groupNames: groupNames.join(", ") || "—",
      };
    });

  const trend = (absenteeismTrend.data ?? []).map((point) => ({
    date: point.date,
    attendance: 100 - point.absenceRate,
  }));

  return (
    <div className="flex flex-col gap-6">
      {(hasIdentityError || hasAnalyticsError) && (
        <QueryErrorState
          size="block"
          message={messageForError(
            identityError ?? analyticsError,
            "Não foi possível carregar os indicadores do painel.",
          )}
          onRetry={() => {
            retryIdentity();
            retryAnalytics();
          }}
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Total de alunos"
          value={students.isLoading ? "…" : students.isError ? "—" : String(totalStudents)}
          icon={<GroupIcon />}
          badge={
            !students.isLoading && !students.isError ? (
              <Badge variant="success">{activeStudents} ativos</Badge>
            ) : undefined
          }
        />
        <KpiCard
          label="Total de professores"
          value={profiles.isLoading ? "…" : profiles.isError ? "—" : String(totalTeachers)}
          icon={<UserCircleIcon />}
        />
        <KpiCard
          label="Frequência geral"
          value={
            attendanceRate.isLoading
              ? "…"
              : attendanceRate.isError
                ? "—"
                : formatPercent(attendanceRate.data?.rate ?? 0)
          }
          icon={<CheckCircleIcon />}
          badge={
            attendanceTrendDelta === null ? undefined : attendanceTrendDelta > 0 ? (
              <Badge variant="success">
                <ArrowUpIcon />
                {attendanceTrendDelta}%
              </Badge>
            ) : attendanceTrendDelta < 0 ? (
              <Badge variant="danger">
                <ArrowDownIcon />
                {Math.abs(attendanceTrendDelta)}%
              </Badge>
            ) : undefined
          }
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-foreground">Frequência por aula</h2>
          <p className="mb-2 text-sm text-muted-foreground">Comparativo de presença por aula</p>
          <AttendanceBarChart data={attendanceRateByGroup} />
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Alertas de baixa frequência
          </h2>
          {studentsAtRisk.isLoading ? (
            <RowsSkeleton rows={3} />
          ) : studentsAtRisk.isError ? (
            <QueryErrorState
              message={messageForError(
                studentsAtRisk.error,
                "Não foi possível carregar os alertas.",
              )}
              onRetry={() => studentsAtRisk.refetch()}
            />
          ) : alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados ainda.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {alerts.map((alert) => (
                <li key={alert.studentId} className="flex items-center gap-3">
                  <AvatarText name={alert.name} />
                  <div className="mr-auto min-w-0">
                    <p className="truncate font-medium text-foreground">{alert.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{alert.groupNames}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="danger">{formatPercent(alert.attendance)}</Badge>
                    <span className="text-xs text-muted-foreground">{alert.absences} faltas</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/students?filtro=risco"
            className="mt-4 inline-block text-sm font-medium text-primary hover:text-primary/90"
          >
            Ver todos os alunos em risco
          </Link>
        </Card>
      </div>

      <Card>
        <h2 className="mb-2 text-lg font-semibold text-foreground">Tendência de frequência</h2>
        <TrendLineChart points={trend} />
      </Card>
    </div>
  );
}
