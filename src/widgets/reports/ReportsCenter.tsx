"use client";

import { useMemo, useState } from "react";
import { useStudents } from "@/entities/student/queries";
import { useGroups } from "@/entities/group/queries";
import { useEnrollments } from "@/entities/enrollment/queries";
import { useGrades } from "@/entities/grade/queries";
import { useSubjects } from "@/entities/subject/queries";
import type { Grade } from "@/entities/grade/model";
import { areaLabels } from "@/entities/subject/model";
import {
  useAcademicSummary,
  useAttendanceRate,
  useStudentsAtRisk,
} from "@/features/analytics/queries";
import { overallAverage, studentAptitude } from "@/features/analytics/academic";
import { messageForError } from "@/shared/lib/api/error-message";
import { formatPercent, formatScore } from "@/shared/lib/format";
import { downloadCsv, toCsv } from "@/shared/lib/csv";
import { Button } from "@/shared/ui/button";
import { DownloadIcon } from "@tailadmin/icons";
import { ClassOverview } from "./ClassOverview";
import { StudentsReportTable, type ReportRow } from "./StudentsReportTable";

const LIMITE_FALTAS_RISCO = 3;
const TODAS = "todas";

const control =
  "h-11 rounded-lg border border-input bg-transparent px-3 text-base text-foreground focus:border-ring focus:outline-hidden focus:ring-3 focus:ring-ring/20 sm:text-sm";

export function ReportsCenter() {
  const { data: alunos, isLoading: carregandoAlunos } = useStudents();
  const { data: turmas } = useGroups();
  const { data: enrollments } = useEnrollments();
  const { data: notas, isLoading: carregandoNotas } = useGrades();
  const { data: materias } = useSubjects();

  const [turmaId, setTurmaId] = useState(TODAS);
  const [periodo, setPeriodo] = useState("2026-1");

  const groupFilter = turmaId === TODAS ? {} : { groupId: turmaId };
  const {
    data: riscoAbsenteismo,
    isLoading: carregandoRisco,
    isError: erroAoCarregarAnalytics,
    error: erroAnalytics,
    // Zero traz todo aluno já chamado alguma vez. Quem não aparece nunca teve
    // chamada, e o relatório diz isso em vez de fingir cem por cento.
  } = useStudentsAtRisk({ ...groupFilter, threshold: 0 });
  const { data: taxaFrequencia, isLoading: carregandoTaxa } = useAttendanceRate(groupFilter);
  const { data: resumoAcademico, isLoading: carregandoResumo } = useAcademicSummary(groupFilter);

  const carregando =
    carregandoAlunos || carregandoNotas || carregandoRisco || carregandoTaxa || carregandoResumo;

  const dados = useMemo(() => {
    const listaAlunos = alunos ?? [];
    const listaMaterias = materias ?? [];
    const turmaPorId = new Map((turmas ?? []).map((turma) => [turma.id, turma]));

    const notasPorAluno = new Map<string, Grade[]>();
    for (const nota of notas ?? []) {
      notasPorAluno.set(nota.studentId, [...(notasPorAluno.get(nota.studentId) ?? []), nota]);
    }

    // Fora da lista de risco, a única leitura possível é "sem faltas registradas".
    const frequenciaPorAluno = new Map(
      (riscoAbsenteismo ?? []).map((risco) => [risco.studentId, risco.attendance]),
    );
    const faltasPorAluno = new Map(
      (riscoAbsenteismo ?? []).map((risco) => [risco.studentId, risco.absences]),
    );

    const turmasPorAluno = new Map<string, string[]>();
    for (const enrollment of enrollments ?? []) {
      if (!enrollment.active) continue;
      turmasPorAluno.set(enrollment.studentId, [
        ...(turmasPorAluno.get(enrollment.studentId) ?? []),
        enrollment.groupId,
      ]);
    }

    const escopoAlunos =
      turmaId === TODAS
        ? listaAlunos
        : listaAlunos.filter((aluno) => (turmasPorAluno.get(aluno.id) ?? []).includes(turmaId));

    const linhas: ReportRow[] = escopoAlunos.map((aluno) => {
      const notasDoAluno = notasPorAluno.get(aluno.id) ?? [];
      const nomesTurmas = (turmasPorAluno.get(aluno.id) ?? [])
        .map((groupId) => turmaPorId.get(groupId)?.name)
        .filter((name): name is string => Boolean(name));
      const faltas = faltasPorAluno.get(aluno.id) ?? 0;
      return {
        id: aluno.id,
        name: aluno.name,
        turmaNome: nomesTurmas.join(", ") || "—",
        nota: overallAverage(notasDoAluno),
        freq: frequenciaPorAluno.get(aluno.id) ?? null,
        faltas,
        aptidao: studentAptitude(notasDoAluno, listaMaterias),
        emRisco: faltas >= LIMITE_FALTAS_RISCO,
      };
    });

    return { linhas, totalAlunos: escopoAlunos.length };
  }, [alunos, materias, turmas, notas, enrollments, turmaId, riscoAbsenteismo]);

  const escopoLabel =
    turmaId === TODAS
      ? "Todas as aulas"
      : ((turmas ?? []).find((turma) => turma.id === turmaId)?.name ?? "Aula");

  function exportar() {
    const headers = ["Aluno", "Turma", "Nota média", "Frequência", "Faltas", "Aptidão", "Situação"];
    const linhasCsv = dados.linhas.map((linha) => [
      linha.name,
      linha.turmaNome,
      formatScore(linha.nota),
      // Empty, not a dash: an em-dash in a spreadsheet cell poisons SUM and AVERAGE.
      linha.freq === null ? "" : formatPercent(linha.freq),
      linha.faltas,
      linha.aptidao ? areaLabels[linha.aptidao] : "—",
      linha.emRisco ? "Em risco" : "Regular",
    ]);
    const slug = escopoLabel
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    downloadCsv(`relatorio-${slug}.csv`, toCsv(headers, linhasCsv));
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Panorama acadêmico e de frequência por aula — clique num aluno para a ficha completa
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Aula
            <select
              aria-label="Selecionar aula"
              className={control}
              value={turmaId}
              onChange={(event) => setTurmaId(event.target.value)}
            >
              <option value={TODAS}>Todas as aulas</option>
              {(turmas ?? []).map((turma) => (
                <option key={turma.id} value={turma.id}>
                  {turma.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Período
            <select
              aria-label="Selecionar período"
              className={control}
              value={periodo}
              onChange={(event) => setPeriodo(event.target.value)}
            >
              <option value="2026-1">Semestre 1 (2026)</option>
              <option value="2026-2">Semestre 2 (2026)</option>
            </select>
          </label>
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled={dados.linhas.length === 0}
            onClick={exportar}
          >
            <DownloadIcon />
            Exportar CSV
          </Button>
        </div>
      </header>

      {erroAoCarregarAnalytics && (
        <p role="alert" className="text-sm text-destructive">
          {messageForError(erroAnalytics, "Não foi possível carregar os indicadores da aula.")}
        </p>
      )}

      {carregando || !resumoAcademico ? (
        <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground shadow-sm md:p-5">
          Carregando panorama…
        </div>
      ) : (
        <ClassOverview
          escopo={escopoLabel}
          totalAlunos={dados.totalAlunos}
          avgAttendance={taxaFrequencia?.rate ?? 0}
          summary={resumoAcademico}
          subjects={materias ?? []}
        />
      )}

      <StudentsReportTable linhas={dados.linhas} carregando={carregando} />
    </div>
  );
}
