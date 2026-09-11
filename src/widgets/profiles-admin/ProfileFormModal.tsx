"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  profileFormSchema,
  roleLabels,
  roleSchema,
  type ProfileFormValues,
} from "@/entities/profile/model";
import { useCreateProfile, useUpdateProfile } from "@/entities/profile/queries";
import type { PublicProfile } from "@/entities/profile/api";
import { messageForError } from "@/shared/lib/api/error-message";
import { Dialog, DialogContent, DialogTitle } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

const ROLES = roleSchema.options;

export interface ProfileFormModalProps {
  profile: PublicProfile | null | undefined;
  onClose: () => void;
}

export function ProfileFormModal({ profile, onClose }: ProfileFormModalProps) {
  return (
    <Dialog
      open={profile !== undefined}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-lg">
        {profile !== undefined && (
          <ProfileFormBody key={profile?.id ?? "new"} profile={profile} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface ProfileFormBodyProps {
  profile: PublicProfile | null;
  onClose: () => void;
}

function ProfileFormBody({ profile, onClose }: ProfileFormBodyProps) {
  const createProfile = useCreateProfile();
  const updateProfile = useUpdateProfile();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema(profile ? "edit" : "create")),
    defaultValues: {
      name: profile?.name ?? "",
      username: profile?.username ?? "",
      role: profile?.role ?? "teacher",
      password: "",
    },
  });

  const submit = async (values: ProfileFormValues) => {
    try {
      if (profile) {
        await updateProfile.mutateAsync({
          id: profile.id,
          patch: { ...values, password: values.password || undefined },
        });
      } else {
        await createProfile.mutateAsync(values);
      }
      onClose();
    } catch (error) {
      form.setError("root", {
        message: messageForError(
          error,
          profile ? "Não foi possível salvar o perfil." : "Não foi possível criar o perfil.",
        ),
      });
    }
  };

  const { isSubmitting, errors } = form.formState;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} noValidate>
        <DialogTitle className="mb-6 text-foreground">
          {profile ? "Editar perfil" : "Adicionar perfil"}
        </DialogTitle>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="mb-5">
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input autoFocus {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem className="mb-5">
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
            <FormItem className="mb-5">
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
            <FormItem className="mb-5">
              <FormLabel>{profile ? "Nova senha" : "Senha"}</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
                  placeholder={profile ? "Deixe em branco para manter" : undefined}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {errors.root && (
          <p role="alert" className="mb-5 text-sm text-destructive">
            {errors.root.message}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {profile
              ? isSubmitting
                ? "Salvando…"
                : "Salvar"
              : isSubmitting
                ? "Criando…"
                : "Criar perfil"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
