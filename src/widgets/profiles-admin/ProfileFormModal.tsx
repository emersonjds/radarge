"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Check, Copy } from "lucide-react";
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
import { Checkbox } from "@/shared/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

const ROLES = roleSchema.options;

export interface ProfileFormModalProps {
  profile: PublicProfile | null | undefined;
  onClose: () => void;
}

export function ProfileFormModal({ profile, onClose }: ProfileFormModalProps) {
  const [revealingPassword, setRevealingPassword] = useState(false);

  return (
    <Dialog
      open={profile !== undefined}
      onOpenChange={(open) => {
        if (!open && !revealingPassword) onClose();
      }}
    >
      <DialogContent className="max-w-lg" showCloseButton={!revealingPassword}>
        {profile !== undefined && (
          <ProfileFormBody
            key={profile?.id ?? "new"}
            profile={profile}
            onRevealingPasswordChange={setRevealingPassword}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface ProfileFormBodyProps {
  profile: PublicProfile | null;
  onRevealingPasswordChange: (revealing: boolean) => void;
  onClose: () => void;
}

function ProfileFormBody({ profile, onRevealingPasswordChange, onClose }: ProfileFormBodyProps) {
  const createProfile = useCreateProfile();
  const updateProfile = useUpdateProfile();
  const [provisionalPassword, setProvisionalPassword] = useState<string | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: profile?.name ?? "",
      username: profile?.username ?? "",
      role: profile?.role ?? "teacher",
      resetPassword: false,
    },
  });

  const submit = async (values: ProfileFormValues) => {
    try {
      const result = profile
        ? await updateProfile.mutateAsync({
            id: profile.id,
            patch: {
              name: values.name,
              username: values.username,
              role: values.role,
              ...(values.resetPassword ? { resetPassword: true } : {}),
            },
          })
        : await createProfile.mutateAsync({
            name: values.name,
            username: values.username,
            role: values.role,
          });

      if (result.provisionalPassword) {
        setProvisionalPassword(result.provisionalPassword);
        onRevealingPasswordChange(true);
      } else {
        onClose();
      }
    } catch (error) {
      form.setError("root", {
        message: messageForError(
          error,
          profile ? "Não foi possível salvar o perfil." : "Não foi possível criar o perfil.",
        ),
      });
    }
  };

  if (provisionalPassword) {
    return (
      <ProvisionalPasswordReveal
        profileName={form.getValues("name")}
        password={provisionalPassword}
        onClose={onClose}
      />
    );
  }

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

        {profile ? (
          <FormField
            control={form.control}
            name="resetPassword"
            render={({ field }) => (
              <FormItem className="mb-5 flex flex-row items-center gap-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                  />
                </FormControl>
                <FormLabel>Gerar nova senha provisória</FormLabel>
              </FormItem>
            )}
          />
        ) : (
          <p className="mb-5 text-sm text-muted-foreground">
            A senha de acesso é gerada automaticamente e aparecerá na próxima tela — anote-a antes
            de fechar.
          </p>
        )}

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

interface ProvisionalPasswordRevealProps {
  profileName: string;
  password: string;
  onClose: () => void;
}

function ProvisionalPasswordReveal({
  profileName,
  password,
  onClose,
}: ProvisionalPasswordRevealProps) {
  const [copied, setCopied] = useState(false);

  const copyPassword = async () => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
  };

  return (
    <div>
      <DialogTitle className="mb-4 text-foreground">Senha provisória gerada</DialogTitle>
      <p className="mb-4 text-sm text-muted-foreground">
        Esta é a única vez que a senha de {profileName} aparece na tela. Repasse-a agora — depois de
        fechar, não há como vê-la de novo, apenas gerar outra.
      </p>
      <div className="mb-6 flex items-center gap-2 rounded-md border border-input bg-muted px-3 py-2">
        <code className="font-mono flex-1 text-sm break-all [-webkit-user-select:all] [user-select:all]">
          {password}
        </code>
        <Button type="button" size="sm" variant="outline" onClick={copyPassword}>
          {copied ? <Check /> : <Copy />}
          {copied ? "Copiada" : "Copiar"}
        </Button>
      </div>
      <div className="flex justify-end">
        <Button type="button" onClick={onClose}>
          Concluir
        </Button>
      </div>
    </div>
  );
}
