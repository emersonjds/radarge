"use client";

import { useState } from "react";
import { roleLabels } from "@/entities/profile/model";
import { useDeleteProfile, useProfiles, useSetProfileActive } from "@/entities/profile/queries";
import { useGroups } from "@/entities/group/queries";
import { useSession } from "@/features/session/use-session";
import type { PublicProfile } from "@/entities/profile/api";
import { ProfileFormModal } from "./ProfileFormModal";
import { messageForError } from "@/shared/lib/api/error-message";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { QueryErrorState } from "@/shared/ui/query-error";
import { RowsSkeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import { Pencil, Power, PowerOff, Trash2 } from "lucide-react";
import { IconButton } from "@/shared/ui/icon-button";

export function ProfilesAdmin() {
  const { profileId } = useSession();
  const { data: profiles, isLoading, isError, error, refetch } = useProfiles();
  const { data: groups } = useGroups();
  const setActive = useSetProfileActive();
  const deleteProfile = useDeleteProfile();

  // undefined = modal closed; null = creating; PublicProfile = editing.
  const [editingProfile, setEditingProfile] = useState<PublicProfile | null | undefined>(undefined);

  function confirmDelete(profile: PublicProfile) {
    const teachingCount = (groups ?? []).filter((group) => group.teacherId === profile.id).length;
    const warning =
      teachingCount > 0
        ? `${profile.name} é regente de ${teachingCount} ${teachingCount === 1 ? "aula" : "aulas"}, que ficarão sem professor. Excluir o perfil mesmo assim?`
        : `Excluir o perfil de ${profile.name}?`;
    if (window.confirm(warning)) deleteProfile.mutate(profile.id);
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Perfis</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie e gerencie os acessos abaixo de você.
          </p>
        </div>
        <Button size="sm" onClick={() => setEditingProfile(null)}>
          Adicionar perfil
        </Button>
      </header>

      <Card asChild>
        <section>
          <h2 className="mb-5 text-lg font-semibold text-foreground">Perfis existentes</h2>
          {isLoading ? (
            <RowsSkeleton rows={3} avatar={false} />
          ) : isError ? (
            <QueryErrorState
              message={messageForError(error, "Não foi possível carregar os perfis.")}
              onRetry={() => refetch()}
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {(profiles ?? []).map((profile) => {
                const isCurrentUser = profile.id === profileId;
                return (
                  <Card
                    asChild
                    key={profile.id}
                    className="flex flex-wrap items-center gap-3 px-4 py-3"
                  >
                    <li>
                      <div className="mr-auto min-w-0">
                        <p
                          className={cn(
                            "flex items-center gap-2 font-medium",
                            profile.active ? "text-foreground" : "text-muted-foreground",
                          )}
                        >
                          {profile.name}
                          {isCurrentUser && <Badge variant="outline">Você</Badge>}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          @{profile.username} · {roleLabels[profile.role]}
                        </p>
                      </div>
                      <Badge variant={profile.active ? "success" : "secondary"}>
                        {profile.active ? "Ativo" : "Inativo"}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <IconButton
                          icon={Pencil}
                          label={`Editar ${profile.name}`}
                          onClick={() => setEditingProfile(profile)}
                        />
                        {!isCurrentUser && (
                          <>
                            <IconButton
                              icon={profile.active ? PowerOff : Power}
                              label={
                                profile.active
                                  ? `Desativar ${profile.name}`
                                  : `Ativar ${profile.name}`
                              }
                              disabled={setActive.isPending}
                              onClick={() =>
                                setActive.mutate({ id: profile.id, active: !profile.active })
                              }
                            />
                            <IconButton
                              icon={Trash2}
                              label={`Excluir ${profile.name}`}
                              tone="destructive"
                              disabled={deleteProfile.isPending}
                              onClick={() => confirmDelete(profile)}
                            />
                          </>
                        )}
                      </div>
                    </li>
                  </Card>
                );
              })}
            </ul>
          )}
        </section>
      </Card>

      <ProfileFormModal profile={editingProfile} onClose={() => setEditingProfile(undefined)} />
    </div>
  );
}
