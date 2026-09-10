"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useStudents, useDeleteStudent } from "@/entities/student/queries";
import { useEnrollments } from "@/entities/enrollment/queries";
import type { Student } from "@/entities/student/model";
import type { AttendanceRecord } from "@/entities/attendance-record/model";
import { useAttendanceRecords } from "@/entities/attendance-record/queries";
import { useGroups } from "@/entities/group/queries";
import { useSession } from "@/features/session/use-session";
import { countAbsences, attendanceRate } from "@/features/analytics/model";
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

const LIMITE_FALTAS_RISCO = 3;

const th = "px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground";
const td = "px-5 py-4 text-sm text-foreground";
export function StudentList() {
  const { role, profile, status: sessionStatus } = useSession();
  const { data: alunos, isLoading: carregandoAlunos } = useStudents();
  const { data: turmas, isLoading: carregandoTurmas } = useGroups();
  const { data: enrollments, isLoading: carregandoMatriculas } = useEnrollments();
  const { data: presencas, isLoading: carregandoPresencas } = useAttendanceRecords();
  const searchParams = useSearchParams();
  const [busca, setBusca] = useState(() => searchParams.get("q") ?? "");
  const filtroRisco = searchParams.get("filtro") === "risco";

  const [formAluno, setFormAluno] = useState<Student | null | undefined>(undefined);
  const deleteStudent = useDeleteStudent();

  const carregando =
    sessionStatus === "loading" ||
    carregandoAlunos ||
    carregandoTurmas ||
    carregandoMatriculas ||
    carregandoPresencas;
  const isProfessor = role === "teacher";

  const turmaPorId = new Map((turmas ?? []).map((turma) => [turma.id, turma]));

  const recordsByStudent = new Map<string, AttendanceRecord[]>();
  for (const presenca of presencas ?? []) {
    recordsByStudent.set(presenca.studentId, [
      ...(recordsByStudent.get(presenca.studentId) ?? []),
      presenca,
    ]);
  }

  const aulasDoAluno = new Map<string, string[]>();
  for (const enrollment of enrollments ?? []) {
    if (!enrollment.active) continue;
    aulasDoAluno.set(enrollment.studentId, [
      ...(aulasDoAluno.get(enrollment.studentId) ?? []),
      enrollment.groupId,
    ]);
  }

  const turmasDoProfessor = isProfessor
    ? (turmas ?? []).filter((turma) => turma.teacherId === profile?.id)
    : [];
  const turmaIdsDoProfessor = new Set(turmasDoProfessor.map((turma) => turma.id));

  const alunosDoEscopo = isProfessor
    ? (alunos ?? []).filter((aluno) =>
        (aulasDoAluno.get(aluno.id) ?? []).some((groupId) => turmaIdsDoProfessor.has(groupId)),
      )
    : (alunos ?? []);

  const alunosEscopo = filtroRisco
    ? alunosDoEscopo.filter(
        (aluno) => countAbsences(recordsByStudent.get(aluno.id) ?? []) >= LIMITE_FALTAS_RISCO,
      )
    : alunosDoEscopo;

  const termo = busca.trim().toLowerCase();
  const alunosFiltrados = termo
    ? alunosEscopo.filter((aluno) => aluno.name.toLowerCase().includes(termo))
    : alunosEscopo;

  const hoje = todayIso();
  const linhas = alunosFiltrados.map((aluno) => {
    const presencasDoAluno = recordsByStudent.get(aluno.id) ?? [];
    const nomesAulas = (aulasDoAluno.get(aluno.id) ?? [])
      .map((groupId) => turmaPorId.get(groupId)?.name)
      .filter((name): name is string => Boolean(name));
    return {
      aluno,
      idade: computeAgeAt(aluno.birthDate, hoje),
      aulas: nomesAulas.join(", ") || "—",
      attendance: attendanceRate(presencasDoAluno),
      absences: countAbsences(presencasDoAluno),
    };
  });

  const semTurmas = isProfessor && turmasDoProfessor.length === 0;
  const colunas = isProfessor ? 7 : 8;
  const detalheHref = (alunoId: string) =>
    isProfessor ? `/students?aluno=${alunoId}` : `/reports?studentId=${alunoId}`;
  const titulo = filtroRisco ? "Alunos em risco" : isProfessor ? "Meus alunos" : "Alunos";
  const subtitulo = filtroRisco
    ? `${alunosEscopo.length} aluno${alunosEscopo.length === 1 ? "" : "s"} com ${LIMITE_FALTAS_RISCO} ou mais faltas`
    : isProfessor
      ? "Alunos das suas aulas"
      : `${alunosEscopo.length} aluno${alunosEscopo.length === 1 ? "" : "s"} cadastrados`;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{titulo}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitulo}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <input
            type="search"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por nome"
            className="h-11 w-full rounded-lg border border-input bg-transparent px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/20 focus:outline-hidden sm:w-80"
          />
          {!isProfessor && (
            <Button className="h-11" onClick={() => setFormAluno(null)}>
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
                {!isProfessor && <TableHead className={th}>Idade</TableHead>}
                {!isProfessor && <TableHead className={th}>Responsável</TableHead>}
                <TableHead className={th}>Aulas</TableHead>
                <TableHead className={th}>Frequência</TableHead>
                <TableHead className={th}>Faltas</TableHead>
                <TableHead className={th}>Situação</TableHead>
                <TableHead className={th}>Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {carregando && (
                <TableRow>
                  <TableCell
                    className={`${td} text-center text-muted-foreground`}
                    colSpan={colunas}
                  >
                    Carregando alunos…
                  </TableCell>
                </TableRow>
              )}
              {!carregando && semTurmas && (
                <TableRow>
                  <TableCell
                    className={`${td} text-center text-muted-foreground`}
                    colSpan={colunas}
                  >
                    Você não tem aulas atribuídas
                  </TableCell>
                </TableRow>
              )}
              {!carregando && !semTurmas && linhas.length === 0 && (
                <TableRow>
                  <TableCell
                    className={`${td} text-center text-muted-foreground`}
                    colSpan={colunas}
                  >
                    Nenhum aluno encontrado
                  </TableCell>
                </TableRow>
              )}
              {!carregando &&
                linhas.map(({ aluno, idade, aulas, attendance, absences }) => {
                  const emRisco = absences >= LIMITE_FALTAS_RISCO;
                  return (
                    <TableRow key={aluno.id} className="border-t border-border">
                      <TableCell className={td}>
                        <div className="flex items-center gap-3">
                          <AvatarText name={aluno.name} />
                          <span className="font-medium text-foreground">{aluno.name}</span>
                        </div>
                      </TableCell>
                      {!isProfessor && <TableCell className={td}>{idade} anos</TableCell>}
                      {!isProfessor && (
                        <TableCell className={td}>
                          <div className="flex flex-col">
                            <span className="text-foreground">{aluno.guardianName}</span>
                            <span className="text-xs text-muted-foreground">
                              {aluno.guardianPhone}
                            </span>
                          </div>
                        </TableCell>
                      )}
                      <TableCell className={td}>{aulas}</TableCell>
                      <TableCell className={td}>{formatPercent(attendance)}</TableCell>
                      <TableCell className={td}>{absences}</TableCell>
                      <TableCell className={td}>
                        <Badge variant={emRisco ? "danger" : "success"}>
                          {emRisco ? "Em risco" : "Regular"}
                        </Badge>
                      </TableCell>
                      <TableCell className={td}>
                        <div className="flex items-center gap-1">
                          <IconButton
                            icon={Eye}
                            label={`Ver detalhes de ${aluno.name}`}
                            href={detalheHref(aluno.id)}
                          />
                          {!isProfessor && (
                            <>
                              <IconButton
                                icon={Pencil}
                                label={`Editar ${aluno.name}`}
                                onClick={() => setFormAluno(aluno)}
                              />
                              <IconButton
                                icon={Trash2}
                                label={`Excluir ${aluno.name}`}
                                tone="destructive"
                                disabled={deleteStudent.isPending}
                                onClick={() => {
                                  if (window.confirm(`Excluir o aluno ${aluno.name}?`)) {
                                    deleteStudent.mutate(aluno.id);
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

      <StudentFormModal student={formAluno} onClose={() => setFormAluno(undefined)} />
    </div>
  );
}
