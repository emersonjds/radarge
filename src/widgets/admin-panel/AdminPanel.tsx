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
  useStudentsAtRisk,
} from "@/features/analytics/queries";
import { messageForError } from "@/shared/lib/api/error-message";
import { formatPercent } from "@/shared/lib/format";
import { AvatarText } from "@/shared/ui/avatar-text";
import { Badge } from "@/shared/ui/badge";
import { GroupIcon, UserCircleIcon, CheckCircleIcon } from "@tailadmin/icons";
import { AttendanceBarChart } from "./AttendanceBarChart";
import { TrendLineChart } from "./TrendLineChart";

/** Below this, a lone teacher account (dev seed) would tank the stat — show a plausible mock instead. */
const MOCK_TEACHERS_THRESHOLD = 2;
const MOCK_TOTAL_TEACHERS = 148;
const RISK_ABSENCE_THRESHOLD = 3;
const MAX_ALERTS = 3;

interface AdminTask {
  title: string;
  status: "Pendente" | "Concluída" | "Urgente";
}

const ADMIN_TASKS: AdminTask[] = [
  { title: "Reunião de diretoria: orçamento do 3º trimestre", status: "Pendente" },
  { title: "Renovação de credenciamento docente", status: "Concluída" },
  { title: "Auditoria de instalações sanitárias", status: "Urgente" },
  { title: "Recepção de novos alunos", status: "Pendente" },
];

const TASK_VARIANT: Record<AdminTask["status"], "secondary" | "success" | "danger"> = {
  Pendente: "secondary",
  Concluída: "success",
  Urgente: "danger",
};

function StatCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-primary">
        {icon}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
    </div>
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

  const totalStudents = students.data?.length ?? 0;
  const totalTeachers = profiles.data?.filter((profile) => profile.role === "teacher").length ?? 0;
  const analyticsError = attendanceRate.error ?? absenteeismTrend.error ?? studentsAtRisk.error;

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

  const attendanceRateByStudent = new Map(
    (studentsAtRisk.data ?? []).map((risk) => [risk.studentId, risk.attendance]),
  );

  // A group with no roll-call yet gets no bar: zero percent would be as false as a
  // hundred, and the chart compares groups that have actually been called.
  const attendanceRateByGroup = (groups.data ?? [])
    .map((group) => {
      const knownRates = (students.data ?? [])
        .filter((student) => (groupIdsByStudent.get(student.id) ?? []).includes(group.id))
        .map((student) => attendanceRateByStudent.get(student.id))
        .filter((rate): rate is number => rate !== undefined);

      return {
        groupId: group.id,
        label: group.name.split("—")[0].trim(),
        knownRates,
      };
    })
    .filter((group) => group.knownRates.length > 0)
    .map(({ groupId, label, knownRates }) => ({
      groupId,
      label,
      attendance: Math.round(
        knownRates.reduce((total, rate) => total + rate, 0) / knownRates.length,
      ),
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
      {analyticsError && (
        <p role="alert" className="text-sm text-destructive">
          {messageForError(
            analyticsError,
            "Não foi possível carregar os indicadores de frequência.",
          )}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total de alunos"
          value={students.isLoading ? "…" : String(totalStudents)}
          icon={<GroupIcon />}
        />
        <StatCard
          label="Total de professores"
          value={
            profiles.isLoading
              ? "…"
              : String(totalTeachers < MOCK_TEACHERS_THRESHOLD ? MOCK_TOTAL_TEACHERS : totalTeachers)
          }
          icon={<UserCircleIcon />}
        />
        <StatCard
          label="Frequência geral"
          value={
            attendanceRate.isLoading
              ? "…"
              : attendanceRate.isError
                ? "—"
                : formatPercent(attendanceRate.data?.rate ?? 0)
          }
          icon={<CheckCircleIcon />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold text-foreground">Frequência por aula</h2>
          <p className="mb-2 text-sm text-muted-foreground">Comparativo de presença por aula</p>
          <AttendanceBarChart data={attendanceRateByGroup} />
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Alertas de baixa frequência
          </h2>
          {studentsAtRisk.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
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
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm lg:col-span-2">
          <h2 className="mb-2 text-lg font-semibold text-foreground">Tendência de frequência</h2>
          <TrendLineChart points={trend} />
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Tarefas administrativas</h2>
          <ul className="flex flex-col gap-3">
            {ADMIN_TASKS.map((task) => (
              <li key={task.title} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-foreground">{task.title}</span>
                <Badge variant={TASK_VARIANT[task.status]}>{task.status}</Badge>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
