"use client";

import { useState } from "react";
import { shiftLabels, type Group } from "@/entities/group/model";
import { useGroups, useDeleteGroup } from "@/entities/group/queries";
import { useProfiles } from "@/entities/profile/queries";
import { ChevronDown, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { IconButton } from "@/shared/ui/icon-button";
import { GroupFormModal } from "./GroupFormModal";
import { GroupAssignmentsPanel } from "./GroupAssignmentsPanel";
import { EnrollmentPanel } from "./EnrollmentPanel";

export function GroupsAdmin() {
  const { data: groups, isLoading } = useGroups();
  const { data: profiles } = useProfiles();
  const deleteGroup = useDeleteGroup();
  const [editing, setEditing] = useState<Group | null | undefined>(undefined);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function teacherName(teacherId: string) {
    return (profiles ?? []).find((profile) => profile.id === teacherId)?.name ?? "—";
  }

  async function remove(group: Group) {
    if (!window.confirm(`Excluir a aula ${group.name}?`)) return;
    setError(null);
    try {
      await deleteGroup.mutateAsync(group.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível remover.");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Aulas</h1>
        <Button size="sm" onClick={() => setEditing(null)}>
          Adicionar aula
        </Button>
      </header>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {isLoading ? (
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
      ) : (
        <ul className="flex flex-col gap-2">
          {(groups ?? []).map((group) => (
            <Card asChild key={group.id} className="px-4 py-3">
              <li>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{group.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {shiftLabels[group.shift]} · Regente: {teacherName(group.teacherId)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <IconButton
                      icon={ChevronDown}
                      label={
                        expandedId === group.id
                          ? `Fechar detalhes de ${group.name}`
                          : `Ver detalhes de ${group.name}`
                      }
                      aria-expanded={expandedId === group.id}
                      className={expandedId === group.id ? "rotate-180" : undefined}
                      onClick={() => setExpandedId(expandedId === group.id ? null : group.id)}
                    />
                    <IconButton
                      icon={Pencil}
                      label={`Editar ${group.name}`}
                      onClick={() => setEditing(group)}
                    />
                    <IconButton
                      icon={Trash2}
                      label={`Excluir ${group.name}`}
                      tone="destructive"
                      onClick={() => remove(group)}
                    />
                  </div>
                </div>
                {expandedId === group.id && (
                  <>
                    <EnrollmentPanel groupId={group.id} />
                    <GroupAssignmentsPanel groupId={group.id} />
                  </>
                )}
              </li>
            </Card>
          ))}
        </ul>
      )}

      <GroupFormModal group={editing} onClose={() => setEditing(undefined)} />
    </div>
  );
}
