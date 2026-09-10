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
import { formatDateLong } from "@/shared/lib/format";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { CalenderIcon } from "@tailadmin/icons";
import { StudentRow, STATUS_OPTIONS } from "./StudentRow";
import { groupsForTeacher } from "@/entities/group/scope";

const TODAY = new Date().toISOString().slice(0, 10);

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
  const { data: allGroups, isLoading: isLoadingGroups } = useGroups();
  const groups = groupsForTeacher(allGroups ?? [], profileId);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const groupId = selectedGroupId ?? groups?.[0]?.id ?? "";
  const sessionId = groupId ? `chamada-${groupId}-${TODAY}` : "";

  const { data: students, isLoading: isLoadingStudents } = useStudentsByGroup(groupId);
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
      const session = await createAttendanceSession.mutateAsync({ groupId, date: TODAY });
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
      <header className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 md:p-5">
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
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalenderIcon />
            {formatDateLong(TODAY)}
          </p>
        </div>

        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar aluno por nome ou matrícula..."
          className="h-11 w-full rounded-lg border border-input bg-transparent px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/20 focus:outline-hidden"
        />

        <div className="grid grid-cols-4 gap-2">
          {STATUS_OPTIONS.map((option) => (
            <div key={option.value} className="flex flex-col items-center rounded-lg bg-muted py-2">
              <span className={`text-xs font-medium ${tileLabelColor[option.value]}`}>
                {option.label}
              </span>
              <span className="text-lg font-semibold text-foreground">{counts[option.value]}</span>
            </div>
          ))}
        </div>
      </header>

      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={markAllPresent}
          disabled={!groupId || (students?.length ?? 0) === 0}
        >
          Marcar todos como presente
        </Button>
      </div>

      {!groupId && (
        <p className="text-sm text-muted-foreground">Selecione uma aula para iniciar a chamada.</p>
      )}

      {groups.length === 0 && !isLoadingGroups && (
        <p className="text-sm text-muted-foreground">Você não é regente de nenhuma aula.</p>
      )}

      {groupId && isLoadingStudents && (
        <div className="flex flex-col gap-2">
          <div className="h-16 animate-pulse rounded-xl bg-muted" />
          <div className="h-16 animate-pulse rounded-xl bg-muted" />
          <div className="h-16 animate-pulse rounded-xl bg-muted" />
        </div>
      )}

      {groupId && !isLoadingStudents && (students?.length ?? 0) === 0 && (
        <p className="text-sm text-muted-foreground">Aula sem alunos cadastrados.</p>
      )}

      {groupId &&
        !isLoadingStudents &&
        (students?.length ?? 0) > 0 &&
        filteredStudents.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhum aluno encontrado para “{search.trim()}”.
          </p>
        )}

      {groupId && !isLoadingStudents && filteredStudents.length > 0 && (
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

      <div className="flex flex-col items-center gap-3">
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
