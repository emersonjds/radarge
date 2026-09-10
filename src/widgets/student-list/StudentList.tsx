"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useStudents, useDeleteStudent } from "@/entities/student/queries";
import { useEnrollments } from "@/entities/enrollment/queries";
import type { Student } from "@/entities/student/model";
import { useStudentsAtRisk } from "@/features/analytics/queries";
import { useGroups } from "@/entities/group/queries";
import { useSession } from "@/features/session/use-session";
import { messageForError } from "@/shared/lib/api/error-message";
import { computeAgeAt, todayIso } from "@/entities/student/age";
import { formatPercent } from "@/shared/lib/format";
import { AvatarText } from "@/shared/ui/avatar-text";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { PlusIcon } from "@tailadmin/icons";
import { IconButton } from "@/shared/ui/icon-button";
import { StudentFormModal } from "./StudentFormModal";

const RISK_ABSENCE_THRESHOLD = 3;

const th = "px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground";
const td = "px-5 py-4 text-sm text-foreground";
export function StudentList() {
  const { role, profile, status: sessionStatus } = useSession();
  const { data: students, isLoading: isLoadingStudents } = useStudents();
  const { data: groups, isLoading: isLoadingGroups } = useGroups();
  const { data: enrollments, isLoading: isLoadingEnrollments } = useEnrollments();
  const {
    data: studentsAtRisk,
    isLoading: isLoadingRisk,
    isError: hasRiskError,
    error: riskError,
    // Threshold zero returns every student ever called. A student missing from the
    // list has no roll-call, which is not the same as a perfect attendance rate.
  } = useStudentsAtRisk({ threshold: 0 });
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const riskFilter = searchParams.get("filtro") === "risco";

  const [formStudent, setFormStudent] = useState<Student | null | undefined>(undefined);
  const deleteStudent = useDeleteStudent();

  const isLoading =
    sessionStatus === "loading" ||
    isLoadingStudents ||
    isLoadingGroups ||
    isLoadingEnrollments ||
    isLoadingRisk;
  const isTeacher = role === "teacher";

  const groupById = new Map((groups ?? []).map((group) => [group.id, group]));

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

  const teacherGroups = isTeacher
    ? (groups ?? []).filter((group) => group.teacherId === profile?.id)
    : [];
  const teacherGroupIds = new Set(teacherGroups.map((group) => group.id));

  const scopedStudents = isTeacher
    ? (students ?? []).filter((student) =>
        (groupIdsByStudent.get(student.id) ?? []).some((groupId) => teacherGroupIds.has(groupId)),
      )
    : (students ?? []);

  const visibleStudents = riskFilter
    ? scopedStudents.filter(
        (student) => (absencesByStudent.get(student.id) ?? 0) >= RISK_ABSENCE_THRESHOLD,
      )
    : scopedStudents;

  const searchTerm = search.trim().toLowerCase();
  const filteredStudents = searchTerm
    ? visibleStudents.filter((student) => student.name.toLowerCase().includes(searchTerm))
    : visibleStudents;

  const today = todayIso();
  const rows = filteredStudents.map((student) => {
    const groupNames = (groupIdsByStudent.get(student.id) ?? [])
      .map((groupId) => groupById.get(groupId)?.name)
      .filter((name): name is string => Boolean(name));
    return {
      student,
      age: computeAgeAt(student.birthDate, today),
      groupNames: groupNames.join(", ") || "—",
      attendance: attendanceRateByStudent.get(student.id) ?? null,
      absences: absencesByStudent.get(student.id) ?? 0,
    };
  });

  const hasNoGroups = isTeacher && teacherGroups.length === 0;
  const columnCount = isTeacher ? 7 : 8;
  const detailHref = (studentId: string) =>
    isTeacher ? `/students?aluno=${studentId}` : `/reports?studentId=${studentId}`;
  const title = riskFilter ? "Alunos em risco" : isTeacher ? "Meus alunos" : "Alunos";
  const subtitle = riskFilter
    ? `${visibleStudents.length} aluno${visibleStudents.length === 1 ? "" : "s"} com ${RISK_ABSENCE_THRESHOLD} ou mais faltas`
    : isTeacher
      ? "Alunos das suas aulas"
      : `${visibleStudents.length} aluno${visibleStudents.length === 1 ? "" : "s"} cadastrados`;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome"
            className="h-11 w-full rounded-lg border border-input bg-transparent px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/20 focus:outline-hidden sm:w-80"
          />
          {!isTeacher && (
            <Button className="h-11" onClick={() => setFormStudent(null)}>
              <PlusIcon />
              Adicionar aluno
            </Button>
          )}
        </div>
      </header>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-border bg-muted">
              <TableRow>
                <TableHead className={th}>Aluno</TableHead>
                {!isTeacher && <TableHead className={th}>Idade</TableHead>}
                {!isTeacher && <TableHead className={th}>Responsável</TableHead>}
                <TableHead className={th}>Aulas</TableHead>
                <TableHead className={th}>Frequência</TableHead>
                <TableHead className={th}>Faltas</TableHead>
                <TableHead className={th}>Situação</TableHead>
                <TableHead className={th}>Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell
                    className={`${td} text-center text-muted-foreground`}
                    colSpan={columnCount}
                  >
                    Carregando alunos…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && hasRiskError && (
                <TableRow>
                  <TableCell className={`${td} text-center text-destructive`} colSpan={columnCount}>
                    {messageForError(riskError, "Não foi possível carregar a frequência.")}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !hasRiskError && hasNoGroups && (
                <TableRow>
                  <TableCell
                    className={`${td} text-center text-muted-foreground`}
                    colSpan={columnCount}
                  >
                    Você não tem aulas atribuídas
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !hasRiskError && !hasNoGroups && rows.length === 0 && (
                <TableRow>
                  <TableCell
                    className={`${td} text-center text-muted-foreground`}
                    colSpan={columnCount}
                  >
                    Nenhum aluno encontrado
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                !hasRiskError &&
                rows.map(({ student, age, groupNames, attendance, absences }) => {
                  const atRisk = absences >= RISK_ABSENCE_THRESHOLD;
                  return (
                    <TableRow key={student.id} className="border-t border-border">
                      <TableCell className={td}>
                        <div className="flex items-center gap-3">
                          <AvatarText name={student.name} />
                          <span className="font-medium text-foreground">{student.name}</span>
                        </div>
                      </TableCell>
                      {!isTeacher && <TableCell className={td}>{age} anos</TableCell>}
                      {!isTeacher && (
                        <TableCell className={td}>
                          <div className="flex flex-col">
                            <span className="text-foreground">{student.guardianName}</span>
                            <span className="text-xs text-muted-foreground">
                              {student.guardianPhone}
                            </span>
                          </div>
                        </TableCell>
                      )}
                      <TableCell className={td}>{groupNames}</TableCell>
                      <TableCell className={td}>
                        {attendance === null ? "—" : formatPercent(attendance)}
                      </TableCell>
                      <TableCell className={td}>{absences}</TableCell>
                      <TableCell className={td}>
                        <Badge variant={atRisk ? "danger" : "success"}>
                          {atRisk ? "Em risco" : "Regular"}
                        </Badge>
                      </TableCell>
                      <TableCell className={td}>
                        <div className="flex items-center gap-1">
                          <IconButton
                            icon={Eye}
                            label={`Ver detalhes de ${student.name}`}
                            href={detailHref(student.id)}
                          />
                          {!isTeacher && (
                            <>
                              <IconButton
                                icon={Pencil}
                                label={`Editar ${student.name}`}
                                onClick={() => setFormStudent(student)}
                              />
                              <IconButton
                                icon={Trash2}
                                label={`Excluir ${student.name}`}
                                tone="destructive"
                                disabled={deleteStudent.isPending}
                                onClick={() => {
                                  if (window.confirm(`Excluir o aluno ${student.name}?`)) {
                                    deleteStudent.mutate(student.id);
                                  }
                                }}
                              />
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>
      </div>

      <StudentFormModal student={formStudent} onClose={() => setFormStudent(undefined)} />
    </div>
  );
}
