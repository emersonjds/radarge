"use client";

import { useState, type FormEvent } from "react";
import { roleLabels, roleSchema, type Role } from "@/entities/profile/model";
import {
  useCreateProfile,
  useDeleteProfile,
  useProfiles,
  useSetProfileActive,
} from "@/entities/profile/queries";
import { useGroups } from "@/entities/group/queries";
import { useSession } from "@/features/session/use-session";
import type { PublicProfile } from "@/entities/profile/api";
import { ProfileFormModal } from "./ProfileFormModal";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { cn } from "@/shared/lib/utils";
import { Pencil, Power, PowerOff, Trash2 } from "lucide-react";
import { IconButton } from "@/shared/ui/icon-button";

const ROLES = roleSchema.options;
const EMPTY_FORM = { name: "", username: "", role: "teacher" as Role, password: "" };

const control =
  "h-11 w-full rounded-lg border border-input bg-transparent px-4 text-sm text-foreground focus:border-ring focus:outline-hidden focus:ring-3 focus:ring-ring/20";
export function ProfilesAdmin() {
  const { profileId } = useSession();
  const { data: perfis, isLoading } = useProfiles();
  const { data: aulas } = useGroups();
  const createProfile = useCreateProfile();
  const setActive = useSetProfileActive();
  const deleteProfile = useDeleteProfile();

  function confirmarExclusao(perfil: PublicProfile) {
    const regencias = (aulas ?? []).filter((aula) => aula.teacherId === perfil.id).length;
    const aviso =
      regencias > 0
        ? `${perfil.name} é regente de ${regencias} ${regencias === 1 ? "aula" : "aulas"}, que ficarão sem professor. Excluir o perfil mesmo assim?`
        : `Excluir o perfil de ${perfil.name}?`;
    if (window.confirm(aviso)) deleteProfile.mutate(perfil.id);
  }

  const [form, setForm] = useState(EMPTY_FORM);
  const [erro, setErro] = useState<string | null>(null);
  const [criado, setCriado] = useState<string | null>(null);
  const [editando, setEditando] = useState<PublicProfile | null>(null);

  async function criar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (createProfile.isPending) return;
    setErro(null);
    setCriado(null);
    try {
      const perfil = await createProfile.mutateAsync(form);
      setCriado(`Perfil de ${perfil.name} criado.`);
      setForm(EMPTY_FORM);
    } catch (motivo) {
      setErro(motivo instanceof Error ? motivo.message : "Não foi possível criar o perfil.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Perfis</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Crie e gerencie os acessos abaixo de você.
        </p>
      </header>

      <section className="rounded-xl border bg-card p-4 shadow-sm md:p-5">
        <h2 className="mb-5 text-lg font-semibold text-foreground">Novo perfil</h2>
        <form onSubmit={criar} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5" htmlFor="perfil-nome">
                Nome
              </Label>
              <input
                id="perfil-nome"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                required
                className={control}
              />
            </div>
            <div>
              <Label className="mb-1.5" htmlFor="perfil-usuario">
                Login de usuário
              </Label>
              <input
                id="perfil-usuario"
                autoCapitalize="none"
                value={form.username}
                onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
                required
                className={control}
              />
            </div>
            <div>
              <Label className="mb-1.5" htmlFor="perfil-papel">
                Papel
              </Label>
              <select
                id="perfil-papel"
                value={form.role}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, role: event.target.value as Role }))
                }
                className={control}
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {roleLabels[role]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="mb-1.5" htmlFor="perfil-senha">
                Senha
              </Label>
              <input
                id="perfil-senha"
                type="password"
                minLength={8}
                autoComplete="new-password"
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                required
                className={control}
              />
            </div>
          </div>

          {erro && (
            <p role="alert" className="text-sm text-destructive">
              {erro}
            </p>
          )}
          {criado && (
            <p role="status" className="text-sm text-success-600">
              {criado}
            </p>
          )}

          <div>
            <Button type="submit" size="sm" disabled={createProfile.isPending}>
              {createProfile.isPending ? "Criando…" : "Criar perfil"}
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border bg-card p-4 shadow-sm md:p-5">
        <h2 className="mb-5 text-lg font-semibold text-foreground">Perfis existentes</h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {(perfis ?? []).map((perfil) => {
              const souEu = perfil.id === profileId;
              return (
                <li
                  key={perfil.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-border px-4 py-3"
                >
                  <div className="mr-auto min-w-0">
                    <p
                      className={cn(
                        "flex items-center gap-2 font-medium",
                        perfil.active ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {perfil.name}
                      {souEu && <Badge variant="outline">Você</Badge>}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      @{perfil.username} · {roleLabels[perfil.role]}
                    </p>
                  </div>
                  <Badge variant={perfil.active ? "success" : "secondary"}>
                    {perfil.active ? "Ativo" : "Inativo"}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <IconButton
                      icon={Pencil}
                      label={`Editar ${perfil.name}`}
                      onClick={() => setEditando(perfil)}
                    />
                    {!souEu && (
                      <>
                        <IconButton
                          icon={perfil.active ? PowerOff : Power}
                          label={
                            perfil.active ? `Desativar ${perfil.name}` : `Ativar ${perfil.name}`
                          }
                          disabled={setActive.isPending}
                          onClick={() =>
                            setActive.mutate({ id: perfil.id, active: !perfil.active })
                          }
                        />
                        <IconButton
                          icon={Trash2}
                          label={`Excluir ${perfil.name}`}
                          tone="destructive"
                          disabled={deleteProfile.isPending}
                          onClick={() => confirmarExclusao(perfil)}
                        />
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ProfileFormModal profile={editando} onClose={() => setEditando(null)} />
    </div>
  );
}
