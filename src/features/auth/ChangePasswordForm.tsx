"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import {
  passwordChangeFormSchema,
  type PasswordChangeFormValues,
} from "@/entities/profile/model";
import { messageForError } from "@/shared/lib/api/error-message";
import { Button } from "@/shared/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { changePassword } from "./api";

export function ChangePasswordForm() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeFormSchema),
    defaultValues: { currentPassword: "", newPassword: "" },
  });

  const submit = async (values: PasswordChangeFormValues) => {
    try {
      await changePassword(values);
      queryClient.clear();
      router.replace("/login");
    } catch (error) {
      form.setError("root", {
        message: messageForError(error, CHANGE_FAILED, { unauthorized: CURRENT_PASSWORD_WRONG }),
      });
    }
  };

  const { isSubmitting, errors } = form.formState;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(submit)}
        noValidate
        className="w-full max-w-sm duration-500 animate-in fade-in slide-in-from-bottom-3 motion-reduce:animate-none"
      >
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Defina sua senha</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Sua senha atual foi criada pela coordenação e serve para um acesso só.
        </p>

        <FormField
          control={form.control}
          name="currentPassword"
          render={({ field }) => (
            <FormItem className="mt-8">
              <FormLabel>Senha atual</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoFocus
                  autoComplete="current-password"
                  className="h-11"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem className="mt-5">
              <FormLabel>Nova senha</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" className="h-11" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {errors.root && (
          <p
            role="alert"
            className="mt-5 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {errors.root.message}
          </p>
        )}

        <Button type="submit" className="mt-7 h-11 w-full text-sm" disabled={isSubmitting}>
          {isSubmitting ? "Salvando…" : "Salvar e entrar de novo"}
        </Button>

        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
          Trocar a senha encerra os acessos abertos, inclusive este. Você vai entrar de novo com a
          senha nova.
        </p>
      </form>
    </Form>
  );
}

const CHANGE_FAILED = "Não foi possível trocar a senha.";
const CURRENT_PASSWORD_WRONG = "A senha atual está incorreta.";
