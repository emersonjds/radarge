"use client";

import { useState } from "react";
import { areaLabels, type Subject } from "@/entities/subject/model";
import { useSubjects, useDeleteSubject } from "@/entities/subject/queries";
import { Pencil, Trash2 } from "lucide-react";
import { messageForError } from "@/shared/lib/api/error-message";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { IconButton } from "@/shared/ui/icon-button";
import { QueryErrorState } from "@/shared/ui/query-error";
import { RowsSkeleton } from "@/shared/ui/skeleton";
import { SubjectFormModal } from "./SubjectFormModal";

export function SubjectsAdmin() {
  const { data: subjects, isLoading, isError, error: subjectsError, refetch } = useSubjects();
  const deleteSubject = useDeleteSubject();
  // undefined = modal closed; null = creating; Subject = editing.
  const [editing, setEditing] = useState<Subject | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  async function remove(subject: Subject) {
    if (!window.confirm(`Excluir a matéria ${subject.name}?`)) return;
    setError(null);
    try {
      await deleteSubject.mutateAsync(subject.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível remover.");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Matérias</h1>
        <Button size="sm" onClick={() => setEditing(null)}>
          Adicionar matéria
        </Button>
      </header>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {isLoading ? (
        <RowsSkeleton rows={3} avatar={false} />
      ) : isError ? (
        <QueryErrorState
          message={messageForError(subjectsError, "Não foi possível carregar as matérias.")}
          onRetry={() => refetch()}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {(subjects ?? []).map((subject) => (
            <Card asChild key={subject.id} className="flex items-center justify-between px-4 py-3">
              <li>
                <div>
                  <p className="font-medium text-foreground">{subject.name}</p>
                  <p className="text-xs text-muted-foreground">{areaLabels[subject.area]}</p>
                </div>
                <div className="flex items-center gap-1">
                  <IconButton
                    icon={Pencil}
                    label={`Editar ${subject.name}`}
                    onClick={() => setEditing(subject)}
                  />
                  <IconButton
                    icon={Trash2}
                    label={`Excluir ${subject.name}`}
                    tone="destructive"
                    onClick={() => remove(subject)}
                  />
                </div>
              </li>
            </Card>
          ))}
        </ul>
      )}

      <SubjectFormModal subject={editing} onClose={() => setEditing(undefined)} />
    </div>
  );
}
