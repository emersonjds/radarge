"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Card } from "@/shared/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { AttendanceCalendar, type DayEvent } from "./AttendanceCalendar";
import { AcademicPanel } from "./AcademicPanel";
import { studentGradesInScope, studentGroupsInScope } from "./scope";

function monthWithMostRecords(dates: string[]): string | null {
  if (dates.length === 0) return null;
  const counts = new Map<string, number>();
  for (const date of dates) {
    const month = date.slice(0, 7);
    counts.set(month, (counts.get(month) ?? 0) + 1);
  }
  return [...counts.entries()].sort((first, second) => second[1] - first[1])[0][0];
}

/**
 * The detail view is `/students?aluno=<id>`, so going back changes only the search
 * param. `Link` treats that as the same route and leaves the address bar untouched
 * after a hard load onto the parametrised URL, which strands anyone who refreshed or
 * opened a shared link. Driving the router by hand is what moves it.
 */
function BackLink({
  href,
  label,
  className,
  children,
}: {
  href: string;
  label: string;
  className?: string;
  children?: ReactNode;
}) {
  const router = useRouter();

  return (
    <Link
      href={href}
      className={className}
      onClick={(event) => {
        event.preventDefault();
        router.replace(href);
      }}
    >
      {children}
      {label}
    </Link>
  );
}

export interface StudentDetailProps {
  studentId: string;
  backHref: string;
  backLabel: string;
}

export function StudentDetail({ studentId, backHref, backLabel }: StudentDetailProps) {
  const { role, profileId } = useSession();
  const isTeacher = role === "teacher";
  const { data: student, isLoading: isLoadingStudent } = useStudent(studentId);
  const { data: groups, isLoading: isLoadingGroups } = useGroups();
  const { data: enrollments, isLoading: isLoadingEnrollments } = useEnrollmentsByStudent(studentId);
  const { data: attendanceSessions } = useAttendanceSessions();
  const { data: attendanceRecords, isLoading: isLoadingAttendance } =
    useAttendanceRecordsByStudent(studentId);
  const { data: schoolEvents } = useSchoolEvents();
  const { data: grades } = useGradesByStudent(studentId);
  const { data: subjects } = useSubjects();
  const { data: teacherAssignments } = useAssignmentsByTeacher(isTeacher ? (profileId ?? "") : "");

  const visibleGroupIds = new Set(
    visibleGroups(groups ?? [], role, profileId).map((group) => group.id),
  );
  const studentGroups = studentGroupsInScope(enrollments ?? [], groups ?? [], role, profileId);

  if (isLoadingStudent || isLoadingGroups || isLoadingEnrollments) {
    return <p className="text-sm text-muted-foreground">Carregando aluno…</p>;
  }

  // The whole record is PII of a minor: a teacher reaches it only through the
  // students they teach. Outside that, the student does not exist — not even by direct link.
  const outOfScope = isTeacher && studentGroups.length === 0;

  if (!student || outOfScope) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">Aluno não encontrado.</p>
        <Button asChild variant="outline">
          <BackLink href={backHref} label={`Voltar para ${backLabel}`} />
        </Button>
      </div>
    );
  }

  const sessionById = new Map(
    (attendanceSessions ?? [])
      .filter((session) => visibleGroupIds.has(session.groupId))
      .map((session) => [session.id, session]),
  );
  const visibleRecords = (attendanceRecords ?? []).filter((record) =>
    sessionById.has(record.sessionId),
  );

  const visibleGrades = studentGradesInScope(
    grades ?? [],
    teacherAssignments ?? [],
    studentGroups,
    role,
  );

  const goBack = (
    <BackLink
      href={backHref}
      label={backLabel}
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
    </BackLink>
  );

  const statusByDate = new Map<string, AttendanceStatus>();
  for (const record of visibleRecords) {
    const session = sessionById.get(record.sessionId);
    if (session) statusByDate.set(session.date, record.status);
  }
  const month = monthWithMostRecords([...statusByDate.keys()]);

  const eventsByDate = new Map<string, DayEvent[]>();
  function addEvent(date: string, event: DayEvent) {
    eventsByDate.set(date, [...(eventsByDate.get(date) ?? []), event]);
  }
  for (const schoolEvent of schoolEvents ?? []) {
    for (const date of datesInRange(schoolEvent.startDate, schoolEvent.endDate)) {
      addEvent(date, { type: schoolEvent.type, title: schoolEvent.title });
    }
  }

  // With no records at all, "0%" would read as perfect attendance — better to claim nothing.
  const hasNoRecords = visibleRecords.length === 0;
  const attendancePercent = hasNoRecords ? "—" : formatPercent(attendanceRate(visibleRecords));
  const absences = hasNoRecords ? "—" : String(countAbsences(visibleRecords));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        {goBack}
        <div className="flex items-center gap-4">
          <AvatarText name={student.name} />
          <div>
            <h1 className="text-2xl font-bold text-foreground">{student.name}</h1>
            <p className="text-sm text-muted-foreground">Desempenho e presença</p>
          </div>
          <Badge variant={student.active ? "success" : "danger"}>
            {student.active ? "ATIVO" : "INATIVO"}
          </Badge>
        </div>
      </header>

      {!student.active && (
        <p className="rounded-lg border border-warning-500/40 bg-warning-50 px-4 py-3 text-sm text-warning-700">
          Aluno inativo — os dados abaixo estão congelados e não recebem novas chamadas.
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card asChild className="lg:col-span-1">
          <section className="flex flex-col gap-6">
            <dl className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Idade</dt>
                <dd className="font-medium text-foreground">
                  {computeAgeAt(student.birthDate, todayIso())} anos
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Responsável</dt>
                <dd className="font-medium text-foreground">{student.guardianName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Telefone</dt>
                <dd className="font-medium text-foreground">
                  <a className="hover:underline" href={`tel:${student.guardianPhone}`}>
                    {student.guardianPhone}
                  </a>
                </dd>
              </div>
            </dl>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-muted p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{attendancePercent}</p>
                <p className="text-xs text-muted-foreground">Frequência</p>
              </div>
              <div className="rounded-xl bg-muted p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{absences}</p>
                <p className="text-xs text-muted-foreground">Faltas</p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Aulas
              </p>
              {studentGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem aulas matriculadas.</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {studentGroups.map((group) => (
                    <li
                      key={group.id}
                      className="rounded-full border border-border bg-muted px-3 py-1 text-xs text-foreground"
                    >
                      {group.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </Card>

        <Tabs defaultValue="presenca" className="flex flex-col gap-4 lg:col-span-2">
          <TabsList className="grid w-full grid-cols-2 sm:w-64">
            <TabsTrigger value="presenca">Presença</TabsTrigger>
            <TabsTrigger value="notas">Notas</TabsTrigger>
          </TabsList>

          <TabsContent value="presenca">
            <Card asChild>
              <section>
                {isLoadingAttendance && (
                  <p className="text-sm text-muted-foreground">Carregando registros…</p>
                )}
                {!isLoadingAttendance && month && (
                  <AttendanceCalendar
                    key={student.id}
                    month={month}
                    statusByDate={statusByDate}
                    eventsByDate={eventsByDate}
                  />
                )}
                {!isLoadingAttendance && !month && (
                  <p className="text-sm text-muted-foreground">Sem registros de presença.</p>
                )}
              </section>
            </Card>
          </TabsContent>

          <TabsContent value="notas">
            <AcademicPanel grades={visibleGrades} subjects={subjects ?? []} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
