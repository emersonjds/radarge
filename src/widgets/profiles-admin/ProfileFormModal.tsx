"use client";

import { useState, type FormEvent } from "react";
import { roleLabels, roleSchema, type Role } from "@/entities/profile/model";
import { useUpdateProfile } from "@/entities/profile/queries";
import type { PublicProfile } from "@/entities/profile/api";
import { Dialog, DialogContent, DialogTitle } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";

const ROLES = roleSchema.options;
const control =
  "h-11 w-full rounded-lg border border-input bg-transparent px-4 text-sm text-foreground focus:border-ring focus:outline-hidden focus:ring-3 focus:ring-ring/20";

export interface ProfileFormModalProps {
  profile: PublicProfile | null;
  onClose: () => void;
}

export function ProfileFormModal({ profile, onClose }: ProfileFormModalProps) {
  return (
    <Dialog
      open={profile !== null}
      onOpenChange={(aberto) => {
        if (!aberto) onClose();
      }}
    >
      <DialogContent className="max-w-lg">
        {profile && <ProfileFormBody key={profile.id} profile={profile} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

interface ProfileFormBodyProps {
  profile: PublicProfile;
  onClose: () => void;
}

function ProfileFormBody({ profile, onClose }: ProfileFormBodyProps) {
  const updateProfile = useUpdateProfile();

  const [name, setName] = useState(profile.name);
  const [username, setUsername] = useState(profile.username);
  const [role, setRole] = useState<Role>(profile.role);
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (updateProfile.isPending) return;
    setErro(null);
    try {
      await updateProfile.mutateAsync({
        id: profile.id,
        patch: { name, username, role, password: password || undefined },
      });
      onClose();
    } catch (motivo) {
      setErro(motivo instanceof Error ? motivo.message : "Não foi possível salvar o perfil.");
    }
  }

  return (
    <form onSubmit={salvar}>
      <DialogTitle className="mb-6 text-foreground">Editar perfil</DialogTitle>

      <div className="mb-5">
        <Label className="mb-1.5" htmlFor="editar-nome">
          Nome
        </Label>
        <input
          id="editar-nome"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          autoFocus
          className={control}
        />
      </div>

      <div className="mb-5">
        <Label className="mb-1.5" htmlFor="editar-usuario">
          Login de usuário
        </Label>
        <input
          id="editar-usuario"
          autoCapitalize="none"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
          className={control}
        />
      </div>

      <div className="mb-5">
        <Label className="mb-1.5" htmlFor="editar-papel">
          Papel
        </Label>
        <select
          id="editar-papel"
          value={role}
          onChange={(event) => setRole(event.target.value as Role)}
          className={control}
        >
          {ROLES.map((opcao) => (
            <option key={opcao} value={opcao}>
              {roleLabels[opcao]}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-5">
        <Label className="mb-1.5" htmlFor="editar-senha">
          Nova senha
        </Label>
        <input
          id="editar-senha"
          type="password"
          minLength={8}
          autoComplete="new-password"
          placeholder="Deixe em branco para manter"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={control}
        />
      </div>

      {erro && (
        <p role="alert" className="mb-5 text-sm text-destructive">
          {erro}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button disabled={updateProfile.isPending}>
          {updateProfile.isPending ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
