"use client";

import { useState } from "react";
import { evaluationTypeLabels, type Evaluation } from "@/entities/evaluation/model";
import { useEvaluationsByAssignment, useDeleteEvaluation } from "@/entities/evaluation/queries";
import { Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { IconButton } from "@/shared/ui/icon-button";
import { EvaluationFormModal } from "./EvaluationFormModal";
import { GradeEntryPanel } from "./GradeEntryPanel";

export function EvaluationsPanel({ groupId, subjectId }: { groupId: string; subjectId: string }) {
  const { data: evaluations, isLoading } = useEvaluationsByAssignment(groupId, subjectId);
  const deleteEvaluation = useDeleteEvaluation();
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  function remove(evaluation: Evaluation) {
    const warning = `Excluir a avaliação ${evaluation.name}? As notas lançadas nela serão apagadas.`;
    if (window.confirm(warning)) deleteEvaluation.mutate(evaluation.id);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h4 className="text-base font-semibold text-foreground">Avaliações</h4>
        <Button size="sm" onClick={() => setCreating(true)}>
          Nova avaliação
        </Button>
      </div>

      {isLoading ? (
        <div className="h-16 animate-pulse rounded-xl bg-muted" />
      ) : (
        <ul className="flex flex-col gap-2">
          {(evaluations ?? []).map((evaluation: Evaluation) => (
            <li key={evaluation.id} className="rounded-xl border bg-card px-4 py-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-foreground">{evaluation.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {evaluationTypeLabels[evaluation.type]} · peso {evaluation.weight} ·{" "}
                    {evaluation.date}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setOpenId(openId === evaluation.id ? null : evaluation.id)}
                  >
                    {openId === evaluation.id ? "Fechar notas" : "Lançar notas"}
                  </Button>
                  <IconButton
                    icon={Trash2}
                    label={`Excluir ${evaluation.name}`}
                    tone="destructive"
                    onClick={() => remove(evaluation)}
                  />
                </div>
              </div>
              {openId === evaluation.id && <GradeEntryPanel evaluation={evaluation} />}
            </li>
          ))}
          {(evaluations ?? []).length === 0 && (
            <li className="text-sm text-muted-foreground">Nenhuma avaliação ainda.</li>
          )}
        </ul>
      )}

      <EvaluationFormModal
        open={creating}
        groupId={groupId}
        subjectId={subjectId}
        onClose={() => setCreating(false)}
      />
    </div>
  );
}
