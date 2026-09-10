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
import { groupsForRegente } from "@/entities/group/scope";

const HOJE = new Date().toISOString().slice(0, 10);

const tileLabelColor: Record<AttendanceStatus, string> = {
  present: "text-success-600",
  late: "text-warning-600",
  absent: "text-destructive",
  excused: "text-primary",
};

function contarPorStatus(alunos: Student[], statusPorAluno: Record<string, AttendanceStatus>) {
  const contagem: Record<AttendanceStatus, number> = { present: 0, absent: 0, late: 0, excused: 0 };
  for (const aluno of alunos) {
    const status = statusPorAluno[aluno.id];
    if (status) contagem[status] += 1;
  }
  return contagem;
}

export function AttendanceForm() {
  const { profileId } = useSession();
  const { data: allGroups, isLoading: carregandoTurmas } = useGroups();
  const turmas = groupsForRegente(allGroups ?? [], profileId);
  const [turmaSelecionada, setTurmaSelecionada] = useState<string | null>(null);
  const groupId = turmaSelecionada ?? turmas?.[0]?.id ?? "";
  const sessionId = groupId ? `chamada-${groupId}-${HOJE}` : "";

  const { data: alunos, isLoading: carregandoAlunos } = useStudentsByGroup(groupId);
  const { data: presencas } = useAttendanceRecordsBySession(sessionId);

  const [statusPorAluno, setStatusPorAluno] = useState<Record<string, AttendanceStatus>>({});
  const [chamadaSincronizada, setChamadaSincronizada] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  // Prefill local edits from the persisted presenças whenever the roll-call
  // session (turma + data) changes — adjust state during render (React's documented
  // pattern for this) instead of an effect, guarded by sessionId so it runs once per session.
  if (sessionId && presencas && chamadaSincronizada !== sessionId) {
    const prefill: Record<string, AttendanceStatus> = {};
    for (const presenca of presencas) prefill[presenca.studentId] = presenca.status;
    setStatusPorAluno(prefill);
    setChamadaSincronizada(sessionId);
  }

  const createAttendanceSession = useCreateAttendanceSession();
  const saveRollCall = useSaveRollCall();
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  const contagem = contarPorStatus(alunos ?? [], statusPorAluno);

  const termoBusca = busca.trim().toLowerCase();
  const alunosFiltrados = (alunos ?? []).filter(
    (aluno) => !termoBusca || aluno.name.toLowerCase().includes(termoBusca),
  );

  function selecionarStatus(studentId: string, status: AttendanceStatus) {
    setSalvo(false);
    setStatusPorAluno((prev) => ({ ...prev, [studentId]: status }));
  }

  function marcarTodosPresentes() {
    setSalvo(false);
    setStatusPorAluno((prev) => {
      const next = { ...prev };
      for (const aluno of alunos ?? []) next[aluno.id] = "present";
      return next;
    });
  }

  async function salvarChamada() {
    setErro(null);
    setSalvo(false);
    setSalvando(true);
    try {
      const chamada = await createAttendanceSession.mutateAsync({ groupId, date: HOJE });
      const entries = (alunos ?? [])
        .filter((aluno) => statusPorAluno[aluno.id])
        .map((aluno) => ({ studentId: aluno.id, status: statusPorAluno[aluno.id] }));

      if (entries.length > 0) {
        await saveRollCall.mutateAsync({ sessionId: chamada.id, entries });
      }
      setSalvo(true);
    } catch {
      setErro("Não foi possível salvar a chamada. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 md:p-5">
        <div className="flex flex-col gap-2">
          <select
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2.5 text-lg font-semibold text-foreground focus:border-ring focus:ring-3 focus:ring-ring/20 focus:outline-hidden"
            value={groupId}
            disabled={carregandoTurmas}
            onChange={(event) => setTurmaSelecionada(event.target.value)}
            aria-label="Selecionar aula"
          >
            {(turmas ?? []).map((turma) => (
              <option key={turma.id} value={turma.id}>
                {turma.name}
              </option>
            ))}
          </select>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalenderIcon />
            {formatDateLong(HOJE)}
          </p>
        </div>

        <input
          type="search"
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
          placeholder="Buscar aluno por nome ou matrícula..."
          className="h-11 w-full rounded-lg border border-input bg-transparent px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/20 focus:outline-hidden"
        />

        <div className="grid grid-cols-4 gap-2">
          {STATUS_OPTIONS.map((opcao) => (
            <div key={opcao.value} className="flex flex-col items-center rounded-lg bg-muted py-2">
              <span className={`text-xs font-medium ${tileLabelColor[opcao.value]}`}>
                {opcao.label}
              </span>
              <span className="text-lg font-semibold text-foreground">{contagem[opcao.value]}</span>
            </div>
          ))}
        </div>
      </header>

      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={marcarTodosPresentes}
          disabled={!groupId || (alunos?.length ?? 0) === 0}
        >
          Marcar todos como presente
        </Button>
      </div>

      {!groupId && (
        <p className="text-sm text-muted-foreground">Selecione uma aula para iniciar a chamada.</p>
      )}

      {turmas.length === 0 && !carregandoTurmas && (
        <p className="text-sm text-muted-foreground">Você não é regente de nenhuma aula.</p>
      )}

      {groupId && carregandoAlunos && (
        <div className="flex flex-col gap-2">
          <div className="h-16 animate-pulse rounded-xl bg-muted" />
          <div className="h-16 animate-pulse rounded-xl bg-muted" />
          <div className="h-16 animate-pulse rounded-xl bg-muted" />
        </div>
      )}

      {groupId && !carregandoAlunos && (alunos?.length ?? 0) === 0 && (
        <p className="text-sm text-muted-foreground">Aula sem alunos cadastrados.</p>
      )}

      {groupId &&
        !carregandoAlunos &&
        (alunos?.length ?? 0) > 0 &&
        alunosFiltrados.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhum aluno encontrado para “{busca.trim()}”.
          </p>
        )}

      {groupId && !carregandoAlunos && alunosFiltrados.length > 0 && (
        <div className="flex flex-col gap-2">
          {alunosFiltrados.map((aluno) => (
            <StudentRow
              key={aluno.id}
              aluno={aluno}
              status={statusPorAluno[aluno.id]}
              onSelectStatus={(status) => selecionarStatus(aluno.id, status)}
            />
          ))}
        </div>
      )}

      {erro && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span>{erro}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={salvarChamada}
            disabled={salvando}
          >
            Tentar novamente
          </Button>
        </div>
      )}

      <div className="flex flex-col items-center gap-3">
        {salvo && <Badge variant="success">Chamada salva</Badge>}
        <Button
          type="button"
          className="w-full"
          onClick={salvarChamada}
          disabled={salvando || !groupId || (alunos?.length ?? 0) === 0}
        >
          {salvando ? "Salvando…" : "Salvar chamada"}
        </Button>
      </div>
    </div>
  );
}
