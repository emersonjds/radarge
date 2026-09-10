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
import { formatPercent } from "@/shared/lib/format";
import { paginate } from "@/shared/lib/pagination";
import { useIsDesktop } from "@/shared/lib/use-is-desktop";
import { AvatarText } from "@/shared/ui/avatar-text";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { TablePagination } from "@/shared/ui/table-pagination";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { PlusIcon } from "@tailadmin/icons";
import { IconButton } from "@/shared/ui/icon-button";
import { StudentFormModal } from "./StudentFormModal";

const RISK_ABSENCE_THRESHOLD = 3;

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
  const [page, setPage] = useState(1);

  const [formStudent, setFormStudent] = useState<Student | null | undefined>(undefined);
  const deleteStudent = useDeleteStudent();
  const isDesktop = useIsDesktop();

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

  // Resetting page on a filter change during render (not an effect) avoids the
  // extra commit React flags when setState runs from useEffect.
  const filterKey = `${searchTerm}|${riskFilter}`;
  const [appliedFilterKey, setAppliedFilterKey] = useState(filterKey);
  if (filterKey !== appliedFilterKey) {
    setAppliedFilterKey(filterKey);
    setPage(1);
  }

  const rows = filteredStudents.map((student) => {
    const groupNames = (groupIdsByStudent.get(student.id) ?? [])
      .map((groupId) => groupById.get(groupId)?.name)
      .filter((name): name is string => Boolean(name));
    return {
      student,
      groupNames: groupNames.join(", ") || "—",
      attendance: attendanceRateByStudent.get(student.id) ?? null,
      absences: absencesByStudent.get(student.id) ?? 0,
    };
  });
  const pageRows = paginate(rows, page);

  const hasNoGroups = isTeacher && teacherGroups.length === 0;
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
            className="h-11 w-full rounded-lg border border-input bg-transparent px-4 text-base text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/20 focus:outline-hidden sm:w-80 md:text-sm"
          />
          {!isTeacher && (
            <Button onClick={() => setFormStudent(null)}>
              <PlusIcon />
              Adicionar aluno
            </Button>
          )}
        </div>
      </header>

      <Card className="overflow-hidden p-0">
        {isLoading && <p className="p-4 text-center text-muted-foreground">Carregando alunos…</p>}
        {!isLoading && hasRiskError && (
          <p role="alert" className="p-4 text-center text-destructive">
            {messageForError(riskError, "Não foi possível carregar a frequência.")}
          </p>
        )}
        {!isLoading && !hasRiskError && hasNoGroups && (
          <p className="p-4 text-center text-muted-foreground">Você não tem aulas atribuídas</p>
        )}
        {!isLoading && !hasRiskError && !hasNoGroups && rows.length === 0 && (
          <p className="p-4 text-center text-muted-foreground">Nenhum aluno encontrado</p>
        )}
        {!isLoading && !hasRiskError && !hasNoGroups && rows.length > 0 && (
          <>
            {isDesktop ? (
              <Table>
                <TableHeader className="border-b border-border bg-muted">
                  <TableRow>
                    <TableHead className="min-w-48">Aluno</TableHead>
                    {!isTeacher && <TableHead>Responsável</TableHead>}
                    <TableHead>Aulas</TableHead>
                    <TableHead className="w-24 text-right">Frequência</TableHead>
                    <TableHead className="w-24 text-right">Faltas</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map(({ student, groupNames, attendance, absences }) => {
                    const atRisk = absences >= RISK_ABSENCE_THRESHOLD;
                    return (
                      <TableRow key={student.id} className="border-t border-border">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <AvatarText name={student.name} />
                            <span className="font-medium text-foreground">{student.name}</span>
                          </div>
                        </TableCell>
                        {!isTeacher && (
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-foreground">{student.guardianName}</span>
                              <span className="text-xs text-muted-foreground">
                                {student.guardianPhone}
                              </span>
                            </div>
                          </TableCell>
                        )}
                        <TableCell className="max-w-48 truncate" title={groupNames}>
                          {groupNames}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {attendance === null ? "—" : formatPercent(attendance)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{absences}</TableCell>
                        <TableCell>
                          <Badge variant={atRisk ? "danger" : "success"}>
                            {atRisk ? "Em risco" : "Regular"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
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
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {pageRows.map(({ student, groupNames, attendance, absences }) => {
                  const atRisk = absences >= RISK_ABSENCE_THRESHOLD;
                  return (
                    <li key={student.id} className="flex flex-col gap-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <AvatarText name={student.name} />
                          <span className="line-clamp-2 text-sm font-medium break-words text-foreground">
                            {student.name}
                          </span>
                        </div>
                        <Badge className="shrink-0" variant={atRisk ? "danger" : "success"}>
                          {atRisk ? "Em risco" : "Regular"}
                        </Badge>
                      </div>
                      <p className="truncate text-xs text-muted-foreground" title={groupNames}>
                        {groupNames}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Frequência {attendance === null ? "—" : formatPercent(attendance)} ·{" "}
                        {absences} falta{absences === 1 ? "" : "s"}
                      </p>
                      <div className="flex items-center justify-end gap-1">
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
                    </li>
                  );
                })}
              </ul>
            )}

            <TablePagination page={page} totalRows={rows.length} onPageChange={setPage} />
          </>
        )}
      </Card>

      <StudentFormModal student={formStudent} onClose={() => setFormStudent(undefined)} />
    </div>
  );
}
