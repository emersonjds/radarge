"use client";

import { useState } from "react";
import { evaluationTypeLabels, type Evaluation } from "@/entities/evaluation/model";
import { useEvaluationsByAssignment, useDeleteEvaluation } from "@/entities/evaluation/queries";
import { Trash2 } from "lucide-react";
import { messageForError } from "@/shared/lib/api/error-message";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { IconButton } from "@/shared/ui/icon-button";
import { QueryErrorState } from "@/shared/ui/query-error";
import { RowsSkeleton } from "@/shared/ui/skeleton";
import { EvaluationFormModal } from "./EvaluationFormModal";
import { GradeEntryPanel } from "./GradeEntryPanel";

export function EvaluationsPanel({ groupId, subjectId }: { groupId: string; subjectId: string }) {
  const {
    data: evaluations,
    isLoading,
    isError,
    error,
    refetch,
  } = useEvaluationsByAssignment(groupId, subjectId);
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
        <RowsSkeleton rows={2} avatar={false} />
      ) : isError ? (
        <QueryErrorState
          message={messageForError(error, "Não foi possível carregar as avaliações.")}
          onRetry={() => refetch()}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {(evaluations ?? []).map((evaluation: Evaluation) => (
            <Card asChild key={evaluation.id} className="px-4 py-3">
              <li>
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
            </Card>
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
