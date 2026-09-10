"use client";

import { useState } from "react";
import type { Student } from "@/entities/student/model";
import { useStudentsByGroup } from "@/entities/student/queries";
import { useCreateAttendanceSession } from "@/entities/attendance-session/queries";
import type { AttendanceStatus } from "@/entities/attendance-record/model";
import {
  useSaveRollCall,
  useAttendanceRecordsBySession,
} from "@/entities/attendance-record/queries";
import { useGroups } from "@/entities/group/queries";
import { useSession } from "@/features/session/use-session";
import { messageForError } from "@/shared/lib/api/error-message";
import { formatDateLong } from "@/shared/lib/format";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { QueryErrorState } from "@/shared/ui/query-error";
import { RowsSkeleton } from "@/shared/ui/skeleton";
import { Calendar } from "lucide-react";
import { StudentRow, STATUS_OPTIONS } from "./StudentRow";
import { groupsForTeacher } from "@/entities/group/scope";

// Resolved on each render and again at save time, never cached at module load —
// a tab left open overnight must save against the current date, not yesterday's.
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const tileLabelColor: Record<AttendanceStatus, string> = {
  present: "text-success-600",
  late: "text-warning-600",
  absent: "text-destructive",
  excused: "text-primary",
};

function countByStatus(students: Student[], statusByStudent: Record<string, AttendanceStatus>) {
  const counts: Record<AttendanceStatus, number> = { present: 0, absent: 0, late: 0, excused: 0 };
  for (const student of students) {
    const status = statusByStudent[student.id];
    if (status) counts[status] += 1;
  }
  return counts;
}

export function AttendanceForm() {
  const { profileId } = useSession();
  const {
    data: allGroups,
    isLoading: isLoadingGroups,
    isError: hasGroupsError,
    error: groupsError,
    refetch: refetchGroups,
  } = useGroups();
  const groups = groupsForTeacher(allGroups ?? [], profileId);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const groupId = selectedGroupId ?? groups?.[0]?.id ?? "";
  const today = todayISO();
  const sessionId = groupId ? `chamada-${groupId}-${today}` : "";

  const {
    data: students,
    isLoading: isLoadingStudents,
    isError: hasStudentsError,
    error: studentsError,
    refetch: refetchStudents,
  } = useStudentsByGroup(groupId);
  const { data: attendanceRecords } = useAttendanceRecordsBySession(sessionId);

  const [statusByStudent, setStatusByStudent] = useState<Record<string, AttendanceStatus>>({});
  const [syncedSessionId, setSyncedSessionId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Adjusting state during render is React's documented pattern for deriving
  // state from props; the sessionId guard keeps it to one pass per session.
  if (sessionId && attendanceRecords && syncedSessionId !== sessionId) {
    const prefill: Record<string, AttendanceStatus> = {};
    for (const record of attendanceRecords) prefill[record.studentId] = record.status;
    setStatusByStudent(prefill);
    setSyncedSessionId(sessionId);
  }

  const createAttendanceSession = useCreateAttendanceSession();
  const saveRollCall = useSaveRollCall();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const counts = countByStatus(students ?? [], statusByStudent);

  const searchTerm = search.trim().toLowerCase();
  const filteredStudents = (students ?? []).filter(
    (student) => !searchTerm || student.name.toLowerCase().includes(searchTerm),
  );

  function selectStatus(studentId: string, status: AttendanceStatus) {
    setIsSaved(false);
    setStatusByStudent((prev) => ({ ...prev, [studentId]: status }));
  }

  function markAllPresent() {
    setIsSaved(false);
    setStatusByStudent((prev) => {
      const next = { ...prev };
      for (const student of students ?? []) next[student.id] = "present";
      return next;
    });
  }

  async function saveAttendance() {
    setError(null);
    setIsSaved(false);
    setIsSaving(true);
    try {
      const session = await createAttendanceSession.mutateAsync({ groupId, date: todayISO() });
      const entries = (students ?? [])
        .filter((student) => statusByStudent[student.id])
        .map((student) => ({ studentId: student.id, status: statusByStudent[student.id] }));

      if (entries.length > 0) {
        await saveRollCall.mutateAsync({ sessionId: session.id, entries });
      }
      setIsSaved(true);
    } catch {
      setError("Não foi possível salvar a chamada. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Card asChild>
        <header className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <select
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2.5 text-lg font-semibold text-foreground focus:border-ring focus:ring-3 focus:ring-ring/20 focus:outline-hidden"
              value={groupId}
              disabled={isLoadingGroups}
              onChange={(event) => setSelectedGroupId(event.target.value)}
              aria-label="Selecionar aula"
            >
              {(groups ?? []).map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
            <div className="flex flex-col gap-1">
              <Label className="text-xs font-medium text-muted-foreground">Data</Label>
              <div className="flex h-11 items-center gap-1.5 rounded-lg border border-input px-4 text-base text-foreground md:h-9 md:text-sm">
                <Calendar className="size-4 shrink-0 text-muted-foreground" />
                <span className="whitespace-nowrap tabular-nums">{formatDateLong(today)}</span>
              </div>
            </div>
          </div>

          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar aluno por nome..."
          />

          <div className="grid grid-cols-4 gap-2">
            {STATUS_OPTIONS.map((option) => (
              <div
                key={option.value}
                className="flex flex-col items-center rounded-lg bg-muted py-2"
              >
                <span className={`text-xs font-medium ${tileLabelColor[option.value]}`}>
                  {option.label}
                </span>
                <span className="text-lg font-semibold text-foreground">
                  {counts[option.value]}
                </span>
              </div>
            ))}
          </div>
        </header>
      </Card>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={markAllPresent}
        disabled={!groupId || (students?.length ?? 0) === 0}
      >
        Marcar todos como presente
      </Button>

      {isLoadingGroups && <RowsSkeleton rows={3} avatar={false} />}

      {!isLoadingGroups && hasGroupsError && (
        <QueryErrorState
          message={messageForError(groupsError, "Não foi possível carregar suas aulas.")}
          onRetry={() => refetchGroups()}
        />
      )}

      {!isLoadingGroups && !hasGroupsError && !groupId && (
        <p className="text-sm text-muted-foreground">Selecione uma aula para iniciar a chamada.</p>
      )}

      {!isLoadingGroups && !hasGroupsError && groups.length === 0 && (
        <p className="text-sm text-muted-foreground">Você não é regente de nenhuma aula.</p>
      )}

      {groupId && isLoadingStudents && <RowsSkeleton rows={3} />}

      {groupId && !isLoadingStudents && hasStudentsError && (
        <QueryErrorState
          message={messageForError(studentsError, "Não foi possível carregar os alunos.")}
          onRetry={() => refetchStudents()}
        />
      )}

      {groupId && !isLoadingStudents && !hasStudentsError && (students?.length ?? 0) === 0 && (
        <p className="text-sm text-muted-foreground">Aula sem alunos cadastrados.</p>
      )}

      {groupId &&
        !isLoadingStudents &&
        !hasStudentsError &&
        (students?.length ?? 0) > 0 &&
        filteredStudents.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhum aluno encontrado para “{search.trim()}”.
          </p>
        )}

      {groupId && !isLoadingStudents && !hasStudentsError && filteredStudents.length > 0 && (
        <div className="flex flex-col gap-2">
          {filteredStudents.map((student) => (
            <StudentRow
              key={student.id}
              student={student}
              status={statusByStudent[student.id]}
              onSelectStatus={(status) => selectStatus(student.id, status)}
            />
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span>{error}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={saveAttendance}
            disabled={isSaving}
          >
            Tentar novamente
          </Button>
        </div>
      )}

      <div className="sticky bottom-0 flex flex-col items-center gap-3 border-t border-border bg-card px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        {isSaved && <Badge variant="success">Chamada salva</Badge>}
        <Button
          type="button"
          className="w-full"
          onClick={saveAttendance}
          disabled={isSaving || !groupId || (students?.length ?? 0) === 0}
        >
          {isSaving ? "Salvando…" : "Salvar chamada"}
        </Button>
      </div>
    </div>
  );
}
