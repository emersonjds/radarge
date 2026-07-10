"use client";

import Link from "next/link";
import { useStudent } from "@/entities/student/queries";
import { useAttendanceSessions } from "@/entities/attendance-session/queries";
import { datesInRange } from "@/entities/school-event/model";
import { useSchoolEvents } from "@/entities/school-event/queries";
import type { AttendanceStatus } from "@/entities/attendance-record/model";
import { useAttendanceRecordsByStudent } from "@/entities/attendance-record/queries";
import { useGroups } from "@/entities/group/queries";
import { visibleGroups } from "@/entities/group/scope";
import { useAssignmentsByTeacher } from "@/entities/assignment/queries";
import { useEnrollmentsByStudent } from "@/entities/enrollment/queries";
import { useGradesByStudent } from "@/entities/grade/queries";
import { useSubjects } from "@/entities/subject/queries";
import { useSession } from "@/features/session/use-session";
import { countAbsences, attendanceRate } from "@/features/analytics/model";
import { computeAgeAt, todayIso } from "@/entities/student/age";
import { formatPercent } from "@/shared/lib/format";
import { AvatarText } from "@/shared/ui/avatar-text";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { AttendanceCalendar, type DayEvent } from "./AttendanceCalendar";
import { AcademicPanel } from "./AcademicPanel";
import { studentGradesInScope, studentGroupsInScope } from "./scope";

function mesComMaisRegistros(datas: string[]): string | null {
  if (datas.length === 0) return null;
  const contagem = new Map<string, number>();
  for (const data of datas) {
    const mes = data.slice(0, 7);
    contagem.set(mes, (contagem.get(mes) ?? 0) + 1);
  }
  return [...contagem.entries()].sort(
    (mesA, mesB) => mesB[1] - mesA[1],
  )[0][0];
}

export interface StudentDetailProps {
  studentId: string;
  backHref: string;
  backLabel: string;
}

export function StudentDetail({ studentId, backHref, backLabel }: StudentDetailProps) {
  const { role, profileId } = useSession();
  const ehProfessor = role === "teacher";
  const { data: aluno, isLoading: carregandoAluno } = useStudent(studentId);
  const { data: turmas, isLoading: carregandoTurmas } = useGroups();
  const { data: enrollments, isLoading: carregandoMatriculas } =
    useEnrollmentsByStudent(studentId);
  const { data: chamadas } = useAttendanceSessions();
  const { data: presencas, isLoading: carregandoPresencas } =
    useAttendanceRecordsByStudent(studentId);
  const { data: eventosEscolares } = useSchoolEvents();
  const { data: notas } = useGradesByStudent(studentId);
  const { data: materias } = useSubjects();
  const { data: assignmentsDoProfessor } = useAssignmentsByTeacher(
    ehProfessor ? (profileId ?? "") : "",
  );

  const idsVisiveis = new Set(visibleGroups(turmas ?? [], role, profileId).map((aula) => aula.id));
  const aulasDoAluno = studentGroupsInScope(enrollments ?? [], turmas ?? [], role, profileId);

  if (carregandoAluno || carregandoTurmas || carregandoMatriculas) {
    return <p className="text-sm text-muted-foreground">Carregando aluno…</p>;
  }

  // A ficha inteira é PII de menor: o professor só a alcança pelos alunos que
  // estudam com ele. Fora disso o aluno não existe — nem por link direto.
  const foraDoEscopo = ehProfessor && aulasDoAluno.length === 0;

  if (!aluno || foraDoEscopo) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">Aluno não encontrado.</p>
        <Button asChild variant="outline">
          <Link href={backHref}>Voltar para {backLabel}</Link>
        </Button>
      </div>
    );
  }

  const chamadaPorId = new Map(
    (chamadas ?? [])
      .filter((chamada) => idsVisiveis.has(chamada.groupId))
      .map((chamada) => [chamada.id, chamada]),
  );
  const presencasVisiveis = (presencas ?? []).filter((presenca) =>
    chamadaPorId.has(presenca.sessionId),
  );

  const notasVisiveis = studentGradesInScope(
    notas ?? [],
    assignmentsDoProfessor ?? [],
    aulasDoAluno,
    role,
  );

  const voltar = (
    <Link
      href={backHref}
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      {backLabel}
    </Link>
  );

  const statusPorData = new Map<string, AttendanceStatus>();
  for (const presenca of presencasVisiveis) {
    const chamada = chamadaPorId.get(presenca.sessionId);
    if (chamada) statusPorData.set(chamada.date, presenca.status);
  }
  const mes = mesComMaisRegistros([...statusPorData.keys()]);

  const eventosPorData = new Map<string, DayEvent[]>();
  function adicionarEvento(data: string, evento: DayEvent) {
    eventosPorData.set(data, [...(eventosPorData.get(data) ?? []), evento]);
  }
  for (const eventoEscolar of eventosEscolares ?? []) {
    for (const data of datesInRange(eventoEscolar.startDate, eventoEscolar.endDate)) {
      adicionarEvento(data, { type: eventoEscolar.type, title: eventoEscolar.title });
    }
  }

  // Sem registro nenhum, "0%" leria como presença perfeita — melhor não afirmar nada.
  const semRegistros = presencasVisiveis.length === 0;
  const frequencia = semRegistros ? "—" : formatPercent(attendanceRate(presencasVisiveis));
  const faltas = semRegistros ? "—" : String(countAbsences(presencasVisiveis));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        {voltar}
        <div className="flex items-center gap-4">
          <AvatarText name={aluno.name} />
          <div>
            <h1 className="text-2xl font-bold text-foreground">{aluno.name}</h1>
            <p className="text-sm text-muted-foreground">Desempenho e presença</p>
          </div>
          <Badge variant={aluno.active ? "success" : "danger"}>
            {aluno.active ? "ATIVO" : "INATIVO"}
          </Badge>
        </div>
      </header>

      {!aluno.active && (
        <p className="rounded-lg border border-warning-500/40 bg-warning-50 px-4 py-3 text-sm text-warning-700">
          Aluno inativo — os dados abaixo estão congelados e não recebem novas chamadas.
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="flex flex-col gap-6 rounded-xl border bg-card p-4 shadow-sm lg:col-span-1">
          <dl className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Idade</dt>
              <dd className="font-medium text-foreground">
                {computeAgeAt(aluno.birthDate, todayIso())} anos
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Responsável</dt>
              <dd className="font-medium text-foreground">{aluno.guardianName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Telefone</dt>
              <dd className="font-medium text-foreground">
                <a className="hover:underline" href={`tel:${aluno.guardianPhone}`}>
                  {aluno.guardianPhone}
                </a>
              </dd>
            </div>
          </dl>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-muted p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{frequencia}</p>
              <p className="text-xs text-muted-foreground">Frequência</p>
            </div>
            <div className="rounded-xl bg-muted p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{faltas}</p>
              <p className="text-xs text-muted-foreground">Faltas</p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Aulas
            </p>
            {aulasDoAluno.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem aulas matriculadas.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {aulasDoAluno.map((aula) => (
                  <li
                    key={aula.id}
                    className="rounded-full border border-border bg-muted px-3 py-1 text-xs text-foreground"
                  >
                    {aula.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <Tabs defaultValue="presenca" className="flex flex-col gap-4 lg:col-span-2">
          <TabsList className="grid w-full grid-cols-2 sm:w-64">
            <TabsTrigger value="presenca">Presença</TabsTrigger>
            <TabsTrigger value="notas">Notas</TabsTrigger>
          </TabsList>

          <TabsContent value="presenca">
            <section className="rounded-xl border bg-card p-4 shadow-sm">
              {carregandoPresencas && (
                <p className="text-sm text-muted-foreground">Carregando registros…</p>
              )}
              {!carregandoPresencas && mes && (
                <AttendanceCalendar
                  key={aluno.id}
                  mes={mes}
                  statusPorData={statusPorData}
                  eventosPorData={eventosPorData}
                />
              )}
              {!carregandoPresencas && !mes && (
                <p className="text-sm text-muted-foreground">Sem registros de presença.</p>
              )}
            </section>
          </TabsContent>

          <TabsContent value="notas">
            <AcademicPanel grades={notasVisiveis} subjects={materias ?? []} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
