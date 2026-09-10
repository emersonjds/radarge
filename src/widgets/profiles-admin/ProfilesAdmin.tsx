"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  profileFormSchema,
  roleLabels,
  roleSchema,
  type ProfileFormValues,
  type Role,
} from "@/entities/profile/model";
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
import { messageForError } from "@/shared/lib/api/error-message";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { cn } from "@/shared/lib/utils";
import { Pencil, Power, PowerOff, Trash2 } from "lucide-react";
import { IconButton } from "@/shared/ui/icon-button";

const ROLES = roleSchema.options;
const EMPTY_FORM_VALUES: ProfileFormValues = {
  name: "",
  username: "",
  role: "teacher" as Role,
  password: "",
};

export function ProfilesAdmin() {
  const { profileId } = useSession();
  const { data: profiles, isLoading } = useProfiles();
  const { data: groups } = useGroups();
  const createProfile = useCreateProfile();
  const setActive = useSetProfileActive();
  const deleteProfile = useDeleteProfile();

  function confirmDelete(profile: PublicProfile) {
    const teachingCount = (groups ?? []).filter((group) => group.teacherId === profile.id).length;
    const warning =
      teachingCount > 0
        ? `${profile.name} é regente de ${teachingCount} ${teachingCount === 1 ? "aula" : "aulas"}, que ficarão sem professor. Excluir o perfil mesmo assim?`
        : `Excluir o perfil de ${profile.name}?`;
    if (window.confirm(warning)) deleteProfile.mutate(profile.id);
  }

  const [createdMessage, setCreatedMessage] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState<PublicProfile | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema("create")),
    defaultValues: EMPTY_FORM_VALUES,
  });

  const submit = async (values: ProfileFormValues) => {
    setCreatedMessage(null);
    try {
      const profile = await createProfile.mutateAsync(values);
      setCreatedMessage(`Perfil de ${profile.name} criado.`);
      form.reset(EMPTY_FORM_VALUES);
    } catch (error) {
      form.setError("root", {
        message: messageForError(error, "Não foi possível criar o perfil."),
      });
    }
  };

  const { isSubmitting, errors } = form.formState;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Perfis</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Crie e gerencie os acessos abaixo de você.
        </p>
      </header>

      <Card asChild>
        <section>
          <h2 className="mb-5 text-lg font-semibold text-foreground">Novo perfil</h2>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(submit)} noValidate className="flex flex-col gap-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Login de usuário</FormLabel>
                      <FormControl>
                        <Input autoCapitalize="none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Papel</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ROLES.map((role) => (
                            <SelectItem key={role} value={role}>
                              {roleLabels[role]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {errors.root && (
                <p role="alert" className="text-sm text-destructive">
                  {errors.root.message}
                </p>
              )}
              {createdMessage && (
                <p role="status" className="text-sm text-success-600">
                  {createdMessage}
                </p>
              )}

              <div>
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? "Criando…" : "Criar perfil"}
                </Button>
              </div>
            </form>
          </Form>
        </section>
      </Card>

      <Card asChild>
        <section>
          <h2 className="mb-5 text-lg font-semibold text-foreground">Perfis existentes</h2>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {(profiles ?? []).map((profile) => {
                const isCurrentUser = profile.id === profileId;
                return (
                  <li
                    key={profile.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-border px-4 py-3"
                  >
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
                );
              })}
            </ul>
          )}
        </section>
      </Card>

      <ProfileFormModal profile={editingProfile} onClose={() => setEditingProfile(null)} />
    </div>
  );
}
